"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import UserAvatar from "@/components/UserAvatar";
import { PriorityBadge } from "@/components/StatusBadge";

interface User   { id: number; name: string; color: string; role: string; }
interface Ticket { id: number; subject: string; body: string; fromEmail: string; fromName: string | null; category: string; priority: string; receivedAt: string; }
interface Attachment { url: string; name: string; size: number; type: string; }
interface Reply { id: number; body: string; isInternal: boolean; createdAt: string; user: { name: string; color: string } | null; attachments: Attachment[]; }

function ReplyPanel({ ticketId }: { ticketId: number }) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/tickets/${ticketId}/replies`)
      .then(r => r.ok ? r.json() : [])
      .then(setReplies);
  }, [ticketId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [replies]);

  if (replies.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-800">
      <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-3">Yanıtlar ({replies.length})</p>
      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {replies.map(r => (
          <div key={r.id} className={`flex gap-3 p-3 rounded-xl text-sm ${r.isInternal ? "bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20" : "bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-700/50"}`}>
            <div className="shrink-0 mt-0.5">
              {r.user ? (
                <UserAvatar name={r.user.name} color={r.user.color} size="sm" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold">M</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-slate-700 dark:text-gray-300 text-xs">{r.user?.name ?? "Müşteri"}</span>
                {r.isInternal && <span className="text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-md font-medium">İç Not</span>}
                <span className="text-[11px] text-slate-400 dark:text-gray-600 ml-auto">
                  {new Date(r.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {r.body && <p className="text-slate-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{r.body}</p>}
              {r.attachments?.map((att, i) =>
                att.type.startsWith("image/") ? (
                  <a key={i} href={att.url} target="_blank" rel="noopener noreferrer">
                    <img src={att.url} alt={att.name} className="max-h-32 rounded-xl border border-slate-200 dark:border-gray-700 mt-1.5 object-contain" />
                  </a>
                ) : (
                  <div key={i} className="flex items-center gap-1.5 mt-1.5 text-xs bg-slate-100 dark:bg-gray-700 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-gray-300">
                    <span>📄</span>
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate max-w-[180px] hover:underline">{att.name}</a>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const CATEGORY_OPTIONS = ["Genel", "Teknik Destek", "Fatura", "Öneri", "Şikayet"];

export default function HavuzPage() {
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [users, setUsers]       = useState<User[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [search, setSearch]     = useState("");
  const [catFilter, setCatFilter] = useState("Tümü");
  const [isAdmin, setIsAdmin]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    const [tRes, uRes, meRes] = await Promise.all([
      fetch("/api/tickets").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()),
    ]);
    setTickets((tRes as (Ticket & { assigneeId: number | null })[]).filter(t => !t.assigneeId));
    setUsers(uRes);
    setIsAdmin(meRes?.isAdmin === true);
  }, []);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 15000); return () => clearInterval(t); }, [fetchAll]);

  const deleteTicket = async (ticketId: number) => {
    setDeleting(true);
    await fetch(`/api/tickets/${ticketId}`, { method: "DELETE" });
    setDeleting(false);
    setDeleteTarget(null);
    fetchAll();
  };

  const assign = async (ticketId: number, userId: number) => {
    setAssigning(true);
    await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assigneeId: userId, status: "İnceleniyor" }),
    });
    setAssigning(false);
    setSelected(null);
    fetchAll();
  };

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    return (
      (!q || t.subject.toLowerCase().includes(q) || t.fromEmail.toLowerCase().includes(q) || (t.fromName ?? "").toLowerCase().includes(q)) &&
      (catFilter === "Tümü" || t.category === catFilter)
    );
  });

  return (
    <div className="p-4 md:p-8 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Havuz</h1>
          <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">Atama bekleyen mailler</p>
        </div>
        {tickets.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-3 py-1.5 rounded-xl">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-red-600 dark:text-red-400">{tickets.length} atanmamış</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none space-y-3">
        <input
          placeholder="Konu, e-posta veya isim ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
        />
        <div className="flex flex-wrap gap-1">
          {["Tümü", ...CATEGORY_OPTIONS].map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${catFilter === c ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-gray-600">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-3xl mb-4">📭</div>
          <p className="text-base font-semibold text-slate-700 dark:text-gray-400">Havuz boş</p>
          <p className="text-sm mt-1">Atanmamış ticket bulunmuyor</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => (
            <div key={t.id} className={`bg-white dark:bg-gray-900 border rounded-2xl shadow-sm dark:shadow-none transition-all ${expanded === t.id ? "border-indigo-300 dark:border-indigo-600/40" : "border-slate-200 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-gray-700 hover:shadow-md dark:hover:shadow-none"}`}>
              <div className="p-4 md:p-5 cursor-pointer" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm shrink-0">
                    {(t.fromName || t.fromEmail)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 dark:text-gray-100">{t.subject}</p>
                        <p className="text-sm text-slate-400 dark:text-gray-500 mt-0.5 truncate">{t.fromName || t.fromEmail}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <PriorityBadge priority={t.priority} />
                        <span className="text-xs text-slate-400 dark:text-gray-600 whitespace-nowrap">
                          {new Date(t.receivedAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    {t.body && expanded !== t.id && (
                      <p className="text-sm text-slate-500 dark:text-gray-500 mt-2 line-clamp-2">{t.body}</p>
                    )}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <span className="text-xs bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 px-2 py-0.5 rounded-md">{t.category}</span>
                      <span className="text-xs text-slate-300 dark:text-gray-600 font-mono">#{t.id}</span>
                      <span className="text-xs text-slate-300 dark:text-gray-600 ml-auto">{expanded === t.id ? "▲" : "▼"}</span>
                      {isAdmin && (
                        <button onClick={e => { e.stopPropagation(); setDeleteTarget(t); }}
                          className="px-3 py-1.5 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-xl transition-colors border border-red-200 dark:border-red-500/20">
                          Sil
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); setSelected(t); }}
                        className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-600/20">
                        Ata
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {expanded === t.id && (
                <div className="px-4 md:px-5 pb-5 border-t border-slate-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Mail İçeriği</p>
                    <p className="text-sm text-slate-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-700/50 rounded-xl px-4 py-3">
                      {t.body || "(İçerik yok)"}
                    </p>
                  </div>
                  <ReplyPanel ticketId={t.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-900 dark:text-gray-100 mb-1">Ticketı Sil</h2>
            <p className="text-sm text-slate-500 dark:text-gray-500 mb-5">#{deleteTarget.id} — <span className="font-medium">{deleteTarget.subject}</span> silinecek. Bu işlem geri alınamaz.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 text-sm text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium">İptal</button>
              <button onClick={() => deleteTicket(deleteTarget.id)} disabled={deleting}
                className="flex-1 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors font-semibold disabled:opacity-50">
                {deleting ? "Siliniyor..." : "Evet, Sil"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-bold text-slate-900 dark:text-gray-100 mb-1">Ticket Ata</h2>
            <p className="text-sm text-slate-500 dark:text-gray-500 mb-5 truncate">#{selected.id} — {selected.subject}</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {users.map(u => (
                <button key={u.id} onClick={() => assign(selected.id, u.id)} disabled={assigning}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 border border-slate-200 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-gray-700 transition-all text-left disabled:opacity-50">
                  <UserAvatar name={u.name} color={u.color} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-gray-200">{u.name}</p>
                    <p className="text-xs text-slate-400 dark:text-gray-500">{u.role}</p>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setSelected(null)} className="w-full mt-3 py-2 text-sm text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors">İptal</button>
          </div>
        </div>
      )}
    </div>
  );
}
