const supabase = require('../database/supabase');

async function validateInteraction(interaction) {
  if (!interaction.isCommand() && !interaction.isButton() && !interaction.isModalSubmit()) {
    return { valid: false, reason: 'Invalid interaction type' };
  }

  if (!interaction.user && !interaction.member?.user) {
    return { valid: false, reason: 'Could not identify user' };
  }

  return { valid: true };
}

async function isBanned(discordId) {
  const { data, error } = await supabase
    .from('users')
    .select('banned')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.banned === true;
}

async function hasActiveConversation(discordId) {
  const { data, error } = await supabase
    .from('chats')
    .select('chat_id')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${discordId},receiver_id.eq.${discordId}`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? data.chat_id : null;
}

async function getActiveConversation(discordId) {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${discordId},receiver_id.eq.${discordId}`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

async function getOtherParticipant(chat, discordId) {
  return chat.sender_id === discordId ? chat.receiver_id : chat.sender_id;
}

async function getUserCoins(discordId) {
  const { data, error } = await supabase
    .from('users')
    .select('coins')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.coins ?? 0;
}

async function isOnCooldown(discordId, cooldownMs) {
  const { data, error } = await supabase
    .from('cooldowns')
    .select('last_message_at')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return false;
  }

  const elapsed = Date.now() - new Date(data.last_message_at).getTime();
  return elapsed < cooldownMs;
}

module.exports = {
  validateInteraction,
  isBanned,
  hasActiveConversation,
  getActiveConversation,
  getOtherParticipant,
  getUserCoins,
  isOnCooldown,
};
