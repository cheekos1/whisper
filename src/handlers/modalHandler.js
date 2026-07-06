const logger = require('../utils/logger');

const modalMap = {};

async function handleModal(interaction) {
  const customId = interaction.customId;

  const baseId = customId.split('_step')[0] || customId;

  const handler = modalMap[customId] || modalMap[baseId];
  if (!handler) {
    logger.warn('Unknown modal submission', { customId });
    await interaction.reply({ content: 'Unknown form submission.', flags: 64 });
    return;
  }

  try {
    await handler.execute(interaction);
  } catch (error) {
    logger.error('Modal handler error', error);
    try {
      await interaction.reply({
        content: 'An error occurred while processing your form.',
        flags: 64,
      });
    } catch {
    }
  }
}

function registerModal(customId, handler) {
  modalMap[customId] = handler;
}

module.exports = {
  handleModal,
  registerModal,
};
