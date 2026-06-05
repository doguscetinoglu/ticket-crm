"use client";

import { useCallback, useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import UserAvatar from "@/components/UserAvatar";
import type { SessionUser } from "@/lib/session";

interface CustomerTicket {
  id: number; subject: string; status: string; priority: string; category: string; receivedAt: string;
  assignee: { name: string; color: string } | null;
  replies: { workMinutes: number | null }[];
}
interface SubCompany { id: number; name: string; }
interface Customer {
  id: number; email: string; name: string | null; company: string | null;
  phone: string | null; notes: string | null; monthlyPrice: number | null;
  createdAt: string; _count: { tickets: number };
  tickets: CustomerTicket[];
  companies: { company: SubCompany }[];
}

const inputCls = "w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all";

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [me, setMe]           = useState<SessionUser | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ name: "", company: "", phone: "", notes: "", monthlyPrice: "", portalPassword: "" });
  const [saving, setSaving]   = useState(false);
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [subCompanies, setSubCompanies] = useState<SubCompany[]>([]);
  const [newSubCompany, setNewSubCompany] = useState("");
  const [addingCompany, setAddingCompany] = useState(false);

  const fetchCustomer = useCallback(async () => {
    const [meRes, cRes] = await Promise.all([
      fetch("/api/auth/me").then(r => r.ok ? r.json() : null),
      fetch(`/api/customers/${id}`).then(r => r.json()),
    ]);
    setMe(meRes);
    setCustomer(cRes);
    setSubCompanies((cRes.companies ?? []).map((c: { company: SubCompany }) => c.company));
    setForm({ name: cRes.name ?? "", company: cRes.company ?? "", phone: cRes.phone ?? "", notes: cRes.notes ?? "", monthlyPrice: cRes.monthlyPrice?.toString() ?? "", portalPassword: "" });
  }, [id]);

  useEffect(() => { fetchCustomer(); }, [fetchCustomer]);

  const save = async () => {
    setSaving(true);
    await fetch(`/api/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setEditing(false);
    fetchCustomer();
  };

  const addSubCompany = async () => {
    if (!newSubCompany.trim()) return;
    setAddingCompany(true);
    const res = await fetch(`/api/customers/${id}/companies`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSubCompany.trim() }),
    });
    if (res.ok) {
      const company = await res.json();
      setSubCompanies(prev => [...prev, company].sort((a, b) => a.name.localeCompare(b.name, "tr")));
      setNewSubCompany("");
    }
    setAddingCompany(false);
  };

  const removeSubCompany = async (companyId: number) => {
    await fetch(`/api/customers/${id}/companies/${companyId}`, { method: "DELETE" });
    setSubCompanies(prev => prev.filter(c => c.id !== companyId));
  };

  if (!customer) return <div className="p-8 text-slate-400 dark:text-gray-500 text-sm">Yükleniyor...</div>;

  const isAdmin = me?.type === "admin";
  const thisMonth = new Date();
  const monthlyTickets = customer.tickets.filter(t => {
    const d = new Date(t.receivedAt);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  }).length;
  const costPerTicket = customer.monthlyPrice && monthlyTickets > 0 ? (customer.monthlyPrice / monthlyTickets).toFixed(2) : null;
  const openCount = customer.tickets.filter(t => t.status === "Yeni" || t.status === "İnceleniyor").length;
  const totalWorkMinutes = customer.tickets.reduce((sum, t) => sum + t.replies.reduce((s, r) => s + (r.workMinutes ?? 0), 0), 0);
  const filtered  = statusFilter === "Tümü" ? customer.tickets : customer.tickets.filter(t => t.status === statusFilter);

  return (
    <div className="p-4 md:p-7 space-y-5 animate-fade-in">
      <Link href="/musteriler" className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        Müşteriler
      </Link>

      {/* Profile */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 md:p-6 shadow-sm dark:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-lg shadow-indigo-500/20">
              {(customer.name || customer.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-900 dark:text-gray-100">{customer.name || <span className="text-slate-400 italic">İsimsiz</span>}</h1>
              <p className="text-sm text-slate-500 dark:text-gray-400 truncate">{customer.email}</p>
              {customer.company && <p className="text-sm text-slate-400 dark:text-gray-500">{customer.company}</p>}
              {customer.phone && <p className="text-xs text-slate-400 dark:text-gray-600 mt-0.5">{customer.phone}</p>}
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => setEditing(!editing)}
              className="px-4 py-2 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors">
              {editing ? "İptal" : "Düzenle"}
            </button>
          )}
        </div>

        {!editing && (customer.notes || subCompanies.length > 0) && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-800 space-y-3">
            {customer.notes && (
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-1">Notlar</p>
                <p className="text-sm text-slate-600 dark:text-gray-400">{customer.notes}</p>
              </div>
            )}
            {subCompanies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Alt Şirketler</p>
                <div className="flex flex-wrap gap-2">
                  {subCompanies.map(c => (
                    <span key={c.id} className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-lg border border-indigo-200 dark:border-indigo-700/40">
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {editing && (
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[{ key: "name", label: "Ad Soyad" }, { key: "company", label: "Şirket" }, { key: "phone", label: "Telefon" }].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">{label}</label>
                <input value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className={inputCls} />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">Aylık Anlaşma (₺)</label>
              <input type="number" value={form.monthlyPrice} onChange={e => setForm(f => ({ ...f, monthlyPrice: e.target.value }))} placeholder="5000" className={inputCls} />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">Notlar</label>
              <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={`${inputCls} resize-none`} />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-1">Portal Şifresi</label>
              <input type="password" value={form.portalPassword} onChange={e => setForm(f => ({ ...f, portalPassword: e.target.value }))} placeholder="Boş bırakın → değişmez" className={inputCls} />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase block mb-2">Alt Şirketler</label>
              {subCompanies.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {subCompanies.map(c => (
                    <span key={c.id} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-lg border border-indigo-200 dark:border-indigo-700/40">
                      {c.name}
                      <button type="button" onClick={() => removeSubCompany(c.id)}
                        className="ml-0.5 text-indigo-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={newSubCompany}
                  onChange={e => setNewSubCompany(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubCompany(); } }}
                  placeholder="Şirket adı yazın ve Enter'a basın"
                  className={inputCls}
                />
                <button type="button" onClick={addSubCompany} disabled={addingCompany || !newSubCompany.trim()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap">
                  {addingCompany ? "..." : "Ekle"}
                </button>
              </div>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <button onClick={save} disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm">
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { label: "Toplam Ticket", val: customer._count.tickets, color: "text-indigo-600 dark:text-indigo-400", sub: "" },
          { label: "Bu Ay",         val: monthlyTickets,            color: "text-blue-600 dark:text-blue-400", sub: "" },
          { label: "Açık",          val: openCount,                 color: "text-amber-600 dark:text-amber-400", sub: "" },
        ].map(({ label, val, color, sub }) => (
          <div key={label} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-4 md:p-5 shadow-sm dark:shadow-none">
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{val}</p>
            {sub && <p className="text-xs text-slate-400 dark:text-gray-600 mt-0.5">{sub}</p>}
          </div>
        ))}
        <div className="bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-600/30 rounded-2xl p-4 md:p-5 shadow-sm dark:shadow-none">
          <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Toplam Çalışma</p>
          <p className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
            {totalWorkMinutes >= 60 ? `${Math.floor(totalWorkMinutes / 60)}s ${totalWorkMinutes % 60}dk` : `${totalWorkMinutes} dk`}
          </p>
          <p className="text-xs text-slate-400 dark:text-gray-600 mt-0.5">tüm zamanlar</p>
        </div>
        {isAdmin && (
          <>
            <div className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 md:p-5 shadow-sm dark:shadow-none ${customer.monthlyPrice ? "border-teal-300 dark:border-teal-600/40" : "border-slate-200 dark:border-gray-800"}`}>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Aylık Anlaşma</p>
              <p className={`text-xl font-bold mt-1 ${customer.monthlyPrice ? "text-teal-600 dark:text-teal-400" : "text-slate-300 dark:text-gray-600"}`}>
                {customer.monthlyPrice ? `₺${customer.monthlyPrice.toLocaleString("tr-TR")}` : "—"}
              </p>
            </div>
            <div className={`bg-white dark:bg-gray-900 border rounded-2xl p-4 md:p-5 shadow-sm dark:shadow-none col-span-2 sm:col-span-1 ${costPerTicket ? "border-violet-300 dark:border-violet-600/40" : "border-slate-200 dark:border-gray-800"}`}>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Ticket Maliyeti</p>
              <p className={`text-xl font-bold mt-1 ${costPerTicket ? "text-violet-600 dark:text-violet-400" : "text-slate-300 dark:text-gray-600"}`}>
                {costPerTicket ? `₺${Number(costPerTicket).toLocaleString("tr-TR")}` : "—"}
              </p>
              <p className="text-xs text-slate-400 dark:text-gray-600 mt-0.5">
                {customer.monthlyPrice && monthlyTickets > 0 ? `÷ ${monthlyTickets} ticket` : customer.monthlyPrice ? "Bu ay ticket yok" : "Fiyat girin"}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Ticket history */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-sm dark:shadow-none overflow-hidden">
        <div className="px-4 md:px-5 py-4 border-b border-slate-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-gray-200 mb-3">Ticket Geçmişi</h2>
          <div className="flex flex-wrap gap-1">
            {["Tümü", "Yeni", "İnceleniyor", "Yanıtlandı", "Kapalı"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-all ${statusFilter === s ? "bg-indigo-600 text-white" : "bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 dark:text-gray-600 text-sm">Ticket bulunamadı</div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100 dark:divide-gray-800/60">
              {filtered.map(t => (
                <div key={t.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-slate-800 dark:text-gray-200 text-sm font-medium">{t.subject}</p>
                      <p className="text-xs text-slate-400 dark:text-gray-600">#{t.id} · {t.category}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    {t.assignee ? (
                      <div className="flex items-center gap-1.5">
                        <UserAvatar name={t.assignee.name} color={t.assignee.color} size="sm" />
                        <span className="text-xs text-slate-400 dark:text-gray-400">{t.assignee.name.split(" ")[0]}</span>
                      </div>
                    ) : <span className="text-xs text-slate-300 dark:text-gray-600">—</span>}
                    <span className="text-xs text-slate-400 dark:text-gray-600">{new Date(t.receivedAt).toLocaleString("tr-TR", { day: "2-digit", month: "short" })}</span>
                  </div>
                </div>
              ))}
            </div>
            <table className="hidden md:table w-full text-sm">
              <thead><tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-900">
                {["#", "Konu", "Kategori", "Durum", "Öncelik", "Atanan", "Çalışma", "Tarih"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3 text-slate-400 dark:text-gray-600 font-mono text-xs">#{t.id}</td>
                    <td className="px-5 py-3 max-w-[200px]"><p className="text-slate-800 dark:text-gray-200 truncate">{t.subject}</p></td>
                    <td className="px-5 py-3"><span className="text-xs bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 px-2 py-0.5 rounded-md">{t.category}</span></td>
                    <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-3"><PriorityBadge priority={t.priority} /></td>
                    <td className="px-5 py-3">{t.assignee ? (
                      <div className="flex items-center gap-1.5"><UserAvatar name={t.assignee.name} color={t.assignee.color} size="sm" /><span className="text-xs text-slate-400 dark:text-gray-400">{t.assignee.name.split(" ")[0]}</span></div>
                    ) : <span className="text-xs text-slate-300 dark:text-gray-600">—</span>}</td>
                    <td className="px-5 py-3">
                      {(() => { const m = t.replies.reduce((s, r) => s + (r.workMinutes ?? 0), 0); return m > 0 ? <span className="text-xs font-medium text-blue-600 dark:text-blue-400">{m >= 60 ? `${Math.floor(m/60)}s ${m%60}dk` : `${m}dk`}</span> : <span className="text-xs text-slate-300 dark:text-gray-600">—</span>; })()}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 dark:text-gray-600 whitespace-nowrap">{new Date(t.receivedAt).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
