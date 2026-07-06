const conversationService = require('../services/conversationService');
const logger = require('../utils/logger');

async function execute(interaction, requestId) {
  await interaction.deferReply({ flags: 64 });

  const discordId = interaction.user.id;
  const message = interaction.message;

  const request = await conversationService.getPendingRequestById(requestId);
  if (request && request.receiver_id === discordId) {
    await conversationService.deletePendingRequest(requestId);

    const senderUser = await interaction.client.users.fetch(request.sender_id).catch(() => null);
    if (senderUser) {
      try {
        await senderUser.send('تم رفض طلبك المجهول.');
      } catch {
        logger.warn('Could not notify sender of decline', { senderId: request.sender_id });
      }
    }

    logger.info('Request declined', { requestId, receiverId: discordId });
  }

  try {
    await message.delete();
  } catch {
  }

  await interaction.editReply({ content: 'تم رفض الطلب.' });
}

module.exports = {
  execute,
};
