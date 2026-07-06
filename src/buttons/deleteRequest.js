const conversationService = require('../services/conversationService');

async function execute(interaction, requestId) {
  await interaction.deferReply({ flags: 64 });

  const message = interaction.message;

  if (requestId) {
    const request = await conversationService.getPendingRequestById(requestId);
    if (request && request.receiver_id === interaction.user.id) {
      await conversationService.deletePendingRequest(requestId);
    }
  }

  try {
    await message.delete();
  } catch {
  }

  await interaction.editReply({ content: 'تم حذف الرسالة.' });
}

module.exports = {
  execute,
};
