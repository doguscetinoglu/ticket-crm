import { prisma } from "./prisma";

// Ayar anahtarları — hepsi Boolean, varsayılan açık (true)
export const MAIL_TICKET_CONFIRMATION = "mail_ticket_confirmation";
export const MAIL_REPLY = "mail_reply";
export const MAIL_SURVEY = "mail_survey";
export const NOTIFY_TELEGRAM = "notify_telegram";

export const SETTING_KEYS = [
  MAIL_TICKET_CONFIRMATION,
  MAIL_REPLY,
  MAIL_SURVEY,
  NOTIFY_TELEGRAM,
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

// Kayıt yoksa true; yalnızca "false" değeri kapalı sayılır.
export async function isEnabled(key: SettingKey): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    return row?.value !== "false";
  } catch {
    // Ayar okunamazsa güvenli taraf: gönderime devam et
    return true;
  }
}

export async function getSettings(): Promise<Record<SettingKey, boolean>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...SETTING_KEYS] } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const result = {} as Record<SettingKey, boolean>;
  for (const key of SETTING_KEYS) result[key] = map.get(key) !== "false";
  return result;
}

export async function setSettings(partial: Partial<Record<SettingKey, boolean>>): Promise<void> {
  const entries = Object.entries(partial).filter(([k]) => (SETTING_KEYS as readonly string[]).includes(k));
  await Promise.all(
    entries.map(([key, val]) =>
      prisma.setting.upsert({
        where: { key },
        create: { key, value: String(!!val) },
        update: { value: String(!!val) },
      }),
    ),
  );
}
