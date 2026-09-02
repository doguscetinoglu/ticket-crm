// Küçük ve güvenli markdown -> HTML dönüştürücü.
// Model çıktısı önce tamamen kaçışlanır, sonra biçimlendirme uygulanır;
// bu yüzden üretilen metin içinde HTML/script kaçamaz.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Satır içi biçimlendirme: **kalın**, *italik*, `kod`. Girdi zaten kaçışlanmış olmalı. */
function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    // _italik_ — snake_case kelimeleri bozmamak için kelime sınırı aranır
    .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s.,;:!?)])/g, "$1<em>$2</em>");
}

function tableRow(line: string): string[] {
  return line.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
}

const isTableSep = (line: string) => /^\|?[\s:-]*-[\s|:-]*\|?$/.test(line) && line.includes("-");

/** Markdown metni sınırlı bir HTML alt kümesine çevirir. */
export function markdownToHtml(md: string): string {
  const lines = escapeHtml(md.replace(/\r\n/g, "\n")).split("\n");
  const out: string[] = [];
  let i = 0;

  const closeList = (tag: "ul" | "ol") => { out.push(`</${tag}>`); };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // Tablo
    if (trimmed.startsWith("|") && i + 1 < lines.length && isTableSep(lines[i + 1].trim())) {
      const head = tableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(tableRow(lines[i].trim()));
        i++;
      }
      out.push("<table><thead><tr>" + head.map(c => `<th>${inline(c)}</th>`).join("") + "</tr></thead><tbody>");
      for (const r of rows) out.push("<tr>" + r.map(c => `<td>${inline(c)}</td>`).join("") + "</tr>");
      out.push("</tbody></table>");
      continue;
    }

    // Başlık
    const h = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (h) {
      // h1 belge başlığına ayrılmış; # ve ## ikisi de h2'den başlar.
      const level = Math.min(Math.max(h[1].length, 2), 5);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // Yatay çizgi
    if (/^(-{3,}|_{3,})$/.test(trimmed)) { out.push("<hr />"); i++; continue; }

    // Sırasız liste
    if (/^[-*]\s+/.test(trimmed)) {
      out.push("<ul>");
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        out.push(`<li>${inline(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`);
        i++;
      }
      closeList("ul");
      continue;
    }

    // Sıralı liste
    if (/^\d+[.)]\s+/.test(trimmed)) {
      out.push("<ol>");
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        out.push(`<li>${inline(lines[i].trim().replace(/^\d+[.)]\s+/, ""))}</li>`);
        i++;
      }
      closeList("ol");
      continue;
    }

    // Paragraf (ardışık satırlar birleştirilir)
    const para: string[] = [];
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{1,4})\s/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+[.)]\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith("|")
    ) {
      para.push(lines[i].trim());
      i++;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}
