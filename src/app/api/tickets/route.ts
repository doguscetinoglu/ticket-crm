import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotification, notifyAdmins } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type === "customer") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { subject, body, fromEmail, fromName, category, priority, assigneeId, customerId } = await req.json();
  if (!subject?.trim() || !fromEmail?.trim()) {
    return NextResponse.json({ error: "Konu ve e-posta zorunludur" }, { status: 400 });
  }

  const ticket = await prisma.ticket.create({
    data: {
      subject: subject.trim(),
      body: body?.trim() ?? "",
      fromEmail: fromEmail.trim(),
      fromName: fromName?.trim() || null,
      category: category ?? "Genel",
      priority: priority ?? "Normal",
      status: "Yeni",
      source: "manuel",
      assigneeId: assigneeId ? Number(assigneeId) : null,
      customerId: customerId ? Number(customerId) : null,
    },
    include: { assignee: true, customer: true },
  });
  // Yeni bilet bildirimi — tüm adminlere + atandıysa o kullanıcıya
  await notifyAdmins(
    "new_ticket",
    "Yeni Bilet Oluşturuldu",
    `"${ticket.subject}" — ${ticket.fromEmail}`,
    "/tickets",
    ticket.assigneeId ?? undefined,
  );
  if (ticket.assigneeId) {
    await createNotification(
      ticket.assigneeId,
      "ticket_assigned",
      "Bilet Size Atandı",
      `"${ticket.subject}" bileti oluşturulurken size atandı`,
      "/tickets",
    );
  }

  return NextResponse.json(ticket, { status: 201 });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: any = {};
  if (session.type === "agent") {
    where = { OR: [{ assigneeId: session.id }, { assigneeId: null }] };
  } else if (session.type === "customer") {
    where = { customerId: session.id };
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      assignee: true,
      customer: { select: { id: true, name: true, company: true } },
    },
    orderBy: { receivedAt: "desc" },
  });
  return NextResponse.json(tickets);
}
