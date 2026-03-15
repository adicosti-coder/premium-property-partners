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

  // Gold CTA button (clickable)
  const btnW = 100;
  const btnH = 22;
  const btnX = (pageWidth - btnW) / 2;
  const btnY = cardY + 55;

  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(btnX, btnY, btnW, btnH, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.black);
  doc.text(isRo ? "CONTACTEAZĂ-NE" : "CONTACT US", pageWidth / 2, btnY + 14, { align: "center" });
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

  // WhatsApp CTA
  const waY = contactY + contactItems.length * 14 + 10;
  doc.setFillColor(37, 211, 102);
  const waBtnW = 80;
  doc.roundedRect((pageWidth - waBtnW) / 2, waY, waBtnW, 16, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text("WhatsApp", pageWidth / 2, waY + 10.5, { align: "center" });
  doc.link((pageWidth - waBtnW) / 2, waY, waBtnW, 16, { url: "https://wa.me/40723154520" });

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
