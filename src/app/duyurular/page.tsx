"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionUser } from "@/lib/session";

interface Read { acknowledged: boolean; readAt: string; user?: { id: number; name: string; color: string }; }
interface Announcement {
  id: number; title: string; body: string; requireAck: boolean; isActive: boolean; createdAt: string;
  createdBy: { name: string }; reads: Read[];
}

const inputCls = "w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all";
const fmtDate = (d: string) => new Date(d).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
const fmtDT = (d: string) => new Date(d).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function DuyurularPage() {
  const [me, setMe] = useState<SessionUser | null>(null);
  const [items, setItems] = useState<Announcement[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", requireAck: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Announcement | null>(null);

  const load = useCallback(async () => {
    const [meRes, res] = await Promise.all([
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/duyurular").then((r) => (r.ok ? r.json() : null)),
    ]);
    setMe(meRes);
    if (res) {
      setItems(res.announcements ?? []);
      setTotalUsers(res.totalUsers ?? 0);
      setIsAdmin(!!res.isAdmin);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setError(""); setSaving(true);
    const res = await fetch("/api/duyurular", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Hata"); return; }
    setCreating(false); setForm({ title: "", body: "", requireAck: false }); load();
  };

  const toggleActive = async (a: Announcement) => {
    await fetch(`/api/duyurular/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !a.isActive }) });
    load();
  };

  const remove = async (a: Announcement) => {
    if (!confirm(`"${a.title}" duyurusunu silmek istediğinize emin misiniz?`)) return;
    await fetch(`/api/duyurular/${a.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="p-4 md:p-7 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Duyurular</h1>
          <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">{isAdmin ? "Duyuru oluştur ve okunma raporlarını takip et" : "Ekip duyuruları"}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setCreating(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20">+ Yeni Duyuru</button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-12 text-center text-sm text-slate-400 dark:text-gray-600">Henüz duyuru yok.</div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const readCount = a.reads.length;
            const ackCount = a.reads.filter((r) => r.acknowledged).length;
            const myRead = !isAdmin ? a.reads[0] : undefined;
            const pct = totalUsers ? Math.round((readCount / totalUsers) * 100) : 0;
            return (
              <div key={a.id} className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 shadow-sm dark:shadow-none ${a.isActive ? "border-slate-200 dark:border-gray-800" : "border-slate-200 dark:border-gray-800 opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-800 dark:text-gray-100">{a.title}</h3>
                      {a.requireAck && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">Onay gerekli</span>}
                      {!a.isActive && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-400">Pasif</span>}
                      {myRead && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">{myRead.acknowledged ? "Onayladınız" : "Okudunuz"}</span>}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-gray-300 mt-2 whitespace-pre-wrap leading-relaxed">{a.body}</p>
                    <p className="text-[11px] text-slate-400 dark:text-gray-600 mt-2">{a.createdBy.name} · {fmtDate(a.createdAt)}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => toggleActive(a)} title={a.isActive ? "Pasifleştir" : "Aktifleştir"}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 transition-colors text-xs">{a.isActive ? "⏸" : "▶"}</button>
                      <button onClick={() => remove(a)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors text-xs">🗑</button>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-500 dark:text-gray-500">
                        {a.requireAck ? `${ackCount} / ${totalUsers} onayladı` : `${readCount} / ${totalUsers} okudu`}
                        <span className="text-slate-400 dark:text-gray-600"> · %{pct}</span>
                      </span>
                      <button onClick={() => setReport(a)} className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">Rapor →</button>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${a.requireAck ? (totalUsers ? Math.round((ackCount / totalUsers) * 100) : 0) : pct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Oluşturma modalı */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { setCreating(false); setError(""); }}>
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-900 dark:text-gray-100 mb-5">Yeni Duyuru</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">Başlık *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Duyuru başlığı" className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">İçerik *</label>
                <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={5} placeholder="Duyuru metni" className={inputCls} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none py-1">
                <div onClick={() => setForm((f) => ({ ...f, requireAck: !f.requireAck }))}
                  className={`w-9 h-5 rounded-full transition-colors relative ${form.requireAck ? "bg-amber-500" : "bg-slate-200 dark:bg-gray-700"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.requireAck ? "left-4" : "left-0.5"}`} />
                </div>
                <div>
                  <span className="text-sm text-slate-700 dark:text-gray-300">Okundu onayı iste</span>
                  <p className="text-[11px] text-slate-400 dark:text-gray-600">Kullanıcılar “Okudum” demeden modal kapanmaz.</p>
                </div>
              </label>
              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-3 py-2">{error}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={create} disabled={saving || !form.title.trim() || !form.body.trim()}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm">{saving ? "Yayınlanıyor…" : "Yayınla"}</button>
              <button onClick={() => { setCreating(false); setError(""); }}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-semibold rounded-xl text-sm transition-colors">İptal</button>
            </div>
          </div>
        </div>
      )}

      {/* Rapor modalı */}
      {report && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setReport(null)}>
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-slate-900 dark:text-gray-100">Okunma Raporu</h2>
              <button onClick={() => setReport(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400">✕</button>
            </div>
            <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">{report.title}</p>
            <div className="grid grid-cols-3 gap-2 mb-4 text-center">
              <div className="bg-slate-50 dark:bg-gray-800 rounded-xl py-2">
                <p className="text-lg font-bold text-slate-700 dark:text-gray-200">{totalUsers}</p>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase">Toplam</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl py-2">
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{report.reads.length}</p>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase">Okudu</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl py-2">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{report.reads.filter((r) => r.acknowledged).length}</p>
                <p className="text-[10px] text-slate-400 dark:text-gray-500 uppercase">Onayladı</p>
              </div>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase mb-2">Okuyanlar</p>
            {report.reads.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-gray-600">Henüz kimse okumadı.</p>
            ) : (
              <div className="space-y-1.5">
                {report.reads.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 dark:text-gray-200">{r.user?.name ?? "Kullanıcı"}</span>
                    <span className="flex items-center gap-2">
                      {report.requireAck && (
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${r.acknowledged ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : "bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500"}`}>{r.acknowledged ? "Onayladı" : "Görüntüledi"}</span>
                      )}
                      <span className="text-[11px] text-slate-400 dark:text-gray-600">{fmtDT(r.readAt)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
