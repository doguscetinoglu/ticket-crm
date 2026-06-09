import { NextRequest, NextResponse } from "next/server";
import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import { calculateWorkdays } from "@/lib/workdays";
import { submitLeaveRequest } from "@/lib/logoflow";

export async function GET(req: NextRequest) {
  const session = await requireLeaveSession();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where =
    session.role === "HR_ADMIN"
      ? status ? { status: status as never } : {}
      : session.role === "MANAGER"
      ? {
          OR: [
            { employeeId: session.id },
            { employee: { managerId: session.id } },
          ],
          ...(status ? { status: status as never } : {}),
        }
      : { employeeId: session.id, ...(status ? { status: status as never } : {}) };

  const requests = await prisma.leaveRequest.findMany({
    where,
    include: { employee: { select: { id: true, name: true, email: true, department: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(requests);
}

export async function POST(req: NextRequest) {
  const session = await requireLeaveSession();
  const { leaveType, startDate, endDate, description, address, handoverPersonId } = await req.json();
  if (!leaveType || !startDate || !endDate)
    return NextResponse.json({ error: "leaveType, startDate, endDate zorunludur." }, { status: 400 });

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (start > end) return NextResponse.json({ error: "Başlangıç tarihi bitiş tarihinden önce olmalıdır." }, { status: 400 });

  const days = calculateWorkdays(start, end);

  const balance = await prisma.leaveBalance.findUnique({
    where: { employeeId_year_leaveType: { employeeId: session.id, year: start.getFullYear(), leaveType } },
  });
  if (balance && balance.usedDays + days > balance.totalDays)
    return NextResponse.json({ error: "Yeterli izin bakiyeniz yok." }, { status: 400 });

  const employee = await prisma.leaveEmployee.findUnique({ where: { id: session.id } });

  const request = await prisma.leaveRequest.create({
    data: {
      employeeId: session.id,
      leaveType,
      startDate: start,
      endDate: end,
      days,
      description: description ?? null,
      address: address ?? null,
      handoverPersonId: handoverPersonId ?? null,
      status: "PENDING",
    },
  });

  await prisma.leaveStatusHistory.create({
    data: { leaveRequestId: request.id, status: "PENDING", changedBy: session.name, note: "Talep oluşturuldu." },
  });

  if (employee) {
    const logoRes = await submitLeaveRequest({
      employeeId: employee.id,
      employeeName: employee.name,
      employeeEmail: employee.email,
      leaveType,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      days,
      description: description ?? undefined,
      portalRequestId: request.id,
    });
    if (logoRes.flowId) {
      await prisma.leaveRequest.update({ where: { id: request.id }, data: { logoFlowId: logoRes.flowId, logoFlowStatus: logoRes.status } });
    }
  }

  return NextResponse.json(request, { status: 201 });
}
