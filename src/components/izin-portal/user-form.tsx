"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UserOption { id: string; name: string; email: string; }

interface Props {
  mode: "create" | "edit";
  userId?: string;
  defaultValues?: { name: string; email: string; role: string; department: string; managerId: string; };
  managers: UserOption[];
}

const ROLES = [
  { value: "EMPLOYEE", label: "Çalışan" },
  { value: "MANAGER", label: "Yönetici" },
  { value: "HR_ADMIN", label: "HR Admin" },
];

export function UserForm({ mode, userId, defaultValues, managers }: Props) {
  const router = useRouter();
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [email, setEmail] = useState(defaultValues?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(defaultValues?.role ?? "EMPLOYEE");
  const [department, setDepartment] = useState(defaultValues?.department ?? "");
  const [managerId, setManagerId] = useState(defaultValues?.managerId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const body: Record<string, string> = { name, email, role, department, managerId };
    if (password) body.password = password;
    const res = await fetch(
      mode === "create" ? "/api/izin-portal/admin/users" : `/api/izin-portal/admin/users/${userId}`,
      { method: mode === "create" ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    setLoading(false);
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "Bir hata oluştu.");
    } else {
      router.push("/izin-portal/admin/users");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card overflow-hidden">
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text)" }}>Ad Soyad *</label>
            <input type="text" className="input-apple" value={name}
              onChange={(e) => setName(e.target.value)} placeholder="Ahmet Yılmaz" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text)" }}>E-posta *</label>
            <input type="email" className="input-apple" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="ahmet@sirket.com" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text)" }}>
              Şifre {mode === "edit" && <span style={{ color: "var(--text-tertiary)" }}>(boş bırakırsan değişmez)</span>}
              {mode === "create" && " *"}
            </label>
            <input type="password" className="input-apple" value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required={mode === "create"} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text)" }}>Rol *</label>
            <select className="input-apple" value={role} onChange={(e) => setRole(e.target.value)} required>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text)" }}>Departman</label>
            <input type="text" className="input-apple" value={department}
              onChange={(e) => setDepartment(e.target.value)} placeholder="Yazılım Geliştirme" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: "var(--text)" }}>Yöneticisi</label>
            <select className="input-apple" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">— Yok —</option>
              {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
            style={{ background: "var(--error-light)", color: "var(--error)" }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}
      </div>
      <div className="px-6 py-4 flex justify-end gap-3" style={{ borderTop: "1px solid var(--border)" }}>
        <button type="button" onClick={() => router.push("/izin-portal/admin/users")} className="btn-secondary">İptal</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "Kaydediliyor..." : mode === "create" ? "Kullanıcı Oluştur" : "Kaydet"}
        </button>
      </div>
    </form>
  );
}
