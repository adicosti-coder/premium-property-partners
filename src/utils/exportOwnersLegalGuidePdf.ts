interface ExportOptions {
  language?: "ro" | "en";
}

/**
 * Ghid Legal & Fiscal pentru Proprietari (lead magnet, /pentru-proprietari).
 * Regim hotelier vs. chirie clasică: randament, fiscalitate, riscuri, autorizări.
 * Cifrele urmează standardul intern: ocupare 75%, deducere operațională 27%, ROI net ~9,4%.
 */
export const exportOwnersLegalGuidePdf = async ({ language = "ro" }: ExportOptions = {}) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  const isRo = language === "ro";

  await (await import("@/utils/pdf/ensureInvestorGuideFonts")).ensureInvestorGuideFonts(doc);

  const space = (needed: number) => {
    if (y + needed > pageHeight - 20) {
      doc.addPage();
      y = 25;
    }
  };

  const header = (num: string, title: string) => {
    space(30);
    doc.setFillColor(212, 175, 55);
    doc.rect(margin, y - 5, contentWidth, 12, "F");
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`${num}  ${title}`, margin + 5, y + 3);
    y += 18;
  };

  const sub = (title: string) => {
    space(20);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(45, 45, 45);
    doc.text(title, margin, y);
    y += 7;
  };

  const para = (text: string) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, contentWidth);
    space(lines.length * 5 + 5);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 5;
  };

  const bullet = (text: string) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    const lines = doc.splitTextToSize(text, contentWidth - 10);
    space(lines.length * 5 + 3);
    doc.text("•", margin, y);
    doc.text(lines, margin + 7, y);
    y += lines.length * 5 + 3;
  };

  const table = (rows: { label: string; a: string; b: string }[], colA: string, colB: string) => {
    const w = [contentWidth * 0.44, contentWidth * 0.28, contentWidth * 0.28];
    space(12 + rows.length * 8);
    doc.setFillColor(30, 30, 30);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(isRo ? "Indicator" : "Metric", margin + 3, y + 5.5);
    doc.text(colA, margin + w[0] + 3, y + 5.5);
    doc.text(colB, margin + w[0] + w[1] + 3, y + 5.5);
    y += 10;

    rows.forEach((row, i) => {
      const shade = i % 2 === 0 ? 250 : 240;
      doc.setFillColor(shade, shade, shade);
      doc.rect(margin, y - 4, contentWidth, 8, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(row.label, margin + 3, y + 1);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 120, 60);
      doc.text(row.a, margin + w[0] + 3, y + 1);
      doc.setTextColor(110, 110, 110);
      doc.text(row.b, margin + w[0] + w[1] + 3, y + 1);
      y += 8;
    });
    y += 6;
  };

  // ===== COVER =====
  doc.setFillColor(10, 22, 40);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  doc.setFillColor(212, 175, 55);
  doc.rect(0, 62, pageWidth, 3, "F");
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(isRo ? "GHID LEGAL & FISCAL" : "LEGAL & TAX GUIDE", pageWidth / 2, 92, { align: "center" });
  doc.setFontSize(16);
  doc.setTextColor(212, 175, 55);
  doc.text(isRo ? "PENTRU PROPRIETARI · TIMIȘOARA" : "FOR OWNERS · TIMIȘOARA", pageWidth / 2, 106, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(185, 190, 200);
  doc.text(
    isRo ? "Regim hotelier vs. chirie clasică: randament, taxe, riscuri, autorizații" : "Short-term vs. long-term rental: yield, taxes, risks, permits",
    pageWidth / 2,
    122,
    { align: "center" }
  );
  doc.setFontSize(10);
  doc.setTextColor(120, 128, 140);
  doc.text("RealTrust Timișoara · realtrust.ro · 0799 069 256", pageWidth / 2, pageHeight - 34, { align: "center" });
  doc.setFillColor(212, 175, 55);
  doc.rect(0, pageHeight - 20, pageWidth, 3, "F");

  // ===== 01 COMPARISON =====
  doc.addPage();
  y = 25;
  header("01", isRo ? "REGIM HOTELIER VS. CHIRIE CLASICĂ" : "SHORT-TERM VS. LONG-TERM RENTAL");
  sub(isRo ? "Apartament 2 camere, zonă centrală Timișoara" : "2-room apartment, central Timișoara");
  table(
    [
      { label: isRo ? "Venit brut / lună" : "Gross income / month", a: "1.800 €", b: "550 €" },
      { label: isRo ? "Ocupare de calcul" : "Assumed occupancy", a: "75%", b: "100%" },
      { label: isRo ? "Costuri operaționale" : "Operating costs", a: "− 27%", b: "− 5%" },
      { label: isRo ? "Venit net / lună" : "Net income / month", a: "1.130 €", b: "500 €" },
      { label: isRo ? "Venit net / an" : "Net income / year", a: "13.560 €", b: "6.000 €" },
      { label: isRo ? "ROI net (valoare 145.000 €)" : "Net ROI (145,000 € value)", a: "9,4%", b: "4,1%" },
      { label: isRo ? "Efort lunar proprietar" : "Owner monthly effort", a: isRo ? "0 ore" : "0 hours", b: isRo ? "3–6 ore" : "3–6 hours" },
    ],
    isRo ? "Regim hotelier" : "Short-term",
    isRo ? "Chirie clasică" : "Long-term"
  );
  para(
    isRo
      ? "Cifrele sunt un scenariu de lucru, nu o promisiune. Diferența reală depinde de zonă, dotare, sezon și calitatea administrării. Îți facem estimarea pe apartamentul tău în 15 minute."
      : "These figures are a working scenario, not a promise. The real gap depends on area, furnishing, season and management quality. We estimate yours in a 15-minute call."
  );

  // ===== 02 TAX =====
  header("02", isRo ? "FISCALITATE PE ÎNȚELESUL TĂU" : "TAXES, EXPLAINED SIMPLY");
  sub(isRo ? "Cele două variante de impozitare" : "The two taxation routes");
  bullet(
    isRo
      ? "Normă de venit (persoană fizică, cazare turistică): impozit calculat pe o normă fixă stabilită anual, nu pe încasările reale. Predictibil și simplu de administrat."
      : "Fixed income norm (individual, tourist accommodation): tax on an annually set fixed norm, not on actual receipts. Predictable and simple."
  );
  bullet(
    isRo
      ? "Sistem real: impozit de 7% aplicat pe venitul net efectiv (încasări minus cheltuieli deductibile documentate). Avantajos când ai investiții și costuri mari de operare."
      : "Actual-income system: 7% tax on effective net income (receipts minus documented deductible expenses). Better when you have high investment and operating costs."
  );
  bullet(
    isRo
      ? "Deductibile uzuale în sistem real: comisionul de administrare, curățenie, consumabile, utilități, amortizare mobilier, comisioanele platformelor."
      : "Typical deductibles: management fee, cleaning, supplies, utilities, furniture depreciation, platform commissions."
  );
  bullet(
    isRo
      ? "Contribuții sociale (CASS) pot apărea peste anumite plafoane de venit anual — verifică plafonul în vigoare pentru anul fiscal curent."
      : "Health contributions may apply above certain annual income thresholds — check the current fiscal year's threshold."
  );
  para(
    isRo
      ? "Nu suntem consultanți fiscali autorizați: îți arătăm structura folosită de proprietarii din portofoliu și te punem în legătură cu un contabil care lucrează cu regim hotelier în Timișoara."
      : "We are not licensed tax advisors: we show the structure used by owners in our portfolio and connect you with an accountant experienced in short-term rentals in Timișoara."
  );

  // ===== 03 RISKS =====
  doc.addPage();
  y = 25;
  header("03", isRo ? "RISCURI ȘI LIMITE, SPUSE DIRECT" : "RISKS AND LIMITS, STATED PLAINLY");
  bullet(
    isRo
      ? "Sezonalitate: ianuarie–februarie și august au ocupare mai mică. Un an bun compensează, o lună slabă nu se recuperează retroactiv."
      : "Seasonality: January–February and August have lower occupancy. A good year compensates; a weak month does not recover retroactively."
  );
  bullet(
    isRo
      ? "Uzură mai mare decât la chirie clasică: consumabile, lenjerie, mici reparații apar lunar, nu o dată la 3 ani."
      : "Higher wear than long-term rental: supplies, linen and small repairs are monthly, not once every three years."
  );
  bullet(
    isRo
      ? "Nu recomandăm regim hotelier când: apartamentul e la periferie fără transport, blocul are restricții clare, sau bugetul de amenajare este zero."
      : "We do not recommend short-term rental when: the flat is peripheral with poor transport, the building has clear restrictions, or the furnishing budget is zero."
  );
  bullet(
    isRo
      ? "Riscul de neplată dispare (încasăm prin platforme și garanții), dar apare riscul de recenzie negativă — gestionat prin standard de curățenie și răspuns 24/7."
      : "Non-payment risk disappears (platform-collected payments and deposits), but review risk appears — managed through cleaning standards and 24/7 response."
  );

  // ===== 04 PERMITS =====
  header("04", isRo ? "ASOCIAȚIE, VECINI ȘI AUTORIZAȚII" : "ASSOCIATION, NEIGHBOURS AND PERMITS");
  bullet(
    isRo
      ? "Acordul asociației de proprietari și al vecinilor direct afectați este necesar pentru schimbarea destinației în spațiu de cazare turistică."
      : "Approval from the owners' association and directly affected neighbours is required to change the use to tourist accommodation."
  );
  bullet(
    isRo
      ? "Certificat de clasificare emis de autoritatea națională de turism (Ministerul Economiei/Turismului): dosar cu documente de proprietate, fișe de dotare și declarație pe propria răspundere."
      : "Classification certificate issued by the national tourism authority: file with ownership documents, amenity sheets and a self-declaration."
  );
  bullet(
    isRo
      ? "Autorizație de funcționare / acord de la Primăria Timișoara, plus taxa hotelieră locală raportată lunar."
      : "Operating authorisation from Timișoara City Hall, plus the local accommodation tax reported monthly."
  );
  bullet(
    isRo
      ? "Obligații curente: registrul oaspeților, raportare la poliție pentru cetățenii străini, sanitare/PSI conform categoriei de clasificare."
      : "Ongoing duties: guest register, police reporting for foreign nationals, sanitary/fire-safety compliance per classification category."
  );
  para(
    isRo
      ? "În pachetele Premium și Full ne ocupăm noi de dosarul de clasificare și de relația cu autoritățile. Durata uzuală: 3–6 săptămâni de la depunerea completă."
      : "In our Premium and Full packages we handle the classification file and the relationship with authorities. Usual duration: 3–6 weeks from complete submission."
  );

  // ===== 05 NEXT STEPS =====
  header("05", isRo ? "URMĂTORII PAȘI" : "NEXT STEPS");
  bullet(isRo ? "Trimite adresa și 5 poze — primești estimarea de venit în 24 de ore." : "Send the address and 5 photos — get the income estimate within 24 hours.");
  bullet(isRo ? "Call de 15 minute: verificăm zona, dotarea și varianta fiscală potrivită." : "15-minute call: we check the area, furnishing and the right tax route.");
  bullet(isRo ? "Contract 12 luni, ieșire cu preaviz 30 de zile, fără penalizări." : "12-month contract, 30-day notice exit, no penalties.");

  // Footer disclaimer on last page
  space(24);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(130, 130, 130);
  const disc = doc.splitTextToSize(
    isRo
      ? "Document informativ, actualizat 2026. Nu constituie consultanță fiscală sau juridică. Verifică legislația în vigoare împreună cu un contabil autorizat înainte de a lua o decizie."
      : "Informational document, updated 2026. Not tax or legal advice. Verify current legislation with a licensed accountant before deciding.",
    contentWidth
  );
  doc.text(disc, margin, y);

  doc.save(isRo ? "Ghid-Legal-Fiscal-Proprietari-RealTrust.pdf" : "Owners-Legal-Tax-Guide-RealTrust.pdf");
};
