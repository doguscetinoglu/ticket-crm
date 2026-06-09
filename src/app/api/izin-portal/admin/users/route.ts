import { NextRequest, NextResponse } from "next/server";
import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

  const { name, email, password, role, department, managerId } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: "Ad, e-posta ve şifre zorunludur." }, { status: 400 });

  const exists = await prisma.leaveEmployee.findUnique({ where: { email } });
  if (exists) return NextResponse.json({ error: "Bu e-posta zaten kayıtlı." }, { status: 400 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.leaveEmployee.create({
    data: {
      name, email,
      password: hashed,
      role: role ?? "EMPLOYEE",
      department: department ?? null,
      managerId: managerId || null,
    },
  });
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role }, { status: 201 });
}
