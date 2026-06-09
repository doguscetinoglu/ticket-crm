"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelLeaveButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    await fetch(`/api/izin-portal/leave/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", note: "Çalışan tarafından iptal edildi" }),
    });
    setLoading(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary text-sm"
        style={{ color: "var(--error)", borderColor: "var(--error-light)" }}
      >
        Talebi İptal Et
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-sm card p-6 fade-up" style={{ zIndex: 1 }}>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--error-light)" }}
            >
              <svg className="w-6 h-6" style={{ color: "var(--error)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-center mb-2" style={{ color: "var(--text)" }}>
              Talebi İptal Et
            </h3>
            <p className="text-sm text-center mb-6" style={{ color: "var(--text-secondary)" }}>
              Bu işlem geri alınamaz. Talebi iptal etmek istediğinize emin misiniz?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setOpen(false)} className="btn-secondary flex-1">Vazgeç</button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="btn-primary flex-1"
                style={{ background: "var(--error)" }}
              >
                {loading ? "İptal ediliyor..." : "Evet, İptal Et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
