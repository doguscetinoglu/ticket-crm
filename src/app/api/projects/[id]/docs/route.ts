import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { markdownToHtml } from "@/lib/markdown";
import { renderPrintableDoc } from "@/lib/printableDoc";

// Doküman üretimi model çağrısı içeriyor; Vercel'de varsayılan süre yetmez.
export const maxDuration = 60;

type DocType = "user" | "technical";

const TITLES: Record<DocType, string> = {
  user: "Kullanım Kılavuzu",
  technical: "Teknik Doküman",
};

interface Attachment { url: string; name: string; type?: string; }

const VISION_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGES = 12;

function parseAttachments(raw: string | null): Attachment[] {
  try { const v = JSON.parse(raw || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

interface LabeledImage { url: string; label: string; }

/** Adım ve görevlere eklenmiş görseller — dokümanı bunlara dayandırıyoruz. */
function collectImages(p: ProjectWithRelations): LabeledImage[] {
  const out: LabeledImage[] = [];
  for (const step of p.steps) {
    for (const a of parseAttachments(step.attachments)) {
      if (a.type && VISION_TYPES.includes(a.type)) out.push({ url: a.url, label: `Adım "${step.name}" — ${a.name}` });
    }
    for (const t of step.tasks) {
      for (const a of parseAttachments(t.attachments)) {
        if (a.type && VISION_TYPES.includes(a.type)) out.push({ url: a.url, label: `Adım "${step.name}" / Görev "${t.title}" — ${a.name}` });
      }
    }
  }
  return out.slice(0, MAX_IMAGES);
}

/** Modelin göreceği proje bağlamı — yalnızca gerçekten kayıtlı olan veriler. */
function buildContext(p: ProjectWithRelations): string {
  const lines: string[] = [];
  lines.push(`Proje adı: ${p.name}`);
  lines.push(`Durum: ${p.status}`);
  if (p.description) lines.push(`Proje açıklaması: ${p.description}`);
  lines.push(`Müşteri: ${p.customer?.name ?? "-"}${p.customer?.company ? ` (${p.customer.company})` : ""}`);
  lines.push(`Başlangıç: ${p.createdAt.toLocaleDateString("tr-TR")}`);
  lines.push(`Ekip: ${p.members.map(m => `${m.user.name} (${m.user.role})`).join(", ") || "-"}`);

  lines.push("", "ADIMLAR VE GÖREVLER:");
  for (const [i, step] of p.steps.entries()) {
    lines.push(`${i + 1}. ADIM: ${step.name} [${step.status}]`);
    const stepAtts = parseAttachments(step.attachments);
    if (stepAtts.length) lines.push(`   ekli dosyalar: ${stepAtts.map(a => a.name).join(", ")}`);
    if (step.tasks.length === 0) lines.push("   (bu adımda tanımlı görev yok)");
    for (const t of step.tasks) {
      const who = t.assigneeType === "customer" ? "müşteride" : t.assigneeId ? "ekipte" : "atanmamış";
      const due = t.dueDate ? `, termin ${t.dueDate.toLocaleDateString("tr-TR")}` : "";
      lines.push(`   - ${t.title} [${t.status}, ${who}${due}]`);
      if (t.description) lines.push(`     açıklama: ${t.description}`);
      const taskAtts = parseAttachments(t.attachments);
      if (taskAtts.length) lines.push(`     ekli dosyalar: ${taskAtts.map(a => a.name).join(", ")}`);
    }
  }

  if (p.messages.length) {
    lines.push("", "PROJE YAZIŞMALARI (kronolojik, son 40):");
    for (const m of p.messages.slice(-40)) {
      const who = m.userType === "customer" ? "MÜŞTERİ" : "EKİP";
      lines.push(`- [${who}/${m.userName ?? "-"}] ${m.body.replace(/\s+/g, " ").slice(0, 400)}`);
    }
  }

  if (p.logs.length) {
    lines.push("", "SON HAREKETLER (son 25):");
    for (const l of p.logs.slice(-25)) {
      lines.push(`- ${l.createdAt.toLocaleDateString("tr-TR")} ${l.userName ?? "-"}: ${l.action}`);
    }
  }

  return lines.join("\n");
}

const SYSTEM = `Sen kurumsal projeler için Türkçe doküman yazan deneyimli bir teknik yazarsın.
Sana bir proje yönetim sistemindeki gerçek proje kaydı verilir; adımlar, görevler, sorumlular ve yazışmalar.

Kurallar:
- Yalnızca verilen veriye dayan. Veride olmayan ürün özelliği, ekran, API, sürüm veya teknoloji UYDURMA.
- Bir konu veride yoksa ve doküman için gerekliyse "Bu bölüm proje ekibi tarafından netleştirilecektir." yaz.
- Çıktıyı Markdown olarak ver. Kod bloğu (\`\`\`) kullanma, belge başlığı (tek #) yazma — bölümler ## ile başlasın.
- Türkçe, sade ve profesyonel bir dil kullan. Şişirme, gereksiz tekrar ve pazarlama dili yok.
- Tabloları uygun yerlerde kullan (adım/görev/sorumluluk dökümleri için).

Görseller: Adımlara ve görevlere ekran görüntüsü/fotoğraf eklenmiş olabilir; her görselden önce
hangi adım/göreve ait olduğu yazar. Bu görseller dokümanın en güvenilir kaynağıdır:
- Ekran adlarını, menü/alan/buton isimlerini ve akış sırasını görselde gerçekten yazdığı gibi kullan.
- Adım adım anlatımları görseldeki gerçek ekranlara dayandır.
- Görselde okuyamadığın bir şeyi tahmin etme; okunmuyorsa o ayrıntıya hiç girme.
- Görsele atıf yaparken "\"X\" adımındaki ekran görüntüsünde..." gibi ait olduğu adımın adını kullan.`;

const PROMPTS: Record<DocType, string> = {
  user: `Bu proje için MÜŞTERİYE VERİLECEK bir kullanım/teslim dokümanı yaz.
Hedef okuyucu teknik olmayan müşteri tarafı. Şu bölümleri kullan (veri yetersizse bölümü kısa tut, atlama):

## Proje Hakkında — proje neyi çözüyor, kapsamı ne
## Teslim Kapsamı — adımlar üzerinden müşterinin ne aldığı, tablo olarak
## Süreç Nasıl İlerliyor — adımların sırası ve her adımda müşteriden ne beklendiği
## Müşteriden Beklenen Aksiyonlar — "müşteride" olarak işaretli görevler, durumlarıyla birlikte tablo
## Mevcut Durum — hangi adımlar tamamlandı, şu an ne bekleniyor
## Sık Sorulan Sorular — projenin verisinden çıkan gerçek sorular ve yanıtları
## Destek ve İletişim — AnahtarDestek üzerinden bilet açılabileceği, proje ekranından mesaj yazılabileceği`,

  technical: `Bu proje için EKİP İÇİ TEKNİK doküman yaz.
Hedef okuyucu projeyi devralacak/destekleyecek teknik ekip. Şu bölümleri kullan:

## Özet — proje neyi kapsıyor, hangi aşamada
## Kapsam ve Çıktılar — adım adım teknik kapsam
## İş Akışı ve Bağımlılıklar — adımların sırası, hangi adım neye bağlı
## Görev Dökümü ve Sorumluluklar — adım / görev / sorumlu taraf / durum / termin tablosu
## Yazışmalardan Çıkan Teknik Notlar — proje mesajlarında geçen kararlar ve kısıtlar (yalnızca gerçekten geçenler)
## Açık İşler ve Riskler — tamamlanmamış görevler, termini geçmişler, atanmamışlar
## Devir Notları — bu projeyi devralacak birinin bilmesi gerekenler`,
};

type ProjectWithRelations = NonNullable<Awaited<ReturnType<typeof loadProject>>>;

function loadProject(id: number) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, company: true } },
      members: { include: { user: { select: { name: true, role: true } } } },
      steps: { include: { tasks: true }, orderBy: { order: "asc" } },
      logs: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** Model yoksa/başarısızsa: proje yapısından doğrudan üretilen doküman. */
function fallbackMarkdown(p: ProjectWithRelations, type: DocType): string {
  const rows = p.steps.flatMap(s =>
    s.tasks.length
      ? s.tasks.map(t => `| ${s.name} | ${t.title} | ${t.assigneeType === "customer" ? "Müşteri" : "Ekip"} | ${t.status} | ${t.dueDate ? t.dueDate.toLocaleDateString("tr-TR") : "-"} |`)
      : [`| ${s.name} | (görev tanımlı değil) | - | ${s.status} | - |`],
  );
  const open = p.steps.flatMap(s => s.tasks.filter(t => t.status !== "Tamamlandı").map(t => `- ${s.name} → ${t.title} (${t.status})`));
  const customerTasks = p.steps.flatMap(s => s.tasks.filter(t => t.assigneeType === "customer").map(t => `- ${t.title} — ${t.status}`));

  const common = [
    "## Proje Hakkında",
    p.description ?? "Proje açıklaması girilmemiş.",
    "",
    "## Adım ve Görev Dökümü",
    "| Adım | Görev | Sorumlu | Durum | Termin |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "## Mevcut Durum",
    `Toplam ${p.steps.length} adım, ${p.steps.flatMap(s => s.tasks).length} görev. ` +
      `${p.steps.filter(s => s.status === "Tamamlandı").length} adım tamamlandı.`,
  ];

  if (type === "user") {
    common.push("", "## Müşteriden Beklenen Aksiyonlar", customerTasks.length ? customerTasks.join("\n") : "Şu an müşteri tarafında bekleyen bir görev yok.");
    common.push("", "## Destek ve İletişim", "Sorularınız için AnahtarDestek üzerinden destek bileti açabilir veya proje ekranındaki mesaj alanını kullanabilirsiniz.");
  } else {
    common.push("", "## Açık İşler", open.length ? open.join("\n") : "Açık görev yok.");
    common.push("", "## Ekip", p.members.map(m => `- ${m.user.name} (${m.user.role})`).join("\n") || "Atanmış üye yok.");
  }
  common.push("", "_Not: Bu doküman proje kayıtlarından otomatik üretildi; AI zenginleştirmesi kullanılamadı._");
  return common.join("\n");
}

async function generateMarkdown(p: ProjectWithRelations, type: DocType): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackMarkdown(p, type);
  try {
    const client = new Anthropic({ apiKey });

    const images = collectImages(p);
    const content: Anthropic.ContentBlockParam[] = [
      { type: "text", text: `${PROMPTS[type]}\n\n--- PROJE VERİSİ ---\n${buildContext(p)}` },
    ];
    if (images.length) {
      content.push({ type: "text", text: `--- EKLİ GÖRSELLER (${images.length} adet) ---` });
      for (const [i, img] of images.entries()) {
        content.push({ type: "text", text: `GÖRSEL ${i + 1} — ${img.label}` });
        content.push({ type: "image", source: { type: "url", url: img.url } });
      }
    }

    const stream = client.messages.stream({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { effort: "medium" },
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") return fallbackMarkdown(p, type);
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("\n")
      .trim();
    return text || fallbackMarkdown(p, type);
  } catch {
    return fallbackMarkdown(p, type);
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const type: DocType = req.nextUrl.searchParams.get("type") === "technical" ? "technical" : "user";
  const wantsPrint = req.nextUrl.searchParams.get("print") === "1";

  const project = await loadProject(parseInt(id));
  if (!project) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  // Müşteri yalnızca kendi projesinin kullanım dokümanını görebilir; teknik doküman ekibe özel.
  if (session.type === "customer" && (project.customerId !== session.id || type === "technical")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const markdown = await generateMarkdown(project, type);

  // Ekli görseller belgenin sonuna ek olarak konur — okuyucu anlatılanı ekranda görebilsin.
  const images = collectImages(project);
  const escAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const galleryHtml = images.length
    ? `<h2>Ek: Adım ve Görev Görselleri</h2><div class="gallery">` +
      images.map((im, i) =>
        `<figure><img src="${escAttr(im.url)}" alt="${escAttr(im.label)}" /><figcaption>Görsel ${i + 1} — ${escAttr(im.label)}</figcaption></figure>`,
      ).join("") + `</div>`
    : "";

  const html = renderPrintableDoc({
    title: `${project.name} — ${TITLES[type]}`,
    subtitle: type === "user"
      ? "Müşteri kullanım ve teslim dokümanı"
      : "Ekip içi teknik doküman",
    meta: [
      { label: "Müşteri", value: project.customer?.name ?? "-" },
      { label: "Proje durumu", value: project.status },
      { label: "Adım / görev", value: `${project.steps.length} / ${project.steps.flatMap(s => s.tasks).length}` },
      { label: "Ekip", value: project.members.map(m => m.user.name).join(", ") || "-" },
      ...(images.length ? [{ label: "Kullanılan görsel", value: String(images.length) }] : []),
    ],
    bodyHtml: markdownToHtml(markdown) + galleryHtml,
    print: wantsPrint,
    footerNote: `${project.name} · ${TITLES[type]} · AnahtarDestek`,
  });

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
