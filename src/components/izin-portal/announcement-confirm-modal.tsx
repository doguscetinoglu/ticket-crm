"use client";

import { useState } from "react";

interface Announcement {
  id: string;
  title: string;
  content: string;
}

export function AnnouncementConfirmModal({ announcements }: { announcements: Announcement[] }) {
  const [queue, setQueue] = useState(announcements);
  const [loading, setLoading] = useState(false);

  const current = queue[0];
  if (!current) return null;

  async function handleRead() {
    setLoading(true);
    await fetch(`/api/izin-portal/announcements/${current.id}/read`, { method: "POST" });
    setLoading(false);
    setQueue((prev) => prev.slice(1));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="card w-full max-w-lg fade-up"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--warning-light)" }}>
              <svg className="w-5 h-5" style={{ color: "var(--warning)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--warning)" }}>
                Okundu Onayı Gerekiyor
              </p>
              {queue.length > 1 && (
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>{queue.length} duyuru bekliyor</p>
              )}
            </div>
          </div>
          <h2 className="text-lg font-bold mt-3" style={{ color: "var(--text)" }}>{current.title}</h2>
        </div>

        <div className="px-6 py-5 flex-1 overflow-y-auto">
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
            {current.content}
          </p>
        </div>

        <div
          className="px-6 py-4 flex items-center justify-between gap-4"
          style={{ borderTop: "1px solid var(--border)", background: "var(--bg-secondary)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Bu duyuruyu okuduğunuzu onaylamadan devam edemezsiniz.
          </p>
          <button onClick={handleRead} disabled={loading} className="btn-primary flex-shrink-0">
            {loading ? "Kaydediliyor..." : "Okudum, Onaylıyorum"}
          </button>
        </div>
      </div>
    </div>
  );
}
