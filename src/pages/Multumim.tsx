import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Home, BookOpen, Calculator, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { trackConversion } from "@/lib/conversionTracking";

const Multumim = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  useEffect(() => {
    // Fire conversion goal event when the thank-you page is shown
    trackConversion({
      event: "contact_form_submit",
      source: "thank_you_page_view",
    });
  }, []);

  const t = {
    title: isRo ? "Am primit mesajul tău!" : "We received your message!",
    subtitle: isRo
      ? "Un consultant RealTrust te va contacta în maxim 1 oră lucrătoare."
      : "A RealTrust consultant will reach out within 1 business hour.",
    explore: isRo ? "Între timp, explorează:" : "In the meantime, explore:",
    pageTitle: isRo ? "Mulțumim — RealTrust Timișoara" : "Thank You — RealTrust Timișoara",
    pageDesc: isRo
      ? "Mesajul tău a fost trimis către echipa RealTrust. Te contactăm în curând."
      : "Your message has been sent to the RealTrust team. We'll be in touch shortly.",
    ctaProperties: isRo ? "Vezi apartamentele" : "See our apartments",
    ctaPropertiesDesc: isRo ? "Catalog premium regim hotelier" : "Premium short-term rentals",
    ctaGuide: isRo ? "Citește Ghidul 2026" : "Read the 2026 Guide",
    ctaGuideDesc: isRo ? "Investiții imobiliare Timișoara" : "Timișoara real estate investments",
    ctaEval: isRo ? "Evaluare Gratuită" : "Free Valuation",
    ctaEvalDesc: isRo ? "Află profitul potențial al proprietății tale" : "Discover your property's profit potential",
    badge: isRo ? "Confirmare primire" : "Confirmation received",
  };

  return (
    <>
      <SEOHead
        title={t.pageTitle}
        description={t.pageDesc}
        noIndex={true}
      />
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-amber-50/40 via-background to-background pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-3xl">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 mb-6 shadow-lg shadow-amber-500/30">
              <CheckCircle2 className="w-10 h-10 text-blue-950" strokeWidth={2.5} />
            </div>
            <span className="inline-block bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-semibold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
              {t.badge}
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-4 text-foreground">
              {t.title}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-2">
              {t.subtitle}
            </p>
            <p className="text-sm text-muted-foreground/80">{t.explore}</p>
          </div>

          {/* CTAs */}
          <div className="grid gap-4 sm:gap-5">
            <Link
              to="/oaspeti"
              onClick={() => trackConversion({ event: "contact_form_submit", source: "thank_you_cta_properties" })}
              className="group flex items-center gap-4 p-5 sm:p-6 bg-card border-2 border-border hover:border-amber-500 rounded-2xl transition-all hover:shadow-lg"
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <Home className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg text-foreground">{t.ctaProperties}</h3>
                <p className="text-sm text-muted-foreground">{t.ctaPropertiesDesc}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/blog/ghid-investitii-imobiliare-timisoara-2026"
              onClick={() => trackConversion({ event: "lead_magnet_pdf", source: "thank_you_cta_guide" })}
              className="group flex items-center gap-4 p-5 sm:p-6 bg-card border-2 border-border hover:border-amber-500 rounded-2xl transition-all hover:shadow-lg"
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                <BookOpen className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg text-foreground">{t.ctaGuide}</h3>
                <p className="text-sm text-muted-foreground">{t.ctaGuideDesc}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
            </Link>

            <Link
              to="/evaluare-gratuita"
              onClick={() => trackConversion({ event: "roi_calculator_lead", source: "thank_you_cta_evaluation" })}
              className="group flex items-center gap-4 p-5 sm:p-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 rounded-2xl transition-all hover:shadow-xl shadow-amber-500/30"
            >
              <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-950/10 flex items-center justify-center">
                <Calculator className="w-6 h-6 text-blue-950" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base sm:text-lg text-blue-950">{t.ctaEval}</h3>
                <p className="text-sm text-blue-950/80">{t.ctaEvalDesc}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-950 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {/* Back link */}
          <div className="mt-10 text-center">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">{isRo ? "← Înapoi la pagina principală" : "← Back to home"}</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Multumim;
