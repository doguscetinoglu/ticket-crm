"use client";

import { useCallback, useEffect, useState } from "react";

interface Announcement {
  id: number; title: string; body: string; requireAck: boolean; createdAt: string;
  createdBy: { name: string };
}

export default function AnnouncementModal() {
  const [queue, setQueue] = useState<Announcement[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/duyurular/unread");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length) setQueue(data);
    } catch { /* sessizce geç */ }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000); // yeni duyuruları periyodik kontrol et
    return () => clearInterval(t);
  }, [load]);

  const current = queue[0];

  const dismiss = async (acknowledged: boolean) => {
    if (!current) return;
    setBusy(true);
    try {
      await fetch(`/api/duyurular/${current.id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acknowledged }),
      });
    } catch { /* yine de kuyruktan düş */ }
    setBusy(false);
    setQueue((q) => q.slice(1));
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 3.94c.09-.542.56-.94 1.11-.94h1.1c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.11v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.149-.894c-.07-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /></svg>
              Duyuru
            </span>
            {current.requireAck && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">Onay gerekli</span>
            )}
            {queue.length > 1 && (
              <span className="ml-auto text-xs text-slate-400 dark:text-gray-600">1 / {queue.length}</span>
            )}
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">{current.title}</h2>
          <p className="text-xs text-slate-400 dark:text-gray-600 mt-1">
            {current.createdBy.name} · {new Date(current.createdAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          <p className="text-sm text-slate-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{current.body}</p>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-800 flex justify-end gap-2">
          {current.requireAck ? (
            <button onClick={() => dismiss(true)} disabled={busy}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
              {busy ? "…" : "Okudum, anladım"}
            </button>
          ) : (
            <button onClick={() => dismiss(false)} disabled={busy}
              className="px-5 py-2.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 text-sm font-semibold rounded-xl transition-colors">
              {busy ? "…" : "Kapat"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
