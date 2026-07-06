const supabase = require('../database/supabase');
const logger = require('../utils/logger');
const coinService = require('../services/coinService');
const conversationService = require('../services/conversationService');
const userService = require('../services/userService');
const config = require('../config');
const { resolveUserFromMention } = require('../utils/helpers');
const { anonymousRequestEmbed, whisperEmbed } = require('../utils/embeds');

async function processDMFlow(message, client) {
  if (message.author.bot) return;
  if (!message.channel.isDMBased()) return;

  const discordId = message.author.id;
  const content = message.content.trim();

  if (!content) return;

  const { data: state, error } = await supabase
    .from('conversation_states')
    .select('*')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch conversation state', error);
    return;
  }

  if (!state) return;

  const stateData = state.data || {};

  switch (state.step) {
    case 'awaiting_nickname':
      await handleNicknameStep(message, discordId, content);
      break;

    case 'awaiting_target':
      await handleTargetStep(message, client, discordId, content, stateData);
      break;

    case 'awaiting_message':
      await handleMessageStep(message, client, discordId, content, stateData);
      break;

    case 'awaiting_amount':
      await handleAmountStep(message, discordId, content, stateData);
      break;

    case 'awaiting_target_admin':
      await handleAdminTargetStep(message, client, discordId, content, stateData);
      break;

    case 'admin_check_credit_target':
      await handleAdminCheckCredit(message, client, discordId, content);
      break;

    case 'admin_ban_target':
      await handleAdminBan(message, client, discordId, content);
      break;

    case 'admin_unban_target':
      await handleAdminUnban(message, client, discordId, content);
      break;

    default:
      break;
  }
}

async function handleNicknameStep(message, discordId, content) {
  if (content.length < 2 || content.length > 32) {
    await message.channel.send('الاسم المستعار يجب أن يكون بين 2 و 32 حرفاً. حاول مرة أخرى.');
    return;
  }

  const newData = { nickname: content, type: 'anonymous' };

  const { error } = await supabase
    .from('conversation_states')
    .update({ step: 'awaiting_target', data: newData, updated_at: new Date().toISOString() })
    .eq('discord_id', discordId);

  if (error) {
    logger.error('Failed to update state to awaiting_target', error);
    await message.channel.send('حدث خطأ. حاول مرة أخرى.');
    return;
  }

  await message.channel.send('رائع! الآن أدخل اسم المستخدم أو معرف الديسكورد للشخص الذي تريد مراسلته.');
}

async function handleTargetStep(message, client, discordId, content, stateData) {
  const targetUser = await resolveUserFromMention(client, content);

  if (!targetUser) {
    await message.channel.send('لم أتمكن من العثور على هذا المستخدم. يرجى إدخال اسم مستخدم صحيح أو معرف.');
    return;
  }

  if (targetUser.id === discordId) {
    await message.channel.send('لا يمكنك مراسلة نفسك.');
    return;
  }

  if (targetUser.bot) {
    await message.channel.send('لا يمكنك مراسلة البوتات.');
    return;
  }

  const banned = await userService.isBanned(targetUser.id);
  if (banned) {
    await message.channel.send('هذا المستخدم محظور من استخدام البوت.');
    return;
  }

  const newData = {
    ...stateData,
    targetId: targetUser.id,
    targetUsername: targetUser.username,
  };

  const { error } = await supabase
    .from('conversation_states')
    .update({ step: 'awaiting_message', data: newData, updated_at: new Date().toISOString() })
    .eq('discord_id', discordId);

  if (error) {
    logger.error('Failed to update state to awaiting_message', error);
    await message.channel.send('حدث خطأ. حاول مرة أخرى.');
    return;
  }

  await message.channel.send('الآن أدخل رسالتك:');
}

async function handleMessageStep(message, client, discordId, content, stateData) {
  if (content.length < 1 || content.length > 2000) {
    await message.channel.send('الرسالة يجب أن تكون بين 1 و 2000 حرف. حاول مرة أخرى.');
    return;
  }

  const flowType = stateData.type || 'anonymous';
  const cost = flowType === 'whisper' ? config.coins.whisperCost : config.coins.anonymousCost;

  const deduction = await coinService.deductCoins(discordId, cost);
  if (!deduction.success) {
    await message.channel.send(
      `عملات غير كافية. تحتاج ${cost} عملة ولكن لديك فقط ${deduction.balance}.`
    );
    await clearState(discordId);
    return;
  }

  if (flowType === 'whisper') {
    await processWhisperSend(message, client, discordId, content, stateData);
  } else {
    await processAnonymousSend(message, client, discordId, content, stateData);
  }

  await clearState(discordId);
}

async function processWhisperSend(message, client, discordId, content, stateData) {
  const targetId = stateData.targetId;

  const senderUser = await client.users.fetch(discordId);

  const embedData = whisperEmbed(senderUser.username, content);

  try {
    const targetUser = await client.users.fetch(targetId);
    await targetUser.send(embedData);
    await message.channel.send(
      `تم إرسال همسك إلى **${stateData.targetUsername}** مقابل **${config.coins.whisperCost}** عملة.`
    );
    logger.info('Whisper sent', { from: discordId, to: targetId });
  } catch {
    await message.channel.send(
      'لم أتمكن من توصيل الهمس. قد يكون المستخدم عطل الرسائل الخاصة.'
    );
    await coinService.addCoins(discordId, config.coins.whisperCost);
  }
}

async function processAnonymousSend(message, client, discordId, content, stateData) {
  const targetId = stateData.targetId;
  const nickname = stateData.nickname;

  const request = await conversationService.createPendingRequest(
    discordId,
    targetId,
    nickname,
    content
  );

  if (!request) {
    await message.channel.send('فشل إنشاء طلبك المجهول. حاول مرة أخرى.');
    await coinService.addCoins(discordId, config.coins.anonymousCost);
    return;
  }

  const embedData = anonymousRequestEmbed(nickname, content, request.id);

  try {
    const targetUser = await client.users.fetch(targetId);
    await targetUser.send(embedData);
    await message.channel.send(
      `تم إرسال رسالتك المجهولة إلى **${stateData.targetUsername}** مقابل **${config.coins.anonymousCost}** عملة. في انتظار الرد...`
    );
    logger.info('Anonymous request sent', { from: discordId, to: targetId });
  } catch {
    await message.channel.send(
      'لم أتمكن من توصيل الطلب. قد يكون المستخدم عطل الرسائل الخاصة.'
    );
    await conversationService.deletePendingRequest(request.id);
    await coinService.addCoins(discordId, config.coins.anonymousCost);
  }
}

async function handleAmountStep(message, discordId, content, stateData) {
  const amount = parseInt(content, 10);
  if (isNaN(amount) || amount <= 0) {
    await message.channel.send('الرجاء إدخال رقم صحيح موجب.');
    return;
  }

  const { error } = await supabase
    .from('conversation_states')
    .update({
      data: { ...stateData, amount },
      step: 'awaiting_target_admin',
      updated_at: new Date().toISOString(),
    })
    .eq('discord_id', discordId);

  if (error) {
    logger.error('Failed to update state for amount', error);
    await message.channel.send('حدث خطأ. حاول مرة أخرى.');
    return;
  }

  await message.channel.send('الآن أدخل اسم المستخدم أو معرف الديسكورد:');
}

async function handleAdminTargetStep(message, client, discordId, content, stateData) {
  const targetUser = await resolveUserFromMention(client, content);

  if (!targetUser) {
    await message.channel.send('لم أتمكن من العثور على هذا المستخدم.');
    return;
  }

  const adminAction = stateData.adminAction;
  const amount = stateData.amount;
  const targetId = targetUser.id;

  if (adminAction === 'add') {
    const result = await coinService.addCoins(targetId, amount);
    if (result !== null) {
      await message.channel.send(`تم إضافة ${amount} عملة إلى <@${targetId}>. الرصيد الجديد: ${result}`);
      logger.info('Admin added coins', { adminId: discordId, targetId, amount });
    } else {
      await message.channel.send('فشلت إضافة العملات.');
    }
  } else if (adminAction === 'remove') {
    const userData = await userService.getUserByDiscordId(targetId);
    if (!userData) {
      await message.channel.send('المستخدم غير موجود في قاعدة البيانات.');
      await clearState(discordId);
      return;
    }
    const newBalance = Math.max(0, userData.coins - amount);
    const success = await coinService.setCoins(targetId, newBalance);
    if (success) {
      await message.channel.send(`تم خصم ${amount} عملة من <@${targetId}>. الرصيد الجديد: ${newBalance}`);
      logger.info('Admin removed coins', { adminId: discordId, targetId, amount });
    } else {
      await message.channel.send('فشلت عملية الخصم.');
    }
  }

  await clearState(discordId);
}

async function handleAdminCheckCredit(message, client, discordId, content) {
  const targetUser = await resolveUserFromMention(client, content);

  if (!targetUser) {
    await message.channel.send('لم أتمكن من العثور على هذا المستخدم.');
    return;
  }

  const userData = await userService.getUserByDiscordId(targetUser.id);
  if (!userData) {
    await message.channel.send('المستخدم غير موجود في قاعدة البيانات.');
    await clearState(discordId);
    return;
  }

  await message.channel.send(
    `**${targetUser.username}** (${targetUser.id})\nالعملات: ${userData.coins}\nمحظور: ${userData.banned ? 'نعم' : 'لا'}`
  );

  await clearState(discordId);
}

async function handleAdminBan(message, client, discordId, content) {
  const targetUser = await resolveUserFromMention(client, content);

  if (!targetUser) {
    await message.channel.send('لم أتمكن من العثور على هذا المستخدم.');
    return;
  }

  const success = await userService.setBanStatus(targetUser.id, true);
  if (success) {
    await message.channel.send(`تم حظر <@${targetUser.id}>.`);
    logger.info('Admin banned user', { adminId: discordId, targetId: targetUser.id });
  } else {
    await message.channel.send('فشلت عملية الحظر.');
  }

  await clearState(discordId);
}

async function handleAdminUnban(message, client, discordId, content) {
  const targetUser = await resolveUserFromMention(client, content);

  if (!targetUser) {
    await message.channel.send('لم أتمكن من العثور على هذا المستخدم.');
    return;
  }

  const success = await userService.setBanStatus(targetUser.id, false);
  if (success) {
    await message.channel.send(`تم إلغاء حظر <@${targetUser.id}>.`);
    logger.info('Admin unbanned user', { adminId: discordId, targetId: targetUser.id });
  } else {
    await message.channel.send('فشلت عملية إلغاء الحظر.');
  }

  await clearState(discordId);
}

async function clearState(discordId) {
  const { error } = await supabase
    .from('conversation_states')
    .delete()
    .eq('discord_id', discordId);

  if (error) {
    logger.error('Failed to clear conversation state', error);
  }
}

module.exports = {
  processDMFlow,
  clearState,
};
