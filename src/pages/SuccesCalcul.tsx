import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MessageCircle, Quote, Star, ArrowLeft, Calculator } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { trackConversion } from "@/lib/conversionTracking";
import { trackPdfFunnel } from "@/lib/pdfFunnelTracking";

/**
 * /succes-calcul — confirmation page after fiscal PDF download.
 * Premium thank-you experience focused on converting the lead into a
 * free on-site valuation via WhatsApp.
 */
const SuccesCalcul = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  useEffect(() => {
    // Conversion + funnel tracking. Console log is intentional for
    // future Pixel / 3rd-party integrations to hook into.
    trackConversion({
      event: "lead_magnet_pdf",
      source: "succes_calcul_view",
    });
    void trackPdfFunnel("thankyou_view", { source: "succes_calcul_page" });
    // eslint-disable-next-line no-console
    console.info("[conversion] succes_calcul_view fired", {
      page: "/succes-calcul",
      lang: language,
    });
  }, [language]);

  const t = {
    pageTitle: isRo
      ? "Calcul fiscal descărcat — RealTrust Timișoara"
      : "Fiscal calculation downloaded — RealTrust Timișoara",
    pageDesc: isRo
      ? "Calculul comparativ PFA vs SRL a fost generat. Programează acum o evaluare gratuită la locație."
      : "Your PFA vs SRL comparison has been generated. Book a free on-site valuation now.",
    badge: isRo ? "PDF generat cu succes" : "PDF generated successfully",
    title: isRo
      ? "Calculul tău fiscal este gata!"
      : "Your fiscal calculation is ready!",
    subtitle: isRo
      ? "Verifică folderul Descărcări. PDF-ul brandat RealTrust conține toate cifrele PFA vs SRL pentru venitul tău."
      : "Check your Downloads folder. The RealTrust-branded PDF contains all PFA vs SRL figures for your income.",
    nextStep: isRo ? "Următorul pas recomandat" : "Recommended next step",
    nextStepTitle: isRo
      ? "Hai să facem evaluarea reală a apartamentului tău"
      : "Let's do the real valuation of your apartment",
    nextStepDesc: isRo
      ? "Un specialist RealTrust vine la locație, măsoară potențialul real (regim hotelier, setup interior, ROI), apoi îți construim împreună planul fiscal optim."
      : "A RealTrust specialist visits on-site, measures the real potential (short-term rental, interior setup, ROI), and we build the optimal fiscal plan together.",
    ctaWhatsApp: isRo
      ? "Cere evaluare gratuită la locație"
      : "Request free on-site valuation",
    ctaWhatsAppHint: isRo
      ? "Răspuns în maxim 1 oră lucrătoare · Fără obligații"
      : "Reply within 1 business hour · No obligation",
    testimonialQuote: isRo
      ? "Am descărcat calculul, apoi am cerut evaluarea la locație. În 3 săptămâni apartamentul meu din Iulius Town genera deja 2.400 EUR/lună în regim hotelier prin RealTrust. Decizia SRL a meritat fiecare leu."
      : "I downloaded the calculation, then requested the on-site valuation. Within 3 weeks my Iulius Town apartment was already generating €2,400/month under short-term rentals via RealTrust. The SRL decision was worth every penny.",
    testimonialAuthor: "Andrei M.",
    testimonialRole: isRo
      ? "Proprietar apartament · Iulius Town"
      : "Apartment owner · Iulius Town",
    backHome: isRo ? "Înapoi la pagina principală" : "Back to home",
    seeRoi: isRo ? "Calculator ROI complet" : "Full ROI calculator",
  };

  const handleWhatsApp = () => {
    trackConversion({ event: "whatsapp_click", source: "succes_calcul_onsite_valuation" });
    void trackPdfFunnel("cta_evaluation", { source: "succes_calcul_page" });
    // eslint-disable-next-line no-console
    console.info("[conversion] whatsapp_onsite_valuation_click", { page: "/succes-calcul" });
    const message = encodeURIComponent(
      isRo
        ? "Bună ziua! Am descărcat calculul fiscal PFA vs SRL de pe RealTrust și aș dori să programez o evaluare gratuită la locație pentru apartamentul meu. Mulțumesc!"
        : "Hello! I downloaded the PFA vs SRL fiscal calculation from RealTrust and would like to schedule a free on-site valuation for my apartment. Thank you!",
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

          {/* Secondary actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline" size="sm">
              <Link to="/calculator-roi">
                <Calculator className="w-4 h-4 mr-2" />
                {t.seeRoi}
              </Link>
            </Button>
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

export default SuccesCalcul;
