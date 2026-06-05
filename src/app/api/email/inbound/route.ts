import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";
import { sendTicketConfirmationEmail } from "@/lib/email";
import { createNotification, notifyAdmins } from "@/lib/notifications";

const CATEGORIES = ["Genel", "Teknik Destek", "Fatura", "Öneri", "Şikayet"];
const PRIORITIES = ["Normal", "Yüksek", "Kritik"];

async function aiClassify(subject: string, body: string): Promise<{ category: string; priority: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { category: "Genel", priority: "Normal" };
  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [{
        role: "user",
        content: `Aşağıdaki destek talebini analiz et ve yalnızca JSON formatında yanıt ver.
Kategori (birini seç): Genel, Teknik Destek, Fatura, Öneri, Şikayet
Öncelik (birini seç): Normal, Yüksek, Kritik

Konu: ${subject}
Mesaj: ${body.substring(0, 500)}

{"category":"...","priority":"..."}`,
      }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text.trim();
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) return { category: "Genel", priority: "Normal" };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      category: CATEGORIES.includes(parsed.category) ? parsed.category : "Genel",
      priority: PRIORITIES.includes(parsed.priority) ? parsed.priority : "Normal",
    };
  } catch {
    return { category: "Genel", priority: "Normal" };
  }
}

// Email reply'larındaki quote kısmını temizle
function stripEmailQuote(text: string): string {
  // "Ad <email>, tarih tarihinde şunu yazdı:" ve sonrası (Türkçe/İngilizce)
  const quotePatterns = [
    /\n?[^\n]*<[^\n]+>\s*,?\s*\d{1,2}\s+\w+\s+\d{4}[^\n]*yazdı\s*:[\s\S]*/i,
    /\n?On\s+.+wrote\s*:[\s\S]*/i,
    /\n?[-]{2,}\s*(Original Message|Forwarded message)[\s\S]*/i,
    /\n?>{1}[\s\S]*/,  // "> " ile başlayan quoted satırlar
  ];
  let result = text;
  for (const pattern of quotePatterns) {
    const cleaned = result.replace(pattern, "").trim();
    if (cleaned.length > 0) result = cleaned;
  }
  return result.trim();
}

// Ticket ID'yi email konusundan çıkar: "[#42]", "#42", "[Ticket #42]" gibi pattern'lar
function extractTicketId(subject: string): number | null {
  const match = subject.match(/#(\d+)/);
  return match ? parseInt(match[1]) : null;
}

// N8N email node hem string hem obje gönderebilir: "ali@test.com" veya {value:[{address:"ali@test.com"}]}
function resolveEmail(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw.trim() || null;
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // N8N IMAP format: { value: [{address, name}], text: "Name <email>" }
    if (Array.isArray(obj.value) && obj.value.length > 0) {
      const first = obj.value[0] as Record<string, unknown>;
      if (typeof first.address === "string") return first.address;
    }
    if (typeof obj.text === "string") {
      const match = obj.text.match(/<([^>]+)>/);
      return match ? match[1] : obj.text.trim() || null;
    }
    if (typeof obj.address === "string") return obj.address;
  }
  return null;
}

function resolveName(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") return raw.trim() || null;
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.value) && obj.value.length > 0) {
      const first = obj.value[0] as Record<string, unknown>;
      if (typeof first.name === "string") return first.name.trim() || null;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // N8N farklı alan adları kullanabilir — normalize et
    const from     = resolveEmail(payload.from);
    const fromName = resolveName(payload.fromName ?? payload.from) ?? resolveName(payload.from);
    const subject  = typeof payload.subject === "string" ? payload.subject.trim() : null;
    // N8N: body, text veya html — quote kısmı temizlenir
    const rawBody  = payload.body ?? payload.text ?? payload.html ?? "";
    const body     = stripEmailQuote(typeof rawBody === "string" ? rawBody : String(rawBody));
    const messageId  = payload.messageId ?? payload.message_id ?? null;
    const inReplyTo  = payload.inReplyTo ?? payload.in_reply_to ?? null;

    if (!from || !subject) {
      return NextResponse.json({ error: "from ve subject zorunludur", received: { from: payload.from, subject: payload.subject } }, { status: 400 });
    }

    // Duplicate kontrolü
    if (messageId) {
      const existing = await prisma.ticket.findFirst({
        where: { emailMessageId: String(messageId) },
      });
      if (existing) {
        return NextResponse.json({ success: true, duplicate: true, ticket: existing });
      }
    }

    // Ticket ID var mı kontrol et (yanıt mı, yeni ticket mi?)
    const subjectTicketId = extractTicketId(subject);
    const replyToTicketId = inReplyTo ? extractTicketId(String(inReplyTo)) : null;
    const linkedTicketId  = subjectTicketId ?? replyToTicketId;

    if (linkedTicketId) {
      const ticket = await prisma.ticket.findUnique({ where: { id: linkedTicketId } });
      if (ticket) {
        const reply = await prisma.ticketReply.create({
          data: {
            ticketId: ticket.id,
            userId: null,
            body,
            isInternal: false,
            attachments: "[]",
          },
        });

        // Müşteri e-posta yanıtı — assigned user + adminlere bildir
        const notifTitle = "Müşteri E-posta Yanıtı";
        const notifBody = `"${ticket.subject}" biletine e-posta yanıtı geldi`;
        if (ticket.assigneeId) {
          await createNotification(ticket.assigneeId, "customer_reply", notifTitle, notifBody, "/tickets");
        }
        await notifyAdmins("customer_reply", notifTitle, notifBody, "/tickets", ticket.assigneeId ?? undefined);

        return NextResponse.json({ success: true, reply }, { status: 201 });
      }
    }

    // Yeni ticket oluştur
    const { category, priority } = await aiClassify(subject, typeof body === "string" ? body : "");

    const ticket = await prisma.ticket.create({
      data: {
        subject,
        body,
        fromEmail: from,
        fromName: fromName ?? null,
        category,
        priority,
        status: "Yeni",
        source: "email",
        emailMessageId: messageId ? String(messageId) : null,
      },
    });

    // Alındı bildirimi gönder
    try {
      await sendTicketConfirmationEmail(from, ticket.id, subject);
    } catch (e) {
      console.error("Confirmation email gönderilemedi:", e);
    }

    // Yeni bilet — tüm adminlere bildir
    await notifyAdmins(
      "new_ticket",
      "Yeni Bilet Geldi",
      `${from} tarafından: "${subject}"`,
      "/tickets",
    );

    return NextResponse.json({ success: true, ticket }, { status: 201 });
  } catch (err) {
    console.error("Email inbound error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Sunucu hatası", detail: message }, { status: 500 });
  }
}
