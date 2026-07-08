const config = require('../config');
const logger = require('../utils/logger');

async function sendToWebhook(chatId, senderUsername, content, timestamp, type) {
  if (!config.webhookUrl) return;

  const payload = {
    embeds: [{
      title: `محادثة #${chatId} — ${type === 'anonymous' ? 'مجهول' : 'همس'}`,
      color: type === 'anonymous' ? 0x9b59b6 : 0x3498db,
      fields: [
        { name: 'المرسل', value: senderUsername, inline: true },
        { name: 'نوع', value: type === 'anonymous' ? 'مجهول' : 'همس', inline: true },
        { name: 'الرسالة', value: content.length > 1000 ? content.slice(0, 1000) + '...' : content },
      ],
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
