"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import UserAvatar from "@/components/UserAvatar";
import DailyChart from "@/components/DailyChart";
import MonthlyChart from "@/components/MonthlyChart";
import type { SessionUser } from "@/lib/session";

interface Stats {
  isAdmin: boolean;
  total: number; open: number; inProgress: number; answered: number; closed: number;
  todayCount: number; weekCount: number; monthCount: number; unassigned: number;
  customerCount: number; myAssigned: number;
  byCategory: { category: string; _count: { id: number } }[];
  byPriority: { priority: string; _count: { id: number } }[];
  users: { id: number; name: string; color: string; role: string; _count: { tickets: number }; openTickets: number }[];
  recent: {
    id: number; subject: string; fromName: string | null; fromEmail: string;
    status: string; priority: string; receivedAt: string;
    assignee: { name: string; color: string } | null;
    customer: { id: number; name: string | null; company: string | null } | null;
  }[];
  dailyData: { date: string; count: number }[];
  monthlyData: { month: string; count: number }[];
  topCustomers: { id: number; email: string; name: string | null; company: string | null; _count: { tickets: number }; totalWorkMinutes: number }[];
}

function KpiCard({ label, value, sub, color, icon }: {
  label: string; value: number | string; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 md:p-5 border border-slate-200 dark:border-gray-800/80 relative overflow-hidden group hover:border-slate-300 dark:hover:border-gray-700 transition-colors shadow-sm dark:shadow-none">
      <div className={`absolute top-0 left-0 right-0 h-[3px] ${color}`} />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-gray-100 mt-1 leading-none">{value}</p>
          {sub && <p className="text-[11px] text-slate-400 dark:text-gray-600 mt-1.5 truncate">{sub}</p>}
        </div>
        <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-100 dark:bg-gray-800/60 flex items-center justify-center text-slate-400 dark:text-gray-500 group-hover:text-slate-600 dark:group-hover:text-gray-400 transition-colors">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Ring({ pct, color, size = 72 }: { pct: number; color: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ minWidth: size }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-slate-200 dark:stroke-gray-800" strokeWidth={10} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease" }} />
    </svg>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600 dark:text-gray-400 truncate pr-2">{label}</span>
        <span className="text-slate-800 dark:text-gray-300 font-semibold shrink-0">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [me, setMe] = useState<SessionUser | null>(null);
  const [tab, setTab] = useState<"daily" | "monthly">("daily");

  const fetchData = useCallback(async () => {
    const [meRes, statsRes] = await Promise.all([
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null),
      fetch("/api/stats").then(r => r.json()),
    ]);
    setMe(meRes);
    setStats(statsRes.error ? null : statsRes);
  }, []);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 30000);
    return () => clearInterval(t);
  }, [fetchData]);

  const s = stats;
  const isAdmin = s?.isAdmin ?? false;
  const resolvedPct = s && s.total > 0 ? Math.round(((s.answered + s.closed) / s.total) * 100) : 0;
  const openPct = s && s.total > 0 ? Math.round(((s.open + s.inProgress) / s.total) * 100) : 0;
  const unassignedPct = s && s.total > 0 ? Math.round((s.unassigned / s.total) * 100) : 0;

  const greeting = me ? `Merhaba, ${me.name.split(" ")[0]}` : "Dashboard";

  const iconTicket = <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>;
  const iconClock = <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
  const iconCalendar = <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
  const iconUsers = <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
  const iconInbox = <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>;

  return (
    <div className="p-4 md:p-6 lg:p-7 space-y-5 max-w-[1600px] mx-auto animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-gray-100">{greeting}</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-gray-500 mt-0.5">
            {isAdmin ? "Tüm sistem istatistikleri" : "Atanmış ve havuz biletleriniz"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-gray-600 hidden sm:block">
            {new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
          </span>
          {!isAdmin && (
            <Link href="/havuz" className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors">
              + Havuza Git
            </Link>
          )}
        </div>
      </div>

      {/* KPI Kartlar */}
      {isAdmin ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
          <KpiCard label="Toplam Bilet" value={s?.total ?? "—"} sub={`Bu hafta: ${s?.weekCount ?? "—"}`} color="bg-gradient-to-r from-indigo-500 to-violet-500" icon={iconTicket} />
          <KpiCard label="Bugün Gelen" value={s?.todayCount ?? "—"} sub={`Bu ay: ${s?.monthCount ?? "—"}`} color="bg-gradient-to-r from-sky-500 to-blue-500" icon={iconClock} />
          <KpiCard label="Bu Ay" value={s?.monthCount ?? "—"} sub="toplam gelen" color="bg-gradient-to-r from-violet-500 to-purple-500" icon={iconCalendar} />
          <KpiCard label="Toplam Müşteri" value={s?.customerCount ?? "—"} sub="kayıtlı" color="bg-gradient-to-r from-teal-500 to-emerald-500" icon={iconUsers} />
          <KpiCard label="Havuz (Bekleyen)" value={s?.unassigned ?? "—"} sub="atanmamış" color="bg-gradient-to-r from-rose-500 to-red-500" icon={iconInbox} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <KpiCard label="Atanmış Biletim" value={s?.myAssigned ?? "—"} sub="toplam" color="bg-gradient-to-r from-indigo-500 to-violet-500" icon={iconTicket} />
          <KpiCard label="Açık Biletlerim" value={s ? (s.open + s.inProgress) : "—"} sub="yanıt bekliyor" color="bg-gradient-to-r from-amber-500 to-orange-500" icon={iconClock} />
          <KpiCard label="Bugün Gelen" value={s?.todayCount ?? "—"} sub={`Bu hafta: ${s?.weekCount ?? "—"}`} color="bg-gradient-to-r from-sky-500 to-blue-500" icon={iconCalendar} />
          <KpiCard label="Havuz Bekleyen" value={s?.unassigned ?? "—"} sub="alınabilir" color="bg-gradient-to-r from-rose-500 to-red-500" icon={iconInbox} />
        </div>
      )}

      {/* Durum Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Yeni",        val: s?.open,      color: "text-violet-700 dark:text-violet-400",  bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20",   dot: "bg-violet-500" },
          { label: "İnceleniyor", val: s?.inProgress, color: "text-amber-700 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",     dot: "bg-amber-500" },
          { label: "Yanıtlandı",  val: s?.answered,  color: "text-emerald-700 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20", dot: "bg-emerald-500" },
          { label: "Kapalı",      val: s?.closed,    color: "text-slate-600 dark:text-gray-400",    bg: "bg-slate-100 dark:bg-gray-700/20 border-slate-200 dark:border-gray-700/40",        dot: "bg-slate-400 dark:bg-gray-500" },
        ].map(({ label, val, color, bg, dot }) => (
          <div key={label} className={`${bg} border rounded-2xl p-4 md:p-5`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              <span className="text-xs text-slate-600 dark:text-gray-500 font-medium">{label}</span>
            </div>
            <p className={`text-2xl md:text-3xl font-bold ${color}`}>{val ?? "—"}</p>
            {s && s.total > 0 && (
              <p className="text-[10px] text-slate-400 dark:text-gray-600 mt-1">
                %{Math.round((val! / s.total) * 100)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Oranlar + Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Ring göstergeleri */}
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800/80 rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-none">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-200">Özet Oranlar</h2>
          {[
            { label: "Çözüm", sub: "Yanıtlandı + Kapalı", pct: resolvedPct, color: "#10b981", textColor: "text-emerald-600 dark:text-emerald-400" },
            { label: "Açık", sub: "Yeni + İnceleniyor", pct: openPct, color: "#f59e0b", textColor: "text-amber-600 dark:text-amber-400" },
            { label: "Atanmamış", sub: "Havuzdaki oran", pct: unassignedPct, color: "#ef4444", textColor: "text-red-600 dark:text-red-400" },
          ].map(({ label, sub, pct, color, textColor }) => (
            <div key={label} className="flex items-center gap-3">
              <div className="relative shrink-0">
                <Ring pct={pct} color={color} size={64} />
                <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${textColor}`}>
                  %{pct}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">{label}</p>
                <p className="text-xs text-slate-500 dark:text-gray-500">{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trend grafik */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-200">Ticket Trendi</h2>
              <p className="text-xs text-slate-500 dark:text-gray-500 mt-0.5">{isAdmin ? "Tüm biletler" : "Görünür biletleriniz"}</p>
            </div>
            <div className="flex gap-1 bg-slate-100 dark:bg-gray-800/60 rounded-lg p-0.5">
              <button onClick={() => setTab("daily")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${tab === "daily" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"}`}>
                7 Gün
              </button>
              <button onClick={() => setTab("monthly")} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${tab === "monthly" ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"}`}>
                6 Ay
              </button>
            </div>
          </div>
          <div className="min-h-[100px]">
            {tab === "daily"
              ? s?.dailyData ? <DailyChart data={s.dailyData} /> : <Skeleton />
              : s?.monthlyData ? <MonthlyChart data={s.monthlyData} /> : <Skeleton />
            }
          </div>
        </div>
      </div>

      {/* Dağılım + Ekip/Kategori */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Durum dağılımı */}
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-200 mb-4">Durum Dağılımı</h2>
          {s ? (
            <div className="space-y-3.5">
              {[
                { label: "Yeni", val: s.open, color: "bg-violet-500" },
                { label: "İnceleniyor", val: s.inProgress, color: "bg-amber-500" },
                { label: "Yanıtlandı", val: s.answered, color: "bg-emerald-500" },
                { label: "Kapalı", val: s.closed, color: "bg-slate-400 dark:bg-gray-600" },
              ].map(({ label, val, color }) => (
                <BarRow key={label} label={label} value={val} max={s.total} color={color} />
              ))}
            </div>
          ) : <Skeleton />}
        </div>

        {/* Kategori + Öncelik */}
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800/80 rounded-2xl p-5 space-y-5 shadow-sm dark:shadow-none">
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-200 mb-3">Kategoriye Göre</h2>
            <div className="space-y-2.5">
              {(s?.byCategory ?? []).slice(0, 4).map(c => (
                <BarRow key={c.category} label={c.category} value={c._count.id}
                  max={Math.max(...(s?.byCategory ?? []).map(x => x._count.id), 1)} color="bg-indigo-500" />
              ))}
              {!s && <Skeleton />}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-200 mb-3">Önceliğe Göre</h2>
            <div className="space-y-2.5">
              {(s?.byPriority ?? []).map(p => (
                <BarRow key={p.priority} label={p.priority} value={p._count.id}
                  max={Math.max(...(s?.byPriority ?? []).map(x => x._count.id), 1)} color="bg-orange-500" />
              ))}
              {!s && <Skeleton />}
            </div>
          </div>
        </div>

        {/* Ekip yükü (admin) veya kendi durum özeti (agent) */}
        {isAdmin ? (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-sm dark:shadow-none">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-200 mb-4">Ekip Yükü</h2>
            <div className="space-y-3">
              {(s?.users ?? []).map(u => {
                const maxTickets = Math.max(...(s?.users ?? []).map(x => x._count.tickets), 1);
                return (
                  <div key={u.id} className="flex items-center gap-3">
                    <UserAvatar name={u.name} color={u.color} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-slate-700 dark:text-gray-300 font-medium truncate">{u.name.split(" ")[0]}</span>
                        <span className="text-slate-500 dark:text-gray-500 shrink-0 ml-2">{u._count.tickets}</span>
                      </div>
                      <div className="h-1.5 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                          style={{ width: `${(u._count.tickets / maxTickets) * 100}%` }} />
                      </div>
                    </div>
                    {u.openTickets > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0 font-semibold">
                        {u.openTickets}
                      </span>
                    )}
                  </div>
                );
              })}
              {!s && <Skeleton />}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-sm dark:shadow-none">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-200 mb-4">Benim Özetim</h2>
            {s ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800/60 rounded-xl">
                  <span className="text-sm text-slate-600 dark:text-gray-400">Çözüm Oranım</span>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">%{resolvedPct}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800/60 rounded-xl">
                  <span className="text-sm text-slate-600 dark:text-gray-400">Bu Ay Gelen</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{s.monthCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800/60 rounded-xl">
                  <span className="text-sm text-slate-600 dark:text-gray-400">Havuz (Alınabilir)</span>
                  <span className="text-lg font-bold text-rose-600 dark:text-rose-400">{s.unassigned}</span>
                </div>
                <Link href="/havuz"
                  className="block w-full text-center py-2.5 bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-600 dark:text-indigo-400 text-sm font-semibold rounded-xl transition-colors border border-indigo-200 dark:border-indigo-600/30">
                  Havuza Git →
                </Link>
              </div>
            ) : <Skeleton />}
          </div>
        )}
      </div>

      {/* En aktif müşteriler — sadece admin */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800/80 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-200">En Aktif Müşteriler</h2>
            <Link href="/musteriler" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors font-medium">
              Tümünü gör →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {(s?.topCustomers ?? []).map((c, i) => (
              <Link key={c.id} href={`/musteriler/${c.id}`}
                className="bg-slate-50 dark:bg-gray-800/50 hover:bg-slate-100 dark:hover:bg-gray-800 border border-slate-200 dark:border-gray-700/40 hover:border-indigo-200 dark:hover:border-gray-600/60 rounded-xl p-3 md:p-4 transition-all block group">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-indigo-500/20">
                    {(c.name || c.email)[0].toUpperCase()}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-gray-600 font-mono">#{i + 1}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-gray-200 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{c.name || c.email}</p>
                {c.company && <p className="text-[11px] text-slate-500 dark:text-gray-500 truncate mt-0.5">{c.company}</p>}
                <div className="mt-2.5 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{c._count.tickets}</span>
                  <span className="text-[11px] text-slate-400 dark:text-gray-600">bilet</span>
                </div>
                {c.totalWorkMinutes > 0 && (
                  <div className="mt-1 text-[11px] text-slate-400 dark:text-gray-600">
                    {c.totalWorkMinutes >= 60 ? `${Math.floor(c.totalWorkMinutes / 60)}s ${c.totalWorkMinutes % 60}dk` : `${c.totalWorkMinutes}dk`} harcandı
                  </div>
                )}
              </Link>
            ))}
            {(!s?.topCustomers || s.topCustomers.length === 0) && (
              <p className="text-xs text-slate-400 dark:text-gray-600 col-span-5 text-center py-6">Henüz müşteri yok</p>
            )}
          </div>
        </div>
      )}

      {/* Son biletler */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm dark:shadow-none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-gray-800/80">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-200">Son Biletler</h2>
          <Link href="/tickets" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors font-medium">
            Tümünü gör →
          </Link>
        </div>
        {!s?.recent || s.recent.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-gray-600 text-sm">Henüz bilet yok</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-gray-800/60">
            {s.recent.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors">
                <span className="text-xs text-slate-400 dark:text-gray-600 font-mono w-7 shrink-0 hidden sm:block">#{t.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800 dark:text-gray-200 truncate font-medium">{t.subject}</p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-500 truncate mt-0.5">
                    {t.customer?.name || t.fromName || t.fromEmail}
                    {t.customer?.company && <span className="text-slate-400 dark:text-gray-600"> · {t.customer.company}</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={t.status} />
                  <span className="hidden md:inline-flex">
                    <PriorityBadge priority={t.priority} />
                  </span>
                  {t.assignee ? (
                    <span className="hidden sm:inline-flex">
                      <UserAvatar name={t.assignee.name} color={t.assignee.color} size="sm" />
                    </span>
                  ) : (
                    <span className="text-[10px] text-rose-500 dark:text-rose-400/80 font-medium hidden sm:block">Havuz</span>
                  )}
                  <span className="text-[10px] text-slate-400 dark:text-gray-600 hidden lg:block whitespace-nowrap">
                    {new Date(t.receivedAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-3 bg-slate-200 dark:bg-gray-800 rounded w-3/4" />
      <div className="h-3 bg-slate-200 dark:bg-gray-800 rounded w-1/2" />
      <div className="h-3 bg-slate-200 dark:bg-gray-800 rounded w-2/3" />
    </div>
  );
}
