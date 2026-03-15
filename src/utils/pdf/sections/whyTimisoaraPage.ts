import type { PdfContext } from "../pdfTypes";
import { COLORS } from "../pdfTypes";
import { drawSectionHeader, drawParagraph, drawPageFooter } from "../pdfHelpers";

export const drawWhyTimisoaraPage = (ctx: PdfContext) => {
  const { doc, isRo, margin, contentWidth } = ctx;
  doc.addPage();
  ctx.yPosition = 20;

  drawSectionHeader(ctx, isRo ? "DE CE TIMIȘOARA ÎN 2026?" : "WHY TIMIȘOARA IN 2026?");

  drawParagraph(ctx,
    isRo
      ? "Timișoara, Capitala Culturală Europeană, oferă un mix unic de creștere economică, turism în expansiune și prețuri imobiliare încă accesibile comparativ cu alte capitale europene."
      : "Timișoara, European Capital of Culture, offers a unique mix of economic growth, expanding tourism and still affordable real estate prices compared to other European capitals."
  );

  ctx.yPosition += 3;

  const reasons = isRo
    ? [
        { icon: "📈", title: "Creștere Turistică +40%", desc: "Datorită titlului de Capitală Culturală Europeană" },
        { icon: "💻", title: "Al Doilea Hub IT", desc: "Cerere constantă pentru închirieri pe termen scurt" },
        { icon: "💰", title: "Randamente 8-11%", desc: "Vs 3-4% chirie clasică — diferență masivă de profit" },
        { icon: "🏷️", title: "Prețuri Accesibile", desc: "Cu 30-50% sub București sau Cluj-Napoca" },
        { icon: "🚀", title: "Infrastructură Modernă", desc: "Aeroport extins, tramvaie noi, regenerare urbană" },
      ]
    : [
        { icon: "📈", title: "+40% Tourism Growth", desc: "Due to European Capital of Culture title" },
        { icon: "💻", title: "2nd IT Hub in Romania", desc: "Constant demand for short-term rentals" },
        { icon: "💰", title: "8-11% Yields", desc: "Vs 3-4% classic rental — massive profit difference" },
        { icon: "🏷️", title: "Affordable Prices", desc: "30-50% below Bucharest or Cluj-Napoca" },
        { icon: "🚀", title: "Modern Infrastructure", desc: "Expanded airport, new trams, urban regeneration" },
      ];

  // Draw reason cards in a two-column layout
  const cardW = (contentWidth - 6) / 2;
  const cardH = 28;

  reasons.forEach((r, i) => {
    const col = i % 2;
    if (col === 0 && ctx.yPosition + cardH + 5 > ctx.pageHeight - 25) {
      doc.addPage();
      ctx.yPosition = 20;
    }
    const x = margin + col * (cardW + 6);
    const y = ctx.yPosition;

    // Card bg
    doc.setFillColor(...COLORS.offWhite);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "F");
    // Left gold accent
    doc.setFillColor(...COLORS.gold);
    doc.roundedRect(x, y, 3, cardH, 2, 0, "F");
    doc.rect(x + 1.5, y, 1.5, cardH, "F");

    // Title
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textPrimary);
    doc.text(r.title, x + 8, y + 10);

    // Description
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textSecondary);
    const descLines = doc.splitTextToSize(r.desc, cardW - 14);
    doc.text(descLines, x + 8, y + 18);

    if (col === 1) {
      ctx.yPosition += cardH + 5;
    }
  });

  // If odd number, advance position
  if (reasons.length % 2 !== 0) {
    ctx.yPosition += cardH + 5;
  }

  drawPageFooter(ctx, 2);
};
