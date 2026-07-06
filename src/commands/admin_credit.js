const config = require('../config');
const { adminMenuEmbed } = require('../utils/embeds');

async function execute(interaction) {
  if (interaction.user.id !== config.adminId) {
    await interaction.reply({ content: 'وصول مرفوض.', flags: 64 });
    return;
  }

  const menu = adminMenuEmbed();

  await interaction.reply({ ...menu, flags: 64 });
}

module.exports = {
  execute,
  name: 'admin_credit',
};
