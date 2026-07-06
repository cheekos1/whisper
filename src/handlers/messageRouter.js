const supabase = require('../database/supabase');
const config = require('../config');
const logger = require('../utils/logger');
const coinService = require('../services/coinService');
const userService = require('../services/userService');
const routingService = require('../services/routingService');
const dmFlowHandler = require('./dmFlowHandler');
const { isOnCooldown } = require('../utils/validators');

async function handleMessage(message) {
  if (message.author.bot) return;
  if (message.system) return;
  if (message.webhookId) return;
  if (!message.guild) return;
  if (message.channel.isDMBased()) return;

  try {
    await userService.getOrCreateUser(message.author.id, message.author.username);
  } catch {
    return;
  }

  const onCooldown = await isOnCooldown(message.author.id, config.cooldown.messageCooldownMs);
  if (onCooldown) return;

  try {
    const now = new Date().toISOString();
    const { error: upsertError } = await supabase
      .from('cooldowns')
      .upsert(
        { discord_id: message.author.id, last_message_at: now },
        { onConflict: 'discord_id' }
      );

    if (upsertError) {
      logger.error('Failed to update cooldown', upsertError);
      return;
    }

    await coinService.addCoins(message.author.id, config.coins.perMessage);
  } catch (error) {
    logger.error('Error awarding coins for message', error);
  }
}

async function handleDirectMessage(message, client) {
  if (message.author.bot) return;
  if (message.system) return;
  if (!message.channel.isDMBased()) return;

  await routingService.handleIncomingDM(message, client);

  await dmFlowHandler.processDMFlow(message, client);
}

module.exports = {
  handleMessage,
  handleDirectMessage,
};
