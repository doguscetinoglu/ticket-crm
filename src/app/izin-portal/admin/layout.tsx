import { requireLeaveSession } from "@/lib/leave-session";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireLeaveSession();
  if (session.role !== "HR_ADMIN") redirect("/izin-portal/dashboard");

  return <>{children}</>;
}
