const supabase = require('../database/supabase');
const logger = require('../utils/logger');
const { generateChatId } = require('../utils/helpers');

async function createPendingRequest(senderId, receiverId, senderNickname, content) {
  const { data, error } = await supabase
    .from('pending_requests')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      sender_nickname: senderNickname,
      content,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to create pending request', error);
    return null;
  }

  logger.info('Pending request created', { senderId, receiverId });
  return data;
}

async function createChat(senderId, receiverId, senderNickname, anonymous = true) {
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const chatId = generateChatId();

    const { data, error } = await supabase
      .from('chats')
      .insert({
        chat_id: parseInt(chatId),
        anonymous,
        sender_id: senderId,
        receiver_id: receiverId,
        sender_nickname: senderNickname,
        status: 'accepted',
      })
      .select()
      .single();

    if (!error) {
      logger.info('Conversation created', { chatId: chatId });
      return { ...data, chat_id: chatId };
    }

    if (error.code === '23505') {
      logger.warn('Chat ID collision, retrying', { attempt: attempt + 1 });
      continue;
    }

    logger.error('Failed to create chat', error);
    return null;
  }

  logger.error('Failed to create chat after max retries');
  return null;
}

async function updateChatStatus(chatId, status) {
  const { data, error } = await supabase
    .from('chats')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update chat status', error);
    return null;
  }

  return data;
}

async function updateChatWithPause(chatId, status, pausedBy) {
  const { data, error } = await supabase
    .from('chats')
    .update({ status, paused_by: pausedBy, updated_at: new Date().toISOString() })
    .eq('chat_id', chatId)
    .select()
    .single();

  if (error) {
    logger.error('Failed to update chat with pause', error);
    return null;
  }

  return data;
}

async function getUserConversations(discordId) {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .or(`sender_id.eq.${discordId},receiver_id.eq.${discordId}`)
    .in('status', ['accepted', 'paused', 'ended'])
    .order('updated_at', { ascending: false });

  if (error) {
    logger.error('Failed to get user conversations', error);
    return [];
  }

  return data || [];
}

async function getChatById(chatId) {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('chat_id', chatId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to get chat by ID', error);
    return null;
  }

  return data || null;
}

async function getPendingRequestById(requestId) {
  const { data, error } = await supabase
    .from('pending_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to get pending request', error);
    return null;
  }

  return data || null;
}

async function deletePendingRequest(requestId) {
  const { error } = await supabase
    .from('pending_requests')
    .delete()
    .eq('id', requestId);

  if (error) {
    logger.error('Failed to delete pending request', error);
    return false;
  }

  return true;
}

async function getActiveChatForUser(discordId) {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('status', 'accepted')
    .or(`sender_id.eq.${discordId},receiver_id.eq.${discordId}`)
    .maybeSingle();

  if (error) {
    logger.error('Failed to get active chat for user', error);
    return null;
  }

  return data || null;
}

async function getPausedChatsForUser(discordId) {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('status', 'paused')
    .or(`sender_id.eq.${discordId},receiver_id.eq.${discordId}`);

  if (error) {
    logger.error('Failed to get paused chats', error);
    return [];
  }

  return data || [];
}

async function getChatByParticipants(senderId, receiverId) {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .or(
      `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),` +
      `and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
    )
    .maybeSingle();

  if (error) {
    logger.error('Failed to get chat by participants', error);
    return null;
  }

  return data || null;
}

async function saveMessage(chatId, senderId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      chat_id: chatId,
      sender_id: senderId,
      content,
    })
    .select()
    .single();

  if (error) {
    logger.error('Failed to save message', error);
    return null;
  }

  return data;
}

async function isParticipantInChat(discordId, chatId) {
  const chat = await getChatById(chatId);
  if (!chat) return false;
  return chat.sender_id === discordId || chat.receiver_id === discordId;
}

module.exports = {
  createPendingRequest,
  createChat,
  updateChatStatus,
  updateChatWithPause,
  getUserConversations,
  getChatById,
  getPendingRequestById,
  deletePendingRequest,
  getActiveChatForUser,
  getPausedChatsForUser,
  getChatByParticipants,
  saveMessage,
  isParticipantInChat,
};
