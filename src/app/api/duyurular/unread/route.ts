import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Modal için: kullanıcının henüz görmediği (okuma kaydı olmayan) aktif duyurular
export async function GET() {
  const session = await getSession();
  if (!session || session.type === "customer")
    return NextResponse.json([], { status: 200 });

  const announcements = await prisma.announcement.findMany({
    where: {
      isActive: true,
      reads: { none: { userId: session.id } },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true, title: true, body: true, requireAck: true, createdAt: true,
      createdBy: { select: { name: true } },
    },
  });

  return NextResponse.json(announcements);
}
