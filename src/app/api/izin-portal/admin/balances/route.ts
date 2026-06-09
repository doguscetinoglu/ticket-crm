import { NextRequest, NextResponse } from "next/server";
import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import { LeaveType } from "@/generated/prisma/enums";

export async function GET(req: NextRequest) {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

  const employees = await prisma.leaveEmployee.findMany({
    select: { id: true, name: true, email: true, department: true },
    orderBy: { name: "asc" },
  });
  const balances = await prisma.leaveBalance.findMany({ where: { year } });

  const data = employees.map((e) => ({
    ...e,
    balances: balances.filter((b) => b.employeeId === e.id),
  }));
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const { employeeId, year, balances } = await req.json();
  if (!employeeId || !year || !Array.isArray(balances))
    return NextResponse.json({ error: "employeeId, year ve balances zorunludur." }, { status: 400 });

  const results = await Promise.all(
    balances.map((b: { leaveType: string; totalDays: number; usedDays: number }) =>
      prisma.leaveBalance.upsert({
        where: { employeeId_year_leaveType: { employeeId, year, leaveType: b.leaveType as LeaveType } },
        update: { totalDays: b.totalDays, usedDays: b.usedDays },
        create: { employeeId, year, leaveType: b.leaveType as LeaveType, totalDays: b.totalDays, usedDays: b.usedDays },
      })
    )
  );
  return NextResponse.json(results);
}
