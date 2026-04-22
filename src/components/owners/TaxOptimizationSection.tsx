import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Calculator, FileText, ArrowRight, Receipt, Info, Download, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Tax Optimization Section — PFA vs SRL comparison for short-term rental income.
 * Builds topical authority for "regim hotelier impozitare" / "PFA SRL Airbnb" queries.
 * Bilingual RO/EN. Pure presentation — no backend.
 */
const TaxOptimizationSection = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Optimizare Fiscală 2026",
        title: "PFA vs SRL pentru Regim Hotelier — Ce alegi?",
        subtitle:
          "Structura fiscală corectă poate dubla profitul net. Comparație transparentă bazată pe legislația ANAF actualizată 2026.",
        pfa: {
          name: "PFA — Persoană Fizică Autorizată",
          tagline: "Recomandat pentru 1 apartament, venituri sub 60.000 EUR/an",
          pros: [
            "Înființare rapidă (3-5 zile lucrătoare, cost ~250 RON)",
            "Contabilitate simplă în partidă simplă",
            "Normă de venit pentru cazare turistică (impozit 10% pe norma stabilită)",
            "CAS și CASS doar dacă depășești plafoanele anuale",
            "Acces facil la deduceri pentru cheltuielile profesionale",
          ],
          cons: [
            "Răspundere nelimitată cu patrimoniul personal",
            "Plafon TVA: 300.000 RON/an (~60.000 EUR)",
            "Imagine mai puțin profesională pentru parteneriate B2B",
          ],
          tax: "10% impozit + CAS/CASS la depășire plafoane",
        },
        srl: {
          name: "SRL — Societate cu Răspundere Limitată",
          tagline: "Recomandat pentru 2+ apartamente sau venituri peste 60.000 EUR/an",
          pros: [
            "Răspundere limitată la capitalul social (min. 1 RON)",
            "Deductibilități extinse: mobilier, electrocasnice, reparații, marketing, comisioane platforme",
            "Microîntreprindere: 1% impozit pe venit dacă ai minim 1 angajat (3% fără)",
            "Imagine premium pentru parteneriate cu touroperatori și companii",
            "Posibilitate de reinvestire profit cu impozit redus",
          ],
          cons: [
            "Înființare mai complexă (~1.500 RON, 7-14 zile)",
            "Contabilitate dublă obligatorie (~300-500 RON/lună)",
            "Dividende impozitate suplimentar (8% impozit + CASS dacă aplicabil)",
          ],
          tax: "1-3% impozit microîntreprindere + 8% pe dividende",
        },
        comparison: {
          title: "Parcurs fiscal: de la €25.000 brut la net în mână",
          subtitle: "Apartament cu venit anual 25.000 EUR — calcul orientativ 2026",
          steps: [
            {
              key: "gross",
              label: "1. Venit brut anual",
              hint: "Încasări totale din cazare (după comisioane platforme deja scăzute)",
              pfa: 25000,
              srl: 25000,
              type: "neutral" as const,
            },
            {
              key: "deductions",
              label: "2. Cheltuieli deductibile",
              hint: "Mobilier, utilități, marketing, fotograf, comisioane, reparații",
              pfa: -8000,
              srl: -10500,
              type: "deduction" as const,
              note: "SRL: categorii extinse",
            },
            {
              key: "base",
              label: "3. Bază impozabilă",
              hint: "PFA: venit – cheltuieli  •  SRL micro: pe venit (nu pe profit)",
              pfa: 17000,
              srl: 25000,
              type: "neutral" as const,
            },
            {
              key: "tax",
              label: "4. Impozit principal",
              hint: "PFA 10% pe baza impozabilă  •  SRL 1% (cu 1 angajat) sau 3%",
              pfa: -1700,
              srl: -500,
              type: "tax" as const,
              note: "SRL economisește ~€1.200",
            },
            {
              key: "social",
              label: "5. Contribuții sociale (CAS+CASS)",
              hint: "PFA: la depășire plafon (~€1.200)  •  SRL: 0 la nivel firmă",
              pfa: -1200,
              srl: 0,
              type: "tax" as const,
            },
            {
              key: "dividends",
              label: "6. Impozit dividende (8%) dacă scoți tot",
              hint: "Doar la SRL — dacă reinvestești, acest cost dispare",
              pfa: 0,
              srl: -1960,
              type: "tax" as const,
              note: "Opțional la SRL",
            },
            {
              key: "net",
              label: "✅ Net în mână (cash)",
              hint: "Suma efectivă care îți rămâne după toate impozitele",
              pfa: 14100,
              srl: 22040,
              type: "net" as const,
              note: "SRL reinvestit: ~€24.000 disponibili",
            },
          ],
          winner: "SRL",
          winnerLabel: "Avantaj SRL: +€7.940/an dacă reinvestești profitul",
          note: "* Calcul orientativ pe baza Codului Fiscal 2026. PFA poate rămâne competitiv pentru 1 apartament cu venit sub €18.000/an. La 2+ apartamente sau dacă reinvestești profitul, SRL este net superior.",
        },
        cta: {
          title: "Nu ești sigur ce structură ți se potrivește?",
          description:
            "Echipa RealTrust colaborează cu experți contabili specializați în regim hotelier. Îți facem o analiză personalizată gratuită pe baza portofoliului tău.",
          primary: "Solicită Consultanță Fiscală",
          secondary: "Calculator ROI",
        },
      }
    : {
        badge: "Tax Optimization 2026",
        title: "PFA vs SRL for Short-Term Rentals — Which to choose?",
        subtitle:
          "The right tax structure can double your net profit. Transparent comparison based on updated 2026 Romanian tax law.",
        pfa: {
          name: "PFA — Authorized Natural Person",
          tagline: "Recommended for 1 apartment, income under €60,000/year",
          pros: [
            "Quick registration (3-5 business days, ~€50)",
            "Simple single-entry bookkeeping",
            "Lump-sum income regime for tourist accommodation (10% tax)",
            "CAS & CASS only when annual thresholds are exceeded",
            "Easy access to deductions for professional expenses",
          ],
          cons: [
            "Unlimited liability with personal assets",
            "VAT cap: €60,000/year",
            "Less professional image for B2B partnerships",
          ],
          tax: "10% income tax + social contributions when thresholds exceeded",
        },
        srl: {
          name: "SRL — Limited Liability Company",
          tagline: "Recommended for 2+ apartments or income over €60,000/year",
          pros: [
            "Liability limited to share capital (min. 1 RON)",
            "Wider deductions: furniture, appliances, repairs, marketing, platform commissions",
            "Micro-enterprise: 1% revenue tax with 1+ employee (3% without)",
            "Premium image for partnerships with tour operators and companies",
            "Profit reinvestment with reduced taxation",
          ],
          cons: [
            "More complex setup (~€300, 7-14 days)",
            "Mandatory double-entry accounting (~€60-100/month)",
            "Additional dividend tax (8% + health contribution if applicable)",
          ],
          tax: "1-3% micro-enterprise tax + 8% on dividends",
        },
        comparison: {
          title: "Tax journey: from €25,000 gross to net in hand",
          subtitle: "Apartment with €25,000 annual revenue — indicative 2026 calculation",
          steps: [
            {
              key: "gross",
              label: "1. Gross annual income",
              hint: "Total accommodation revenue (after platform commissions)",
              pfa: 25000,
              srl: 25000,
              type: "neutral" as const,
            },
            {
              key: "deductions",
              label: "2. Deductible expenses",
              hint: "Furniture, utilities, marketing, photography, commissions, repairs",
              pfa: -8000,
              srl: -10500,
              type: "deduction" as const,
              note: "SRL: wider categories",
            },
            {
              key: "base",
              label: "3. Taxable base",
              hint: "PFA: revenue – expenses  •  SRL micro: on revenue (not profit)",
              pfa: 17000,
              srl: 25000,
              type: "neutral" as const,
            },
            {
              key: "tax",
              label: "4. Main tax",
              hint: "PFA 10% on taxable base  •  SRL 1% (with 1 employee) or 3%",
              pfa: -1700,
              srl: -500,
              type: "tax" as const,
              note: "SRL saves ~€1,200",
            },
            {
              key: "social",
              label: "5. Social contributions (CAS+CASS)",
              hint: "PFA: when threshold exceeded (~€1,200)  •  SRL: 0 at company level",
              pfa: -1200,
              srl: 0,
              type: "tax" as const,
            },
            {
              key: "dividends",
              label: "6. Dividend tax (8%) if fully withdrawn",
              hint: "Only at SRL — if you reinvest, this cost disappears",
              pfa: 0,
              srl: -1960,
              type: "tax" as const,
              note: "Optional at SRL",
            },
            {
              key: "net",
              label: "✅ Net in hand (cash)",
              hint: "The actual amount you keep after all taxes",
              pfa: 14100,
              srl: 22040,
              type: "net" as const,
              note: "SRL reinvested: ~€24,000 available",
            },
          ],
          winner: "SRL",
          winnerLabel: "SRL advantage: +€7,940/year if you reinvest profit",
          note: "* Indicative calculation based on Romanian Tax Code 2026. PFA may remain competitive for 1 apartment with income under €18,000/year. For 2+ apartments or reinvested profit, SRL is significantly superior.",
        },
        cta: {
          title: "Not sure which structure suits you?",
          description:
            "RealTrust partners with accountants specialized in short-term rentals. We provide a free personalized analysis based on your portfolio.",
          primary: "Request Tax Consultation",
          secondary: "ROI Calculator",
        },
      };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      isRo
        ? "Bună ziua! Doresc o consultanță fiscală pentru regim hotelier (PFA vs SRL)."
        : "Hello! I would like a tax consultation for short-term rentals (PFA vs SRL).",
    );
    window.open(`https://wa.me/40799069256?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const handleConsultWhatsApp = () => {
    const message = encodeURIComponent(
      isRo
        ? "Bună ziua! Am analizat tabelul comparativ PFA vs SRL pe RealTrust și aș dori să programez un apel de consultanță fiscală pentru regim hotelier. Mulțumesc!"
        : "Hello! I reviewed the PFA vs SRL comparison table on RealTrust and would like to schedule a tax consultation call for short-term rentals. Thank you!",
    );
    window.open(`https://wa.me/40799069256?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const handleExportPDF = async () => {
    const [{ default: jsPDF }, autoTableMod] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = (autoTableMod as { default: typeof import("jspdf-autotable").default }).default;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const brandPrimary: [number, number, number] = [23, 37, 84];
    const brandAccent: [number, number, number] = [217, 119, 6];
    const muted: [number, number, number] = [100, 116, 139];

    // Header band
    doc.setFillColor(...brandPrimary);
    doc.rect(0, 0, pageWidth, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("RealTrust & ApArt Hotel", 40, 42);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      isRo
        ? "Calcul Comparativ Fiscal — PFA vs SRL pentru Regim Hotelier"
        : "Fiscal Comparison — PFA vs SRL for Short-Term Rentals",
      40,
      62,
    );
    doc.setFontSize(9);
    doc.text("realtrust.ro  •  +40 799 069 256  •  info@realtrust.ro", 40, 78);

    // Subtitle
    doc.setTextColor(...brandPrimary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(t.comparison.title, 40, 125);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...muted);
    const subtitleLines = doc.splitTextToSize(t.comparison.subtitle, pageWidth - 80);
    doc.text(subtitleLines, 40, 142);

    // Winner badge
    doc.setFillColor(...brandAccent);
    doc.roundedRect(40, 165, pageWidth - 80, 28, 4, 4, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(t.comparison.winnerLabel, pageWidth / 2, 183, { align: "center" });

    // Table
    const fmtPdf = (n: number) => {
      if (n === 0) return "—";
      const abs = Math.abs(n).toLocaleString(isRo ? "ro-RO" : "en-US");
      const sign = n < 0 ? "-" : "";
      return `${sign}EUR ${abs}`;
    };

    autoTable(doc, {
      startY: 215,
      margin: { left: 40, right: 40 },
      head: [[
        isRo ? "Etapa fiscala" : "Tax step",
        "PFA",
        isRo ? "SRL (Recomandat)" : "SRL (Recommended)",
      ]],
      body: t.comparison.steps.map((s) => [
        { content: s.label.replace(/✅\s*/g, ""), styles: { fontStyle: s.type === "net" ? "bold" : "normal" } },
        { content: fmtPdf(s.pfa), styles: { halign: "right", fontStyle: s.type === "net" ? "bold" : "normal" } },
        {
          content: fmtPdf(s.srl) + (s.note ? `\n${s.note}` : ""),
          styles: {
            halign: "right",
            fontStyle: s.type === "net" ? "bold" : "normal",
            textColor: s.type === "net" ? brandPrimary : undefined,
          },
        },
      ]),
      headStyles: {
        fillColor: brandPrimary,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 10,
      },
      bodyStyles: { fontSize: 9.5, cellPadding: 7, valign: "middle" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        if (data.section === "body") {
          const step = t.comparison.steps[data.row.index];
          if (step?.type === "net") data.cell.styles.fillColor = [240, 245, 255];
        }
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 110 },
        2: { cellWidth: 130 },
      },
    });

    // @ts-expect-error jspdf-autotable adds lastAutoTable
    const finalY = (doc.lastAutoTable?.finalY ?? 400) + 20;
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.setFont("helvetica", "italic");
    const noteLines = doc.splitTextToSize(t.comparison.note, pageWidth - 80);
    doc.text(noteLines, 40, finalY);

    // CTA box
    const ctaY = Math.min(finalY + noteLines.length * 10 + 20, pageHeight - 110);
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(...brandPrimary);
    doc.roundedRect(40, ctaY, pageWidth - 80, 70, 6, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...brandPrimary);
    doc.text(
      isRo
        ? "Programeaza o consultanta fiscala gratuita"
        : "Schedule a free tax consultation",
      pageWidth / 2,
      ctaY + 24,
      { align: "center" },
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    doc.text("WhatsApp: +40 799 069 256  •  info@realtrust.ro", pageWidth / 2, ctaY + 44, {
      align: "center",
    });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...brandAccent);
    doc.text("wa.me/40799069256", pageWidth / 2, ctaY + 60, { align: "center" });

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    const today = new Date().toLocaleDateString(isRo ? "ro-RO" : "en-US");
    doc.text(
      `${isRo ? "Generat" : "Generated"}: ${today}  •  © RealTrust ${new Date().getFullYear()}`,
      pageWidth / 2,
      pageHeight - 20,
      { align: "center" },
    );

    doc.save(
      isRo
        ? "RealTrust-Calcul-PFA-vs-SRL.pdf"
        : "RealTrust-Tax-Comparison-PFA-vs-SRL.pdf",
    );
  };

  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-background via-muted/20 to-background">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            <Receipt className="w-3 h-3 mr-1" />
            {t.badge}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">{t.title}</h2>
          <p className="text-lg text-muted-foreground">{t.subtitle}</p>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto mb-10">
          {/* PFA Card */}
          <Card className="border-border/50 hover:border-primary/40 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-foreground">{t.pfa.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t.pfa.tagline}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  PFA
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  {isRo ? "Avantaje" : "Pros"}
                </h4>
                <ul className="space-y-2">
                  {t.pfa.pros.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  {isRo ? "Dezavantaje" : "Cons"}
                </h4>
                <ul className="space-y-2">
                  {t.pfa.cons.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 text-destructive/70 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-3 border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{isRo ? "Fiscalitate:" : "Taxation:"}</strong>{" "}
                  {t.pfa.tax}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SRL Card */}
          <Card className="border-primary/40 bg-primary/[0.02] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                {isRo ? "Recomandat portofoliu" : "Portfolio recommended"}
              </Badge>
            </div>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-foreground">{t.srl.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{t.srl.tagline}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  SRL
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  {isRo ? "Avantaje" : "Pros"}
                </h4>
                <ul className="space-y-2">
                  {t.srl.pros.map((p, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  {isRo ? "Dezavantaje" : "Cons"}
                </h4>
                <ul className="space-y-2">
                  {t.srl.cons.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <AlertTriangle className="w-4 h-4 text-destructive/70 shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-3 border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{isRo ? "Fiscalitate:" : "Taxation:"}</strong>{" "}
                  {t.srl.tax}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Journey: Brut → Deduceri → Impozit → Net */}
        <Card className="max-w-6xl mx-auto border-border/50 mb-10 overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/40">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  {t.comparison.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{t.comparison.subtitle}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <Badge className="bg-primary text-primary-foreground">
                  {t.comparison.winnerLabel}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportPDF}
                  className="gap-1.5 h-8"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isRo ? "Export PDF calcul" : "Export PDF"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <TooltipProvider delayDuration={150}>
              {(() => {
                const fmt = (n: number) => {
                  if (n === 0) return "—";
                  const abs = Math.abs(n).toLocaleString(isRo ? "ro-RO" : "en-US");
                  const sign = n < 0 ? "−" : "";
                  return `${sign}€${abs}`;
                };
                const valueClassFor = (type: string) =>
                  type === "net"
                    ? "font-bold text-base"
                    : type === "tax"
                    ? "text-destructive/80"
                    : type === "deduction"
                    ? "text-amber-600 dark:text-amber-500"
                    : "text-foreground";

                return (
                  <>
                    {/* Desktop / tablet: table view with tooltips */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm table-fixed">
                        <colgroup>
                          <col className="w-[55%]" />
                          <col className="w-[22%]" />
                          <col className="w-[23%]" />
                        </colgroup>
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/20">
                            <th className="text-left py-3 px-3 lg:px-4 font-semibold text-foreground">
                              {isRo ? "Etapă fiscală" : "Tax step"}
                            </th>
                            <th className="text-right py-3 px-3 lg:px-4 font-semibold text-foreground whitespace-nowrap">
                              PFA
                            </th>
                            <th className="text-right py-3 px-3 lg:px-4 font-semibold text-primary whitespace-nowrap">
                              SRL{" "}
                              <span className="text-[10px] font-normal opacity-80">
                                ★ {isRo ? "Recomandat" : "Recommended"}
                              </span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.comparison.steps.map((step, i) => {
                            const isNet = step.type === "net";
                            const valueClass = valueClassFor(step.type);
                            return (
                              <tr
                                key={step.key}
                                className={`border-b border-border/30 last:border-0 ${
                                  isNet ? "bg-primary/[0.04]" : i % 2 === 1 ? "bg-muted/10" : ""
                                }`}
                              >
                                <td className="py-3 px-3 lg:px-4 align-top">
                                  <div className="flex items-start gap-1.5">
                                    <span className="font-medium text-foreground">{step.label}</span>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <button
                                          type="button"
                                          aria-label={isRo ? "Mai multe detalii" : "More details"}
                                          className="text-muted-foreground hover:text-primary transition-colors mt-0.5 shrink-0"
                                        >
                                          <Info className="w-3.5 h-3.5" />
                                        </button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs text-xs">
                                        {step.hint}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                  <div className="hidden lg:block text-xs text-muted-foreground mt-0.5">
                                    {step.hint}
                                  </div>
                                </td>
                                <td className={`py-3 px-3 lg:px-4 text-right tabular-nums whitespace-nowrap align-top ${valueClass}`}>
                                  {fmt(step.pfa)}
                                </td>
                                <td
                                  className={`py-3 px-3 lg:px-4 text-right tabular-nums align-top ${valueClass} ${
                                    isNet ? "text-primary" : ""
                                  }`}
                                >
                                  <div className="whitespace-nowrap">{fmt(step.srl)}</div>
                                  {step.note && (
                                    <div className="text-[10px] text-primary/80 font-normal mt-0.5 leading-tight">
                                      {step.note}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile: stacked cards (tap-friendly tooltips) */}
                    <div className="md:hidden divide-y divide-border/30">
                      {t.comparison.steps.map((step) => {
                        const isNet = step.type === "net";
                        const valueClass = valueClassFor(step.type);
                        return (
                          <div
                            key={step.key}
                            className={`px-3 py-3 ${isNet ? "bg-primary/[0.05]" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="font-medium text-foreground text-[13px] leading-snug">
                                {step.label}
                              </div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label={isRo ? "Mai multe detalii" : "More details"}
                                    className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-1 -m-1"
                                  >
                                    <Info className="w-4 h-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[240px] text-xs">
                                  {step.hint}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-md bg-muted/30 px-2 py-2">
                                <div className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold mb-0.5">
                                  PFA
                                </div>
                                <div className={`tabular-nums text-sm ${valueClass}`}>
                                  {fmt(step.pfa)}
                                </div>
                              </div>
                              <div
                                className={`rounded-md px-2 py-2 ${
                                  isNet
                                    ? "bg-primary/10 border border-primary/30"
                                    : "bg-primary/[0.04] border border-primary/15"
                                }`}
                              >
                                <div className="text-[9px] uppercase tracking-wide text-primary font-semibold mb-0.5 flex items-center gap-1">
                                  SRL <span className="opacity-70">★</span>
                                </div>
                                <div
                                  className={`tabular-nums text-sm ${valueClass} ${
                                    isNet ? "text-primary" : ""
                                  }`}
                                >
                                  {fmt(step.srl)}
                                </div>
                                {step.note && (
                                  <div className="text-[10px] text-primary/80 font-normal mt-1 leading-tight">
                                    {step.note}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </TooltipProvider>
            <p className="text-xs text-muted-foreground italic px-4 py-3 border-t border-border/30 bg-muted/10">
              {t.comparison.note}
            </p>
            {/* In-table CTA: direct WhatsApp consultation */}
            <div className="border-t border-border/40 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 px-4 py-4 sm:px-6 sm:py-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="hidden sm:flex w-10 h-10 rounded-full bg-primary/15 items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm sm:text-base">
                      {isRo
                        ? "Vrei aceste cifre aplicate pe situația ta?"
                        : "Want these numbers applied to your case?"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {isRo
                        ? "15 minute pe WhatsApp cu un specialist fiscal RealTrust — gratuit."
                        : "15 minutes on WhatsApp with a RealTrust tax specialist — free."}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleConsultWhatsApp}
                  className="gap-2 shrink-0 w-full sm:w-auto"
                  size="sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  {isRo ? "Apel consultanță WhatsApp" : "WhatsApp consultation"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="max-w-3xl mx-auto bg-card border border-border/50 rounded-2xl p-8 text-center">
          <FileText className="w-10 h-10 text-primary mx-auto mb-4" />
          <h3 className="text-2xl font-serif font-semibold text-foreground mb-3">{t.cta.title}</h3>
          <p className="text-muted-foreground mb-6">{t.cta.description}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" onClick={handleWhatsApp} className="gap-2">
              {t.cta.primary}
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/calculator-roi">{t.cta.secondary}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TaxOptimizationSection;
