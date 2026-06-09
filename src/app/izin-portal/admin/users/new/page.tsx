import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { UserForm } from "@/components/izin-portal/user-form";

export default async function NewUserPage() {
  await requireLeaveSession();
  const managers = await prisma.leaveEmployee.findMany({
    where: { role: { in: ["MANAGER", "HR_ADMIN"] } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return (
    <main className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/izin-portal/admin/users" className="text-sm" style={{ color: "var(--text-secondary)" }}>← Kullanıcılar</Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>Yeni Kullanıcı</h1>
      </div>
      <UserForm mode="create" managers={managers} />
    </main>
  );
}
