import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Home, BookOpen, MessageCircle, Quote, Star, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { trackConversion } from "@/lib/conversionTracking";
import { trackPdfFunnel } from "@/lib/pdfFunnelTracking";

const Multumim = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  useEffect(() => {
    // Conversion + funnel tracking. Console log is intentional to make
    // future Pixel / 3rd-party integration trivial.
    trackConversion({
      event: "contact_form_submit",
      source: "thank_you_page_view",
    });
    void trackPdfFunnel("thankyou_view", { source: "multumim_page" });
    // eslint-disable-next-line no-console
    console.info("[conversion] thank_you_view fired", {
      page: "/multumim",
      lang: language,
    });
  }, [language]);

  const t = {
    title: isRo ? "Am primit mesajul tău!" : "We received your message!",
    subtitle: isRo
      ? "Un consultant RealTrust te va contacta în maxim 1 oră lucrătoare."
      : "A RealTrust consultant will reach out within 1 business hour.",
    pageTitle: isRo ? "Mulțumim — RealTrust Timișoara" : "Thank You — RealTrust Timișoara",
    pageDesc: isRo
      ? "Mesajul tău a fost trimis către echipa RealTrust. Te contactăm în curând."
      : "Your message has been sent to the RealTrust team. We'll be in touch shortly.",
    badge: isRo ? "Confirmare primire" : "Confirmation received",
    nextStep: isRo ? "Următorul pas recomandat" : "Recommended next step",
    nextStepTitle: isRo
      ? "Vrei rezultate concrete? Hai la o evaluare la fața locului"
      : "Want concrete results? Let's meet on-site",
    nextStepDesc: isRo
      ? "Un specialist RealTrust vine la apartamentul tău, măsoară potențialul real (regim hotelier, ROI, setup) și îți construiește planul personalizat."
      : "A RealTrust specialist visits your apartment, measures the real potential (short-term rentals, ROI, setup) and builds your personalized plan.",
    ctaWhatsApp: isRo
      ? "Cere evaluare gratuită la locație"
      : "Request free on-site valuation",
    ctaWhatsAppHint: isRo
      ? "Răspuns în maxim 1 oră lucrătoare · Fără obligații"
      : "Reply within 1 business hour · No obligation",
    testimonialQuote: isRo
      ? "Am completat formularul, în 40 de minute mă suna echipa RealTrust. A doua zi erau la mine în apartament cu un plan complet. Acum încasez 2.100 EUR/lună fără să mai mișc un deget."
      : "I filled out the form, and within 40 minutes the RealTrust team called me. The next day they were at my apartment with a complete plan. Now I earn €2,100/month without lifting a finger.",
    testimonialAuthor: "Cristina P.",
    testimonialRole: isRo
      ? "Proprietar apartament · Centrul Vechi"
      : "Apartment owner · Old Town",
    explore: isRo ? "Sau explorează:" : "Or explore:",
    ctaProperties: isRo ? "Vezi apartamentele" : "See our apartments",
    ctaGuide: isRo ? "Citește Ghidul 2026" : "Read the 2026 Guide",
    backHome: isRo ? "Înapoi la pagina principală" : "Back to home",
  };

  const handleWhatsApp = () => {
    trackConversion({ event: "whatsapp_click", source: "thank_you_onsite_valuation" });
    void trackPdfFunnel("cta_evaluation", { source: "multumim_page" });
    // eslint-disable-next-line no-console
    console.info("[conversion] whatsapp_onsite_valuation_click", { page: "/multumim" });
    const message = encodeURIComponent(
      isRo
        ? "Bună ziua! Am trimis o solicitare pe RealTrust și aș dori să programez o evaluare gratuită la locație pentru apartamentul meu. Mulțumesc!"
        : "Hello! I submitted a request on RealTrust and would like to schedule a free on-site valuation for my apartment. Thank you!",
    );
    window.open(`https://wa.me/40799069256?text=${message}`, "_blank", "noopener,noreferrer");
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
          {/* Hero confirmation */}
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
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              {t.subtitle}
            </p>
          </div>

          {/* Premium WhatsApp CTA */}
          <div className="bg-card border-2 border-primary/30 rounded-3xl p-6 sm:p-8 mb-8 shadow-xl shadow-primary/5">
            <div className="text-center mb-6">
              <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary mb-2">
                {t.nextStep}
              </span>
              <h2 className="text-2xl sm:text-3xl font-serif font-semibold text-foreground mb-3">
                {t.nextStepTitle}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
                {t.nextStepDesc}
              </p>
            </div>
            <Button
              onClick={handleWhatsApp}
              size="lg"
              className="w-full h-auto py-5 text-base sm:text-lg font-semibold bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/30 gap-3"
            >
              <MessageCircle className="w-6 h-6" />
              {t.ctaWhatsApp}
            </Button>
            <p className="text-xs text-center text-muted-foreground mt-3">
              {t.ctaWhatsAppHint}
            </p>
          </div>

          {/* Testimonial */}
          <div className="bg-gradient-to-br from-muted/40 to-muted/10 border border-border/50 rounded-2xl p-6 sm:p-8 mb-8 relative">
            <Quote className="absolute top-4 left-4 w-8 h-8 text-primary/20" aria-hidden="true" />
            <div className="flex gap-1 mb-4 justify-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500" />
              ))}
            </div>
            <blockquote className="text-base sm:text-lg text-foreground italic text-center mb-4 leading-relaxed">
              "{t.testimonialQuote}"
            </blockquote>
            <div className="text-center">
              <div className="font-semibold text-sm text-foreground">{t.testimonialAuthor}</div>
              <div className="text-xs text-muted-foreground">{t.testimonialRole}</div>
            </div>
          </div>

          {/* Secondary explore */}
          <p className="text-center text-sm text-muted-foreground mb-4">{t.explore}</p>
          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            <Button asChild variant="outline" className="h-auto py-3">
              <Link to="/oaspeti" className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                {t.ctaProperties}
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3">
              <Link to="/blog/ghid-investitii-imobiliare-timisoara-2026" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {t.ctaGuide}
              </Link>
            </Button>
          </div>

          <div className="text-center">
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.backHome}
              </Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Multumim;
