import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await requireLeaveSession();
  const year = new Date().getFullYear();

  const [totalUsers, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    prisma.leaveEmployee.count(),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.leaveRequest.count({ where: { status: "APPROVED", startDate: { gte: new Date(year, 0, 1) } } }),
    prisma.leaveRequest.count({ where: { status: "REJECTED", startDate: { gte: new Date(year, 0, 1) } } }),
  ]);

  const recentRequests = await prisma.leaveRequest.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { employee: { select: { name: true, department: true } } },
  });

  const stats = [
    { label: "Toplam Kullanıcı", value: totalUsers, color: "var(--primary)", icon: "👥" },
    { label: "Bekleyen Talepler", value: pendingCount, color: "var(--warning)", icon: "⏳" },
    { label: `${year} Onaylanan`, value: approvedCount, color: "var(--success)", icon: "✅" },
    { label: `${year} Reddedilen`, value: rejectedCount, color: "var(--error)", icon: "❌" },
  ];

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "Bekliyor", IN_REVIEW: "İncelemede", APPROVED: "Onaylandı",
    REJECTED: "Reddedildi", CANCELLED: "İptal",
  };
  const STATUS_COLORS: Record<string, string> = {
    PENDING: "var(--warning)", IN_REVIEW: "var(--primary)", APPROVED: "var(--success)",
    REJECTED: "var(--error)", CANCELLED: "var(--text-tertiary)",
  };

  return (
    <main className="p-6 sm:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Admin Genel Bakış</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Hoş geldin, {session.name}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs mt-1 font-medium" style={{ color: "var(--text-secondary)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <h2 className="font-semibold" style={{ color: "var(--text)" }}>Son İzin Talepleri</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              {["Çalışan", "Tür", "Tarih", "Gün", "Durum"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recentRequests.map((r, i) => (
              <tr key={r.id} className="row-hover"
                style={{ borderBottom: i < recentRequests.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td className="px-4 py-3">
                  <p className="font-medium" style={{ color: "var(--text)" }}>{r.employee.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{r.employee.department ?? "—"}</p>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{r.leaveType}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {new Date(r.startDate).toLocaleDateString("tr-TR")} – {new Date(r.endDate).toLocaleDateString("tr-TR")}
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{r.days}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium" style={{ color: STATUS_COLORS[r.status] }}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
