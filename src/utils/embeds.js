const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

function whisperPanelEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('Crown Whisper')
    .setImage('https://media.discordapp.net/attachments/1517141715629113435/1523728460256776252/ChatGPT_Image_Jul_6_2026_12_31_31_PM.png?ex=6a4d2a36&is=6a4bd8b6&hm=d4fae67a4e809b69f5fc8b67513547606555fcb703c0422980c85fe6bf4e4937&=&format=webp&quality=lossless&width=2476&height=872')
    .setDescription(
      'مرحباً بك في Crown Whisper!\n\n' +
      '**🕵️ إرسال مجهول** — أرسل رسالة مجهولة إلى أي عضو. ' +
      'إذا قبلها، يمكنكما بدء محادثة مجهولة. ' +
      'هويتك لن تُكشف أبداً. *(التكلفة: 40 عملة)*\n\n' +
      '**💬 إرسال همس** — أرسل همساً مباشراً لأي عضو. ' +
      'سيظهر اسم المستخدم الخاص بك. *(التكلفة: 10 عملات)*\n\n' +
      '**🪙 رصيدي** — تحقق من رصيد عملاتك.\n\n' +
      '**🗑 حذف المحادثات** — حذف رسائل البوت من رسائلك الخاصة.\n\n' +
      'ستحصل على **عملتين ذهبيتين** في كل رسالة ترسلها في شات السيرفر!'
    )
    .setColor(0x9B59B6);

  const row1 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('send_anonymous')
        .setLabel('إرسال مجهول')
        .setEmoji('🕵️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('send_whisper')
        .setLabel('إرسال همس')
        .setEmoji('💬')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('check_credit')
        .setLabel('رصيدي')
        .setEmoji('🪙')
        .setStyle(ButtonStyle.Secondary),
    );

  const row2 = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('delete_convo')
        .setLabel('حذف المحادثات')
        .setEmoji('🗑')
        .setStyle(ButtonStyle.Danger),
    );

  return { embeds: [embed], components: [row1, row2] };
}

function anonymousRequestEmbed(nickname, content, requestId) {
  const embed = new EmbedBuilder()
    .setTitle('رسالة مجهولة')
    .setDescription(
      `**الاسم المستعار:** ${nickname}\n\n**الرسالة:**\n${content}`
    )
    .setColor(0x9B59B6)
    .setFooter({ text: 'يمكنك القبول لبدء محادثة مجهولة، أو الرفض / الحذف.' });

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_request_${requestId}`)
        .setLabel('قبول')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`decline_request_${requestId}`)
        .setLabel('رفض')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`delete_request_${requestId}`)
        .setLabel('حذف')
        .setStyle(ButtonStyle.Secondary),
    );

  return { embeds: [embed], components: [row] };
}

function whisperEmbed(senderUsername, content) {
  const embed = new EmbedBuilder()
    .setTitle('همس من:')
    .setDescription(`${senderUsername}\n\n**الرسالة:**\n${content}`)
    .setColor(0x3498DB);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('delete_message')
        .setLabel('حذف')
        .setStyle(ButtonStyle.Secondary),
    );

  return { embeds: [embed], components: [row] };
}

function adminMenuEmbed() {
  const embed = new EmbedBuilder()
    .setTitle('لوحة التحكم')
    .setDescription('اختر إجراءً من الأسفل:')
    .setColor(0xE74C3C);

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('admin_check_credit')
        .setLabel('عرض الرصيد')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('admin_add_credit')
        .setLabel('إضافة عملات')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('admin_remove_credit')
        .setLabel('خصم عملات')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('admin_ban_user')
        .setLabel('حظر مستخدم')
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId('admin_unban_user')
        .setLabel('إلغاء حظر')
        .setStyle(ButtonStyle.Secondary),
    );

  return { embeds: [embed], components: [row] };
}

module.exports = {
  whisperPanelEmbed,
  anonymousRequestEmbed,
  whisperEmbed,
  adminMenuEmbed,
};
