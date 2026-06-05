"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FALLING_TICKETS = [
  { subject: "Giriş yapamıyorum",   status: "Yeni",        statusColor: "#3b82f6", priority: "Yüksek", initials: "KA", avatarBg: "#7c3aed", left: "3%",  duration: "9s",    delay: "0s",    opacity: 0.55, rotStart: -6,  rotEnd: 8   },
  { subject: "Fatura hatası var",   status: "İnceleniyor", statusColor: "#f59e0b", priority: "Normal", initials: "MY", avatarBg: "#0891b2", left: "13%", duration: "12s",   delay: "-4s",   opacity: 0.40, rotStart: 4,   rotEnd: -10 },
  { subject: "Şifre sıfırlama",    status: "Yanıtlandı",  statusColor: "#10b981", priority: "Düşük",  initials: "ST", avatarBg: "#0d9488", left: "23%", duration: "10s",   delay: "-8s",   opacity: 0.50, rotStart: -10, rotEnd: 5   },
  { subject: "Bağlantı kesildi",   status: "Yeni",        statusColor: "#3b82f6", priority: "Kritik", initials: "BE", avatarBg: "#dc2626", left: "34%", duration: "11s",   delay: "-2s",   opacity: 0.38, rotStart: 8,   rotEnd: -6  },
  { subject: "API yanıt vermiyor", status: "Yeni",        statusColor: "#3b82f6", priority: "Kritik", initials: "OZ", avatarBg: "#7c3aed", left: "46%", duration: "8.5s",  delay: "-6s",   opacity: 0.45, rotStart: -4,  rotEnd: 12  },
  { subject: "Ödeme geçmiyor",     status: "İnceleniyor", statusColor: "#f59e0b", priority: "Yüksek", initials: "CE", avatarBg: "#db2777", left: "57%", duration: "13s",   delay: "-1s",   opacity: 0.42, rotStart: 6,   rotEnd: -8  },
  { subject: "Güncelleme hatası",  status: "Yanıtlandı",  statusColor: "#10b981", priority: "Normal", initials: "HT", avatarBg: "#16a34a", left: "68%", duration: "9.5s",  delay: "-9s",   opacity: 0.50, rotStart: -8,  rotEnd: 4   },
  { subject: "Hesap engellendi",   status: "Kapalı",      statusColor: "#64748b", priority: "Yüksek", initials: "AK", avatarBg: "#ea580c", left: "78%", duration: "11.5s", delay: "-5s",   opacity: 0.38, rotStart: 10,  rotEnd: -5  },
  { subject: "Rapor alınamıyor",   status: "Yeni",        statusColor: "#3b82f6", priority: "Normal", initials: "RA", avatarBg: "#4f46e5", left: "88%", duration: "10.5s", delay: "-3s",   opacity: 0.45, rotStart: -5,  rotEnd: 9   },
  { subject: "Veri kayboldu",      status: "İnceleniyor", statusColor: "#f59e0b", priority: "Kritik", initials: "VK", avatarBg: "#0284c7", left: "8%",  duration: "14s",   delay: "-11s",  opacity: 0.35, rotStart: 7,   rotEnd: -3  },
  { subject: "Yavaş yükleniyor",   status: "Yanıtlandı",  statusColor: "#10b981", priority: "Düşük",  initials: "YH", avatarBg: "#9333ea", left: "42%", duration: "7.5s",  delay: "-7s",   opacity: 0.48, rotStart: -3,  rotEnd: 11  },
  { subject: "Ekstre gelmiyor",    status: "Yeni",        statusColor: "#3b82f6", priority: "Normal", initials: "EG", avatarBg: "#0f766e", left: "63%", duration: "10s",   delay: "-13s",  opacity: 0.40, rotStart: 5,   rotEnd: -7  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Giriş başarısız"); return; }
      router.push(data.type === "customer" ? "/portal" : "/");
      router.refresh();
    } catch {
      setError("Sunucu hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg, #0a0818 0%, #1a1040 40%, #0d1b3e 70%, #0a0818 100%)" }}
    >
      <style>{`
        @keyframes ticketFall {
          0%   { transform: translateY(-220px) rotate(var(--rs)); opacity: 0; }
          8%   { opacity: var(--op); }
          92%  { opacity: var(--op); }
          100% { transform: translateY(calc(100vh + 220px)) rotate(var(--re)); opacity: 0; }
        }
        @keyframes loginFadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(99,102,241,0.18) 0%, rgba(139,92,246,0.08) 40%, transparent 70%)",
          animation: "pulseGlow 6s ease-in-out infinite",
        }}
      />

      {/* Falling tickets */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {FALLING_TICKETS.map((t, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: t.left,
              top: 0,
              width: "168px",
              animation: `ticketFall ${t.duration} ${t.delay} linear infinite`,
              "--rs": `${t.rotStart}deg`,
              "--re": `${t.rotEnd}deg`,
              "--op": t.opacity,
            } as React.CSSProperties}
          >
            <div
              className="rounded-xl p-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(6px)",
                border: "1px solid rgba(255,255,255,0.09)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold text-white/40 font-mono">#{1000 + i * 13}</span>
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: t.statusColor + "60" }}
                >
                  {t.status}
                </span>
              </div>
              <p className="text-[11px] font-medium text-white/70 mb-2 leading-tight truncate">{t.subject}</p>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                  style={{ background: t.avatarBg }}
                >
                  {t.initials}
                </div>
                <span className="text-[9px] text-white/35 truncate">{t.priority}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(10,8,24,0.8), transparent)" }}
      />

      {/* Login card */}
      <div
        className="relative z-10 w-full max-w-sm"
        style={{ animation: "loginFadeUp 0.6s ease-out both" }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6, #a855f7)",
              boxShadow: "0 8px 32px rgba(99,102,241,0.5), 0 0 0 1px rgba(255,255,255,0.15)",
            }}
          >
            F
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Fox CRM</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>Müşteri Destek Merkezi</p>
        </div>

        {/* Glass card */}
        <div
          className="rounded-2xl p-8"
          style={{
            background: "rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 32px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
          }}
        >
          <h2 className="text-lg font-bold text-white mb-1">Giriş Yap</h2>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
            Hesabınıza erişmek için bilgilerinizi girin
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="email@sirket.com"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  // @ts-ignore
                  "--tw-ring-color": "rgba(99,102,241,0.5)",
                }}
                onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.6)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
                onFocus={e => (e.target.style.borderColor = "rgba(99,102,241,0.6)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
              />
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-2.5 text-sm text-red-300"
                style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-white font-semibold rounded-xl text-sm transition-all disabled:opacity-50"
              style={{
                background: loading
                  ? "rgba(99,102,241,0.5)"
                  : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: "0 4px 24px rgba(99,102,241,0.45)",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget.style.boxShadow = "0 4px 32px rgba(99,102,241,0.65)"); }}
              onMouseLeave={e => { (e.currentTarget.style.boxShadow = "0 4px 24px rgba(99,102,241,0.45)"); }}
            >
              {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
