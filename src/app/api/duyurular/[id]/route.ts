import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { title, body, requireAck, isActive } = await req.json();

  const updated = await prisma.announcement.update({
    where: { id: Number(id) },
    data: {
      ...(title !== undefined ? { title: String(title).trim() } : {}),
      ...(body !== undefined ? { body: String(body).trim() } : {}),
      ...(requireAck !== undefined ? { requireAck: !!requireAck } : {}),
      ...(isActive !== undefined ? { isActive: !!isActive } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await prisma.announcement.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
