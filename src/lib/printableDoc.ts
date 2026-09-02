// Tarayıcıda açılan, doğrudan "PDF olarak kaydet" ile yazdırılabilen belge iskeleti.
// PDF üretimini tarayıcıya bırakıyoruz: Türkçe karakterler için gömülü font derdi olmuyor
// ve çıktı A4 sayfa düzeniyle birebir aynı oluyor.

interface DocOptions {
  title: string;
  subtitle?: string;
  /** Üst bilgi satırları — "Müşteri: X" gibi. */
  meta?: { label: string; value: string }[];
  /** Gövde: markdownToHtml çıktısı ya da elle üretilmiş güvenli HTML. */
  bodyHtml: string;
  /** true ise sayfa açılır açılmaz yazdırma penceresi gelir (PDF akışı). */
  print?: boolean;
  footerNote?: string;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function renderPrintableDoc(o: DocOptions): string {
  const now = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  const metaRows = (o.meta ?? [])
    .map(m => `<div class="meta-item"><span class="meta-label">${esc(m.label)}</span><span class="meta-value">${esc(m.value)}</span></div>`)
    .join("");

  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(o.title)}</title>
<style>
  :root { --ink:#1e293b; --muted:#64748b; --line:#e2e8f0; --brand:#4f46e5; --brand-soft:#eef2ff; }
  * { box-sizing: border-box; }
  body { margin:0; background:#f1f5f9; color:var(--ink);
         font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
         font-size:14px; line-height:1.65; }
  .toolbar { position:sticky; top:0; z-index:10; display:flex; gap:10px; align-items:center;
             padding:12px 20px; background:#0f172a; color:#fff; }
  .toolbar .brand { font-weight:700; letter-spacing:-0.01em; }
  .toolbar .spacer { flex:1; }
  .toolbar button { border:0; border-radius:10px; padding:8px 14px; font-size:13px; font-weight:600;
                    cursor:pointer; background:var(--brand); color:#fff; }
  .toolbar button.ghost { background:rgba(255,255,255,0.12); }
  .sheet { max-width:820px; margin:24px auto 60px; background:#fff; padding:48px 56px;
           box-shadow:0 10px 40px rgba(15,23,42,0.10); border-radius:6px; }
  h1 { font-size:26px; line-height:1.25; margin:0 0 6px; letter-spacing:-0.02em; }
  .subtitle { color:var(--muted); font-size:15px; margin:0 0 22px; }
  .meta { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 24px;
          border:1px solid var(--line); border-radius:10px; padding:16px 18px; margin:0 0 28px;
          background:#f8fafc; }
  .meta-item { display:flex; gap:8px; font-size:12.5px; min-width:0; }
  .meta-label { color:var(--muted); flex:0 0 auto; }
  .meta-value { font-weight:600; overflow-wrap:anywhere; }
  h2 { font-size:19px; margin:30px 0 10px; padding-bottom:6px; border-bottom:2px solid var(--brand-soft);
       letter-spacing:-0.01em; }
  h3 { font-size:15.5px; margin:22px 0 6px; }
  h4, h5 { font-size:14px; margin:16px 0 4px; color:var(--muted); text-transform:uppercase; letter-spacing:.04em; }
  p { margin:0 0 10px; }
  ul, ol { margin:0 0 12px; padding-left:22px; }
  li { margin:3px 0; }
  code { background:#f1f5f9; border:1px solid var(--line); border-radius:5px; padding:1px 5px;
         font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size:12.5px; }
  table { width:100%; border-collapse:collapse; margin:8px 0 18px; font-size:13px; }
  th, td { border:1px solid var(--line); padding:7px 10px; text-align:left; vertical-align:top; }
  th { background:#f8fafc; font-weight:700; }
  hr { border:0; border-top:1px solid var(--line); margin:22px 0; }
  .footer { margin-top:36px; padding-top:14px; border-top:1px solid var(--line);
            color:var(--muted); font-size:11.5px; display:flex; justify-content:space-between; gap:16px; }
  .empty { color:var(--muted); font-style:italic; }
  @media print {
    body { background:#fff; }
    .toolbar { display:none; }
    .sheet { box-shadow:none; margin:0; max-width:none; padding:0; border-radius:0; }
    h2 { break-after:avoid; }
    table, ul, ol { break-inside:avoid; }
    @page { size:A4; margin:18mm 16mm; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <span class="brand">AnahtarDestek</span>
    <span class="spacer"></span>
    <button onclick="window.print()">PDF olarak kaydet</button>
    <button class="ghost" onclick="window.close()">Kapat</button>
  </div>

  <div class="sheet">
    <h1>${esc(o.title)}</h1>
    ${o.subtitle ? `<p class="subtitle">${esc(o.subtitle)}</p>` : ""}
    ${metaRows ? `<div class="meta">${metaRows}</div>` : ""}
    ${o.bodyHtml}
    <div class="footer">
      <span>${esc(o.footerNote ?? "AnahtarDestek tarafından oluşturuldu")}</span>
      <span>${esc(now)}</span>
    </div>
  </div>
${o.print ? `<script>window.addEventListener("load", function(){ setTimeout(function(){ window.print(); }, 400); });</script>` : ""}
</body>
</html>`;
}
