const supabase = require('../database/supabase');
const config = require('../config');
const logger = require('../utils/logger');

async function execute(interaction) {
  await interaction.deferReply({ flags: 64 });

  if (interaction.user.id !== config.adminId) {
    await interaction.editReply({ content: 'وصول مرفوض.' });
    return;
  }

  const action = interaction.customId;
  const discordId = interaction.user.id;

  let dmChannel;
  try {
    dmChannel = await interaction.user.createDM();
  } catch {
    await interaction.editReply({ content: 'لا أستطيع إرسال رسالة خاصة لك. يرجى تفعيل الرسائل الخاصة وحاول مرة أخرى.' });
    return;
  }

  switch (action) {
    case 'admin_check_credit':
      await dmChannel.send('أدخل اسم المستخدم أو معرف الديسكورد لعرض الرصيد:');
      await supabase.from('conversation_states').upsert(
        { discord_id: discordId, step: 'admin_check_credit_target', data: {}, updated_at: new Date().toISOString() },
        { onConflict: 'discord_id' }
      );
      break;

    case 'admin_add_credit':
      await dmChannel.send('أدخل عدد العملات لإضافتها:');
      await supabase.from('conversation_states').upsert(
        { discord_id: discordId, step: 'awaiting_amount', data: { adminAction: 'add' }, updated_at: new Date().toISOString() },
        { onConflict: 'discord_id' }
      );
      break;

    case 'admin_remove_credit':
      await dmChannel.send('أدخل عدد العملات لخصمها:');
      await supabase.from('conversation_states').upsert(
        { discord_id: discordId, step: 'awaiting_amount', data: { adminAction: 'remove' }, updated_at: new Date().toISOString() },
        { onConflict: 'discord_id' }
      );
      break;

    case 'admin_ban_user':
      await dmChannel.send('أدخل اسم المستخدم أو معرف الديسكورد لحظره:');
      await supabase.from('conversation_states').upsert(
        { discord_id: discordId, step: 'admin_ban_target', data: {}, updated_at: new Date().toISOString() },
        { onConflict: 'discord_id' }
      );
      break;

    case 'admin_unban_user':
      await dmChannel.send('أدخل اسم المستخدم أو معرف الديسكورد لإلغاء حظره:');
      await supabase.from('conversation_states').upsert(
        { discord_id: discordId, step: 'admin_unban_target', data: {}, updated_at: new Date().toISOString() },
        { onConflict: 'discord_id' }
      );
      break;

    default:
      await interaction.editReply({ content: 'إجراء غير معروف.' });
      return;
  }

  await interaction.editReply({ content: 'تحقق من رسائلك الخاصة لمتابعة العملية.' });
}

module.exports = {
  execute,
};
