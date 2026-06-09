import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { StatusBadge, leaveTypeLabel } from "@/components/izin-portal/status-badge";

export default async function AdminLeavesPage() {
  await requireLeaveSession();

  const requests = await prisma.leaveRequest.findMany({
    include: { employee: { select: { name: true, department: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>İzin Talepleri</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{requests.length} toplam talep</p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              {["Çalışan", "Tür", "Tarih Aralığı", "Gün", "Durum", "Tarih", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {requests.map((r, i) => (
              <tr key={r.id} className="row-hover"
                style={{ borderBottom: i < requests.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td className="px-4 py-3">
                  <p className="font-medium" style={{ color: "var(--text)" }}>{r.employee.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{r.employee.department ?? "—"}</p>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{leaveTypeLabel(r.leaveType)}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {format(new Date(r.startDate), "d MMM", { locale: tr })} – {format(new Date(r.endDate), "d MMM yyyy", { locale: tr })}
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: "var(--text)" }}>{r.days}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {format(new Date(r.createdAt), "d MMM yyyy", { locale: tr })}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/izin-portal/leave/${r.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
                    Detay
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
