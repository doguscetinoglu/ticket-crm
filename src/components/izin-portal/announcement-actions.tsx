"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ToggleAnnouncementButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await fetch(`/api/izin-portal/admin/announcements/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="text-xs px-3 py-1.5 rounded-lg font-medium"
      style={{
        background: isActive ? "var(--warning-light)" : "var(--success-light)",
        color: isActive ? "var(--warning)" : "var(--success)",
      }}
    >
      {loading ? "..." : isActive ? "Pasifleştir" : "Aktifleştir"}
    </button>
  );
}

export function DeleteAnnouncementButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/izin-portal/admin/announcements/${id}`, { method: "DELETE" });
    setLoading(false);
    router.refresh();
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--error)" }}>Silinsin mi?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs px-2 py-1 rounded-lg font-medium"
          style={{ background: "var(--error)", color: "#fff" }}
        >
          {loading ? "..." : "Evet"}
        </button>
        <button
          onClick={() => setConfirm(false)}
          className="text-xs px-2 py-1 rounded-lg font-medium"
          style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
        >
          İptal
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs px-3 py-1.5 rounded-lg font-medium"
      style={{ color: "var(--error)", background: "var(--error-light)" }}
    >
      Sil
    </button>
  );
}

export function AnnouncementFormButton({
  mode, id, defaultTitle = "", defaultContent = "", defaultRequiresConfirmation = false,
}: {
  mode: "create" | "edit";
  id?: string;
  defaultTitle?: string;
  defaultContent?: string;
  defaultRequiresConfirmation?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [requiresConfirmation, setRequiresConfirmation] = useState(defaultRequiresConfirmation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch(
      mode === "create" ? "/api/izin-portal/admin/announcements" : `/api/izin-portal/admin/announcements/${id}`,
      {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, requiresConfirmation }),
      }
    );
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Hata oluştu.");
    } else {
      setOpen(false);
      if (mode === "create") { setTitle(""); setContent(""); }
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={mode === "create" ? "btn-primary" : "text-xs px-3 py-1.5 rounded-lg font-medium"}
        style={mode === "edit" ? { background: "var(--primary-light)", color: "var(--primary)" } : undefined}
      >
        {mode === "create" ? "+ Yeni Duyuru" : "Düzenle"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="card w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <h2 className="font-semibold" style={{ color: "var(--text)" }}>
                {mode === "create" ? "Yeni Duyuru" : "Duyuruyu Düzenle"}
              </h2>
              <button onClick={() => setOpen(false)} style={{ color: "var(--text-tertiary)" }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--text)" }}>Başlık *</label>
                  <input type="text" className="input-apple" value={title}
                    onChange={(e) => setTitle(e.target.value)} placeholder="Duyuru başlığı..." required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--text)" }}>İçerik *</label>
                  <textarea className="input-apple resize-none" rows={4} value={content}
                    onChange={(e) => setContent(e.target.value)} placeholder="Duyuru içeriği..." required />
                </div>
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl transition-colors"
                  style={{ background: requiresConfirmation ? "var(--warning-light)" : "var(--bg-secondary)" }}>
                  <input type="checkbox" checked={requiresConfirmation}
                    onChange={(e) => setRequiresConfirmation(e.target.checked)}
                    className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ accentColor: "var(--warning)" }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>Okundu bilgisi iste</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                      Kullanıcılar dashboard&apos;a girişte bu duyuruyu okuyup onaylamak zorunda kalır.
                    </p>
                  </div>
                </label>
                {error && <p className="text-sm" style={{ color: "var(--error)" }}>{error}</p>}
              </div>
              <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary">İptal</button>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "Kaydediliyor..." : mode === "create" ? "Oluştur" : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
