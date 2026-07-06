const logger = require('../utils/logger');

const commandMap = {};

async function handleCommand(interaction) {
  const handler = commandMap[interaction.commandName];
  if (!handler) {
    logger.warn('Unknown command', { commandName: interaction.commandName });
    await interaction.reply({ content: 'Unknown command.', flags: 64 });
    return;
  }

  try {
    await handler.execute(interaction);
  } catch (error) {
    logger.error('Command handler error', error);
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: 'An error occurred while executing the command.' });
      } else {
        await interaction.reply({ content: 'An error occurred while executing the command.', flags: 64 });
      }
    } catch {
    }
  }
}

function registerCommand(name, handler) {
  commandMap[name] = handler;
}

module.exports = {
  handleCommand,
  registerCommand,
};
