import jsPDF from "jspdf";

interface LeadData {
  title: string;
  original_price: number;
  extra_profit_3y: number;
  monthly_extra: number;
  lead_score: number;
  url: string;
  status: string;
  created_at: string;
}

const formatPrice = (price: number) =>
  price?.toLocaleString("ro-RO", { maximumFractionDigits: 0 }) + " €";

export function generateLeadAnalysisPdf(lead: LeadData): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const gold = [139, 105, 20] as const;
  const dark = [26, 31, 54] as const;
  const gray = [100, 100, 100] as const;
  const green = [22, 163, 74] as const;

  // Header bar
  doc.setFillColor(...gold);
  doc.rect(0, 0, w, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("RealTrust", 15, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Fisa de Analiza - Lead Convertit", w - 15, 20, { align: "right" });

  let y = 48;

  // Title
  doc.setTextColor(...dark);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(lead.title, w - 30);
  doc.text(titleLines, 15, y);
  y += titleLines.length * 8 + 8;

  // Score badge
  doc.setFillColor(lead.lead_score > 80 ? 220 : 200, lead.lead_score > 80 ? 38 : 200, lead.lead_score > 80 ? 38 : 200);
  doc.roundedRect(15, y, 50, 12, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(`Scor: ${lead.lead_score}${lead.lead_score > 80 ? " 🔥" : ""}`, 40, y + 8, { align: "center" });
  y += 22;

  // Divider
  doc.setDrawColor(...gold);
  doc.setLineWidth(0.5);
  doc.line(15, y, w - 15, y);
  y += 10;

  // Data rows
  const rows: [string, string, number[]][] = [
    ["Pret original", formatPrice(lead.original_price), [...dark]],
    ["Profit extra 3 ani", "+" + formatPrice(lead.extra_profit_3y), [...green]],
    ["Extra lunar", "+" + formatPrice(lead.monthly_extra) + "/luna", [...green]],
    ["Status", lead.status.toUpperCase(), [...dark]],
    ["Data identificare", new Date(lead.created_at).toLocaleDateString("ro-RO"), [...gray]],
  ];

  for (const [label, value, color] of rows) {
    doc.setFillColor(249, 247, 242);
    doc.roundedRect(15, y, w - 30, 14, 2, 2, "F");

    doc.setTextColor(...gray);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(label, 20, y + 9);

    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(value, w - 20, y + 9, { align: "right" });

    y += 18;
  }

  y += 5;

  // URL
  doc.setTextColor(...gray);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Sursa:", 15, y);
  doc.setTextColor(...gold);
  const urlLines = doc.splitTextToSize(lead.url, w - 40);
  doc.text(urlLines, 30, y);
  y += urlLines.length * 5 + 10;

  // Footer
  doc.setDrawColor(...gold);
  doc.line(15, y, w - 15, y);
  y += 8;
  doc.setTextColor(...gray);
  doc.setFontSize(8);
  doc.text(`Generat automat de RealTrust AI Scraper — ${new Date().toLocaleDateString("ro-RO")}`, w / 2, y, { align: "center" });

  return doc;
}

export function downloadLeadAnalysisPdf(lead: LeadData) {
  const doc = generateLeadAnalysisPdf(lead);
  const safeName = lead.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  doc.save(`RealTrust_Lead_${safeName}.pdf`);
}
