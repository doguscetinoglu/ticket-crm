import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

export async function GET() {
  const session = await getSession();
  if (!session || session.type === "customer")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.type === "admin";

  if (isAdmin) {
    const [announcements, totalUsers] = await Promise.all([
      prisma.announcement.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true, title: true, body: true, requireAck: true, isActive: true, createdAt: true,
          createdBy: { select: { name: true } },
          reads: {
            select: { acknowledged: true, readAt: true, user: { select: { id: true, name: true, color: true } } },
          },
        },
      }),
      prisma.user.count({ where: { isActive: true } }),
    ]);
    return NextResponse.json({ announcements, totalUsers, isAdmin: true });
  }

  // Agent: aktif duyurular + kendi okuma durumu
  const announcements = await prisma.announcement.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, title: true, body: true, requireAck: true, isActive: true, createdAt: true,
      createdBy: { select: { name: true } },
      reads: { where: { userId: session.id }, select: { acknowledged: true, readAt: true } },
    },
  });
  return NextResponse.json({ announcements, isAdmin: false });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { title, body, requireAck } = await req.json();
  if (!title?.trim() || !body?.trim())
    return NextResponse.json({ error: "Başlık ve içerik zorunludur" }, { status: 400 });

  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      body: body.trim(),
      requireAck: !!requireAck,
      createdById: session.id,
    },
  });

  // Tüm aktif kullanıcılara bildirim (oluşturan hariç)
  const users = await prisma.user.findMany({
    where: { isActive: true, NOT: { id: session.id } },
    select: { id: true },
  });
  await Promise.all(
    users.map((u) =>
      createNotification(u.id, "announcement", "Yeni duyuru", announcement.title, "/duyurular"),
    ),
  );

  return NextResponse.json(announcement, { status: 201 });
}
