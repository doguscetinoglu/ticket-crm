import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { sendTelegramMessage, replyMessage } from "@/lib/telegram";
import { sendReplyEmail } from "@/lib/email";
import { createNotification, notifyAdmins } from "@/lib/notifications";

interface Attachment { url: string; name: string; size: number; type: string; }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ticketId = parseInt(id);
  const replies = await prisma.ticketReply.findMany({
    where: { ticketId },
    include: { user: { select: { name: true, color: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(replies.map(r => ({
    ...r,
    attachments: JSON.parse(r.attachments ?? "[]") as Attachment[],
  })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const ticketId = parseInt(id);
  const { body, isInternal, attachments, workMinutes, solutionType, platform } = await req.json();
  if (!body?.trim() && (!attachments || attachments.length === 0)) {
    return NextResponse.json({ error: "Yanıt veya dosya gerekli" }, { status: 400 });
  }

  const userId = session.type === "customer" ? null : session.id;

  const reply = await prisma.ticketReply.create({
    data: {
      ticketId,
      userId,
      body: body?.trim() ?? "",
      isInternal: !!isInternal,
      attachments: JSON.stringify(attachments ?? []),
      workMinutes: workMinutes ? Number(workMinutes) : null,
      solutionType: solutionType || null,
      platform: platform || null,
    },
    include: { user: { select: { name: true, color: true } } },
  });

  if (session.type === "customer") {
    // Müşteri yanıtladı — assigned user + adminlere bildir
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { subject: true, assigneeId: true },
    });
    if (ticket) {
      const notifTitle = "Müşteri Yanıtladı";
      const notifBody = `"${ticket.subject}" biletine müşteri yanıtı geldi`;
      if (ticket.assigneeId) {
        await createNotification(ticket.assigneeId, "customer_reply", notifTitle, notifBody, "/tickets");
      }
      await notifyAdmins("customer_reply", notifTitle, notifBody, "/tickets", ticket.assigneeId ?? undefined);
    }
  }

  if (session.type !== "customer") {
    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: isInternal ? undefined : "Yanıtlandı" },
    });

    if (!isInternal) {
      const senderName = reply.user?.name ?? "Destek Ekibi";

      if (ticket.telegramChatId) {
        await sendTelegramMessage(
          ticket.telegramChatId,
          replyMessage(ticket.id, ticket.subject, senderName, body?.trim() ?? "(Dosya eklendi)")
        );
      }

      try {
        await sendReplyEmail(
          ticket.fromEmail,
          ticket.id,
          ticket.subject,
          senderName,
          body?.trim() ?? "",
          (attachments ?? []) as Attachment[],
        );
      } catch (e) {
        console.error("Reply email gönderilemedi:", e);
      }
    }
  }

  return NextResponse.json({
    ...reply,
    attachments: JSON.parse(reply.attachments ?? "[]") as Attachment[],
  }, { status: 201 });
}
