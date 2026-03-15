import type { PdfContext } from "../pdfTypes";
import { COLORS } from "../pdfTypes";

export const drawVisionPage = (ctx: PdfContext) => {
  const { doc, isRo, pageWidth, pageHeight, margin, contentWidth } = ctx;

  doc.addPage();

  // Full black background
  doc.setFillColor(...COLORS.black);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Top gold accent
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 0, pageWidth, 2, "F");

  // Decorative gold corners
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.6);
  doc.line(25, 18, 50, 18);
  doc.line(25, 18, 25, 43);
  doc.line(pageWidth - 50, 18, pageWidth - 25, 18);
  doc.line(pageWidth - 25, 18, pageWidth - 25, 43);

  // Section label
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.gold);
  doc.text(isRo ? "VIZIUNEA NOASTRĂ" : "OUR VISION", pageWidth / 2, 38, { align: "center" });

  // Gold separator
  const sepW = 50;
  doc.setFillColor(...COLORS.gold);
  doc.rect((pageWidth - sepW) / 2, 43, sepW, 0.6, "F");

  // Main vision statement
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  const visionTitle = isRo
    ? "Transformăm proprietăți în\ninvestiții cu randament garantat."
    : "We transform properties into\ninvestments with guaranteed returns.";
  doc.text(visionTitle, pageWidth / 2, 62, { align: "center" });

  // Vision description
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  const visionText = isRo
    ? "RealTrust Aparthotel este singura companie din vestul României care oferă administrare completă în regim hotelier — de la achiziție, la design interior, marketing, curățenie și operare zilnică. Proprietarii noștri câștigă în medie de 2.7x mai mult decât prin chiria tradițională."
    : "RealTrust Aparthotel is the only company in western Romania offering complete hotel-style management — from acquisition, to interior design, marketing, cleaning and daily operations. Our owners earn on average 2.7x more than through traditional rental.";
  const visionLines = doc.splitTextToSize(visionText, contentWidth - 30);
  doc.text(visionLines, pageWidth / 2, 90, { align: "center" });

  // Three pillars
  const pillarY = 120;
  const pillarW = 50;
  const pillarH = 60;
  const gap = 8;
  const totalW = pillarW * 3 + gap * 2;
  const startX = (pageWidth - totalW) / 2;

  const pillars = isRo
    ? [
        { num: "01", title: "ADMINISTRARE\nCOMPLETĂ", desc: "Gestionăm totul: listare, oaspeți, curățenie, mentenanță, raportare." },
        { num: "02", title: "RANDAMENT\nMAXIMIZAT", desc: "Strategii dinamice de preț, optimizare ocupare, marketing multi-canal." },
        { num: "03", title: "TRANSPARENȚĂ\nTOTALĂ", desc: "Dashboard proprietar cu rapoarte lunare, venituri și cheltuieli în timp real." },
      ]
    : [
        { num: "01", title: "FULL\nMANAGEMENT", desc: "We handle everything: listing, guests, cleaning, maintenance, reporting." },
        { num: "02", title: "MAXIMIZED\nRETURNS", desc: "Dynamic pricing strategies, occupancy optimization, multi-channel marketing." },
        { num: "03", title: "TOTAL\nTRANSPARENCY", desc: "Owner dashboard with monthly reports, real-time revenue and expenses." },
      ];

  pillars.forEach((p, i) => {
    const x = startX + i * (pillarW + gap);

    // Card background
    doc.setFillColor(...COLORS.anthracite);
    doc.roundedRect(x, pillarY, pillarW, pillarH, 3, 3, "F");

    // Gold top border
    doc.setFillColor(...COLORS.gold);
    doc.roundedRect(x, pillarY, pillarW, 2.5, 3, 3, "F");
    doc.setFillColor(...COLORS.anthracite);
    doc.rect(x, pillarY + 1.5, pillarW, 1.5, "F");

    // Number
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.gold);
    doc.text(p.num, x + pillarW / 2, pillarY + 14, { align: "center" });

    // Title
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(p.title, x + pillarW / 2, pillarY + 24, { align: "center" });

    // Description
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    const descLines = doc.splitTextToSize(p.desc, pillarW - 8);
    doc.text(descLines, x + pillarW / 2, pillarY + 38, { align: "center" });
  });

  // Bottom quote
  const quoteY = pillarY + pillarH + 25;
  doc.setFillColor(...COLORS.anthracite);
  doc.roundedRect(margin + 15, quoteY, contentWidth - 30, 30, 4, 4, "F");
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin + 15, quoteY, contentWidth - 30, 30, 4, 4, "S");

  // Gold quote marks
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.gold);
  doc.text("„", margin + 22, quoteY + 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...COLORS.white);
  const quote = isRo
    ? "Misiunea noastră este să facem investițiile imobiliare accesibile, profitabile și fără stres."
    : "Our mission is to make real estate investments accessible, profitable and stress-free.";
  const quoteLines = doc.splitTextToSize(quote, contentWidth - 70);
  doc.text(quoteLines, pageWidth / 2, quoteY + 13, { align: "center" });

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.gold);
  doc.text("— RealTrust Aparthotel", pageWidth / 2, quoteY + 24, { align: "center" });

  // Bottom gold line
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, pageHeight - 2, pageWidth, 2, "F");

  // Footer
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.darkGray);
  doc.text("RealTrust Aparthotel  •  www.realtrust.ro  •  info@realtrust.ro", pageWidth / 2, pageHeight - 5, { align: "center" });
};
