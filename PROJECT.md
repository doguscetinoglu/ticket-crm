# AnahtarDestek

Müşteri destek bileti yönetimi + proje takibi sistemi.

**Production:** https://anahtar-destek.vercel.app  
**GitHub:** https://github.com/doguscetinoglu/anahtar-destek  
**Vercel:** i-fox-s-projects/anahtar-destek  

> Fox-CRM (https://fox-crm-gray.vercel.app) ile ayrı projedir, karıştırılmamalı.

## Stack
- Next.js 16 + React 19 + TypeScript 5
- Prisma 7 + Neon (serverless PostgreSQL)
- Tailwind CSS v4
- jose (JWT) · bcryptjs · nodemailer · @anthropic-ai/sdk
- recharts · jsPDF · xlsx · @vercel/blob

## Veritabanı Modelleri
| Model | Açıklama |
|---|---|
| User | Admin/Agent kullanıcılar |
| Customer | Müşteriler (portal erişimi dahil) |
| Company | Şirket listesi |
| CustomerCompany | Müşteri ↔ Şirket (many-to-many) |
| Ticket | Destek biletleri |
| TicketReply | Bilet yanıtları (workMinutes dahil) |
| Project / Step / Task | Proje yönetimi |
| Survey / SurveyResponse | Anket sistemi |
| Notification | Bildirimler |

## Önemli Dosyalar
```
src/lib/auth.ts          — session doğrulama
src/lib/session.ts       — session tipleri (admin/agent/customer)
src/lib/prisma.ts        — Prisma client (Neon adapter)
src/lib/email.ts         — email şablonları
src/components/Sidebar.tsx
src/components/AppShell.tsx
prisma/schema.prisma
```

## Sayfalar
```
/                        Dashboard
/tickets                 Bilet listesi
/havuz                   Atanmamış biletler
/musteriler              Müşteri listesi
/musteriler/[id]         Müşteri detay + alt şirketler
/kullanicilar            Kullanıcı yönetimi
/projeler/[id]           Proje detay (kanban)
/raporlar                Raporlar
/anketler                Anket listesi
/portal                  Müşteri portalı
```

## API — Önemli Endpoint'ler
```
/api/customers/[id]/companies          GET · POST
/api/customers/[id]/companies/[cId]    DELETE
/api/tickets/webhook                   Dış kaynak (Telegram/email)
/api/email/inbound                     Gelen email → ticket
/api/stats                             Dashboard verileri
```

## Deploy
```bash
# Normal: GitHub push → otomatik Vercel deploy
git push origin master

# Rollback sonrası production'a promote:
vercel promote <deployment-url> --scope i-fox-s-projects

# Domain alias güncelle:
vercel alias set <deployment-url> anahtar-destek.vercel.app --scope i-fox-s-projects
```

## Güncellemeler
| Tarih | Değişiklik |
|---|---|
| 2026-06-05 | Alt şirket yönetimi eklendi (Company, CustomerCompany modelleri) |
| 2026-06-05 | Bildirim sistemi, anket sistemi eklendi |
