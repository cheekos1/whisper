const conversationService = require('./conversationService');
const coinService = require('./coinService');
const config = require('../config');
const logger = require('../utils/logger');

async function handleIncomingDM(message, client) {
  if (message.author.bot) return false;

  const discordId = message.author.id;
  const content = message.content.trim();

  if (!content) return false;

  const handledAsCommand = await handleConversationCommand(message, client, discordId, content);
  if (handledAsCommand) return true;

  const chat = await conversationService.getActiveChatForUser(discordId);
  if (!chat) return false;

  const otherId = chat.sender_id === discordId ? chat.receiver_id : chat.sender_id;

  let otherUser;
  try {
    otherUser = await client.users.fetch(otherId);
  } catch {
    await message.channel.send('لم أتمكن من توصيل رسالتك. ربما غادر المستخدم السيرفر أو حذف حسابه.');
    return true;
  }

  const saved = await conversationService.saveMessage(chat.chat_id, discordId, content);
  if (!saved) {
    await message.channel.send('فشل حفظ رسالتك. حاول مرة أخرى.');
    return true;
  }

  if (chat.anonymous) {
    await coinService.deductCoins(discordId, config.coins.perMessage);
    await coinService.deductCoins(otherId, config.coins.perMessage);
  }

  const senderLabel = chat.anonymous
    ? (chat.sender_nickname || 'مجهول')
    : message.author.username;

  try {
    await otherUser.send(`**محادثة #${chat.chat_id}**\n**${senderLabel}:** ${content}`);
  } catch {
    await message.channel.send('لم أتمكن من توصيل رسالتك. قد يكون المستخدم عطل الرسائل الخاصة.');
    return true;
  }

  try {
    await message.react('✅');
  } catch {
  }

  return true;
}

async function handleConversationCommand(message, client, discordId, content) {
  const pauseMatch = content.match(/^(?:pause|ايقاف)\s+(\d+)$/i);
  const continueMatch = content.match(/^(?:continue|كمل)\s+(\d+)$/i);
  const endMatch = content.match(/^(?:end|انهاء)\s+(\d+)$/i);

  if (pauseMatch) {
    await handlePause(message, client, discordId, parseInt(pauseMatch[1]));
    return true;
  }

  if (continueMatch) {
    await handleContinue(message, client, discordId, parseInt(continueMatch[1]));
    return true;
  }

  if (endMatch) {
    await handleEnd(message, client, discordId, parseInt(endMatch[1]));
    return true;
  }

  return false;
}

async function handlePause(message, client, discordId, chatId) {
  const chat = await conversationService.getChatById(chatId);
  if (!chat) {
    await message.channel.send('المحادثة غير موجودة.');
    return;
  }

  if (chat.sender_id !== discordId && chat.receiver_id !== discordId) {
    await message.channel.send('أنت لست مشاركاً في هذه المحادثة.');
    return;
  }

  if (chat.status !== 'accepted') {
    await message.channel.send('هذه المحادثة غير نشطة.');
    return;
  }

  const otherId = chat.sender_id === discordId ? chat.receiver_id : chat.sender_id;

  await conversationService.updateChatWithPause(chatId, 'paused', discordId);

  try {
    const otherUser = await client.users.fetch(otherId);
    await otherUser.send(`المشارك الآخر أوقف **المحادثة #${chatId}** مؤقتاً.`);
  } catch {
    logger.warn('Could not notify other participant of pause', { chatId, otherId });
  }

  await message.channel.send(`**المحادثة #${chatId}** أوقفت مؤقتاً. يمكنك أنت فقط استئنافها بأمر \`كمل ${chatId}\` أو \`continue ${chatId}\`.`);
  logger.info('Conversation paused', { chatId, userId: discordId });
}

async function handleContinue(message, client, discordId, chatId) {
  const chat = await conversationService.getChatById(chatId);
  if (!chat) {
    await message.channel.send('المحادثة غير موجودة.');
    return;
  }

  if (chat.sender_id !== discordId && chat.receiver_id !== discordId) {
    await message.channel.send('أنت لست مشاركاً في هذه المحادثة.');
    return;
  }

  if (chat.status !== 'paused') {
    await message.channel.send('هذه المحادثة ليست موقوفة.');
    return;
  }

  if (chat.paused_by !== discordId) {
    await message.channel.send('فقط الشخص الذي أوقف المحادثة يمكنه استئنافها.');
    return;
  }

  const activeChat = await conversationService.getActiveChatForUser(discordId);
  if (activeChat && activeChat.chat_id !== chatId) {
    await message.channel.send(
      `لديك محادثة نشطة بالفعل (محادثة #${activeChat.chat_id}). أنهِها أولاً.`
    );
    return;
  }

  await conversationService.updateChatStatus(chatId, 'accepted');

  const otherId = chat.sender_id === discordId ? chat.receiver_id : chat.sender_id;
  try {
    const otherUser = await client.users.fetch(otherId);
    await otherUser.send(`المشارك الآخر استأنف **المحادثة #${chatId}**.`);
  } catch {
    logger.warn('Could not notify other participant of resume', { chatId, otherId });
  }

  await message.channel.send(`**المحادثة #${chatId}** استؤنفت.`);
  logger.info('Conversation resumed', { chatId, userId: discordId });
}

async function handleEnd(message, client, discordId, chatId) {
  const chat = await conversationService.getChatById(chatId);
  if (!chat) {
    await message.channel.send('المحادثة غير موجودة.');
    return;
  }

  if (chat.sender_id !== discordId && chat.receiver_id !== discordId) {
    await message.channel.send('أنت لست مشاركاً في هذه المحادثة.');
    return;
  }

  if (chat.status === 'ended') {
    await message.channel.send('هذه المحادثة منتهية بالفعل.');
    return;
  }

  await conversationService.updateChatStatus(chatId, 'ended');

  const otherId = chat.sender_id === discordId ? chat.receiver_id : chat.sender_id;
  try {
    const otherUser = await client.users.fetch(otherId);
    await otherUser.send(`المشارك الآخر أنهى **المحادثة #${chatId}**. هذه المحادثة مغلقة الآن.`);
  } catch {
    logger.warn('Could not notify other participant of end', { chatId, otherId });
  }

  await message.channel.send(`**المحادثة #${chatId}** أنهيت نهائياً.`);
  logger.info('Conversation ended', { chatId, userId: discordId });
}

module.exports = {
  handleIncomingDM,
};
