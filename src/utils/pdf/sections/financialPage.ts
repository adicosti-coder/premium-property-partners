import type { PdfContext } from "../pdfTypes";
import { COLORS } from "../pdfTypes";
import { drawSectionHeader, drawParagraph, addNewPageIfNeeded, drawPageFooter } from "../pdfHelpers";

export const drawFinancialPage = (ctx: PdfContext) => {
  const { doc, isRo, margin, contentWidth, pageWidth } = ctx;

  doc.addPage();
  ctx.yPosition = 20;

  drawSectionHeader(ctx, isRo ? "ANALIZĂ FINANCIARĂ COMPARATIVĂ" : "COMPARATIVE FINANCIAL ANALYSIS");
  drawParagraph(ctx,
    isRo
      ? "Comparație între regimul hotelier administrat de RealTrust și chiria clasică, pe baza unui apartament de 2 camere în zona centrală (valoare: €140.000)."
      : "Comparison between RealTrust-managed hotel-style and classic rental, based on a 2-room apartment in the central area (value: €140,000)."
  );

  ctx.yPosition += 5;

  // ========== BAR CHART ==========
  const chartX = margin + 10;
  const chartW = contentWidth - 20;
  const chartH = 80;
  const chartY = ctx.yPosition;

  addNewPageIfNeeded(ctx, chartH + 60);

  // Chart background
  doc.setFillColor(...COLORS.offWhite);
  doc.roundedRect(margin, chartY - 5, contentWidth, chartH + 55, 4, 4, "F");

  // Chart title
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.textPrimary);
  doc.text(isRo ? "Venit Net Anual (€)" : "Annual Net Income (€)", pageWidth / 2, chartY + 5, { align: "center" });

  const barAreaY = chartY + 15;
  const barAreaH = chartH - 15;
  const maxVal = 14000;

  // Y-axis grid lines and labels
  doc.setDrawColor(...COLORS.lightGray);
  doc.setLineWidth(0.2);
  const gridSteps = [0, 2000, 4000, 6000, 8000, 10000, 12000, 14000];
  gridSteps.forEach(val => {
    const y = barAreaY + barAreaH - (val / maxVal) * barAreaH;
    doc.line(chartX, y, chartX + chartW, y);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.gray);
    doc.text(`€${val.toLocaleString()}`, chartX - 2, y + 1.5, { align: "right" });
  });

  // Bars
  const barW = 35;
  const barsData = [
    {
      label: isRo ? "Regim Hotelier" : "Hotel-style",
      value: 13140,
      color: COLORS.gold,
    },
    {
      label: isRo ? "Chirie Clasică" : "Classic Rent",
      value: 4800,
      color: COLORS.anthraciteLight,
    },
  ];

  const barSpacing = chartW / 3;

  barsData.forEach((bar, i) => {
    const bx = chartX + barSpacing * (i + 1) - barW / 2;
    const barH = (bar.value / maxVal) * barAreaH;
    const by = barAreaY + barAreaH - barH;

    // Bar shadow
    doc.setFillColor(200, 200, 200);
    doc.roundedRect(bx + 1.5, by + 1.5, barW, barH, 2, 2, "F");

    // Bar itself
    doc.setFillColor(bar.color[0], bar.color[1], bar.color[2]);
    doc.roundedRect(bx, by, barW, barH, 2, 2, "F");

    // Value on top
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(bar.color[0], bar.color[1], bar.color[2]);
    doc.text(`€${bar.value.toLocaleString()}`, bx + barW / 2, by - 4, { align: "center" });

    // Label below
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.textPrimary);
    doc.text(bar.label, bx + barW / 2, barAreaY + barAreaH + 8, { align: "center" });
  });

  // Difference arrow/highlight
  const diffY = barAreaY + barAreaH + 16;
  doc.setFillColor(...COLORS.anthracite);
  doc.roundedRect(margin + 10, diffY, contentWidth - 20, 22, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.gold);
  doc.text(isRo ? "DIFERENȚĂ ANUALĂ:  +€8.340" : "ANNUAL DIFFERENCE:  +€8,340", pageWidth / 2, diffY + 9, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  doc.text(
    isRo ? "în favoarea regimului hotelier (+174% mai mult)" : "in favor of hotel-style (+174% more)",
    pageWidth / 2, diffY + 17, { align: "center" }
  );

  ctx.yPosition = diffY + 32;

  // ========== KEY METRICS TABLE ==========
  ctx.yPosition += 5;
  addNewPageIfNeeded(ctx, 55);

  const rows = isRo
    ? [
        { label: "Preț mediu/noapte", h: "€65", c: "—" },
        { label: "Ocupare medie", h: "75%", c: "100%" },
        { label: "Venit brut/lună", h: "€1.460", c: "€450" },
        { label: "Cheltuieli/lună", h: "€365", c: "€50" },
        { label: "ROI anual", h: "9,4%", c: "3,4%" },
      ]
    : [
        { label: "Avg price/night", h: "€65", c: "—" },
        { label: "Avg occupancy", h: "75%", c: "100%" },
        { label: "Gross income/mo", h: "€1,460", c: "€450" },
        { label: "Costs/mo", h: "€365", c: "€50" },
        { label: "Annual ROI", h: "9.4%", c: "3.4%" },
      ];

  const colWidths = [contentWidth * 0.4, contentWidth * 0.3, contentWidth * 0.3];

  doc.setFillColor(...COLORS.anthracite);
  doc.roundedRect(margin, ctx.yPosition, contentWidth, 9, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.white);
  doc.text(isRo ? "Indicator" : "Indicator", margin + 5, ctx.yPosition + 6);
  doc.text(isRo ? "Regim Hotelier" : "Hotel-style", margin + colWidths[0] + 5, ctx.yPosition + 6);
  doc.text(isRo ? "Chirie Clasică" : "Classic Rent", margin + colWidths[0] + colWidths[1] + 5, ctx.yPosition + 6);
  ctx.yPosition += 11;

  rows.forEach((row, idx) => {
    const bgColor = idx % 2 === 0 ? COLORS.offWhite : COLORS.white;
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.rect(margin, ctx.yPosition - 3, contentWidth, 8, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(row.label, margin + 5, ctx.yPosition + 2);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.green);
    doc.text(row.h, margin + colWidths[0] + 5, ctx.yPosition + 2);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(row.c, margin + colWidths[0] + colWidths[1] + 5, ctx.yPosition + 2);
    ctx.yPosition += 8;
  });

  drawPageFooter(ctx);

  // ========== PIE CHART PAGE — OPERATIONAL COSTS BREAKDOWN ==========
  doc.addPage();
  ctx.yPosition = 20;

  drawSectionHeader(ctx, isRo ? "DETALIEREA CHELTUIELILOR OPERAȚIONALE" : "OPERATIONAL COSTS BREAKDOWN");
  drawParagraph(ctx,
    isRo
      ? "Cheltuielile lunare tipice pentru un apartament de 2 camere administrat în regim hotelier (€365/lună)."
      : "Typical monthly expenses for a 2-room apartment managed in hotel-style (€365/month)."
  );

  ctx.yPosition += 5;

  const pieData = isRo
    ? [
        { label: "Curățenie", value: 35, color: COLORS.gold },
        { label: "Utilități", value: 20, color: COLORS.green },
        { label: "Comision platforme", value: 18, color: COLORS.anthraciteLight },
        { label: "Lenjerie & consumabile", value: 12, color: [100, 149, 237] as readonly [number, number, number] },
        { label: "Marketing", value: 8, color: COLORS.goldDark },
        { label: "Mentenanță", value: 7, color: COLORS.red },
      ]
    : [
        { label: "Cleaning", value: 35, color: COLORS.gold },
        { label: "Utilities", value: 20, color: COLORS.green },
        { label: "Platform fees", value: 18, color: COLORS.anthraciteLight },
        { label: "Linens & supplies", value: 12, color: [100, 149, 237] as readonly [number, number, number] },
        { label: "Marketing", value: 8, color: COLORS.goldDark },
        { label: "Maintenance", value: 7, color: COLORS.red },
      ];

  const total = pieData.reduce((s, d) => s + d.value, 0);
  const cx = pageWidth / 2 - 30;
  const cy = ctx.yPosition + 50;
  const radius = 40;
  const innerRadius = 20;

  // Draw donut chart
  let startAngle = -Math.PI / 2;
  pieData.forEach((slice) => {
    const sliceAngle = (slice.value / total) * 2 * Math.PI;
    const segments = Math.max(Math.ceil(sliceAngle / 0.05), 2);

    doc.setFillColor(slice.color[0], slice.color[1], slice.color[2]);

    for (let s = 0; s < segments; s++) {
      const a1 = startAngle + (sliceAngle * s) / segments;
      const a2 = startAngle + (sliceAngle * (s + 1)) / segments;
      const ox1 = cx + Math.cos(a1) * radius;
      const oy1 = cy + Math.sin(a1) * radius;
      const ox2 = cx + Math.cos(a2) * radius;
      const oy2 = cy + Math.sin(a2) * radius;
      const ix1 = cx + Math.cos(a1) * innerRadius;
      const iy1 = cy + Math.sin(a1) * innerRadius;
      const ix2 = cx + Math.cos(a2) * innerRadius;
      const iy2 = cy + Math.sin(a2) * innerRadius;

      doc.triangle(ox1, oy1, ox2, oy2, ix1, iy1, "F");
      doc.triangle(ox2, oy2, ix2, iy2, ix1, iy1, "F");
    }

    // Label line from mid-angle
    const midAngle = startAngle + sliceAngle / 2;
    const labelR = radius + 8;
    const lx = cx + Math.cos(midAngle) * labelR;
    const ly = cy + Math.sin(midAngle) * labelR;
    const extendX = lx + (Math.cos(midAngle) > 0 ? 12 : -12);

    doc.setDrawColor(slice.color[0], slice.color[1], slice.color[2]);
    doc.setLineWidth(0.4);
    doc.line(lx, ly, extendX, ly);

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(slice.color[0], slice.color[1], slice.color[2]);
    const labelAlign = Math.cos(midAngle) > 0 ? "left" : "right";
    const labelX = Math.cos(midAngle) > 0 ? extendX + 2 : extendX - 2;
    doc.text(`${slice.label} ${slice.value}%`, labelX, ly + 1.5, { align: labelAlign as any });

    startAngle += sliceAngle;
  });

  // Center text in donut
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.textPrimary);
  doc.text("€365", cx, cy - 2, { align: "center" });
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.gray);
  doc.text(isRo ? "/lună" : "/month", cx, cy + 5, { align: "center" });

  // Legend on the right
  const legendX = cx + radius + 35;
  let legendY = cy - 30;

  doc.setFillColor(...COLORS.offWhite);
  doc.roundedRect(legendX - 5, legendY - 8, 65, pieData.length * 11 + 10, 3, 3, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COLORS.textPrimary);
  doc.text(isRo ? "Cheltuieli lunare" : "Monthly costs", legendX, legendY);
  legendY += 8;

  pieData.forEach((slice) => {
    doc.setFillColor(slice.color[0], slice.color[1], slice.color[2]);
    doc.roundedRect(legendX, legendY - 3, 6, 6, 1, 1, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textSecondary);
    doc.text(`${slice.label}`, legendX + 9, legendY + 1);
    doc.setFont("helvetica", "bold");
    doc.text(`${slice.value}%`, legendX + 52, legendY + 1, { align: "right" });
    legendY += 11;
  });

  ctx.yPosition = cy + radius + 20;
  drawPageFooter(ctx);
};
