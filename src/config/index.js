require('dotenv').config();

const config = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  adminId: process.env.ADMIN_ID,
  webhookUrl: process.env.WEBHOOK_URL || null,

  coins: {
    perMessage: 2,
    anonymousCost: 40,
    whisperCost: 10,
    startingBalance: 100,
  },

  cooldown: {
    messageCooldownMs: 1000,
  },
};

const requiredKeys = ['token', 'clientId', 'supabaseUrl', 'supabaseAnonKey', 'adminId'];
for (const key of requiredKeys) {
  if (!config[key]) {
    throw new Error(`Missing required config: ${key}. Check your .env file.`);
  }
}

module.exports = config;
