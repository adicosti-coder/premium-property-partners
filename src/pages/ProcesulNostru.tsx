import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  ClipboardCheck,
  Sparkles,
  Camera,
  Settings,
  Rocket,
  ArrowRight,
  CheckCircle2,
  Award,
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { Button } from "@/components/ui/button";

/**
 * Dedicated page that visualises the 5 partnership steps already exposed
 * via the HowTo schema in PartnershipTimeline. Reinforces E-E-A-T by
 * crediting Adrian Costi as the expert coordinating each stage.
 */
const ProcesulNostru = () => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";

  const t = {
    ro: {
      seoTitle: "Procesul Nostru — 5 Pași spre Profit | RealTrust Timișoara",
      seoDescription:
        "Vezi cei 5 pași pe care RealTrust îi parcurge pentru a transforma apartamentul tău din Timișoara într-o sursă de venit pasiv cu peste 9% ROI net.",
      breadcrumb: "Procesul Nostru",
      badge: "Procesul RealTrust · 5 pași",
      title: "Cum transformăm apartamentul tău",
      titleAccent: "în profit lunar predictibil",
      subtitle:
        "De la prima evaluare la primul payout în cont — un proces de 5-7 zile lucrătoare, coordonat personal de echipa RealTrust.",
      ctaPrimary: "Evaluează Profitul",
      ctaSecondary: "Vezi pachete",
      whatWeDo: "Ce facem",
      result: "Rezultat",
      duration: "Durată",
      expertTitle: "Coordonat de fondatorul RealTrust",
      expertBody:
        "Fiecare etapă este supervizată personal de Adrian Costi, fondator & CEO RealTrust, cu peste 20 de ani de experiență în piața imobiliară din Timișoara. Adrian a coordonat onboarding-ul a peste 180 de proprietăți și menține un standard documentat de 9.4% ROI net pentru proprietarii noștri.",
      expertCta: "Despre Adrian Costi",
      finalTitle: "Gata să începi?",
      finalSubtitle: "Calculează venitul tău în 60 de secunde — fără costuri ascunse.",
      finalCta: "Evaluează Profitul",
      steps: [
        {
          icon: ClipboardCheck,
          title: "Evaluare & Consultanță",
          desc: "Analizăm proprietatea, potențialul de venit și stabilim împreună strategia optimă de preț pentru zona ta din Timișoara.",
          result: "Plan personalizat de management",
          duration: "Ziua 1",
        },
        {
          icon: Sparkles,
          title: "Pregătire profesională",
          desc: "Curățenie profundă, aranjamente și mici amenajări menite să maximizeze atractivitatea și recenziile primite.",
          result: "Proprietate pregătită 5 stele",
          duration: "Ziua 2",
        },
        {
          icon: Camera,
          title: "Listare premium",
          desc: "Ședință foto profesională, copywriting SEO bilingv și publicare pe Booking, Airbnb, Expedia + portalul direct RealTrust.",
          result: "Anunț premium cu vizibilitate maximă",
          duration: "Zilele 3-4",
        },
        {
          icon: Settings,
          title: "Management activ",
          desc: "Smart lock, calendar sincronizat, pricing dinamic AI, suport oaspeți 24/7 și mentenanță gestionată integral de echipa noastră.",
          result: "Operare hotelieră fără implicarea ta",
          duration: "Zilele 5-7",
        },
        {
          icon: Rocket,
          title: "Profit lunar",
          desc: "Banii intră direct în contul tău lunar, însoțiți de raport financiar transparent. ROI net verificat de 9%+ pe an.",
          result: "9.4% ROI net anual",
          duration: "De la ziua 30",
        },
      ],
    },
    en: {
      seoTitle: "Our Process — 5 Steps to Profit | RealTrust Timișoara",
      seoDescription:
        "See the 5 steps RealTrust takes to turn your Timișoara apartment into a passive income source with over 9% net ROI.",
      breadcrumb: "Our Process",
      badge: "The RealTrust Process · 5 steps",
      title: "How we turn your apartment",
      titleAccent: "into predictable monthly profit",
      subtitle:
        "From first evaluation to first payout — a 5-7 business day process, personally coordinated by the RealTrust team.",
      ctaPrimary: "Evaluate Profit",
      ctaSecondary: "See packages",
      whatWeDo: "What we do",
      result: "Result",
      duration: "Duration",
      expertTitle: "Coordinated by the RealTrust founder",
      expertBody:
        "Every stage is personally supervised by Adrian Costi, founder & CEO of RealTrust, with over 20 years of experience in the Timișoara real estate market. Adrian has coordinated onboarding for 180+ properties and maintains a documented 9.4% net ROI standard for our owners.",
      expertCta: "About Adrian Costi",
      finalTitle: "Ready to start?",
      finalSubtitle: "Calculate your income in 60 seconds — no hidden fees.",
      finalCta: "Evaluate Profit",
      steps: [
        {
          icon: ClipboardCheck,
          title: "Evaluation & Consulting",
          desc: "We analyze the property, income potential and set the optimal pricing strategy for your Timișoara neighborhood.",
          result: "Personalized management plan",
          duration: "Day 1",
        },
        {
          icon: Sparkles,
          title: "Professional preparation",
          desc: "Deep cleaning, styling and minor improvements designed to maximize attractiveness and review scores.",
          result: "5-star ready property",
          duration: "Day 2",
        },
        {
          icon: Camera,
          title: "Premium listing",
          desc: "Professional photo session, bilingual SEO copy and publication on Booking, Airbnb, Expedia + RealTrust direct portal.",
          result: "Premium listing with maximum visibility",
          duration: "Days 3-4",
        },
        {
          icon: Settings,
          title: "Active management",
          desc: "Smart lock, synced calendar, AI dynamic pricing, 24/7 guest support and full maintenance handled by our team.",
          result: "Hotel-grade operations without your involvement",
          duration: "Days 5-7",
        },
        {
          icon: Rocket,
          title: "Monthly profit",
          desc: "Money lands in your account monthly, alongside a transparent financial report. Verified 9%+ net annual ROI.",
          result: "9.4% net annual ROI",
          duration: "From day 30",
        },
      ],
    },
  }[lang];

  // HowTo schema (mirrors PartnershipTimeline) with Adrian Costi via shared @id
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": t.title + " " + t.titleAccent,
    "description": t.subtitle,
    "totalTime": "P7D",
    "inLanguage": lang === "ro" ? "ro-RO" : "en-US",
    "author": {
      "@type": "Person",
      "@id": "https://www.realtrust.ro/despre-noi#adrian-costi",
      "name": "Adrian Costi",
      "jobTitle": lang === "ro" ? "Fondator & CEO RealTrust" : "Founder & CEO RealTrust",
      "url": "https://www.realtrust.ro/despre-noi",
    },
    "publisher": {
      "@type": "Organization",
      "name": "RealTrust & ApArt Hotel Timișoara",
      "url": "https://www.realtrust.ro",
      "logo": {
        "@type": "ImageObject",
        "url": "https://www.realtrust.ro/images/hero-optimized-800w.webp",
        "width": 800,
        "height": 450,
      },
    },
    "step": t.steps.map((s, i) => ({
      "@type": "HowToStep",
      "position": i + 1,
      "name": s.title,
      "text": s.desc,
      "url": `https://www.realtrust.ro/procesul-nostru#step-${i + 1}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={t.seoTitle}
        description={t.seoDescription}
        url="https://www.realtrust.ro/procesul-nostru"
        breadcrumbItems={[
          { name: lang === "ro" ? "Acasă" : "Home", url: "https://www.realtrust.ro" },
          { name: t.breadcrumb, url: "https://www.realtrust.ro/procesul-nostru" },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
      </Helmet>
      <Header />

      <div className="container mx-auto px-6 pt-24">
        <PageBreadcrumb items={[{ label: t.breadcrumb }]} />
      </div>

      {/* Hero */}
      <section className="relative pt-8 pb-16 md:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background pointer-events-none" />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-5">
              <Award className="w-4 h-4" />
              {t.badge}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-5">
              {t.title}{" "}
              <span className="text-gradient-gold">{t.titleAccent}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">{t.subtitle}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold border-0">
                <Link to="/evaluare-gratuita">
                  {t.ctaPrimary} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/preturi">{t.ctaSecondary}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {t.steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <article
                  key={i}
                  id={`step-${i + 1}`}
                  className="group relative flex flex-col md:flex-row gap-5 md:gap-7 p-6 md:p-7 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-elegant transition-all duration-300"
                >
                  {/* Step number + icon */}
                  <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-3 md:min-w-[120px]">
                    <div className="relative">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20">
                        <Icon className="w-7 h-7 md:w-8 md:h-8 text-blue-950" />
                      </div>
                      <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-950 text-amber-400 text-xs font-bold flex items-center justify-center border-2 border-card">
                        {i + 1}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-primary md:text-center">
                      {step.duration}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-2">
                      {step.title}
                    </h2>
                    <p className="text-base text-muted-foreground leading-relaxed mb-4">
                      {step.desc}
                    </p>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      {step.result}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Expert E-E-A-T section */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto rounded-3xl bg-card border border-border p-8 md:p-10 shadow-elegant">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-serif font-bold text-foreground">
                  {t.expertTitle}
                </h2>
                <p className="text-sm text-muted-foreground">Adrian Costi · Founder &amp; CEO</p>
              </div>
            </div>
            <p className="text-base text-foreground/80 leading-relaxed mb-5">{t.expertBody}</p>
            <Link
              to="/despre-noi"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {t.expertCta} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-3">
              {t.finalTitle}
            </h2>
            <p className="text-lg text-muted-foreground mb-6">{t.finalSubtitle}</p>
            <Button asChild size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold border-0">
              <Link to="/evaluare-gratuita">
                {t.finalCta} <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProcesulNostru;
