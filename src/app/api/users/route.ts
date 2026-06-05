import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
    include: {
      _count: { select: { tickets: true } },
      tickets: { where: { status: { notIn: ["Kapalı", "Yanıtlandı"] } }, select: { id: true } },
    },
  });

  return NextResponse.json(users.map(({ password: _, ...u }) => ({
    ...u,
    openTickets: u.tickets.length,
  })));
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { name, email, password, role, color, isAdmin } = await req.json();
  if (!name || !email || !password) {
    return NextResponse.json({ error: "name, email, password zorunludur" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Bu e-posta zaten kayıtlı" }, { status: 409 });

  const { password: _, ...user } = await prisma.user.create({
    data: {
      name, email,
      password: await bcrypt.hash(password, 10),
      role: role ?? "Kullanıcı",
      color: color ?? "indigo",
      isAdmin: isAdmin ?? false,
    },
  });

  return NextResponse.json(user, { status: 201 });
}
