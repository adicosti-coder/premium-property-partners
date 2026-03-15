import type { PdfContext } from "../pdfTypes";
import { COLORS } from "../pdfTypes";

export const drawCtaPage = (ctx: PdfContext) => {
  const { doc, isRo, pageWidth, pageHeight, margin, contentWidth } = ctx;

  doc.addPage();

  // Full anthracite background
  doc.setFillColor(...COLORS.anthracite);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Top gold line
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, 0, pageWidth, 2, "F");

  // Decorative gold corners
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.6);
  doc.line(25, 20, 50, 20);
  doc.line(25, 20, 25, 45);
  doc.line(pageWidth - 50, 20, pageWidth - 25, 20);
  doc.line(pageWidth - 25, 20, pageWidth - 25, 45);

  // CTA Card
  const cardW = contentWidth - 20;
  const cardH = 90;
  const cardX = (pageWidth - cardW) / 2;
  const cardY = 60;

  doc.setFillColor(...COLORS.black);
  doc.roundedRect(cardX, cardY, cardW, cardH, 5, 5, "F");
  doc.setDrawColor(...COLORS.gold);
  doc.setLineWidth(0.8);
  doc.roundedRect(cardX, cardY, cardW, cardH, 5, 5, "S");

  // CTA Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.gold);
  doc.text(isRo ? "ÎNCEPE SĂ INVESTEȘTI" : "START INVESTING", pageWidth / 2, cardY + 22, { align: "center" });

  // CTA subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  const ctaText = isRo
    ? "Contactează-ne pentru o consultanță gratuită și analiză personalizată a oportunităților de investiție."
    : "Contact us for a free consultation and personalized investment opportunity analysis.";
  const ctaLines = doc.splitTextToSize(ctaText, cardW - 30);
  doc.text(ctaLines, pageWidth / 2, cardY + 36, { align: "center" });

  // Gold CTA button with pulse/glow effect (double border + shadow)
  const btnW = 110;
  const btnH = 24;
  const btnX = (pageWidth - btnW) / 2;
  const btnY = cardY + 53;

  // Outer glow ring
  doc.setFillColor(212, 175, 55);
  doc.roundedRect(btnX - 3, btnY - 3, btnW + 6, btnH + 6, 6, 6, "F");
  // Dark gap
  doc.setFillColor(...COLORS.black);
  doc.roundedRect(btnX - 1.5, btnY - 1.5, btnW + 3, btnH + 3, 5, 5, "F");
  // Main button
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(btnX, btnY, btnW, btnH, 4, 4, "F");
  // Inner highlight
  doc.setFillColor(230, 200, 80);
  doc.roundedRect(btnX + 2, btnY + 1, btnW - 4, btnH / 2 - 1, 3, 3, "F");
  // Re-draw main gradient area
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(btnX + 2, btnY + btnH / 2 - 2, btnW - 4, btnH / 2 + 1, 0, 0, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  doc.text(isRo ? "▶ CONTACTEAZĂ-NE" : "▶ CONTACT US", pageWidth / 2, btnY + 16, { align: "center" });
  doc.link(btnX, btnY, btnW, btnH, { url: "https://www.realtrust.ro/contact" });

  // Contact details
  const contactY = cardY + cardH + 25;

  const contactItems = [
    { icon: "📧", label: "Email:", value: "info@realtrust.ro", url: "mailto:info@realtrust.ro" },
    { icon: "📞", label: "Tel:", value: "+40 723 154 520", url: "tel:+40723154520" },
    { icon: "🌐", label: "Web:", value: "www.realtrust.ro", url: "https://www.realtrust.ro" },
  ];

  contactItems.forEach((item, i) => {
    const y = contactY + i * 14;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(`${item.label}`, pageWidth / 2 - 25, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.gold);
    doc.text(item.value, pageWidth / 2 + 5, y);
    doc.link(pageWidth / 2 + 5, y - 3.5, 60, 5, { url: item.url });
  });

  // WhatsApp CTA with glow effect
  const waY = contactY + contactItems.length * 14 + 10;
  const waBtnW = 90;
  const waBtnX = (pageWidth - waBtnW) / 2;

  // Green glow ring
  doc.setFillColor(37, 211, 102);
  doc.roundedRect(waBtnX - 2.5, waY - 2.5, waBtnW + 5, 23, 5, 5, "F");
  doc.setFillColor(...COLORS.anthracite);
  doc.roundedRect(waBtnX - 1, waY - 1, waBtnW + 2, 20, 4, 4, "F");
  doc.setFillColor(37, 211, 102);
  doc.roundedRect(waBtnX, waY, waBtnW, 18, 3, 3, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("▶ WhatsApp", pageWidth / 2, waY + 12, { align: "center" });
  doc.link(waBtnX, waY, waBtnW, 18, { url: "https://wa.me/40723154520" });

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `© ${new Date().getFullYear()} RealTrust Aparthotel. ${isRo ? "Toate drepturile rezervate." : "All rights reserved."}`,
    pageWidth / 2, pageHeight - 15, { align: "center" }
  );

  // Bottom gold line
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, pageHeight - 2, pageWidth, 2, "F");
};
