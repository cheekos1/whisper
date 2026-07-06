const coinService = require('../services/coinService');
const userService = require('../services/userService');

async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  const discordId = interaction.user.id;
  await userService.getOrCreateUser(discordId, interaction.user.username);

  const coins = await coinService.getUserCoins(discordId);

  await interaction.editReply({
    content: `🪙 **رصيدك الحالي:** ${coins} عملة`,
  });
}

module.exports = {
  execute,
  customId: 'check_credit',
};
