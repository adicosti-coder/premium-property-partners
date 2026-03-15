import type { PdfContext, PropertyRow } from "../pdfTypes";
import { COLORS } from "../pdfTypes";
import { drawSectionHeader, drawParagraph, drawCardShadow, drawPageFooter, getPropertyImageUrl, addNewPageIfNeeded } from "../pdfHelpers";

const drawPropertyCard = (ctx: PdfContext, prop: PropertyRow, x: number, y: number, cardW: number) => {
  const { doc, isRo, imageCache } = ctx;
  const cardH = 115;
  const imgH = 45;
  const r = 4;

  // Shadow + card bg
  drawCardShadow(ctx, x, y, cardW, cardH, r);
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(x, y, cardW, cardH, r, r, "F");
  // Gold top border
  doc.setFillColor(...COLORS.gold);
  doc.roundedRect(x, y, cardW, 3, r, r, "F");
  doc.setFillColor(...COLORS.white);
  doc.rect(x, y + 2, cardW, 2, "F");

  // Image area
  const imgUrl = getPropertyImageUrl(ctx, prop);
  const imgB64 = imgUrl ? imageCache.get(imgUrl) : null;
  if (imgB64) {
    try {
      // Clip to card width with rounded top
      doc.setFillColor(230, 230, 230);
      doc.rect(x + 1, y + 3, cardW - 2, imgH, "F");
      doc.addImage(imgB64, "JPEG", x + 1, y + 3, cardW - 2, imgH);
    } catch {
      // Fallback gray placeholder
      doc.setFillColor(230, 230, 230);
      doc.rect(x + 1, y + 3, cardW - 2, imgH, "F");
      doc.setFontSize(8);
      doc.setTextColor(...COLORS.gray);
      doc.text("📷", x + cardW / 2 - 3, y + 3 + imgH / 2);
    }
  } else {
    doc.setFillColor(...COLORS.anthracite);
    doc.rect(x + 1, y + 3, cardW - 2, imgH, "F");
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.gold);
    doc.text("🏠", x + cardW / 2 - 5, y + 3 + imgH / 2 + 3);
  }

  // ROI badge on image
  if (prop.roi_percentage) {
    const badgeW = 32;
    const badgeH = 10;
    doc.setFillColor(...COLORS.green);
    doc.roundedRect(x + cardW - badgeW - 4, y + 6, badgeW, badgeH, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.white);
    doc.text(`ROI ${prop.roi_percentage}`, x + cardW - badgeW - 2, y + 13);
  }

  let textY = y + imgH + 8;

  // Name
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.textPrimary);
  const nameLines = doc.splitTextToSize(prop.name, cardW - 8);
  doc.text(nameLines[0], x + 5, textY);
  textY += 5;

  // Location (clickable)
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gold);
  const locText = `📍 ${prop.location}`;
  doc.text(locText, x + 5, textY);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prop.location + ", Timișoara")}`;
  doc.link(x + 5, textY - 3, cardW - 10, 5, { url: mapsUrl });
  textY += 6;

  // Details row
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.textSecondary);
  const details: string[] = [];
  if (prop.size) details.push(`${prop.size}m²`);
  if (prop.bedrooms) details.push(`${prop.bedrooms} ${isRo ? "cam" : "bed"}`);
  if (prop.bathrooms) details.push(`${prop.bathrooms} ${isRo ? "băi" : "bath"}`);
  if (prop.capacity) details.push(`${prop.capacity} ${isRo ? "pers" : "guests"}`);
  if (details.length) {
    doc.text(details.join("  •  "), x + 5, textY);
    textY += 5;
  }

  // Financial info with gold accent
  doc.setFillColor(252, 249, 240);
  doc.roundedRect(x + 3, textY - 2, cardW - 6, 16, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.textPrimary);

  if (prop.base_price_per_night) {
    doc.text(`€${prop.base_price_per_night}/${isRo ? "noapte" : "night"}`, x + 6, textY + 4);
  }
  if (prop.capital_necesar) {
    doc.setTextColor(...COLORS.anthraciteLight);
    doc.text(`${isRo ? "Capital" : "Invest"}: €${prop.capital_necesar.toLocaleString()}`, x + 6, textY + 10);
  }

  // Rating on right side
  if (prop.booking_rating) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.gold);
    doc.text(`★ ${prop.booking_rating}`, x + cardW - 25, textY + 4);
    if (prop.booking_review_count) {
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.gray);
      doc.text(`${prop.booking_review_count} rev`, x + cardW - 25, textY + 10);
    }
  }

  return cardH;
};

export const drawPropertiesPages = (ctx: PdfContext, properties: PropertyRow[], type: "sale" | "rental") => {
  const { doc, isRo, margin, contentWidth } = ctx;

  doc.addPage();
  ctx.yPosition = 20;

  if (type === "sale") {
    drawSectionHeader(ctx, isRo ? "PROPRIETĂȚI DISPONIBILE LA VÂNZARE" : "PROPERTIES AVAILABLE FOR SALE");
    drawParagraph(ctx,
      isRo
        ? "Apartamente selectate cu potențial dovedit de randament, gata de administrare în regim hotelier."
        : "Curated apartments with proven yield potential, ready for hotel-style management."
    );
  } else {
    drawSectionHeader(ctx, isRo ? "PORTOFOLIUL ACTIV — STUDII DE CAZ" : "ACTIVE PORTFOLIO — CASE STUDIES");
    drawParagraph(ctx,
      isRo
        ? "Proprietăți deja administrate de RealTrust cu rezultate reale."
        : "Properties already managed by RealTrust with real results."
    );
  }

  // 2-column grid layout
  const cardW = (contentWidth - 6) / 2;
  const cardH = 115;
  const gapX = 6;
  const gapY = 8;

  const propsToShow = type === "rental" ? properties.slice(0, 6) : properties;

  propsToShow.forEach((prop, i) => {
    const col = i % 2;
    if (col === 0) {
      addNewPageIfNeeded(ctx, cardH + gapY + 5);
    }
    const x = margin + col * (cardW + gapX);
    const y = ctx.yPosition;

    drawPropertyCard(ctx, prop, x, y, cardW);

    if (col === 1 || i === propsToShow.length - 1) {
      ctx.yPosition += cardH + gapY;
    }
  });

  drawPageFooter(ctx);
};
