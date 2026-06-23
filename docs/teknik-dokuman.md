# Ticket CRM — Teknik Doküman (Haziran 2026 Güncellemesi)

**Tarih:** 2026-06-23
**Kapsam:** Ekip Takvimi, İzin Sistemi, Duyuru Paneli, Ayarlar (bildirim kontrolü + aktif/pasif)
**Stack:** Next.js 16 (App Router) · React 19 · Prisma 7 · Neon (serverless PostgreSQL) · Tailwind v4 · jose (JWT)

---

## 1. Veritabanı değişiklikleri

`prisma/schema.prisma` — yeni modeller ve alanlar. Migration geçmişi (lock dosyası `sqlite`, DB postgres) tutarsız olduğundan **`prisma db push`** ile uygulandı (additive; mevcut tablolara dokunulmadı). Doğrulama: `prisma migrate diff --from-config-datasource ... --to-schema ...`.

### Yeni modeller
| Model | Tablo | Amaç |
|---|---|---|
| `Leave` | `leaves` | İzin talepleri (userId, type, startDate, endDate, days, reason, status, reviewedById, reviewedAt, reviewNote) |
| `Announcement` | `announcements` | Duyurular (title, body, createdById, requireAck, isActive) |
| `AnnouncementRead` | `announcement_reads` | Okundu kaydı (announcementId, userId, acknowledged, readAt) — `@@unique([announcementId, userId])` |
| `Setting` | `settings` | Anahtar-değer ayar deposu (key PK, value, updatedAt) |

### Değişen modeller
- `User`: ilişkiler → `leaves` (LeaveUser), `reviewedLeaves` (LeaveReviewer), `announcements` (AnnouncementAuthor), `announcementReads`.
- `Customer`: **`isActive Boolean @default(true)`** eklendi.
- `Leave.status` değerleri: `Beklemede` | `Onaylandı` | `Reddedildi`.

---

## 2. Ayar / bildirim gate katmanı

### `src/lib/settings.ts` (yeni)
Anahtarlar (hepsi Boolean, **varsayılan `true`** — kayıt yoksa açık):
- `mail_ticket_confirmation`, `mail_reply`, `mail_survey`, `notify_telegram`

API:
- `isEnabled(key): Promise<boolean>` — `settings` tablosundan tek PK okuması; yalnızca `value === "false"` kapalı. Hata olursa güvenli taraf `true` döner. (Cache yok; gerekirse kısa TTL eklenebilir.)
- `getSettings(): Record<key, boolean>`
- `setSettings(partial)` — her anahtar için `upsert`.

### Gate noktaları (tek çıkış)
| Dosya | Yer | Anahtar |
|---|---|---|
| `src/lib/email.ts` | `sendTicketConfirmationEmail` başı | `mail_ticket_confirmation` |
| `src/lib/email.ts` | `sendReplyEmail` başı | `mail_reply` |
| `src/lib/email.ts` | `sendTicketClosedEmail` başı | `mail_survey` |
| `src/lib/telegram.ts` | `sendTelegramMessage` başı | `notify_telegram` |
| `src/app/api/tickets/[id]/route.ts` | kapanış bloğu (`status==="Kapalı"`) | `mail_survey` — kapalıysa **Survey kaydı oluşturulmaz** |

> `email.ts` ve `telegram.ts` içindeki erken-çıkışlar tüm çağrı yollarını (web, `tickets/webhook`, `email/inbound`, `tickets/[id]/replies`) otomatik kapsar. Talep/yanıt DB yazımı gate'ten önce/bağımsız olduğundan bildirim kapalıyken de çalışır.

---

## 3. API uçları

| Method | Yol | Yetki | Açıklama |
|---|---|---|---|
| GET | `/api/takvim?month=YYYY-MM` | agent+admin | Aya ait gün-bazlı ticket aggregation (assignee kırılımı) + onaylı izinler. TZ: Europe/Istanbul. |
| GET / POST | `/api/izinler` | agent+admin | Liste (admin: tümü, diğer: kendi) / talep oluştur. POST'ta adminlere bildirim. |
| PATCH / DELETE | `/api/izinler/[id]` | PATCH: admin · DELETE: sahip(beklemede) veya admin | Onay/Red (+not, bildirim) / sil |
| GET / POST | `/api/duyurular` | GET: agent+admin · POST: admin | Admin'e okuma istatistikli liste; agent'a aktif duyurular + kendi okuması. POST: oluştur + tüm kullanıcılara bildirim. |
| GET | `/api/duyurular/unread` | agent+admin | Kullanıcının okuma kaydı olmayan aktif duyurular (modal kuyruğu). |
| POST | `/api/duyurular/[id]/read` | agent+admin | `AnnouncementRead` upsert (`acknowledged` bool). |
| PATCH / DELETE | `/api/duyurular/[id]` | admin | isActive/başlık/içerik güncelle / sil. |
| GET / PATCH | `/api/ayarlar` | admin | Ayarları oku / güncelle. |
| PATCH | `/api/customers/[id]` | admin | `isActive` alanı eklendi. |
| (mevcut) | `/api/users/[id]` | admin | `isActive` zaten destekleniyor. |

Yetki kalıbı: `getSession()` → `session.type !== "admin"` ⇒ 403; müşteri tipi bildirim/iç ekran uçlarında 401.

---

## 4. Kimlik doğrulama değişikliği

`src/app/api/auth/login/route.ts` — müşteri kolu artık `customer.isActive` kontrol ediyor:
```ts
if (customer && customer.isActive && customer.password && await bcrypt.compare(...))
```
Kullanıcı kolu zaten `user.isActive` kontrol ediyordu. **Caveat:** Mevcut JWT çerezi (7 gün) süresi dolana dek geçerli; pasiflik yeni girişleri engeller.

---

## 5. Frontend

| Yol | Tür | Notlar |
|---|---|---|
| `src/app/takvim/page.tsx` | Sayfa | Aylık grid (Pzt başlangıç), kişi filtresi, gün detay modalı, KPI. |
| `src/app/izinler/page.tsx` | Sayfa | Talep formu + liste; admin için Onay Bekleyenler/Tümü/Benim sekmeleri. |
| `src/app/duyurular/page.tsx` | Sayfa | Admin: oluştur + okunma raporu modalı; agent: arşiv + kendi okuma durumu. |
| `src/app/ayarlar/page.tsx` | Sayfa | Bildirim toggle'ları + kullanıcı/müşteri aktif-pasif (admin-only guard). |
| `src/components/AnnouncementModal.tsx` | Bileşen | `AppShell` içine eklendi; `/unread` kuyruğunu çeker, 60 sn'de bir kontrol; login/portal/anket sayfalarında render edilmez. |
| `src/components/Sidebar.tsx` | Bileşen | NAV: Ekip Takvimi/İzinler/Duyurular (genel), Ayarlar (yönetim). `calendar`/`leave`/`megaphone`/`cog` ikonları eklendi. |
| `src/app/kullanicilar/page.tsx` | Sayfa | Aktif/pasif (⏸/▶) butonu kaldırıldı; yönetim Ayarlar'a taşındı. |

---

## 6. Doğrulama (end-to-end)

1. `npm run build` → `✓ Compiled successfully` (tip + lint dahil).
2. **Mail off:** Ayarlar'da "Yanıt maili" kapat → ticket'a yanıt ver → reply DB'ye yazılır, mail gitmez (log: `[mail] yanıt maili kapalı — atlandı`). Aç → gider.
3. **Anket:** "Anket maili" kapat → ticket'ı Kapalı yap → `survey` kaydı oluşmaz, mail gitmez. Aç → oluşur + gider.
4. **Telegram:** "Telegram bildirimleri" kapat → durum/yanıt değişiminde mesaj gitmez.
5. **Müşteri pasif:** müşteriyi pasif yap → portala giriş 401; aktif yap → girer.

---

## 7. Açık konular / teknik borç

- `GET /api/customers` yanıtı `...c` ile şifre hash'ini de döndürüyor (mevcut, bu sürümün kapsamı dışı). Ayrı bir iyileştirmede `select`/`omit` ile maskelenmeli.
- Migration geçmişi bozuk (lock `sqlite`); ileride lock sıfırlanıp düzgün migrate akışına geçilebilir. Şu an `db push` kullanılıyor.
- `settings` okumaları cache'siz; yoğun gönderimde kısa TTL'li cache değerlendirilebilir (serverless instance bazlı, ~10-15 sn eventual consistency).
- `.env.check` (Vercel CLI çıktısı, gerçek token içerir) repoya **commit edilmedi**; `.gitignore`'a eklenmesi önerilir.
