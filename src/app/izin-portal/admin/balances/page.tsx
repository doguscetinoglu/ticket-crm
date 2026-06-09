import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import { BalanceRow } from "@/components/izin-portal/balance-row";

export default async function AdminBalancesPage() {
  await requireLeaveSession();
  const year = new Date().getFullYear();

  const employees = await prisma.leaveEmployee.findMany({
    select: { id: true, name: true, email: true, department: true },
    orderBy: { name: "asc" },
  });
  const balances = await prisma.leaveBalance.findMany({ where: { year } });

  const rows = employees.map((e) => ({
    ...e,
    annual: balances.find((b) => b.employeeId === e.id && b.leaveType === "ANNUAL") ?? null,
    sick: balances.find((b) => b.employeeId === e.id && b.leaveType === "SICK") ?? null,
  }));

  return (
    <main className="p-6 sm:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>İzin Bakiyeleri</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{year} yılı • {employees.length} çalışan</p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>Çalışan</th>
              <th className="px-4 py-3 text-center text-xs font-semibold" colSpan={3} style={{ color: "var(--text-tertiary)", borderLeft: "1px solid var(--border)" }}>
                Yıllık İzin
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold" colSpan={3} style={{ color: "var(--text-tertiary)", borderLeft: "1px solid var(--border)" }}>
                Hastalık İzni
              </th>
              <th className="px-4 py-3 text-xs font-semibold" style={{ color: "var(--text-tertiary)", borderLeft: "1px solid var(--border)" }} />
            </tr>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              <th className="px-4 py-2" />
              {["Toplam", "Kullanılan", "Kalan", "Toplam", "Kullanılan", "Kalan"].map((h, i) => (
                <th key={i} className="px-4 py-2 text-center text-xs" style={{ color: "var(--text-tertiary)" }}>{h}</th>
              ))}
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="row-hover"
                style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td className="px-4 py-3">
                  <p className="font-medium" style={{ color: "var(--text)" }}>{r.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{r.department ?? r.email}</p>
                </td>
                <BalanceRow
                  employeeId={r.id}
                  year={year}
                  annual={r.annual ? { totalDays: r.annual.totalDays, usedDays: r.annual.usedDays } : null}
                  sick={r.sick ? { totalDays: r.sick.totalDays, usedDays: r.sick.usedDays } : null}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
