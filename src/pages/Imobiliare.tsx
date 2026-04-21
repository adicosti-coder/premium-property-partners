import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";


import {
  Building2, 
  Home, 
  TrendingUp, 
  FileSearch, 
  Handshake, 
  Clock, 
  Shield, 
  Users, 
  MapPin,
  Phone,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  Calculator,
  HelpCircle,
  LineChart,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";

import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import PageSummary from "@/components/PageSummary";
import { generateRealEstateAgentSchema, generateBreadcrumbSchema } from "@/utils/schemaGenerators";

const RealEstateContactForm = lazy(() => import("@/components/RealEstateContactForm"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const RealEstateListings = lazy(() => import("@/components/RealEstateListings"));
const SEOFooterText = lazy(() => import("@/components/SEOFooterText"));

const Imobiliare = () => {
  const { t, language } = useLanguage();
  const realEstate = t.realEstatePage;


  const services = [
    {
      icon: Building2,
      title: realEstate.services.selling.title,
      description: realEstate.services.selling.description,
      features: realEstate.services.selling.features,
    },
    {
      icon: Home,
      title: realEstate.services.buying.title,
      description: realEstate.services.buying.description,
      features: realEstate.services.buying.features,
    },
    {
      icon: TrendingUp,
      title: realEstate.services.renting.title,
      description: realEstate.services.renting.description,
      features: realEstate.services.renting.features,
    },
    {
      icon: FileSearch,
      title: realEstate.services.consulting.title,
      description: realEstate.services.consulting.description,
      features: realEstate.services.consulting.features,
    },
  ];

  const benefits = [
    { icon: Clock, text: realEstate.benefits.experience },
    { icon: Shield, text: realEstate.benefits.transparency },
    { icon: Users, text: realEstate.benefits.personalized },
    { icon: MapPin, text: realEstate.benefits.localExpertise },
    { icon: Handshake, text: realEstate.benefits.fullSupport },
    { icon: CheckCircle2, text: realEstate.benefits.results },
  ];

  const steps = [
    { number: "01", title: realEstate.process.steps[0].title, description: realEstate.process.steps[0].description },
    { number: "02", title: realEstate.process.steps[1].title, description: realEstate.process.steps[1].description },
    { number: "03", title: realEstate.process.steps[2].title, description: realEstate.process.steps[2].description },
    { number: "04", title: realEstate.process.steps[3].title, description: realEstate.process.steps[3].description },
  ];

  const seoContent = {
    ro: {
      title: "Imobiliare Timișoara: Vânzări, Închirieri, Regim Hotelier | RealTrust",
      description: "Investește profitabil în imobiliare Timișoara! Apartamente regim hotelier, vânzări, închirieri lângă UVT, Iulius Town, Aeroport. Calculează ROI gratuit!"
    },
    en: {
      title: "Real Estate Timișoara: Sales, Rentals, Hotel-Style | RealTrust",
      description: "Profitable real estate investment in Timișoara! Hotel-style apartments, sales, rentals near UVT, Iulius Town, Airport. Free ROI calculator."
    }
  };

  const seo = seoContent[language as keyof typeof seoContent] || seoContent.ro;

  const faqItems = language === "ro" ? [
    {
      question: "Cum funcționează evaluarea apartamentului în Timișoara?",
      answer: "Evaluarea apartamentului este gratuită și se face în 24-48h: analizăm zona (ISHO, Complex Studențesc, Dumbrăvița, Giroc, Săcălaz, Giarmata Vii etc.), starea proprietății, comparabile vândute recent și potențialul de randament. Primești un raport PDF cu preț minim, mediu și maxim de listare.",
    },
    {
      question: "Ce include consultanța imobiliară RealTrust în Timișoara?",
      answer: "Consultanța imobiliară completă include: analiza pieței locale, due diligence juridic (acte, sarcini, intabulare), strategie de finanțare (credit ipotecar Prima Casă/Noua Casă), negociere preț, asistență la notar și optimizare fiscală. Comision transparent de 2% pentru vânzări.",
    },
    {
      question: "Cum evoluează piața imobiliară din Timișoara în 2026?",
      answer: "Piața imobiliară Timișoara crește moderat cu 5-8% în 2026, susținută de Parcul Industrial și Tehnologic Timișoara, Continental Automotive și expansiunea metropolitană (Dumbrăvița, Giroc, Săcălaz, Giarmata Vii). Cele mai active zone: ISHO, Complex Studențesc, Iosefin.",
    },
    {
      question: "Ce randament am la o investiție imobiliară în Timișoara?",
      answer: "Pentru regim hotelier administrat profesional: 9.4% ROI net verificat. Pentru chirie clasică pe termen lung: 4-5% net. Cele mai bune randamente sunt în Complex Studențesc (cerere studenți UVT/UPT) și ISHO (proximitate Iulius Town și aeroport).",
    },
    {
      question: "Care sunt costurile la cumpărarea unui apartament în Timișoara?",
      answer: "Pe lângă prețul de achiziție: comision agenție 2%, taxe notariale 0.4-1.6% (degresiv), intabulare CF ~0.5%, impozit transfer 1% (pentru imobile peste 450.000 lei deținute sub 3 ani). Total estimat: 3-4% peste preț.",
    },
    {
      question: "Oferiți servicii de administrare apartamente regim hotelier?",
      answer: "Da. RealTrust oferă administrare completă regim hotelier în Timișoara: listare Booking/Airbnb, channel management, check-in/check-out, curățenie 5⭐, marketing și raportare lunară transparentă. Comision 20% din venit, fără costuri ascunse.",
    },
  ] : [
    {
      question: "How does apartment evaluation work in Timișoara?",
      answer: "Apartment evaluation is free and delivered in 24-48h: we analyze the zone (ISHO, Student Complex, Dumbrăvița, Giroc, Săcălaz, Giarmata Vii etc.), property condition, recent comparables and yield potential. You receive a PDF report with min/avg/max listing price.",
    },
    {
      question: "What does RealTrust real estate consulting include in Timișoara?",
      answer: "Full real estate consulting: local market analysis, legal due diligence (deeds, encumbrances, Land Registry), financing strategy (Prima Casă/Noua Casă mortgages), price negotiation, notary support and tax optimization. Transparent 2% sales commission.",
    },
    {
      question: "How is the Timișoara real estate market evolving in 2026?",
      answer: "Timișoara real estate is growing moderately at 5-8% in 2026, supported by Timișoara Industrial & Technology Park, Continental Automotive and metropolitan expansion (Dumbrăvița, Giroc, Săcălaz, Giarmata Vii). Most active zones: ISHO, Student Complex, Iosefin.",
    },
    {
      question: "What yield can I get from a Timișoara real estate investment?",
      answer: "Professionally managed hotel-style: 9.4% verified net ROI. Long-term classic rental: 4-5% net. Best yields are in Student Complex (UVT/UPT student demand) and ISHO (proximity to Iulius Town and airport).",
    },
    {
      question: "What are the costs of buying an apartment in Timișoara?",
      answer: "Beyond purchase price: 2% agency commission, 0.4-1.6% notary (degressive), ~0.5% Land Registry, 1% transfer tax (for properties over 450,000 RON owned less than 3 years). Estimated total: 3-4% above price.",
    },
    {
      question: "Do you offer hotel-style apartment management services?",
      answer: "Yes. RealTrust offers complete hotel-style management in Timișoara: Booking/Airbnb listing, channel management, check-in/check-out, 5⭐ cleaning, marketing and transparent monthly reporting. 20% commission, no hidden costs.",
    },
  ];

  useRegisterFAQs("imobiliare-page", faqItems);

  const breadcrumbItems = [
    { label: language === "ro" ? "Servicii Imobiliare" : "Real Estate Services" }
  ];

  // Generate Schema.org structured data
  const realEstateAgentSchema = generateRealEstateAgentSchema();
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Acasă", url: "https://www.realtrust.ro" },
    { name: language === "ro" ? "Servicii Imobiliare" : "Real Estate Services", url: "https://www.realtrust.ro/imobiliare" }
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={seo.title}
        description={seo.description}
        url="https://www.realtrust.ro/imobiliare"
        jsonLd={[realEstateAgentSchema, breadcrumbSchema]}
      />
      <Header />
      <Suspense fallback={null}>
      
      {/* Breadcrumb + Summary */}
      <div className="container mx-auto px-6 pt-24">
        <PageSummary
          summaryRo="Servicii imobiliare complete în Timișoara: vânzări, cumpărări, închirieri clasice. Consultanță profesională, evaluări de piață, suport juridic complet și acces la anunțuri exclusive."
          summaryEn="Complete real estate services in Timișoara: sales, purchases, classic rentals. Professional consulting, market evaluations, full legal support and access to exclusive listings."
        />
        <PageBreadcrumb items={breadcrumbItems} />
      </div>
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-[10%] w-32 h-32 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-40 right-[10%] w-48 h-48 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute bottom-10 left-1/4 w-24 h-24 rounded-full bg-primary/10 blur-2xl" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div 
            className="max-w-4xl mx-auto text-center"
          >
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-6">
              {realEstate.hero.badge}
            </span>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
              {realEstate.hero.title}{" "}
              <span className="text-primary">{realEstate.hero.titleHighlight}</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              {realEstate.hero.subtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                variant="hero" 
                size="lg"
                onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(realEstate.cta.whatsappMessage)}`, '_blank', 'noopener,noreferrer')}
                className="group"
              >
                <Phone className="w-5 h-5 mr-2" />
                {realEstate.cta.contact}
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {realEstate.cta.learnMore}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="relative py-20 md:py-28 bg-muted/30 overflow-hidden">
        {/* Parallax decorative elements - Services - offset to prevent edge overflow */}
        <div className="absolute top-32 right-[10%] w-40 h-40 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-20 left-[10%] w-28 h-28 rounded-full bg-primary/8 blur-2xl" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div 
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
              {realEstate.services.label}
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {realEstate.services.title}{" "}
              <span className="text-primary">{realEstate.services.titleHighlight}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {realEstate.services.subtitle}
            </p>
          </div>

          <div 
            className="grid md:grid-cols-2 gap-8"
          >
            {services.map((service, index) => (
              <Card 
                key={index} 
                className="group bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-8">
                  <div className="flex items-start gap-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <service.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-foreground mb-3 group-hover:text-primary transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {service.description}
                      </p>
                      <ul className="space-y-2">
                        {service.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Parallax decorative elements - Benefits - offset to prevent edge overflow */}
        <div className="absolute top-16 left-[10%] w-36 h-36 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-24 right-[10%] w-44 h-44 rounded-full bg-primary/6 blur-3xl" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div 
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
              {realEstate.benefits.label}
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {realEstate.benefits.title}{" "}
              <span className="text-primary">{realEstate.benefits.titleHighlight}</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {realEstate.benefits.subtitle}
            </p>
          </div>

          <div 
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-center gap-4 p-6 bg-card rounded-xl border border-border hover:border-primary/50 transition-all duration-300"
                style={{ transitionDelay: `${index * 75}ms` }}
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="w-6 h-6 text-primary" />
                </div>
                <span className="text-foreground font-medium">{benefit.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="relative py-20 md:py-28 bg-muted/30 overflow-hidden">
        {/* Parallax decorative elements - Process - offset to prevent edge overflow */}
        <div className="absolute top-24 right-[15%] w-32 h-32 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-16 left-1/3 w-40 h-40 rounded-full bg-primary/8 blur-3xl" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div 
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
              {realEstate.process.label}
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {realEstate.process.title}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {realEstate.process.subtitle}
            </p>
          </div>

          <div 
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
          >
            {steps.map((step, index) => (
              <div 
                key={index} 
                className="relative"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="text-6xl font-serif font-bold text-primary/10 mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 right-0 translate-x-1/2 w-8 h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real Estate Listings - Vânzări & Închirieri */}
      <RealEstateListings />

      {/* Market Analysis + Evaluation + Consulting Section */}
      <section className="relative py-20 md:py-28 bg-muted/20 overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-12 max-w-3xl mx-auto">
            <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
              <LineChart className="w-4 h-4 inline mr-1.5" />
              {language === "ro" ? "Analiză & Consultanță" : "Analysis & Consulting"}
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {language === "ro"
                ? "Piața imobiliară Timișoara — analiză, evaluare și consultanță"
                : "Timișoara real estate market — analysis, evaluation and consulting"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ro"
                ? "Date reale despre evoluția prețurilor pe cartiere, evaluare apartament gratuită în 24h și consultanță imobiliară completă pentru cumpărători, vânzători și investitori."
                : "Real data on neighborhood price trends, free 24h apartment evaluation and complete real estate consulting for buyers, sellers and investors."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Card 1: Market Analysis */}
            <Card className="bg-card border-border hover:border-primary/40 transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {language === "ro" ? "Piața imobiliară Timișoara 2026" : "Timișoara real estate market 2026"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {language === "ro"
                    ? "Creștere moderată 5-8% în 2026, susținută de Parcul Industrial și Tehnologic Timișoara, Continental Automotive și expansiunea metropolitană (Dumbrăvița, Giroc, Săcălaz, Giarmata Vii). ISHO și Complex Studențesc rămân cele mai active zone."
                    : "Moderate 5-8% growth in 2026, driven by Timișoara Industrial & Technology Park, Continental Automotive and metropolitan expansion (Dumbrăvița, Giroc, Săcălaz, Giarmata Vii). ISHO and Student Complex remain the most active areas."}
                </p>
                <Link to="/piata-imobiliara-timisoara">
                  <Button variant="outline" size="sm" className="w-full group">
                    {language === "ro" ? "Vezi analiza pieței" : "See market analysis"}
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Card 2: Free Evaluation */}
            <Card className="bg-card border-primary/30 hover:border-primary/60 transition-all relative overflow-hidden">
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
                {language === "ro" ? "Gratuit" : "Free"}
              </div>
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileSearch className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {language === "ro" ? "Evaluare apartament Timișoara" : "Apartment evaluation Timișoara"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {language === "ro"
                    ? "Evaluare gratuită în 24-48h: analizăm zona, comparabile recente, starea proprietății și potențialul de randament. Primești raport PDF cu preț minim/mediu/maxim de listare."
                    : "Free evaluation in 24-48h: we analyze the zone, recent comparables, property condition and yield potential. You receive a PDF report with min/avg/max listing price."}
                </p>
                <Link to="/evaluare-gratuita">
                  <Button variant="hero" size="sm" className="w-full group">
                    <Calculator className="w-4 h-4 mr-2" />
                    {language === "ro" ? "Solicită evaluare gratuită" : "Request free evaluation"}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Card 3: Real Estate Consulting */}
            <Card className="bg-card border-border hover:border-primary/40 transition-all">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Handshake className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {language === "ro" ? "Consultanță imobiliară Timișoara" : "Real estate consulting Timișoara"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {language === "ro"
                    ? "Consultanță completă: analiză juridică (acte, sarcini, intabulare CF), strategie de finanțare (Prima Casă, Noua Casă), negociere preț, asistență la notar și optimizare fiscală. Comision 2%."
                    : "Complete consulting: legal analysis (deeds, liens, Land Registry), financing strategy (Prima Casă, Noua Casă), price negotiation, notary support and tax optimization. 2% commission."}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full group"
                  onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(language === "ro" ? "Bună ziua, vreau o consultanță imobiliară." : "Hello, I'd like real estate consulting.")}`, '_blank', 'noopener,noreferrer')}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  {language === "ro" ? "Discută cu un consultant" : "Talk to a consultant"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Inline mid-page CTA bar */}
          <div className="mt-12 max-w-4xl mx-auto rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 justify-between">
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-1">
                {language === "ro" ? "Calculează randamentul investiției tale în 30 secunde" : "Calculate your investment yield in 30 seconds"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === "ro" ? "Compară regim hotelier vs. chirie clasică pentru proprietatea ta din Timișoara." : "Compare hotel-style vs. classic rental for your Timișoara property."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link to="/calculator-roi">
                <Button variant="hero" size="lg">
                  <Calculator className="w-5 h-5 mr-2" />
                  {language === "ro" ? "Calculează ROI acum" : "Calculate ROI now"}
                </Button>
              </Link>
              <Link to="/investitii">
                <Button variant="outline" size="lg">
                  {language === "ro" ? "Vezi investiții active" : "See active investments"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section — generates FAQPage schema via FAQSchemaProvider */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6 max-w-3xl">
          <div className="text-center mb-10">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
              <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
              FAQ
            </span>
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">
              {language === "ro"
                ? "Întrebări frecvente despre imobiliare în Timișoara"
                : "Frequently asked questions about Timișoara real estate"}
            </h2>
            <p className="text-muted-foreground">
              {language === "ro"
                ? "Răspunsuri detaliate despre evaluare, consultanță, randamente și costuri de tranzacție."
                : "Detailed answers about evaluation, consulting, yields and transaction costs."}
            </p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Contact Form Section */}
      <RealEstateContactForm />

      {/* CTA Section */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        {/* Parallax decorative elements - CTA */}
        <div className="absolute top-10 left-1/4 w-24 h-24 rounded-full bg-primary/6 blur-2xl" />
        <div className="absolute bottom-20 right-1/4 w-36 h-36 rounded-full bg-primary/5 blur-3xl" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div 
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-8 md:p-16 text-center"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(var(--primary)/0.2),transparent_50%)]" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                {realEstate.cta.title}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                {realEstate.cta.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button 
                  variant="hero" 
                  size="lg"
                  onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="group"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  {realEstate.cta.contact}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                <a href="tel:+40723154520">
                  <Button variant="outline" size="lg">
                    <Phone className="w-5 h-5 mr-2" />
                    0799 069 256
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SEOFooterText pageType="listings" city="Timișoara" />
      <Footer />
      <GlobalConversionWidgets />
      <BackToTop />
      </Suspense>
    </div>
  );
};

export default Imobiliare;
