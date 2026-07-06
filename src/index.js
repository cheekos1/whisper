const { Client, GatewayIntentBits, Partials } = require('discord.js');
const config = require('./config');
const logger = require('./utils/logger');
const { registerCommand } = require('./handlers/commandHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
  ],
});

const eventFiles = [
  require('./events/ready'),
  require('./events/interactionCreate'),
  require('./events/messageCreate'),
];

for (const event of eventFiles) {
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
  logger.info(`Registered event: ${event.name}`);
}

const adminCreditCommand = require('./commands/admin_credit');
registerCommand(adminCreditCommand.name, adminCreditCommand);

const panelCommand = require('./commands/panel');
registerCommand(panelCommand.name, panelCommand);

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
});

client.login(config.token).then(() => {
  logger.info('Bot logged in successfully');
}).catch((error) => {
  logger.error('Failed to login', error);
  process.exit(1);
});
