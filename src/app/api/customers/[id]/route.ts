import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: Number(id) },
    include: {
      tickets: {
        include: {
          assignee: { select: { name: true, color: true } },
          replies: { select: { workMinutes: true } },
        },
        orderBy: { receivedAt: "desc" },
      },
      companies: { include: { company: true }, orderBy: { company: { name: "asc" } } },
      _count: { select: { tickets: true } },
    },
  });
  if (!customer) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  // Şifreyi gönderme
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...safe } = customer;
  return NextResponse.json(safe);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { name, company, phone, notes, monthlyPrice, portalPassword } = await req.json();

  const customer = await prisma.customer.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined && { name }),
      ...(company !== undefined && { company }),
      ...(phone !== undefined && { phone }),
      ...(notes !== undefined && { notes }),
      ...(monthlyPrice !== undefined && { monthlyPrice: monthlyPrice === "" ? null : Number(monthlyPrice) }),
      ...(portalPassword && { password: await bcrypt.hash(portalPassword, 10) }),
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...safe } = customer;
  return NextResponse.json(safe);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.type !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.customer.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
