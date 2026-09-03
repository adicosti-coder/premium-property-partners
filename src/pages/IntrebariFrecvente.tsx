import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { HelpCircle, Phone, MessageCircle, Mail } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useLanguage } from "@/i18n/LanguageContext";
import { OWNERS_FAQ_DATA } from "@/data/ownersFaq";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const BASE_URL = "https://realtrust.ro";
const PHONE = "+40799069256";
const EMAIL = "info@realtrust.ro";

/** Extra questions (ROI / hotel-regime economics) on top of the owners FAQ set. */
const EXTRA_FAQ = {
  ro: [
    {
      q: "Ce este regimul hotelier și cu ce diferă de chiria clasică?",
      a: "Regimul hotelier înseamnă închirierea apartamentului pe termen scurt (nopți sau câteva zile), cu tarif dinamic, listare pe Booking și Airbnb, curățenie și lenjerie între oaspeți. Față de chiria clasică pe termen lung, venitul brut este de aproximativ 1,6 ori mai mare, iar riscul de chiriaș neplatnic dispare — oaspeții achită înainte de cazare.",
    },
    {
      q: "Cât randament (ROI) pot obține realist în Timișoara?",
      a: "Referința noastră este 9,4% net pe an, calculată la o ocupare medie de 75% și după deducerea a aproximativ 27% (comisioane platforme, impozit efectiv, consumabile, utilități, lenjerie) plus comisionul de administrare. Un apartament de 2 camere bine poziționat în Cetate, Iosefin sau lângă Iulius Town se apropie de această cifră; poți verifica scenariul tău în calculatorul de randament.",
    },
    {
      q: "Ce include comisionul de administrare RealTrust?",
      a: "Listare multi-channel (Booking, Airbnb, Expedia), pricing dinamic, comunicare cu oaspeții 24/7, check-in automatizat cu smart lock, curățenie și lenjerie, mentenanță, declarații lunare pentru taxa hotelieră și raport financiar detaliat. Comisionul se aplică doar pe venitul realizat — dacă apartamentul nu produce, nu plătești administrare.",
    },
    {
      q: "Cine se ocupă de curățenie, lenjerie și mentenanță?",
      a: "Noi, cu echipă proprie. Între oaspeți facem curățenie profesională, schimbăm lenjeria și completăm consumabilele, iar defecțiunile minore le rezolvăm în aceeași zi. Tu primești raportul, nu telefoanele.",
    },
    {
      q: "Ce fel de apartamente acceptați în administrare?",
      a: "Apartamente și case mobilate, în stare bună, în Timișoara — cu prioritate în Cetate/Centru, Iosefin, Fabric, Dumbrăvița și zona Aradului. Dacă apartamentul are nevoie de mici intervenții pentru regim hotelier, îți spunem exact ce merită făcut înainte de listare.",
    },
    {
      q: "Cum urmăresc încasările apartamentului meu?",
      a: "Ai acces la portalul de proprietar, cu rezervări, ocupare, tarif mediu pe noapte și venit net lunar. Lunar primești raportul detaliat pe fiecare noapte încasată, comisioane și cheltuieli, iar transferul se face în contul tău.",
    },
  ],
  en: [
    {
      q: "What is short-term rental management and how does it differ from a long-term lease?",
      a: "Short-term rental means renting the apartment by the night, with dynamic pricing, listings on Booking and Airbnb, and cleaning plus linen between guests. Compared with a classic long-term lease, gross revenue is roughly 1.6x higher and non-paying tenant risk disappears — guests pay before check-in.",
    },
    {
      q: "What ROI can I realistically expect in Timișoara?",
      a: "Our benchmark is 9.4% net per year, based on 75% average occupancy and after deducting about 27% (platform fees, effective tax, consumables, utilities, linen) plus our management fee. A well-located 2-room apartment in Cetate, Iosefin or near Iulius Town approaches that figure; check your own scenario in the yield calculator.",
    },
    {
      q: "What does the RealTrust management fee include?",
      a: "Multi-channel listing (Booking, Airbnb, Expedia), dynamic pricing, 24/7 guest communication, smart-lock self check-in, cleaning and linen, maintenance, monthly hotel-tax filings and a detailed financial report. The fee applies only to realised revenue — no revenue, no management fee.",
    },
    {
      q: "Who handles cleaning, linen and maintenance?",
      a: "We do, with our own team. Between guests we run professional cleaning, change linen and restock consumables; minor issues are fixed the same day. You get the report, not the phone calls.",
    },
    {
      q: "Which apartments do you take under management?",
      a: "Furnished apartments and houses in good condition in Timișoara — priority in Cetate/Centre, Iosefin, Fabric, Dumbrăvița and the Aradului area. If the property needs small upgrades for short-term rental, we tell you exactly what is worth doing before listing.",
    },
    {
      q: "How do I track my apartment's earnings?",
      a: "You get access to the owner portal with bookings, occupancy, average nightly rate and monthly net income. Each month you receive a detailed report of every night booked, fees and expenses, and the payout lands in your account.",
    },
  ],
} as const;

const COPY = {
  ro: {
    seoTitle: "Întrebări Frecvente Regim Hotelier & Administrare Timișoara | RealTrust",
    seoDescription:
      "Răspunsuri despre regim hotelier, administrare apartamente și randament (ROI 9,4% net) în Timișoara: autorizații, taxe, contract, daune și încasări.",
    badge: "Întrebări frecvente",
    h1: "Întrebări frecvente despre regim hotelier, administrare și randament",
    intro:
      "Tot ce întreabă proprietarii din Timișoara înainte de a da apartamentul în administrare: autorizații și legislație, taxe locale, contract și preaviz, daune provocate de oaspeți și cum se ajunge la un randament net de 9,4% pe an.",
    breadcrumb: "Întrebări frecvente",
    home: "Acasă",
    ctaTitle: "Nu ți-ai găsit răspunsul?",
    ctaText:
      "Scrie-ne sau sună-ne — îți răspundem cu cifre concrete pentru apartamentul tău din Timișoara.",
    call: "Sună acum",
    whatsapp: "Scrie pe WhatsApp",
    email: "Trimite e-mail",
    ownersLink: "Vezi serviciile de administrare",
    calcLink: "Calculează randamentul",
  },
  en: {
    seoTitle: "Short-Term Rental FAQ — Management & ROI in Timișoara | RealTrust",
    seoDescription:
      "Answers about short-term rental, apartment management and yield (9.4% net ROI) in Timișoara: licensing, taxes, contract, damages and payouts.",
    badge: "Frequently asked questions",
    h1: "Frequently asked questions about short-term rental, management and ROI",
    intro:
      "Everything owners in Timișoara ask before handing over an apartment: licensing and legislation, local taxes, contract and notice, guest damages, and how a 9.4% net annual yield is reached.",
    breadcrumb: "FAQ",
    home: "Home",
    ctaTitle: "Didn't find your answer?",
    ctaText: "Write or call us — we reply with concrete numbers for your Timișoara apartment.",
    call: "Call now",
    whatsapp: "Message on WhatsApp",
    email: "Send email",
    ownersLink: "See management services",
    calcLink: "Calculate your yield",
  },
} as const;

const IntrebariFrecvente = () => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";
  const copy = COPY[lang];

  const items = [...EXTRA_FAQ[lang], ...OWNERS_FAQ_DATA[lang].items];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${BASE_URL}/intrebari-frecvente`,
    url: `${BASE_URL}/intrebari-frecvente`,
    name: copy.h1,
    inLanguage: lang === "ro" ? "ro-RO" : "en",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={copy.seoTitle}
        description={copy.seoDescription}
        url={`${BASE_URL}/intrebari-frecvente`}
        jsonLd={faqSchema}
        breadcrumbItems={[
          { name: copy.home, url: BASE_URL },
          { name: copy.breadcrumb, url: `${BASE_URL}/intrebari-frecvente` },
        ]}
      />
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-6 lg:px-8">
          <PageBreadcrumb items={[{ label: copy.breadcrumb }]} />

          <header className="max-w-3xl mx-auto text-center mt-6 mb-12">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <HelpCircle className="w-4 h-4 text-primary" aria-hidden="true" />
              <span className="text-primary text-sm font-semibold">{copy.badge}</span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-4">
              {copy.h1}
            </h1>
            <p className="text-muted-foreground text-lg text-premium">{copy.intro}</p>
          </header>

          <section className="max-w-3xl mx-auto" aria-label={copy.badge}>
            <Accordion type="single" collapsible className="space-y-4">
              {items.map((item, i) => (
                <AccordionItem
                  key={item.q}
                  value={`faq-${i}`}
                  className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/30 transition-colors"
                >
                  <AccordionTrigger className="text-left heading-premium text-foreground hover:text-primary py-5 text-base md:text-lg">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-foreground/70 dark:text-muted-foreground pb-5 text-premium text-base">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          <section className="max-w-3xl mx-auto mt-14 bg-card border border-border rounded-2xl p-8 text-center">
            <h2 className="text-2xl heading-premium text-foreground mb-3">{copy.ctaTitle}</h2>
            <p className="text-muted-foreground mb-6 text-premium">{copy.ctaText}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="hero" className="min-h-12">
                <a href={`tel:${PHONE}`} aria-label={copy.call}>
                  <Phone className="w-4 h-4 mr-2" aria-hidden="true" />
                  {copy.call}
                </a>
              </Button>
              <Button asChild variant="outline" className="min-h-12">
                <a
                  href={`https://wa.me/40799069256`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={copy.whatsapp}
                >
                  <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                  {copy.whatsapp}
                </a>
              </Button>
              <Button asChild variant="outline" className="min-h-12">
                <a href={`mailto:${EMAIL}`} aria-label={copy.email}>
                  <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
                  {copy.email}
                </a>
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 justify-center mt-6 text-sm">
              <Link to="/pentru-proprietari" className="text-primary hover:underline">
                {copy.ownersLink}
              </Link>
              <Link to="/calculator-roi" className="text-primary hover:underline">
                {copy.calcLink}
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
      <BackToTop />
      <Suspense fallback={null}>
        <GlobalConversionWidgets />
      </Suspense>
    </div>
  );
};

export default IntrebariFrecvente;
