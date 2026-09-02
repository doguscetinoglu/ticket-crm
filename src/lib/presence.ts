// Çevrimiçi durumu (presence) ortak kuralları.
// Heartbeat 60 sn'de bir gelir; 90 sn tolerans ile "çevrimiçi" sayılır.
// 5 dk boyunca fare/klavye hareketi yoksa kullanıcı "boşta" gösterilir.

export const HEARTBEAT_MS = 60_000;
export const ONLINE_MS = 90_000;
export const IDLE_MS = 5 * 60_000;

export type PresenceStatus = "online" | "idle" | "offline";

export const STATUS_LABEL: Record<PresenceStatus, string> = {
  online: "Çevrimiçi",
  idle: "Boşta",
  offline: "Çevrimdışı",
};

/** Durum sunucu saatine göre hesaplanır — istemci saat farkından etkilenmez. */
export function presenceStatus(
  lastSeenAt: Date | null,
  lastActiveAt: Date | null,
): PresenceStatus {
  if (!lastSeenAt) return "offline";
  const now = Date.now();
  if (now - lastSeenAt.getTime() > ONLINE_MS) return "offline";
  const active = (lastActiveAt ?? lastSeenAt).getTime();
  return now - active > IDLE_MS ? "idle" : "online";
}

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/havuz": "Havuz",
  "/tickets": "Tüm Biletler",
  "/projeler": "Projeler",
  "/takvim": "Ekip Takvimi",
  "/izinler": "İzinler",
  "/duyurular": "Duyurular",
  "/musteriler": "Müşteriler",
  "/kullanicilar": "Kullanıcılar",
  "/anketler": "Anketler",
  "/raporlar": "Raporlar",
  "/ayarlar": "Ayarlar",
};

/** "/projeler/12" → "Projeler" gibi okunabilir sayfa adı. */
export function pageLabel(path: string | null): string | null {
  if (!path) return null;
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  const base = "/" + path.split("/").filter(Boolean)[0];
  return PAGE_LABELS[base] ?? null;
}
