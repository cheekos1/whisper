const supabase = require('../database/supabase');
const userService = require('../services/userService');
const conversationService = require('../services/conversationService');
const logger = require('../utils/logger');

async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  const discordId = interaction.user.id;

  const banned = await userService.isBanned(discordId);
  if (banned) {
    await interaction.editReply({ content: 'أنت محظور من استخدام البوت.' });
    return;
  }

  const activeChat = await conversationService.getActiveChatForUser(discordId);
  if (activeChat) {
    await interaction.editReply({
      content: `لديك محادثة نشطة بالفعل (محادثة #${activeChat.chat_id}). أنهِها أو أوقفها مؤقتاً أولاً.`,
    });
    return;
  }

  await userService.getOrCreateUser(discordId, interaction.user.username);

  try {
    const dmChannel = await interaction.user.createDM();
    await dmChannel.send('مرحباً بك في الهمس!\n\nأدخل اسم المستخدم أو معرف الديسكورد للشخص الذي تريد إرسال همس إليه:');
  } catch {
    await interaction.editReply({
      content: 'لا أستطيع إرسال رسالة خاصة لك. يرجى تفعيل الرسائل الخاصة من أعضاء السيرفر وحاول مرة أخرى.',
    });
    return;
  }

  const { error } = await supabase
    .from('conversation_states')
    .upsert(
      {
        discord_id: discordId,
        step: 'awaiting_target',
        data: { type: 'whisper' },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'discord_id' }
    );

  if (error) {
    logger.error('Failed to save conversation state', error);
    await interaction.editReply({ content: 'حدث خطأ. حاول مرة أخرى.' });
    return;
  }

  await interaction.editReply({
    content: 'تحقق من رسائلك الخاصة لمتابعة إعداد الهمس!',
  });
}

module.exports = {
  execute,
  customId: 'send_whisper',
};
