"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import UserAvatar from "@/components/UserAvatar";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";

interface User { id: number; name: string; color: string; }
interface Customer { id: number; name: string | null; company: string | null; }
interface Attachment { url: string; name: string; size: number; type: string; }
interface Reply {
  id: number; body: string; isInternal: boolean; createdAt: string;
  user: { name: string; color: string } | null; attachments: Attachment[];
  workMinutes: number | null; solutionType: string | null; platform: string | null;
}
interface Ticket {
  id: number; subject: string; body: string; fromEmail: string; fromName: string | null;
  category: string; status: string; priority: string; receivedAt: string;
  solutionType: string | null; platform: string | null;
  assignee: User | null; assigneeId: number | null;
  customer: Customer | null; customerId: number | null;
}

const STATUSES    = ["Yeni", "İnceleniyor", "Yanıtlandı", "Kapalı"];
const ACTIVE_STATUSES = ["Yeni", "İnceleniyor", "Yanıtlandı"];
const CATEGORIES  = ["Genel", "Teknik Destek", "Fatura", "Öneri", "Şikayet"];
const PRIORITIES  = ["Düşük", "Normal", "Yüksek", "Kritik"];
const SOLUTION_TYPES = ["Uzak Masaüstü", "Telefon", "Yüz Yüze"];
const PLATFORMS      = ["Flow", "Tiger", "Database"];

const Btn = ({ active, color = "indigo", onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) => {
  const colors: Record<string, string> = {
    indigo: "bg-indigo-600 text-white",
    orange: "bg-orange-500 text-white",
    violet: "bg-violet-600 text-white",
    teal:   "bg-teal-600 text-white",
    gray:   "bg-slate-600 text-white",
  };
  return (
    <button onClick={onClick}
      className={`px-2.5 py-1 text-xs rounded-lg transition-all ${active ? colors[color] : "bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200"}`}>
      {children}
    </button>
  );
};

function formatBytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)}KB`;
  return `${(b / 1024 / 1024).toFixed(1)}MB`;
}

function ReplyPanel({ ticketId, ticket, onReplySent, patch }: {
  ticketId: number;
  ticket: Ticket;
  onReplySent: (isInternal: boolean) => void;
  patch: (id: number, data: object) => void;
}) {
  const [replies, setReplies] = useState<Reply[]>([]);
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [workMinutes, setWorkMinutes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [closeConfirm, setCloseConfirm] = useState(false);
  const [closeError, setCloseError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const prevCountRef = useRef(0);

  const fetchReplies = useCallback(async () => {
    const res = await fetch(`/api/tickets/${ticketId}/replies`);
    if (res.ok) setReplies(await res.json());
  }, [ticketId]);

  useEffect(() => { fetchReplies(); }, [fetchReplies]);
  useEffect(() => {
    if (replies.length > prevCountRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    prevCountRef.current = replies.length;
  }, [replies]);

  const removeFile = (i: number) => setFiles(f => f.filter((_, idx) => idx !== i));

  const deleteAttachment = async (replyId: number, atts: Attachment[], idx: number) => {
    const updated = atts.filter((_, i) => i !== idx);
    const res = await fetch(`/api/tickets/${ticketId}/replies/${replyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachments: updated }),
    });
    if (res.ok) fetchReplies();
  };

  const send = async () => {
    if (!body.trim() && files.length === 0) return;
    if (!workMinutes || Number(workMinutes) <= 0) {
      setError("Çalışma süresi girilmeden yanıt gönderilemez.");
      return;
    }
    setError("");
    setSending(true);

    const uploaded: Attachment[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) uploaded.push(await res.json());
    }

    await fetch(`/api/tickets/${ticketId}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body, isInternal, attachments: uploaded,
        workMinutes: Number(workMinutes),
      }),
    });
    setSending(false);
    setBody("");
    setWorkMinutes("");
    setFiles([]);
    fetchReplies();
    onReplySent(isInternal);
  };

  const handleCloseClick = () => {
    setCloseError("");
    if (!replies.some(r => (r.workMinutes ?? 0) > 0)) {
      setCloseError("Bileti kapatmadan önce çalışma süresi girilmiş bir yanıt eklenmelidir.");
      return;
    }
    setCloseConfirm(true);
  };

  const confirmClose = async () => {
    setCloseConfirm(false);
    await patch(ticket.id, { status: "Kapalı" });
  };

  return (
    <div className="border-t border-slate-100 dark:border-gray-800 mt-4 pt-4">
      <div className="flex items-center gap-3 mb-3">
        <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Yanıtlar ({replies.length})</p>
        {replies.some(r => r.workMinutes) && (() => {
          const total = replies.reduce((s, r) => s + (r.workMinutes ?? 0), 0);
          return <span className="text-xs font-semibold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md">
            Toplam: {total >= 60 ? `${Math.floor(total/60)}s ${total%60}dk` : `${total}dk`}
          </span>;
        })()}
      </div>

      {replies.length > 0 && (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto pr-1">
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
                  {r.workMinutes != null && (
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-md">{r.workMinutes} dk</span>
                  )}
                  {r.solutionType && (
                    <span className="text-[10px] bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-md">{r.solutionType}</span>
                  )}
                  {r.platform && (
                    <span className="text-[10px] bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 rounded-md">{r.platform}</span>
                  )}
                  <span className="text-[11px] text-slate-400 dark:text-gray-600 ml-auto">
                    {new Date(r.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                {r.body && <p className="text-slate-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">{r.body}</p>}
                {r.attachments?.map((att, i) => {
                  const delBtn = (
                    <button onClick={() => deleteAttachment(r.id, r.attachments, i)} title="Dosyayı kaldır"
                      className="ml-auto shrink-0 text-slate-300 dark:text-gray-600 hover:text-red-500 transition-colors text-base leading-none">×</button>
                  );
                  return att.type.startsWith("image/") ? (
                    <div key={i} className="relative inline-block mt-1.5 group">
                      <a href={att.url} target="_blank" rel="noopener noreferrer">
                        <img src={att.url} alt={att.name} className="max-h-40 rounded-xl border border-slate-200 dark:border-gray-700 object-contain" />
                      </a>
                      <button onClick={() => deleteAttachment(r.id, r.attachments, i)} title="Dosyayı kaldır"
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">×</button>
                    </div>
                  ) : (
                    <div key={i} className="flex items-center gap-1.5 mt-1.5 text-xs bg-slate-100 dark:bg-gray-700 rounded-lg px-2.5 py-1.5 text-slate-600 dark:text-gray-300">
                      <span>📄</span>
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate max-w-[180px] hover:underline">{att.name}</a>
                      <span className="shrink-0 text-slate-400 dark:text-gray-500">{formatBytes(att.size)}</span>
                      {delBtn}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="space-y-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder={isInternal ? "İç not ekle (müşteri görmez)..." : "Müşteriye yanıt yaz..."}
          rows={3}
          className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-none"
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }}
        />

        {/* Çalışma süresi */}
        <div className="w-40">
          <label className="text-[10px] font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider block mb-1">Çalışma Süresi (dk) *</label>
          <input
            type="number"
            min="1"
            value={workMinutes}
            onChange={e => setWorkMinutes(e.target.value)}
            placeholder="Dakika"
            className="w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* File previews */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative group">
                {f.type.startsWith("image/") ? (
                  <img src={URL.createObjectURL(f)} alt={f.name} className="h-12 w-12 object-cover rounded-lg border border-slate-200 dark:border-gray-700" />
                ) : (
                  <div className="h-12 w-12 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-0.5 px-1">
                    <span className="text-lg">📄</span>
                    <span className="text-[7px] text-slate-400 text-center leading-tight line-clamp-2">{f.name}</span>
                  </div>
                )}
                <button onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 dark:text-gray-500 select-none">
            <div onClick={() => setIsInternal(!isInternal)}
              className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${isInternal ? "bg-amber-500" : "bg-slate-200 dark:bg-gray-700"}`}>
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${isInternal ? "left-4" : "left-0.5"}`} />
            </div>
            İç Not
          </label>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1 text-xs text-slate-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            📎 {files.length > 0 ? `${files.length} dosya` : "Dosya ekle"}
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xlsx,.zip,.txt"
            className="hidden"
            onChange={e => { const picked = Array.from(e.target.files ?? []); setFiles(prev => [...prev, ...picked].slice(0, 5)); e.target.value = ""; }}
          />
          <button onClick={send}
            disabled={sending || (!body.trim() && files.length === 0)}
            className={`ml-auto px-4 py-1.5 text-xs font-semibold rounded-xl transition-all disabled:opacity-40 ${isInternal ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20"}`}>
            {sending ? "Gönderiliyor..." : isInternal ? "İç Not Ekle" : "Yanıtla"}
          </button>
        </div>
      </div>

      {ticket.status !== "Kapalı" && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-800 flex items-center gap-3">
          {closeError && <p className="text-xs text-red-500 flex-1">{closeError}</p>}
          <button onClick={handleCloseClick}
            className="ml-auto flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Ticket Kapat
          </button>
        </div>
      )}

      {closeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setCloseConfirm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-red-600 dark:text-red-400">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-gray-100">Ticket Kapat</h3>
                <p className="text-xs text-slate-500 dark:text-gray-500">#{ticket.id} · {ticket.subject}</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed">
              Bu bileti kapatmak istediğinizden emin misiniz? Müşteriye kapanma ve anket maili gönderilecektir.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setCloseConfirm(false)}
                className="px-4 py-2 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors">
                İptal
              </button>
              <button onClick={confirmClose}
                className="px-5 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition-all">
                Evet, Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditPanel({ t, users, customers, patch }: { t: Ticket; users: User[]; customers: Customer[]; patch: (id: number, data: object) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider mb-2">İçerik</p>
        <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">{t.body || "(İçerik yok)"}</p>
      </div>

      <div className="space-y-3" onClick={e => e.stopPropagation()}>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Durum</label>
          <div className="flex flex-wrap gap-1">
            {ACTIVE_STATUSES.map(s => <Btn key={s} active={t.status === s} color="indigo" onClick={() => patch(t.id, { status: s })}>{s}</Btn>)}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Öncelik</label>
          <div className="flex flex-wrap gap-1">
            {PRIORITIES.map(p => <Btn key={p} active={t.priority === p} color="orange" onClick={() => patch(t.id, { priority: p })}>{p}</Btn>)}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Kategori</label>
          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map(c => <Btn key={c} active={t.category === c} color="violet" onClick={() => patch(t.id, { category: c })}>{c}</Btn>)}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Çözüm Şekli</label>
          <div className="flex flex-wrap gap-1">
            <Btn active={!t.solutionType} color="gray" onClick={() => patch(t.id, { solutionType: "" })}>—</Btn>
            {SOLUTION_TYPES.map(s => <Btn key={s} active={t.solutionType === s} color="teal" onClick={() => patch(t.id, { solutionType: s })}>{s}</Btn>)}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Platform</label>
          <div className="flex flex-wrap gap-1">
            <Btn active={!t.platform} color="gray" onClick={() => patch(t.id, { platform: "" })}>—</Btn>
            {PLATFORMS.map(p => <Btn key={p} active={t.platform === p} color="violet" onClick={() => patch(t.id, { platform: p })}>{p}</Btn>)}
          </div>
        </div>
      </div>

      <div className="space-y-3" onClick={e => e.stopPropagation()}>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Atanan</label>
          <div className="flex flex-wrap gap-1">
            <Btn active={!t.assigneeId} color="gray" onClick={() => patch(t.id, { assigneeId: null })}>Havuz</Btn>
            {users.map(u => (
              <Btn key={u.id} active={t.assigneeId === u.id} color="indigo" onClick={() => patch(t.id, { assigneeId: u.id })}>
                {u.name.split(" ")[0]}
              </Btn>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1.5">Müşteri</label>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            <Btn active={!t.customerId} color="gray" onClick={() => patch(t.id, { customerId: null })}>Bağlama</Btn>
            {customers.map(c => (
              <Btn key={c.id} active={t.customerId === c.id} color="teal" onClick={() => patch(t.id, { customerId: c.id })}>
                {c.name || "(İsimsiz)"}{c.company ? ` · ${c.company}` : ""}
              </Btn>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface NewTicketForm {
  subject: string; body: string; fromEmail: string; fromName: string;
  category: string; priority: string; assigneeId: string; customerId: string;
}

function NewTicketModal({ users, customers, onClose, onCreated }: {
  users: User[]; customers: Customer[];
  onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState<NewTicketForm>({
    subject: "", body: "", fromEmail: "", fromName: "",
    category: "Genel", priority: "Normal", assigneeId: "", customerId: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k: keyof NewTicketForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.subject.trim() || !form.fromEmail.trim()) { setErr("Konu ve e-posta zorunludur."); return; }
    setSaving(true);
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: form.subject, body: form.body, fromEmail: form.fromEmail,
        fromName: form.fromName || null, category: form.category, priority: form.priority,
        assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
        customerId: form.customerId ? Number(form.customerId) : null,
      }),
    });
    setSaving(false);
    if (res.ok) { onCreated(); onClose(); }
    else { const d = await res.json(); setErr(d.error ?? "Hata oluştu."); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100">Yeni Ticket Oluştur</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 text-2xl leading-none">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1">Konu *</label>
            <input value={form.subject} onChange={e => set("subject", e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1">E-posta *</label>
            <input value={form.fromEmail} onChange={e => set("fromEmail", e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1">İsim</label>
            <input value={form.fromName} onChange={e => set("fromName", e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
          </div>
          <div className="col-span-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1">İçerik</label>
            <textarea value={form.body} onChange={e => set("body", e.target.value)} rows={3}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1">Kategori</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1">Öncelik</label>
            <select value={form.priority} onChange={e => set("priority", e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
              {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1">Atanan</label>
            <select value={form.assigneeId} onChange={e => set("assigneeId", e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
              <option value="">Havuz</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider block mb-1">Müşteri</label>
            <select value={form.customerId} onChange={e => set("customerId", e.target.value)}
              className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
              <option value="">Bağlama</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name || "(İsimsiz)"}{c.company ? ` · ${c.company}` : ""}</option>)}
            </select>
          </div>
        </div>

        {err && <p className="text-xs text-red-500">{err}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors">İptal</button>
          <button onClick={submit} disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all disabled:opacity-50">
            {saving ? "Oluşturuluyor..." : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface DesktopRowProps {
  t: Ticket;
  isExpanded: boolean;
  isUpdating: boolean;
  users: User[];
  customers: Customer[];
  onToggle: () => void;
  patch: (id: number, data: object) => void;
  onReplySent: (isInternal: boolean) => void;
}

function TicketDesktopRow({ t, isExpanded, isUpdating, users, customers, onToggle, patch, onReplySent }: DesktopRowProps) {
  return (
    <>
      <tr
        className={`hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer ${isUpdating ? "opacity-50" : ""} ${isExpanded ? "bg-slate-50 dark:bg-gray-800/20" : ""}`}
        onClick={onToggle}
      >
        <td className="px-4 py-3 text-slate-400 dark:text-gray-600 font-mono text-xs">#{t.id}</td>
        <td className="px-4 py-3 max-w-[160px]">
          <p className="text-slate-800 dark:text-gray-200 font-medium truncate">{t.subject}</p>
          <p className="text-slate-400 dark:text-gray-600 text-xs truncate">{t.fromEmail}</p>
        </td>
        <td className="px-4 py-3">
          {t.customer ? (
            <Link href={`/musteriler/${t.customer.id}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1.5 group">
              <div className="w-6 h-6 rounded-md bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0">
                {(t.customer.name || t.fromEmail)[0].toUpperCase()}
              </div>
              <p className="text-xs text-slate-600 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate transition-colors">{t.customer.name || "—"}</p>
            </Link>
          ) : <span className="text-xs text-slate-300 dark:text-gray-600 italic">—</span>}
        </td>
        <td className="px-4 py-3"><span className="text-xs bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 px-2 py-0.5 rounded-md">{t.category}</span></td>
        <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
        <td className="px-4 py-3">
          {t.assignee ? (
            <div className="flex items-center gap-1.5">
              <UserAvatar name={t.assignee.name} color={t.assignee.color} size="sm" />
              <span className="text-xs text-slate-500 dark:text-gray-400">{t.assignee.name.split(" ")[0]}</span>
            </div>
          ) : <span className="text-xs text-red-400/70">Havuzda</span>}
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 dark:text-gray-600 whitespace-nowrap">
          {new Date(t.receivedAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={8} className="px-5 py-5 bg-slate-50/60 dark:bg-gray-800/20 border-b border-slate-100 dark:border-gray-800">
            <EditPanel t={t} users={users} customers={customers} patch={patch} />
            <ReplyPanel ticketId={t.id} ticket={t} onReplySent={onReplySent} patch={patch} />
          </td>
        </tr>
      )}
    </>
  );
}

export default function TicketsPage() {
  const [tickets, setTickets]   = useState<Ticket[]>([]);
  const [users, setUsers]       = useState<User[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch]     = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [catFilter, setCatFilter] = useState("Tümü");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const [view, setView]         = useState<"aktif" | "kapali">("aktif");
  const [showNew, setShowNew]   = useState(false);

  const fetchAll = useCallback(async () => {
    const [tRes, uRes, cRes] = await Promise.all([
      fetch("/api/tickets").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
      fetch("/api/customers").then(r => r.json()),
    ]);
    setTickets(Array.isArray(tRes) ? tRes : []);
    setUsers(uRes);
    setCustomers(Array.isArray(cRes) ? cRes : []);
  }, []);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 15000); return () => clearInterval(t); }, [fetchAll]);

  const patch = async (id: number, data: object) => {
    setUpdating(id);
    // Optimistic update — no fetchAll to avoid TicketRow remount + scroll jump
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    await fetch(`/api/tickets/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setUpdating(null);
  };

  const activeTickets  = tickets.filter(t => t.status !== "Kapalı");
  const closedTickets  = tickets.filter(t => t.status === "Kapalı");
  const source         = view === "aktif" ? activeTickets : closedTickets;
  const activeStatuses = view === "aktif" ? ACTIVE_STATUSES : [];

  const filtered = source.filter(t => {
    const q = search.toLowerCase();
    return (
      (!q || t.subject.toLowerCase().includes(q) || t.fromEmail.toLowerCase().includes(q) || (t.fromName ?? "").toLowerCase().includes(q) || (t.customer?.name ?? "").toLowerCase().includes(q)) &&
      (statusFilter === "Tümü" || t.status === statusFilter) &&
      (catFilter === "Tümü" || t.category === catFilter)
    );
  });

  return (
    <>
    {showNew && <NewTicketModal users={users} customers={customers} onClose={() => setShowNew(false)} onCreated={fetchAll} />}
    <div className="p-4 md:p-7 space-y-5 animate-fade-in">

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">
            {view === "aktif" ? "Aktif Biletler" : "Kapatılan Biletler"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-gray-500 mt-0.5">{filtered.length} / {source.length} ticket</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View tabs */}
          <div className="flex bg-slate-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
            <button onClick={() => { setView("aktif"); setStatusFilter("Tümü"); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === "aktif" ? "bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 shadow-sm" : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"}`}>
              Aktif
              {activeTickets.length > 0 && <span className="ml-1.5 bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{activeTickets.length}</span>}
            </button>
            <button onClick={() => { setView("kapali"); setStatusFilter("Tümü"); }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${view === "kapali" ? "bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 shadow-sm" : "text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"}`}>
              Kapatılan
              {closedTickets.length > 0 && <span className="ml-1.5 bg-slate-400 dark:bg-gray-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{closedTickets.length}</span>}
            </button>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm transition-all">
            + Yeni Ticket
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm dark:shadow-none space-y-3">
        <input
          placeholder="Konu, e-posta, isim veya müşteri ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
        />
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          {view === "aktif" && (
            <div className="flex flex-wrap gap-1">
              {["Tümü", ...activeStatuses].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter === s ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"}`}>
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {["Tümü", ...CATEGORIES].map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${catFilter === c ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl py-16 text-center text-slate-400 dark:text-gray-600">Ticket bulunamadı</div>
        )}
        {filtered.map(t => {
          const isExp = expanded === t.id;
          return (
            <div key={t.id} className={`bg-white dark:bg-gray-900 border rounded-2xl shadow-sm dark:shadow-none transition-all ${isExp ? "border-indigo-300 dark:border-indigo-600/40" : "border-slate-200 dark:border-gray-800"} ${updating === t.id ? "opacity-50" : ""}`}>
              <div className="p-4 cursor-pointer" onClick={() => setExpanded(isExp ? null : t.id)}>
                <div className="flex justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-gray-100 text-sm leading-snug">{t.subject}</p>
                    <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5 truncate">{t.fromEmail}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                  <span className="text-xs bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 px-2 py-0.5 rounded-md">{t.category}</span>
                  <span className="text-xs text-slate-400 dark:text-gray-600 ml-auto">
                    {new Date(t.receivedAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              {isExp && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                  <EditPanel t={t} users={users} customers={customers} patch={patch} />
                  <ReplyPanel ticketId={t.id} ticket={t} patch={patch} onReplySent={(isInternal) => { if (!isInternal) setTickets(prev => prev.map(tk => tk.id === t.id ? { ...tk, status: "Yanıtlandı" } : tk)); }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900">
              {["#", "Konu", "Müşteri", "Kategori", "Öncelik", "Durum", "Atanan", "Tarih"].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-16 text-slate-400 dark:text-gray-600">Ticket bulunamadı</td></tr>
            )}
            {filtered.map(t => (
              <TicketDesktopRow
                key={t.id}
                t={t}
                isExpanded={expanded === t.id}
                isUpdating={updating === t.id}
                users={users}
                customers={customers}
                onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
                patch={patch}
                onReplySent={(isInternal) => { if (!isInternal) setTickets(prev => prev.map(tk => tk.id === t.id ? { ...tk, status: "Yanıtlandı" } : tk)); }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
}
