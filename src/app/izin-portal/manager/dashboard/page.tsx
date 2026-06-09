import { requireLeaveSession } from "@/lib/leave-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { StatusBadge, leaveTypeLabel } from "@/components/izin-portal/status-badge";
import { ApproveRejectButtons } from "@/components/izin-portal/approve-reject-buttons";

export default async function ManagerDashboardPage() {
  const session = await requireLeaveSession();
  if (session.role === "EMPLOYEE") redirect("/izin-portal/dashboard");

  const baseWhere = session.role === "HR_ADMIN"
    ? {}
    : { employee: { managerId: session.id } };

  const [pending, inReview] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { ...baseWhere, status: "PENDING" },
      include: { employee: { select: { name: true, email: true, department: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: { ...baseWhere, status: "IN_REVIEW" },
      include: { employee: { select: { name: true, email: true, department: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const allPending = [...pending, ...inReview];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="fade-up">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Onay Bekleyenler</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            {allPending.length > 0 ? `${allPending.length} talep bekliyor` : "Bekleyen talep yok"}
          </p>
        </div>

        {allPending.length === 0 ? (
          <div className="card p-12 text-center fade-up">
            <svg className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--text-tertiary)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-semibold" style={{ color: "var(--text)" }}>Bekleyen talep yok</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Tüm talepler işlendi.</p>
          </div>
        ) : (
          <div className="card overflow-hidden fade-up">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                  {["Çalışan", "Departman", "İzin Türü", "Tarih Aralığı", "Gün", "Durum", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold"
                      style={{ color: "var(--text-tertiary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPending.map((req, i) => (
                  <tr key={req.id} className="row-hover"
                    style={{ borderBottom: i < allPending.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <td className="px-4 py-3">
                      <Link href={`/izin-portal/leave/${req.id}`} className="font-medium hover:underline" style={{ color: "var(--text)" }}>
                        {req.employee.name}
                      </Link>
                      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{req.employee.email}</p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {req.employee.department ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text)" }}>{leaveTypeLabel(req.leaveType)}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>
                      {format(new Date(req.startDate), "d MMM", { locale: tr })} – {format(new Date(req.endDate), "d MMM yyyy", { locale: tr })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium" style={{ color: "var(--text)" }}>{req.days}</td>
                    <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                    <td className="px-4 py-3"><ApproveRejectButtons requestId={req.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
