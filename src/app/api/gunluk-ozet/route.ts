import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { renderPrintableDoc } from "@/lib/printableDoc";

// Türkiye 2016'dan beri sabit UTC+3 — gün sınırları buna göre hesaplanır.
const TZ_OFFSET = "+03:00";
const TZ = "Europe/Istanbul";

function istanbulToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

function dayRange(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00${TZ_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

const saat = (d: Date) => d.toLocaleTimeString("tr-TR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const gun = (d: Date) => d.toLocaleDateString("tr-TR", { timeZone: TZ });

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function buildSummary(userId: number, date: string) {
  const { start, end } = dayRange(date);
  const inDay = { gte: start, lt: end };

  const [user, replies, newTickets, touchedTickets, tasks, messages, logs, leave] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, isAdmin: true } }),
    prisma.ticketReply.findMany({
      where: { userId, createdAt: inDay },
      orderBy: { createdAt: "asc" },
      include: { ticket: { select: { id: true, subject: true, status: true, priority: true, customer: { select: { name: true, company: true } } } } },
    }),
    prisma.ticket.findMany({
      where: { assigneeId: userId, receivedAt: inDay },
      orderBy: { receivedAt: "asc" },
      select: { id: true, subject: true, status: true, priority: true, receivedAt: true, customer: { select: { name: true } } },
    }),
    prisma.ticket.findMany({
      where: { assigneeId: userId, updatedAt: inDay },
      orderBy: { updatedAt: "asc" },
      select: { id: true, subject: true, status: true, priority: true, updatedAt: true, customer: { select: { name: true } } },
    }),
    prisma.projectTask.findMany({
      where: { assigneeType: "user", assigneeId: userId, completedAt: inDay },
      orderBy: { completedAt: "asc" },
      include: { step: { select: { name: true, project: { select: { id: true, name: true } } } } },
    }),
    prisma.projectMessage.findMany({
      where: { userId, userType: { not: "customer" }, createdAt: inDay },
      orderBy: { createdAt: "asc" },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.projectLog.findMany({
      where: { userId, createdAt: inDay },
      orderBy: { createdAt: "asc" },
      include: { project: { select: { id: true, name: true } } },
    }),
    prisma.leave.findFirst({
      where: { userId, status: "Onaylandı", startDate: { lte: end }, endDate: { gte: start } },
      select: { type: true, startDate: true, endDate: true },
    }),
  ]);

  if (!user) return null;

  const workMinutes = replies.reduce((s, r) => s + (r.workMinutes ?? 0), 0);
  const closed = touchedTickets.filter(t => t.status === "Kapalı" || t.status === "Yanıtlandı");
  const uniqueTickets = new Set(replies.map(r => r.ticketId));

  return {
    date,
    user,
    leave,
    totals: {
      replies: replies.length,
      ticketsTouched: uniqueTickets.size,
      newTickets: newTickets.length,
      closedTickets: closed.length,
      tasksCompleted: tasks.length,
      projectMessages: messages.length,
      workMinutes,
    },
    replies: replies.map(r => ({
      time: saat(r.createdAt),
      ticketId: r.ticketId,
      subject: r.ticket.subject,
      customer: r.ticket.customer?.name ?? "-",
      status: r.ticket.status,
      priority: r.ticket.priority,
      isInternal: r.isInternal,
      workMinutes: r.workMinutes ?? 0,
      solutionType: r.solutionType ?? "",
      excerpt: r.body.replace(/\s+/g, " ").slice(0, 180),
    })),
    newTickets: newTickets.map(t => ({
      time: saat(t.receivedAt), id: t.id, subject: t.subject,
      customer: t.customer?.name ?? "-", status: t.status, priority: t.priority,
    })),
    closedTickets: closed.map(t => ({
      time: saat(t.updatedAt), id: t.id, subject: t.subject,
      customer: t.customer?.name ?? "-", status: t.status, priority: t.priority,
    })),
    tasks: tasks.map(t => ({
      time: t.completedAt ? saat(t.completedAt) : "-",
      project: t.step.project.name, projectId: t.step.project.id,
      step: t.step.name, title: t.title,
    })),
    messages: messages.map(m => ({
      time: saat(m.createdAt), project: m.project.name, projectId: m.project.id,
      excerpt: m.body.replace(/\s+/g, " ").slice(0, 180),
    })),
    logs: logs.map(l => ({ time: saat(l.createdAt), project: l.project.name, action: l.action })),
  };
}

type Summary = NonNullable<Awaited<ReturnType<typeof buildSummary>>>;

function sureMetni(dk: number): string {
  if (!dk) return "0 dk";
  const h = Math.floor(dk / 60), m = dk % 60;
  return h ? `${h} sa ${m} dk` : `${m} dk`;
}

function toExcel(s: Summary): Buffer {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Günlük Çalışma Özeti"],
    ["Kullanıcı", s.user.name],
    ["Rol", s.user.role],
    ["Tarih", gun(dayRange(s.date).start)],
    [],
    ["Bilet yanıtı", s.totals.replies],
    ["Dokunulan bilet", s.totals.ticketsTouched],
    ["Gün içinde gelen bilet", s.totals.newTickets],
    ["Kapanan/yanıtlanan bilet", s.totals.closedTickets],
    ["Tamamlanan proje görevi", s.totals.tasksCompleted],
    ["Proje mesajı", s.totals.projectMessages],
    ["Kayıtlı çalışma süresi", sureMetni(s.totals.workMinutes)],
    ...(s.leave ? [[], ["İzin", `${s.leave.type} (${gun(s.leave.startDate)} - ${gun(s.leave.endDate)})`]] : []),
  ]), "Özet");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Saat", "Bilet", "Konu", "Müşteri", "Durum", "Öncelik", "Tür", "Süre (dk)", "Çözüm", "Yanıt özeti"],
    ...s.replies.map(r => [r.time, `#${r.ticketId}`, r.subject, r.customer, r.status, r.priority,
      r.isInternal ? "İç not" : "Müşteriye", r.workMinutes, r.solutionType, r.excerpt]),
  ]), "Bilet Yanıtları");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Tür", "Saat", "Bilet", "Konu", "Müşteri", "Durum", "Öncelik"],
    ...s.newTickets.map(t => ["Gelen", t.time, `#${t.id}`, t.subject, t.customer, t.status, t.priority]),
    ...s.closedTickets.map(t => ["Kapanan/Yanıtlanan", t.time, `#${t.id}`, t.subject, t.customer, t.status, t.priority]),
  ]), "Biletler");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Saat", "Proje", "Adım", "Görev"],
    ...s.tasks.map(t => [t.time, t.project, t.step, t.title]),
  ]), "Tamamlanan Görevler");

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ["Saat", "Proje", "Tür", "İçerik"],
    ...s.messages.map(m => [m.time, m.project, "Mesaj", m.excerpt]),
    ...s.logs.map(l => [l.time, l.project, "Hareket", l.action]),
  ]), "Proje Hareketleri");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function table(headers: string[], rows: string[][], emptyText: string): string {
  if (!rows.length) return `<p class="empty">${esc(emptyText)}</p>`;
  return `<table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>` +
    rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") +
    `</tbody></table>`;
}

function toHtml(s: Summary, print: boolean): string {
  const t = s.totals;
  const body = [
    s.leave ? `<p><strong>İzinli:</strong> ${esc(s.leave.type)} (${gun(s.leave.startDate)} – ${gun(s.leave.endDate)})</p>` : "",
    "<h2>Günün Özeti</h2>",
    table(
      ["Bilet yanıtı", "Dokunulan bilet", "Gelen bilet", "Kapanan/yanıtlanan", "Tamamlanan görev", "Proje mesajı", "Kayıtlı süre"],
      [[String(t.replies), String(t.ticketsTouched), String(t.newTickets), String(t.closedTickets),
        String(t.tasksCompleted), String(t.projectMessages), sureMetni(t.workMinutes)]],
      "-",
    ),
    "<h2>Bilet Yanıtları</h2>",
    table(["Saat", "Bilet", "Konu", "Müşteri", "Tür", "Süre", "Yanıt özeti"],
      s.replies.map(r => [r.time, `#${r.ticketId}`, r.subject, r.customer,
        r.isInternal ? "İç not" : "Müşteriye", r.workMinutes ? `${r.workMinutes} dk` : "-", r.excerpt]),
      "Bu gün bilet yanıtı yok."),
    "<h2>Gün İçinde Gelen Biletler</h2>",
    table(["Saat", "Bilet", "Konu", "Müşteri", "Durum", "Öncelik"],
      s.newTickets.map(x => [x.time, `#${x.id}`, x.subject, x.customer, x.status, x.priority]),
      "Bu gün üzerine atanan yeni bilet yok."),
    "<h2>Kapanan / Yanıtlanan Biletler</h2>",
    table(["Saat", "Bilet", "Konu", "Müşteri", "Durum"],
      s.closedTickets.map(x => [x.time, `#${x.id}`, x.subject, x.customer, x.status]),
      "Bu gün kapanan bilet yok."),
    "<h2>Tamamlanan Proje Görevleri</h2>",
    table(["Saat", "Proje", "Adım", "Görev"],
      s.tasks.map(x => [x.time, x.project, x.step, x.title]),
      "Bu gün tamamlanan proje görevi yok."),
    "<h2>Proje Hareketleri</h2>",
    table(["Saat", "Proje", "Tür", "İçerik"],
      [...s.messages.map(m => [m.time, m.project, "Mesaj", m.excerpt]),
       ...s.logs.map(l => [l.time, l.project, "Hareket", l.action])],
      "Bu gün proje hareketi yok."),
  ].join("\n");

  return renderPrintableDoc({
    title: "Günlük Çalışma Özeti",
    subtitle: `${s.user.name} — ${gun(dayRange(s.date).start)}`,
    meta: [
      { label: "Kullanıcı", value: s.user.name },
      { label: "Rol", value: s.user.role },
      { label: "Tarih", value: gun(dayRange(s.date).start) },
      { label: "Kayıtlı çalışma", value: sureMetni(t.workMinutes) },
    ],
    bodyHtml: body,
    print,
    footerNote: `${s.user.name} · Günlük çalışma özeti · AnahtarDestek`,
  });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.type === "customer") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.get("date") ?? "") ? sp.get("date")! : istanbulToday();
  const format = sp.get("format") ?? "json";

  // Başka bir kullanıcının özetini yalnızca yöneticiler görebilir.
  const requested = Number(sp.get("userId"));
  const userId = requested && requested !== session.id
    ? (session.type === "admin" ? requested : session.id)
    : session.id;

  const summary = await buildSummary(userId, date);
  if (!summary) return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

  const TR: Record<string, string> = { ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i", ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u" };
  const slug = `${summary.user.name.replace(/[çÇğĞıİöÖşŞüÜ]/g, c => TR[c]).replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}-${date}`;

  if (format === "excel") {
    return new NextResponse(new Uint8Array(toExcel(summary)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="gunluk-ozet-${slug}.xlsx"`,
      },
    });
  }

  if (format === "html" || format === "pdf") {
    return new NextResponse(toHtml(summary, format === "pdf"), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return NextResponse.json(summary);
}
