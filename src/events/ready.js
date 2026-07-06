const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');
const fs = require('fs');
const path = require('path');

async function execute(client) {
  logger.info(`Bot logged in as ${client.user.tag}`);

  client.user.setActivity('Whisper Center', { type: ActivityType.Watching });

  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    logger.info('Schema SQL file found at ' + schemaPath);
  }

  await registerSlashCommands(client);

  logger.info('Bot ready!');
}

async function registerSlashCommands(client) {
  const commands = [];

  const adminCommand = {
    name: 'admin_credit',
    description: 'Admin panel for managing credits and users',
  };
  commands.push(adminCommand);

  const panelCommand = {
    name: 'panel',
    description: 'Post the Whisper Center panel in the current channel',
  };
  commands.push(panelCommand);

  try {
    if (config.guildId) {
      const guild = await client.guilds.fetch(config.guildId);
      await guild.commands.set(commands);
      logger.info(`Slash commands registered in guild ${config.guildId}`);
    } else {
      await client.application.commands.set(commands);
      logger.info('Slash commands registered globally');
    }
  } catch (error) {
    logger.error('Failed to register slash commands', error);
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute,
};
