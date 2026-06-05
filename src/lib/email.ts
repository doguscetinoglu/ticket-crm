import nodemailer from "nodemailer";

interface Attachment { url: string; name: string; size: number; type: string; }

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<style>
  body { margin:0; padding:0; background:#f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .wrap { max-width:600px; margin:32px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,.08); }
  .header { background:linear-gradient(135deg,#6366f1,#8b5cf6); padding:28px 32px; }
  .header h1 { margin:0; color:#fff; font-size:20px; font-weight:700; }
  .header p  { margin:4px 0 0; color:rgba(255,255,255,.7); font-size:13px; }
  .body { padding:28px 32px; color:#334155; font-size:14px; line-height:1.6; }
  .ticket-id { display:inline-block; background:#ede9fe; color:#7c3aed; font-weight:700; font-size:13px; padding:4px 12px; border-radius:20px; margin-bottom:16px; }
  .message-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:16px 20px; margin:16px 0; white-space:pre-wrap; font-size:13px; color:#475569; }
  .attachments { margin-top:12px; }
  .att-link { display:inline-flex; align-items:center; gap:6px; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; padding:6px 12px; margin:4px 4px 0 0; font-size:12px; color:#4f46e5; text-decoration:none; }
  .footer { padding:20px 32px; border-top:1px solid #f1f5f9; font-size:12px; color:#94a3b8; text-align:center; }
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>Fox CRM</h1>
    <p>Müşteri Destek Sistemi</p>
  </div>
  <div class="body">${content}</div>
  <div class="footer">Bu mail otomatik olarak oluşturulmuştur. Lütfen yanıtlamayın — yanıtlamak için bu maile reply yapabilirsiniz.</div>
</div>
</body>
</html>`;
}

export async function sendTicketConfirmationEmail(
  to: string,
  ticketId: number,
  subject: string,
): Promise<void> {
  const emailSubject = `[Ticket #${ticketId}] ${subject}`;
  const html = baseTemplate(`
    <p>Merhaba,</p>
    <p>Destek talebiniz başarıyla alındı.</p>
    <span class="ticket-id">Ticket #${ticketId}</span>
    <p><strong>Konu:</strong> ${subject}</p>
    <p>Ekibimiz talebinizi inceleyecek ve en kısa sürede dönüş yapacaktır.</p>
    <p>Bu maile doğrudan yanıt vererek iletişimi sürdürebilirsiniz.</p>
  `);

  await transporter.sendMail({
    from: `"Fox CRM" <${process.env.EMAIL_FROM}>`,
    to,
    subject: emailSubject,
    html,
    text: `Destek talebiniz alındı.\n\nTicket #${ticketId}\nKonu: ${subject}\n\nEkibimiz en kısa sürede dönüş yapacaktır.`,
    encoding: "utf-8",
  });
}

export async function sendTicketClosedEmail(
  to: string,
  ticketId: number,
  subject: string,
  surveyUrl: string,
): Promise<void> {
  const emailSubject = `[Ticket #${ticketId}] Destek talebiniz tamamlandı`;

  const starRow = [1, 2, 3, 4, 5]
    .map(
      (i) =>
        `<td style="padding:0 5px;"><div style="width:46px;height:46px;background:${
          i <= 4 ? "#f59e0b" : "#e2e8f0"
        };border-radius:12px;font-size:24px;text-align:center;line-height:46px;">${
          i <= 4 ? "★" : "☆"
        }</div></td>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:32px auto;padding:0 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed,#a855f7);border-radius:20px 20px 0 0;padding:40px 40px 32px;text-align:center;">
    <div style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:30px;margin-bottom:16px;">✓</div>
    <h1 style="margin:0 0 8px;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.3px;">Destek Talebiniz Tamamlandı</h1>
    <p style="margin:0;color:rgba(255,255,255,0.75);font-size:14px;">Talebiniz başarıyla çözüme kavuştu.</p>
  </div>

  <!-- Body -->
  <div style="background:#ffffff;padding:36px 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">

    <!-- Ticket badge -->
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
      <span style="display:inline-block;background:#ede9fe;color:#7c3aed;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;margin-bottom:8px;">Ticket #${ticketId}</span>
      <p style="margin:0;font-size:13px;color:#475569;font-weight:600;">${subject}</p>
    </div>

    <p style="margin:0 0 12px;font-size:15px;color:#1e293b;font-weight:600;">Merhaba,</p>
    <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.7;">
      Destek talebiniz ekibimiz tarafından incelenmiş ve tamamlanmıştır. Daha fazla yardıma ihtiyaç duymanız halinde yeni bir destek talebi oluşturabilirsiniz.
    </p>

    <!-- Divider -->
    <div style="border-top:2px dashed #e2e8f0;margin:0 0 28px;"></div>

    <!-- Survey section -->
    <p style="margin:0 0 6px;font-size:16px;color:#1e293b;font-weight:700;">Deneyiminizi Değerlendirin</p>
    <p style="margin:0 0 24px;font-size:13px;color:#94a3b8;line-height:1.6;">
      Yalnızca 2 dakikanızı ayırarak 5 soruluk kısa anketimizi doldurmanızı rica ediyoruz. Görüşleriniz hizmet kalitemizi doğrudan etkiliyor.
    </p>

    <!-- Stars preview -->
    <div style="text-align:center;margin:0 0 28px;">
      <p style="margin:0 0 14px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">GENEL MEMNUNİYETİNİZ</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr>${starRow}</tr>
      </table>
    </div>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 8px;">
      <tr>
        <td align="center">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td align="center" bgcolor="#5048e5" style="border-radius:50px;background-color:#5048e5;">
                <a href="${surveyUrl}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;padding:15px 44px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;font-family:Arial,Helvetica,sans-serif;border-radius:50px;white-space:nowrap;line-height:1;">
                  Anketi Doldur &#8594;
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="text-align:center;margin:0 0 8px;font-size:12px;color:#94a3b8;">Yaklaşık 2 dakika &middot; Tamamen gönüllüdür</p>
    <p style="text-align:center;margin:0;font-size:11px;color:#94a3b8;">Buton açılmıyorsa aşağıdaki linki kopyalayın:</p>
    <p style="text-align:center;margin:4px 0 0;font-size:11px;word-break:break-all;">
      <a href="${surveyUrl}" style="color:#6366f1;">${surveyUrl}</a>
    </p>

  </div>

  <!-- Footer -->
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 20px 20px;padding:20px 40px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.7;">
      Bu e-posta Fox CRM tarafından otomatik gönderilmiştir.<br>
      Anket bağlantısı 30 gün geçerlidir.
    </p>
  </div>

</div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Fox CRM" <${process.env.EMAIL_FROM}>`,
    to,
    subject: emailSubject,
    html,
    text: `Destek talebiniz (Ticket #${ticketId}) tamamlandı.\n\nKonu: ${subject}\n\nMemnuniyetinizi değerlendirmek için:\n${surveyUrl}\n\nYaklaşık 2 dakika sürer, tamamen gönüllüdür.`,
    encoding: "utf-8",
  });
}

export async function sendReplyEmail(
  to: string,
  ticketId: number,
  subject: string,
  agentName: string,
  body: string,
  attachments: Attachment[] = [],
): Promise<void> {
  const emailSubject = `Re: [Ticket #${ticketId}] ${subject}`;

  const attHtml = attachments.length > 0
    ? `<div class="attachments">
        <p style="font-size:12px;color:#64748b;margin:8px 0 4px;">Ekler:</p>
        ${attachments.map(a => `<a class="att-link" href="${a.url}" target="_blank">📎 ${a.name}</a>`).join("")}
       </div>`
    : "";

  const html = baseTemplate(`
    <p>Merhaba,</p>
    <p><strong>${agentName}</strong> destek talebinize yanıt verdi:</p>
    <span class="ticket-id">Ticket #${ticketId}</span>
    <div class="message-box">${body.replace(/\n/g, "<br>")}</div>
    ${attHtml}
    <p style="margin-top:20px;font-size:13px;color:#64748b;">Bu maile yanıt vererek konuşmaya devam edebilirsiniz.</p>
  `);

  const attText = attachments.length > 0
    ? `\n\nEkler:\n${attachments.map(a => `- ${a.name}: ${a.url}`).join("\n")}`
    : "";

  await transporter.sendMail({
    from: `"Fox CRM" <${process.env.EMAIL_FROM}>`,
    to,
    subject: emailSubject,
    html,
    text: `${agentName} destek talebinize yanıt verdi:\n\n${body}${attText}`,
    encoding: "utf-8",
  });
}
