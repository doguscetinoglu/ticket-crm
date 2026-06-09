import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Navbar } from "@/components/izin-portal/navbar";
import { StatusBadge, leaveTypeLabel } from "@/components/izin-portal/status-badge";
import { AnnouncementConfirmModal } from "@/components/izin-portal/announcement-confirm-modal";

export default async function DashboardPage() {
  const session = await requireLeaveSession();
  const year = new Date().getFullYear();

  const [employee, requests, balances, announcements] = await Promise.all([
    prisma.leaveEmployee.findUnique({
      where: { id: session.id },
      include: { manager: { select: { name: true, email: true } } },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId: session.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.leaveBalance.findMany({ where: { employeeId: session.id, year } }),
    prisma.leaveAnnouncement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        reads: { where: { employeeId: session.id }, select: { id: true } },
      },
    }),
  ]);

  const annual = balances.find((b) => b.leaveType === "ANNUAL");
  const sick = balances.find((b) => b.leaveType === "SICK");

  const requiresConfirmation = announcements.filter(
    (a) => a.requiresConfirmation && a.reads.length === 0
  );
  const unreadCount = announcements.filter((a) => a.reads.length === 0).length;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {requiresConfirmation.length > 0 && (
        <AnnouncementConfirmModal announcements={requiresConfirmation.map((a) => ({ id: a.id, title: a.title, content: a.content }))} />
      )}
      <Navbar user={session} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div className="fade-up">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            Hoş geldin, {session.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {employee?.department ?? "İzin durumunuzu buradan takip edebilirsiniz."}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Yıllık İzin", total: annual?.totalDays ?? 20, used: annual?.usedDays ?? 0, color: "var(--primary)" },
            { label: "Sağlık İzni", total: sick?.totalDays ?? 5, used: sick?.usedDays ?? 0, color: "var(--success)" },
            { label: "Bekleyen Talep", total: null, value: requests.filter((r) => r.status === "PENDING").length, color: "var(--warning)" },
            { label: "Onaylanan", total: null, value: requests.filter((r) => r.status === "APPROVED").length, color: "var(--success)" },
          ].map((item, i) => (
            <div key={i} className="card p-5">
              <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{item.label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: item.color }}>
                {item.total !== null ? item.total - (item.used ?? 0) : item.value}
              </p>
              {item.total !== null && (
                <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                  {item.used} / {item.total} kullanıldı
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>Son İzin Taleplerim</h2>
              <Link href="/izin-portal/leave/new" className="btn-primary text-xs px-3 py-1.5">+ Yeni Talep</Link>
            </div>
            {requests.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Henüz izin talebiniz yok.</p>
                <Link href="/izin-portal/leave/new" className="btn-primary inline-flex mt-3 text-sm px-4 py-2">
                  İlk talebinizi oluşturun
                </Link>
              </div>
            ) : (
              <div>
                {requests.map((req, i) => (
                  <Link key={req.id} href={`/izin-portal/leave/${req.id}`}
                    className="flex items-center justify-between px-5 py-3.5 row-hover"
                    style={{ borderBottom: i < requests.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{leaveTypeLabel(req.leaveType)}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        {format(new Date(req.startDate), "d MMM", { locale: tr })} – {format(new Date(req.endDate), "d MMM yyyy", { locale: tr })} · {req.days} gün
                      </p>
                    </div>
                    <StatusBadge status={req.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>Duyurular</h2>
              {unreadCount > 0 && (
                <span className="badge badge-pending text-xs">{unreadCount} yeni</span>
              )}
            </div>
            {announcements.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Henüz duyuru yok.</p>
              </div>
            ) : (
              <div>
                {announcements.map((a, i) => (
                  <div key={a.id} className="px-5 py-3.5"
                    style={{ borderBottom: i < announcements.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{a.title}</p>
                          {a.reads.length === 0 && (
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "var(--primary)" }} />
                          )}
                        </div>
                        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>{a.content}</p>
                        <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                          {format(new Date(a.createdAt), "d MMM yyyy", { locale: tr })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
