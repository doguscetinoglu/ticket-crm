import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const TZ = "Europe/Istanbul";

// Bir Date'i Europe/Istanbul gününe göre "YYYY-MM-DD" string'ine çevirir.
function dayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ }); // en-CA => YYYY-MM-DD
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type === "customer")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const monthParam = req.nextUrl.searchParams.get("month"); // "YYYY-MM"
  const now = new Date();
  const [year, month] = (monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
    .split("-").map(Number);

  // Ay sınırlarını TZ kaymalarından etkilenmemek için 1 gün payla genişlet
  const rangeStart = new Date(Date.UTC(year, month - 1, 1));
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  const rangeEnd = new Date(Date.UTC(year, month, 1));
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  const [users, tickets, leaves] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true, color: true },
    }),
    prisma.ticket.findMany({
      where: { receivedAt: { gte: rangeStart, lt: rangeEnd } },
      select: { id: true, assigneeId: true, receivedAt: true },
    }),
    prisma.leave.findMany({
      where: {
        status: "Onaylandı",
        startDate: { lt: rangeEnd },
        endDate: { gte: rangeStart },
      },
      select: {
        id: true, userId: true, type: true, startDate: true, endDate: true,
        user: { select: { name: true, color: true } },
      },
    }),
  ]);

  // Gün bazında: o gün oluşturulan ticket'ları atanana göre topla
  const days: Record<string, { total: number; byUser: Record<string, number>; unassigned: number }> = {};
  for (const t of tickets) {
    const key = dayKey(t.receivedAt);
    const bucket = (days[key] ??= { total: 0, byUser: {}, unassigned: 0 });
    bucket.total += 1;
    if (t.assigneeId == null) bucket.unassigned += 1;
    else bucket.byUser[t.assigneeId] = (bucket.byUser[t.assigneeId] ?? 0) + 1;
  }

  return NextResponse.json({
    users,
    days,
    leaves: leaves.map((l) => ({
      id: l.id,
      userId: l.userId,
      userName: l.user.name,
      color: l.user.color,
      type: l.type,
      startDate: dayKey(l.startDate),
      endDate: dayKey(l.endDate),
    })),
  });
}
