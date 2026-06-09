import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DeleteUserButton } from "@/components/izin-portal/delete-user-button";

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: "Çalışan", MANAGER: "Yönetici", HR_ADMIN: "HR Admin",
};

export default async function AdminUsersPage() {
  await requireLeaveSession();
  const users = await prisma.leaveEmployee.findMany({
    select: {
      id: true, name: true, email: true, role: true, department: true,
      manager: { select: { name: true } },
      _count: { select: { leaveRequests: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <main className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Kullanıcılar</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{users.length} kullanıcı</p>
        </div>
        <Link href="/izin-portal/admin/users/new" className="btn-primary">+ Yeni Kullanıcı</Link>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
              {["Ad Soyad", "Departman", "Rol", "Yöneticisi", "Talepler", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "var(--text-tertiary)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className="row-hover"
                style={{ borderBottom: i < users.length - 1 ? "1px solid var(--border)" : "none" }}>
                <td className="px-4 py-3">
                  <p className="font-medium" style={{ color: "var(--text)" }}>{u.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{u.email}</p>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{u.department ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="badge" style={{
                    background: u.role === "HR_ADMIN" ? "var(--primary-light)" : u.role === "MANAGER" ? "var(--warning-light)" : "var(--bg-secondary)",
                    color: u.role === "HR_ADMIN" ? "var(--primary)" : u.role === "MANAGER" ? "var(--warning)" : "var(--text-secondary)",
                  }}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>{u.manager?.name ?? "—"}</td>
                <td className="px-4 py-3 text-center font-medium" style={{ color: "var(--text)" }}>{u._count.leaveRequests}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/izin-portal/admin/users/${u.id}/edit`}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium"
                      style={{ background: "var(--bg-secondary)", color: "var(--text)" }}>
                      Düzenle
                    </Link>
                    <DeleteUserButton userId={u.id} userName={u.name} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
