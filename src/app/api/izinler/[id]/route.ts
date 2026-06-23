import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

// Onay / Red — sadece admin
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const leaveId = Number(id);
  const { status, reviewNote } = await req.json();

  if (!["Onaylandı", "Reddedildi", "Beklemede"].includes(status))
    return NextResponse.json({ error: "Geçersiz durum" }, { status: 400 });

  const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
  if (!leave) return NextResponse.json({ error: "İzin bulunamadı" }, { status: 404 });

  const updated = await prisma.leave.update({
    where: { id: leaveId },
    data: {
      status,
      reviewNote: reviewNote?.trim() || null,
      reviewedById: status === "Beklemede" ? null : session.id,
      reviewedAt: status === "Beklemede" ? null : new Date(),
    },
  });

  if (status !== "Beklemede") {
    const fmt = (d: Date) => d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    await createNotification(
      leave.userId,
      "leave",
      status === "Onaylandı" ? "İzniniz onaylandı" : "İzniniz reddedildi",
      `${leave.type} (${fmt(leave.startDate)} - ${fmt(leave.endDate)}) talebiniz ${status === "Onaylandı" ? "onaylandı" : "reddedildi"}.${reviewNote ? ` Not: ${reviewNote}` : ""}`,
      "/izinler",
    );
  }

  return NextResponse.json(updated);
}

// Silme — sahibi (beklemedeyse) veya admin
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.type === "customer")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const leave = await prisma.leave.findUnique({ where: { id: Number(id) } });
  if (!leave) return NextResponse.json({ error: "İzin bulunamadı" }, { status: 404 });

  const isOwner = leave.userId === session.id;
  const isAdmin = session.type === "admin";
  if (!isAdmin && !(isOwner && leave.status === "Beklemede"))
    return NextResponse.json({ error: "Yetkiniz yok" }, { status: 403 });

  await prisma.leave.delete({ where: { id: leave.id } });
  return NextResponse.json({ ok: true });
}
