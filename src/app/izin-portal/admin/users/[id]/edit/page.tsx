import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { UserForm } from "@/components/izin-portal/user-form";

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  await requireLeaveSession();
  const { id } = await params;

  const [user, managers] = await Promise.all([
    prisma.leaveEmployee.findUnique({ where: { id } }),
    prisma.leaveEmployee.findMany({
      where: { role: { in: ["MANAGER", "HR_ADMIN"] } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!user) notFound();

  return (
    <main className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/izin-portal/admin/users" className="text-sm" style={{ color: "var(--text-secondary)" }}>← Kullanıcılar</Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>{user.name} — Düzenle</h1>
      </div>
      <UserForm
        mode="edit"
        userId={user.id}
        defaultValues={{
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department ?? "",
          managerId: user.managerId ?? "",
        }}
        managers={managers.filter((m) => m.id !== id)}
      />
    </main>
  );
}
