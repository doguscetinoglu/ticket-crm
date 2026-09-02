"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface User { id: number; name: string; color: string; role: string; }
interface Customer { id: number; name: string | null; company: string | null; email: string; }
interface Task { id: number; title: string; description: string | null; status: string; assigneeId: number | null; assigneeType: string | null; dueDate: string | null; completedAt: string | null; attachments: string | null; }
interface Step { id: number; name: string; order: number; status: string; tasks: Task[]; attachments: string | null; }
interface Member { user: User; }
interface Project {
  id: number; name: string; description: string | null; status: string; createdAt: string;
  customer: Customer | null; members: Member[]; steps: Step[];
}
interface Log { id: number; userName: string | null; action: string; createdAt: string; }
interface Attachment { url: string; name: string; size: number; type: string; }
interface Message { id: number; userName: string | null; userType: string; body: string; attachments: string; createdAt: string; }

function parseAttachments(raw: string | null | undefined): Attachment[] {
  try { const v = JSON.parse(raw || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

/** Adım/görev altındaki görsel ve dosya şeridi. Dokümantasyon bu eklerden besleniyor. */
function AttachmentStrip({ items, canEdit, uploading, onAdd, onRemove, compact }: {
  items: Attachment[];
  canEdit: boolean;
  uploading: boolean;
  onAdd: (files: FileList) => void;
  onRemove: (index: number) => void;
  compact?: boolean;
}) {
  if (!items.length && !canEdit) return null;
  const size = compact ? "h-14 w-14" : "h-20 w-20";

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      {items.map((a, i) => (
        <div key={i} className="relative group/att">
          <a href={a.url} target="_blank" rel="noopener noreferrer" title={a.name}>
            {a.type?.startsWith("image/") ? (
              <img src={a.url} alt={a.name}
                className={`${size} object-cover rounded-lg border border-slate-200 dark:border-gray-700`} />
            ) : (
              <div className={`${size} rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex flex-col items-center justify-center px-1`}>
                <span className="text-lg">📄</span>
                <span className="text-[8px] text-slate-500 dark:text-gray-500 truncate w-full text-center">{a.name}</span>
              </div>
            )}
          </a>
          {canEdit && (
            <button onClick={() => onRemove(i)} title="Kaldır"
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[11px] leading-none opacity-0 group-hover/att:opacity-100 focus:opacity-100 transition-opacity">
              ×
            </button>
          )}
        </div>
      ))}

      {canEdit && (
        <label className={`${size} rounded-lg border-2 border-dashed border-slate-200 dark:border-gray-700 flex flex-col items-center justify-center gap-0.5 cursor-pointer text-slate-400 dark:text-gray-600 hover:border-indigo-400 hover:text-indigo-500 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
          {uploading
            ? <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            : <><span className="text-base leading-none">📷</span><span className="text-[9px] font-medium">Ekle</span></>}
          <input type="file" accept="image/*,application/pdf" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) onAdd(e.target.files); e.target.value = ""; }} />
        </label>
      )}
    </div>
  );
}

type WhoWaiting = "customer" | "team" | "both" | "pending" | "syncing";
interface WaitingInfo { step: string; who: WhoWaiting; label: string; }

function getWaiting(steps: Step[], members: Member[] = []): WaitingInfo | null {
  if (!steps.length) return null;
  const inProgress = steps.find(s => s.status === "Devam Ediyor");
  const next       = steps.find(s => s.status === "Beklemede");
  const active     = inProgress ?? next;
  if (!active) return null;
  const pending = active.tasks.filter(t => t.status !== "Tamamlandı");
  const custP = pending.filter(t => t.assigneeType === "customer");
  const teamP = pending.filter(t => t.assigneeType === "user");
  if (custP.length > 0 && teamP.length === 0)
    return { step: active.name, who: "customer", label: "Müşteri onayı bekleniyor" };
  if (custP.length > 0 && teamP.length > 0)
    return { step: active.name, who: "both", label: "Müşteri onayı bekleniyor" };
  if (teamP.length > 0 && active.status === "Devam Ediyor") {
    const names = [...new Set(teamP.filter(t => t.assigneeId).map(t => members.find(m => m.user.id === t.assigneeId)?.user.name ?? "Ekip"))];
    const label = names.length ? (names.length <= 2 ? names.join(", ") : `${names[0]} +${names.length - 1}`) : "Ekip çalışıyor";
    return { step: active.name, who: "team", label };
  }
  if (!pending.length && active.status === "Devam Ediyor")
    return { step: active.name, who: "syncing", label: "Adım tamamlanıyor" };
  return null;
}

const STATUS_COLORS: Record<string, string> = {
  "Beklemede":   "bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400",
  "Devam Ediyor":"bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20",
  "Tamamlandı":  "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20",
};

const AVATAR_BG: Record<string, string> = {
  indigo:"bg-indigo-500", violet:"bg-violet-500", teal:"bg-teal-500",
  orange:"bg-orange-500", rose:"bg-rose-500", sky:"bg-sky-500",
};

function calcProgress(steps: Step[]) {
  const all = steps.flatMap(s => s.tasks);
  if (!all.length) {
    if (!steps.length) return 0;
    return Math.round((steps.filter(s => s.status === "Tamamlandı").length / steps.length) * 100);
  }
  return Math.round((all.filter(t => t.status === "Tamamlandı").length / all.length) * 100);
}

export default function ProjeDetayPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [me, setMe] = useState<{ id: number; type: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [docModal, setDocModal] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [customers, setCustomers] = useState<{ id: number; name: string | null }[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tab, setTab] = useState<"tree" | "log" | "chat">("tree");
  const [msgBody, setMsgBody] = useState("");
  const [msgFiles, setMsgFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [addStepName, setAddStepName] = useState("");
  const [addingStep, setAddingStep] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [taskForm, setTaskForm] = useState<{ stepId: number | null; title: string; assigneeId: string; assigneeType: string; dueDate: string }>({
    stepId: null, title: "", assigneeId: "", assigneeType: "user", dueDate: "",
  });
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);
  const isAdmin = me?.type === "admin";
  // Ekip üyeleri de görsel ekleyebilir; müşteri portalı oturumları ekleyemez.
  const canAttach = me?.type === "admin" || me?.type === "agent";

  const fetchProject = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}`);
    if (r.ok) setProject(await r.json());
  }, [id]);

  const fetchLogs = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}/logs`);
    if (r.ok) setLogs(await r.json());
  }, [id]);

  const fetchMessages = useCallback(async () => {
    const r = await fetch(`/api/projects/${id}/messages`);
    if (r.ok) setMessages(await r.json());
  }, [id]);

  useEffect(() => {
    fetchProject();
    fetchLogs();
    fetchMessages();
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(setMe);
    fetch("/api/users").then(r => r.json()).then(setUsers);
    fetch("/api/customers").then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []));
  }, [fetchProject, fetchLogs, fetchMessages]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Adım/görev ekleri -------------------------------------------------
  const saveAttachments = async (kind: "step" | "task", entityId: number, list: Attachment[]) => {
    const url = kind === "step"
      ? `/api/projects/${id}/steps/${entityId}`
      : `/api/projects/${id}/tasks/${entityId}`;
    await fetch(url, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attachments: list }),
    });
    fetchProject(); fetchLogs();
  };

  const addAttachments = async (kind: "step" | "task", entityId: number, current: Attachment[], files: FileList) => {
    setUploadingKey(`${kind}-${entityId}`);
    const next = [...current];
    for (const file of Array.from(files)) {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) next.push(await res.json());
      else alert((await res.json().catch(() => ({}))).error ?? "Dosya yüklenemedi");
    }
    await saveAttachments(kind, entityId, next);
    setUploadingKey(null);
  };

  const removeAttachment = async (kind: "step" | "task", entityId: number, current: Attachment[], index: number) => {
    if (!confirm(`"${current[index]?.name}" kaldırılsın mı?`)) return;
    await saveAttachments(kind, entityId, current.filter((_, i) => i !== index));
  };

  const updateTaskStatus = async (taskId: number, status: string) => {
    await fetch(`/api/projects/${id}/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchProject(); fetchLogs();
  };

  const addStep = async () => {
    if (!addStepName.trim()) return;
    setAddingStep(true);
    await fetch(`/api/projects/${id}/steps`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addStepName }),
    });
    setAddStepName(""); setAddingStep(false);
    fetchProject(); fetchLogs();
  };

  const addTask = async () => {
    if (!taskForm.title.trim() || !taskForm.stepId) return;
    await fetch(`/api/projects/${id}/tasks/${taskForm.stepId}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskForm.title,
        assigneeId: taskForm.assigneeId ? Number(taskForm.assigneeId) : null,
        assigneeType: taskForm.assigneeType || null,
        dueDate: taskForm.dueDate || null,
      }),
    });
    setTaskForm({ stepId: null, title: "", assigneeId: "", assigneeType: "user", dueDate: "" });
    fetchProject(); fetchLogs();
  };

  const sendMessage = async () => {
    if (!msgBody.trim() && msgFiles.length === 0) return;
    setSending(true);
    const uploaded: Attachment[] = [];
    for (const file of msgFiles) {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (res.ok) uploaded.push(await res.json());
    }
    await fetch(`/api/projects/${id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: msgBody, attachments: uploaded }),
    });
    setMsgBody(""); setMsgFiles([]); setSending(false);
    fetchMessages();
  };

  const exportFile = (type: string) => {
    window.open(`/api/projects/${id}/export?type=${type}`, "_blank");
  };

  // Projeyi sil — sadece admin; adımlar, görevler, mesajlar ve loglar da silinir.
  const deleteProject = async () => {
    if (!project) return;
    const taskCount = project.steps.flatMap(s => s.tasks).length;
    const ok = confirm(
      `"${project.name}" projesi kalıcı olarak silinecek.\n\n` +
      `${project.steps.length} adım, ${taskCount} görev, tüm mesajlar ve hareket kayıtları da silinir.\n` +
      `Bu işlem geri alınamaz.\n\nDevam edilsin mi?`
    );
    if (!ok) return;
    setDeleting(true);
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { alert("Proje silinemedi."); return; }
    router.push("/projeler");
    router.refresh();
  };

  if (!project) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const progress = calcProgress(project.steps);
  const totalTasks = project.steps.flatMap(s => s.tasks).length;
  const doneTasks = project.steps.flatMap(s => s.tasks).filter(t => t.status === "Tamamlandı").length;
  const waiting = project.status !== "Tamamlandı" && project.status !== "İptal"
    ? getWaiting(project.steps, project.members) : null;

  return (
    <div className="p-4 md:p-7 space-y-5 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 dark:text-gray-600">
        <Link href="/projeler" className="hover:text-indigo-600 transition-colors">Projeler</Link>
        <span>/</span>
        <span className="text-slate-700 dark:text-gray-300 font-medium truncate">{project.name}</span>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-600/20">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-2xl font-bold">{project.name}</h1>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${project.status === "Tamamlandı" ? "bg-emerald-400/20 text-emerald-200" : "bg-white/20 text-white"}`}>
                {project.status}
              </span>
            </div>
            {project.description && <p className="text-indigo-200 text-sm mb-3">{project.description}</p>}
            <div className="flex flex-wrap gap-4 text-sm">
              {project.customer && (
                <span className="flex items-center gap-1.5 text-indigo-200">
                  <span className="text-base">🏢</span> {project.customer.name}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-indigo-200">
                <span className="text-base">📅</span> {new Date(project.createdAt).toLocaleDateString("tr-TR")}
              </span>
              <span className="flex items-center gap-1.5 text-indigo-200">
                <span className="text-base">✅</span> {doneTasks}/{totalTasks} görev
              </span>
            </div>
          </div>

          {/* Progress Ring */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
                <circle cx="40" cy="40" r="32" fill="none" stroke="white" strokeWidth="8"
                  strokeDasharray={`${2 * Math.PI * 32}`}
                  strokeDashoffset={`${2 * Math.PI * 32 * (1 - progress / 100)}`}
                  strokeLinecap="round" className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{progress}%</span>
              </div>
            </div>
            <span className="text-xs text-indigo-200 mt-1">İlerleme</span>
          </div>
        </div>

        {/* Who is waiting */}
        {waiting && (
          <div className="mt-3 pt-3 border-t border-white/10">
            {(() => {
              const cfg: Record<WhoWaiting, { dot: string; label: string; bg: string }> = {
                customer: { dot: "bg-amber-400", label: waiting.label, bg: "bg-amber-400/20 text-amber-200 border-amber-300/30" },
                team:     { dot: "bg-white",     label: waiting.label, bg: "bg-white/15 text-white border-white/20" },
                both:     { dot: "bg-violet-300",label: waiting.label, bg: "bg-violet-400/20 text-violet-200 border-violet-300/30" },
                pending:  { dot: "bg-white/40",  label: waiting.label, bg: "bg-white/10 text-indigo-200 border-white/10" },
                syncing:  { dot: "bg-emerald-400",label: waiting.label, bg: "bg-emerald-400/20 text-emerald-200 border-emerald-300/30" },
              };
              const c = cfg[waiting.who];
              const pulse = waiting.who === "customer" || waiting.who === "team" || waiting.who === "both";
              return (
                <div className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold ${c.bg}`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.dot} ${pulse ? "animate-pulse" : ""}`} />
                  <span>Şu an: {c.label}</span>
                  <span className="opacity-60 font-normal">— {waiting.step} adımı</span>
                </div>
              );
            })()}
          </div>
        )}

        {/* Members */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
          <span className="text-xs text-indigo-300">Ekip:</span>
          <div className="flex -space-x-1.5">
            {project.members.map(m => (
              <div key={m.user.id} title={m.user.name}
                className={`w-7 h-7 rounded-full border-2 border-indigo-600 flex items-center justify-center text-xs font-bold text-white ${AVATAR_BG[m.user.color] ?? "bg-slate-500"}`}>
                {m.user.name[0]}
              </div>
            ))}
          </div>

          {/* Export */}
          <div className="ml-auto flex gap-2">
            <button onClick={() => exportFile("excel")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl transition-all">
              📊 Excel
            </button>
            <button onClick={() => exportFile("txt")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl transition-all">
              📄 Rapor
            </button>
            <button onClick={() => setDocModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white text-xs font-semibold rounded-xl transition-all">
              📘 Doküman
            </button>
            {isAdmin && (
              <button onClick={deleteProject} disabled={deleting}
                title="Projeyi sil"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/25 hover:bg-red-500/40 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all">
                🗑 {deleting ? "Siliniyor..." : "Sil"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Toplam Adım", value: project.steps.length, icon: "📋", color: "text-indigo-600 dark:text-indigo-400" },
          { label: "Tamamlanan Adım", value: project.steps.filter(s => s.status === "Tamamlandı").length, icon: "✅", color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Toplam Görev", value: totalTasks, icon: "📌", color: "text-violet-600 dark:text-violet-400" },
          { label: "Tamamlanan Görev", value: doneTasks, icon: "🎯", color: "text-teal-600 dark:text-teal-400" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm">
            <p className="text-xs text-slate-400 dark:text-gray-600 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <span className="text-lg">{s.icon}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {(["tree", "log", "chat"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${tab === t ? "bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 shadow-sm" : "text-slate-500 dark:text-gray-500 hover:text-slate-700"}`}>
            {t === "tree" ? "🌳 Proje Ağacı" : t === "log" ? "📋 Aktivite" : "💬 Sohbet"}
          </button>
        ))}
      </div>

      {/* Tree Tab */}
      {tab === "tree" && (
        <div className="space-y-3">
          {project.steps.map((step, si) => {
            const isExp = expandedSteps.has(step.id);
            const doneCount = step.tasks.filter(t => t.status === "Tamamlandı").length;
            const stepProgress = step.tasks.length > 0 ? Math.round((doneCount / step.tasks.length) * 100) : (step.status === "Tamamlandı" ? 100 : 0);

            return (
              <div key={step.id} className={`bg-white dark:bg-gray-900 border rounded-2xl shadow-sm overflow-hidden transition-all ${step.status === "Tamamlandı" ? "border-emerald-200 dark:border-emerald-500/20" : step.status === "Devam Ediyor" ? "border-blue-200 dark:border-blue-500/20" : "border-slate-200 dark:border-gray-800"}`}>
                {/* Step Header */}
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpandedSteps(prev => { const n = new Set(prev); n.has(step.id) ? n.delete(step.id) : n.add(step.id); return n; })}>
                  {/* Step number */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${step.status === "Tamamlandı" ? "bg-emerald-500 text-white" : step.status === "Devam Ediyor" ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-gray-800 text-slate-400"}`}>
                    {step.status === "Tamamlandı" ? "✓" : si + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-gray-100 text-sm">{step.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="h-1 w-24 bg-slate-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${stepProgress === 100 ? "bg-emerald-500" : "bg-blue-500"}`} style={{ width: `${stepProgress}%` }} />
                      </div>
                      <span className="text-xs text-slate-400 dark:text-gray-600">{doneCount}/{step.tasks.length} görev</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[step.status]}`}>{step.status}</span>
                    {isAdmin && (
                      <button onClick={() => setTaskForm({ stepId: step.id, title: "", assigneeId: "", assigneeType: "user", dueDate: "" })}
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium px-2 py-1 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all">
                        + Görev
                      </button>
                    )}
                    <span className="text-slate-300 dark:text-gray-600 text-sm">{isExp ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Adım ekleri */}
                {isExp && (() => {
                  const atts = parseAttachments(step.attachments);
                  return (
                    <div className="px-4 pb-3 border-t border-slate-100 dark:border-gray-800 pt-3">
                      <p className="text-[11px] font-semibold text-slate-400 dark:text-gray-600 uppercase tracking-wider">Adım görselleri</p>
                      <AttachmentStrip
                        items={atts}
                        canEdit={canAttach}
                        uploading={uploadingKey === `step-${step.id}`}
                        onAdd={files => addAttachments("step", step.id, atts, files)}
                        onRemove={i => removeAttachment("step", step.id, atts, i)}
                      />
                    </div>
                  );
                })()}

                {/* Tasks */}
                {isExp && (
                  <div className="border-t border-slate-100 dark:border-gray-800 divide-y divide-slate-50 dark:divide-gray-800/60">
                    {step.tasks.length === 0 && (
                      <p className="px-6 py-4 text-sm text-slate-400 dark:text-gray-600 italic">Henüz görev yok</p>
                    )}
                    {step.tasks.map(task => {
                      const assignee = task.assigneeType === "user"
                        ? users.find(u => u.id === task.assigneeId)
                        : null;
                      const isOverdue = task.dueDate && task.status !== "Tamamlandı" && new Date(task.dueDate) < new Date();
                      const canToggle = isAdmin || (me?.type === "agent" && task.assigneeId === me.id && task.assigneeType === "user");

                      return (
                        <div key={task.id} className={`flex items-start gap-3 px-6 py-3 hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors ${task.status === "Tamamlandı" ? "opacity-60" : ""}`}>
                          {/* Checkbox */}
                          <button
                            onClick={() => canToggle && updateTaskStatus(task.id, task.status === "Tamamlandı" ? "Beklemede" : task.status === "Beklemede" ? "Devam Ediyor" : "Tamamlandı")}
                            disabled={!canToggle}
                            title={canToggle ? undefined : "Bu görev size atanmamış"}
                            className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${!canToggle ? "opacity-40 cursor-not-allowed" : "cursor-pointer"} ${task.status === "Tamamlandı" ? "bg-emerald-500 border-emerald-500 text-white" : task.status === "Devam Ediyor" ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" : "border-slate-300 dark:border-gray-600 hover:border-indigo-400"}`}>
                            {task.status === "Tamamlandı" && <span className="text-[10px]">✓</span>}
                            {task.status === "Devam Ediyor" && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${task.status === "Tamamlandı" ? "line-through text-slate-400 dark:text-gray-600" : "text-slate-700 dark:text-gray-300"}`}>{task.title}</p>
                            {task.description && <p className="text-xs text-slate-400 mt-0.5">{task.description}</p>}
                            {(() => {
                              const atts = parseAttachments(task.attachments);
                              return (
                                <AttachmentStrip
                                  items={atts}
                                  canEdit={canAttach}
                                  uploading={uploadingKey === `task-${task.id}`}
                                  onAdd={files => addAttachments("task", task.id, atts, files)}
                                  onRemove={i => removeAttachment("task", task.id, atts, i)}
                                  compact
                                />
                              );
                            })()}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 mt-0.5">
                            {isOverdue && <span className="text-[10px] font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 rounded-md">GECİKMİŞ</span>}
                            {task.dueDate && !isOverdue && (
                              <span className="text-[11px] text-slate-400 dark:text-gray-600">{new Date(task.dueDate).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}</span>
                            )}
                            {assignee && (
                              <div title={assignee.name} className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${AVATAR_BG[assignee.color] ?? "bg-slate-500"}`}>
                                {assignee.name[0]}
                              </div>
                            )}
                            {task.assigneeType === "customer" && (
                              <div title="Müşteri" className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center text-[10px] font-bold text-white">M</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Step — admin only */}
          {isAdmin && (
            <div className="flex gap-2">
              <input value={addStepName} onChange={e => setAddStepName(e.target.value)}
                placeholder="Yeni adım adı..."
                onKeyDown={e => e.key === "Enter" && addStep()}
                className="flex-1 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 shadow-sm" />
              <button onClick={addStep} disabled={addingStep || !addStepName.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-40">
                {addingStep ? "..." : "+ Adım"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Log Tab */}
      {tab === "log" && (
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">Aktivite Logu ({logs.length})</p>
            <button onClick={() => exportFile("excel")}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">📊 Excel İndir</button>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-gray-800/60 max-h-[60vh] overflow-y-auto">
            {logs.length === 0 && <p className="py-12 text-center text-slate-400 dark:text-gray-600 text-sm">Log kaydı yok</p>}
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-sm shrink-0 mt-0.5">⚡</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 dark:text-gray-300">{log.action}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-600 mt-0.5">{log.userName ?? "Sistem"} · {new Date(log.createdAt).toLocaleString("tr-TR")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Tab */}
      {tab === "chat" && (
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ height: "60vh" }}>
          <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between shrink-0">
            <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">Proje Sohbeti</p>
            <button onClick={() => exportFile("txt")}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">📄 Sohbet Döküm</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full text-slate-400 dark:text-gray-600 text-sm">Henüz mesaj yok</div>
            )}
            {messages.map(msg => {
              const isCustomer = msg.userType === "customer";
              const atts: Attachment[] = (() => { try { return JSON.parse(msg.attachments || "[]"); } catch { return []; } })();
              return (
                <div key={msg.id} className={`flex gap-3 ${isCustomer ? "" : "flex-row-reverse"}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${isCustomer ? "bg-teal-500" : "bg-indigo-500"}`}>
                    {(msg.userName ?? "?")[0].toUpperCase()}
                  </div>
                  <div className={`max-w-[70%] ${isCustomer ? "" : "items-end"} flex flex-col gap-0.5`}>
                    <div className={`px-3 py-2 rounded-2xl text-sm ${isCustomer ? "bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-gray-200 rounded-tl-sm" : "bg-indigo-600 text-white rounded-tr-sm"}`}>
                      {msg.body && <p className="whitespace-pre-wrap">{msg.body}</p>}
                      {atts.map((a, ai) => (
                        a.type.startsWith("image/") ? (
                          <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
                            <img src={a.url} alt={a.name} className="max-h-40 max-w-full rounded-xl border border-black/10 object-contain" />
                          </a>
                        ) : (
                          <a key={ai} href={a.url} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1.5 mt-1.5 text-xs bg-black/10 hover:bg-black/20 rounded-lg px-2.5 py-1.5 transition-colors">
                            <span>📄</span><span className="truncate max-w-[160px]">{a.name}</span>
                          </a>
                        )
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-gray-600 px-1">
                      {msg.userName ?? "?"} · {new Date(msg.createdAt).toLocaleString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {msgFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-2 border-t border-slate-100 dark:border-gray-800">
              {msgFiles.map((f, i) => (
                <div key={i} className="relative group">
                  {f.type.startsWith("image/") ? (
                    <img src={URL.createObjectURL(f)} alt={f.name} className="h-12 w-12 object-cover rounded-lg border border-slate-200 dark:border-gray-700" />
                  ) : (
                    <div className="h-12 w-12 rounded-lg border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 flex flex-col items-center justify-center gap-0.5 px-1">
                      <span className="text-lg">📄</span>
                      <span className="text-[8px] text-slate-400 text-center line-clamp-2">{f.name}</span>
                    </div>
                  )}
                  <button onClick={() => setMsgFiles(p => p.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                </div>
              ))}
            </div>
          )}
          <div className="p-3 border-t border-slate-100 dark:border-gray-800 flex gap-2 shrink-0">
            <div className="flex-1 space-y-1">
              <input value={msgBody} onChange={e => setMsgBody(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder="Mesaj yaz..."
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-gray-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
              <button onClick={() => chatFileRef.current?.click()}
                className="flex items-center gap-1 text-xs text-slate-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                📎 Dosya ekle {msgFiles.length > 0 && `(${msgFiles.length})`}
              </button>
              <input ref={chatFileRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xlsx,.zip,.txt"
                className="hidden"
                onChange={e => { setMsgFiles(p => [...p, ...Array.from(e.target.files ?? [])].slice(0, 5)); e.target.value = ""; }} />
            </div>
            <button onClick={sendMessage} disabled={sending || (!msgBody.trim() && msgFiles.length === 0)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-40 self-start">
              {sending ? "..." : "Gönder"}
            </button>
          </div>
        </div>
      )}

      {/* Add Task Modal — admin only */}
      {isAdmin && taskForm.stepId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setTaskForm(f => ({ ...f, stepId: null }))}>
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900 dark:text-gray-100 mb-4">Görev Ekle</h3>
            <div className="space-y-3">
              <input value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Görev başlığı..."
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />

              <select value={taskForm.assigneeType} onChange={e => setTaskForm(f => ({ ...f, assigneeType: e.target.value, assigneeId: "" }))}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                <option value="user">Kullanıcı</option>
                <option value="customer">Müşteri</option>
              </select>

              {taskForm.assigneeType === "user" ? (
                <select value={taskForm.assigneeId} onChange={e => setTaskForm(f => ({ ...f, assigneeId: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                  <option value="">Kullanıcı seç...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              ) : (
                <p className="text-xs text-slate-400 dark:text-gray-600 px-1">Görev müşteriye atanacak</p>
              )}

              <input type="date" value={taskForm.dueDate} onChange={e => setTaskForm(f => ({ ...f, dueDate: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setTaskForm(f => ({ ...f, stepId: null }))}
                className="flex-1 py-2.5 text-sm text-slate-500 border border-slate-200 dark:border-gray-700 rounded-xl hover:text-slate-700 transition-colors">İptal</button>
              <button onClick={addTask} disabled={!taskForm.title.trim()}
                className="flex-1 py-2.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm shadow-indigo-600/20 transition-all disabled:opacity-40">Ekle</button>
            </div>
          </div>
        </div>
      )}

      {/* Dokümantasyon — projenin adım/görev/yazışmalarından üretilir */}
      {docModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDocModal(false)}>
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900 dark:text-gray-100">Dokümantasyon Oluştur</h3>
            <p className="text-xs text-slate-500 dark:text-gray-500 mt-1 mb-5">
              Doküman bu projenin adımları, görevleri ve yazışmalarından üretilir. Hazırlanması yarım dakikayı bulabilir.
            </p>

            <div className="space-y-3">
              {([
                { type: "user", icon: "📗", title: "Müşteri Kullanım Dokümanı", desc: "Teslim kapsamı, süreç, müşteriden beklenenler, SSS" },
                { type: "technical", icon: "📘", title: "Teknik Doküman", desc: "İş akışı, görev dökümü, açık işler, devir notları" },
              ] as const).map(d => (
                <div key={d.type} className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50/60 dark:bg-gray-800/40">
                  <span className="text-xl shrink-0">{d.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">{d.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-500 leading-snug">{d.desc}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => window.open(`/api/projects/${id}/docs?type=${d.type}`, "_blank")}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors">
                      HTML
                    </button>
                    <button onClick={() => window.open(`/api/projects/${id}/docs?type=${d.type}&print=1`, "_blank")}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setDocModal(false)}
              className="w-full mt-5 py-2.5 text-sm text-slate-500 border border-slate-200 dark:border-gray-700 rounded-xl hover:text-slate-700 dark:hover:text-gray-300 transition-colors">
              Kapat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
