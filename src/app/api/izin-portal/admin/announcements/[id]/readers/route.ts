import { NextRequest, NextResponse } from "next/server";
import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });

  const { id } = await params;
  const reads = await prisma.leaveAnnouncementRead.findMany({
    where: { announcementId: id },
    include: { employee: { select: { name: true, email: true, department: true } } },
    orderBy: { readAt: "asc" },
  });
  return NextResponse.json(reads);
}
