import { isEnabled, NOTIFY_TELEGRAM } from "./settings";

export async function sendTelegramMessage(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  if (!(await isEnabled(NOTIFY_TELEGRAM))) {
    console.log("[telegram] bildirimler kapalı — mesaj atlandı");
    return;
  }
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {
    // Telegram bildirimi kritik değil, hata olsa da devam et
  }
}

export function statusMessage(id: number, subject: string, oldStatus: string, newStatus: string): string {
  const statusLine = `📊 ${oldStatus} → ${newStatus}`;
  if (newStatus === "Kapalı") {
    return `✅ Destek talebiniz kapatıldı.\n\n🎫 Ticket #${id} — ${subject}\n${statusLine}\n\nİyi günler!`;
  }
  if (newStatus === "Yanıtlandı") {
    return `💬 Talebinize yanıt verildi.\n\n🎫 Ticket #${id} — ${subject}\n${statusLine}\n\nLütfen portala giriş yaparak yanıtı inceleyin.`;
  }
  if (newStatus === "İnceleniyor") {
    return `👀 Talebiniz incelemeye alındı.\n\n🎫 Ticket #${id} — ${subject}\n${statusLine}`;
  }
  return `🔄 Destek talebinizin durumu güncellendi.\n\n🎫 Ticket #${id} — ${subject}\n${statusLine}`;
}

export function replyMessage(id: number, subject: string, userName: string, body: string): string {
  const preview = body.length > 300 ? body.substring(0, 300) + "..." : body;
  return `💬 Destek talebinize yanıt geldi!\n\n🎫 Ticket #${id} — ${subject}\n👤 <b>${userName}</b>:\n\n${preview}`;
}
