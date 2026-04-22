import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, Calculator, FileText, ArrowRight, Receipt } from "lucide-react";
import { Link } from "react-router-dom";

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
          title: "Comparative calculation for an apartment with €25,000 annual revenue",
          rows: [
            { label: "Gross annual income", pfa: "€25,000", srl: "€25,000" },
            { label: "Deductible expenses", pfa: "€8,000", srl: "€10,500 (more categories)" },
            { label: "Taxable base", pfa: "€17,000", srl: "€25,000 (revenue tax)" },
            { label: "Main tax", pfa: "€1,700 (10%)", srl: "€250-750 (1-3%)" },
            { label: "Social contributions", pfa: "~€1,200 (CAS+CASS)", srl: "0 (at company level)" },
            { label: "Dividends if fully withdrawn", pfa: "—", srl: "€2,000 (8%)" },
            { label: "Net in hand", pfa: "≈ €14,100", srl: "≈ €11,750 - €13,250" },
          ],
          note: "* Indicative calculation. PFA may be more efficient for a single apartment with moderate income. SRL becomes superior at 2+ apartments due to wider deductions for furniture, photography, marketing and platform commissions.",
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

        {/* Comparison Table */}
        <Card className="max-w-6xl mx-auto border-border/50 mb-10">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Calculator className="w-5 h-5 text-primary" />
              {t.comparison.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-2 font-semibold text-foreground">
                      {isRo ? "Indicator" : "Metric"}
                    </th>
                    <th className="text-right py-3 px-2 font-semibold text-foreground">PFA</th>
                    <th className="text-right py-3 px-2 font-semibold text-primary">SRL</th>
                  </tr>
                </thead>
                <tbody>
                  {t.comparison.rows.map((row, i) => (
                    <tr key={i} className="border-b border-border/30 last:border-0">
                      <td className="py-3 px-2 text-muted-foreground">{row.label}</td>
                      <td className="py-3 px-2 text-right text-foreground">{row.pfa}</td>
                      <td className="py-3 px-2 text-right text-foreground font-medium">{row.srl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-4 italic">{t.comparison.note}</p>
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
