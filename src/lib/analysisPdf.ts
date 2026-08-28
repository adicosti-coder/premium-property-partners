import jsPDF from "jspdf";
import type { ListingAnalysis } from "@/components/analiza/AiListingAnalyzer";

// jsPDF standard fonts are WinAnsi-only, so Romanian diacritics must be folded
// to their ASCII equivalents to avoid broken glyphs in the exported report.
const ascii = (input: string) =>
  input
    .replace(/ă|â|à|á/g, "a")
    .replace(/Ă|Â|À|Á/g, "A")
    .replace(/î|ï|í/g, "i")
    .replace(/Î|Ï|Í/g, "I")
    .replace(/ș|ş/g, "s")
    .replace(/Ș|Ş/g, "S")
    .replace(/ț|ţ/g, "t")
    .replace(/Ț|Ţ/g, "T")
    .replace(/é|è|ê/g, "e")
    .replace(/É|È|Ê/g, "E")
    .replace(/ó|ö/g, "o")
    .replace(/ü|ú/g, "u")
    .replace(/[^\x20-\x7E\n]/g, "");

const NAVY = [15, 41, 66] as const;
const GOLD = [212, 175, 55] as const;
const GREY = [110, 118, 128] as const;

const num = (n: number | null | undefined, suffix = "") =>
  typeof n === "number" && Number.isFinite(n)
    ? `${Math.round(n).toLocaleString("ro-RO")}${suffix}`
    : "-";

export interface AnalysisPdfInput {
  analysis: ListingAnalysis;
  sourceUrl?: string | null;
  mode?: "url" | "photos";
  photoCount?: number;
  shareUrl?: string | null;
  createdAt?: string | null;
}

export function generateAnalysisPdf(input: AnalysisPdfInput): jsPDF {
  const a = input.analysis;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = 0;

  const ensure = (needed: number) => {
    if (y + needed > pageH - 70) {
      doc.addPage();
      y = margin;
    }
  };

  const heading = (text: string) => {
    ensure(34);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(ascii(text), margin, y);
    y += 6;
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(1.5);
    doc.line(margin, y, margin + 60, y);
    y += 14;
  };

  const paragraph = (text: string, size = 10, color = GREY) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(ascii(text), contentW) as string[];
    lines.forEach((line) => {
      ensure(size + 6);
      doc.text(line, margin, y);
      y += size + 4;
    });
  };

  const bullets = (items: string[], marker = "\u2022") => {
    items.forEach((item) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      const lines = doc.splitTextToSize(ascii(item), contentW - 16) as string[];
      lines.forEach((line, i) => {
        ensure(16);
        if (i === 0) {
          doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
          doc.text(marker, margin, y);
          doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        }
        doc.text(line, margin + 14, y);
        y += 14;
      });
      y += 2;
    });
  };

  // ---- Header band ----
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, pageW, 92, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("RealTrust", margin, 44);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setFontSize(11);
  doc.text("Analiza potential regim hotelier - Timisoara", margin, 64);
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  const dateLabel = new Date(input.createdAt || Date.now()).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  doc.text(ascii(dateLabel), pageW - margin, 44, { align: "right" });
  doc.text("realtrust.ro", pageW - margin, 64, { align: "right" });

  y = 126;

  // ---- Title / source ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  const titleLines = doc.splitTextToSize(
    ascii(a.titlu || "Proprietate analizata"),
    contentW,
  ) as string[];
  titleLines.slice(0, 3).forEach((line) => {
    doc.text(line, margin, y);
    y += 20;
  });
  y += 2;
  paragraph(
    [
      a.zona ? `Zona: ${a.zona}` : null,
      a.tip_proprietate ? `Tip: ${a.tip_proprietate}` : null,
      a.camere ? `Camere: ${a.camere}` : null,
      a.suprafata ? `Suprafata: ${num(a.suprafata, " mp")}` : null,
      a.pret_listare ? `Pret listare: ${num(a.pret_listare)} ${a.moneda || "EUR"}` : null,
      input.mode === "photos" ? `Fotografii analizate: ${input.photoCount || 0}` : null,
    ]
      .filter(Boolean)
      .join("  |  "),
    9,
  );
  if (input.sourceUrl) paragraph(`Sursa anunt: ${input.sourceUrl}`, 8);

  // ---- KPI cards ----
  y += 8;
  const cards = [
    { label: "Scor AI", value: `${num(a.scor)}/${a.max_scor || 100}` },
    { label: "Tarif / noapte", value: num(a.tarif_noapte, " RON") },
    { label: "ROI estimat", value: a.roi_estimat || "-" },
  ];
  const cardW = (contentW - 16) / 3;
  ensure(64);
  cards.forEach((c, i) => {
    const x = margin + i * (cardW + 8);
    doc.setDrawColor(226, 230, 236);
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(x, y, cardW, 54, 6, 6, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(ascii(c.label.toUpperCase()), x + 10, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(ascii(String(c.value)), x + 10, y + 40);
  });
  y += 66;

  // ---- 1. Potential randament ----
  heading("1. Potential randament");
  if (a.verdict) paragraph(a.verdict);
  if (a.puncte_forte?.length) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    ensure(16);
    doc.text("Puncte forte", margin, y);
    y += 14;
    bullets(a.puncte_forte.slice(0, 6));
  }
  if (a.riscuri?.length) {
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    ensure(16);
    doc.text("Riscuri / atentionari", margin, y);
    y += 14;
    bullets(a.riscuri.slice(0, 6), "!");
  }

  // ---- 2. Comparabile zona ----
  if (a.comparabile_zona?.length) {
    heading("2. Comparabile in zona");
    a.comparabile_zona.slice(0, 6).forEach((c) => {
      ensure(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text(ascii(c.denumire || "Proprietate similara"), margin, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(
        ascii(
          `${num(c.tarif_noapte, " RON/noapte")}${
            c.ocupare_estimata ? ` | ocupare ${c.ocupare_estimata}` : ""
          }`,
        ),
        pageW - margin,
        y,
        { align: "right" },
      );
      y += 14;
      if (c.observatie) paragraph(c.observatie, 9);
      y += 4;
    });
  }

  // ---- 3. Recomandari ----
  if (a.recomandari?.length) {
    heading("3. Recomandari de optimizare");
    a.recomandari.slice(0, 8).forEach((r, i) => bullets([`${i + 1}. ${r}`], " "));
  }

  // ---- 4. Estimare venit lunar ----
  heading("4. Estimare venit lunar");
  ensure(60);
  const incomes = [
    { label: "Venit brut / luna", value: num(a.venit_lunar_brut, " RON") },
    { label: "Venit net / luna", value: num(a.venit_lunar_net, " RON") },
  ];
  const incW = (contentW - 8) / 2;
  incomes.forEach((c, i) => {
    const x = margin + i * (incW + 8);
    doc.setDrawColor(226, 230, 236);
    doc.setFillColor(i === 1 ? 246 : 252, i === 1 ? 250 : 252, i === 1 ? 244 : 253);
    doc.roundedRect(x, y, incW, 52, 6, 6, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(ascii(c.label.toUpperCase()), x + 12, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(ascii(c.value), x + 12, y + 40);
  });
  y += 64;

  paragraph(
    "Estimarile folosesc 75% grad de ocupare si 27% deducere management/taxe. Sunt orientative si nu reprezinta o oferta contractuala. Analiza umana detaliata este livrata in 24h lucratoare.",
    8,
  );
  if (input.shareUrl) paragraph(`Link analiza: ${input.shareUrl}`, 8);

  // ---- Footer on every page ----
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(226, 230, 236);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 48, pageW - margin, pageH - 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text("RealTrust - administrare in regim hotelier, Timisoara | contact@realtrust.ro", margin, pageH - 32);
    doc.text(`${p} / ${pages}`, pageW - margin, pageH - 32, { align: "right" });
  }

  return doc;
}

export function downloadAnalysisPdf(input: AnalysisPdfInput) {
  const doc = generateAnalysisPdf(input);
  const slug = (input.analysis.zona || "timisoara")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "timisoara";
  doc.save(`analiza-realtrust-${slug}.pdf`);
}
