import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { presenceStatus, type PresenceStatus } from "@/lib/presence";

/**
 * POST /api/presence — heartbeat. Giriş yapmış her ekip üyesi kendi kaydını günceller.
 * body: { path?: string; idle?: boolean; offline?: boolean }
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Müşteri portalı oturumları Customer tablosuna aittir — user id'leriyle karışmasın.
  if (session.type === "customer") return NextResponse.json({ ok: true });

  let body: { path?: string; idle?: boolean; offline?: boolean } = {};
  try {
    body = await req.json();
  } catch {}

  try {
    if (body.offline) {
      // Sekme kapandı / çıkış yapıldı → anında çevrimdışı.
      await prisma.user.update({
        where: { id: session.id },
        data: { lastSeenAt: null, lastSeenPath: null },
      });
    } else {
      const now = new Date();
      await prisma.user.update({
        where: { id: session.id },
        data: {
          lastSeenAt: now,
          lastSeenPath: typeof body.path === "string" ? body.path.slice(0, 120) : null,
          // Boştaysa son etkileşim zamanı korunur.
          ...(body.idle ? {} : { lastActiveAt: now }),
        },
      });
    }
  } catch {
    // Kullanıcı silinmiş olabilir — heartbeat sessizce yutulur.
    return NextResponse.json({ ok: false });
  }

  return NextResponse.json({ ok: true });
}

export interface PresenceUser {
  id: number;
  name: string;
  email: string;
  role: string;
  color: string;
  isAdmin: boolean;
  isActive: boolean;
  status: PresenceStatus;
  lastSeenAt: string | null;
  lastSeenPath: string | null;
}

const ORDER: Record<PresenceStatus, number> = { online: 0, idle: 1, offline: 2 };

/** GET /api/presence — sadece yöneticiler; tüm ekibin çevrimiçi durumu. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.type !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, email: true, role: true, color: true,
      isAdmin: true, isActive: true,
      lastSeenAt: true, lastActiveAt: true, lastSeenPath: true,
    },
  });

  const list: PresenceUser[] = users
    .map((u) => {
      const status = presenceStatus(u.lastSeenAt, u.lastActiveAt);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        color: u.color,
        isAdmin: u.isAdmin,
        isActive: u.isActive,
        status,
        lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
        // Çevrimdışıyken hangi sayfada olduğu bilgisi anlamsız.
        lastSeenPath: status === "offline" ? null : u.lastSeenPath,
      };
    })
    .sort((a, b) => {
      if (ORDER[a.status] !== ORDER[b.status]) return ORDER[a.status] - ORDER[b.status];
      const at = a.lastSeenAt ? Date.parse(a.lastSeenAt) : 0;
      const bt = b.lastSeenAt ? Date.parse(b.lastSeenAt) : 0;
      if (at !== bt) return bt - at;
      return a.name.localeCompare(b.name, "tr");
    });

  return NextResponse.json({
    users: list,
    online: list.filter((u) => u.status === "online").length,
    idle: list.filter((u) => u.status === "idle").length,
    serverTime: new Date().toISOString(),
  });
}
