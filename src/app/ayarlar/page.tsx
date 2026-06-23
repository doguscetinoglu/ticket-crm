"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import type { SessionUser } from "@/lib/session";

interface UserRow { id: number; name: string; email: string; role: string; color: string; isAdmin: boolean; isActive: boolean; }
interface CustomerRow { id: number; name: string | null; email: string; company: string | null; isActive: boolean; openTickets: number; }
type Settings = Record<string, boolean>;

const SETTING_DEFS: { key: string; label: string; desc: string }[] = [
  { key: "mail_ticket_confirmation", label: "Ticket onay maili", desc: "Yeni ticket oluşturulduğunda müşteriye karşılama/onay maili gönderilir." },
  { key: "mail_reply", label: "Yanıt maili", desc: "Temsilci bir ticket'a yanıt verdiğinde müşteriye e-posta gönderilir." },
  { key: "mail_survey", label: "Anket / kapanış maili", desc: "Ticket kapatıldığında memnuniyet anketi maili gönderilir. Kapalıyken anket kaydı hiç oluşturulmaz." },
  { key: "notify_telegram", label: "Telegram bildirimleri", desc: "Durum/yanıt değişimlerinde Telegram üzerinden bildirim gönderilir." },
];

function Toggle({ on, onClick, disabled, color = "indigo" }: { on: boolean; onClick: () => void; disabled?: boolean; color?: "indigo" | "amber" | "emerald" }) {
  const onBg = color === "amber" ? "bg-amber-500" : color === "emerald" ? "bg-emerald-500" : "bg-indigo-600";
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 disabled:opacity-50 ${on ? onBg : "bg-slate-300 dark:bg-gray-700"}`}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function AyarlarPage() {
  const [me, setMe] = useState<SessionUser | null | undefined>(undefined);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const [meRes, sRes, uRes, cRes] = await Promise.all([
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/ayarlar").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/users").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/customers").then((r) => (r.ok ? r.json() : [])),
    ]);
    setMe(meRes);
    setSettings(sRes);
    setUsers(Array.isArray(uRes) ? uRes : []);
    setCustomers(Array.isArray(cRes) ? cRes : []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleSetting = async (key: string) => {
    if (!settings) return;
    const next = !settings[key];
    setSettings((s) => ({ ...(s ?? {}), [key]: next }));
    setSavingKey(key);
    const res = await fetch("/api/ayarlar", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: next }) });
    if (res.ok) setSettings(await res.json());
    setSavingKey(null);
  };

  const toggleUser = async (u: UserRow) => {
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, isActive: !x.isActive } : x)));
    await fetch(`/api/users/${u.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !u.isActive }) });
  };

  const toggleCustomer = async (c: CustomerRow) => {
    setCustomers((list) => list.map((x) => (x.id === c.id ? { ...x, isActive: !x.isActive } : x)));
    await fetch(`/api/customers/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !c.isActive }) });
  };

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => `${c.name ?? ""} ${c.email} ${c.company ?? ""}`.toLowerCase().includes(q));
  }, [customers, search]);

  const anyMailOff = settings && SETTING_DEFS.slice(0, 3).some((d) => settings[d.key] === false);

  if (me === undefined) return <div className="p-8 text-sm text-slate-400 dark:text-gray-600">Yükleniyor…</div>;
  if (me?.type !== "admin") return <div className="p-8 text-sm text-slate-500 dark:text-gray-400">Bu sayfaya yalnızca yöneticiler erişebilir.</div>;

  return (
    <div className="p-4 md:p-7 space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Ayarlar</h1>
        <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">Bildirim gönderimi ve hesap durumları</p>
      </div>

      {/* Bildirim Gönderimi */}
      <section className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-800">
          <h2 className="text-sm font-bold text-slate-800 dark:text-gray-100">Bildirim Gönderimi</h2>
          <p className="text-xs text-slate-500 dark:text-gray-500 mt-0.5">Kapatınca ticket'lar gelmeye devam eder; yalnızca otomatik gönderim durur.</p>
        </div>

        {anyMailOff && (
          <div className="mx-5 mt-4 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-xl px-3 py-2">
            <span>⚠️</span>
            <span>Bazı mail gönderimleri kapalı. Ticket oluşturma ve yanıt kaydı çalışmaya devam eder, ancak ilgili otomatik e-postalar gönderilmez.</span>
          </div>
        )}

        <div className="divide-y divide-slate-100 dark:divide-gray-800/60">
          {SETTING_DEFS.map((d) => {
            const on = settings?.[d.key] ?? true;
            return (
              <div key={d.key} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">{d.label} {!on && <span className="text-[11px] font-medium text-red-500 ml-1">· kapalı</span>}</p>
                  <p className="text-xs text-slate-500 dark:text-gray-500 mt-0.5">{d.desc}</p>
                </div>
                <Toggle on={on} onClick={() => toggleSetting(d.key)} disabled={savingKey === d.key || !settings} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Kullanıcılar */}
      <section className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-gray-100">Kullanıcılar</h2>
            <p className="text-xs text-slate-500 dark:text-gray-500 mt-0.5">{users.filter((u) => u.isActive).length} / {users.length} aktif · pasif kullanıcı giriş yapamaz</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-gray-800/60">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <UserAvatar name={u.name} color={u.color} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate">{u.name} {u.isAdmin && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 ml-1">Admin</span>}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-600 truncate">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium ${u.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-gray-600"}`}>{u.isActive ? "Aktif" : "Pasif"}</span>
                <Toggle on={u.isActive} onClick={() => toggleUser(u)} disabled={u.id === me.id} color="emerald" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Müşteriler */}
      <section className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-gray-100">Müşteriler</h2>
            <p className="text-xs text-slate-500 dark:text-gray-500 mt-0.5">{customers.filter((c) => c.isActive).length} / {customers.length} aktif · pasif müşteri portala giriş yapamaz</p>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Müşteri ara…"
            className="bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-full sm:w-56" />
        </div>
        <div className="divide-y divide-slate-100 dark:divide-gray-800/60 max-h-[420px] overflow-y-auto">
          {filteredCustomers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400 dark:text-gray-600">Müşteri bulunamadı.</p>
          ) : filteredCustomers.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate">{c.name ?? c.email}</p>
                <p className="text-xs text-slate-400 dark:text-gray-600 truncate">{c.email}{c.company ? ` · ${c.company}` : ""}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium ${c.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-gray-600"}`}>{c.isActive ? "Aktif" : "Pasif"}</span>
                <Toggle on={c.isActive} onClick={() => toggleCustomer(c)} color="emerald" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
