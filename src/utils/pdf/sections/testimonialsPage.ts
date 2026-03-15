import type { PdfContext } from "../pdfTypes";
import { COLORS } from "../pdfTypes";
import { drawSectionHeader, drawPageFooter } from "../pdfHelpers";

export const drawTestimonialsPage = (ctx: PdfContext) => {
  const { doc, isRo, pageWidth, margin, contentWidth } = ctx;

  doc.addPage();
  ctx.yPosition = 20;

  drawSectionHeader(ctx, isRo ? "CE SPUN CLIENȚII NOȘTRI" : "WHAT OUR CLIENTS SAY");

  ctx.yPosition += 5;

  const testimonials = isRo
    ? [
        {
          name: "Andrei M.",
          role: "Proprietar — 2 apartamente",
          stars: 5,
          text: "De când lucrez cu RealTrust, venitul meu lunar a crescut cu 174% față de chiria clasică. Totul este transparent, primesc rapoarte detaliate și nu trebuie să mă ocup de nimic.",
          months: 14,
        },
        {
          name: "Maria P.",
          role: "Investitor — 1 apartament",
          stars: 5,
          text: "Am cumpărat apartamentul prin recomandarea lor și în 3 luni era deja listat și genera venit. ROI-ul a depășit 9% în primul an. Recomand cu încredere!",
          months: 11,
        },
        {
          name: "Cristian D.",
          role: "Proprietar — 3 apartamente",
          stars: 5,
          text: "Echipa RealTrust gestionează totul impecabil — de la curățenie la comunicarea cu oaspeții. Rating-ul meu pe Booking.com este constant peste 9.5.",
          months: 18,
        },
      ]
    : [
        {
          name: "Andrei M.",
          role: "Owner — 2 apartments",
          stars: 5,
          text: "Since working with RealTrust, my monthly income increased by 174% compared to classic rental. Everything is transparent, I receive detailed reports and don't have to manage anything.",
          months: 14,
        },
        {
          name: "Maria P.",
          role: "Investor — 1 apartment",
          stars: 5,
          text: "I bought the apartment based on their recommendation and in 3 months it was already listed and generating income. ROI exceeded 9% in the first year. Highly recommended!",
          months: 11,
        },
        {
          name: "Cristian D.",
          role: "Owner — 3 apartments",
          stars: 5,
          text: "The RealTrust team manages everything impeccably — from cleaning to guest communication. My Booking.com rating is consistently above 9.5.",
          months: 18,
        },
      ];

  const cardW = contentWidth;
  const cardH = 48;
  const gap = 8;

  testimonials.forEach((t, i) => {
    const y = ctx.yPosition;

    // Card shadow
    doc.setFillColor(190, 190, 190);
    doc.roundedRect(margin + 1.5, y + 1.5, cardW, cardH, 4, 4, "F");

    // Card background
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(margin, y, cardW, cardH, 4, 4, "F");

    // Gold left accent
    doc.setFillColor(...COLORS.gold);
    doc.roundedRect(margin, y, 4, cardH, 4, 0, "F");
    doc.setFillColor(...COLORS.white);
    doc.rect(margin + 2, y, 2, cardH, "F");

    // Quote icon
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.gold);
    doc.text("„", margin + 8, y + 13);

    // Stars
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gold);
    const stars = "★".repeat(t.stars);
    doc.text(stars, margin + cardW - 8, y + 10, { align: "right" });

    // Testimonial text
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...COLORS.textSecondary);
    const textLines = doc.splitTextToSize(t.text, cardW - 24);
    doc.text(textLines, margin + 18, y + 13);

    // Name and role
    const infoY = y + cardH - 8;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textPrimary);
    doc.text(t.name, margin + 10, infoY);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(`${t.role}  •  ${t.months} ${isRo ? "luni client" : "months client"}`, margin + 10 + doc.getTextWidth(t.name) + 5, infoY);

    ctx.yPosition += cardH + gap;
  });

  // Bottom trust badge
  ctx.yPosition += 5;
  const badgeW = contentWidth - 40;
  const badgeH = 20;
  const badgeX = (pageWidth - badgeW) / 2;

  doc.setFillColor(...COLORS.anthracite);
  doc.roundedRect(badgeX, ctx.yPosition, badgeW, badgeH, 3, 3, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.gold);
  doc.text(
    isRo ? "★ 9.6 / 10 RATING MEDIU PE BOOKING.COM  •  500+ RECENZII" : "★ 9.6 / 10 AVERAGE BOOKING.COM RATING  •  500+ REVIEWS",
    pageWidth / 2, ctx.yPosition + 12.5, { align: "center" }
  );

  drawPageFooter(ctx);
};
