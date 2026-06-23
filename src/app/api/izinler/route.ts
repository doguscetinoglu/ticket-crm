import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";

const LEAVE_TYPES = ["Yıllık İzin", "Mazeret İzni", "Hastalık İzni", "Ücretsiz İzin", "Diğer"];

// Gün sayısı (her iki uç dahil)
function dayDiff(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type === "customer")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = req.nextUrl.searchParams.get("scope"); // "mine" | "all"
  const onlyMine = scope === "mine" || session.type !== "admin";

  const leaves = await prisma.leave.findMany({
    where: onlyMine ? { userId: session.id } : {},
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    select: {
      id: true, type: true, startDate: true, endDate: true, days: true,
      reason: true, status: true, reviewedAt: true, reviewNote: true, createdAt: true,
      user: { select: { id: true, name: true, color: true } },
      reviewedBy: { select: { name: true } },
    },
  });

  return NextResponse.json(leaves);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.type === "customer")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { type, startDate, endDate, reason } = await req.json();
  if (!startDate || !endDate)
    return NextResponse.json({ error: "Başlangıç ve bitiş tarihi zorunludur" }, { status: 400 });

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()))
    return NextResponse.json({ error: "Geçersiz tarih" }, { status: 400 });
  if (end < start)
    return NextResponse.json({ error: "Bitiş tarihi başlangıçtan önce olamaz" }, { status: 400 });

  const leave = await prisma.leave.create({
    data: {
      userId: session.id,
      type: LEAVE_TYPES.includes(type) ? type : "Yıllık İzin",
      startDate: start,
      endDate: end,
      days: dayDiff(start, end),
      reason: reason?.trim() || null,
      status: "Beklemede",
    },
  });

  const fmt = (d: Date) => d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  await notifyAdmins(
    "leave",
    "Yeni izin talebi",
    `${session.name} — ${leave.type} (${fmt(start)} - ${fmt(end)}, ${leave.days} gün) onayınızı bekliyor.`,
    "/izinler",
    session.id,
  );

  return NextResponse.json(leave, { status: 201 });
}
