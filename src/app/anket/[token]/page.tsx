"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const QUESTIONS = [
  { key: "q1", label: "Destek ekibimizin genel performansını nasıl değerlendirirsiniz?" },
  { key: "q2", label: "Sorununuzun çözüm hızını nasıl değerlendirirsiniz?" },
  { key: "q3", label: "Aldığınız çözümden ne kadar memnun kaldınız?" },
  { key: "q4", label: "Destek temsilcimizin iletişimini nasıl buldunuz?" },
  { key: "q5", label: "Hizmetimizi başkalarına tavsiye eder misiniz?" },
] as const;

const STAR_LABELS = ["Çok Kötü", "Kötü", "Orta", "İyi", "Mükemmel"];

interface SurveyData {
  ticket: { id: number; subject: string; fromName: string | null };
  response: object | null;
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          className="group focus:outline-none transition-transform hover:scale-110 active:scale-95"
        >
          <svg
            className={`w-9 h-9 transition-all duration-150 ${
              i <= active
                ? "text-amber-400 drop-shadow-sm"
                : "text-slate-200"
            }`}
            fill={i <= active ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={i <= active ? 0 : 1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </button>
      ))}
      {active > 0 && (
        <span className="ml-2 text-sm font-semibold text-amber-500">
          {STAR_LABELS[active - 1]}
        </span>
      )}
    </div>
  );
}

export default function AnketPage() {
  const { token } = useParams<{ token: string }>();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [answers, setAnswers] = useState({ q1: 0, q2: 0, q3: 0, q4: 0, q5: 0 });
  const [comment, setComment] = useState("");
  const [step, setStep] = useState(0); // 0 = form, 1 = success
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/surveys/${token}`)
      .then((r) => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then((d) => { if (d) setSurvey(d); })
      .finally(() => setLoading(false));
  }, [token]);

  const answered = Object.values(answers).filter(Boolean).length;
  const canSubmit = answered === 5;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/surveys/${token}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...answers, comment }),
    });
    if (res.ok) {
      setStep(1);
    } else {
      const d = await res.json();
      setError(d.error ?? "Bir hata oluştu");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)" }}>
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)" }}>
        <div className="text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-2">Anket Bulunamadı</h1>
          <p className="text-white/50 text-sm">Bu anket bağlantısı geçersiz veya süresi dolmuş.</p>
        </div>
      </div>
    );
  }

  if (survey?.response || step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)" }}>
        <div className="text-center max-w-sm">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl"
            style={{ background: "linear-gradient(135deg,#10b981,#059669)", boxShadow: "0 0 40px rgba(16,185,129,0.4)" }}>
            ✓
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Teşekkürler!</h1>
          <p className="text-white/60 text-base leading-relaxed">
            Değerlendirmeniz alındı. Geri bildiriminiz hizmet kalitemizi artırmamıza yardımcı olacak.
          </p>
          <div className="mt-8 flex justify-center gap-1.5">
            {[1,2,3,4,5].map(i => (
              <svg key={i} className="w-7 h-7 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: "linear-gradient(135deg,#0f0c29 0%,#1e1555 40%,#2d1b69 70%,#0f0c29 100%)" }}>
      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-3xl"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 8px 32px rgba(99,102,241,0.5)" }}>
            ⭐
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Destek Deneyiminizi Değerlendirin</h1>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <span className="text-white/50">Ticket</span>
            <span className="font-semibold text-white">#{survey?.ticket.id}</span>
            <span className="text-white/30">·</span>
            <span className="text-white/70 truncate max-w-[220px]">{survey?.ticket.subject}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(answered / 5) * 100}%`, background: "linear-gradient(90deg,#6366f1,#a855f7)" }} />
          </div>
          <span className="text-xs text-white/50 shrink-0">{answered}/5 soru</span>
        </div>

        {/* Questions */}
        <div className="space-y-3">
          {QUESTIONS.map((q, i) => (
            <div key={q.key} className="rounded-2xl p-5 transition-all"
              style={{
                background: answers[q.key] > 0 ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${answers[q.key] > 0 ? "rgba(99,102,241,0.35)" : "rgba(255,255,255,0.08)"}`,
              }}>
              <div className="flex items-start gap-3 mb-4">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                  style={{ background: answers[q.key] > 0 ? "#6366f1" : "rgba(255,255,255,0.1)", color: "#fff" }}>
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-white/90 leading-snug">{q.label}</p>
              </div>
              <div className="pl-9">
                <StarRating
                  value={answers[q.key]}
                  onChange={(v) => setAnswers((prev) => ({ ...prev, [q.key]: v }))}
                />
              </div>
            </div>
          ))}

          {/* Comment */}
          <div className="rounded-2xl p-5"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p className="text-sm font-medium text-white/90 mb-3">
              Eklemek istediğiniz bir şey var mı? <span className="text-white/40 font-normal">(isteğe bağlı)</span>
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Görüş ve önerilerinizi yazabilirsiniz..."
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 resize-none focus:outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.6)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl text-sm text-red-300"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="w-full mt-6 py-4 rounded-2xl font-bold text-base text-white transition-all disabled:opacity-40"
          style={{
            background: canSubmit ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "rgba(255,255,255,0.1)",
            boxShadow: canSubmit ? "0 8px 32px rgba(99,102,241,0.5)" : "none",
          }}
        >
          {submitting ? "Gönderiliyor..." : canSubmit ? "Değerlendirmeyi Gönder →" : `${5 - answered} soru daha yanıtlayın`}
        </button>

        <p className="text-center text-xs text-white/25 mt-4">
          Yanıtlarınız güvenli biçimde saklanır ve yalnızca destek kalitesini iyileştirmek için kullanılır.
        </p>
      </div>
    </div>
  );
}
