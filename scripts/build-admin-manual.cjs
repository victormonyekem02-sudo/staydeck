/* Builds docs/StayDesk-Admin-Manual.docx from docs/ADMIN_MANUAL.md, so the
 * Word copy never drifts from the Markdown one.
 *   npm i -g docx   (once)    then    node scripts/build-admin-manual.cjs
 * Handles exactly the Markdown the manual uses: headings, paragraphs, bullet
 * and numbered lists (one nesting level), pipe tables, **bold**, *italic*,
 * `code` and [links](url). */
const fs = require("fs");
const path = require("path");
const {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, Header, HeadingLevel,
  LevelFormat, Packer, PageNumber, Paragraph, ShadingType, Table, TableCell, TableRow,
  TextRun, WidthType,
} = require("docx");

const root = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(root, "docs/ADMIN_MANUAL.md"), "utf8").split("\n");
const out = path.join(root, "docs/StayDesk-Admin-Manual.docx");

const ACCENT = "1F4D3A"; // StayDesk admin green
const FONT = "Calibri";
const PAGE_W = 11906, MARGIN = 1134, CONTENT_W = PAGE_W - 2 * MARGIN; // A4, 2 cm margins

/* ── inline markdown → runs ─────────────────────────────────────────── */
function runs(text, base = {}) {
  const outRuns = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0, m;
  const plain = (t, extra = {}) => t && outRuns.push(new TextRun({ text: t, font: FONT, ...base, ...extra }));
  while ((m = re.exec(text))) {
    plain(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) plain(tok.slice(2, -2), { bold: true });
    else if (tok.startsWith("`")) plain(tok.slice(1, -1), { font: "Consolas", size: 20, color: "333333" });
    else if (tok.startsWith("[")) {
      const [, label, url] = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      if (url.startsWith("http")) {
        outRuns.push(new ExternalHyperlink({ link: url, children: [new TextRun({ text: label, style: "Hyperlink", font: FONT, ...base })] }));
      } else {
        plain(label); // in-document anchors: the section headings are numbered, so plain text reads fine
      }
    } else plain(tok.slice(1, -1), { italics: true });
    last = m.index + tok.length;
  }
  plain(text.slice(last));
  return outRuns;
}

/* ── tables ─────────────────────────────────────────────────────────── */
const cellText = (c) => c.trim().replace(/\\\|/g, "|");
function table(lines) {
  const rows = lines
    .filter((l) => !/^\|\s*-+/.test(l.replace(/\s/g, "").replace(/:/g, "")) && !/^\|(\s*:?-+:?\s*\|)+\s*$/.test(l))
    .map((l) => l.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map(cellText));
  const n = rows[0].length;
  // Column widths proportional to the longest text in each column, with a floor.
  const len = Array.from({ length: n }, (_, i) => Math.max(8, ...rows.map((r) => Math.min(60, (r[i] || "").length))));
  const total = len.reduce((a, b) => a + b, 0);
  const widths = len.map((l) => Math.floor((l / total) * CONTENT_W));
  widths[n - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);
  const border = { style: BorderStyle.SINGLE, size: 4, color: "D6D1C4" };
  const borders = { top: border, bottom: border, left: border, right: border };
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, ri) => new TableRow({
      ...(ri === 0 ? { tableHeader: true } : {}), // docx writes the flag even for false
      children: Array.from({ length: n }, (_, ci) => new TableCell({
        width: { size: widths[ci], type: WidthType.DXA },
        borders,
        shading: ri === 0 ? { type: ShadingType.CLEAR, fill: "E6EFE9", color: "auto" } : undefined,
        margins: { top: 60, bottom: 60, left: 100, right: 100 },
        children: [new Paragraph({ spacing: { after: 0 }, children: runs(r[ci] || "", ri === 0 ? { bold: true, size: 20 } : { size: 20 }) })],
      })),
    })),
  });
}

/* ── document body ──────────────────────────────────────────────────── */
const body = [];
const spacer = () => new Paragraph({ spacing: { after: 60 }, children: [] });
let numberedGroup = 0; // restart numbering for each separate numbered list

for (let i = 0; i < src.length; i++) {
  const line = src[i];
  if (!line.trim() || line.trim() === "---") continue;
  if (line.startsWith("**Contents:**")) continue; // replaced by the section list below the intro

  if (line.startsWith("# ")) {
    body.push(new Paragraph({ heading: HeadingLevel.TITLE, children: runs(line.slice(2)) }));
    continue;
  }
  if (line.startsWith("## ")) {
    body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: body.length > 4, children: runs(line.slice(3)) }));
    continue;
  }
  if (line.startsWith("### ")) {
    body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs(line.slice(4)) }));
    continue;
  }
  if (line.trim().startsWith("|")) {
    const block = [];
    while (i < src.length && src[i].trim().startsWith("|")) block.push(src[i++]);
    i--;
    body.push(table(block), spacer());
    continue;
  }
  const bullet = /^(\s*)- (.*)$/.exec(line);
  if (bullet) {
    body.push(new Paragraph({ numbering: { reference: "bullets", level: bullet[1].length >= 2 ? 1 : 0 }, children: runs(bullet[2]) }));
    continue;
  }
  const num = /^(\d+)\. (.*)$/.exec(line);
  if (num) {
    if (num[1] === "1") numberedGroup++;
    body.push(new Paragraph({ numbering: { reference: "steps", level: 0, instance: numberedGroup }, children: runs(num[2]) }));
    continue;
  }
  // Paragraph: join wrapped lines until a blank line or a block start.
  let text = line.trim();
  while (i + 1 < src.length && src[i + 1].trim() && !/^(#|\||\s*- |\d+\. |---)/.test(src[i + 1])) text += " " + src[++i].trim();
  body.push(new Paragraph({ children: runs(text) }));

  // After the intro paragraph, list the sections (the Markdown "Contents" line).
  if (body.length === 2) {
    const sections = src.filter((l) => l.startsWith("## ")).map((l) => l.slice(3));
    body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs("Contents") }));
    for (const s of sections) body.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: runs(s) }));
  }
}

const doc = new Document({
  creator: "StayDesk",
  title: "StayDesk admin manual",
  description: "How to run StayDesk from the admin panel",
  styles: {
    default: { document: { run: { font: FONT, size: 22 }, paragraph: { spacing: { after: 120, line: 276 } } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", run: { size: 48, bold: true, color: ACCENT, font: FONT }, paragraph: { spacing: { after: 200 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: ACCENT, font: FONT }, paragraph: { spacing: { before: 120, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: "1C1B18", font: FONT }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 270 } } } },
      ] },
      { reference: "steps", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } },
      ] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: PAGE_W, height: 16838 }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "StayDesk admin manual", font: FONT, size: 18, color: "8A857A" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: ["Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], font: FONT, size: 18, color: "8A857A" })] })] }) },
    children: body,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(out, buf);
  console.log("wrote", path.relative(root, out), buf.length, "bytes");
});
