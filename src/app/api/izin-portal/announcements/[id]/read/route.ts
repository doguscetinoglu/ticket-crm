import { NextRequest, NextResponse } from "next/server";
import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireLeaveSession();
  const { id } = await params;

  await prisma.leaveAnnouncementRead.upsert({
    where: { announcementId_employeeId: { announcementId: id, employeeId: session.id } },
    update: {},
    create: { announcementId: id, employeeId: session.id },
  });
  return NextResponse.json({ ok: true });
}
