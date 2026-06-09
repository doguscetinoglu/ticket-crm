import { requireLeaveSession } from "@/lib/leave-session";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/izin-portal/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") redirect("/izin-portal/dashboard");

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      <AdminSidebar user={session} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
