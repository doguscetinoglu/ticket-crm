import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Navbar } from "@/components/izin-portal/navbar";
import { StatusBadge, leaveTypeLabel } from "@/components/izin-portal/status-badge";
import { ApproveRejectButtons } from "@/components/izin-portal/approve-reject-buttons";
import { CancelLeaveButton } from "@/components/izin-portal/cancel-leave-button";

export default async function LeaveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireLeaveSession();
  const { id } = await params;

  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: { include: { manager: { select: { id: true, name: true, email: true } } } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!request) notFound();
  if (session.role === "EMPLOYEE" && request.employeeId !== session.id) notFound();

  const canApprove = (session.role === "MANAGER" || session.role === "HR_ADMIN") &&
    ["PENDING", "IN_REVIEW"].includes(request.status);
  const canCancel = request.employeeId === session.id && ["PENDING", "IN_REVIEW"].includes(request.status);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <Navbar user={session} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/izin-portal/dashboard" className="text-sm" style={{ color: "var(--text-secondary)" }}>← Geri</Link>
          <div className="flex-1 flex items-center justify-between">
            <h1 className="text-xl font-bold" style={{ color: "var(--text)" }}>İzin Talebi Detayı</h1>
            <StatusBadge status={request.status} />
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {[
              { label: "Çalışan", value: request.employee.name },
              { label: "Departman", value: request.employee.department ?? "—" },
              { label: "Yönetici", value: request.employee.manager?.name ?? "—" },
              { label: "İzin Türü", value: leaveTypeLabel(request.leaveType) },
              { label: "Başlangıç", value: format(new Date(request.startDate), "d MMMM yyyy", { locale: tr }) },
              { label: "Bitiş", value: format(new Date(request.endDate), "d MMMM yyyy", { locale: tr }) },
              { label: "Toplam Gün", value: `${request.days} iş günü` },
              { label: "Talep Tarihi", value: format(new Date(request.createdAt), "d MMM yyyy, HH:mm", { locale: tr }) },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs font-medium" style={{ color: "var(--text-tertiary)" }}>{item.label}</p>
                <p className="text-sm mt-0.5 font-medium" style={{ color: "var(--text)" }}>{item.value}</p>
              </div>
            ))}
          </div>

          {request.description && (
            <>
              <div className="divider" />
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: "var(--text-tertiary)" }}>Açıklama</p>
                <p className="text-sm" style={{ color: "var(--text)" }}>{request.description}</p>
              </div>
            </>
          )}

          {(canApprove || canCancel) && (
            <>
              <div className="divider" />
              <div className="flex items-center gap-3">
                {canApprove && <ApproveRejectButtons requestId={request.id} />}
                {canCancel && <CancelLeaveButton requestId={request.id} />}
              </div>
            </>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text)" }}>Durum Geçmişi</h2>
          </div>
          <div className="px-5 py-4 space-y-4">
            {request.statusHistory.map((h, i) => (
              <div key={h.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0" style={{ background: "var(--primary)" }} />
                  {i < request.statusHistory.length - 1 && (
                    <div className="w-0.5 flex-1 mt-1" style={{ background: "var(--border)" }} />
                  )}
                </div>
                <div className="pb-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={h.status} />
                    <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {format(new Date(h.createdAt), "d MMM yyyy, HH:mm", { locale: tr })}
                    </span>
                  </div>
                  {h.note && <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{h.note}</p>}
                  {h.changedBy && <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>— {h.changedBy}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
