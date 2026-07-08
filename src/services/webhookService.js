const config = require('../config');
const logger = require('../utils/logger');

async function sendToWebhook(data) {
  if (!config.webhookUrl) return;

  const { chatId, content, timestamp, type, senderUsername, senderId, senderNickname, receiverUsername, receiverId } = data;
  const isAnonymous = type === 'anonymous';
  const realName = senderUsername + (senderId ? ` (${senderId})` : '');

  const fields = [
    { name: 'الاسم الحقيقي', value: realName, inline: true },
    { name: 'المستقبل', value: receiverUsername + (receiverId ? ` (${receiverId})` : ''), inline: true },
  ];

  if (isAnonymous && senderNickname) {
    fields.push({ name: 'كنية مجهول', value: senderNickname, inline: true });
  }

  fields.push(
    { name: 'نوع', value: isAnonymous ? 'مجهول' : 'همس', inline: true },
    { name: 'الرسالة', value: content.length > 1000 ? content.slice(0, 1000) + '...' : content },
  );

  const payload = {
    embeds: [{
      title: `محادثة #${chatId} — رسالة جديدة`,
      color: isAnonymous ? 0x9b59b6 : 0x3498db,
      fields,
      timestamp: timestamp || new Date().toISOString(),
      footer: { text: 'Crown Whisper — مراقبة المحادثات' },
    }],
  };

  try {
    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      logger.warn(`Webhook responded with ${response.status}`);
    }
  } catch (error) {
    logger.warn(`Failed to send to webhook: ${error.message}`);
  }
}

module.exports = { sendToWebhook };
