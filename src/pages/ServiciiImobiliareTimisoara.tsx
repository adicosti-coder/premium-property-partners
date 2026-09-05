import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { Building2, Shield, Star, TrendingUp, Hospital, Home, Briefcase, MapPin, Calculator, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { REAL_ESTATE_AGENT_REF } from "@/lib/orgIdentity";
import ContextualLinks from "@/components/seo/ContextualLinks";
import { CLUSTER_LINKS } from "@/lib/internalLinking";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const BASE_URL = "https://realtrust.ro";

const ServiciiImobiliareTimisoara = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const faqItems = [
    {
      question: isRo ? "Ce servicii imobiliare oferă RealTrust în Timișoara?" : "What real estate services does RealTrust offer in Timișoara?",
      answer: isRo ? "RealTrust oferă vânzări, închirieri rezidențiale, evaluare gratuită, administrare în regim hotelier și consultanță pentru investiții imobiliare în Timișoara." : "RealTrust offers sales, residential rentals, free valuation, short-term rental management and real estate investment consulting in Timișoara.",
    },
    {
      question: isRo ? "Cum pot accesa Catalogul de Investiții?" : "How can I access the Investment Catalog?",
      answer: isRo ? "Catalogul de Investiții este disponibil din meniul principal și include oportunități verificate, analiză ROI și estimări pentru administrare profesională." : "The Investment Catalog is available from the main navigation and includes verified opportunities, ROI analysis and professional management estimates.",
    },
    {
      question: isRo ? "Ce ROI pot obține prin administrare în regim hotelier?" : "What ROI can I get with short-term rental management?",
      answer: isRo ? "Randamentul standard folosit de RealTrust este 9.4% net, calculat pe baza ocupării medii, costurilor operaționale și deducerii de management/taxe." : "RealTrust uses a 9.4% net yield benchmark, calculated from occupancy, operational costs and management/tax deductions.",
    },
    {
      question: isRo ? "Pot începe cu o evaluare înainte să listez proprietatea?" : "Can I start with a valuation before listing my property?",
      answer: isRo ? "Da. Formularul de evaluare gratuită estimează poziționarea proprietății, scenariul de vânzare sau închiriere și potențialul de administrare în regim hotelier." : "Yes. The free valuation estimates positioning, sale or rental scenarios and short-term rental management potential.",
    },
  ];

  useRegisterFAQs("servicii-imobiliare-timisoara", faqItems);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${BASE_URL}/servicii-imobiliare#service`,
      "name": isRo ? "Servicii Imobiliare Timișoara" : "Real Estate Services Timișoara",
      "provider": {
        ...REAL_ESTATE_AGENT_REF,
        "url": BASE_URL,
        "founder": {
          "@type": "Person",
          "@id": `${BASE_URL}/despre-noi#adrian-costi`,
          "name": "Adrian Costi",
        },
      },
      "areaServed": [
        { "@type": "City", "name": "Timișoara" },
        { "@type": "AdministrativeArea", "name": "Județul Timiș" },
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": isRo ? "Servicii RealTrust" : "RealTrust Services",
        "itemListElement": [
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": isRo ? "Vânzări apartamente și case Timișoara" : "Apartment & house sales Timișoara" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": isRo ? "Închirieri rezidențiale" : "Residential rentals" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": isRo ? "Administrare regim hotelier" : "Short-term rental management" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": isRo ? "Evaluare gratuită proprietate" : "Free property valuation" } },
          { "@type": "Offer", "itemOffered": { "@type": "Service", "name": isRo ? "Consultanță investiții imobiliare" : "Real estate investment consulting" } },
        ],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": isRo ? "Acasă" : "Home", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": isRo ? "Servicii Imobiliare Timișoara" : "Real Estate Services Timișoara", "item": `${BASE_URL}/servicii-imobiliare` },
      ],
    },
  ];

  const services = [
    {
      icon: Home,
      title: isRo ? "Vânzări Apartamente Timișoara" : "Apartment Sales Timișoara",
      desc: isRo
        ? "Intermediere completă pentru vânzări apartamente Timișoara și case de vânzare. Fiecare agent imobiliar Timișoara din echipă este specializat pe cartiere și tipologii (apartamente noi, vile, case în Dumbrăvița, Giroc, Mehala, Braytim)."
        : "Full brokerage for apartment and house sales in Timișoara. Each RealTrust real estate agent is specialized by neighborhood and property type (new apartments, villas, houses in Dumbrăvița, Giroc, Mehala, Braytim).",
      link: "/cartiere",
    },
    {
      icon: Shield,
      title: isRo ? "Închirieri Timișoara — Rezidențial" : "Rentals in Timișoara — Residential",
      desc: isRo
        ? "Închirieri Timișoara cu contracte pe termen lung, proprietari și chiriași verificați. Acoperire pentru apartamente lângă Continental Automotive, Hella, Iulius Town și marii angajatori."
        : "Long-term rental contracts for owners and verified tenants. Coverage for apartments near Continental Automotive, Hella, Iulius Town and major employers.",
      link: "/cartiere",
    },
    {
      icon: Building2,
      title: isRo ? "Administrare Regim Hotelier" : "Short-Term Rental Management",
      desc: isRo
        ? "Management complet apartamente Airbnb & Booking, cu randament net verificat de 9.4% ROI. Listing, check-in, curățenie, raportare lunară transparentă."
        : "Full Airbnb & Booking apartment management with verified 9.4% net ROI. Listing, check-in, cleaning, transparent monthly reporting.",
      link: "/pentru-proprietari",
    },
    {
      icon: TrendingUp,
      title: isRo ? "Evaluare Gratuită Proprietate" : "Free Property Valuation",
      desc: isRo
        ? "Estimare obiectivă a prețurilor apartamentelor Timișoara pe cartiere — bazată pe date live din piața imobiliară Timișoara."
        : "Objective price estimates for Timișoara apartments by neighborhood — based on live data from the local real estate market.",
      link: "/evaluare-gratuita",
    },
    {
      icon: Briefcase,
      title: isRo ? "Consultanță Investiții" : "Investment Consulting",
      desc: isRo
        ? "Catalog de oportunități investiționale verificate, analiză ROI și deal-room pentru investitori activi pe piața imobiliară Timișoara."
        : "Catalog of verified investment opportunities, ROI analysis and a deal-room for active investors in the Timișoara real estate market.",
      link: "/catalog-investitii",
    },
  ];

  const neighborhoods = [
    { slug: "centru", name: "Centru" },
    { slug: "iosefin", name: "Iosefin" },
    { slug: "fabric", name: "Fabric" },
    { slug: "elisabetin", name: "Elisabetin" },
    { slug: "complex-studentesc", name: isRo ? "Complex Studențesc" : "Student Complex" },
    { slug: "dumbravita", name: "Dumbrăvița" },
  ];

  const recommendedResources = [
    { to: "/investitii", icon: TrendingUp, label: isRo ? "Investiții imobiliare Timișoara" : "Timișoara real estate investments" },
    { to: "/calculator-roi", icon: Calculator, label: isRo ? "Calculator ROI regim hotelier" : "Short-term rental ROI calculator" },
    { to: "/blog/analiza-roi-timisoara-2026", icon: FileText, label: isRo ? "Analiză ROI Timișoara 2026" : "Timișoara ROI analysis 2026" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={isRo ? "Vânzări Apartamente Timișoara și Închirieri Timișoara | RealTrust" : "Apartment Sales & Rentals in Timișoara | RealTrust"}
        description={isRo
          ? "RealTrust intermediază vânzări apartamente Timișoara și închirieri Timișoara: evaluare gratuită, promovare, contracte și administrare în regim hotelier. Agent imobiliar dedicat pentru fiecare cartier."
          : "RealTrust pillar page: apartment and house sales Timișoara, rentals, short-term rental management (9.4% ROI). Dedicated Timișoara real estate agents and local market expertise."}
        url={`${BASE_URL}/servicii-imobiliare`}
        jsonLd={jsonLd}
      />
      <Header />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 sm:px-6">
          <PageBreadcrumb
            items={[
              { label: isRo ? "Acasă" : "Home", href: "/" },
              { label: isRo ? "Servicii Imobiliare Timișoara" : "Real Estate Services Timișoara" },
            ]}
          />

          <section className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-4">
              {isRo ? "Servicii imobiliare în Timișoara — vânzări, închirieri și administrare" : "Real Estate Services in Timișoara — Sales, Rentals and Management"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isRo
                ? "Vânzări apartamente Timișoara, închirieri Timișoara pe termen lung, administrare în regim hotelier și consultanță pentru investiții. Echipa RealTrust acoperă orașul și județul Timiș, cu agenți specializați pe cartiere."
                : "Apartment and house sales Timișoara, residential rentals, short-term rental management and investment consulting. The RealTrust Timișoara real estate agent team covers the entire Timișoara real estate market and Timiș county."}
            </p>
          </section>

          {/* Services Grid */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {services.map((svc, i) => (
              <Link key={i} to={svc.link} className="group p-6 bg-card border rounded-2xl hover:border-primary/50 transition-colors">
                <svc.icon className="w-9 h-9 text-primary mb-4 group-hover:scale-110 transition-transform" />
                <h2 className="text-lg font-semibold mb-2">{svc.title}</h2>
                <p className="text-sm text-muted-foreground">{svc.desc}</p>
              </Link>
            ))}
          </section>

          {/* Market context */}
          <section className="max-w-3xl mx-auto mb-16">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-serif font-semibold">
                {isRo ? "Piața Imobiliară Timișoara — Context & Prețuri" : "Timișoara Real Estate Market — Context & Prices"}
              </h2>
            </div>
            <div className="prose prose-sm text-muted-foreground max-w-none space-y-3">
              {isRo ? (
                <>
                  <p>
                    Monitorizăm zilnic <strong>piața imobiliară Timișoara</strong> și actualizăm prețurile pe cartiere. Prețul mediu/m² variază între 1.700 € (Soarelui, Steaua, Mehala) și 2.600 € (Centru, ISHO, Iulius Town), iar randamentul net în regim hotelier ajunge la <strong>9,4% ROI verificat</strong>. Cartiere precum <strong>Braytim</strong> și Mehala câștigă teren la familii și investitori.
                  </p>
                  <p>
                    Apartamente și case de vânzare lângă marii angajatori (<strong>Continental Automotive</strong>, Hella, Flex) sunt cele mai căutate pentru închirieri pe termen lung — un agent imobiliar Timișoara dedicat din echipa RealTrust te ghidează în alegere.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    We monitor the <strong>Timișoara real estate market</strong> daily and update prices by neighborhood. Average €/m² ranges from €1,700 (Soarelui, Steaua, Mehala) to €2,600 (Center, ISHO, Iulius Town), with verified short-term rental net ROI up to <strong>9.4%</strong>. Neighborhoods like <strong>Braytim</strong> and Mehala are gaining traction with families and investors.
                  </p>
                  <p>
                    Apartments and houses for sale near major employers (<strong>Continental Automotive</strong>, Hella, Flex) are the most sought-after for long-term rentals — a dedicated RealTrust Timișoara real estate agent will guide you through the choice.
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Neighborhood cluster links */}
          <section className="max-w-4xl mx-auto mb-16">
            <h2 className="text-2xl font-serif font-semibold text-center mb-6 flex items-center justify-center gap-2">
              <MapPin className="w-6 h-6 text-primary" />
              {isRo ? "Cartiere Acoperite — Pagini Dedicate" : "Covered Neighborhoods — Dedicated Pages"}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {neighborhoods.map((n) => (
                <Link
                  key={n.slug}
                  to={`/imobiliare-timisoara/${n.slug}`}
                  className="p-4 bg-card border rounded-xl text-center hover:border-primary/50 hover:bg-primary/5 transition-colors text-sm font-medium"
                >
                  {n.name}
                </Link>
              ))}
            </div>
          </section>

          <section className="max-w-4xl mx-auto mb-16">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-serif font-semibold">
                {isRo ? "Recomandate pentru decizie rapidă" : "Recommended for faster decisions"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {isRo ? "Cele mai utile pagini pentru investitori și proprietari care compară vânzarea, închirierea și administrarea." : "Useful pages for investors and owners comparing sale, rental and management options."}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {recommendedResources.map((resource) => (
                <Link key={resource.to} to={resource.to} className="group flex items-center gap-3 rounded-xl border bg-card p-4 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/5">
                  <resource.icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="group-hover:text-primary">{resource.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Hospital proximity */}
          <section className="max-w-3xl mx-auto mb-12">
            <div className="flex items-center gap-2 mb-4">
              <Hospital className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-serif font-semibold">
                {isRo ? "Cazare lângă Spitalele din Timișoara" : "Stays Near Timișoara Hospitals"}
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              {isRo
                ? "Apartamentele noastre sunt poziționate strategic pentru familii și personal medical: la 5–15 minute de Spitalul Județean (Bd. Iosif Bulbuca), Spitalul Municipal (Clinica Nouă), Maternitatea Bega și Spitalul de Copii Louis Țurcanu."
                : "Our apartments are strategically located for families and medical staff: 5–15 minutes from the County Hospital (Bd. Iosif Bulbuca), Municipal Hospital (Clinica Nouă), Maternitatea Bega and the Louis Țurcanu Children's Hospital."}
            </p>
          </section>

          {/* CTA */}
          <section className="max-w-4xl mx-auto mb-12 rounded-2xl border border-primary/20 bg-primary/5 p-8">
            <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-center">
              <div>
                <h2 className="text-2xl font-serif font-semibold mb-3">
                  {isRo ? "Următorul pas: catalog sau contact proprietari" : "Next step: catalog or owner contact"}
                </h2>
                <p className="text-muted-foreground">
                  {isRo
                    ? "Pentru investiții, pornește din catalogul cu oportunități verificate. Pentru administrarea unei proprietăți existente, trimite solicitarea către echipa de proprietari."
                    : "For investments, start with the verified opportunity catalog. For an existing property, contact the owner onboarding team."}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <Link to="/catalog-investitii">
                  <Button size="lg" className="w-full">{isRo ? "Catalog Investiții" : "Investment Catalog"}</Button>
                </Link>
                <Link to="/pentru-proprietari">
                  <Button size="lg" variant="outline" className="w-full">{isRo ? "Contact Proprietari" : "Owner Contact"}</Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="max-w-4xl mx-auto mb-12" itemScope itemType="https://schema.org/FAQPage">
            <h2 className="text-2xl font-serif font-semibold text-center mb-6">
              {isRo ? "Întrebări frecvente despre serviciile RealTrust" : "Frequently asked questions about RealTrust services"}
            </h2>
            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((item, index) => (
                <AccordionItem key={item.question} value={`service-faq-${index}`} className="rounded-xl border bg-card px-5" itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                  <AccordionTrigger className="text-left" itemProp="name">{item.question}</AccordionTrigger>
                  <AccordionContent itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
                    <span itemProp="text">{item.answer}</span>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <section className="max-w-3xl mx-auto text-center bg-card border rounded-2xl p-8">
            <Star className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h2 className="text-2xl font-serif font-semibold mb-3">
              {isRo ? "Discută cu un Agent Imobiliar Timișoara" : "Talk to a Timișoara Real Estate Agent"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isRo
                ? "Echipa RealTrust este la dispoziția ta pentru evaluări, vizionări și consultanță investițională."
                : "The RealTrust team is available for valuations, viewings and investment consulting."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/contact">
                <Button size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold">
                  {isRo ? "Contact & Locație" : "Contact & Location"}
                </Button>
              </Link>
              <Link to="/evaluare-gratuita">
                <Button size="lg" variant="outline">
                  {isRo ? "Evaluare Gratuită" : "Free Valuation"}
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Suspense fallback={null}>
        <GlobalConversionWidgets />
      </Suspense>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default ServiciiImobiliareTimisoara;
