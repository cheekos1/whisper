const supabase = require('../database/supabase');
const logger = require('../utils/logger');

async function addCoins(discordId, amount) {
  const { data: current, error: fetchError } = await supabase
    .from('users')
    .select('coins')
    .eq('discord_id', discordId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      const { error: insertError } = await supabase
        .from('users')
        .insert({ discord_id: discordId, username: 'unknown', coins: amount });

      if (insertError) {
        logger.error('Failed to create user in addCoins', insertError);
        return null;
      }

      logger.info('Coins added (new user)', { discordId, amount, newBalance: amount });
      return amount;
    }

    logger.error('Failed to fetch user coins for addCoins', fetchError);
    return null;
  }

  const newBalance = (current.coins || 0) + amount;
  const { error: updateError } = await supabase
    .from('users')
    .update({ coins: newBalance })
    .eq('discord_id', discordId);

  if (updateError) {
    logger.error('Failed to update coins in addCoins', updateError);
    return null;
  }

  logger.info('Coins added', { discordId, amount, newBalance });
  return newBalance;
}

async function deductCoins(discordId, amount) {
  const current = await getUserCoins(discordId);
  if (current < amount) {
    return { success: false, balance: current };
  }

  const newBalance = current - amount;
  const { error } = await supabase
    .from('users')
    .update({ coins: newBalance })
    .eq('discord_id', discordId);

  if (error) {
    logger.error('Failed to deduct coins', error);
    return { success: false, balance: current };
  }

  logger.info('Coins deducted', { discordId, amount, newBalance });
  return { success: true, balance: newBalance };
}

async function getUserCoins(discordId) {
  const { data, error } = await supabase
    .from('users')
    .select('coins')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to get user coins', error);
    return 0;
  }

  return data?.coins ?? 0;
}

async function setCoins(discordId, amount) {
  const { error } = await supabase
    .from('users')
    .update({ coins: amount })
    .eq('discord_id', discordId);

  if (error) {
    logger.error('Failed to set coins', error);
    return false;
  }

  logger.info('Coins set', { discordId, amount });
  return true;
}

module.exports = {
  addCoins,
  deductCoins,
  getUserCoins,
  setCoins,
};
