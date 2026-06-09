"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ApproveRejectButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    await fetch(`/api/izin-portal/leave/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    setLoading(false);
    router.refresh();
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setLoading(true);
    await fetch(`/api/izin-portal/leave/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", note: rejectReason }),
    });
    setLoading(false);
    setRejectOpen(false);
    setRejectReason("");
    router.refresh();
  }

  return (
    <>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="btn-primary text-sm px-4 py-2"
          style={{ background: "var(--success)", borderRadius: "var(--radius-sm)" }}
        >
          Onayla
        </button>
        <button
          onClick={() => setRejectOpen(true)}
          disabled={loading}
          className="btn-secondary text-sm px-4 py-2"
          style={{ color: "var(--error)", borderColor: "var(--error-light)", borderRadius: "var(--radius-sm)" }}
        >
          Reddet
        </button>
      </div>

      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setRejectOpen(false)}
          />
          <div className="relative w-full max-w-sm card p-6 fade-up" style={{ zIndex: 1 }}>
            <h3 className="font-semibold mb-1" style={{ color: "var(--text)" }}>Talebi Reddet</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Red gerekçesi çalışana bildirilecektir.
            </p>
            <textarea
              className="input-apple resize-none mb-4"
              rows={3}
              placeholder="Reddetme nedeninizi yazın..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="flex gap-3">
              <button onClick={() => setRejectOpen(false)} className="btn-secondary flex-1">Vazgeç</button>
              <button
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
                className="btn-primary flex-1"
                style={{ background: "var(--error)" }}
              >
                {loading ? "Reddediliyor..." : "Reddet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
