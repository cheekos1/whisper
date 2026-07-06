const logger = require('../utils/logger');

async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  const discordId = interaction.user.id;

  let dmChannel;
  try {
    dmChannel = await interaction.user.createDM();
  } catch {
    await interaction.editReply({ content: 'لا أستطيع إرسال رسالة خاصة لك. يرجى تفعيل الرسائل الخاصة وحاول مرة أخرى.' });
    return;
  }

  try {
    const messages = await dmChannel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter((msg) => msg.author.id === interaction.client.user.id);

    let deleted = 0;
    for (const [, msg] of botMessages) {
      try {
        await msg.delete();
        deleted++;
      } catch {
      }
    }

    await interaction.editReply({ content: `تم حذف ${deleted} رسالة من البوت من رسائلك الخاصة.` });
    logger.info('User deleted all bot DMs', { discordId, deleted });
  } catch (error) {
    logger.error('Failed to delete DM messages', error);
    await interaction.editReply({ content: 'فشل حذف الرسائل. حاول مرة أخرى لاحقاً.' });
  }
}

module.exports = {
  execute,
};
