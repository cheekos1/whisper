const supabase = require('../database/supabase');
const logger = require('../utils/logger');

async function getOrCreateUser(discordId, username) {
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (fetchError) {
    logger.error('Failed to fetch user', fetchError);
    return null;
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ username })
      .eq('discord_id', discordId);

    if (updateError) {
      logger.error('Failed to update username', updateError);
    }

    return existing;
  }

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      discord_id: discordId,
      username,
      coins: 100,
    })
    .select()
    .single();

  if (insertError) {
    logger.error('Failed to create user', insertError);
    return null;
  }

  return newUser;
}

async function isBanned(discordId) {
  const { data, error } = await supabase
    .from('users')
    .select('banned')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to check ban status', error);
    return true;
  }

  return data?.banned === true;
}

async function setBanStatus(discordId, banned) {
  const { error } = await supabase
    .from('users')
    .update({ banned })
    .eq('discord_id', discordId);

  if (error) {
    logger.error('Failed to set ban status', error);
    return false;
  }

  return true;
}

async function getUserByDiscordId(discordId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to fetch user by discord ID', error);
    return null;
  }

  return data || null;
}

module.exports = {
  getOrCreateUser,
  isBanned,
  setBanStatus,
  getUserByDiscordId,
};
