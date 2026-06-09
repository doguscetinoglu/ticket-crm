"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteUserButton({ userId, userName }: { userId: string; userName: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/izin-portal/admin/users/${userId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Silinemedi.");
      setConfirm(false);
    } else {
      router.refresh();
    }
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs" style={{ color: "var(--error)" }}>
          {error || `"${userName}" silinsin mi?`}
        </span>
        <button onClick={handleDelete} disabled={loading}
          className="text-xs px-2 py-1 rounded-lg font-medium"
          style={{ background: "var(--error)", color: "#fff" }}>
          {loading ? "..." : "Evet, Sil"}
        </button>
        <button onClick={() => { setConfirm(false); setError(""); }}
          className="text-xs px-2 py-1 rounded-lg font-medium"
          style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}>
          İptal
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
      style={{ color: "var(--error)", background: "var(--error-light)" }}>
      Sil
    </button>
  );
}
