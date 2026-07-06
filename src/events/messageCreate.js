const { Events } = require('discord.js');
const { handleMessage, handleDirectMessage } = require('../handlers/messageRouter');

async function execute(message, client) {
  if (message.author.bot) return;

  if (message.channel.isDMBased()) {
    await handleDirectMessage(message, client);
  } else if (message.guild) {
    await handleMessage(message);
  }
}

module.exports = {
  name: Events.MessageCreate,
  execute,
};
