const logger = require('../utils/logger');

const sendAnonymous = require('../buttons/sendAnonymous');
const sendWhisper = require('../buttons/sendWhisper');
const checkCredit = require('../buttons/checkCredit');
const acceptRequest = require('../buttons/acceptRequest');
const declineRequest = require('../buttons/declineRequest');
const deleteRequest = require('../buttons/deleteRequest');
const deleteConvo = require('../buttons/deleteConvo');
const adminActions = require('../buttons/adminActions');

async function handleButton(interaction) {
  const customId = interaction.customId;

  try {
    if (customId === 'send_anonymous') {
      await sendAnonymous.execute(interaction);
    } else if (customId === 'send_whisper') {
      await sendWhisper.execute(interaction);
    } else if (customId === 'check_credit') {
      await checkCredit.execute(interaction);
    } else if (customId === 'delete_convo') {
      await deleteConvo.execute(interaction);
    } else if (customId.startsWith('delconvo_')) {
      await interaction.deferUpdate();
    } else if (customId === 'delete_message') {
      await deleteRequest.execute(interaction);
    } else if (customId.startsWith('accept_request_')) {
      const requestId = customId.replace('accept_request_', '');
      await acceptRequest.execute(interaction, requestId);
    } else if (customId.startsWith('decline_request_')) {
      const requestId = customId.replace('decline_request_', '');
      await declineRequest.execute(interaction, requestId);
    } else if (customId.startsWith('delete_request_')) {
      const requestId = customId.replace('delete_request_', '');
      await deleteRequest.execute(interaction, requestId);
    } else if (
      customId === 'admin_check_credit' ||
      customId === 'admin_add_credit' ||
      customId === 'admin_remove_credit' ||
      customId === 'admin_ban_user' ||
      customId === 'admin_unban_user'
    ) {
      await adminActions.execute(interaction);
    } else {
      logger.warn('Unknown button interaction', { customId });
      await interaction.reply({ content: 'Unknown action.', flags: 64 });
    }
  } catch (error) {
    logger.error('Button handler error', error);
    const replyMethod = interaction.deferred ? interaction.editReply : interaction.reply;
    try {
      await replyMethod.call(interaction, {
        content: 'An error occurred while processing your request.',
        flags: 64,
      });
    } catch {
    }
  }
}

module.exports = {
  handleButton,
};
