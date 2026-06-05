import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage, statusMessage } from "@/lib/telegram";
import { createNotification, notifyAdmins } from "@/lib/notifications";
import { sendTicketClosedEmail } from "@/lib/email";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, assigneeId, customerId, category, priority, solutionType, platform } = body;

    // Durum değişikliği ve atama değişikliği için mevcut durumu al
    const current = await prisma.ticket.findUnique({
      where: { id: Number(id) },
      select: { status: true, assigneeId: true, subject: true },
    });
    const oldStatus = current?.status;
    const oldAssigneeId = current?.assigneeId;

    const ticket = await prisma.ticket.update({
      where: { id: Number(id) },
      data: {
        ...(status !== undefined && { status }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId === null ? null : Number(assigneeId) }),
        ...(customerId !== undefined && { customerId: customerId === null ? null : Number(customerId) }),
        ...(category !== undefined && { category }),
        ...(priority !== undefined && { priority }),
        ...(solutionType !== undefined && { solutionType: solutionType || null }),
        ...(platform !== undefined && { platform: platform || null }),
      },
      include: { assignee: true, customer: true },
    });

    // Telegram bildirimi
    if (status !== undefined && oldStatus !== status && ticket.telegramChatId) {
      await sendTelegramMessage(
        ticket.telegramChatId,
        statusMessage(ticket.id, ticket.subject, oldStatus!, status)
      );
    }

    // Atama bildirimi
    const newAssigneeId = assigneeId !== undefined ? (assigneeId === null ? null : Number(assigneeId)) : undefined;
    if (
      newAssigneeId !== undefined &&
      newAssigneeId !== null &&
      newAssigneeId !== oldAssigneeId
    ) {
      await createNotification(
        newAssigneeId,
        "ticket_assigned",
        "Bilet Atandı",
        `"${current?.subject}" bileti size atandı`,
        "/tickets",
      );
    }

    // Ticket kapatıldıysa: kapanma maili + anket gönder
    if (status === "Kapalı" && oldStatus !== "Kapalı") {
      const existing = await prisma.survey.findUnique({ where: { ticketId: ticket.id } });
      if (!existing) {
        const token = randomUUID();
        await prisma.survey.create({ data: { ticketId: ticket.id, token } });
        const appUrl = new URL(process.env.APP_URL || "https://ticket-crm-xi.vercel.app").origin;
        const surveyUrl = `${appUrl}/anket/${token}`;
        try {
          await sendTicketClosedEmail(ticket.fromEmail, ticket.id, ticket.subject, surveyUrl);
        } catch (e) {
          console.error("Kapanma/anket maili gönderilemedi:", e);
        }
      }
    }

    return NextResponse.json(ticket);
  } catch (err) {
    console.error("PATCH ticket error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.ticket.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE ticket error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
