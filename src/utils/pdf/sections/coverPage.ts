import type { PdfContext, PropertyRow } from "../pdfTypes";
import { COLORS } from "../pdfTypes";

export const drawCoverPage = (ctx: PdfContext, saleProps: PropertyRow[], rentalProps: PropertyRow[]) => {
  const { doc, pageWidth, pageHeight, isRo } = ctx;

  // Full black background
  doc.setFillColor(...COLORS.black);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Top gold accent line
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 0, pageWidth, 2, "F");

  // Decorative gold corner elements
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  // Top-left corner
  doc.line(20, 15, 40, 15);
  doc.line(20, 15, 20, 35);
  // Top-right corner
  doc.line(pageWidth - 40, 15, pageWidth - 20, 15);
  doc.line(pageWidth - 20, 15, pageWidth - 20, 35);
  // Bottom-left corner
  doc.line(20, pageHeight - 35, 20, pageHeight - 15);
  doc.line(20, pageHeight - 15, 40, pageHeight - 15);
  // Bottom-right corner
  doc.line(pageWidth - 20, pageHeight - 35, pageWidth - 20, pageHeight - 15);
  doc.line(pageWidth - 40, pageHeight - 15, pageWidth - 20, pageHeight - 15);

  // Brand label
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.gold);
  doc.text("REALTRUST APARTHOTEL", pageWidth / 2, 50, { align: "center" });

  // Thin gold separator
  const sepW = 60;
  doc.setFillColor(...COLORS.gold);
  doc.rect((pageWidth - sepW) / 2, 56, sepW, 0.8, "F");

  // Main title
  doc.setFontSize(30);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text(isRo ? "CATALOGUL DE" : "INVESTMENT", pageWidth / 2, 80, { align: "center" });
  doc.setTextColor(...COLORS.gold);
  doc.text(isRo ? "INVESTIȚII" : "CATALOG", pageWidth / 2, 94, { align: "center" });

  // Subtitle
  doc.setFontSize(20);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.white);
  doc.text("TIMIȘOARA 2026", pageWidth / 2, 115, { align: "center" });

  // Tagline
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray);
  doc.text(
    isRo
      ? "Proprietăți cu Randament Garantat în Capitala Culturală Europeană"
      : "Properties with Guaranteed Returns in the European Cultural Capital",
    pageWidth / 2, 130, { align: "center" }
  );

  // Stats boxes with premium styling
  const statsY = 155;
  const boxW = 48;
  const gap = 8;
  const totalW = boxW * 3 + gap * 2;
  const sx = (pageWidth - totalW) / 2;
  const totalProps = saleProps.length + rentalProps.length;

  const stats = isRo
    ? [
        { value: String(totalProps), label: "Proprietăți\nAdministrate", icon: "🏠" },
        { value: "9.4%", label: "ROI Mediu\nAnual", icon: "📈" },
        { value: "85%", label: "Rată de\nOcupare", icon: "📊" },
      ]
    : [
        { value: String(totalProps), label: "Managed\nProperties", icon: "🏠" },
        { value: "9.4%", label: "Average\nAnnual ROI", icon: "📈" },
        { value: "85%", label: "Occupancy\nRate", icon: "📊" },
      ];

  stats.forEach((s, i) => {
    const x = sx + i * (boxW + gap);
    // Dark card with gold border
    doc.setFillColor(...COLORS.anthracite);
    doc.roundedRect(x, statsY, boxW, 45, 3, 3, "F");
    doc.setDrawColor(...COLORS.gold);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, statsY, boxW, 45, 3, 3, "S");

    // Value in gold
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.gold);
    doc.text(s.value, x + boxW / 2, statsY + 18, { align: "center" });

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    const labelLines = doc.splitTextToSize(s.label, boxW - 8);
    doc.text(labelLines, x + boxW / 2, statsY + 28, { align: "center" });
  });

  // Bottom section
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.darkGray);
  doc.text("www.realtrust.ro", pageWidth / 2, pageHeight - 30, { align: "center" });
  doc.textWithLink("www.realtrust.ro", pageWidth / 2 - 15, pageHeight - 30, { url: "https://www.realtrust.ro" });

  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `© ${new Date().getFullYear()} RealTrust Aparthotel`,
    pageWidth / 2, pageHeight - 22, { align: "center" }
  );

  // Bottom gold line
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, pageHeight - 2, pageWidth, 2, "F");
};
