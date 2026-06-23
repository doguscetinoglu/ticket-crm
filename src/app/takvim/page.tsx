"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface UserLite { id: number; name: string; color: string; }
interface DayBucket { total: number; byUser: Record<string, number>; unassigned: number; }
interface LeaveLite { id: number; userId: number; userName: string; color: string; type: string; startDate: string; endDate: string; }
interface CalData { users: UserLite[]; days: Record<string, DayBucket>; leaves: LeaveLite[]; }

const COLOR_BG: Record<string, string> = {
  blue: "bg-blue-600", purple: "bg-purple-600", green: "bg-emerald-600",
  pink: "bg-pink-600", orange: "bg-orange-500", indigo: "bg-indigo-600",
  teal: "bg-teal-600", red: "bg-red-600", amber: "bg-amber-500",
};
const COLOR_TEXT: Record<string, string> = {
  blue: "text-blue-600", purple: "text-purple-600", green: "text-emerald-600",
  pink: "text-pink-600", orange: "text-orange-500", indigo: "text-indigo-600",
  teal: "text-teal-600", red: "text-red-600", amber: "text-amber-500",
};
const bg = (c: string) => COLOR_BG[c] ?? "bg-indigo-600";

const MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

const pad = (n: number) => String(n).padStart(2, "0");
const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

export default function TakvimPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-based
  const [data, setData] = useState<CalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userFilter, setUserFilter] = useState<number | "all">("all");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/takvim?month=${year}-${pad(month + 1)}`);
    const d = res.ok ? await res.json() : null;
    setData(d);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const userMap = useMemo(() => {
    const m: Record<number, UserLite> = {};
    data?.users.forEach((u) => (m[u.id] = u));
    return m;
  }, [data]);

  // Bir gün için izinli olanları bul (tarih aralığı string karşılaştırması: YYYY-MM-DD)
  const leavesForDay = useCallback((key: string) => {
    if (!data) return [];
    return data.leaves.filter((l) => key >= l.startDate && key <= l.endDate);
  }, [data]);

  // Ay grid hücreleri (Pazartesi başlangıçlı)
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // Pazartesi=0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr: (string | null)[] = [];
    for (let i = 0; i < offset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(`${year}-${pad(month + 1)}-${pad(d)}`);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1); };
  const goToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth()); };

  // Aylık toplamlar
  const monthStats = useMemo(() => {
    if (!data) return { total: 0, assigned: 0, unassigned: 0, leaveDays: 0 };
    let total = 0, unassigned = 0;
    Object.entries(data.days).forEach(([key, b]) => {
      if (!key.startsWith(`${year}-${pad(month + 1)}`)) return;
      total += b.total; unassigned += b.unassigned;
    });
    return { total, assigned: total - unassigned, unassigned, leaveDays: data.leaves.length };
  }, [data, year, month]);

  const dayCount = (b: DayBucket | undefined) => {
    if (!b) return 0;
    if (userFilter === "all") return b.total;
    return b.byUser[userFilter] ?? 0;
  };

  return (
    <div className="p-4 md:p-7 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Ekip Takvimi</h1>
          <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">Günlük ticket dağılımı ve izin durumu</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <option value="all">Tüm ekip</option>
            {data?.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Aydaki Ticket", val: monthStats.total, color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Atanmış", val: monthStats.assigned, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Atanmamış", val: monthStats.unassigned, color: "text-amber-600 dark:text-amber-400" },
          { label: "İzin Kaydı", val: monthStats.leaveDays, color: "text-pink-600 dark:text-pink-400" },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Calendar card */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400 transition-colors" aria-label="Önceki ay">‹</button>
            <h2 className="text-base font-bold text-slate-800 dark:text-gray-100 min-w-[140px] text-center">{MONTHS[month]} {year}</h2>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400 transition-colors" aria-label="Sonraki ay">›</button>
          </div>
          <button onClick={goToday} className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors">Bugün</button>
        </div>

        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-gray-800">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={`px-2 py-2 text-center text-xs font-semibold uppercase ${i >= 5 ? "text-slate-400 dark:text-gray-600" : "text-slate-500 dark:text-gray-500"}`}>{w}</div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-400 dark:text-gray-600">Yükleniyor…</div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((key, idx) => {
              if (!key) return <div key={idx} className="min-h-[92px] border-b border-r border-slate-50 dark:border-gray-800/40 bg-slate-50/40 dark:bg-gray-950/20" />;
              const b = data?.days[key];
              const cnt = dayCount(b);
              const leaves = leavesForDay(key);
              const isToday = key === todayKey;
              const dayNum = Number(key.slice(-2));
              const weekendCol = (idx % 7) >= 5;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(key)}
                  className={`min-h-[92px] border-b border-r border-slate-100 dark:border-gray-800/60 p-1.5 text-left align-top transition-colors hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 ${weekendCol ? "bg-slate-50/50 dark:bg-gray-950/30" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${isToday ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-gray-500"}`}>{dayNum}</span>
                    {cnt > 0 && (
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">{cnt}</span>
                    )}
                  </div>

                  {/* Per-user mini segmentler (tüm ekip görünümünde) */}
                  {userFilter === "all" && b && b.total > 0 && (
                    <div className="mt-1 flex flex-wrap gap-0.5">
                      {Object.entries(b.byUser).map(([uid, c]) => {
                        const u = userMap[Number(uid)];
                        return (
                          <span key={uid} title={`${u?.name ?? "?"}: ${c}`}
                            className={`text-[9px] leading-none text-white font-bold px-1 py-0.5 rounded ${bg(u?.color ?? "indigo")}`}>
                            {c}
                          </span>
                        );
                      })}
                      {b.unassigned > 0 && (
                        <span title={`Atanmamış: ${b.unassigned}`} className="text-[9px] leading-none text-slate-600 dark:text-gray-300 font-bold px-1 py-0.5 rounded bg-slate-200 dark:bg-gray-700">{b.unassigned}</span>
                      )}
                    </div>
                  )}

                  {/* İzinli rozetleri */}
                  {leaves.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {leaves.slice(0, 2).map((l) => (
                        <div key={l.id} className="flex items-center gap-1 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${bg(l.color)}`} />
                          <span className="text-[9px] text-slate-500 dark:text-gray-400 truncate">{l.userName.split(" ")[0]} izinli</span>
                        </div>
                      ))}
                      {leaves.length > 2 && <span className="text-[9px] text-slate-400 dark:text-gray-600">+{leaves.length - 2} izinli</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      {data && data.users.length > 0 && (
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-gray-500">
          {data.users.map((u) => (
            <span key={u.id} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded ${bg(u.color)}`} />{u.name}
            </span>
          ))}
        </div>
      )}

      {/* Gün detay modalı */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedDay(null)}>
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-gray-100">
                {new Date(selectedDay + "T00:00:00").toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" })}
              </h2>
              <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400">✕</button>
            </div>

            {(() => {
              const b = data?.days[selectedDay];
              const leaves = leavesForDay(selectedDay);
              const entries = b ? Object.entries(b.byUser).sort((a, c) => c[1] - a[1]) : [];
              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase mb-2">Oluşturulan Ticket — {b?.total ?? 0}</p>
                    {entries.length === 0 && (b?.unassigned ?? 0) === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-gray-600">Bu gün ticket oluşturulmadı.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {entries.map(([uid, c]) => {
                          const u = userMap[Number(uid)];
                          return (
                            <div key={uid} className="flex items-center justify-between">
                              <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
                                <span className={`w-2.5 h-2.5 rounded ${bg(u?.color ?? "indigo")}`} />
                                {u?.name ?? "Bilinmiyor"}
                              </span>
                              <span className={`text-sm font-bold ${COLOR_TEXT[u?.color ?? "indigo"] ?? "text-indigo-600"}`}>{c}</span>
                            </div>
                          );
                        })}
                        {(b?.unassigned ?? 0) > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
                              <span className="w-2.5 h-2.5 rounded bg-slate-300 dark:bg-gray-600" />Atanmamış (Havuz)
                            </span>
                            <span className="text-sm font-bold text-slate-500 dark:text-gray-400">{b?.unassigned}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase mb-2">İzinli — {leaves.length}</p>
                    {leaves.length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-gray-600">İzinli çalışan yok.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {leaves.map((l) => (
                          <div key={l.id} className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
                              <span className={`w-2.5 h-2.5 rounded ${bg(l.color)}`} />{l.userName}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-pink-700 dark:text-pink-300">{l.type}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
