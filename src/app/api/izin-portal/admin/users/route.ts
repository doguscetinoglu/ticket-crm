import { NextRequest, NextResponse } from "next/server";
import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const users = await prisma.leaveEmployee.findMany({
    select: {
      id: true, name: true, email: true, role: true, department: true, managerId: true,
      manager: { select: { id: true, name: true } },
      _count: { select: { leaveRequests: true } },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const { name, email, role, department, managerId } = await req.json();
  if (!name || !email) return NextResponse.json({ error: "Ad ve e-posta zorunludur." }, { status: 400 });

  const exists = await prisma.leaveEmployee.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 400 });

  const user = await prisma.leaveEmployee.create({
    data: {
      name, email,
      role: role ?? "EMPLOYEE",
      department: department ?? null,
      managerId: managerId || null,
    },
  });
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 201 });
}
