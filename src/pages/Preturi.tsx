import { Link } from "react-router-dom";
import { CheckCircle2, X, MessageCircle, ArrowRight, TrendingUp, Shield, Star, Zap } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const packages = {
  ro: [
    {
      id: "essential",
      icon: Shield,
      name: "Esențial",
      tagline: "Start fără stres",
      commission: "25%",
      commissionNote: "din venitul brut",
      highlight: false,
      features: [
        { text: "Listare pe Airbnb & Booking.com", included: true },
        { text: "Fotografii profesionale de bază", included: true },
        { text: "Check-in standard", included: true },
        { text: "Curățenie între sejururi", included: true },
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
        { text: "Curățenie profesională între sejururi", included: true },
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
      commission: "18%",
      commissionNote: "din venitul brut",
      highlight: false,
      features: [
        { text: "Listare pe Airbnb & Booking.com", included: true },
        { text: "Fotografii & video profesionale", included: true },
        { text: "Self check-in 24/7 cu smart lock", included: true },
        { text: "Curățenie profesională & inspecție calitate", included: true },
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
      id: "essential",
      icon: Shield,
      name: "Essential",
      tagline: "Stress-free start",
      commission: "25%",
      commissionNote: "of gross revenue",
      highlight: false,
      features: [
        { text: "Listing on Airbnb & Booking.com", included: true },
        { text: "Basic professional photography", included: true },
        { text: "Standard check-in", included: true },
        { text: "Cleaning between stays", included: true },
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
        { text: "Professional cleaning between stays", included: true },
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
      commission: "18%",
      commissionNote: "of gross revenue",
      highlight: false,
      features: [
        { text: "Listing on Airbnb & Booking.com", included: true },
        { text: "Professional photos & video", included: true },
        { text: "24/7 self check-in with smart lock", included: true },
        { text: "Professional cleaning & quality inspection", included: true },
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
    window.open(`https://wa.me/40723154520?text=${msg}`, "_blank");
  };

  const seo = {
    ro: {
      title: "Prețuri & Pachete | Administrare Apartamente Timișoara | RealTrust",
      description: "Prețuri transparente pentru administrare apartamente în regim hotelier. Comision de la 18%. Fără costuri ascunse. Evaluare gratuită!",
    },
    en: {
      title: "Pricing & Packages | Apartment Management Timișoara | RealTrust",
      description: "Transparent pricing for short-term rental management. Commission from 18%. No hidden fees. Free evaluation!",
    },
  };

  const s = seo[lang];
  const breadcrumbs = [{ label: lang === "ro" ? "Prețuri" : "Pricing" }];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={s.title}
        description={s.description}
        url="https://realtrust.ro/preturi"
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
              {lang === "ro" ? "Pachete & " : "Packages & "}
              <span className="text-gradient-gold">{lang === "ro" ? "Prețuri" : "Pricing"}</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {lang === "ro"
                ? "Alege pachetul potrivit proprietății tale. Comisionul include tot — nu există taxe ascunse."
                : "Choose the right package for your property. The commission includes everything — no hidden fees."}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {pkgs.map((pkg) => {
              const Icon = pkg.icon;
              return (
                <div
                  key={pkg.id}
                  className={`relative rounded-2xl border p-8 flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
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

      {/* Guarantees */}
      <section className="py-16 bg-muted/30">
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
      <section className="py-20 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
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
                {lang === "ro" ? "Află mai multe" : "Learn more"}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <GlobalConversionWidgets />
      <BackToTop />
    </div>
  );
};

export default Preturi;
