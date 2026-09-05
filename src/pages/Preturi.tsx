import { Link } from "react-router-dom";
import { CheckCircle2, X, MessageCircle, ArrowRight, TrendingUp, Shield, Star, Zap, HelpCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { REAL_ESTATE_AGENT_SCHEMA } from "@/lib/orgIdentity";


const packages = {
  ro: [
    {
      id: "starter",
      icon: Zap,
      name: "Starter",
      tagline: "Început accesibil",
      commission: "15%",
      commissionNote: "din venitul brut",
      highlight: false,
      features: [
        { text: "Listare pe Airbnb & Booking.com", included: true },
        { text: "Check-in standard", included: true },
        { text: "Suport clienți în orele de lucru", included: true },
        { text: "Raport financiar lunar", included: true },
        { text: "Fotografii profesionale", included: false },
        { text: "Coordonare curățenie între sejururi", included: false },
        { text: "Prețuri dinamice automate", included: false },
        { text: "Self check-in 24/7 cu smart lock", included: false },
        { text: "Listare pe 10+ canale premium", included: false },
        { text: "Manager dedicat proprietate", included: false },
      ],
      cta: "Solicită evaluare",
    },
    {
      id: "essential",
      icon: Shield,
      name: "Esențial",
      tagline: "Start fără stres",
      commission: "18%",
      commissionNote: "din venitul brut",
      highlight: false,
      features: [
        { text: "Listare pe Airbnb & Booking.com", included: true },
        { text: "Fotografii profesionale de bază", included: true },
        { text: "Check-in standard", included: true },
        { text: "Coordonare curățenie între sejururi", included: true },
        { text: "Suport clienți în orele de lucru", included: true },
        { text: "Raport financiar lunar", included: true },
        { text: "Prețuri dinamice automate", included: false },
        { text: "Self check-in 24/7 cu smart lock", included: false },
        { text: "Listare pe 10+ canale premium", included: false },
        { text: "Manager dedicat proprietate", included: false },
      ],
      cta: "Solicită evaluare",
    },
    {
      id: "standard",
      icon: TrendingUp,
      name: "Standard",
      tagline: "Cel mai popular",
      commission: "20%",
      commissionNote: "din venitul brut",
      highlight: true,
      features: [
        { text: "Listare pe Airbnb & Booking.com", included: true },
        { text: "Fotografii profesionale HD", included: true },
        { text: "Self check-in 24/7 cu smart lock", included: true },
        { text: "Coordonare curățenie profesională între sejururi", included: true },
        { text: "Suport clienți 24/7", included: true },
        { text: "Rapoarte financiare în timp real", included: true },
        { text: "Prețuri dinamice automate", included: true },
        { text: "Listare pe 10+ canale premium", included: true },
        { text: "Manager dedicat proprietate", included: false },
        { text: "Analiză ROI & optimizare avansată", included: false },
      ],
      cta: "Alege Standard",
    },
    {
      id: "premium",
      icon: Star,
      name: "Premium",
      tagline: "Randament maxim",
      commission: "25%",
      commissionNote: "din venitul brut",
      highlight: false,
      features: [
        { text: "Listare pe Airbnb & Booking.com", included: true },
        { text: "Fotografii & video profesionale", included: true },
        { text: "Self check-in 24/7 cu smart lock", included: true },
        { text: "Coordonare curățenie profesională & inspecție calitate", included: true },
        { text: "Suport clienți 24/7 dedicat", included: true },
        { text: "Rapoarte financiare în timp real", included: true },
        { text: "Prețuri dinamice + revenue management", included: true },
        { text: "Listare pe 10+ canale premium", included: true },
        { text: "Manager dedicat proprietate", included: true },
        { text: "Analiză ROI & optimizare avansată", included: true },
      ],
      cta: "Alege Premium",
    },
  ],
  en: [
    {
      id: "starter",
      icon: Zap,
      name: "Starter",
      tagline: "Affordable start",
      commission: "15%",
      commissionNote: "of gross revenue",
      highlight: false,
      features: [
        { text: "Listing on Airbnb & Booking.com", included: true },
        { text: "Standard check-in", included: true },
        { text: "Business hours support", included: true },
        { text: "Monthly financial report", included: true },
        { text: "Professional photography", included: false },
        { text: "Cleaning coordination between stays", included: false },
        { text: "Automatic dynamic pricing", included: false },
        { text: "24/7 self check-in with smart lock", included: false },
        { text: "Listing on 10+ premium channels", included: false },
        { text: "Dedicated property manager", included: false },
      ],
      cta: "Request evaluation",
    },
    {
      id: "essential",
      icon: Shield,
      name: "Essential",
      tagline: "Stress-free start",
      commission: "18%",
      commissionNote: "of gross revenue",
      highlight: false,
      features: [
        { text: "Listing on Airbnb & Booking.com", included: true },
        { text: "Basic professional photography", included: true },
        { text: "Standard check-in", included: true },
        { text: "Cleaning coordination between stays", included: true },
        { text: "Business hours support", included: true },
        { text: "Monthly financial report", included: true },
        { text: "Automatic dynamic pricing", included: false },
        { text: "24/7 self check-in with smart lock", included: false },
        { text: "Listing on 10+ premium channels", included: false },
        { text: "Dedicated property manager", included: false },
      ],
      cta: "Request evaluation",
    },
    {
      id: "standard",
      icon: TrendingUp,
      name: "Standard",
      tagline: "Most popular",
      commission: "20%",
      commissionNote: "of gross revenue",
      highlight: true,
      features: [
        { text: "Listing on Airbnb & Booking.com", included: true },
        { text: "HD professional photography", included: true },
        { text: "24/7 self check-in with smart lock", included: true },
        { text: "Professional cleaning coordination between stays", included: true },
        { text: "24/7 guest support", included: true },
        { text: "Real-time financial reports", included: true },
        { text: "Automatic dynamic pricing", included: true },
        { text: "Listing on 10+ premium channels", included: true },
        { text: "Dedicated property manager", included: false },
        { text: "ROI analysis & advanced optimization", included: false },
      ],
      cta: "Choose Standard",
    },
    {
      id: "premium",
      icon: Star,
      name: "Premium",
      tagline: "Maximum yield",
      commission: "25%",
      commissionNote: "of gross revenue",
      highlight: false,
      features: [
        { text: "Listing on Airbnb & Booking.com", included: true },
        { text: "Professional photos & video", included: true },
        { text: "24/7 self check-in with smart lock", included: true },
        { text: "Professional cleaning coordination & quality inspection", included: true },
        { text: "Dedicated 24/7 guest support", included: true },
        { text: "Real-time financial reports", included: true },
        { text: "Dynamic pricing + revenue management", included: true },
        { text: "Listing on 10+ premium channels", included: true },
        { text: "Dedicated property manager", included: true },
        { text: "ROI analysis & advanced optimization", included: true },
      ],
      cta: "Choose Premium",
    },
  ],
};

const guarantees = {
  ro: [
    { icon: "💰", title: "Fără costuri ascunse", desc: "Comisionul acoperă tot. Nu există taxe de setup, onboarding sau administrare." },
    { icon: "📊", title: "Transparență totală", desc: "Banii intră direct în contul tău. Acces la rapoarte financiare în timp real." },
    { icon: "📋", title: "Contract flexibil", desc: "Fără perioadă minimă. Poți ieși din parteneriat oricând, fără penalizări." },
    { icon: "🏆", title: "Garantăm performanța", desc: "Dacă nu atingem obiectivele agreate, reducem comisionul automat." },
  ],
  en: [
    { icon: "💰", title: "No hidden costs", desc: "The commission covers everything. No setup, onboarding, or management fees." },
    { icon: "📊", title: "Total transparency", desc: "Money goes directly to your account. Access to real-time financial reports." },
    { icon: "📋", title: "Flexible contract", desc: "No minimum period. You can exit the partnership anytime, without penalties." },
    { icon: "🏆", title: "We guarantee performance", desc: "If we don't reach agreed goals, we automatically reduce the commission." },
  ],
};

const Preturi = () => {
  const { language } = useLanguage();
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation({ threshold: 0.1 });

  const lang = (language as keyof typeof packages) in packages ? (language as keyof typeof packages) : "ro";
  const pkgs = packages[lang];
  const guar = guarantees[lang];

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      lang === "ro"
        ? "Bună ziua! Sunt interesat de pachetele de administrare și aș dori o evaluare gratuită."
        : "Hello! I'm interested in the management packages and would like a free evaluation."
    );
    window.open(`https://wa.me/40799069256?text=${msg}`, '_blank', 'noopener,noreferrer');
  };

  const seo = {
    ro: {
      title: "Prețuri Administrare Apartamente Timișoara | RealTrust",
      description: "Pachete administrare regim hotelier RealTrust: Starter 15%, Esențial 18%, Standard 20%, Premium 25%. Fără costuri ascunse. Comparație completă.",
    },
    en: {
      title: "Apartment Management Pricing Timișoara | RealTrust",
      description: "Transparent pricing for short-term rental management in Timișoara. Commission from 15% with no hidden fees, flexible contract and free property evaluation!",
    },
  };

  const s = seo[lang];
  const breadcrumbs = [{ label: lang === "ro" ? "Prețuri" : "Pricing" }];

  const pricingFaqItems = [
    {
      question: "Ce costuri implică administrarea unui imobil în Timișoara?",
      answer: "Costurile de administrare imobil în Timișoara la RealTrust sunt incluse într-un comision unic procentual din venitul brut: Starter 15%, Esențial 18%, Standard 20%, Premium 25%. Acest tarif acoperă listarea pe Booking/Airbnb, check-in, curățenie, suport oaspeți, prețuri dinamice și raportare. Nu există taxe ascunse de setup, abonament sau retragere.",
    },
    {
      question: "Care este tariful de administrare proprietăți în Timișoara?",
      answer: "Tariful de administrare proprietăți în Timișoara variază între 15% și 25% din venitul brut, în funcție de pachet. Pentru un apartament cu venit brut de 1.800€/lună, comisionul Standard (20%) este 360€/lună. Diferența față de auto-administrare este compensată de creșterea ocupării (75% vs 50%) și a tarifului mediu pe noapte.",
    },
    {
      question: "Care sunt pachetele de administrare regim hotelier disponibile?",
      answer: "Oferim 4 pachete de administrare regim hotelier: Starter (15% — listare basic), Esențial (18% — fotografii + curățenie), Standard (20% — cel mai popular, prețuri dinamice + 10+ canale), Premium (25% — manager dedicat + revenue management avansat). Toate includ raportare lunară transparentă.",
    },
    {
      question: "Administrați apartamente în zone cu cerere ridicată (Continental, Hella, Piața 700)?",
      answer: "Da. Avem expertiză specifică pe zonele cu cerere business: apartamente lângă Continental Timișoara (Calea Aradului), cazare lângă Hella Timișoara (Ghiroda/Aeroport) și închirieri Piața 700 (ultracentral, lângă Iulius Town). Aceste zone generează ocupare suplimentară din business travel — ideal pentru pachetele Standard și Premium.",
    },
    {
      question: "Sunt prețurile pachetelor negociabile sau există costuri de setup?",
      answer: "Comisioanele sunt fixe, transparente și aceleași pentru toți proprietarii — nu negociem cu unii și ascundem la alții. Setup-ul (smart lock, fotografii, listare pe canale) este inclus în comision. Contractul este flexibil, fără penalități de retragere după primele 3 luni.",
    },
  ];

  useRegisterFAQs("preturi-administrare", pricingFaqItems);

  const BASE_URL = "https://realtrust.ro";

  const realEstateAgentSchema = {
    ...REAL_ESTATE_AGENT_SCHEMA,
    "@type": ["RealEstateAgent", "LocalBusiness"],
    "url": `${BASE_URL}/preturi`,
    "priceRange": "15%-25%",
  };

  // alias used by servicePriceSchema.provider below
  const PRETURI_ORG_ID = REAL_ESTATE_AGENT_SCHEMA["@id"];

  const servicePriceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": lang === "ro" ? "Administrare apartamente regim hotelier" : "Short-term rental property management",
    "name": lang === "ro" ? "Tarife administrare imobiliare Timișoara" : "Property management pricing Timișoara",
    "provider": { "@id": PRETURI_ORG_ID },
    "areaServed": { "@type": "City", "name": "Timișoara" },
    "offers": pkgs.map((p) => ({
      "@type": "Offer",
      "name": p.name,
      "description": p.tagline,
      "priceSpecification": {
        "@type": "PriceSpecification",
        "price": parseInt(p.commission),
        "priceCurrency": "EUR",
        "valueAddedTaxIncluded": false,
        "description": `${p.commission} ${p.commissionNote}`,
      },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={s.title}
        description={s.description}
        url={`${BASE_URL}/preturi`}
        breadcrumbItems={[
          { name: "Acasă", url: BASE_URL },
          { name: "Prețuri", url: `${BASE_URL}/preturi` },
        ]}
        jsonLd={[realEstateAgentSchema, servicePriceSchema]}
      />
      <Header />

      {/* Hero */}
      <section className="relative pt-40 pb-16 bg-gradient-to-b from-blue-950/60 via-blue-900/20 to-background overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(45_93%_58%/0.08),transparent_70%)]" />
        <div
          ref={heroRef}
          className={`container mx-auto px-6 relative z-10 transition-all duration-1000 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
        >
          <div className="container mx-auto px-6 mb-4">
            <PageBreadcrumb items={breadcrumbs} />
          </div>
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/40 border border-amber-500/30 mb-6">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-amber-300">
                {lang === "ro" ? "Comision transparent, fără surprize" : "Transparent commission, no surprises"}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              {lang === "ro" ? (
                <>Prețuri & Servicii de <span className="text-gradient-gold">Administrare Proprietăți Timișoara</span></>
              ) : (
                <>Pricing & <span className="text-gradient-gold">Property Management Timișoara</span></>
              )}
            </h1>
            <p className="text-base font-semibold text-amber-400 mb-2 tracking-wide">
              {lang === "ro" ? "— Tarife administrare imobiliare Timișoara, transparente —" : "— Transparent property management Timișoara pricing —"}
            </p>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {lang === "ro"
                ? "Alege pachetul potrivit proprietății tale. Solicită o ofertă preț administrare apartament personalizată — comisionul include tot, fără taxe ascunse. Servicii disponibile și în engleză pentru investitori internaționali (property management Timișoara)."
                : "Choose the right package for your property. Request a custom pricing offer — the commission includes everything, no hidden fees. Services available in English for international investors."}
            </p>

            {/* Table of Contents */}
            <nav aria-label={lang === "ro" ? "Cuprins pagină" : "Page contents"} className="mt-8 p-4 bg-muted/30 border rounded-xl text-left">
              <p className="text-sm font-semibold mb-2">{lang === "ro" ? "Sari direct la:" : "Jump to:"}</p>
              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <li><a href="#pachete" className="text-primary hover:underline">{lang === "ro" ? "💼 Pachete & Comisioane" : "💼 Packages & Commissions"}</a></li>
                <li><a href="#alte-servicii" className="text-primary hover:underline">{lang === "ro" ? "🏠 Alte servicii (vânzări, închirieri)" : "🏠 Other services"}</a></li>
                <li><a href="#zone-business" className="text-primary hover:underline">{lang === "ro" ? "🏢 Zone business (Continental, Hella)" : "🏢 Business areas"}</a></li>
                <li><a href="#garantii" className="text-primary hover:underline">{lang === "ro" ? "🛡️ Garanțiile noastre" : "🛡️ Our guarantees"}</a></li>
                <li><a href="#evaluare" className="text-primary hover:underline">{lang === "ro" ? "📊 Evaluare gratuită" : "📊 Free evaluation"}</a></li>
                <li><a href="#faq" className="text-primary hover:underline">{lang === "ro" ? "❓ Întrebări frecvente" : "❓ FAQ"}</a></li>
              </ul>
            </nav>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section id="pachete" className="py-16 px-6 scroll-mt-24">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {pkgs.map((pkg) => {
              const Icon = pkg.icon;
              return (
                <div
                  key={pkg.id}
                  className={`relative rounded-2xl border p-6 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    pkg.highlight
                      ? "border-amber-500/60 bg-gradient-to-b from-blue-950/40 to-card shadow-lg shadow-amber-500/10"
                      : "border-border bg-card"
                  }`}
                >
                  {pkg.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-blue-950 text-xs font-bold shadow-lg whitespace-nowrap">
                      ⭐ {lang === "ro" ? "Cel mai ales" : "Most chosen"}
                    </div>
                  )}

                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${pkg.highlight ? "bg-amber-500/20" : "bg-primary/10"}`}>
                    <Icon className={`w-6 h-6 ${pkg.highlight ? "text-amber-400" : "text-primary"}`} />
                  </div>

                  <h2 className="text-xl font-serif font-bold text-foreground">{pkg.name}</h2>
                  <p className="text-sm text-muted-foreground mb-4">{pkg.tagline}</p>

                  <div className="mb-6">
                    <span className={`text-5xl font-serif font-bold ${pkg.highlight ? "text-gradient-gold" : "text-foreground"}`}>
                      {pkg.commission}
                    </span>
                    <p className="text-sm text-muted-foreground mt-1">{pkg.commissionNote}</p>
                  </div>

                  <ul className="space-y-3 flex-1 mb-8">
                    {pkg.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-3">
                        {f.included ? (
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${pkg.highlight ? "text-amber-400" : "text-primary"}`} />
                        ) : (
                          <X className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground/40" />
                        )}
                        <span className={`text-sm ${f.included ? "text-foreground" : "text-muted-foreground/50"}`}>{f.text}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={pkg.highlight ? "hero" : "heroOutline"}
                    size="lg"
                    className={`w-full ${pkg.highlight ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold border-0" : ""}`}
                    onClick={handleWhatsApp}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {pkg.cta}
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Note */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            {lang === "ro"
              ? "* Toate prețurile sunt fără TVA. Comisionul se aplică doar pe veniturile generate — dacă nu se generează venituri, nu se percepe comision."
              : "* All prices exclude VAT. The commission only applies to generated revenue — if no revenue is generated, no commission is charged."}
          </p>
        </div>
      </section>

      {/* Other Services */}
      <section id="alte-servicii" className="py-16 bg-muted/20 scroll-mt-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-center text-foreground mb-4">
            {lang === "ro" ? "Alte servicii" : "Other services"}
          </h2>
          <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
            {lang === "ro"
              ? "Pe lângă administrarea în regim hotelier, oferim și următoarele servicii:"
              : "In addition to short-term rental management, we also offer:"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                emoji: "🏠",
                title: lang === "ro" ? "Intermediere tranzacții imobiliare" : "Real estate brokerage",
                commission: "2–4%",
                note: lang === "ro" ? "din valoarea tranzacției" : "of transaction value",
              },
              {
                emoji: "🔑",
                title: lang === "ro" ? "Administrare imobile (termen mediu & lung)" : "Property management (mid & long-term)",
                commission: "10%",
                note: lang === "ro" ? "pe lună, din chiria încasată" : "per month, of collected rent",
              },
              {
                emoji: "📋",
                title: lang === "ro" ? "Serviciu de închiriere" : "Leasing service",
                commission: "50–100%",
                note: lang === "ro" ? "din valoarea unei chirii lunare" : "of one month's rent value",
              },
            ].map((svc, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
                <div className="text-3xl mb-3">{svc.emoji}</div>
                <h3 className="font-semibold text-foreground mb-2">{svc.title}</h3>
                <span className="text-2xl font-serif font-bold text-gradient-gold">{svc.commission}</span>
                <p className="text-sm text-muted-foreground mt-1">{svc.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Business / Industrial Areas — Continental, Hella, Draxlmaier */}
      <section id="zone-business" className="py-16 bg-background scroll-mt-24">
        <div className="container mx-auto px-6 max-w-4xl">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-center text-foreground mb-4">
            {lang === "ro" ? "Apartamente pentru Angajați Corporate — Zone Industriale Timișoara" : "Apartments for Corporate Employees — Timișoara Industrial Areas"}
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mx-auto mb-8">
            {lang === "ro"
              ? "Administrăm apartamente cu cerere ridicată din partea angajaților marilor corporații din Timișoara — segment cheie pentru închirieri pe termen lung și mediu."
              : "We manage apartments with strong demand from major corporate employers in Timișoara — a key segment for long- and mid-term rentals."}
          </p>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="p-5 bg-card border rounded-xl">
              <h3 className="font-semibold text-foreground mb-1">{lang === "ro" ? "Închirieri lângă Continental Timișoara" : "Rentals near Continental Timișoara"}</h3>
              <p className="text-muted-foreground">{lang === "ro" ? "Calea Aradului, Ghiroda — 5–15 min de fabrica Continental." : "Calea Aradului, Ghiroda — 5–15 min from the Continental plant."}</p>
            </div>
            <div className="p-5 bg-card border rounded-xl">
              <h3 className="font-semibold text-foreground mb-1">{lang === "ro" ? "Apartamente aproape de Hella" : "Apartments near Hella"}</h3>
              <p className="text-muted-foreground">{lang === "ro" ? "Zona Aeroport / Ghiroda — convenabil pentru R&D Hella." : "Airport / Ghiroda area — convenient for Hella R&D staff."}</p>
            </div>
            <div className="p-5 bg-card border rounded-xl">
              <h3 className="font-semibold text-foreground mb-1">{lang === "ro" ? "Cazare lângă Draxlmaier" : "Stays near Draxlmaier"}</h3>
              <p className="text-muted-foreground">{lang === "ro" ? "Pol industrial est — chiriași stabili pe termen lung." : "Eastern industrial pole — stable long-term tenants."}</p>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            {lang === "ro"
              ? "Solicită o ofertă preț administrare apartament personalizată pentru zona ta — răspundem în 24h."
              : "Request a custom apartment management pricing offer for your area — we reply within 24h."}
          </p>
        </div>
      </section>

      {/* Guarantees */}
      <section id="garantii" className="py-16 bg-muted/30 scroll-mt-24">
        <div className="container mx-auto px-6 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-center text-foreground mb-10">
            {lang === "ro" ? "Garanțiile noastre" : "Our guarantees"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {guar.map((g, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
                <div className="text-3xl mb-3">{g.icon}</div>
                <h3 className="font-semibold text-foreground mb-2">{g.title}</h3>
                <p className="text-sm text-muted-foreground">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="evaluare" className="py-20 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 scroll-mt-24">
        <div className="container mx-auto px-6 text-center max-w-2xl">
          <h2 className="text-3xl font-serif font-bold text-foreground mb-4">
            {lang === "ro" ? "Evaluare gratuită pentru proprietatea ta" : "Free evaluation for your property"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {lang === "ro"
              ? "Îți spunem în 24h ce randament poți obține și ce pachet ți se potrivește cel mai bine."
              : "We'll tell you in 24h what yield you can achieve and which package suits you best."}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="xl" onClick={handleWhatsApp} className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold border-0">
              <MessageCircle className="w-5 h-5 mr-2" />
              WhatsApp
            </Button>
            <Button asChild variant="heroOutline" size="xl">
              <Link to="/pentru-proprietari">
                {lang === "ro" ? "Vezi serviciile pentru proprietari" : "View owner services"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ — pricing & costs */}
      <section id="faq" className="py-16 bg-background scroll-mt-24">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="w-5 h-5 text-primary" />
            <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
              {lang === "ro" ? "Întrebări frecvente — costuri & pachete" : "FAQ — costs & packages"}
            </h2>
          </div>
          <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card px-6">
            {pricingFaqItems.map((item, idx) => (
              <AccordionItem key={idx} value={`pricing-faq-${idx}`} className="last:border-b-0">
                <AccordionTrigger className="text-left text-foreground">{item.question}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <Footer />
      <GlobalConversionWidgets />
      <BackToTop />
    </div>
  );
};

export default Preturi;
