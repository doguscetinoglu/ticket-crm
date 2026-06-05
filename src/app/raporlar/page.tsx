"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";

const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const BarChart           = dynamic(() => import("recharts").then(m => m.BarChart), { ssr: false });
const Bar                = dynamic(() => import("recharts").then(m => m.Bar), { ssr: false });
const XAxis              = dynamic(() => import("recharts").then(m => m.XAxis), { ssr: false });
const YAxis              = dynamic(() => import("recharts").then(m => m.YAxis), { ssr: false });
const CartesianGrid      = dynamic(() => import("recharts").then(m => m.CartesianGrid), { ssr: false });
const Tooltip            = dynamic(() => import("recharts").then(m => m.Tooltip), { ssr: false });
const Legend             = dynamic(() => import("recharts").then(m => m.Legend), { ssr: false });

interface ReportData {
  totalTickets: number;
  closedInPeriod: number;
  resolvedPct: number;
  openTickets: number;
  byStatus: { name: string; value: number }[];
  byCategory: { name: string; value: number }[];
  byPriority: { name: string; value: number }[];
  trendData: { label: string; count: number }[];
  hourlyData: { hour: string; count: number }[];
  agentPerf: { name: string; total: number; resolved: number }[];
}

interface ProjectStats {
  total: number;
  devamEdiyor: number;
  tamamlandi: number;
  beklemede: number;
  iptal: number;
  avgProgress: number;
  recentProjects: { id: number; name: string; status: string; progress: number; memberCount: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  "Yeni": "#8b5cf6", "İnceleniyor": "#f59e0b", "Yanıtlandı": "#10b981", "Kapalı": "#6b7280",
};
const PRIORITY_COLORS: Record<string, string> = {
  "Düşük": "#94a3b8", "Normal": "#3b82f6", "Yüksek": "#f97316", "Kritik": "#ef4444",
};
const CAT_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#f43f5e"];

const RANGES = [
  { label: "7 Gün",  value: 7 },
  { label: "15 Gün", value: 15 },
  { label: "30 Gün", value: 30 },
  { label: "1 Yıl",  value: 365 },
];

const tooltipStyle = {
  backgroundColor: "#1f2937",
  border: "1px solid #374151",
  borderRadius: "12px",
  color: "#f1f5f9",
  fontSize: "12px",
  padding: "8px 12px",
};

// ── Custom SVG Donut Chart ──────────────────────────────────────────────────
function DonutChart({
  data,
  getColor,
}: {
  data: { name: string; value: number }[];
  getColor: (name: string, i: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const nonZero = data.filter(d => d.value > 0);
  const total = nonZero.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[200px]">
        <div className="text-4xl mb-2 opacity-30">📊</div>
        <p className="text-sm text-slate-400 dark:text-gray-600">Veri yok</p>
      </div>
    );
  }

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.44;
  const innerR = size * 0.28;
  const gapAngle = nonZero.length > 1 ? 0.04 : 0;
  const totalGap = gapAngle * nonZero.length;

  let angle = -Math.PI / 2;
  const arcs = nonZero.map((d, i) => {
    const sweep = (d.value / total) * (2 * Math.PI - totalGap);
    const sa = angle + gapAngle / 2;
    angle += sweep + gapAngle;
    const ea = sa + sweep;
    const large = sweep > Math.PI ? 1 : 0;
    const path = [
      `M ${(cx + outerR * Math.cos(sa)).toFixed(2)} ${(cy + outerR * Math.sin(sa)).toFixed(2)}`,
      `A ${outerR} ${outerR} 0 ${large} 1 ${(cx + outerR * Math.cos(ea)).toFixed(2)} ${(cy + outerR * Math.sin(ea)).toFixed(2)}`,
      `L ${(cx + innerR * Math.cos(ea)).toFixed(2)} ${(cy + innerR * Math.sin(ea)).toFixed(2)}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${(cx + innerR * Math.cos(sa)).toFixed(2)} ${(cy + innerR * Math.sin(sa)).toFixed(2)}`,
      "Z",
    ].join(" ");
    const color = getColor(d.name, i);
    const pct = Math.round((d.value / total) * 100);
    return { ...d, path, color, pct };
  });

  const active = hovered !== null ? arcs[hovered] : null;

  return (
    <div className="flex items-center gap-5">
      {/* SVG */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ overflow: "visible" }}>
          {arcs.map((arc, i) => (
            <path
              key={i}
              d={arc.path}
              fill={arc.color}
              style={{
                opacity: hovered === null || hovered === i ? 1 : 0.35,
                transition: "opacity 0.15s, transform 0.15s",
                transformOrigin: `${cx}px ${cy}px`,
                transform: hovered === i ? "scale(1.04)" : "scale(1)",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
          <p className="text-xl font-bold text-slate-900 dark:text-gray-100 leading-none">
            {active ? active.value : total}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
            {active ? `%${active.pct}` : "toplam"}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
        {arcs.map((arc, i) => (
          <div
            key={i}
            className="flex items-center gap-2 cursor-default"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0 transition-transform"
              style={{
                background: arc.color,
                transform: hovered === i ? "scale(1.4)" : "scale(1)",
              }}
            />
            <span className={`text-xs truncate flex-1 transition-colors ${hovered === i ? "text-slate-900 dark:text-gray-100 font-medium" : "text-slate-500 dark:text-gray-400"}`}>
              {arc.name}
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-gray-300 shrink-0">{arc.value}</span>
            <span className="text-[10px] text-slate-400 dark:text-gray-600 w-7 text-right shrink-0">%{arc.pct}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = "indigo" }: { label: string; value: string | number; sub?: string; color?: string }) {
  const gradients: Record<string, string> = {
    indigo: "from-indigo-500 to-violet-600",
    emerald: "from-emerald-500 to-teal-600",
    amber: "from-amber-500 to-orange-600",
    rose: "from-rose-500 to-red-600",
  };
  return (
    <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-none relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${gradients[color]}`} />
      <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-slate-900 dark:text-gray-100 mt-2">{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-200">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      {label && <p className="font-semibold mb-1">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.fill }} />
          <span>{p.name || "Sayı"}: <strong>{p.value}</strong></span>
        </div>
      ))}
    </div>
  );
};

function calcProgress(steps: { status: string; tasks: { status: string }[] }[]) {
  if (!steps.length) return 0;
  const allTasks = steps.flatMap(s => s.tasks);
  if (!allTasks.length) {
    const done = steps.filter(s => s.status === "Tamamlandı").length;
    return Math.round((done / steps.length) * 100);
  }
  const done = allTasks.filter(t => t.status === "Tamamlandı").length;
  return Math.round((done / allTasks.length) * 100);
}

export default function RaporlarPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [projStats, setProjStats] = useState<ProjectStats | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        fetch(`/api/raporlar?days=${days}`),
        fetch("/api/projects"),
      ]);
      if (rRes.ok) setData(await rRes.json());
      if (pRes.ok) {
        const projects = await pRes.json() as { id: number; name: string; status: string; members: unknown[]; steps: { status: string; tasks: { status: string }[] }[] }[];
        if (Array.isArray(projects)) {
          const total = projects.length;
          const devamEdiyor = projects.filter(p => p.status === "Devam Ediyor").length;
          const tamamlandi = projects.filter(p => p.status === "Tamamlandı").length;
          const beklemede  = projects.filter(p => p.status === "Beklemede").length;
          const iptal      = projects.filter(p => p.status === "İptal").length;
          const avgProgress = total > 0 ? Math.round(projects.reduce((s, p) => s + calcProgress(p.steps), 0) / total) : 0;
          const recentProjects = projects.slice(0, 5).map(p => ({
            id: p.id, name: p.name, status: p.status,
            progress: calcProgress(p.steps),
            memberCount: p.members.length,
          }));
          setProjStats({ total, devamEdiyor, tamamlandi, beklemede, iptal, avgProgress, recentProjects });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const Skeleton = ({ h = 220 }: { h?: number }) => (
    <div className="bg-slate-100 dark:bg-gray-800 rounded-xl animate-pulse" style={{ height: h }} />
  );

  return (
    <div className="p-4 md:p-7 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Raporlar</h1>
          <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">Detaylı performans ve istatistik analizi</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          {RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setDays(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                days === r.value
                  ? "bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 shadow-sm"
                  : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Toplam Ticket" value={data?.totalTickets ?? "—"} sub="seçili dönemde" color="indigo" />
        <KpiCard label="Çözülen" value={data?.closedInPeriod ?? "—"} sub={`%${data?.resolvedPct ?? 0} çözüm oranı`} color="emerald" />
        <KpiCard label="Açık / Bekleyen" value={data?.openTickets ?? "—"} sub="işlem bekliyor" color="amber" />
        <KpiCard label="Çözüm Oranı" value={`%${data?.resolvedPct ?? 0}`} sub="kapalı / toplam" color="rose" />
      </div>

      {/* Pie Charts Row — custom SVG donut charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Durum Dağılımı">
          {loading ? <Skeleton /> : (
            <DonutChart
              data={data?.byStatus ?? []}
              getColor={(name) => STATUS_COLORS[name] ?? CAT_COLORS[0]}
            />
          )}
        </ChartCard>

        <ChartCard title="Kategori Dağılımı">
          {loading ? <Skeleton /> : (
            <DonutChart
              data={data?.byCategory ?? []}
              getColor={(_, i) => CAT_COLORS[i % CAT_COLORS.length]}
            />
          )}
        </ChartCard>

        <ChartCard title="Öncelik Dağılımı">
          {loading ? <Skeleton /> : (
            <DonutChart
              data={data?.byPriority ?? []}
              getColor={(name) => PRIORITY_COLORS[name] ?? CAT_COLORS[0]}
            />
          )}
        </ChartCard>
      </div>

      {/* Trend Chart */}
      <ChartCard title={`Ticket Trendi — Son ${days} Gün`}>
        {loading ? (
          <Skeleton h={260} />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.trendData ?? []} barSize={days > 30 ? 20 : 12} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:[&_line]:stroke-gray-800" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
              <Bar dataKey="count" name="Ticket" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Bottom Row: Kullanıcı Performance + Hourly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Kullanıcı Performansı">
          {loading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.agentPerf ?? []} layout="vertical" barSize={10} margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:[&_line]:stroke-gray-800" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
                <Bar dataKey="resolved" name="Çözülen" fill="#10b981" radius={[0, 6, 6, 0]} />
                <Bar dataKey="total" name="Toplam" fill="#6366f1" radius={[0, 6, 6, 0]} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Saatlik Yoğunluk">
          {loading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={(data?.hourlyData ?? []).filter((_, i) => i % 2 === 0)} barSize={10} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:[&_line]:stroke-gray-800" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(245,158,11,0.08)" }} />
                <Bar dataKey="count" name="Ticket" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Kullanıcı Table */}
      {(data?.agentPerf?.length ?? 0) > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-200">Kullanıcı Özet Tablosu</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900">
                  {["Kullanıcı", "Toplam Ticket", "Çözülen", "Çözüm Oranı", "Performans"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                {data?.agentPerf.map((a, i) => {
                  const pct = a.total > 0 ? Math.round((a.resolved / a.total) * 100) : 0;
                  return (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-800 dark:text-gray-200">{a.name}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-gray-400">{a.total}</td>
                      <td className="px-5 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">{a.resolved}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pct >= 70 ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : pct >= 40 ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300"}`}>
                          %{pct}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-400 dark:text-gray-600 w-8">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Proje Raporu ─────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-indigo-500 to-violet-600" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">Proje Raporu</h2>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Toplam Proje",   value: projStats?.total ?? "—",        color: "indigo" },
            { label: "Devam Ediyor",   value: projStats?.devamEdiyor ?? "—",  color: "indigo" },
            { label: "Tamamlandı",     value: projStats?.tamamlandi ?? "—",   color: "emerald" },
            { label: "Beklemede",      value: projStats?.beklemede ?? "—",    color: "amber" },
            { label: "Ort. İlerleme",  value: projStats ? `%${projStats.avgProgress}` : "—", color: "rose" },
          ].map(kpi => (
            <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} color={kpi.color} />
          ))}
        </div>

        {/* Recent Projects Table */}
        {(projStats?.recentProjects?.length ?? 0) > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-200">Son Projeler</h3>
              <a href="/projeler" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium transition-colors">Tümünü gör →</a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900">
                    {["Proje Adı", "Durum", "Üye", "İlerleme"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                  {projStats?.recentProjects.map(p => {
                    const statusColors: Record<string, string> = {
                      "Devam Ediyor": "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300",
                      "Tamamlandı":   "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300",
                      "Beklemede":    "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300",
                      "İptal":        "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300",
                    };
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-5 py-3 font-semibold text-slate-800 dark:text-gray-200">
                          <a href={`/projeler/${p.id}`} className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{p.name}</a>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColors[p.status] ?? "bg-slate-100 text-slate-500"}`}>{p.status}</span>
                        </td>
                        <td className="px-5 py-3 text-slate-500 dark:text-gray-400">{p.memberCount} üye</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden min-w-[60px]">
                              <div className={`h-full rounded-full transition-all ${p.progress === 100 ? "bg-emerald-500" : "bg-indigo-500"}`} style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-xs text-slate-400 dark:text-gray-600 w-8">{p.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {projStats?.total === 0 && (
          <div className="py-12 text-center text-slate-400 dark:text-gray-600 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl">
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm font-medium">Henüz proje yok</p>
          </div>
        )}
      </div>
    </div>
  );
}
