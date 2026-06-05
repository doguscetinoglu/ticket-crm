"use client";

import { useCallback, useEffect, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import type { SessionUser } from "@/lib/session";

interface User { id: number; name: string; email: string; role: string; color: string; isAdmin: boolean; isActive: boolean; createdAt: string; _count: { tickets: number }; openTickets: number; }
interface Ticket { id: number; subject: string; status: string; priority: string; category: string; receivedAt: string; }

const COLORS       = ["blue", "purple", "green", "pink", "orange", "indigo", "teal"];
const COLOR_LABELS: Record<string, string> = { blue: "Mavi", purple: "Mor", green: "Yeşil", pink: "Pembe", orange: "Turuncu", indigo: "İndigo", teal: "Teal" };
const ROLES        = ["Kullanıcı", "Admin"];
const EMPTY_FORM   = { name: "", email: "", password: "", role: "Kullanıcı", color: "indigo", isAdmin: false };
const COLOR_BG: Record<string, string> = { blue: "bg-blue-600", purple: "bg-purple-600", green: "bg-emerald-600", pink: "bg-pink-600", orange: "bg-orange-500", indigo: "bg-indigo-600", teal: "bg-teal-600" };

const inputCls = "w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all";

export default function KullanicilarPage() {
  const [me, setMe]         = useState<SessionUser | null>(null);
  const [users, setUsers]   = useState<User[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [adding, setAdding]     = useState(false);
  const [editing, setEditing]   = useState<User | null>(null);
  const [form, setForm]         = useState(EMPTY_FORM);
  const [resetPw, setResetPw]   = useState<{ id: number; name: string } | null>(null);
  const [newPw, setNewPw]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  const fetchUsers = useCallback(async () => {
    const [meRes, uRes] = await Promise.all([
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null),
      fetch("/api/users").then(r => r.json()),
    ]);
    setMe(meRes);
    setUsers(Array.isArray(uRes) ? uRes : []);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const selectUser = async (uid: number) => {
    if (selected === uid) { setSelected(null); setTickets([]); return; }
    setSelected(uid);
    const res = await fetch("/api/tickets").then(r => r.json());
    setTickets((Array.isArray(res) ? res : []).filter((t: Ticket & { assigneeId: number | null }) => t.assigneeId === uid));
  };

  const create = async () => {
    setError(""); setSaving(true);
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Hata"); return; }
    setAdding(false); setForm(EMPTY_FORM); fetchUsers();
  };

  const update = async (id: number, data: object) => {
    await fetch(`/api/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    fetchUsers();
  };

  const doResetPw = async () => {
    if (!resetPw || !newPw) return;
    setSaving(true);
    await update(resetPw.id, { password: newPw });
    setSaving(false); setResetPw(null); setNewPw("");
  };

  const deleteUser = async (id: number, name: string) => {
    if (!confirm(`"${name}" kullanıcısını silmek istediğinize emin misiniz?`)) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    fetchUsers();
  };

  const isAdmin = me?.type === "admin";
  const maxTickets = Math.max(...users.map(u => u._count.tickets), 1);

  return (
    <div className="p-4 md:p-7 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Kullanıcılar</h1>
          <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">{users.length} kullanıcı · {users.filter(u => u.isActive).length} aktif</p>
        </div>
        {isAdmin && (
          <button onClick={() => setAdding(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20">
            + Ekle
          </button>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Toplam",        val: users.length,                                  color: "text-slate-700 dark:text-gray-200" },
          { label: "Aktif",         val: users.filter(u => u.isActive).length,          color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Admin",         val: users.filter(u => u.isAdmin).length,           color: "text-amber-600 dark:text-amber-400" },
          { label: "Toplam Ticket", val: users.reduce((s, u) => s + u._count.tickets, 0), color: "text-indigo-600 dark:text-indigo-400" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* User cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {users.map(u => {
          const pct = Math.round((u._count.tickets / maxTickets) * 100);
          const isSel = selected === u.id;
          return (
            <div key={u.id}
              className={`bg-white dark:bg-gray-900 border rounded-2xl p-5 shadow-sm dark:shadow-none transition-all ${isSel ? "border-indigo-300 dark:border-indigo-600/50 ring-1 ring-indigo-200 dark:ring-indigo-600/20" : "border-slate-200 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-gray-700"}`}>
              <div className="flex items-start justify-between gap-2 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <UserAvatar name={u.name} color={u.color} size="lg" />
                    {!u.isActive && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />}
                    {u.isAdmin && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-white text-[7px] font-bold">A</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-gray-100 text-sm">{u.name}</p>
                    <p className="text-xs text-slate-500 dark:text-gray-500">{u.role}</p>
                    <p className="text-xs text-slate-400 dark:text-gray-600 truncate">{u.email}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditing(u); setForm({ name: u.name, email: u.email, password: "", role: u.role, color: u.color, isAdmin: u.isAdmin }); }}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-500 dark:text-gray-400 transition-colors text-xs">✏️</button>
                    <button onClick={() => setResetPw({ id: u.id, name: u.name })}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-slate-500 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-xs">🔑</button>
                    <button onClick={() => update(u.id, { isActive: !u.isActive })}
                      className={`p-1.5 rounded-lg text-xs transition-colors ${u.isActive ? "bg-slate-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-500/10 text-slate-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"}`}>
                      {u.isActive ? "⏸" : "▶"}
                    </button>
                    {u.id !== me?.id && (
                      <button onClick={() => deleteUser(u.id, u.name)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-500/10 text-slate-400 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors text-xs">🗑</button>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 dark:text-gray-500">Toplam ticket</span>
                  <span className="font-bold text-slate-700 dark:text-gray-200">{u._count.tickets}</span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${COLOR_BG[u.color] ?? "bg-indigo-600"}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.openTickets > 0 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-600"}`}>
                    {u.openTickets} açık
                  </span>
                  {!u.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-medium">Pasif</span>}
                  {u.isAdmin && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">Admin</span>}
                </div>
                <button onClick={() => selectUser(u.id)}
                  className="w-full mt-1 py-1 text-xs text-slate-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  {isSel ? "Gizle ↑" : "Ticketları gör ↓"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected user tickets */}
      {selected && tickets.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-800">
            <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">
              {users.find(u => u.id === selected)?.name} — Ticket Listesi ({tickets.length})
            </p>
          </div>
          <div className="md:hidden divide-y divide-slate-100 dark:divide-gray-800/60">
            {tickets.map(t => (
              <div key={t.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">{t.subject}</p>
                    <p className="text-xs text-slate-400 dark:text-gray-600">#{t.id} · {t.category}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-gray-600">{new Date(t.receivedAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            ))}
          </div>
          <table className="hidden md:table w-full text-sm">
            <thead><tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900">
              {["#", "Konu", "Kategori", "Durum", "Öncelik", "Tarih"].map(h => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
              {tickets.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3 text-slate-400 dark:text-gray-600 font-mono text-xs">#{t.id}</td>
                  <td className="px-5 py-3 text-slate-700 dark:text-gray-200 max-w-[200px]"><p className="truncate">{t.subject}</p></td>
                  <td className="px-5 py-3"><span className="text-xs bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 px-2 py-0.5 rounded-md">{t.category}</span></td>
                  <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-5 py-3 text-xs text-slate-400 dark:text-gray-600">{new Date(t.receivedAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal */}
      {(adding || editing) && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { setAdding(false); setEditing(null); setError(""); }}>
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-900 dark:text-gray-100 mb-5">{editing ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">Ad Soyad *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ali Yılmaz" className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">E-posta *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ali@sirket.com" disabled={!!editing} className={`${inputCls} disabled:opacity-50`} />
                </div>
                {!editing && (
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">Şifre *</label>
                    <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" className={inputCls} />
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">Rol</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className={inputCls}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">Renk</label>
                  <select value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className={inputCls}>
                    {COLORS.map(c => <option key={c} value={c}>{COLOR_LABELS[c]}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 py-1">
                <UserAvatar name={form.name || "?"} color={form.color} size="md" />
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">{form.name || "Önizleme"}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-500">{form.role}</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div onClick={() => setForm(f => ({ ...f, isAdmin: !f.isAdmin }))}
                  className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${form.isAdmin ? "bg-amber-500" : "bg-slate-200 dark:bg-gray-700"}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${form.isAdmin ? "left-4" : "left-0.5"}`} />
                </div>
                <span className="text-sm text-slate-600 dark:text-gray-400">Admin yetkisi</span>
              </label>
              {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl px-3 py-2">{error}</p>}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={editing ? () => { update(editing.id, { name: form.name, role: form.role, color: form.color, isAdmin: form.isAdmin }); setEditing(null); } : create}
                disabled={saving || !form.name || (!editing && !form.password)}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm">
                {saving ? "Kaydediliyor..." : editing ? "Güncelle" : "Oluştur"}
              </button>
              <button onClick={() => { setAdding(false); setEditing(null); setError(""); }}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-semibold rounded-xl text-sm transition-colors">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password reset modal */}
      {resetPw && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setResetPw(null)}>
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-900 dark:text-gray-100 mb-1">Şifre Sıfırla</h2>
            <p className="text-sm text-slate-500 dark:text-gray-500 mb-5">{resetPw.name} için yeni şifre</p>
            <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Yeni şifre" className={`${inputCls} mb-4`} />
            <div className="flex gap-2">
              <button onClick={doResetPw} disabled={saving || !newPw}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-colors">
                {saving ? "..." : "Sıfırla"}
              </button>
              <button onClick={() => setResetPw(null)}
                className="flex-1 py-2 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-semibold rounded-xl text-sm transition-colors">
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
