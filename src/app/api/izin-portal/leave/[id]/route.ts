import { NextRequest, NextResponse } from "next/server";
import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import { approveRequest, rejectRequest, cancelRequest } from "@/lib/logoflow";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLeaveSession();
  const { id } = await params;
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, email: true, department: true, manager: { select: { id: true, name: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!request) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });
  if (session.role === "EMPLOYEE" && request.employeeId !== session.id)
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  return NextResponse.json(request);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLeaveSession();
  const { id } = await params;
  const { action, note } = await req.json();

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true },
  });
  if (!request) return NextResponse.json({ error: "Bulunamadı." }, { status: 404 });

  if (action === "cancel") {
    if (request.employeeId !== session.id && session.role !== "HR_ADMIN")
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    if (!["PENDING", "IN_REVIEW"].includes(request.status))
      return NextResponse.json({ error: "Bu talep iptal edilemez." }, { status: 400 });

    const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    await prisma.leaveStatusHistory.create({
      data: { leaveRequestId: id, status: "CANCELLED", changedBy: session.name, note: note ?? "İptal edildi." },
    });
    if (request.logoFlowId) await cancelRequest(request.logoFlowId);
    return NextResponse.json(updated);
  }

  if (action === "approve") {
    if (session.role !== "MANAGER" && session.role !== "HR_ADMIN")
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

    const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: "APPROVED" } });
    await prisma.leaveStatusHistory.create({
      data: { leaveRequestId: id, status: "APPROVED", changedBy: session.name, note: note ?? "Onaylandı." },
    });
    await prisma.leaveBalance.upsert({
      where: { employeeId_year_leaveType: { employeeId: request.employeeId, year: request.startDate.getFullYear(), leaveType: request.leaveType } },
      update: { usedDays: { increment: request.days } },
      create: { employeeId: request.employeeId, year: request.startDate.getFullYear(), leaveType: request.leaveType, totalDays: 20, usedDays: request.days },
    });
    if (request.logoFlowId) await approveRequest(request.logoFlowId, note);
    return NextResponse.json(updated);
  }

  if (action === "reject") {
    if (session.role !== "MANAGER" && session.role !== "HR_ADMIN")
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

    const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: "REJECTED" } });
    await prisma.leaveStatusHistory.create({
      data: { leaveRequestId: id, status: "REJECTED", changedBy: session.name, note: note ?? "Reddedildi." },
    });
    if (request.logoFlowId) await rejectRequest(request.logoFlowId, note ?? "Reddedildi.");
    return NextResponse.json(updated);
  }

  if (action === "review") {
    if (session.role !== "MANAGER" && session.role !== "HR_ADMIN")
      return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
    const updated = await prisma.leaveRequest.update({ where: { id }, data: { status: "IN_REVIEW" } });
    await prisma.leaveStatusHistory.create({
      data: { leaveRequestId: id, status: "IN_REVIEW", changedBy: session.name, note: note ?? "İncelemeye alındı." },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Geçersiz action." }, { status: 400 });
}
