import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import ROICalculatorWidget from "@/components/ROICalculatorWidget";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { REAL_ESTATE_AGENT_REF, FINANCIAL_SERVICE_SCHEMA } from "@/lib/orgIdentity";
import { Link } from "react-router-dom";
import { Coins, Home, Wrench, Receipt, BedDouble, TrendingUp, Wallet, BookOpen, HelpCircle } from "lucide-react";
import { lazy, Suspense } from "react";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const CalculatorROI = () => {
  const breadcrumbItems = [
    { label: "Acasă", href: "/" },
    { label: "Calculator ROI" },
  ];

  const tocItems = [
    { id: "calculator", label: "Calculator" },
    { id: "achizitie", label: "Costuri achiziție" },
    { id: "venituri", label: "Venituri" },
    { id: "operationale", label: "Costuri operaționale" },
    { id: "taxe", label: "Taxe & impozite" },
    { id: "ocupare", label: "Rata de ocupare" },
    { id: "cashflow", label: "Cash flow & amortizare" },
    { id: "glosar", label: "Glosar" },
    { id: "faq", label: "FAQ" },
  ];

  const faqItems = [
    {
      question: "Ce randament (ROI) este considerat bun pentru o investiție imobiliară în Timișoara?",
      answer: "Pentru chirie clasică în Timișoara, un ROI net de 6-8% este considerat solid. În regim hotelier administrat de RealTrust, ținta este 9,4% net, calculat pe ipoteze publice (ocupare 75%, deducere 27% pentru management, costuri și taxe).",
    },
    {
      question: "Cum afectează impozitul pe proprietate ROI-ul?",
      answer: "Impozitul anual local pentru un apartament în Timișoara variază între 0,08% și 0,2% din valoarea impozabilă. Pentru un apartament de 80.000€, costul anual este 80-160€ — un impact de aproximativ 0,1-0,2% pe ROI net, deja inclus în calcul.",
    },
    {
      question: "Care este diferența între ROI și cash flow?",
      answer: "ROI măsoară randamentul anual ca procent din investiția totală (de ex. 9,4%). Cash flow-ul este venitul net lunar sau anual disponibil după toate costurile. O proprietate poate avea ROI bun și cash flow mai mic dacă există rată ipotecară.",
    },
    {
      question: "În cât timp se amortizează o investiție imobiliară?",
      answer: "La un ROI net de 9,4%, recuperarea capitalului propriu se face în aproximativ 10-11 ani. Dacă proprietatea se apreciază cu 5-8% pe an, randamentul total (yield + apreciere) ajunge la 14-17% pe an, în funcție de zonă.",
    },
    {
      question: "Ce costuri operaționale sunt incluse în calcul?",
      answer: "Calculatorul deduce automat 27% din venitul brut pentru: management (15-20%), curățenie, consumabile, mentenanță, utilități parțial neacoperite și taxe locale. Rezultatul afișat este ROI net, după aceste costuri.",
    },
  ];

  useRegisterFAQs("calculator-roi", faqItems);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Calculator ROI: regim hotelier vs. chirie clasică | RealTrust"
        description="Estimează randamentul apartamentului tău în Timișoara: regim hotelier vs. chirie clasică. Venit lunar și ROI anual, calculate pe ipoteze publice."
        url="https://realtrust.ro/calculator-roi"
        breadcrumbItems={[
          { name: "Acasă", url: "https://realtrust.ro" },
          { name: "Calculator ROI", url: "https://realtrust.ro/calculator-roi" },
        ]}
        jsonLd={[FINANCIAL_SERVICE_SCHEMA as unknown as Record<string, unknown>, {
          "@context": "https://schema.org",
          "@type": "FinancialProduct",
          name: "Calculator ROI imobiliare Timișoara — regim hotelier vs. chirie clasică",
          description: "Calculator gratuit de randament imobiliar: compară venitul lunar și ROI-ul anual între regim hotelier și chirie clasică. Include cash flow și amortizarea investiției.",
          url: "https://realtrust.ro/calculator-roi",
          provider: {
            ...REAL_ESTATE_AGENT_REF,
            areaServed: ["Timișoara", "Dumbrăvița", "Ghiroda", "Moșnița Nouă", "Giroc"],
          },
          feesAndCommissionsSpecification: "Comision de administrare 15-25% din venit brut",
        }]}
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <PageBreadcrumb items={breadcrumbItems} />

          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-3">
              Calculator ROI imobiliare Timișoara: regim hotelier vs. chirie clasică
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Estimează în câteva secunde ce poate produce apartamentul tău: <strong>venit lunar, cash flow și perioada de amortizare</strong>, calculate pe date din piața Timișoara și pe ipoteze publice (ocupare 75%, deducere 27%).
            </p>
          </div>

          {/* Table of Contents */}
          <nav aria-label="Cuprins pagină" className="mb-10 rounded-2xl border border-border bg-card/60 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">Cuprins</p>
            <ul className="flex flex-wrap gap-2">
              {tocItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="inline-flex items-center rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div id="calculator">
            <ROICalculatorWidget />
          </div>

          <section className="mt-12 rounded-2xl border border-primary/20 bg-primary/5 p-6">
            <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <h2 className="text-2xl font-serif font-semibold text-foreground">Următorul pas după calcul</h2>
                <p className="mt-2 text-muted-foreground">Compară rezultatul cu oportunitățile active sau trimite proprietatea pentru o estimare personalizată.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to="/analiza-roi-apartament" className="inline-flex min-h-12 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Analiză ROI personalizată</Link>
                <Link to="/catalog-investitii" className="inline-flex min-h-12 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Vezi catalogul de investiții</Link>
                <Link to="/pentru-proprietari" className="inline-flex min-h-12 items-center rounded-md border border-input bg-background px-5 text-sm font-semibold text-foreground hover:bg-accent hover:text-accent-foreground">Discută cu echipa</Link>
              </div>
            </div>
          </section>

          {/* Variabile calculator — explicații */}
          <section className="mt-16 space-y-10">
            <div id="achizitie">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-serif font-semibold text-foreground">Costuri de achiziție</h2>
              </div>
              <p className="text-muted-foreground">
                Prețul de achiziție al unui apartament în Timișoara variază în funcție de cartier: <Link to="/imobiliare-timisoara/isho" className="text-primary hover:underline">ISHO</Link> (2.400-2.600 €/mp), <Link to="/imobiliare-timisoara/complex-studentesc" className="text-primary hover:underline">Complex Studențesc</Link> (1.900-2.200 €/mp), Dumbrăvița și Giroc (1.800-2.100 €/mp). La preț se adaugă: notar (~1%), comision agenție (1-3%), TVA (dacă este cazul), mobilier și amenajare (5.000-15.000€).
              </p>
            </div>

            <div id="venituri">
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-serif font-semibold text-foreground">Venituri: chirie clasică vs. regim hotelier</h2>
              </div>
              <p className="text-muted-foreground mb-3">
                <strong>Chirie clasică:</strong> 350-700 €/lună pentru 1-2 camere în Timișoara, cu chiriaș pe termen lung. Venit predictibil, cu randament limitat (4-6% brut).
              </p>
              <p className="text-muted-foreground">
                <strong>Regim hotelier:</strong> tarif mediu 50-90 €/noapte × 75% ocupare = 1.125-2.025 €/lună brut. Diferența față de chiria clasică se situează tipic între 1,6× și 2,5×, în funcție de locație și sezon.
              </p>
            </div>

            <div id="operationale">
              <div className="flex items-center gap-2 mb-3">
                <Wrench className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-serif font-semibold text-foreground">Costuri operaționale (mentenanță, utilități)</h2>
              </div>
              <p className="text-muted-foreground">
                Pentru regim hotelier intră în calcul: curățenie (~15 €/check-out), consumabile (săpun, hârtie, cafea), utilități incluse (curent, gaz, apă, internet — 100-180 €/lună), mentenanță preventivă și fond de reparații. Toate sunt deduse automat în calculator.
              </p>
            </div>

            <div id="taxe">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-serif font-semibold text-foreground">Taxe și impozite — proprietate Timișoara</h2>
              </div>
              <p className="text-muted-foreground">
                Impozit anual pe clădire în Timișoara: 0,08-0,2% din valoarea impozabilă (80-160 €/an pentru un apartament de 80.000€). Pentru regim hotelier se adaugă: impozit pe venit (10% pe norma de venit sau pe venit real), CASS (10%) și taxă turistică municipală (1 €/persoană/noapte). Echipa noastră se ocupă de declarațiile fiscale și raportările PNTS.
              </p>
            </div>

            <div id="ocupare">
              <div className="flex items-center gap-2 mb-3">
                <BedDouble className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-serif font-semibold text-foreground">Rata de ocupare</h2>
              </div>
              <p className="text-muted-foreground">
                Calculatorul folosește o ocupare medie de <strong>75%</strong>, observată în portofoliul nostru din Timișoara (față de aproximativ 50% în auto-administrare). Distribuția este influențată de evenimente locale (UVT, Iulius Town, festivaluri), business travel (Continental, Hella) și turism cultural în Centru.
              </p>
            </div>

            <div id="cashflow">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-serif font-semibold text-foreground">Cash flow și amortizare</h2>
              </div>
              <p className="text-muted-foreground mb-3">
                <strong>Cash flow lunar</strong> = venit brut − management − utilități − mentenanță − rată credit (dacă există) − taxe. Pentru un apartament achiziționat cash în ISHO, cash flow-ul net se situează tipic la 700-900 €/lună.
              </p>
              <p className="text-muted-foreground">
                <strong>Amortizarea investiției:</strong> la un ROI net de 9,4%, recuperarea capitalului se face în aproximativ 10-11 ani. Adăugând aprecierea proprietății (5-8% pe an în Timișoara), randamentul total ajunge la 14-17% pe an.
              </p>
            </div>

            <div id="glosar">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-serif font-semibold text-foreground">Glosarul investitorului imobiliar</h2>
              </div>
              <dl className="space-y-3 text-muted-foreground">
                <div><dt className="font-semibold text-foreground inline">ROI (Return on Investment): </dt><dd className="inline">randament anual ca % din capitalul investit.</dd></div>
                <div><dt className="font-semibold text-foreground inline">Yield brut: </dt><dd className="inline">venit anual / preț achiziție × 100.</dd></div>
                <div><dt className="font-semibold text-foreground inline">Yield net: </dt><dd className="inline">venit anual după toate costurile / preț achiziție × 100.</dd></div>
                <div><dt className="font-semibold text-foreground inline">Cash flow: </dt><dd className="inline">flux de numerar net lunar/anual disponibil investitorului.</dd></div>
                <div><dt className="font-semibold text-foreground inline">Amortizare: </dt><dd className="inline">perioada de recuperare a investiției inițiale prin venituri.</dd></div>
                <div><dt className="font-semibold text-foreground inline">DAE: </dt><dd className="inline">Dobânda Anuală Efectivă — costul total al unui credit ipotecar.</dd></div>
                <div><dt className="font-semibold text-foreground inline">ADR: </dt><dd className="inline">Average Daily Rate — tarif mediu pe noapte în regim hotelier.</dd></div>
                <div><dt className="font-semibold text-foreground inline">RevPAR: </dt><dd className="inline">Revenue per Available Room — venit per noapte disponibilă.</dd></div>
              </dl>
            </div>

            <div id="faq">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-serif font-semibold text-foreground">Întrebări frecvente despre ROI imobiliar</h2>
              </div>
              <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-6" itemScope itemType="https://schema.org/FAQPage">
                {faqItems.map((item, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`} className="last:border-b-0" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                    <AccordionTrigger className="text-left text-foreground" itemProp="name">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground" itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer"><span itemProp="text">{item.answer}</span></AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <GlobalConversionWidgets />
      </Suspense>
      <BackToTop />
    </div>
  );
};

export default CalculatorROI;
