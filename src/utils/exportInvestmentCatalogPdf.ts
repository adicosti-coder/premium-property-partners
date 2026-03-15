import { supabase } from "@/integrations/supabase/client";

interface ExportOptions {
  language?: "ro" | "en";
  returnBlob?: boolean;
}

export const exportInvestmentCatalogPdf = async ({ language = "ro" }: ExportOptions = {}) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = 20;
  const isRo = language === "ro";

  await (await import("@/utils/pdf/ensureInvestorGuideFonts")).ensureInvestorGuideFonts(doc);

  // Fetch properties from DB
  const { data: properties } = await supabase
    .from("properties")
    .select("name, location, size, bedrooms, bathrooms, capacity, base_price_per_night, weekend_price_per_night, roi_percentage, estimated_revenue, tag, features, booking_rating, booking_review_count, description_ro, description_en, listing_type, capital_necesar, slug")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  const saleProperties = (properties ?? []).filter(p => p.listing_type === "sale" || p.tag === "Investiție");
  const rentalProperties = (properties ?? []).filter(p => p.listing_type !== "sale" && p.tag !== "Investiție");

  // — Helpers —
  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  const drawSectionHeader = (title: string) => {
    addNewPageIfNeeded(30);
    doc.setFillColor(212, 175, 55);
    doc.rect(margin, yPosition - 5, contentWidth, 12, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(title, margin + 5, yPosition + 3);
    yPosition += 18;
  };

  const drawParagraph = (text: string) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, contentWidth);
    addNewPageIfNeeded(lines.length * 5 + 5);
    doc.text(lines, margin, yPosition);
    yPosition += lines.length * 5 + 5;
  };

  const drawBulletPoint = (text: string) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const textLines = doc.splitTextToSize(text, contentWidth - 10);
    addNewPageIfNeeded(textLines.length * 5 + 3);
    doc.text("•", margin, yPosition);
    doc.text(textLines, margin + 7, yPosition);
    yPosition += textLines.length * 5 + 3;
  };

  const drawPropertyCard = (prop: typeof properties extends (infer T)[] | null ? T : never) => {
    if (!prop) return;
    const cardHeight = 55;
    addNewPageIfNeeded(cardHeight + 5);

    // Card background
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, yPosition - 3, contentWidth, cardHeight, 3, 3, "F");

    // Name
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(prop.name, margin + 5, yPosition + 6);

    // Location
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(prop.location, margin + 5, yPosition + 13);

    // ROI badge
    if (prop.roi_percentage) {
      doc.setFillColor(34, 139, 34);
      doc.roundedRect(margin + contentWidth - 50, yPosition - 1, 45, 10, 2, 2, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`ROI ${prop.roi_percentage}`, margin + contentWidth - 48, yPosition + 6);
    }

    // Details row
    const detailY = yPosition + 20;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);

    const details: string[] = [];
    if (prop.size) details.push(`${prop.size} m²`);
    if (prop.bedrooms) details.push(`${prop.bedrooms} ${isRo ? "camere" : "rooms"}`);
    if (prop.bathrooms) details.push(`${prop.bathrooms} ${isRo ? "băi" : "baths"}`);
    if (prop.capacity) details.push(`${prop.capacity} ${isRo ? "persoane" : "guests"}`);
    doc.text(details.join("  |  "), margin + 5, detailY);

    // Financial row
    const finY = detailY + 8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    const financials: string[] = [];
    if (prop.base_price_per_night) financials.push(`€${prop.base_price_per_night}/${isRo ? "noapte" : "night"}`);
    if (prop.capital_necesar) financials.push(`${isRo ? "Capital" : "Investment"}: €${prop.capital_necesar.toLocaleString()}`);
    if (prop.estimated_revenue) financials.push(`${isRo ? "Venit estimat" : "Est. revenue"}: ${prop.estimated_revenue}`);
    if (financials.length) doc.text(financials.join("  |  "), margin + 5, finY);

    // Rating
    if (prop.booking_rating) {
      const ratingY = finY + 8;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(212, 175, 55);
      doc.text(`★ ${prop.booking_rating}/10`, margin + 5, ratingY);
      if (prop.booking_review_count) {
        doc.setTextColor(120, 120, 120);
        doc.text(`(${prop.booking_review_count} ${isRo ? "recenzii" : "reviews"})`, margin + 35, ratingY);
      }
    }

    yPosition += cardHeight + 5;
  };

  // ========== COVER PAGE ==========
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  doc.setFillColor(212, 175, 55);
  doc.rect(0, 55, pageWidth, 3, "F");

  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(isRo ? "CATALOGUL DE INVESTIȚII" : "INVESTMENT CATALOG", pageWidth / 2, 85, { align: "center" });

  doc.setFontSize(24);
  doc.setTextColor(212, 175, 55);
  doc.text("TIMIȘOARA 2026", pageWidth / 2, 100, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text(
    isRo
      ? "Proprietăți cu Randament Garantat în Capitala Culturală"
      : "Properties with Guaranteed Returns in the Cultural Capital",
    pageWidth / 2, 120, { align: "center" }
  );

  // Stats
  const statsY = 150;
  const boxW = 50;
  const gap = 10;
  const totalW = boxW * 3 + gap * 2;
  const sx = (pageWidth - totalW) / 2;

  const stats = isRo
    ? [
        { value: String((saleProperties.length || 0) + (rentalProperties.length || 0)), label: "Proprietăți" },
        { value: "9.4%", label: "ROI Mediu" },
        { value: "85%", label: "Ocupare" },
      ]
    : [
        { value: String((saleProperties.length || 0) + (rentalProperties.length || 0)), label: "Properties" },
        { value: "9.4%", label: "Avg ROI" },
        { value: "85%", label: "Occupancy" },
      ];

  stats.forEach((s, i) => {
    const x = sx + i * (boxW + gap);
    doc.setFillColor(45, 45, 45);
    doc.roundedRect(x, statsY, boxW, 35, 3, 3, "F");
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(212, 175, 55);
    doc.text(s.value, x + boxW / 2, statsY + 15, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(s.label, x + boxW / 2, statsY + 27, { align: "center" });
  });

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("RealTrust Aparthotel", pageWidth / 2, pageHeight - 40, { align: "center" });
  doc.setFontSize(8);
  doc.text("www.realtrust.ro", pageWidth / 2, pageHeight - 32, { align: "center" });
  doc.setFillColor(212, 175, 55);
  doc.rect(0, pageHeight - 20, pageWidth, 3, "F");

  // ========== PAGE 2: WHY TIMIȘOARA ==========
  doc.addPage();
  yPosition = 25;

  drawSectionHeader(isRo ? "DE CE TIMIȘOARA ÎN 2026?" : "WHY TIMIȘOARA IN 2026?");

  drawParagraph(
    isRo
      ? "Timișoara, Capitala Culturală Europeană, oferă un mix unic de creștere economică, turism în expansiune și prețuri imobiliare încă accesibile comparativ cu alte capitale europene."
      : "Timișoara, European Capital of Culture, offers a unique mix of economic growth, expanding tourism and still affordable real estate prices compared to other European capitals."
  );

  const reasons = isRo
    ? [
        "Creștere turistică estimată de +40% datorită titlului de Capitală Culturală Europeană",
        "Al doilea hub IT din România — cerere constantă pentru închirieri pe termen scurt",
        "Randamente de 8-11% în regim hotelier vs 3-4% chirie clasică",
        "Prețuri de achiziție cu 30-50% sub București sau Cluj-Napoca",
        "Infrastructură modernizată: aeroport extins, tramvaie noi, regenerare urbană",
      ]
    : [
        "Estimated +40% tourism growth due to European Capital of Culture title",
        "Romania's second IT hub — constant demand for short-term rentals",
        "8-11% hotel-style yields vs 3-4% classic rental",
        "Purchase prices 30-50% below Bucharest or Cluj-Napoca",
        "Modernized infrastructure: expanded airport, new trams, urban regeneration",
      ];

  reasons.forEach((r) => drawBulletPoint(r));

  // ========== PAGE 3+: SALE PROPERTIES ==========
  if (saleProperties.length > 0) {
    doc.addPage();
    yPosition = 25;
    drawSectionHeader(isRo ? "PROPRIETĂȚI DISPONIBILE LA VÂNZARE" : "PROPERTIES AVAILABLE FOR SALE");
    drawParagraph(
      isRo
        ? "Apartamente selectate cu potențial dovedit de randament, gata de administrare în regim hotelier."
        : "Curated apartments with proven yield potential, ready for hotel-style management."
    );
    saleProperties.forEach((p) => drawPropertyCard(p));
  }

  // ========== RENTAL PORTFOLIO ==========
  if (rentalProperties.length > 0) {
    doc.addPage();
    yPosition = 25;
    drawSectionHeader(isRo ? "PORTOFOLIUL ACTIV — STUDII DE CAZ" : "ACTIVE PORTFOLIO — CASE STUDIES");
    drawParagraph(
      isRo
        ? "Proprietăți deja administrate de RealTrust cu rezultate reale. Aceste exemple demonstrează randamentele pe care le poți obține."
        : "Properties already managed by RealTrust with real results. These examples showcase the returns you can achieve."
    );
    rentalProperties.slice(0, 6).forEach((p) => drawPropertyCard(p));
  }

  // ========== FINANCIAL COMPARISON PAGE ==========
  doc.addPage();
  yPosition = 25;

  drawSectionHeader(isRo ? "ANALIZĂ FINANCIARĂ COMPARATIVĂ" : "COMPARATIVE FINANCIAL ANALYSIS");

  drawParagraph(
    isRo
      ? "Comparație între regimul hotelier administrat de RealTrust și chiria clasică, pe baza unui apartament de 2 camere în zona centrală (valoare: €140.000)."
      : "Comparison between RealTrust-managed hotel-style and classic rental, based on a 2-room apartment in the central area (value: €140,000)."
  );

  // Simple comparison table
  const colWidths = [contentWidth * 0.4, contentWidth * 0.3, contentWidth * 0.3];
  const tableStartX = margin;

  addNewPageIfNeeded(80);

  // Header row
  doc.setFillColor(30, 30, 30);
  doc.rect(tableStartX, yPosition, contentWidth, 8, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(isRo ? "Indicator" : "Indicator", tableStartX + 3, yPosition + 5);
  doc.text(isRo ? "Regim Hotelier" : "Hotel-style", tableStartX + colWidths[0] + 3, yPosition + 5);
  doc.text(isRo ? "Chirie Clasică" : "Classic Rent", tableStartX + colWidths[0] + colWidths[1] + 3, yPosition + 5);
  yPosition += 10;

  const rows = isRo
    ? [
        { label: "Preț mediu/noapte", h: "€65", c: "-" },
        { label: "Chirie lunară", h: "-", c: "€450" },
        { label: "Ocupare medie", h: "75%", c: "100%" },
        { label: "Venit brut/lună", h: "€1.460", c: "€450" },
        { label: "Cheltuieli operaționale", h: "-€365", c: "-€50" },
        { label: "Venit net/lună", h: "€1.095", c: "€400" },
        { label: "Venit net/an", h: "€13.140", c: "€4.800" },
        { label: "ROI anual", h: "9,4%", c: "3,4%" },
      ]
    : [
        { label: "Avg price/night", h: "€65", c: "-" },
        { label: "Monthly rent", h: "-", c: "€450" },
        { label: "Avg occupancy", h: "75%", c: "100%" },
        { label: "Gross income/month", h: "€1,460", c: "€450" },
        { label: "Operating costs", h: "-€365", c: "-€50" },
        { label: "Net income/month", h: "€1,095", c: "€400" },
        { label: "Net income/year", h: "€13,140", c: "€4,800" },
        { label: "Annual ROI", h: "9.4%", c: "3.4%" },
      ];

  rows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? 250 : 240;
    doc.setFillColor(bg, bg, bg);
    doc.rect(tableStartX, yPosition - 4, contentWidth, 8, "F");
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    doc.text(row.label, tableStartX + 3, yPosition + 1);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 139, 34);
    doc.text(row.h, tableStartX + colWidths[0] + 3, yPosition + 1);
    doc.setTextColor(100, 100, 100);
    doc.text(row.c, tableStartX + colWidths[0] + colWidths[1] + 3, yPosition + 1);
    yPosition += 8;
  });

  yPosition += 10;

  // Highlight
  addNewPageIfNeeded(25);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPosition - 3, contentWidth, 20, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 100, 100);
  doc.text(isRo ? "DIFERENȚĂ ANUALĂ" : "ANNUAL DIFFERENCE", margin + 5, yPosition + 3);
  doc.setFontSize(14);
  doc.setTextColor(34, 139, 34);
  doc.text("+€8.340", margin + 5, yPosition + 12);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(isRo ? "în favoarea regimului hotelier" : "in favor of hotel-style", margin + 50, yPosition + 12);
  yPosition += 30;

  // ========== CTA PAGE ==========
  doc.addPage();
  yPosition = 50;

  doc.setFillColor(30, 30, 30);
  doc.roundedRect(margin, yPosition, contentWidth, 100, 5, 5, "F");

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(isRo ? "ÎNCEPE SĂ INVESTEȘTI" : "START INVESTING", pageWidth / 2, yPosition + 20, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  const ctaText = isRo
    ? "Contactează-ne pentru o consultanță gratuită și analiză personalizată a oportunităților de investiție."
    : "Contact us for a free consultation and personalized investment opportunity analysis.";
  const ctaLines = doc.splitTextToSize(ctaText, contentWidth - 30);
  doc.text(ctaLines, pageWidth / 2, yPosition + 35, { align: "center" });

  doc.setFillColor(212, 175, 55);
  doc.roundedRect(pageWidth / 2 - 50, yPosition + 55, 100, 25, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(isRo ? "CONTACTEAZĂ-NE" : "CONTACT US", pageWidth / 2, yPosition + 71, { align: "center" });

  yPosition += 130;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Email: info@realtrust.ro", pageWidth / 2, yPosition, { align: "center" });
  doc.text("Tel: +40723154520", pageWidth / 2, yPosition + 12, { align: "center" });
  doc.text("Web: www.realtrust.ro", pageWidth / 2, yPosition + 24, { align: "center" });

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `© ${new Date().getFullYear()} RealTrust Aparthotel. ${isRo ? "Toate drepturile rezervate." : "All rights reserved."}`,
    pageWidth / 2, pageHeight - 15, { align: "center" }
  );

  const fileName = isRo
    ? "catalog-investitii-timisoara-2026.pdf"
    : "investment-catalog-timisoara-2026.pdf";
  doc.save(fileName);
};
