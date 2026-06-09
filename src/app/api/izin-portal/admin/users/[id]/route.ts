import { NextRequest, NextResponse } from "next/server";
import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const { id } = await params;
  const { name, email, password, role, department, managerId } = await req.json();

  const data: Record<string, unknown> = {};
  if (name) data.name = name;
  if (email) data.email = email;
  if (role) data.role = role;
  if (department !== undefined) data.department = department || null;
  if (managerId !== undefined) data.managerId = managerId || null;
  if (password) data.password = await bcrypt.hash(password, 12);

  const user = await prisma.leaveEmployee.update({ where: { id }, data });
  return NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const { id } = await params;
  if (id === session.id) return NextResponse.json({ error: "Kendi hesabınızı silemezsiniz." }, { status: 400 });

  await prisma.leaveEmployee.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
