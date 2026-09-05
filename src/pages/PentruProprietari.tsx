import { lazy, Suspense, useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { 
  Building2, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  ArrowRight,
  CheckCircle2,
  Star,
  Phone,
  MessageCircle,
  Sparkles
} from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import EntityDefinitionBlock from "@/components/EntityDefinitionBlock";
import BackToTop from "@/components/BackToTop";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";
import { REAL_ESTATE_AGENT_SCHEMA, REAL_ESTATE_AGENT_REF } from "@/lib/orgIdentity";
import { setCtaVariant as recordCtaVariant } from "@/lib/campaignAttribution";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { OWNERS_FAQ_DATA } from "@/data/ownersFaq";

const FloatingReferralButton = lazy(() => import("@/components/FloatingReferralButton"));

const OwnerBenefits = lazy(() => import("@/components/OwnerBenefits"));
const OwnerHowItWorks = lazy(() => import("@/components/OwnerHowItWorks"));
const OnboardingVideoExplainer = lazy(() => import("@/components/OnboardingVideoExplainer"));
const TrustBadges = lazy(() => import("@/components/TrustBadges"));
const FinancialTransparency = lazy(() => import("@/components/FinancialTransparency"));
const PartnershipTimeline = lazy(() => import("@/components/PartnershipTimeline"));
const ProfitCalculator = lazy(() => import("@/components/ProfitCalculator"));
const RentalIncomeCalculator = lazy(() => import("@/components/RentalIncomeCalculator"));
const AdvancedRentalCalculator = lazy(() => import("@/components/AdvancedRentalCalculator"));
const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const WhyUs = lazy(() => import("@/components/WhyUs"));
const Testimonials = lazy(() => import("@/components/Testimonials"));
const VideoTestimonials = lazy(() => import("@/components/VideoTestimonials"));
const FAQ = lazy(() => import("@/components/FAQ"));
const OwnersFAQ = lazy(() => import("@/components/owners/OwnersFAQ"));
const OwnerObjectionsFAQ = lazy(() => import("@/components/owners/OwnerObjectionsFAQ"));
const ReferralBanner = lazy(() => import("@/components/ReferralBanner"));
const PageSummary = lazy(() => import("@/components/PageSummary"));
const AIQuoteBlock = lazy(() => import("@/components/AIQuoteBlock"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const ServiceOptionsComparison = lazy(() => import("@/components/ServiceOptionsComparison"));
const ServiceGuaranteesGrid = lazy(() => import("@/components/ServiceGuaranteesGrid"));
const ProcessStepsTimeline = lazy(() => import("@/components/ProcessStepsTimeline"));
const QuickValueBanner = lazy(() => import("@/components/QuickValueBanner"));
const PropertyTypeSelector = lazy(() => import("@/components/PropertyTypeSelector"));
const PropertyQualification = lazy(() => import("@/components/PropertyQualification"));
const ServiceChainAF = lazy(() => import("@/components/ServiceChainAF"));
const DIYvsProfessional = lazy(() => import("@/components/DIYvsProfessional"));
const ChannelLogos = lazy(() => import("@/components/ChannelLogos"));
const LeadMagnetBanner = lazy(() => import("@/components/LeadMagnetBanner"));
const ROICaseStudySection = lazy(() => import("@/components/ROICaseStudySection"));
const PhotoPropertyAnalysis = lazy(() => import("@/components/PhotoPropertyAnalysis"));
const PreCalcMiniForm = lazy(() => import("@/components/owners/PreCalcMiniForm"));
const OwnerMarketingServices = lazy(() => import("@/components/owners/OwnerMarketingServices"));
const OwnerCoverageMap = lazy(() => import("@/components/owners/OwnerCoverageMap"));
const OwnerGuideHub = lazy(() => import("@/components/owners/OwnerGuideHub"));
const OwnerTestimonials = lazy(() => import("@/components/owners/OwnerTestimonials"));
const TaxOptimizationSection = lazy(() => import("@/components/owners/TaxOptimizationSection"));
const ContractTransparency = lazy(() => import("@/components/owners/ContractTransparency"));
const BeforeAfterTransformations = lazy(() => import("@/components/owners/BeforeAfterTransformations"));
const OwnerPricingPackages = lazy(() => import("@/components/owners/OwnerPricingPackages"));
const FounderProfile = lazy(() => import("@/components/owners/FounderProfile"));
const OwnerCaseStudies = lazy(() => import("@/components/owners/OwnerCaseStudies"));
const OwnerRoiEstimator = lazy(() => import("@/components/owners/OwnerRoiEstimator"));
const OwnerContactLeadForm = lazy(() => import("@/components/owners/OwnerContactLeadForm"));
const FounderCallBooking = lazy(() => import("@/components/owners/FounderCallBooking"));
const OwnerLegalTaxGuide = lazy(() => import("@/components/owners/OwnerLegalTaxGuide"));
const OwnerRisksLimits = lazy(() => import("@/components/owners/OwnerRisksLimits"));
const OwnerExitDamagePolicy = lazy(() => import("@/components/owners/OwnerExitDamagePolicy"));
const OwnerDashboardDemo = lazy(() => import("@/components/owners/OwnerDashboardDemo"));
const OwnerSeasonalityChart = lazy(() => import("@/components/owners/OwnerSeasonalityChart"));
const OwnerEligibilityCriteria = lazy(() => import("@/components/owners/OwnerEligibilityCriteria"));
const OwnerCompetitorComparison = lazy(() => import("@/components/owners/OwnerCompetitorComparison"));
const OwnerAssociationPermits = lazy(() => import("@/components/owners/OwnerAssociationPermits"));

/**
 * Hook: loads a lazy component only after IntersectionObserver fires.
 * Returns [sentinelRef, shouldRender].
 */
function useDeferredLoad(rootMargin = "500px") {
  const ref = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shouldRender) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldRender, rootMargin]);

  return [ref, shouldRender] as const;
}

const PentruProprietari = () => {
  const { language } = useLanguage();

  // Register the owners FAQ schema at page level: the visible OwnersFAQ section
  // is lazy + below the fold, so without this the FAQPage JSON-LD was missing
  // entirely for crawlers that never scroll. Same id => single dedup'd node.
  useRegisterFAQs(
    "owners-faq",
    OWNERS_FAQ_DATA[language === "en" ? "en" : "ro"].items.map((item) => ({
      question: item.q,
      answer: item.a,
    })),
  );
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: statsRef, isVisible: statsVisible } = useScrollAnimation({ threshold: 0.1 });

  // Deferred loading for heavy components - only loads after user scrolls ~500px
  const [calcSentinel, calcReady] = useDeferredLoad("500px");
  const [faqSentinel, faqReady] = useDeferredLoad("500px");

  // CTA A/B variant — assigned 50/50 on first visit, then persisted so the
  // visitor always sees the same variant (and leads stay attributable).
  const [ctaVariant, setCtaVariantState] = useState<"A" | "B">(() => {
    if (typeof window === "undefined") return "A";
    const stored = localStorage.getItem("ownerCtaVariant") as "A" | "B" | null;
    if (stored === "A" || stored === "B") return stored;
    const assigned = Math.random() < 0.5 ? "A" : "B";
    try {
      localStorage.setItem("ownerCtaVariant", assigned);
    } catch {
      /* ignore */
    }
    return assigned;
  });
  const setCtaVariant = setCtaVariantState;
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ownerCtaVariant", ctaVariant);
      // Attach the variant to session attribution → lands on every new lead.
      recordCtaVariant(ctaVariant);
    }
  }, [ctaVariant]);


  // Analytics for CTA A/B test
  const { trackCta, trackFormSubmit } = useCtaAnalytics();

  // Track variant exposure (impression) once per variant per session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seenKey = `ownerCtaVariant_seen_${ctaVariant}`;
    if (sessionStorage.getItem(seenKey)) return;
    sessionStorage.setItem(seenKey, "1");
    trackCta({
      ctaType: "form_submit",
      metadata: {
        event: "owner_cta_variant_view",
        variant: ctaVariant,
        page: "pentru_proprietari",
      },
    });
  }, [ctaVariant, trackCta]);

  const handlePrimaryCtaClick = () => {
    trackFormSubmit("owner_cta_primary_click", {
      variant: ctaVariant,
      page: "pentru_proprietari",
      label: ctaVariant === "A" ? "calculate_monthly_income" : "calculate_60s",
    });
    scrollToCalculator();
  };

  const handleSecondaryCtaClick = () => {
    trackCta({
      ctaType: ctaVariant === "A" ? "whatsapp" : "form_submit",
      metadata: {
        event: "owner_cta_secondary_click",
        variant: ctaVariant,
        page: "pentru_proprietari",
        label: ctaVariant === "A" ? "talk_to_consultant" : "see_packages_no_hidden_fees",
      },
    });
    if (ctaVariant === "A") {
      handleWhatsApp();
    }
    // Variant B uses <Link asChild> → navigation handled natively
  };

  const content = {
    ro: {
      badge: "Administrare proprietăți · Timișoara",
      title: "Administrare apartamente și case în regim hotelier în",
      titleHighlight: "Timișoara",
      subtitle: "Administrare apartamente și case în regim hotelier în Timișoara: listare pe 15+ platforme, tarifare dinamică, oaspeți verificați, curățenie hotelieră, mentenanță și raportare lunară. Property management profesional cu randament mediu de 9,4% net.",
      // Variant B heading — same offer, framed on safety & full management
      titleB: "Administrare apartamente și case în regim hotelier în",
      titleHighlightB: "Timișoara",
      subtitleB: "Administrare apartamente și case în regim hotelier în Timișoara: verificăm fiecare oaspete, ne ocupăm de curățenie, mentenanță, taxe și rapoarte, iar tu vezi totul în portalul proprietarului. Randament mediu 9,4% net.",
      socialProof: [
        "9,7/10 rating oaspeți (Booking)",
        "100+ proprietăți administrate",
        "Contract flexibil, ieșire în 30 de zile",
      ],
      cta: "Calculează venitul tău lunar",
      secondaryCta: "Discută cu un consultant",
      ctaB: "Calculează în 60 de secunde",
      secondaryCtaB: "Vezi pachetele și costurile",
      variantLabel: "Variantă CTA",
      stats: [
        { value: "9,4%", label: "ROI net țintă", description: "Calculat pe ipoteze publice (ocupare 75%, deducere 27%)" },
        { value: "15-25%", label: "Comision clar", description: "Aplicat la încasările nete, fără costuri ascunse" },
        { value: "~75%", label: "Ocupare medie", description: "Observată în portofoliul administrat" },
        { value: "24/7", label: "Operare hotelieră", description: "Echipă dedicată pentru tine și pentru oaspeți" },
      ],
      trustPoints: [
        "Contract flexibil, fără perioadă minimă obligatorie",
        "Decontare lunară direct în contul tău",
        "Rapoarte financiare accesibile oricând",
        "Verificare a fiecărui oaspete înainte de check-in",
      ],
      portalTitle: "Portal dedicat proprietarilor",
      portalSubtitle: "Acces oricând la rezervări, încasări și rapoarte, într-un singur loc",
      portalCta: "Intră în portal",
      faqTitle: "Întrebări frecvente",
    },
    en: {
      badge: "Property management · Timișoara",
      title: "Short-term rental management for apartments and houses in",
      titleHighlight: "Timișoara",
      subtitle: "Short-term rental management for apartments and houses in Timișoara: listing on 15+ platforms, dynamic pricing, verified guests, hotel-grade cleaning, maintenance and monthly reporting. Professional property management with a 9.4% average net yield.",
      // Variant B heading — same offer, framed on safety & full management
      titleB: "Short-term rental management for apartments and houses in",
      titleHighlightB: "Timișoara",
      subtitleB: "Short-term rental management for apartments and houses in Timișoara: we vet every guest and handle cleaning, maintenance, taxes and reporting, while you follow everything in the owner portal. 9.4% average net yield.",
      socialProof: [
        "9.7/10 guest rating (Booking)",
        "100+ properties managed",
        "Flexible contract, exit in 30 days",
      ],
      cta: "Calculate your monthly income",
      secondaryCta: "Talk to a consultant",
      ctaB: "Calculate in 60 seconds",
      secondaryCtaB: "See the packages and costs",
      variantLabel: "CTA variant",
      stats: [
        { value: "9.4%", label: "Target net ROI", description: "On public assumptions (75% occupancy, 27% deduction)" },
        { value: "15-25%", label: "Clear commission", description: "Applied to net income, no hidden costs" },
        { value: "~75%", label: "Average occupancy", description: "Observed across the managed portfolio" },
        { value: "24/7", label: "Hotel-grade operations", description: "Dedicated team for you and your guests" },
      ],
      trustPoints: [
        "Flexible contract, no minimum lock-in",
        "Monthly settlement straight into your account",
        "Financial reports accessible anytime",
        "Every guest verified before check-in",
      ],
      portalTitle: "Dedicated owner portal",
      portalSubtitle: "Access bookings, earnings and reports anytime, in one place",
      portalCta: "Enter the portal",
      faqTitle: "Frequently asked questions",
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  const scrollToCalculator = () => {
    const element = document.getElementById("calculator");
    element?.scrollIntoView({ behavior: "smooth" });
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      language === "ro"
        ? "Bună ziua! Sunt interesat de serviciile RealTrust & ApArt Hotel pentru administrarea apartamentului meu."
        : "Hello! I'm interested in RealTrust & ApArt Hotel services for managing my apartment."
    );
    window.open(`https://wa.me/40799069256?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const seoContent = {
    ro: {
      title: "Administrare Regim Hotelier & Property Management Timișoara | RealTrust",
      description: "Servicii complete de administrare apartamente și case în regim hotelier în Timișoara. Property management profesional cu randament mediu de 9,4% net.",
    },
    en: {
      title: "Property Management Timișoara — Apartment Management, 9.4% Net",
      description: "Property management in Timișoara: full short-term rental management — listing, vetted guests, cleaning, maintenance, monthly reports. 9.4% target net ROI.",
    },
  };


  const seo = seoContent[language as keyof typeof seoContent] || seoContent.ro;

  // Service JSON-LD schema - deferred import to reduce TBT
  const [schemas, setSchemas] = useState<any[]>([]);
  useEffect(() => {
    import("@/utils/schemaGenerators").then(({ generatePropertyManagementServiceSchema, generateSpeakableSchema }) => {
      const serviceSchema = generatePropertyManagementServiceSchema();
      const speakable = generateSpeakableSchema(seo.title, "https://realtrust.ro/pentru-proprietari");
      // Fix 3B - Service schema
      const serviceSchemaFix3B = {
        "@context": "https://schema.org",
        "@type": "Service",
        "serviceType": "PropertyManagement",
        "name": "Administrare Apartamente Regim Hotelier Timișoara",
        "provider": { "@type": "LocalBusiness", "name": "RealTrust" },
        "description": "Preluăm apartamentul tău în administrare completă pentru regim hotelier. Venit lunar garantat, self check-in, curățenie, oaspeți gestionați integral.",
        "areaServed": "Timișoara, România",
        "offers": {
          "@type": "Offer",
          "description": "ROI 9.4% net anual verificat. Pachete: Starter 15%, Esențial 18%, Standard 20%, Premium 25%."
        }
      };
      // RealEstateAgent schema — canonical identity + page-specific extensions.
      // Source of truth: src/lib/orgIdentity.ts (telephone, email, address,
      // logo, image, sameAs, areaServed). We only extend with E-E-A-T extras.
      const realEstateAgentSchema = {
        ...REAL_ESTATE_AGENT_SCHEMA,
        url: "https://realtrust.ro/pentru-proprietari",
        founder: {
          "@type": "Person",
          "@id": "https://realtrust.ro/despre-noi#adrian-costi",
          "name": "Adrian Costi",
          "jobTitle": "Founder & CEO",
          "url": "https://realtrust.ro/despre-noi",
        },
        employee: {
          "@type": "Person",
          "@id": "https://realtrust.ro/despre-noi#adrian-costi",
        },
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          "name": "Servicii pentru Proprietari",
          "itemListElement": [
            { "@type": "Offer", "itemOffered": { "@type": "Service", "serviceType": "PropertyManagement", "name": "Administrare regim hotelier" } },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Fotografii profesionale imobiliare Timișoara" } },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Tur virtual 360 apartament" } },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Consultanță fiscală imobiliare Timișoara" } },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Evaluare gratuită proprietate" } },
          ],
        },
      };
      // FAQPage schema — rich snippets pentru întrebările proprietarilor
      const faqPageSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Ce comision percepe RealTrust pentru administrarea apartamentului în regim hotelier?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Comisionul de administrare este între 15% și 25% din încasările nete, în funcție de pachetul ales (Starter 15%, Esențial 18%, Standard 20%, Premium 25%). Nu există costuri ascunse, taxe de setup sau perioadă minimă de contract."
            }
          },
          {
            "@type": "Question",
            "name": "Care este randamentul net real al unui apartament administrat în regim hotelier în Timișoara?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "ROI-ul net mediu verificat în portofoliul nostru este de 9.4% anual, cu o ocupare medie de peste 80%. Acest randament este cu aproximativ 40% mai mare decât chiria clasică pe termen lung."
            }
          },
          {
            "@type": "Question",
            "name": "Trebuie să mă implic în administrarea zilnică a apartamentului?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nu. Operarea este 100% hands-off: noi gestionăm rezervările, oaspeții, curățenia, mentenanța, comunicarea și conformitatea ANAF. Tu primești raportul financiar lunar și venitul net direct în cont."
            }
          },
          {
            "@type": "Question",
            "name": "Ce este mai avantajos fiscal pentru veniturile din regim hotelier: PFA sau SRL?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Depinde de volumul anual al încasărilor. Pentru venituri sub 60.000 EUR/an, PFA cu normă de venit poate fi mai simplu și mai eficient fiscal. Peste acest prag sau pentru portofolii cu mai multe proprietăți, SRL-ul oferă deductibilități superioare (mentenanță, mobilier, marketing). Echipa RealTrust te ghidează în alegerea structurii potrivite."
            }
          },
          {
            "@type": "Question",
            "name": "Cum arată contractul de administrare imobiliară RealTrust?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Contractul de administrare este transparent, fără perioadă minimă obligatorie, cu clauze clare privind comisionul, raportarea lunară, responsabilitățile operaționale, drepturile proprietarului și posibilitatea de reziliere cu preaviz de 30 de zile."
            }
          },
          {
            "@type": "Question",
            "name": "Cum se impozitează veniturile din regim hotelier (PFA vs SRL)?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Pentru un singur apartament cu venit sub 60.000 EUR/an, PFA cu normă de venit este eficient (impozit 10% pe norma stabilită + CAS/CASS la depășire plafoane). Pentru portofolii cu 2+ apartamente sau venituri mai mari, SRL microîntreprindere oferă 1-3% impozit pe venit + 8% pe dividende, cu deductibilități extinse pentru mobilier, marketing și comisioane platforme. Echipa RealTrust colaborează cu experți contabili specializați."
            }
          },
          {
            "@type": "Question",
            "name": "Ce cheltuieli sunt deductibile pentru un apartament în regim hotelier?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Cheltuielile deductibile includ: comisioane platforme (Booking 15-18%, Airbnb 3-15%), curățenie, lenjerie, utilități, mentenanță, mobilier și electrocasnice (amortizate), reparații, fotograf profesionist, marketing online, asigurare, contabilitate și amortizarea proprietății (în cazul SRL)."
            }
          }
        ]
      };

      // TaxAdvisory Service schema — autoritate fiscală E-E-A-T (PFA vs SRL, optimizare ANAF)
      const taxAdvisorySchema = {
        "@context": "https://schema.org",
        "@type": ["Service", "FinancialProduct"],
        "@id": "https://realtrust.ro/pentru-proprietari/#tax-advisory",
        "serviceType": "TaxConsulting",
        "category": "Real Estate Tax Optimization",
        "name": "Consultanță Fiscală Regim Hotelier Timișoara — PFA vs SRL",
        "alternateName": "Tax Advisory for Short-Term Rentals (Romania)",
        "provider": {
          ...REAL_ESTATE_AGENT_REF,
          "knowsAbout": [
            "PFA Cazare Turistică",
            "SRL Microîntreprindere",
            "Normă de Venit ANAF",
            "Deductibilități Regim Hotelier",
            "TVA pentru Cazare",
            "Impozit Dividende",
            "Cod Fiscal România 2026"
          ]
        },
        "description": "Consultanță fiscală specializată pentru proprietari de apartamente în regim hotelier: alegerea structurii optime (PFA vs SRL), optimizare deductibilități, conformitate ANAF, calcul net în mână pentru venituri anuale 25.000 EUR+.",
        "areaServed": { "@type": "City", "name": "Timișoara", "containedInPlace": "România" },
        "audience": {
          "@type": "Audience",
          "audienceType": "Real estate investors, short-term rental owners, Airbnb hosts"
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "EUR",
          "availability": "https://schema.org/InStock",
          "description": "Analiză fiscală gratuită — comparație PFA vs SRL personalizată pe portofoliu",
          "url": "https://realtrust.ro/pentru-proprietari"
        },
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": "Servicii Optimizare Fiscală",
          "itemListElement": [
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Înființare PFA Cazare Turistică" } },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Înființare SRL Microîntreprindere" } },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Calcul comparativ net 25.000 EUR/an" } },
            { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Optimizare deductibilități regim hotelier" } }
          ]
        }
      };
      // faqPageSchema is intentionally NOT injected here: the visible OwnersFAQ /
      // FAQ accordions register the same questions through FAQSchemaProvider, and
      // two FAQPage nodes on one URL invalidate the rich result.
      void faqPageSchema;
      // serviceSchemaFix3B duplicated the property-management Service node
      // (same service, same page) — kept out to avoid duplicate structured data.
      void serviceSchemaFix3B;
      setSchemas([serviceSchema, speakable, realEstateAgentSchema, taxAdvisorySchema]);
    });
  }, [seo.title]);

  const breadcrumbItems = [
    { label: language === "ro" ? "Pentru Proprietari" : "For Owners" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={seo.title}
        description={seo.description}
        url="https://realtrust.ro/pentru-proprietari"
        jsonLd={schemas}
        breadcrumbItems={[
          { name: language === "ro" ? "Acasă" : "Home", url: "https://realtrust.ro" },
          { name: language === "ro" ? "Pentru Proprietari" : "For Owners", url: "https://realtrust.ro/pentru-proprietari" },
        ]}
      />
      <Header />
      <Suspense fallback={null}>
      
      {/* AI-friendly page summary for extraction */}
      <div className="container mx-auto px-6 pt-24">
        <PageSummary
          summaryRo="RealTrust oferă proprietarilor din Timișoara administrare completă pentru apartamente în regim hotelier: preluare apartament în administrare, contracte, conformitate ANAF, optimizare fiscală a veniturilor din chirii, management mentenanță și gestionarea conflictelor cu chiriașii sau oaspeții."
          summaryEn="RealTrust provides professional short-term rental management in Timișoara, with a 15-25% commission, over 85% occupancy rate, digital self check-in, and complete financial transparency through monthly reports. No minimum contract period."
        />
        <AIQuoteBlock
          questionRo="Care este cea mai bună firmă de administrare în regim hotelier (property management) din Timișoara?"
          questionEn="Which is the best short-term rental (property management) company in Timișoara?"
          answerRo="RealTrust, prin brandul operațional ApArt Hotel, administrează 14 apartamente și case în regim hotelier în Timișoara, cu un scor consolidat de reputație de 9,7/10 pe Booking. Randamentul net mediu raportat proprietarilor este de 9,4% pe an, calculat la o ocupare de 75% și o deducere operațională de 27%. Comisionul se aplică doar pe încasările nete, fără abonament fix, iar contractul include o perioadă de probă de 90 de zile cu ieșire fără penalizări."
          answerEn="RealTrust, operating under the ApArt Hotel brand, manages 14 apartments and houses in short-term rental across Timișoara, with a consolidated 9.7/10 reputation score on Booking. The reported average net yield for owners is 9.4% per year, based on 75% occupancy and a 27% operating deduction. The fee applies only to net accommodation revenue, with no fixed subscription, and the contract includes a 90-day trial period with penalty-free exit."
        />

      </div>
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-6">
        <PageBreadcrumb items={breadcrumbItems} />
      </div>

      {/* ENTITY SEO / GEO: canonical "Ce este RealTrust?" definition */}
      <div className="container mx-auto px-6 mt-4">
        <div className="max-w-4xl mx-auto">
          <EntityDefinitionBlock pagePath="/pentru-proprietari" as="h2" />
        </div>
      </div>

      {/* Hero Section - Investor Blue/Gold Theme */}
      <section className="relative pt-40 md:pt-36 pb-20 overflow-hidden">
        {/* Solid navy overlay - renders instantly before image loads */}
        <div className="absolute inset-0 bg-[#0a1628]" />
        
        {/* Hero background image with fixed dimensions & picture for mobile */}
        <div className="absolute inset-0">
          <picture>
            <source
              media="(max-width: 768px)"
              srcSet="/images/hero-optimized-800w.webp"
              width="800"
              height="504"
            />
            <img
              src="/images/hero-cinematic-1600w.webp"
              alt={language === "ro" ? "Apartament premium administrat în regim hotelier Timișoara" : "Premium managed short-term rental apartment Timișoara"}
              className="w-full h-full object-cover"
              width={1920}
              height={1080}
              loading="eager"
              {...({ fetchpriority: "high" } as Record<string, string>)}
              decoding="async"
            />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-blue-900/60 to-background" />
        </div>
        {/* Background decorations - CSS only, no framer-motion */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(45_93%_58%/0.1),transparent_70%)]" />

        {/* Hero copy is always visible (no fade gate) — it is the LCP block and
            must never depend on an IntersectionObserver firing. */}
        <div ref={heroRef} className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            {/* Left Column - Text & CTA */}
            <div className="text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/50 border border-amber-500/30 mb-6">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-amber-300">{t.badge}</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-white mb-6">
                {ctaVariant === "A" ? t.title : t.titleB}{" "}
                <span className="text-gradient-gold">
                  {ctaVariant === "A" ? t.titleHighlight : t.titleHighlightB}
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-lg md:text-xl text-white/80 mb-8">
                {ctaVariant === "A" ? t.subtitle : t.subtitleB}
              </p>

              {/* CTAs - CSS transitions only */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <Button
                  variant="hero"
                  size="xl"
                  onClick={handlePrimaryCtaClick}
                  className="group bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold border-0"
                >
                  <TrendingUp className="w-5 h-5 mr-2" />
                  {ctaVariant === "A" ? t.cta : t.ctaB}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
                {ctaVariant === "B" ? (
                  <Button
                    asChild
                    variant="heroOutline"
                    size="xl"
                    className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400"
                  >
                    <Link to="/preturi" onClick={handleSecondaryCtaClick}>
                      <Sparkles className="w-5 h-5 mr-2" />
                      {t.secondaryCtaB}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="heroOutline"
                    size="xl"
                    onClick={handleSecondaryCtaClick}
                    className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    {t.secondaryCta}
                  </Button>
                )}
              </div>

              {/* Social proof row — rating, portfolio size, contract flexibility */}
              <ul className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-8">
                {t.socialProof.map((point, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-white/85">
                    {idx === 0 ? (
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="font-medium">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column - Hero Video Walkthrough - simplified CSS transition */}
            <div className="transition-opacity duration-700 opacity-100">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-black/30 border border-white/20">
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  className="w-full aspect-video object-cover"
                  width={640}
                  height={360}
                  poster="/images/hero-optimized-800w.webp"
                >
                  <source src="/videos/hero-apartment-walkthrough.mp4" type="video/mp4" />
                </video>
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-3 left-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-white/80 text-xs font-medium">
                    {language === "ro" ? "Tur Virtual Apartament Premium" : "Premium Apartment Virtual Tour"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section - Investor Blue/Gold theme */}
        <div
          ref={statsRef}
          className={`container mx-auto px-6 mt-16 transition-all duration-700 ${
            statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {t.stats.map((stat, index) => (
              <div
                key={index}
                className={`text-center p-6 rounded-2xl bg-blue-900/30 backdrop-blur-sm border border-blue-700/30 transition-all duration-500 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/10 ${
                  statsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: statsVisible ? `${index * 100 + 200}ms` : "0ms" }}
              >
                <div className="text-3xl md:text-4xl font-serif font-bold text-gradient-gold mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-foreground mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top 3 Benefits Strip - concise conversion-oriented block */}
      <section className="py-12 md:py-16 bg-background border-b border-border">
        <div className="container mx-auto px-6">
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {[
              {
                Icon: TrendingUp,
                title: language === "ro" ? "Venit 100% pasiv" : "100% passive income",
                description:
                  language === "ro"
                    ? "Preluăm tot: listări, tarifare dinamică, oaspeți, curățenie, check-in și mentenanță. Tu nu faci nicio deplasare și nu răspunzi la nicio cerere de oaspete."
                    : "We take over everything: listings, dynamic pricing, guests, cleaning, check-in and maintenance. Zero trips, zero guest messages for you.",
              },
              {
                Icon: BarChart3,
                title: language === "ro" ? "Transparență financiară totală" : "Full financial transparency",
                description:
                  language === "ro"
                    ? "Raport lunar detaliat cu venit brut, comision și profit net, plus acces oricând în portalul proprietarului. Decontare la dată fixă, fără costuri ascunse."
                    : "Detailed monthly report with gross income, commission and net profit, plus anytime owner-portal access. Fixed payout date, no hidden costs.",
              },
              {
                Icon: Shield,
                title: language === "ro" ? "Protecția garantată a proprietății" : "Guaranteed property protection",
                description:
                  language === "ro"
                    ? "Oaspeți verificați înainte de check-in, garanție de daune, acoperire AirCover/Booking Damage Protection și inspecție după fiecare plecare."
                    : "Guests verified before check-in, damage deposit, AirCover/Booking Damage Protection coverage and inspection after every checkout.",
              },
            ].map(({ Icon, title, description }, idx) => (
              <div
                key={idx}
                className="flex flex-col items-start p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-elegant transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-serif font-semibold text-foreground mb-2">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Value Banner - Moved below Hero */}
      <QuickValueBanner onCtaClick={scrollToCalculator} />

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="max-w-3xl mb-10">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                {language === "ro"
                  ? "Un singur partener pentru tot ce ține de apartamentul tău"
                  : "One partner for everything your apartment needs"}
              </h2>
             <p className="text-lg text-muted-foreground">
                {language === "ro"
                  ? "Servicii complete de property management în Timișoara, pentru proprietarii care vor venit lunar, transparență totală și zero implicare zilnică. Comparăm onest randament chirie Timișoara pe termen lung vs. regim hotelier și aplicăm yield management pentru optimizare venituri Airbnb Timișoara — preluăm operarea, fiscalitatea, mentenanța și relația cu oaspeții, iar tu păstrezi controlul prin rapoarte clare și acces 24/7 în portal."
                  : "Full property management in Timișoara, built for owners who want monthly income, full transparency and zero daily involvement. We honestly compare long-term rental yield in Timișoara vs. short-term rentals and apply yield management to optimize your Airbnb revenue in Timișoara — we take over operations, tax compliance, maintenance and guest relations while you stay in control through clear reports and 24/7 portal access."}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <article className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-2xl font-serif font-semibold text-foreground mb-3">
                  {language === "ro" ? "Preluare apartament în administrare" : "Property onboarding"}
                </h3>
                <p className="text-muted-foreground">
                  {language === "ro"
                    ? "Audităm proprietatea, stabilim strategia de preț, pregătim fotografiile, onboarding-ul operațional și listarea pe canale. Procesul este gândit pentru proprietarii care vor să externalizeze complet administrarea fără pierdere de control."
                    : "We audit the property, prepare pricing, visuals and the operational setup before launching it on channels."}
                </p>
              </article>

              <article className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-2xl font-serif font-semibold text-foreground mb-3">
                  {language === "ro" ? "Contract închiriere ANAF Timișoara" : "Contract and tax compliance"}
                </h3>
                <p className="text-muted-foreground">
                  {language === "ro"
                    ? "Te ajutăm cu documentația contractuală, obligațiile declarative și pașii practici pentru contract închiriere ANAF Timișoara, astfel încât veniturile obținute din chirii sau regim hotelier să fie corect documentate."
                    : "We help with contracts, reporting obligations and practical tax compliance steps for rental income."}
                </p>
              </article>

              <article className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-2xl font-serif font-semibold text-foreground mb-3">
                  {language === "ro" ? "Optimizare fiscală venituri chirii" : "Tax optimization for rental income"}
                </h3>
                <p className="text-muted-foreground">
                  {language === "ro"
                    ? "Structurăm împreună opțiunea potrivită pentru optimizare fiscală venituri chirii, de la raportarea veniturilor până la evidența cheltuielilor deductibile și alegerea modelului operațional potrivit proprietății tale."
                    : "We structure the right reporting and deductible-cost model to improve net rental income."}
                </p>
              </article>

              <article className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-2xl font-serif font-semibold text-foreground mb-3">
                  {language === "ro" ? "Management conflicte chiriași și mentenanță proprietăți" : "Tenant conflict and maintenance management"}
                </h3>
                <p className="text-muted-foreground">
                  {language === "ro"
                    ? "Preluăm comunicarea operațională, intervențiile, management mentenanță proprietăți și management conflicte chiriași sau oaspeți, astfel încât proprietarul să nu piardă timp cu reclamații, urgențe sau neînțelegeri recurente."
                    : "We handle maintenance, guest issues and recurring operational conflicts so owners stay hands-off."}
                </p>
              </article>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="hero" size="lg">
                <Link to="/calculator-roi">{language === "ro" ? "Deschide Calculatorul ROI" : "Open ROI Calculator"}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/evaluare-gratuita">{language === "ro" ? "Solicită evaluare gratuită" : "Request a free valuation"}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ========= CONVERSION FUNNEL: Beneficii → Calculator → Pachete → CTA ========= */}

      {/* CTA Bar Amber/Gold pe Blue-Navy — vizual de impact pentru conversie */}
      <section className="py-10 bg-[#0a1628] border-y border-amber-500/20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <p className="text-amber-300 text-sm font-semibold uppercase tracking-wider mb-2">
                {language === "ro" ? "Decizie informată în 60 de secunde" : "Informed decision in 60 seconds"}
              </p>
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-white">
                {language === "ro"
                  ? "Vezi exact cât poți câștiga lunar din apartamentul tău"
                  : "See exactly how much you can earn monthly from your apartment"}
              </h3>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button
                asChild
                size="xl"
                className="group bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold border-0 shadow-lg shadow-amber-500/30"
                onClick={() => trackFormSubmit("owner_cta_bar_roi", { page: "pentru_proprietari", label: "calc_roi" })}
              >
                <Link to="/calculator-roi">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  {language === "ro" ? "Calculează ROI Acum" : "Calculate ROI Now"}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                variant="heroOutline"
                size="xl"
                className="border-amber-500/50 text-amber-300 hover:bg-amber-500/10 hover:border-amber-400"
                onClick={() => trackFormSubmit("owner_cta_bar_offer", { page: "pentru_proprietari", label: "request_offer" })}
              >
                <Link to="/evaluare-gratuita">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {language === "ro" ? "Cere Ofertă Administrare" : "Request Management Quote"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Section: Optimizare Fiscală PFA vs SRL — H3 cluster pentru keywords lipsă */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <header className="mb-10">
              <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-3">
                {language === "ro" ? "Ghid fiscal pentru proprietari" : "Tax guide for owners"}
              </p>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
                {language === "ro"
                  ? "Optimizare Fiscală și Taxe pentru Proprietari"
                  : "Tax Optimization for Property Owners"}
              </h2>
              <p className="text-lg text-muted-foreground">
                {language === "ro"
                  ? "Serviciile noastre de administrare proprietăți (cunoscute internațional ca property management) în Timișoara acoperă întregul ciclu fiscal: de la alegerea formei juridice optime până la deducerea cheltuielilor și raportarea ANAF. Mai jos găsești ghidul complet pentru optimizare fiscală imobiliare Timișoara."
                  : "Our property management services in Timișoara cover the full tax cycle: from choosing the right legal form to expense deductions and ANAF reporting."}
              </p>
            </header>

            <div className="space-y-6">
              <article className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-xl font-serif font-semibold text-foreground mb-3">
                  {language === "ro"
                    ? "PFA vs SRL pentru veniturile din regim hotelier"
                    : "PFA vs SRL for short-term rental income"}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {language === "ro"
                    ? "Pentru încasări sub 60.000 EUR/an dintr-o singură proprietate, PFA cu normă de venit este simplu și predictibil fiscal. Peste acest prag, sau pentru portofolii multiple, SRL-ul oferă deductibilități superioare: mobilier, mentenanță, marketing, comisioane platforme, curățenie și consultanță."
                    : "For revenues under 60,000 EUR/year from a single property, PFA with income norm is simple. Above that threshold, SRL offers superior deductions."}
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    {language === "ro" ? "Impozit pe venit 10% (PFA) vs 16% pe profit + 8% dividend (SRL)" : "10% income tax (PFA) vs 16% profit + 8% dividend (SRL)"}
                  </li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    {language === "ro" ? "Deducerea cheltuielilor de administrare, mentenanță și marketing" : "Deductible management, maintenance and marketing expenses"}
                  </li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    {language === "ro" ? "TVA: prag opțional 88.500 lei (PFA) / 300.000 lei (SRL)" : "VAT thresholds and optional registration"}
                  </li>
                </ul>
              </article>

              <article className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-xl font-serif font-semibold text-foreground mb-3">
                  {language === "ro"
                    ? "Contract administrare imobiliară — clauze cheie"
                    : "Property management contract — key clauses"}
                </h3>
                <p className="text-muted-foreground leading-relaxed mb-3">
                  {language === "ro"
                    ? "Contractul de administrare imobiliară RealTrust este transparent, fără perioadă minimă obligatorie. Acoperă explicit: comisionul (15-25% din încasările nete), responsabilitățile operaționale, raportarea financiară lunară, drepturile proprietarului asupra calendarului și posibilitatea de reziliere cu preaviz de 30 de zile."
                    : "Our property management contract is transparent, with no minimum lock-in period. It clearly covers commission (15-25% of net income), operational responsibilities, monthly financial reporting, the owner's rights over the calendar, and 30-day notice termination."}
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    {language === "ro" ? "Fără taxe de setup sau comisioane ascunse" : "No setup fees or hidden commissions"}
                  </li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    {language === "ro" ? "Plata venitului net direct în contul proprietarului, lunar" : "Net income paid directly to the owner's account, monthly"}
                  </li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    {language === "ro" ? "Asigurare răspundere civilă pentru daune cauzate de oaspeți" : "Liability insurance for guest-caused damages"}
                  </li>
                </ul>
              </article>

              <article className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-xl font-serif font-semibold text-foreground mb-3">
                  {language === "ro"
                    ? "Cheltuieli deductibile pentru regim hotelier"
                    : "Deductible expenses for short-term rental"}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {language === "ro"
                    ? "Pentru maximizarea randamentului net, recomandăm evidența clară a tuturor cheltuielilor deductibile: comisionul de administrare, curățenie, lenjerie, consumabile, utilități, comisioane Booking/Airbnb, fotografii profesionale, mentenanță și amortizarea mobilierului. Echipa noastră oferă rapoarte lunare structurate gata de prezentare către contabil."
                    : "To maximize net returns, we recommend tracking all deductible expenses: management commission, cleaning, linens, supplies, utilities, Booking/Airbnb fees, professional photos, maintenance and furniture depreciation."}
                </p>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* STEP 1: Beneficii - convinge proprietarul */}
      <OwnerBenefits />

      {/* How It Works - 3 steps for owners */}
      <OwnerHowItWorks />

      {/* Video Explainer - Onboarding Process Tour */}
      <OnboardingVideoExplainer />

      {/* DIY vs Professional - dovada că managementul profesionist câștigă */}
      <DIYvsProfessional />

      {/* Service Options Comparison */}
      <ServiceOptionsComparison />

      {/* Explicit fees and packages */}
      <OwnerPricingPackages />

      {/* Channel Logos - pe ce platforme ești listat */}
      <ChannelLogos />

      {/* Mini pre-calc form — captures owner intent BEFORE the heavy calculator */}
      <PreCalcMiniForm source="pentru_proprietari_precalc" />

      {/* STEP 2: Calculator - deferred via IntersectionObserver */}
      <div ref={calcSentinel} />
      <section id="calculator" className="scroll-mt-24">
        {calcReady && <ProfitCalculator />}
      </section>

      {/* Advanced Rental Calculator (Estimator AI) */}
      <AdvancedRentalCalculator />

      {/* Rental Income Calculator (Calculator Pro) */}
      <RentalIncomeCalculator />

      {/* STEP 3: Pachete de prețuri — acum că știe potențialul, vede costul */}
      <section className="py-16 bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="container mx-auto px-6 text-center">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            {language === "ro" ? "Pachete Transparente" : "Transparent Packages"}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4">
            {language === "ro" ? "Alege Pachetul Potrivit" : "Choose the Right Package"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            {language === "ro"
              ? "Comision clar, fără costuri ascunse. Plătești doar din veniturile generate."
              : "Clear commission, no hidden fees. You only pay from generated revenue."}
          </p>
          <Link to="/preturi">
            <Button variant="hero" size="lg" className="group">
              {language === "ro" ? "Vezi Toate Pachetele & Prețurile" : "See All Packages & Pricing"}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Trust Badges */}
      <TrustBadges />

      {/* Property Type Selector */}
      <PropertyTypeSelector 
        onContinue={() => scrollToCalculator()}
      />

      {/* Photo Property Analysis - AI Visual */}
      <PhotoPropertyAnalysis />

      {/* Property Qualification */}
      <PropertyQualification onContact={handleWhatsApp} />

      {/* Service Chain A-F */}
      <ServiceChainAF />

      {/* Service Guarantees Grid */}
      <ServiceGuaranteesGrid />

      {/* Financial Transparency */}
      <FinancialTransparency />

      {/* Contract terms + sample monthly report (owner trust) */}
      <ContractTransparency />

      {/* Exit clause / trial period + guest damage policy (zero-risk decision) */}
      <OwnerExitDamagePolicy />

      {/* Demo of the owner portal (what you get after signing) */}
      <OwnerDashboardDemo />

      {/* Month-by-month seasonality — honest risk picture */}
      <OwnerSeasonalityChart />

      {/* Eligibility: what we accept and when we say no (self-qualification) */}
      <OwnerEligibilityCriteria />

      {/* Honest comparison vs self-management and classic agencies */}
      <OwnerCompetitorComparison />


      {/* Before/after: net income uplift on real managed apartments */}
      <BeforeAfterTransformations />

      {/* Case studies: three representative managed scenarios */}
      <OwnerCaseStudies />

      {/* Interactive ROI / income estimator */}
      <OwnerRoiEstimator />

      {/* Optimized short lead capture form */}
      <OwnerContactLeadForm source="pentru_proprietari_contact" />

      {/* Founder + team + legal identity ("cine ești, cu față") */}
      <FounderProfile />

      {/* 15-minute call slot booking with the founder */}
      <FounderCallBooking />

      {/* Interactive legal & tax guide + downloadable owner guide (lead magnet) */}
      <OwnerLegalTaxGuide />

      {/* Risks, minimum requirements, furnishing standards, guarantees */}
      <OwnerRisksLimits />

      {/* Association approval + tourism classification steps */}
      <OwnerAssociationPermits />




      {/* Process Steps Timeline */}
      <ProcessStepsTimeline />

      {/* Partnership Timeline */}
      <PartnershipTimeline />

      {/* Owner-focused: Marketing Premium + Consultanță Fiscală
          (fotografii pro, tur 360, consultanță fiscală Timișoara) */}
      <OwnerMarketingServices />

      {/* Owner-focused: Coverage map cu toate cartierele Timișoarei
          (include Mehala și Freidorf — geo-keywords lipsă) */}
      <OwnerCoverageMap />

      {/* Owner Guide content hub - internal linking blog + ansambluri */}
      <OwnerGuideHub />

      {/* Owner guide CTA */}
      <section className="py-12 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-2xl font-serif font-bold mb-4">
            {language === "ro" ? "Ghidul Proprietarului 2026" : "The 2026 Owner Guide"}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            {language === "ro" 
              ? "Checklist de onboarding, repere fiscale, conformitate ANAF și pași clari pentru preluare apartament în administrare fără stres."
              : "Owner checklist, tax guidance and clear onboarding steps for full-service property management."}
          </p>
          <Button asChild variant="hero" size="lg">
            <Link to="/evaluare-gratuita">{language === "ro" ? "Primește evaluarea gratuită" : "Get a free valuation"}</Link>
          </Button>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* ROI Case Studies - Before/After */}
      <ROICaseStudySection />

      {/* Why Us */}
      <WhyUs variant="owner" />


      {/* Testimonials */}
      <Testimonials />

      {/* Video Testimonials - Hidden until we have content */}
      {/* <VideoTestimonials /> */}

      {/* Owner Portal CTA */}
      <section className="py-20 bg-gradient-to-r from-primary/10 via-gold/10 to-primary/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--gold)/0.1),transparent_70%)]" />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold/10 border border-gold/20 mb-6">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-sm font-medium text-gold">
                {language === "ro" ? "Exclusiv pentru Parteneri" : "Partners Only"}
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {t.portalTitle}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {t.portalSubtitle}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="hero" size="xl" className="group">
                <Link to="/autentificare-proprietar">
                  {t.portalCta}
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="heroOutline" size="xl">
                <Link to="/despre-noi">
                  {language === "ro" ? "Despre Noi" : "About Us"}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Lead Magnet Banner */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-6">
          <LeadMagnetBanner variant="hero" />
        </div>
      </section>

      {/* Referral Banner */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-6">
          <ReferralBanner variant="hero" />
        </div>
      </section>

      {/* Tax Optimization — PFA vs SRL */}
      {faqReady && <TaxOptimizationSection />}

      {/* Owner Testimonials - peace of mind + 9%+ ROI */}
      {faqReady && <OwnerTestimonials />}

      {/* FAQ - deferred via IntersectionObserver */}
      <div ref={faqSentinel} />
      {faqReady && <OwnerObjectionsFAQ />}
      {faqReady && <OwnersFAQ />}
      {faqReady && <FAQ />}

      {/* Final CTA */}
      <section className="py-20 bg-card">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {language === "ro" ? "Gata să Începi?" : "Ready to Start?"}
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              {language === "ro"
                ? "Contactează-ne acum pentru o evaluare gratuită a proprietății tale."
                : "Contact us now for a free evaluation of your property."}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="hero" size="xl" onClick={handleWhatsApp}>
                <MessageCircle className="w-5 h-5 mr-2" />
                WhatsApp
              </Button>
              <Button
                variant="outline"
                size="xl"
                className="bg-card text-foreground border-border hover:bg-muted font-semibold shadow-md"
                onClick={() => window.location.href = "tel:+40799069256"}
              >
                <Phone className="w-5 h-5 mr-2" />
                0799 069 256
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
      <GlobalConversionWidgets />
      <BackToTop />
      </Suspense>
    </div>
  );
};

export default PentruProprietari;
