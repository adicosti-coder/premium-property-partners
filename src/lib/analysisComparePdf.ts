import jsPDF from "jspdf";

// jsPDF standard fonts are WinAnsi-only → fold Romanian diacritics to ASCII.
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

export interface CompareScenario {
  title: string;
  subtitle: string;
  gross: number;
  net: number;
  yearly: number;
  yieldPct: number | null;
}

export interface ComparePdfInput {
  title?: string | null;
  zone?: string | null;
  scenarios: CompareScenario[];
  diffMonthRon: number;
  diffMonthEur: number;
  diffYearEur: number;
  diffPct: number | null;
  yieldGapPp: number | null;
  shareUrl?: string | null;
  createdAt?: string | null;
}

export function generateComparePdf(input: ComparePdfInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;

  // Header band
  doc.setFillColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.rect(0, 0, pageW, 92, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("RealTrust", margin, 44);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setFontSize(11);
  doc.text("Comparatie: regim hotelier vs. chirie termen lung", margin, 64);
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(
    ascii(
      new Date(input.createdAt || Date.now()).toLocaleDateString("ro-RO", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    ),
    pageW - margin,
    44,
    { align: "right" },
  );
  doc.text("realtrust.ro", pageW - margin, 64, { align: "right" });

  let y = 126;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  const titleLines = doc.splitTextToSize(
    ascii(input.title || "Proprietate analizata"),
    contentW,
  ) as string[];
  titleLines.slice(0, 2).forEach((line) => {
    doc.text(line, margin, y);
    y += 20;
  });

  if (input.zone) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.text(ascii(`Zona: ${input.zone}`), margin, y);
    y += 16;
  }

  // ---- Differential badges ----
  y += 6;
  const badges = [
    input.diffPct !== null
      ? `${input.diffMonthRon >= 0 ? "+" : "-"}${Math.abs(Math.round(input.diffPct))}% venit net`
      : null,
    `Surplus lunar ${input.diffMonthRon >= 0 ? "+" : "-"}${num(Math.abs(input.diffMonthEur), " EUR")}`,
    `Surplus anual ${input.diffMonthRon >= 0 ? "+" : "-"}${num(Math.abs(input.diffYearEur), " EUR")}`,
    input.yieldGapPp !== null
      ? `Randament ${input.yieldGapPp >= 0 ? "+" : "-"}${Math.abs(input.yieldGapPp)
          .toFixed(1)
          .replace(".", ",")} pp`
      : null,
  ].filter(Boolean) as string[];

  let bx = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  badges.forEach((b) => {
    const label = ascii(b);
    const w = doc.getTextWidth(label) + 20;
    if (bx + w > pageW - margin) {
      bx = margin;
      y += 26;
    }
    doc.setFillColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.roundedRect(bx, y, w, 20, 10, 10, "F");
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(label, bx + 10, y + 14);
    bx += w + 8;
  });
  y += 42;

  // ---- Scenario cards ----
  const cardW = (contentW - 12) / Math.max(input.scenarios.length, 1);
  const cardH = 168;
  input.scenarios.forEach((s, i) => {
    const x = margin + i * (cardW + 12);
    doc.setDrawColor(226, 230, 236);
    doc.setFillColor(249, 250, 252);
    doc.roundedRect(x, y, cardW, cardH, 8, 8, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
    doc.text(ascii(s.title), x + 14, y + 26);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc
      .splitTextToSize(ascii(s.subtitle), cardW - 28)
      .slice(0, 2)
      .forEach((line: string, li: number) => doc.text(line, x + 14, y + 42 + li * 11));

    const rows = [
      ["Venit brut / luna", num(s.gross, " RON")],
      ["Venit net / luna", num(s.net, " RON")],
      ["Venit net / an", num(s.yearly, " RON")],
      [
        "Randament net",
        s.yieldPct !== null && Number.isFinite(s.yieldPct)
          ? `${s.yieldPct.toFixed(1).replace(".", ",")}%`
          : "-",
      ],
    ];
    let ry = y + 78;
    rows.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.text(ascii(label), x + 14, ry);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
      doc.text(ascii(value), x + cardW - 14, ry, { align: "right" });
      ry += 20;
    });
  });
  y += cardH + 24;

  // ---- Conclusion ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(NAVY[0], NAVY[1], NAVY[2]);
  doc.text("Concluzie", margin, y);
  y += 6;
  doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.setLineWidth(1.5);
  doc.line(margin, y, margin + 60, y);
  y += 18;

  const conclusion =
    input.diffMonthRon >= 0
      ? `Regimul hotelier aduce cu ${num(input.diffMonthRon, " RON")} mai mult net pe luna${
          input.diffPct !== null ? ` (+${Math.round(input.diffPct)}%)` : ""
        }, adica ${num(input.diffMonthRon * 12, " RON")} pe an, comparativ cu chiria pe termen lung.`
      : `La chiria introdusa, termenul lung este mai avantajos cu ${num(
          Math.abs(input.diffMonthRon),
          " RON",
        )} net pe luna. Cu optimizari de tarif si ocupare, regimul hotelier poate depasi acest nivel.`;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  (doc.splitTextToSize(ascii(conclusion), contentW) as string[]).forEach((line) => {
    doc.text(line, margin, y);
    y += 14;
  });
  y += 10;

  (
    doc.splitTextToSize(
      ascii(
        "Estimarile folosesc 75% grad de ocupare si 27% deducere management/taxe pentru regim hotelier, respectiv 10% cheltuieli/impozit pentru chirie clasica. Curs orientativ 1 EUR = 5 RON. Nu reprezinta o oferta contractuala.",
      ),
      contentW,
    ) as string[]
  ).forEach((line) => {
    doc.setFontSize(8);
    doc.text(line, margin, y);
    y += 11;
  });

  if (input.shareUrl) {
    y += 6;
    doc.setFontSize(8);
    doc.text(ascii(`Link analiza: ${input.shareUrl}`), margin, y);
  }

  // Footer
  doc.setDrawColor(226, 230, 236);
  doc.setLineWidth(0.5);
  doc.line(margin, pageH - 48, pageW - margin, pageH - 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(GREY[0], GREY[1], GREY[2]);
  doc.text(
    "RealTrust - administrare in regim hotelier, Timisoara | contact@realtrust.ro",
    margin,
    pageH - 32,
  );

  return doc;
}

export function downloadComparePdf(input: ComparePdfInput) {
  const doc = generateComparePdf(input);
  const slug =
    (input.zone || "timisoara")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "timisoara";
  doc.save(`comparatie-realtrust-${slug}.pdf`);
}
