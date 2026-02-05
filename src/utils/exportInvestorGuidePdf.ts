import { jsPDF } from "jspdf";

interface ExportOptions {
  language?: "ro" | "en";
}

export const exportInvestorGuidePdf = ({ language = "ro" }: ExportOptions = {}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = 20;

  const isRo = language === "ro";

  // Helper functions
  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
      doc.addPage();
      yPosition = 20;
    }
  };

  const drawSectionHeader = (emoji: string, title: string) => {
    addNewPageIfNeeded(30);
    doc.setFillColor(212, 175, 55); // Gold color
    doc.rect(margin, yPosition - 5, contentWidth, 12, "F");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`${emoji} ${title}`, margin + 5, yPosition + 3);
    yPosition += 18;
  };

  const drawSubsection = (title: string) => {
    addNewPageIfNeeded(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(50, 50, 50);
    doc.text(title, margin, yPosition);
    yPosition += 7;
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

  const drawBulletPoint = (text: string, indent: number = 0) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const bulletX = margin + indent;
    const textLines = doc.splitTextToSize(text, contentWidth - indent - 10);
    addNewPageIfNeeded(textLines.length * 5 + 3);
    doc.text("•", bulletX, yPosition);
    doc.text(textLines, bulletX + 7, yPosition);
    yPosition += textLines.length * 5 + 3;
  };

  const drawHighlightBox = (title: string, value: string, description: string) => {
    addNewPageIfNeeded(25);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, yPosition - 3, contentWidth, 20, 3, 3, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 100, 100);
    doc.text(title, margin + 5, yPosition + 3);
    doc.setFontSize(14);
    doc.setTextColor(212, 175, 55);
    doc.text(value, margin + 5, yPosition + 12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(description, margin + 50, yPosition + 12);
    yPosition += 25;
  };

  const drawComparisonTable = (data: { label: string; hotelier: string; clasic: string }[]) => {
    const colWidths = [contentWidth * 0.4, contentWidth * 0.3, contentWidth * 0.3];
    const startX = margin;
    
    // Header
    addNewPageIfNeeded(10 + data.length * 8);
    doc.setFillColor(30, 30, 30);
    doc.rect(startX, yPosition, contentWidth, 8, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(isRo ? "Indicator" : "Indicator", startX + 3, yPosition + 5);
    doc.text(isRo ? "Regim Hotelier" : "Hotel-style", startX + colWidths[0] + 3, yPosition + 5);
    doc.text(isRo ? "Chirie Clasică" : "Classic Rent", startX + colWidths[0] + colWidths[1] + 3, yPosition + 5);
    yPosition += 10;

    // Rows
    data.forEach((row, index) => {
      const bgColor = index % 2 === 0 ? 250 : 240;
      doc.setFillColor(bgColor, bgColor, bgColor);
      doc.rect(startX, yPosition - 4, contentWidth, 8, "F");
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(row.label, startX + 3, yPosition + 1);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 139, 34);
      doc.text(row.hotelier, startX + colWidths[0] + 3, yPosition + 1);
      doc.setTextColor(100, 100, 100);
      doc.text(row.clasic, startX + colWidths[0] + colWidths[1] + 3, yPosition + 1);
      yPosition += 8;
    });
    yPosition += 5;
  };

  // ========== COVER PAGE ==========
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  
  // Gold accent line
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 60, pageWidth, 3, "F");
  
  // Title
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  const title = isRo ? "GHIDUL INVESTITORULUI" : "INVESTOR'S GUIDE";
  doc.text(title, pageWidth / 2, 90, { align: "center" });
  
  doc.setFontSize(24);
  doc.setTextColor(212, 175, 55);
  doc.text("TIMIȘOARA 2026", pageWidth / 2, 105, { align: "center" });
  
  // Subtitle
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  const subtitle = isRo 
    ? "Maximul de Randament în Capitala Culturală Europeană" 
    : "Maximum Returns in the European Capital of Culture";
  doc.text(subtitle, pageWidth / 2, 125, { align: "center" });
  
  // Key stats boxes
  const statsY = 150;
  const boxWidth = 50;
  const boxGap = 10;
  const totalStatsWidth = boxWidth * 3 + boxGap * 2;
  const statsStartX = (pageWidth - totalStatsWidth) / 2;
  
  const stats = isRo 
    ? [
        { value: "9.4%", label: "ROI Mediu" },
        { value: "+30%", label: "vs Clasic" },
        { value: "85%", label: "Ocupare" }
      ]
    : [
        { value: "9.4%", label: "Avg ROI" },
        { value: "+30%", label: "vs Classic" },
        { value: "85%", label: "Occupancy" }
      ];
  
  stats.forEach((stat, i) => {
    const x = statsStartX + i * (boxWidth + boxGap);
    doc.setFillColor(45, 45, 45);
    doc.roundedRect(x, statsY, boxWidth, 35, 3, 3, "F");
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(212, 175, 55);
    doc.text(stat.value, x + boxWidth / 2, statsY + 15, { align: "center" });
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(stat.label, x + boxWidth / 2, statsY + 27, { align: "center" });
  });
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("RealTrust Aparthotel", pageWidth / 2, pageHeight - 40, { align: "center" });
  doc.setFontSize(8);
  doc.text("realtrustaparthotel.lovable.app", pageWidth / 2, pageHeight - 32, { align: "center" });
  
  // Gold bottom line
  doc.setFillColor(212, 175, 55);
  doc.rect(0, pageHeight - 20, pageWidth, 3, "F");

  // ========== PAGE 2: TABLE OF CONTENTS ==========
  doc.addPage();
  doc.setFillColor(255, 255, 255);
  yPosition = 30;
  
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(isRo ? "CUPRINS" : "TABLE OF CONTENTS", pageWidth / 2, yPosition, { align: "center" });
  yPosition += 20;
  
  const tocItems = isRo 
    ? [
        { num: "01", title: "Analiza Pieței", desc: "Tendințe și predicții pentru 2026" },
        { num: "02", title: "Randament Hotelier vs Clasic", desc: "Comparație cu cifre reale" },
        { num: "03", title: "Strategii de Maximizare", desc: "Cum să obții +30% profit" },
        { num: "04", title: "Zone Premium Timișoara", desc: "Unde să investești" },
        { num: "05", title: "Administrare Profesională", desc: "De ce contează managementul" }
      ]
    : [
        { num: "01", title: "Market Analysis", desc: "Trends and predictions for 2026" },
        { num: "02", title: "Hotel-style vs Classic Returns", desc: "Real portfolio comparison" },
        { num: "03", title: "Maximization Strategies", desc: "How to get +30% profit" },
        { num: "04", title: "Premium Zones Timișoara", desc: "Where to invest" },
        { num: "05", title: "Professional Management", desc: "Why it matters" }
      ];
  
  tocItems.forEach((item) => {
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, yPosition - 5, contentWidth, 18, 2, 2, "F");
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(212, 175, 55);
    doc.text(item.num, margin + 8, yPosition + 5);
    
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(item.title, margin + 25, yPosition + 5);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(item.desc, margin + 25, yPosition + 12);
    
    yPosition += 25;
  });

  // ========== PAGE 3: ANALIZA PIEȚEI ==========
  doc.addPage();
  yPosition = 25;
  
  drawSectionHeader("📊", isRo ? "ANALIZA PIEȚEI 2026" : "MARKET ANALYSIS 2026");
  
  drawSubsection(isRo ? "Timișoara - Capitala Culturală Europeană" : "Timișoara - European Capital of Culture");
  drawParagraph(isRo 
    ? "Anul 2026 marchează un moment istoric pentru Timișoara. Titlul de Capitală Culturală Europeană aduce o creștere estimată de 40% în turismul cultural și de business, transformând orașul într-o destinație premium pentru investiții imobiliare."
    : "2026 marks a historic moment for Timișoara. The European Capital of Culture title brings an estimated 40% growth in cultural and business tourism, transforming the city into a premium destination for real estate investments."
  );
  
  drawHighlightBox(
    isRo ? "CREȘTERE TURISTICĂ ESTIMATĂ" : "ESTIMATED TOURISM GROWTH",
    "+40%",
    isRo ? "față de 2024" : "vs 2024"
  );
  
  drawSubsection(isRo ? "Factori de Creștere" : "Growth Factors");
  drawBulletPoint(isRo 
    ? "Evenimente culturale majore pe tot parcursul anului (peste 300 evenimente programate)"
    : "Major cultural events throughout the year (over 300 events scheduled)"
  );
  drawBulletPoint(isRo 
    ? "Investiții în infrastructură: noul terminal aeroport, tramvaie moderne, regenerare urbană"
    : "Infrastructure investments: new airport terminal, modern trams, urban regeneration"
  );
  drawBulletPoint(isRo 
    ? "Expansiunea sectorului IT&C - Timișoara rămâne al doilea hub tech din România"
    : "IT&C sector expansion - Timișoara remains Romania's second tech hub"
  );
  drawBulletPoint(isRo 
    ? "Proximitatea de granițele vestice - acces facil din Viena, Budapesta, Belgrad"
    : "Proximity to western borders - easy access from Vienna, Budapest, Belgrade"
  );
  
  drawSubsection(isRo ? "Predicții pentru Piața Imobiliară" : "Real Estate Market Predictions");
  drawParagraph(isRo 
    ? "Analiștii estimează o creștere de 15-20% a prețurilor imobiliare în zonele centrale până în 2027, cu un potențial de randament în regim hotelier care depășește 10% anual în locațiile premium."
    : "Analysts estimate a 15-20% increase in real estate prices in central areas by 2027, with hotel-style rental yields potentially exceeding 10% annually in premium locations."
  );

  // ========== PAGE 4: RANDAMENT HOTELIER VS CLASIC ==========
  doc.addPage();
  yPosition = 25;
  
  drawSectionHeader("💰", isRo ? "RANDAMENT HOTELIER VS CLASIC" : "HOTEL-STYLE VS CLASSIC RETURNS");
  
  drawSubsection(isRo ? "Comparație Directă - Apartament 2 Camere, Zona Centrală" : "Direct Comparison - 2-Room Apartment, Central Area");
  
  drawComparisonTable([
    { label: isRo ? "Preț mediu/noapte" : "Avg price/night", hotelier: "€65", clasic: "-" },
    { label: isRo ? "Chirie lunară" : "Monthly rent", hotelier: "-", clasic: "€450" },
    { label: isRo ? "Ocupare medie" : "Avg occupancy", hotelier: "75%", clasic: "100%" },
    { label: isRo ? "Venit brut/lună" : "Gross income/month", hotelier: "€1,460", clasic: "€450" },
    { label: isRo ? "Cheltuieli operaționale" : "Operating costs", hotelier: "-€365", clasic: "-€50" },
    { label: isRo ? "Venit net/lună" : "Net income/month", hotelier: "€1,095", clasic: "€400" },
    { label: isRo ? "Venit net/an" : "Net income/year", hotelier: "€13,140", clasic: "€4,800" },
    { label: isRo ? "ROI (valoare €140k)" : "ROI (€140k value)", hotelier: "9.4%", clasic: "3.4%" }
  ]);
  
  drawHighlightBox(
    isRo ? "DIFERENȚĂ ANUALĂ" : "ANNUAL DIFFERENCE",
    "+€8,340",
    isRo ? "în favoarea regimului hotelier" : "in favor of hotel-style"
  );
  
  drawSubsection(isRo ? "De Ce Funcționează Regimul Hotelier?" : "Why Does Hotel-Style Work?");
  drawBulletPoint(isRo 
    ? "Flexibilitate în prețuri - ajustare dinamică în funcție de cerere și evenimente"
    : "Price flexibility - dynamic adjustment based on demand and events"
  );
  drawBulletPoint(isRo 
    ? "Diversificarea riscului - nu depinzi de un singur chiriaș"
    : "Risk diversification - not dependent on a single tenant"
  );
  drawBulletPoint(isRo 
    ? "Utilizare personală - poți folosi apartamentul când dorești"
    : "Personal use - you can use the apartment when you want"
  );
  drawBulletPoint(isRo 
    ? "Aprecierea valorii - proprietățile gestionate profesional se mențin la standarde înalte"
    : "Value appreciation - professionally managed properties maintain high standards"
  );

  // ========== PAGE 5: STRATEGII DE MAXIMIZARE ==========
  doc.addPage();
  yPosition = 25;
  
  drawSectionHeader("🎯", isRo ? "STRATEGII DE MAXIMIZARE" : "MAXIMIZATION STRATEGIES");
  
  drawSubsection(isRo ? "1. Prețuri Dinamice" : "1. Dynamic Pricing");
  drawParagraph(isRo 
    ? "Ajustarea automată a tarifelor în funcție de: sezonalitate, evenimente locale (concerte, conferințe, meciuri), zilele săptămânii și nivelul de ocupare din piață. Această strategie singură poate crește veniturile cu 15-25%."
    : "Automatic rate adjustment based on: seasonality, local events (concerts, conferences, matches), days of the week, and market occupancy levels. This strategy alone can increase revenue by 15-25%."
  );
  
  drawSubsection(isRo ? "2. Prezență Multi-Canal" : "2. Multi-Channel Presence");
  drawParagraph(isRo 
    ? "Listarea pe toate platformele majore (Booking.com, Airbnb, Expedia) plus rezervări directe. Fiecare canal aduce un segment diferit de oaspeți, maximizând ocuparea."
    : "Listing on all major platforms (Booking.com, Airbnb, Expedia) plus direct bookings. Each channel brings a different guest segment, maximizing occupancy."
  );
  
  drawSubsection(isRo ? "3. Experiența Premium" : "3. Premium Experience");
  drawBulletPoint(isRo 
    ? "Check-in automat 24/7 cu yale smart - flexibilitate maximă pentru oaspeți"
    : "24/7 automatic check-in with smart locks - maximum flexibility for guests"
  );
  drawBulletPoint(isRo 
    ? "Dotări de calitate: lenjerie hotelieră, espressor, Netflix, Wi-Fi rapid"
    : "Quality amenities: hotel linens, espresso machine, Netflix, fast Wi-Fi"
  );
  drawBulletPoint(isRo 
    ? "Curățenie profesională cu standarde hoteliere între fiecare sejur"
    : "Professional cleaning with hotel standards between each stay"
  );
  
  drawSubsection(isRo ? "4. Optimizarea Recenziilor" : "4. Review Optimization");
  drawParagraph(isRo 
    ? "Scorul de recenzii influențează direct poziționarea în căutări. O strategie activă de colectare și răspuns la recenzii poate crește vizibilitatea cu 30% și permite creșterea tarifelor."
    : "Review scores directly influence search rankings. An active review collection and response strategy can increase visibility by 30% and allows for rate increases."
  );
  
  drawHighlightBox(
    isRo ? "POTENȚIAL DE CREȘTERE" : "GROWTH POTENTIAL",
    "+30%",
    isRo ? "prin aplicarea tuturor strategiilor" : "by applying all strategies"
  );

  // ========== PAGE 6: ZONE PREMIUM ==========
  doc.addPage();
  yPosition = 25;
  
  drawSectionHeader("📍", isRo ? "ZONE PREMIUM TIMIȘOARA" : "PREMIUM ZONES TIMIȘOARA");
  
  const zones = isRo 
    ? [
        { name: "Piața Victoriei / Centru Istoric", roi: "9.5-11%", desc: "Cea mai căutată locație pentru turiști și călători de business. Proximitate la restaurante, muzee, Opera." },
        { name: "Piața Unirii / Cetate", roi: "8.5-10%", desc: "Zonă istorică premium cu arhitectură barocă. Ideală pentru sejururi culturale și romantice." },
        { name: "Iulius Town / Dâmbovița", roi: "8-9.5%", desc: "Hub modern cu mall, birouri IT și acces facil. Popular pentru călătorii de business de lungă durată." },
        { name: "Take Ionescu / Complexul Studențesc", roi: "7.5-9%", desc: "Zonă vibrantă cu viață de noapte. Populară pentru grupuri și tineri profesioniști." },
        { name: "Fabric / Iosefin", roi: "7-8.5%", desc: "Zone în dezvoltare cu potențial de creștere. Prețuri de achiziție mai accesibile, ROI în creștere." }
      ]
    : [
        { name: "Victory Square / Historic Center", roi: "9.5-11%", desc: "Most sought-after location for tourists and business travelers. Close to restaurants, museums, Opera." },
        { name: "Union Square / Citadel", roi: "8.5-10%", desc: "Premium historic area with baroque architecture. Ideal for cultural and romantic stays." },
        { name: "Iulius Town / Dâmbovița", roi: "8-9.5%", desc: "Modern hub with mall, IT offices and easy access. Popular for long-term business travelers." },
        { name: "Take Ionescu / Student Complex", roi: "7.5-9%", desc: "Vibrant area with nightlife. Popular for groups and young professionals." },
        { name: "Fabric / Iosefin", roi: "7-8.5%", desc: "Developing areas with growth potential. More accessible purchase prices, growing ROI." }
      ];
  
  zones.forEach((zone) => {
    addNewPageIfNeeded(30);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(margin, yPosition - 3, contentWidth, 25, 3, 3, "F");
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(zone.name, margin + 5, yPosition + 5);
    
    doc.setFontSize(12);
    doc.setTextColor(34, 139, 34);
    doc.text(`ROI: ${zone.roi}`, margin + contentWidth - 45, yPosition + 5);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const descLines = doc.splitTextToSize(zone.desc, contentWidth - 15);
    doc.text(descLines, margin + 5, yPosition + 14);
    
    yPosition += 30;
  });

  // ========== PAGE 7: ADMINISTRARE PROFESIONALĂ ==========
  doc.addPage();
  yPosition = 25;
  
  drawSectionHeader("🔧", isRo ? "ADMINISTRARE PROFESIONALĂ" : "PROFESSIONAL MANAGEMENT");
  
  drawSubsection(isRo ? "Ce Include Managementul RealTrust?" : "What Does RealTrust Management Include?");
  
  const services = isRo 
    ? [
        "Listare și optimizare pe toate platformele majore",
        "Prețuri dinamice cu ajustare zilnică automată",
        "Comunicare 24/7 cu oaspeții în 5 limbi",
        "Check-in/check-out automat cu yale smart",
        "Curățenie profesională cu standarde hoteliere",
        "Mentenanță preventivă și intervenții rapide",
        "Raportare financiară lunară transparentă",
        "Fotografie profesională și descrieri optimizate SEO",
        "Gestionarea recenziilor și rating-urilor",
        "Asigurare și protecție garanție"
      ]
    : [
        "Listing and optimization on all major platforms",
        "Dynamic pricing with automatic daily adjustment",
        "24/7 guest communication in 5 languages",
        "Automatic check-in/check-out with smart locks",
        "Professional cleaning with hotel standards",
        "Preventive maintenance and quick interventions",
        "Transparent monthly financial reporting",
        "Professional photography and SEO-optimized descriptions",
        "Review and rating management",
        "Insurance and deposit protection"
      ];
  
  services.forEach((service) => {
    drawBulletPoint(service);
  });
  
  yPosition += 10;
  
  drawSubsection(isRo ? "Rezultate Dovedite" : "Proven Results");
  
  drawHighlightBox(isRo ? "OCUPARE MEDIE" : "AVG OCCUPANCY", "85%", isRo ? "portofoliu 2024" : "2024 portfolio");
  drawHighlightBox(isRo ? "RATING MEDIU" : "AVG RATING", "9.2/10", isRo ? "Booking.com" : "Booking.com");
  drawHighlightBox(isRo ? "PROPRIETARI MULȚUMIȚI" : "SATISFIED OWNERS", "98%", isRo ? "rată de retenție" : "retention rate");

  // ========== LAST PAGE: CTA ==========
  doc.addPage();
  yPosition = 50;
  
  doc.setFillColor(30, 30, 30);
  doc.roundedRect(margin, yPosition, contentWidth, 100, 5, 5, "F");
  
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(isRo ? "URMĂTORUL PAS" : "NEXT STEP", pageWidth / 2, yPosition + 20, { align: "center" });
  
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  const ctaText = isRo 
    ? "Solicită o analiză personalizată a proprietății tale sau discută opțiunile de investiție cu echipa noastră."
    : "Request a personalized analysis of your property or discuss investment options with our team.";
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
  doc.text("📧 contact@realtrust.ro", pageWidth / 2, yPosition, { align: "center" });
  doc.text("📱 +40 756 123 456", pageWidth / 2, yPosition + 12, { align: "center" });
  doc.text("🌐 realtrustaparthotel.lovable.app", pageWidth / 2, yPosition + 24, { align: "center" });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const footerText = isRo 
    ? `© ${new Date().getFullYear()} RealTrust Aparthotel. Toate drepturile rezervate.`
    : `© ${new Date().getFullYear()} RealTrust Aparthotel. All rights reserved.`;
  doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: "center" });

  // Save
  const fileName = isRo 
    ? `ghidul-investitorului-timisoara-2026.pdf`
    : `investor-guide-timisoara-2026.pdf`;
  doc.save(fileName);
};
