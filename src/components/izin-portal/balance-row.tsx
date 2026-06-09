"use client";

import { useState } from "react";

interface Props {
  employeeId: string;
  year: number;
  annual: { totalDays: number; usedDays: number } | null;
  sick: { totalDays: number; usedDays: number } | null;
}

export function BalanceRow({ employeeId, year, annual, sick }: Props) {
  const [annualTotal, setAnnualTotal] = useState(annual?.totalDays ?? 20);
  const [sickTotal, setSickTotal] = useState(sick?.totalDays ?? 5);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/izin-portal/admin/balances", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId, year,
        balances: [
          { leaveType: "ANNUAL", totalDays: annualTotal, usedDays: annual?.usedDays ?? 0 },
          { leaveType: "SICK", totalDays: sickTotal, usedDays: sick?.usedDays ?? 0 },
        ],
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const annualUsed = annual?.usedDays ?? 0;
  const sickUsed = sick?.usedDays ?? 0;

  return (
    <>
      <td className="px-4 py-3 text-center">
        <input type="number" min={0} max={365} value={annualTotal}
          onChange={(e) => setAnnualTotal(Number(e.target.value))}
          className="w-14 text-center text-sm rounded-lg border px-2 py-1"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text)" }} />
      </td>
      <td className="px-4 py-3 text-center text-sm" style={{ color: "var(--warning)" }}>{annualUsed}</td>
      <td className="px-4 py-3 text-center text-sm font-medium" style={{ color: "var(--success)" }}>
        {Math.max(0, annualTotal - annualUsed)}
      </td>
      <td className="px-4 py-3 text-center">
        <input type="number" min={0} max={365} value={sickTotal}
          onChange={(e) => setSickTotal(Number(e.target.value))}
          className="w-14 text-center text-sm rounded-lg border px-2 py-1"
          style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text)" }} />
      </td>
      <td className="px-4 py-3 text-center text-sm" style={{ color: "var(--warning)" }}>{sickUsed}</td>
      <td className="px-4 py-3 text-center text-sm font-medium" style={{ color: "var(--success)" }}>
        {Math.max(0, sickTotal - sickUsed)}
      </td>
      <td className="px-4 py-3 text-center">
        <button onClick={save} disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
          style={{
            background: saved ? "var(--success-light)" : "var(--primary-light)",
            color: saved ? "var(--success)" : "var(--primary)",
          }}>
          {saving ? "..." : saved ? "Kaydedildi ✓" : "Kaydet"}
        </button>
      </td>
    </>
  );
}
