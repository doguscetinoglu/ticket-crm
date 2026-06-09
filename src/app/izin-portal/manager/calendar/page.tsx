import { requireLeaveSession } from "@/lib/leave-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";
import { tr } from "date-fns/locale";
import { Navbar } from "@/components/izin-portal/navbar";
import { leaveTypeLabel } from "@/components/izin-portal/status-badge";

export default async function ManagerCalendarPage() {
  const session = await requireLeaveSession();
  if (session.role === "EMPLOYEE") redirect("/izin-portal/dashboard");

  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const where =
    session.role === "HR_ADMIN"
      ? { status: "APPROVED" as const, startDate: { lte: end }, endDate: { gte: start } }
      : { status: "APPROVED" as const, startDate: { lte: end }, endDate: { gte: start }, employee: { managerId: session.id } };

  const approvedLeaves = await prisma.leaveRequest.findMany({
    where,
    include: { employee: { select: { name: true, department: true } } },
    orderBy: { startDate: "asc" },
  });

  const days = eachDayOfInterval({ start, end });
  const firstDayOfWeek = (getDay(start) + 6) % 7;

  const COLORS = [
    "var(--primary)", "var(--success)", "var(--warning)", "#8b5cf6", "#ec4899",
    "#06b6d4", "#f97316", "#84cc16",
  ];

  const uniqueEmployees = [...new Set(approvedLeaves.map((l) => l.employee.name))];
  const employeeColors: Record<string, string> = {};
  uniqueEmployees.forEach((name, i) => { employeeColors[name] = COLORS[i % COLORS.length]; });

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar user={session} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="fade-up">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            Ekip Takvimi — {format(now, "MMMM yyyy", { locale: tr })}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Onaylanan izinler gösteriliyor.</p>
        </div>

        <div className="card overflow-hidden fade-up">
          <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--border)" }}>
            {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
              <div key={d} className="py-3 text-center text-xs font-semibold"
                style={{ color: "var(--text-tertiary)", borderRight: "1px solid var(--border)" }}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} style={{ borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", minHeight: 80 }} />
            ))}
            {days.map((day, i) => {
              const dayLeaves = approvedLeaves.filter(
                (l) => new Date(l.startDate) <= day && new Date(l.endDate) >= day
              );
              const isWeekend = getDay(day) === 0 || getDay(day) === 6;
              const isToday = day.toDateString() === now.toDateString();
              return (
                <div key={i} className="p-1.5 flex flex-col gap-1"
                  style={{
                    borderRight: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)",
                    minHeight: 80,
                    background: isWeekend ? "var(--bg-secondary)" : isToday ? "var(--primary-light)" : "transparent",
                  }}>
                  <span className="text-xs font-medium"
                    style={{ color: isToday ? "var(--primary)" : "var(--text-tertiary)" }}>
                    {format(day, "d")}
                  </span>
                  {dayLeaves.map((l) => (
                    <div key={l.id} className="px-1.5 py-0.5 rounded text-xs font-medium truncate"
                      style={{ background: employeeColors[l.employee.name] + "20", color: employeeColors[l.employee.name] }}>
                      {l.employee.name.split(" ")[0]}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {approvedLeaves.length > 0 && (
          <div className="card overflow-hidden fade-up">
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Bu Ay Onaylı İzinler</h2>
            </div>
            <div>
              {approvedLeaves.map((l, i) => (
                <div key={l.id} className="flex items-center gap-4 px-5 py-3 row-hover"
                  style={{ borderBottom: i < approvedLeaves.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ background: employeeColors[l.employee.name] }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{l.employee.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{l.employee.department ?? leaveTypeLabel(l.leaveType)}</p>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    {format(new Date(l.startDate), "d MMM", { locale: tr })} – {format(new Date(l.endDate), "d MMM", { locale: tr })}
                  </p>
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{l.days} gün</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
