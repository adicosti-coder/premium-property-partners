import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

type ExportPost = {
  title: string;
  type: string;
  status: string;
  posted_to: string[];
  source_url: string;
  caption: string;
  created_at: string;
  scheduled_at: string | null;
};

// Brand colors from design tokens (HSL converted to RGB)
const COLORS = {
  primary: [23, 37, 63] as [number, number, number],       // --primary 222 47% 11%
  accent: [234, 179, 31] as [number, number, number],       // --accent 43 96% 56%
  muted: [113, 119, 132] as [number, number, number],       // --muted-foreground
  background: [245, 246, 248] as [number, number, number],  // --background
  white: [255, 255, 255] as [number, number, number],
  success: [39, 163, 105] as [number, number, number],
  border: [226, 228, 233] as [number, number, number],
};

function translateStatus(status: string): string {
  switch (status) {
    case "draft": return "Ciornă";
    case "scheduled": return "Programat";
    case "posted": return "Postat";
    default: return status;
  }
}

function translateType(type: string): string {
  return type === "property" ? "Proprietate" : "Blog";
}

export function exportPdfReport(posts: ExportPost[], filename: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = new Date();

  // ─── Cover Page ───
  // Dark header block
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 85, "F");

  // Accent bar
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 85, pageWidth, 3, "F");

  // Title
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text("Raport Social Media", 20, 42);

  // Subtitle
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text("Motor Social — Analiză & Performanță", 20, 55);

  // Date
  doc.setFontSize(11);
  doc.setTextColor(140, 155, 180);
  doc.text(`Generat: ${format(now, "dd MMMM yyyy, HH:mm")}`, 20, 68);

  // Stats section
  const statsY = 105;
  const draftCount = posts.filter(p => p.status === "draft").length;
  const scheduledCount = posts.filter(p => p.status === "scheduled").length;
  const postedCount = posts.filter(p => p.status === "posted").length;
  const propertyCount = posts.filter(p => p.type === "property").length;
  const blogCount = posts.filter(p => p.type === "blog").length;

  const stats = [
    { label: "Total Postări", value: posts.length.toString(), color: COLORS.primary },
    { label: "Ciorne", value: draftCount.toString(), color: COLORS.muted },
    { label: "Programate", value: scheduledCount.toString(), color: COLORS.accent },
    { label: "Postate", value: postedCount.toString(), color: COLORS.success },
    { label: "Proprietăți", value: propertyCount.toString(), color: COLORS.primary },
    { label: "Articole Blog", value: blogCount.toString(), color: COLORS.primary },
  ];

  const cardWidth = 40;
  const cardGap = 6;
  const totalCardsWidth = stats.length * cardWidth + (stats.length - 1) * cardGap;
  const startX = (pageWidth - totalCardsWidth) / 2;

  stats.forEach((stat, i) => {
    const x = startX + i * (cardWidth + cardGap);

    // Card background
    doc.setFillColor(...COLORS.white);
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, statsY, cardWidth, 42, 3, 3, "FD");

    // Accent top line
    doc.setFillColor(...(stat.color as [number, number, number]));
    doc.rect(x + 8, statsY + 2, cardWidth - 16, 1.5, "F");

    // Value
    doc.setTextColor(...(stat.color as [number, number, number]));
    doc.setFontSize(28);
    doc.setFont("helvetica", "bold");
    doc.text(stat.value, x + cardWidth / 2, statsY + 24, { align: "center" });

    // Label
    doc.setTextColor(...COLORS.muted);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(stat.label, x + cardWidth / 2, statsY + 34, { align: "center" });
  });

  // Footer
  doc.setTextColor(...COLORS.muted);
  doc.setFontSize(8);
  doc.text("RealTrust Automation — Motor Social", 20, pageHeight - 10);
  doc.text(`Pagina 1`, pageWidth - 20, pageHeight - 10, { align: "right" });

  // ─── Data Table Page(s) ───
  doc.addPage("a4", "landscape");

  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 18, "F");
  doc.setFillColor(...COLORS.accent);
  doc.rect(0, 18, pageWidth, 1.5, "F");

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Detalii Postări", 20, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  doc.text(`${posts.length} postări • ${format(now, "dd.MM.yyyy")}`, pageWidth - 20, 12, { align: "right" });

  // Table
  const tableData = posts.map((p) => [
    p.title.length > 40 ? p.title.substring(0, 40) + "…" : p.title,
    translateType(p.type),
    translateStatus(p.status),
    p.posted_to.length > 0 ? p.posted_to.join(", ") : "—",
    (p.caption || "").length > 60 ? (p.caption || "").substring(0, 60) + "…" : (p.caption || "—"),
    format(new Date(p.created_at), "dd.MM.yyyy"),
    p.scheduled_at ? format(new Date(p.scheduled_at), "dd.MM.yyyy HH:mm") : "—",
  ]);

  autoTable(doc, {
    startY: 25,
    head: [["Titlu", "Tip", "Status", "Platforme", "Descriere", "Creat", "Programat"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: 8,
      fontStyle: "bold",
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [40, 50, 70],
      lineColor: COLORS.border,
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: [248, 249, 251],
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 22 },
      2: { cellWidth: 22 },
      3: { cellWidth: 28 },
      4: { cellWidth: 80 },
      5: { cellWidth: 25 },
      6: { cellWidth: 30 },
    },
    margin: { left: 15, right: 15 },
    didParseCell: (data) => {
      // Color-code status cells
      if (data.section === "body" && data.column.index === 2) {
        const val = data.cell.raw as string;
        if (val === "Postat") {
          data.cell.styles.textColor = COLORS.success;
          data.cell.styles.fontStyle = "bold";
        } else if (val === "Programat") {
          data.cell.styles.textColor = COLORS.accent;
          data.cell.styles.fontStyle = "bold";
        } else if (val === "Ciornă") {
          data.cell.styles.textColor = COLORS.muted;
        }
      }
    },
    didDrawPage: (data) => {
      const pageNum = doc.getCurrentPageInfo().pageNumber;
      // Footer on each table page
      doc.setTextColor(...COLORS.muted);
      doc.setFontSize(8);
      doc.text("RealTrust Automation — Motor Social", 20, pageHeight - 8);
      doc.text(`Pagina ${pageNum}`, pageWidth - 20, pageHeight - 8, { align: "right" });

      // Header bar on continuation pages
      if (data.pageNumber > 1) {
        doc.setFillColor(...COLORS.primary);
        doc.rect(0, 0, pageWidth, 14, "F");
        doc.setFillColor(...COLORS.accent);
        doc.rect(0, 14, pageWidth, 1, "F");
        doc.setTextColor(...COLORS.white);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Detalii Postări (continuare)", 20, 10);
      }
    },
  });

  // Save
  doc.save(`${filename}_${format(now, "yyyy-MM-dd")}.pdf`);
}
