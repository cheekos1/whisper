const { PermissionFlagsBits } = require('discord.js');
const { whisperPanelEmbed } = require('../utils/embeds');

async function execute(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'يحتاج هذا الأمر إلى صلاحية الأدمن.', flags: 64 });
    return;
  }

  const panel = whisperPanelEmbed();

  await interaction.channel.send(panel);

  await interaction.reply({ content: 'تم نشر لوحة مركز الهمس!', flags: 64 });
}

module.exports = {
  execute,
  name: 'panel',
};
