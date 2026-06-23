import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Okundu / Okudum kaydı (upsert)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.type === "customer")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const announcementId = Number(id);
  const body = await req.json().catch(() => ({}));
  const acknowledged = !!body.acknowledged;

  const announcement = await prisma.announcement.findUnique({ where: { id: announcementId } });
  if (!announcement) return NextResponse.json({ error: "Duyuru bulunamadı" }, { status: 404 });

  const read = await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId, userId: session.id } },
    create: { announcementId, userId: session.id, acknowledged },
    update: { acknowledged: acknowledged ? true : undefined },
  });

  return NextResponse.json(read);
}
