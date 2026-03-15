import type { PdfContext } from "./pdfTypes";
import { COLORS } from "./pdfTypes";

export const addNewPageIfNeeded = (ctx: PdfContext, requiredSpace: number) => {
  if (ctx.yPosition + requiredSpace > ctx.pageHeight - 20) {
    ctx.doc.addPage();
    ctx.yPosition = 20;
  }
};

export const drawPageFooter = (ctx: PdfContext, pageNum?: number) => {
  const { doc, pageWidth, pageHeight } = ctx;
  // Gold bottom line
  doc.setFillColor(...COLORS.gold);
  doc.rect(0, pageHeight - 8, pageWidth, 2, "F");
  // Footer text
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  doc.text("RealTrust Aparthotel  •  www.realtrust.ro  •  info@realtrust.ro", pageWidth / 2, pageHeight - 3, { align: "center" });
  if (pageNum) {
    doc.text(String(pageNum), pageWidth - ctx.margin, pageHeight - 3, { align: "right" });
  }
};

export const drawSectionHeader = (ctx: PdfContext, title: string) => {
  const { doc, margin, contentWidth } = ctx;
  addNewPageIfNeeded(ctx, 25);
  // Gold accent bar
  doc.setFillColor(...COLORS.gold);
  doc.rect(margin, ctx.yPosition, 4, 14, "F");
  // Title
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.textPrimary);
  doc.text(title, margin + 10, ctx.yPosition + 10);
  // Subtle underline
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.3);
  doc.line(margin, ctx.yPosition + 16, margin + contentWidth, ctx.yPosition + 16);
  ctx.yPosition += 22;
};

export const drawParagraph = (ctx: PdfContext, text: string, maxWidth?: number) => {
  const { doc, margin, contentWidth } = ctx;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.textSecondary);
  const lines = doc.splitTextToSize(text, maxWidth ?? contentWidth);
  addNewPageIfNeeded(ctx, lines.length * 4.5 + 4);
  doc.text(lines, margin, ctx.yPosition);
  ctx.yPosition += lines.length * 4.5 + 4;
};

/** Draws a soft shadow effect behind a rounded rect */
export const drawCardShadow = (ctx: PdfContext, x: number, y: number, w: number, h: number, r: number) => {
  const { doc } = ctx;
  // Multi-layer shadow
  for (let i = 3; i >= 1; i--) {
    const alpha = 8 + i * 4;
    doc.setFillColor(200 - alpha, 200 - alpha, 200 - alpha);
    doc.roundedRect(x + i * 0.7, y + i * 0.7, w, h, r, r, "F");
  }
};

export const getPropertyImageUrl = (ctx: PdfContext, prop: { image_path: string | null; images: string[] | null }): string | null => {
  if (prop.image_path) {
    if (prop.image_path.startsWith("http")) return prop.image_path;
    return `${ctx.supabaseUrl}/storage/v1/object/public/property-images/${prop.image_path}`;
  }
  if (prop.images && prop.images.length > 0) {
    const img = prop.images[0];
    if (img.startsWith("http")) return img;
    return `${ctx.supabaseUrl}/storage/v1/object/public/property-images/${img}`;
  }
  return null;
};
