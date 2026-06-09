import { NextRequest, NextResponse } from "next/server";
import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const { id } = await params;
  const { title, content, requiresConfirmation, isActive } = await req.json();
  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = title;
  if (content !== undefined) data.content = content;
  if (requiresConfirmation !== undefined) data.requiresConfirmation = requiresConfirmation;
  if (isActive !== undefined) data.isActive = isActive;

  const announcement = await prisma.leaveAnnouncement.update({ where: { id }, data });
  return NextResponse.json(announcement);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const { id } = await params;
  await prisma.leaveAnnouncement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
