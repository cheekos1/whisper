const supabase = require('../database/supabase');
const config = require('../config');

function generateChatId() {
  return String(Math.floor(Math.random() * 900) + 100);
}

async function ensureUserExists(discordId, username) {
  const { data, error } = await supabase
    .from('users')
    .select('discord_id')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        discord_id: discordId,
        username,
        coins: config.coins.startingBalance,
      });

    if (insertError) {
      throw insertError;
    }
  } else {
    const { error: updateError } = await supabase
      .from('users')
      .update({ username })
      .eq('discord_id', discordId);

    if (updateError) {
      throw updateError;
    }
  }
}

async function resolveUserFromMention(client, input) {
  const cleaned = input.replace(/^@/, '').trim();

  const mentionMatch = cleaned.match(/^<@!?(\d+)>$/);
  if (mentionMatch) {
    try {
      return await client.users.fetch(mentionMatch[1]);
    } catch {
      return null;
    }
  }

  const idMatch = cleaned.match(/^(\d{17,20})$/);
  if (idMatch) {
    try {
      return await client.users.fetch(idMatch[1]);
    } catch {
      return null;
    }
  }

  const lowered = cleaned.toLowerCase();

  for (const guild of client.guilds.cache.values()) {
    try {
      const members = await guild.members.fetch({ query: lowered, limit: 10 });
      const found = members.find(
        (m) => m.user.username.toLowerCase() === lowered || m.displayName.toLowerCase() === lowered
      );
      if (found) return found.user;
    } catch {
      continue;
    }
  }

  try {
    const fetched = await client.users.fetch();
    const found = fetched.find((u) => u.username.toLowerCase() === lowered);
    if (found) return found;
  } catch {
  }

  return null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  generateChatId,
  ensureUserExists,
  resolveUserFromMention,
  sleep,
};
