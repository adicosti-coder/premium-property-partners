import jsPDF from "jspdf";
import { ensureInvestorGuideFonts } from "@/utils/pdf/ensureInvestorGuideFonts";

export interface YieldReportInput {
  /** Average daily rate (EUR / night) */
  adr: number;
  /** Occupancy in percent (0-100) */
  occupancy: number;
  /** Cleaning fee per stay (EUR) — paid by the guest */
  cleaningCost: number;
  /** Management commission in percent of gross revenue */
  managementFee: number;
  /** Platform commission in percent of gross revenue */
  platformFee: number;
  /** Average stay length in nights */
  avgStayDuration: number;
  /** Derived values coming straight from the calculator */
  occupiedDays: number;
  numberOfStays: number;
  grossRevenue: number;
  cleaningCosts: number;
  managementCost: number;
  platformCost: number;
  totalCosts: number;
  netProfit: number;
  yearlyGross: number;
  yearlyNet: number;
  /** Optional owner name captured in the email dialog */
  ownerName?: string;
  language?: "ro" | "en";
}

const GOLD = [139, 105, 20] as const;
const DARK = [26, 31, 54] as const;
const GRAY = [110, 116, 128] as const;
const GREEN = [22, 163, 74] as const;
const LIGHT = [249, 247, 242] as const;

/** Standard net-yield assumption communicated across the site. */
const NET_YIELD_TARGET = 9.4;
/** Operational deduction (platform commissions + effective income tax + consumables). */
const OPERATIONAL_DEDUCTION = 27;

const eur = (value: number) =>
  `${Math.round(value).toLocaleString("ro-RO", { maximumFractionDigits: 0 })} EUR`;

const copy = {
  ro: {
    subtitle: "Raport de Randament Personalizat",
    preparedFor: (name?: string) => (name ? `Pregătit pentru: ${name}` : "Estimare pe baza simulării tale"),
    date: (d: string) => `Data raportului: ${d}`,
    assumptions: "1. Ipotezele simulării",
    monthly: "2. Venit lunar — brut vs. net",
    deductions: "3. Detalierea deducerilor",
    yearly: "4. Estimare pe 12 luni",
    transparency: "5. Cum ajungem la randamentul net",
    adr: "Tarif mediu pe noapte (ADR)",
    occupancy: "Grad de ocupare",
    stay: "Durata medie a sejurului",
    nights: "Nopți ocupate / lună",
    stays: "Rezervări estimate / lună",
    cleaning: "Taxă de curățenie / sejur (plătită de oaspete)",
    mgmtFee: "Comision administrare",
    platFee: "Comision platforme (Booking / Airbnb)",
    gross: "Venit brut din cazare",
    totalCosts: "Total costuri operaționale",
    net: "Venit net estimat (încasat de tine)",
    grossYear: "Venit brut / 12 luni",
    netYear: "Venit net / 12 luni",
    avgMonth: "Medie netă lunară",
    marginLabel: "Marja netă din venitul brut",
    transparencyBody: [
      `Deduceri operaționale — ${OPERATIONAL_DEDUCTION}%: comisioanele platformelor (Booking, Airbnb, Expedia), impozitul efectiv pe venit și consumabilele (produse de igienă, cafea, sare, ulei, lenjerie).`,
      "Taxa de curățenie este achitată separat de oaspeți la momentul rezervării, deci nu se scade din venitul tău.",
      `Utilitățile, întreținerea și comisionul de administrare se scad ulterior — de aceea randamentul-țintă de ${NET_YIELD_TARGET}% este venit curat (net), nu brut.`,
      "Cifrele din acest raport sunt estimări pe ipotezele alese de tine în calculator. Valoarea finală pentru apartamentul tău se stabilește după evaluarea gratuită.",
    ],
    footer: "RealTrust Timișoara — Regim Hotelier & Servicii Imobiliare · realtrust.ro · +40 733 558 454",
    fileName: "Raport-Randament-RealTrust.pdf",
    docTitle: "Raport de Randament Personalizat — RealTrust Timișoara",
  },
  en: {
    subtitle: "Personalised Yield Report",
    preparedFor: (name?: string) => (name ? `Prepared for: ${name}` : "Estimate based on your simulation"),
    date: (d: string) => `Report date: ${d}`,
    assumptions: "1. Simulation assumptions",
    monthly: "2. Monthly income — gross vs. net",
    deductions: "3. Deduction breakdown",
    yearly: "4. 12-month projection",
    transparency: "5. How we reach the net yield",
    adr: "Average daily rate (ADR)",
    occupancy: "Occupancy",
    stay: "Average stay length",
    nights: "Occupied nights / month",
    stays: "Estimated bookings / month",
    cleaning: "Cleaning fee / stay (paid by the guest)",
    mgmtFee: "Management commission",
    platFee: "Platform commission (Booking / Airbnb)",
    gross: "Gross accommodation revenue",
    totalCosts: "Total operating costs",
    net: "Estimated net income (paid to you)",
    grossYear: "Gross revenue / 12 months",
    netYear: "Net income / 12 months",
    avgMonth: "Average net per month",
    marginLabel: "Net margin of gross revenue",
    transparencyBody: [
      `Operational deduction — ${OPERATIONAL_DEDUCTION}%: platform commissions (Booking, Airbnb, Expedia), effective income tax and consumables (toiletries, coffee, salt, oil, linen).`,
      "The cleaning fee is paid separately by guests at booking time, so it is not deducted from your income.",
      `Utilities, maintenance and the management commission are subtracted afterwards — which is why the ${NET_YIELD_TARGET}% target yield is net income, not gross.`,
      "Figures are estimates based on the assumptions you selected in the calculator. Your final number is set after the free valuation.",
    ],
    footer: "RealTrust Timișoara — Short-Term Rental & Real Estate Services · realtrust.ro · +40 733 558 454",
    fileName: "RealTrust-Yield-Report.pdf",
    docTitle: "Personalised Yield Report — RealTrust Timișoara",
  },
} as const;

export const yieldReportFileName = (language: "ro" | "en" = "ro") => copy[language].fileName;

/**
 * Builds the personalised yield report PDF (gross vs net, deductions,
 * commissions and a 12-month projection) from the live calculator state.
 */
export const generateYieldReportPdf = async (input: YieldReportInput): Promise<jsPDF> => {
  const language = input.language ?? "ro";
  const t = copy[language];
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureInvestorGuideFonts(doc);

  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const margin = 15;
  const innerW = w - margin * 2;

  doc.setProperties({ title: t.docTitle, author: "RealTrust Timișoara" });

  // ── Header ───────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, w, 34, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RealTrust", margin, 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(212, 175, 55);
  doc.text("Regim Hotelier Timișoara", margin, 25);
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(t.subtitle, w - margin, 17, { align: "right" });
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 205);
  doc.text(t.date(new Date().toLocaleDateString(language === "ro" ? "ro-RO" : "en-GB")), w - margin, 25, {
    align: "right",
  });

  let y = 46;
  doc.setTextColor(...GRAY);
  doc.setFontSize(10);
  doc.text(t.preparedFor(input.ownerName), margin, y);
  y += 10;

  const sectionTitle = (label: string) => {
    if (y > h - 45) {
      doc.addPage();
      y = 25;
    }
    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(label, margin, y);
    y += 3;
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + 28, y);
    y += 7;
  };

  const row = (label: string, value: string, opts: { color?: readonly number[]; bold?: boolean } = {}) => {
    if (y > h - 30) {
      doc.addPage();
      y = 25;
    }
    doc.setFillColor(...LIGHT);
    doc.roundedRect(margin, y, innerW, 12, 2, 2, "F");
    doc.setTextColor(...GRAY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(label, margin + 5, y + 7.8);
    const color = opts.color ?? DARK;
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(10.5);
    doc.text(value, w - margin - 5, y + 7.8, { align: "right" });
    y += 14;
  };

  // ── 1. Assumptions ───────────────────────────────────────────────────
  sectionTitle(t.assumptions);
  row(t.adr, `${input.adr} EUR`);
  row(t.occupancy, `${input.occupancy}%`);
  row(t.stay, `${input.avgStayDuration} ${language === "ro" ? "nopți" : "nights"}`);
  row(t.nights, `${input.occupiedDays} / 30`);
  row(t.stays, `${input.numberOfStays}`);
  row(t.cleaning, `${input.cleaningCost} EUR`);
  row(t.mgmtFee, `${input.managementFee}%`);
  row(t.platFee, `${input.platformFee}%`);
  y += 4;

  // ── 2. Monthly gross vs net ──────────────────────────────────────────
  sectionTitle(t.monthly);
  row(t.gross, eur(input.grossRevenue), { bold: true });
  row(t.totalCosts, `- ${eur(input.totalCosts)}`);
  row(t.net, eur(input.netProfit), { color: GREEN, bold: true });

  const margin_pct = input.grossRevenue > 0 ? (input.netProfit / input.grossRevenue) * 100 : 0;
  row(t.marginLabel, `${margin_pct.toFixed(1)}%`, { color: GREEN, bold: true });
  y += 4;

  // ── 3. Deductions ────────────────────────────────────────────────────
  sectionTitle(t.deductions);
  row(t.platFee, `- ${eur(input.platformCost)}`);
  row(t.mgmtFee, `- ${eur(input.managementCost)}`);
  row(
    language === "ro"
      ? "Curățenie (recuperată din taxa plătită de oaspeți)"
      : "Cleaning (recovered from the guest-paid fee)",
    `- ${eur(input.cleaningCosts)}`,
  );
  row(t.totalCosts, `- ${eur(input.totalCosts)}`, { bold: true });
  y += 4;

  // ── 4. 12-month projection ───────────────────────────────────────────
  sectionTitle(t.yearly);
  row(t.grossYear, eur(input.yearlyGross), { bold: true });
  row(t.netYear, eur(input.yearlyNet), { color: GREEN, bold: true });
  row(t.avgMonth, `${eur(input.yearlyNet / 12)} / ${language === "ro" ? "lună" : "month"}`, { color: GREEN });
  y += 4;

  // ── 5. Transparency ──────────────────────────────────────────────────
  sectionTitle(t.transparency);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  for (const paragraph of t.transparencyBody) {
    const lines = doc.splitTextToSize(`• ${paragraph}`, innerW);
    if (y + lines.length * 5 > h - 28) {
      doc.addPage();
      y = 25;
    }
    doc.text(lines, margin, y);
    y += lines.length * 5 + 3;
  }

  // ── Footer on every page ─────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(230, 228, 222);
    doc.setLineWidth(0.4);
    doc.line(margin, h - 18, w - margin, h - 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(t.footer, margin, h - 12);
    doc.text(`${page} / ${pages}`, w - margin, h - 12, { align: "right" });
  }

  return doc;
};
