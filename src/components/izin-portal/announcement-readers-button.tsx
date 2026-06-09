"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface Reader {
  readAt: string;
  employee: { name: string; email: string; department: string | null };
}

interface Props {
  announcementId: string;
  readCount: number;
  totalUsers: number;
}

export function AnnouncementReadersButton({ announcementId, readCount, totalUsers }: Props) {
  const [open, setOpen] = useState(false);
  const [readers, setReaders] = useState<Reader[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleOpen() {
    setOpen(true);
    if (readers.length > 0) return;
    setLoading(true);
    const res = await fetch(`/api/izin-portal/admin/announcements/${announcementId}/readers`);
    setReaders(await res.json());
    setLoading(false);
  }

  const unreadCount = totalUsers - readCount;

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-xs font-medium flex items-center gap-1.5 transition-colors"
        style={{ color: readCount === totalUsers ? "var(--success)" : "var(--text-secondary)" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        <span style={{ color: "var(--success)" }}>{readCount}</span> / {totalUsers} okudu
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-md"
            style={{ maxHeight: "80vh", display: "flex", flexDirection: "column" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <div>
                <h3 className="font-semibold" style={{ color: "var(--text)" }}>Okuyanlar</h3>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {readCount} okudu • {unreadCount > 0 ? `${unreadCount} henüz okumadı` : "herkes okudu ✓"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} style={{ color: "var(--text-tertiary)" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between text-xs mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                <span>Okunma oranı</span>
                <span className="font-medium" style={{ color: "var(--text)" }}>
                  {totalUsers > 0 ? Math.round((readCount / totalUsers) * 100) : 0}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--bg-secondary)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${totalUsers > 0 ? (readCount / totalUsers) * 100 : 0}%`,
                    background: readCount === totalUsers ? "var(--success)" : "var(--primary)",
                  }}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="py-10 text-center">
                  <svg className="w-5 h-5 animate-spin mx-auto" style={{ color: "var(--text-tertiary)" }} fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : readers.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Henüz kimse okumamış</p>
                </div>
              ) : (
                <div>
                  {readers.map((r, i) => {
                    const init = r.employee.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <div key={i} className="flex items-center gap-3 px-5 py-3"
                        style={{ borderBottom: i < readers.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: "var(--success)" }}>{init}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{r.employee.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                            {r.employee.department ?? r.employee.email}
                          </p>
                        </div>
                        <p className="text-xs flex-shrink-0" style={{ color: "var(--text-tertiary)" }}>
                          {format(new Date(r.readAt), "d MMM, HH:mm", { locale: tr })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
