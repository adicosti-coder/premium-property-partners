import jsPDF from "jspdf";
import { ensureInvestorGuideFonts } from "@/utils/pdf/ensureInvestorGuideFonts";
import { GUEST_REPUTATION, guestRatingLabel } from "@/lib/businessFacts";
import type { FiveYearProjection, SaleEstimate } from "@/lib/calculatorValuation";

export interface CalculatorReportInput {
  language: "ro" | "en";
  ownerName: string;
  location: string;
  propertyType: string;
  surface: number;
  intentLabel: string;
  refinements: string[];
  sale: SaleEstimate | null;
  saleSourceLabel: string;
  classicRent: number;
  netMin: number;
  netMax: number;
  netMid: number;
  nightlyRate: number;
  occupancy: number;
  yieldLabel: string;
  projection: FiveYearProjection;
  tips: string[];
  photoScore?: number | null;
}

const DARK = [26, 31, 54] as const;
const GOLD = [139, 105, 20] as const;
const GRAY = [110, 116, 128] as const;
const LIGHT = [249, 247, 242] as const;

const eur = (v: number) => `${Math.round(v).toLocaleString("ro-RO")} €`;

const COPY = {
  ro: {
    title: "Raport proprietate — vânzare, chirie și regim hotelier",
    prepared: (n: string) => `Pregătit pentru: ${n}`,
    property: "1. Proprietatea",
    estimates: "2. Cele trei estimări",
    projection: (y: number) => `3. Comparație la ${y} ani`,
    tips: "4. Ce poți îmbunătăți",
    location: "Locație", type: "Tip", surface: "Suprafață utilă", intent: "Intenție", features: "Dotări", photo: "Scor foto AI",
    sale: "Valoare estimată de vânzare", sqm: "Preț pe mp", rent: "Chirie clasică (lunar)", hotel: "Venit net regim hotelier (lunar)", yieldL: "Randament net anual",
    scenario: (n: number, o: number) => `Scenariu: ~${n} €/noapte, ocupare ${o}%`,
    saleToday: "Vânzare azi (sumă încasată)", hotel5: (y: number) => `Regim hotelier, ${y} ani (păstrezi proprietatea)`, rent5: (y: number) => `Chirie clasică, ${y} ani (păstrezi proprietatea)`,
    noSale: "evaluare individuală",
    disclaimer: "Estimări orientative, nu o garanție de venit sau o evaluare ANEVAR. Proiecția nu presupune creșteri de preț sau indexări. Administrare 15–20% din venitul net (brut minus comisioanele platformelor și utilitățile); menajul e plătit separat de oaspete; impozitele și reparațiile nu sunt incluse.",
    brand: (r: string, c: number) => `RealTrust & ApArt Hotel Timișoara · ${r} din peste ${c} de recenzii verificate`,
  },
  en: {
    title: "Property report — sale, long-term rent and short-term rental",
    prepared: (n: string) => `Prepared for: ${n}`,
    property: "1. The property",
    estimates: "2. The three estimates",
    projection: (y: number) => `3. ${y}-year comparison`,
    tips: "4. What you can improve",
    location: "Location", type: "Type", surface: "Usable area", intent: "Goal", features: "Features", photo: "AI photo score",
    sale: "Estimated sale value", sqm: "Price per sqm", rent: "Long-term rent (monthly)", hotel: "Short-term net income (monthly)", yieldL: "Annual net yield",
    scenario: (n: number, o: number) => `Scenario: ~€${n}/night, ${o}% occupancy`,
    saleToday: "Sell today (amount received)", hotel5: (y: number) => `Short-term rental, ${y} years (you keep the property)`, rent5: (y: number) => `Long-term rent, ${y} years (you keep the property)`,
    noSale: "individual assessment",
    disclaimer: "Indicative estimates, not an income guarantee or a certified valuation. The projection assumes no price growth or indexation. Management 15–20% of net income (gross minus platform fees and utilities); cleaning is paid separately by the guest; taxes and repairs are not included.",
    brand: (r: string, c: number) => `RealTrust & ApArt Hotel Timișoara · ${r} from over ${c} verified reviews`,
  },
} as const;

export async function generateCalculatorReportPdf(input: CalculatorReportInput): Promise<jsPDF> {
  const t = COPY[input.language];
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await ensureInvestorGuideFonts(doc);
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const m = 15;
  const innerW = w - m * 2;
  doc.setProperties({ title: t.title, author: "RealTrust Timișoara" });

  doc.setFillColor(...DARK);
  doc.rect(0, 0, w, 36, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text("RealTrust & ApArt Hotel", m, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(212, 175, 55);
  doc.text(t.brand(guestRatingLabel(input.language), GUEST_REPUTATION.reviewCount), m, 25);
  doc.setTextColor(200, 200, 205);
  doc.text(new Date().toLocaleDateString(input.language === "ro" ? "ro-RO" : "en-GB"), w - m, 16, { align: "right" });

  let y = 46;
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(doc.splitTextToSize(t.title, innerW), m, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(t.prepared(input.ownerName), m, y);
  y += 9;

  const ensure = (need: number) => { if (y + need > h - 22) { doc.addPage(); y = 22; } };
  const section = (label: string) => {
    ensure(18);
    doc.setTextColor(...DARK); doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
    doc.text(label, m, y); y += 2.5;
    doc.setDrawColor(...GOLD); doc.setLineWidth(0.6); doc.line(m, y, m + 26, y); y += 6;
  };
  const row = (label: string, value: string, bold = false) => {
    ensure(12);
    doc.setFillColor(...LIGHT); doc.roundedRect(m, y, innerW, 10, 2, 2, "F");
    doc.setTextColor(...GRAY); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    doc.text(label, m + 4, y + 6.6);
    doc.setTextColor(...DARK); doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(10);
    doc.text(value, w - m - 4, y + 6.6, { align: "right" });
    y += 12;
  };
  const para = (text: string, size = 9.5) => {
    doc.setFont("helvetica", "normal"); doc.setFontSize(size); doc.setTextColor(...GRAY);
    const lines = doc.splitTextToSize(text, innerW) as string[];
    ensure(lines.length * 4.6 + 2);
    doc.text(lines, m, y); y += lines.length * 4.6 + 2;
  };

  section(t.property);
  row(t.location, input.location);
  row(t.type, input.propertyType);
  row(t.surface, `${input.surface} mp`);
  row(t.intent, input.intentLabel);
  if (input.refinements.length) row(t.features, input.refinements.join(", ").slice(0, 70));
  if (input.photoScore != null) row(t.photo, `${input.photoScore}/100`);

  section(t.estimates);
  row(t.sale, input.sale ? `${eur(input.sale.min)} – ${eur(input.sale.max)}` : t.noSale, true);
  if (input.sale) row(t.sqm, `~${input.sale.eurSqm.toLocaleString("ro-RO")} €/mp · ${input.saleSourceLabel}`);
  row(t.rent, `~${eur(input.classicRent)}`, true);
  row(t.hotel, `${eur(input.netMin)} – ${eur(input.netMax)}`, true);
  row(t.yieldL, input.yieldLabel);
  para(t.scenario(input.nightlyRate, Math.round(input.occupancy * 100)));

  section(t.projection(input.projection.years));
  row(t.saleToday, input.sale ? eur(input.projection.saleToday) : t.noSale);
  row(t.hotel5(input.projection.years), eur(input.projection.hotelTotal), true);
  row(t.rent5(input.projection.years), eur(input.projection.classicTotal));

  if (input.tips.length) {
    section(t.tips);
    input.tips.forEach((tip) => para(`• ${tip}`));
  }

  y += 2;
  para(t.disclaimer, 8.5);
  doc.setFontSize(8); doc.setTextColor(...GRAY);
  doc.text("realtrust.ro · WhatsApp +40 799 069 256", w / 2, h - 10, { align: "center" });
  return doc;
}
