const conversationService = require('../services/conversationService');
const logger = require('../utils/logger');

async function execute(interaction, requestId) {
  await interaction.deferReply({ flags: 64 });

  const discordId = interaction.user.id;
  const message = interaction.message;

  const activeChat = await conversationService.getActiveChatForUser(discordId);
  if (activeChat) {
    await interaction.editReply({
      content: `لديك محادثة نشطة بالفعل (محادثة #${activeChat.chat_id}). أنهِها أو أوقفها مؤقتاً أولاً.`,
    });
    return;
  }

  const request = await conversationService.getPendingRequestById(requestId);
  if (!request || request.receiver_id !== discordId) {
    await interaction.editReply({
      content: 'هذا الطلب لم يعد متاحاً.',
    });
    return;
  }

  const chat = await conversationService.createChat(
    request.sender_id,
    request.receiver_id,
    request.sender_nickname,
    true
  );

  if (!chat) {
    await interaction.editReply({
      content: 'فشل إنشاء المحادثة. حاول مرة أخرى.',
    });
    return;
  }

  await conversationService.deletePendingRequest(requestId);

  const senderUser = await interaction.client.users.fetch(request.sender_id).catch(() => null);
  const receiverUser = interaction.user;

  if (senderUser) {
    try {
      await senderUser.send({
        content: `تم قبول طلبك المجهول!\n\n**معرف المحادثة:** ${chat.chat_id}\n\nرد على هذه الرسالة لإرسال الرسائل.`,
      });
    } catch {
      logger.warn('Could not notify sender of acceptance', { senderId: request.sender_id });
    }
  }

  try {
    await receiverUser.send({
      content: `لقد قبلت الطلب المجهول!\n\n**معرف المحادثة:** ${chat.chat_id}\n\nرد على هذه الرسالة لإرسال الرسائل.`,
    });
  } catch {
    logger.warn('Could not notify receiver of their own acceptance', { receiverId: discordId });
  }

  try {
    await message.delete();
  } catch {
  }

  await interaction.editReply({
    content: `بدأت المحادثة #${chat.chat_id}! تحقق من رسائلك الخاصة.`,
  });

  logger.info('Conversation accepted', { chatId: chat.chat_id, receiverId: discordId });
}

module.exports = {
  execute,
};
