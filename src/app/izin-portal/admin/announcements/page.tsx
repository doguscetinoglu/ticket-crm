import { requireLeaveSession } from "@/lib/leave-session";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { AnnouncementFormButton, DeleteAnnouncementButton, ToggleAnnouncementButton } from "@/components/izin-portal/announcement-actions";
import { AnnouncementReadersButton } from "@/components/izin-portal/announcement-readers-button";

export default async function AdminAnnouncementsPage() {
  await requireLeaveSession();

  const [announcements, totalUsers] = await Promise.all([
    prisma.leaveAnnouncement.findMany({
      include: { reads: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveEmployee.count(),
  ]);

  return (
    <main className="p-6 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Duyurular</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>{announcements.length} duyuru</p>
        </div>
        <AnnouncementFormButton mode="create" />
      </div>

      {announcements.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="font-semibold" style={{ color: "var(--text)" }}>Henüz duyuru yok</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>İlk duyuruyu oluşturmak için yukarıdaki butona tıklayın.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold" style={{ color: "var(--text)" }}>{a.title}</h3>
                    {!a.isActive && (
                      <span className="badge text-xs" style={{ background: "var(--bg-secondary)", color: "var(--text-tertiary)" }}>Pasif</span>
                    )}
                    {a.requiresConfirmation && (
                      <span className="badge text-xs" style={{ background: "var(--warning-light)", color: "var(--warning)" }}>Onay Gerektiriyor</span>
                    )}
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{a.content}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      {format(new Date(a.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })}
                    </p>
                    <AnnouncementReadersButton announcementId={a.id} readCount={a.reads.length} totalUsers={totalUsers} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <ToggleAnnouncementButton id={a.id} isActive={a.isActive} />
                  <AnnouncementFormButton mode="edit" id={a.id} defaultTitle={a.title} defaultContent={a.content} defaultRequiresConfirmation={a.requiresConfirmation} />
                  <DeleteAnnouncementButton id={a.id} title={a.title} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
