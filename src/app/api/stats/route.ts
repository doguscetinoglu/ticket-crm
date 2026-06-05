import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isAdmin = session.type === "admin";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseWhere: any = isAdmin
      ? {}
      : { OR: [{ assigneeId: session.id }, { assigneeId: null }] };

    const now = new Date();
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const startOfWeek = new Date(startOfToday); startOfWeek.setUTCDate(startOfWeek.getUTCDate() - 7);
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

    const [
      total, open, inProgress, answered, closed,
      todayCount, weekCount, monthCount, unassigned,
      byCategory, byPriority,
      users,
      recent,
      allTickets,
      customerCount,
      myAssigned,
    ] = await Promise.all([
      prisma.ticket.count({ where: baseWhere }),
      prisma.ticket.count({ where: { ...baseWhere, status: "Yeni" } }),
      prisma.ticket.count({ where: { ...baseWhere, status: "İnceleniyor" } }),
      prisma.ticket.count({ where: { ...baseWhere, status: "Yanıtlandı" } }),
      prisma.ticket.count({ where: { ...baseWhere, status: "Kapalı" } }),
      prisma.ticket.count({ where: { ...baseWhere, receivedAt: { gte: startOfToday } } }),
      prisma.ticket.count({ where: { ...baseWhere, receivedAt: { gte: startOfWeek } } }),
      prisma.ticket.count({ where: { ...baseWhere, receivedAt: { gte: startOfMonth } } }),
      prisma.ticket.count({ where: { assigneeId: null } }), // havuz her zaman global
      prisma.ticket.groupBy({ by: ["category"], where: baseWhere, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
      prisma.ticket.groupBy({ by: ["priority"], where: baseWhere, _count: { id: true }, orderBy: { _count: { id: "desc" } } }),
      isAdmin ? prisma.user.findMany({
        include: {
          _count: { select: { tickets: true } },
          tickets: { where: { status: { notIn: ["Kapalı", "Yanıtlandı"] } }, select: { id: true } },
        },
        orderBy: { id: "asc" },
      }) : Promise.resolve([]),
      prisma.ticket.findMany({
        where: baseWhere,
        take: 8,
        orderBy: { receivedAt: "desc" },
        include: {
          assignee: { select: { name: true, color: true } },
          customer: { select: { id: true, name: true, company: true } },
        },
      }),
      prisma.ticket.findMany({
        where: { ...baseWhere, receivedAt: { gte: sixMonthsAgo } },
        select: { receivedAt: true },
      }),
      isAdmin ? prisma.customer.count() : Promise.resolve(0),
      // Agent için kendi atanan ticket sayısı
      !isAdmin ? prisma.ticket.count({ where: { assigneeId: session.id } }) : Promise.resolve(0),
    ]);

    // Son 7 gün (UTC)
    const dailyMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setUTCDate(d.getUTCDate() - i);
      dailyMap[d.toISOString().split("T")[0]] = 0;
    }

    // Aylık trend (son 6 ay)
    const monthlyMap: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = 0;
    }

    const hourlyMap: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyMap[h] = 0;

    const weekdayMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

    for (const t of allTickets) {
      const d = new Date(t.receivedAt);
      const dayKey = d.toISOString().split("T")[0];
      if (dayKey in dailyMap) dailyMap[dayKey]++;
      const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      if (monthKey in monthlyMap) monthlyMap[monthKey]++;
      hourlyMap[d.getUTCHours()]++;
      weekdayMap[d.getUTCDay()]++;
    }

    const dailyData = Object.entries(dailyMap).map(([date, count]) => ({ date, count }));
    const monthlyData = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));
    const hourlyData = Object.entries(hourlyMap).map(([hour, count]) => ({ hour: Number(hour), count }));
    const DAYS_TR = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
    const weekdayData = Object.entries(weekdayMap).map(([day, count]) => ({ day: DAYS_TR[Number(day)], count }));

    const topCustomersRaw = isAdmin ? await prisma.customer.findMany({
      select: {
        id: true, email: true, name: true, company: true,
        _count: { select: { tickets: true } },
        tickets: { select: { replies: { select: { workMinutes: true } } } },
      },
      orderBy: { tickets: { _count: "desc" } },
      take: 5,
    }) : [];
    const topCustomers = topCustomersRaw.map(c => ({
      id: c.id, email: c.email, name: c.name, company: c.company,
      _count: c._count,
      totalWorkMinutes: c.tickets.reduce((sum, t) =>
        sum + t.replies.reduce((s, r) => s + (r.workMinutes ?? 0), 0), 0),
    }));

    return NextResponse.json({
      isAdmin,
      total, open, inProgress, answered, closed,
      todayCount, weekCount, monthCount, unassigned,
      customerCount, myAssigned,
      byCategory, byPriority,
      users: users.map(u => ({ ...u, openTickets: u.tickets.length })),
      recent,
      dailyData, monthlyData, hourlyData, weekdayData,
      topCustomers,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
