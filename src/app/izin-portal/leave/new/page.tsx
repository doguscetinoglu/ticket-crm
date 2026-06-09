"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLeaveSession } from "@/components/izin-portal/use-leave-session";

const LEAVE_TYPES = [
  { value: "ANNUAL", label: "Yıllık İzin" },
  { value: "SICK", label: "Hastalık İzni" },
  { value: "ADMINISTRATIVE", label: "İdari İzin" },
  { value: "MATERNITY", label: "Doğum İzni" },
  { value: "OTHER", label: "Diğer" },
];

export default function NewLeavePage() {
  const { user, isLoading } = useLeaveSession();
  const router = useRouter();
  const [leaveType, setLeaveType] = useState("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isLoading) return null;
  if (!user) { router.push("/izin-portal/login"); return null; }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !endDate) { setError("Tarihler zorunludur."); return; }
    if (new Date(startDate) > new Date(endDate)) { setError("Başlangıç bitiş tarihinden önce olmalıdır."); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/izin-portal/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaveType, startDate, endDate, reason }),
    });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Bir hata oluştu.");
    } else {
      router.push("/izin-portal/dashboard");
    }
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 fade-up">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>Yeni İzin Talebi</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>İzin talebinizi oluşturun, yöneticinize bildirim gönderilecektir.</p>
        </div>

        <form onSubmit={handleSubmit} className="card overflow-hidden fade-up">
          <div className="p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--text)" }}>İzin Türü *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LEAVE_TYPES.map((lt) => (
                  <button key={lt.value} type="button"
                    onClick={() => setLeaveType(lt.value)}
                    className="px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all border"
                    style={{
                      background: leaveType === lt.value ? "var(--primary-light)" : "var(--bg-secondary)",
                      color: leaveType === lt.value ? "var(--primary)" : "var(--text-secondary)",
                      borderColor: leaveType === lt.value ? "var(--primary)" : "transparent",
                    }}>
                    {lt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--text)" }}>Başlangıç Tarihi *</label>
                <input type="date" className="input-apple" value={startDate}
                  min={today} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: "var(--text)" }}>Bitiş Tarihi *</label>
                <input type="date" className="input-apple" value={endDate}
                  min={startDate || today} onChange={(e) => setEndDate(e.target.value)} required />
              </div>
            </div>

            {startDate && endDate && new Date(startDate) <= new Date(endDate) && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Seçilen aralıkta iş günü hesabı API çağrısında yapılacaktır.
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium" style={{ color: "var(--text)" }}>
                Açıklama <span style={{ color: "var(--text-tertiary)" }}>(opsiyonel)</span>
              </label>
              <textarea className="input-apple" rows={3} value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="İzin nedeninizi kısaca açıklayabilirsiniz..." />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                style={{ background: "var(--error-light)", color: "var(--error)" }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
          </div>

          <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: "1px solid var(--border)" }}>
            <button type="button" onClick={() => router.push("/izin-portal/dashboard")} className="btn-secondary">İptal</button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Gönderiliyor..." : "Talep Oluştur"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
