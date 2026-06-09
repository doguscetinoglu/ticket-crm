import { NextRequest, NextResponse } from "next/server";
import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await requireLeaveSession();
  const announcements = await prisma.leaveAnnouncement.findMany({
    include: { reads: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(announcements);
}

export async function POST(req: NextRequest) {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const { title, content, requiresConfirmation } = await req.json();
  if (!title || !content) return NextResponse.json({ error: "Başlık ve içerik zorunludur." }, { status: 400 });

  const announcement = await prisma.leaveAnnouncement.create({
    data: { title, content, requiresConfirmation: requiresConfirmation ?? false },
  });
  return NextResponse.json(announcement, { status: 201 });
}
