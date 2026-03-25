import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TrendingUp, Shield, Calculator, Lightbulb, HelpCircle } from "lucide-react";

interface TheAdvisorProps {
  propertyName: string;
  propertySlug?: string;
  location: string;
  size?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  capacity?: number | null;
  floor?: string | null;
  pricePerNight?: number | null;
  amenities?: string[];
  listingType?: string | null;
  yearBuilt?: number | null;
  energyClass?: string | null;
  roi?: string | null;
}

interface AdvisorContent {
  expertInsight: string;
  investmentMetrics: {
    netYield: string;
    rentMultiplier: string;
    zoneSafetyScore: string;
  };
  faqs: Array<{ question: string; answer: string }>;
}

const TheAdvisor = ({
  propertyName,
  propertySlug,
  location,
  size,
  bedrooms,
  bathrooms,
  capacity,
  floor,
  pricePerNight,
  amenities,
  listingType,
  yearBuilt,
  energyClass,
  roi,
}: TheAdvisorProps) => {
  const { language } = useLanguage();
  const [content, setContent] = useState<AdvisorContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const amenitiesKey = amenities?.join("|") || "";

  const t = language === "ro"
    ? {
        sectionTitle: "The Advisor",
        sectionSubtitle: "Analiză premium generată de AI",
        expertTitle: "Expert Insight",
        investmentTitle: "Indicatori de Investiție",
        faqTitle: "Întrebări Frecvente — Concierge",
        netYield: "Randament Net",
        rentMultiplier: "Multiplicator Chirie",
        safetyScore: "Scor Siguranță Zonă",
        loading: "Se generează analiza...",
        errorMsg: "Nu s-a putut genera analiza.",
      }
    : {
        sectionTitle: "The Advisor",
        sectionSubtitle: "AI-powered premium analysis",
        expertTitle: "Expert Insight",
        investmentTitle: "Investment Metrics",
        faqTitle: "Frequently Asked Questions — Concierge",
        netYield: "Net Yield",
        rentMultiplier: "Rent Multiplier",
        safetyScore: "Zone Safety Score",
        loading: "Generating analysis...",
        errorMsg: "Could not generate analysis.",
      };

  useEffect(() => {
    let cancelled = false;

    const fetchContent = async () => {
      setError(false);
      setIsLoading(true);
      // Check sessionStorage cache first
      const cacheKey = `advisor_v2_${propertySlug || propertyName}_${location}_${language}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try {
          setContent(JSON.parse(cached));
          setIsLoading(false);
          return;
        } catch { /* ignore bad cache */ }
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "generate-advisor-content",
          {
            body: {
              propertyName,
              propertySlug,
              location,
              size,
              bedrooms,
              bathrooms,
              capacity,
              floor,
              pricePerNight,
              amenities,
              listingType,
              yearBuilt,
              energyClass,
              roi,
              language,
            },
          }
        );

        if (fnError || !data) {
          throw new Error(fnError?.message || "No data returned");
        }

        if (!cancelled) {
          setContent(data as AdvisorContent);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (err) {
        console.error("TheAdvisor fetch error:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchContent();
    return () => { cancelled = true; };
  }, [propertyName, propertySlug, location, size, bedrooms, bathrooms, capacity, floor, pricePerNight, amenitiesKey, listingType, yearBuilt, energyClass, roi, language]);

  // FAQ Schema JSON-LD
  const faqSchema = content?.faqs
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: content.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      }
    : null;

  if (error) return null;

  return (
    <section className="space-y-6" aria-label="The Advisor">
      {faqSchema && (
        <Helmet>
          <script type="application/ld+json">
            {JSON.stringify(faqSchema)}
          </script>
        </Helmet>
      )}

      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-serif font-semibold text-foreground">
            {t.sectionTitle}
          </h2>
          <p className="text-sm text-muted-foreground">{t.sectionSubtitle}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-32 w-full" />
          <p className="text-sm text-muted-foreground text-center animate-pulse">
            {t.loading}
          </p>
        </div>
      ) : content ? (
        <div className="space-y-8">
          {/* ─── Expert Insight ─── */}
          <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/[0.03]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-serif font-semibold text-foreground">
                  {t.expertTitle}
                </h3>
              </div>
              <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
                {content.expertInsight.split("\n").map((paragraph, i) =>
                  paragraph.trim() ? (
                    <p key={i} className="mb-3 last:mb-0">
                      {paragraph}
                    </p>
                  ) : null
                )}
              </div>
            </CardContent>
          </Card>

          {/* ─── Investment Table ─── */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Calculator className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-serif font-semibold text-foreground">
                {t.investmentTitle}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="text-center border-primary/10 hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {content.investmentMetrics.netYield}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                    {t.netYield}
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center border-primary/10 hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <Calculator className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {content.investmentMetrics.rentMultiplier}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                    {t.rentMultiplier}
                  </p>
                </CardContent>
              </Card>
              <Card className="text-center border-primary/10 hover:border-primary/30 transition-colors">
                <CardContent className="p-5">
                  <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">
                    {content.investmentMetrics.zoneSafetyScore}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                    {t.safetyScore}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ─── FAQ Concierge ─── */}
          <div className="faq-section">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-serif font-semibold text-foreground">
                {t.faqTitle}
              </h3>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {content.faqs.map((faq, index) => (
                <AccordionItem key={index} value={`faq-${index}`}>
                  <AccordionTrigger className="text-left text-foreground hover:text-primary font-medium">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default TheAdvisor;
