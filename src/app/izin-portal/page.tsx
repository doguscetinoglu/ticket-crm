import { getLeaveSession } from "@/lib/leave-session";
import { redirect } from "next/navigation";

export default async function LeavePortalRoot() {
  const session = await getLeaveSession();
  if (!session) redirect("/izin-portal/login");
  if (session.role === "HR_ADMIN") redirect("/izin-portal/admin");
  redirect("/izin-portal/dashboard");
}
