"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SessionUser } from "@/lib/session";

interface Leave {
  id: number; type: string; startDate: string; endDate: string; days: number;
  reason: string | null; status: string; reviewedAt: string | null; reviewNote: string | null; createdAt: string;
  user: { id: number; name: string; color: string };
  reviewedBy: { name: string } | null;
}

const LEAVE_TYPES = ["Yıllık İzin", "Mazeret İzni", "Hastalık İzni", "Ücretsiz İzin", "Diğer"];
const inputCls = "w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all";

const STATUS_STYLE: Record<string, string> = {
  "Beklemede": "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
  "Onaylandı": "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
  "Reddedildi": "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300",
};

const fmt = (d: string) => new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" });
const today = new Date().toLocaleDateString("en-CA");

export default function IzinlerPage() {
  const [me, setMe] = useState<SessionUser | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [view, setView] = useState<"pending" | "all" | "mine">("pending");
  const [form, setForm] = useState({ type: "Yıllık İzin", startDate: today, endDate: today, reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reviewNote, setReviewNote] = useState<Record<number, string>>({});

  const isAdmin = me?.type === "admin";

  const load = useCallback(async () => {
    const scope = isAdmin && view === "mine" ? "?scope=mine" : "";
    const [meRes, lRes] = await Promise.all([
      me ? Promise.resolve(me) : fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/izinler${scope}`).then((r) => (r.ok ? r.json() : [])),
    ]);
    setMe(meRes);
    setLeaves(Array.isArray(lRes) ? lRes : []);
  }, [isAdmin, view, me]);

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [view, isAdmin]);
  useEffect(() => { fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)).then(setMe); }, []);

  const submit = async () => {
    setError(""); setSaving(true);
    const res = await fetch("/api/izinler", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Hata"); return; }
    setForm({ type: "Yıllık İzin", startDate: today, endDate: today, reason: "" });
    load();
  };

  const review = async (id: number, status: string) => {
    await fetch(`/api/izinler/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, reviewNote: reviewNote[id] ?? "" }) });
    setReviewNote((n) => ({ ...n, [id]: "" }));
    load();
  };

  const remove = async (id: number) => {
    if (!confirm("Bu izin talebini silmek istediğinize emin misiniz?")) return;
    await fetch(`/api/izinler/${id}`, { method: "DELETE" });
    load();
  };

  // Beklenen gün sayısı önizleme
  const previewDays = useMemo(() => {
    const s = new Date(form.startDate), e = new Date(form.endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  }, [form.startDate, form.endDate]);

  const visible = useMemo(() => {
    if (!isAdmin) return leaves;
    if (view === "pending") return leaves.filter((l) => l.status === "Beklemede");
    return leaves;
  }, [leaves, isAdmin, view]);

  const pendingCount = leaves.filter((l) => l.status === "Beklemede").length;

  return (
    <div className="p-4 md:p-7 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">İzinler</h1>
        <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">İzin talebi oluştur ve durumunu takip et{isAdmin ? " · talepleri onayla" : ""}</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Talep formu */}
        <div className="lg:col-span-1 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-none h-fit">
          <h2 className="text-sm font-bold text-slate-800 dark:text-gray-100 mb-4">Yeni İzin Talebi</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">İzin Türü</label>
              <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={inputCls}>
                {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">Başlangıç</label>
                <input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">Bitiş</label>
                <input type="date" value={form.endDate} min={form.startDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">Açıklama (opsiyonel)</label>
              <textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} placeholder="Sebep / not" className={inputCls} />
            </div>
            {previewDays > 0 && <p className="text-xs text-slate-500 dark:text-gray-400">Toplam <span className="font-bold text-indigo-600 dark:text-indigo-400">{previewDays} gün</span></p>}
            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-3 py-2">{error}</p>}
            <button onClick={submit} disabled={saving || previewDays === 0}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm">
              {saving ? "Gönderiliyor…" : "Talep Oluştur"}
            </button>
            <p className="text-[11px] text-slate-400 dark:text-gray-600 text-center">Talebiniz yönetici onayından sonra geçerli olur.</p>
          </div>
        </div>

        {/* Liste */}
        <div className="lg:col-span-2 space-y-3">
          {isAdmin && (
            <div className="flex gap-1 bg-slate-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
              {[
                { k: "pending" as const, label: `Onay Bekleyenler${pendingCount ? ` (${pendingCount})` : ""}` },
                { k: "all" as const, label: "Tüm Talepler" },
                { k: "mine" as const, label: "Benim İzinlerim" },
              ].map(({ k, label }) => (
                <button key={k} onClick={() => setView(k)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${view === k ? "bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 shadow-sm" : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-10 text-center text-sm text-slate-400 dark:text-gray-600">
              {isAdmin && view === "pending" ? "Onay bekleyen izin yok." : "Henüz izin kaydı yok."}
            </div>
          ) : visible.map((l) => {
            const canReview = isAdmin && l.status === "Beklemede";
            const canDelete = me?.type === "admin" || (l.user.id === me?.id && l.status === "Beklemede");
            return (
              <div key={l.id} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isAdmin && <span className="text-sm font-semibold text-slate-800 dark:text-gray-100">{l.user.name}</span>}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-medium">{l.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[l.status]}`}>{l.status}</span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-gray-300 mt-1.5">
                      {fmt(l.startDate)} — {fmt(l.endDate)} <span className="text-slate-400 dark:text-gray-500">· {l.days} gün</span>
                    </p>
                    {l.reason && <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">{l.reason}</p>}
                    {l.reviewedBy && l.status !== "Beklemede" && (
                      <p className="text-[11px] text-slate-400 dark:text-gray-600 mt-1">
                        {l.reviewedBy.name} tarafından {l.status === "Onaylandı" ? "onaylandı" : "reddedildi"}
                        {l.reviewNote ? ` — “${l.reviewNote}”` : ""}
                      </p>
                    )}
                  </div>
                  {canDelete && (
                    <button onClick={() => remove(l.id)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors text-xs shrink-0">🗑</button>
                  )}
                </div>

                {canReview && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-800 space-y-2">
                    <input value={reviewNote[l.id] ?? ""} onChange={(e) => setReviewNote((n) => ({ ...n, [l.id]: e.target.value }))}
                      placeholder="Not (opsiyonel)" className={`${inputCls} text-xs`} />
                    <div className="flex gap-2">
                      <button onClick={() => review(l.id, "Onaylandı")} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-colors">Onayla</button>
                      <button onClick={() => review(l.id, "Reddedildi")} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors">Reddet</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
