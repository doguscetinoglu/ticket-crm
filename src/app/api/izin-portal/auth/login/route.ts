import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signLeaveToken, LEAVE_COOKIE } from "@/lib/leave-session";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "E-posta ve şifre zorunludur." }, { status: 400 });

  const employee = await prisma.leaveEmployee.findUnique({ where: { email } });
  if (!employee) return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });

  const valid = await bcrypt.compare(password, employee.password);
  if (!valid) return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });

  const token = await signLeaveToken({ id: employee.id, email: employee.email, name: employee.name, role: employee.role });
  const cookieStore = await cookies();
  cookieStore.set(LEAVE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ role: employee.role });
}
