const { Events } = require('discord.js');
const { handleCommand } = require('../handlers/commandHandler');
const { handleButton } = require('../handlers/buttonHandler');
const { handleModal } = require('../handlers/modalHandler');
const logger = require('../utils/logger');

async function execute(interaction) {
  try {
    if (interaction.isCommand()) {
      await handleCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    }
  } catch (error) {
    logger.error('Unhandled interaction error', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'An unexpected error occurred.', flags: 64 });
      } else {
        await interaction.reply({ content: 'An unexpected error occurred.', flags: 64 });
      }
    } catch {
    }
  }
}

module.exports = {
  name: Events.InteractionCreate,
  execute,
};
