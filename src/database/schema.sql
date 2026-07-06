-- Whisper Bot Database Schema
-- Run this against your Supabase SQL editor

CREATE TABLE IF NOT EXISTS users (
  discord_id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  coins INTEGER NOT NULL DEFAULT 100,
  banned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chats (
  chat_id INTEGER PRIMARY KEY,
  anonymous BOOLEAN NOT NULL DEFAULT true,
  sender_id TEXT NOT NULL REFERENCES users(discord_id),
  receiver_id TEXT NOT NULL REFERENCES users(discord_id),
  sender_nickname TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'paused', 'ended')),
  paused_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id INTEGER NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users(discord_id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pending_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id TEXT NOT NULL REFERENCES users(discord_id),
  receiver_id TEXT NOT NULL REFERENCES users(discord_id),
  sender_nickname TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_states (
  discord_id TEXT PRIMARY KEY,
  step TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cooldowns (
  discord_id TEXT PRIMARY KEY,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chats_sender_id ON chats(sender_id);
CREATE INDEX IF NOT EXISTS idx_chats_receiver_id ON chats(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_pending_requests_receiver_id ON pending_requests(receiver_id);

-- Disable Row Level Security so the anon key (bot) can access all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE pending_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_states DISABLE ROW LEVEL SECURITY;
ALTER TABLE cooldowns DISABLE ROW LEVEL SECURITY;

-- Enforce only one active (accepted) conversation per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_sender ON chats(sender_id) WHERE status = 'accepted';
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_receiver ON chats(receiver_id) WHERE status = 'accepted';

-- RPC: Add coins to a user (atomically)
CREATE OR REPLACE FUNCTION add_coins(p_discord_id TEXT, p_amount INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  INSERT INTO users (discord_id, username, coins)
  VALUES (p_discord_id, 'unknown', p_amount)
  ON CONFLICT (discord_id)
  DO UPDATE SET coins = users.coins + p_amount
  RETURNING users.coins INTO v_new_balance;

  RETURN v_new_balance;
END;
$$;
