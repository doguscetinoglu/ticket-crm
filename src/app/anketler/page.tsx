"use client";

import { useEffect, useState } from "react";

const Q_LABELS = [
  "Genel Performans",
  "Çözüm Hızı",
  "Çözüm Memnuniyeti",
  "İletişim",
  "Tavsiye Eder mi",
];

interface SurveyResponse {
  id: number;
  q1: number; q2: number; q3: number; q4: number; q5: number;
  comment: string | null;
  submittedAt: string;
}

interface Survey {
  id: number;
  token: string;
  sentAt: string;
  ticket: { id: number; subject: string; fromEmail: string; fromName: string | null };
  response: SurveyResponse | null;
}

function Stars({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < Math.round(value) ? "text-amber-400" : "text-slate-200 dark:text-gray-700"}`}
          fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-600 dark:text-gray-300">{value.toFixed(1)}</span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 5) * 100;
  const color = value >= 4 ? "#10b981" : value >= 3 ? "#f59e0b" : "#ef4444";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-gray-500 font-medium">{label}</span>
        <span className="font-bold" style={{ color }}>{value.toFixed(1)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-gray-800 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function AnketlerPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Survey | null>(null);
  const [filter, setFilter] = useState<"tumu" | "yanitlandi" | "bekliyor">("tumu");

  useEffect(() => {
    fetch("/api/surveys")
      .then((r) => r.json())
      .then((d) => { setSurveys(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const responded = surveys.filter((s) => s.response);
  const pending = surveys.filter((s) => !s.response);
  const responseRate = surveys.length ? Math.round((responded.length / surveys.length) * 100) : 0;

  const avgScore = (key: keyof SurveyResponse) => {
    const vals = responded.map((s) => s.response![key] as number);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  };
  const overallAvg = responded.length
    ? (["q1","q2","q3","q4","q5"] as const).reduce((sum, k) => sum + avgScore(k), 0) / 5
    : 0;

  const filtered = surveys.filter((s) =>
    filter === "tumu" ? true : filter === "yanitlandi" ? !!s.response : !s.response
  );

  const scoreColor = (v: number) => v >= 4 ? "text-emerald-500" : v >= 3 ? "text-amber-500" : "text-red-500";
  const scoreBg   = (v: number) => v >= 4 ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : v >= 3 ? "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20";

  return (
    <div className="p-4 md:p-7 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Müşteri Anketleri</h1>
        <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">Kapatılan biletler için gönderilen memnuniyet anketleri</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Toplam Anket", value: surveys.length, sub: "gönderildi", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
          { label: "Yanıt Oranı",  value: `%${responseRate}`, sub: `${responded.length} yanıt`, color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10" },
          { label: "Ortalama Puan", value: responded.length ? overallAvg.toFixed(1) : "—", sub: "/ 5.0", color: overallAvg >= 4 ? "text-emerald-600 dark:text-emerald-400" : overallAvg >= 3 ? "text-amber-600 dark:text-amber-400" : "text-red-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Bekleyen",     value: pending.length, sub: "yanıt bekleniyor", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
        ].map((k) => (
          <div key={k.label} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-2">{k.label}</p>
            <p className={`text-3xl font-black mb-0.5 ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-400 dark:text-gray-600">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Score breakdown */}
      {responded.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm dark:shadow-none">
          <h3 className="text-sm font-bold text-slate-800 dark:text-gray-100 mb-4">Soru Bazlı Ortalama Puanlar</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {(["q1","q2","q3","q4","q5"] as const).map((k, i) => (
              <ScoreBar key={k} label={Q_LABELS[i]} value={avgScore(k)} />
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-gray-100">Anket Listesi</h3>
          <div className="flex gap-1">
            {(["tumu","yanitlandi","bekliyor"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-700"}`}>
                {f === "tumu" ? "Tümü" : f === "yanitlandi" ? "Yanıtlandı" : "Bekliyor"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 dark:text-gray-600">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-sm text-slate-400 dark:text-gray-600">Henüz anket yok</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900">
                  {["Bilet", "Gönderilme", "Durum", "Genel Puan", ""].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-gray-800/60">
                {filtered.map((s) => {
                  const avg = s.response
                    ? ((s.response.q1 + s.response.q2 + s.response.q3 + s.response.q4 + s.response.q5) / 5)
                    : null;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-gray-600 font-mono">#{s.ticket.id}</span>
                          <span className="text-sm font-medium text-slate-700 dark:text-gray-300 truncate max-w-[200px]">{s.ticket.subject}</span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-gray-600 mt-0.5">{s.ticket.fromEmail}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 dark:text-gray-500">
                        {new Date(s.sentAt).toLocaleDateString("tr-TR", { day:"2-digit", month:"short", year:"numeric" })}
                      </td>
                      <td className="px-5 py-3.5">
                        {s.response ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Yanıtlandı
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Bekliyor
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {avg !== null ? (
                          <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-sm font-bold ${scoreBg(avg)}`}>
                            <span className={scoreColor(avg)}>{avg.toFixed(1)}</span>
                            <Stars value={avg} />
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-gray-700 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {s.response && (
                          <button onClick={() => setSelected(s)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                            Detay
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto" onClick={() => setSelected(null)}>
          <div className="min-h-full flex items-center justify-center p-4 py-8">
            <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Modal header */}
              <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 dark:text-gray-600 font-mono">#{selected.ticket.id}</span>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-gray-100 truncate">{selected.ticket.subject}</h3>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-gray-600 mt-0.5">{selected.ticket.fromEmail}</p>
                </div>
                <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors ml-4">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {/* Scores */}
                {(["q1","q2","q3","q4","q5"] as const).map((k, i) => {
                  const val = selected.response![k];
                  return (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-gray-400">{Q_LABELS[i]}</span>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(j => (
                            <svg key={j} className={`w-4 h-4 ${j <= val ? "text-amber-400" : "text-slate-200 dark:text-gray-700"}`} fill="currentColor" viewBox="0 0 24 24">
                              <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                            </svg>
                          ))}
                        </div>
                        <span className={`text-sm font-bold ${scoreColor(val)}`}>{val}/5</span>
                      </div>
                    </div>
                  );
                })}

                {/* Overall */}
                <div className="pt-3 border-t border-slate-100 dark:border-gray-800">
                  {(() => {
                    const r = selected.response!;
                    const avg = (r.q1+r.q2+r.q3+r.q4+r.q5)/5;
                    return (
                      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${scoreBg(avg)}`}>
                        <span className="text-sm font-semibold text-slate-700 dark:text-gray-300">Genel Ortalama</span>
                        <div className="flex items-center gap-2">
                          <Stars value={avg} />
                          <span className={`text-lg font-black ${scoreColor(avg)}`}>{avg.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Comment */}
                {selected.response!.comment && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-2">Müşteri Yorumu</p>
                    <div className="bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-slate-600 dark:text-gray-400 leading-relaxed italic">
                      "{selected.response!.comment}"
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400 dark:text-gray-600 text-right">
                  {new Date(selected.response!.submittedAt).toLocaleString("tr-TR")} tarihinde dolduruldu
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
