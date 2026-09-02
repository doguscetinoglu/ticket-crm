"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionUser } from "@/lib/session";

interface Totals {
  replies: number; ticketsTouched: number; newTickets: number;
  closedTickets: number; tasksCompleted: number; projectMessages: number; workMinutes: number;
}
interface Reply { time: string; ticketId: number; subject: string; customer: string; isInternal: boolean; workMinutes: number; excerpt: string; }
interface TicketRow { time: string; id: number; subject: string; customer: string; status: string; priority: string; }
interface TaskRow { time: string; project: string; step: string; title: string; }
interface MsgRow { time: string; project: string; excerpt: string; }
interface LogRow { time: string; project: string; action: string; }
interface Summary {
  date: string;
  user: { id: number; name: string; role: string };
  leave: { type: string; startDate: string; endDate: string } | null;
  totals: Totals;
  replies: Reply[]; newTickets: TicketRow[]; closedTickets: TicketRow[];
  tasks: TaskRow[]; messages: MsgRow[]; logs: LogRow[];
}
interface UserOpt { id: number; name: string; isActive: boolean; }

const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });

function sureMetni(dk: number): string {
  if (!dk) return "0 dk";
  const h = Math.floor(dk / 60), m = dk % 60;
  return h ? `${h} sa ${m} dk` : `${m} dk`;
}

const card = "bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none";

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="px-5 py-3.5 border-b border-slate-100 dark:border-gray-800 flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">{title}</p>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400">{count}</span>
      </div>
      {count === 0
        ? <p className="px-5 py-6 text-xs text-slate-400 dark:text-gray-600">Bu gün için kayıt yok.</p>
        : <div className="divide-y divide-slate-50 dark:divide-gray-800/60">{children}</div>}
    </div>
  );
}

export default function GunlukOzetPage() {
  const [me, setMe] = useState<SessionUser | null>(null);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [date, setDate] = useState(todayIso());
  const [userId, setUserId] = useState<number | null>(null);
  const [data, setData] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then((m: SessionUser | null) => {
      setMe(m);
      if (m?.type === "admin") {
        fetch("/api/users").then(r => r.json()).then(u => setUsers(Array.isArray(u) ? u : []));
      }
    });
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams({ date });
    if (userId) q.set("userId", String(userId));
    const res = await fetch(`/api/gunluk-ozet?${q}`);
    setData(res.ok ? await res.json() : null);
    setLoading(false);
  }, [date, userId]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const download = (format: "excel" | "pdf") => {
    const q = new URLSearchParams({ date, format });
    if (userId) q.set("userId", String(userId));
    window.open(`/api/gunluk-ozet?${q}`, "_blank");
  };

  const isAdmin = me?.type === "admin";
  const t = data?.totals;

  const KPI = [
    { label: "Bilet yanıtı", val: t?.replies ?? 0, color: "text-indigo-600 dark:text-indigo-400" },
    { label: "Dokunulan bilet", val: t?.ticketsTouched ?? 0, color: "text-slate-700 dark:text-gray-200" },
    { label: "Gelen bilet", val: t?.newTickets ?? 0, color: "text-amber-600 dark:text-amber-400" },
    { label: "Kapanan bilet", val: t?.closedTickets ?? 0, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Tamamlanan görev", val: t?.tasksCompleted ?? 0, color: "text-violet-600 dark:text-violet-400" },
    { label: "Kayıtlı çalışma", val: sureMetni(t?.workMinutes ?? 0), color: "text-teal-600 dark:text-teal-400" },
  ];

  return (
    <div className="p-4 md:p-7 space-y-5 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Günlük Çalışma Özeti</h1>
          <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">
            {data ? `${data.user.name} — o gün yapılan işler` : "Seçilen gün için yapılan işler"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input type="date" value={date} max={todayIso()} onChange={e => setDate(e.target.value)}
            className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
          {isAdmin && (
            <select value={userId ?? ""} onChange={e => setUserId(e.target.value ? Number(e.target.value) : null)}
              className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
              <option value="">Kendim</option>
              {users.filter(u => u.isActive).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <button onClick={() => download("excel")}
            className="px-3.5 py-2 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
            📊 Excel
          </button>
          <button onClick={() => download("pdf")}
            className="px-3.5 py-2 text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
            📄 PDF
          </button>
        </div>
      </div>

      {data?.leave && (
        <div className="px-4 py-3 rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 text-sm text-amber-800 dark:text-amber-300">
          Bu gün <strong>{data.leave.type}</strong> izni kayıtlı.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <p className="text-sm text-slate-400 dark:text-gray-600">Özet alınamadı.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {KPI.map(k => (
              <div key={k.label} className={`${card} p-4`}>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{k.label}</p>
                <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.val}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Section title="Bilet Yanıtları" count={data.replies.length}>
              {data.replies.map((r, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-mono text-slate-400 dark:text-gray-600">{r.time}</span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">#{r.ticketId}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-gray-300 truncate">{r.subject}</span>
                    {r.isInternal && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400">İç not</span>}
                    {r.workMinutes > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400">{r.workMinutes} dk</span>}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-gray-600 mt-1">{r.customer} · {r.excerpt}</p>
                </div>
              ))}
            </Section>

            <Section title="Tamamlanan Proje Görevleri" count={data.tasks.length}>
              {data.tasks.map((x, i) => (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 dark:text-gray-600">{x.time}</span>
                    <span className="text-xs font-medium text-slate-700 dark:text-gray-300 truncate">{x.title}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-gray-600 mt-1">{x.project} · {x.step}</p>
                </div>
              ))}
            </Section>

            <Section title="Gün İçinde Gelen Biletler" count={data.newTickets.length}>
              {data.newTickets.map(x => (
                <div key={x.id} className="px-5 py-3 flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 dark:text-gray-600">{x.time}</span>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">#{x.id}</span>
                  <span className="text-xs text-slate-700 dark:text-gray-300 truncate flex-1">{x.subject}</span>
                  <span className="text-[10px] text-slate-400 dark:text-gray-600">{x.status}</span>
                </div>
              ))}
            </Section>

            <Section title="Kapanan / Yanıtlanan Biletler" count={data.closedTickets.length}>
              {data.closedTickets.map(x => (
                <div key={x.id} className="px-5 py-3 flex items-center gap-2">
                  <span className="text-[11px] font-mono text-slate-400 dark:text-gray-600">{x.time}</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">#{x.id}</span>
                  <span className="text-xs text-slate-700 dark:text-gray-300 truncate flex-1">{x.subject}</span>
                  <span className="text-[10px] text-slate-400 dark:text-gray-600">{x.status}</span>
                </div>
              ))}
            </Section>

            <Section title="Proje Hareketleri" count={data.messages.length + data.logs.length}>
              {[...data.messages.map(m => ({ time: m.time, project: m.project, text: m.excerpt, kind: "Mesaj" })),
                ...data.logs.map(l => ({ time: l.time, project: l.project, text: l.action, kind: "Hareket" }))]
                .map((x, i) => (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 dark:text-gray-600">{x.time}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400">{x.kind}</span>
                      <span className="text-xs text-slate-700 dark:text-gray-300 truncate">{x.project}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-gray-600 mt-1">{x.text}</p>
                  </div>
                ))}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
