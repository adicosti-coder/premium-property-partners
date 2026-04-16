import { useState, useEffect } from "react";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
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

function generateFallbackContent(
  props: TheAdvisorProps,
  lang: "ro" | "en"
): AdvisorContent {
  const { propertyName, location, size, bedrooms, bathrooms, capacity, pricePerNight, listingType, yearBuilt, roi, amenities } = props;
  const isInvestment = listingType === "investitie" || listingType === "investment";
  const isRental = listingType === "inchiriere";
  const estimatedYield = roi || "9.4%";
  const sizeText = size ? `${size} mp` : "";
  const bedsText = bedrooms ? `${bedrooms}` : "N/A";
  const amenitiesText = amenities?.slice(0, 5).join(", ") || "";

  if (lang === "ro") {
    // Rental-specific content
    if (isRental) {
      return {
        expertInsight: `${propertyName} este situată în zona ${location}, Timișoara — una dintre cele mai căutate zone pentru închiriere din vestul României. ${sizeText ? `Cu o suprafață de ${sizeText}` : "Proprietatea"}${bedrooms ? ` și ${bedsText} dormitoare` : ""}, această proprietate oferă un echilibru excelent între confort și accesibilitate.\n\nZona ${location} beneficiază de acces facil la transportul public, zone comerciale și universități, ceea ce o face ideală pentru chiriași — de la profesioniști la studenți. ${yearBuilt ? `Construită în ${yearBuilt}, proprietatea` : "Proprietatea"} respectă standarde moderne de calitate și eficiență energetică.\n\nAdministrată profesionist, proprietatea este pregătită pentru o închiriere pe termen lung fără griji. ${amenitiesText ? `Printre dotări se numără: ${amenitiesText}.` : ""}`,
        investmentMetrics: { netYield: "", rentMultiplier: "", zoneSafetyScore: "" },
        faqs: [
          { question: "Ce tipuri de chiriași sunt potriviți pentru această proprietate?", answer: `${propertyName} este ideală pentru profesioniști, cupluri sau studenți care caută o locuință modernă și bine poziționată în zona ${location}.` },
          { question: "Ce facilități sunt incluse în chirie?", answer: `Proprietatea include dotări moderne${amenitiesText ? ` precum ${amenitiesText}` : ""}, asigurând un confort de zi cu zi la standarde ridicate.` },
          { question: "Care sunt avantajele zonei pentru locuit?", answer: `Zona ${location} din Timișoara oferă acces rapid la transport public, supermarketuri, restaurante și zone verzi, fiind una dintre cele mai căutate zone rezidențiale.` },
          { question: "Care sunt condițiile contractuale de închiriere?", answer: "Contractul de închiriere este pe termen lung (minim 12 luni), cu posibilitate de prelungire. Detalii suplimentare sunt disponibile la cerere." },
          { question: "Ce servicii oferă RealTrust pentru proprietari?", answer: "RealTrust oferă servicii de administrare completă: selecția chiriașilor, contracte, întreținere și suport continuu pentru proprietar." },
        ],
      };
    }

    return {
      expertInsight: `${propertyName} este situată în zona ${location}, Timișoara — una dintre cele mai dinamice piețe imobiliare din vestul României. ${sizeText ? `Cu o suprafață de ${sizeText}` : "Proprietatea"}${bedrooms ? ` și ${bedsText} dormitoare` : ""}, această proprietate oferă un echilibru excelent între confort și potențial investițional.\n\nZona ${location} beneficiază de acces facil la transportul public, zone comerciale și universități, ceea ce asigură o cerere constantă atât din partea turiștilor, cât și a profesioniștilor în deplasare. ${yearBuilt ? `Construită în ${yearBuilt}, proprietatea` : "Proprietatea"} respectă standarde moderne de calitate și eficiență energetică.\n\n${isInvestment ? "Ca investiție, proprietatea se remarcă prin potențialul de randament ridicat și lichiditatea zonei." : "Gestionată profesionist de RealTrust, proprietatea oferă oaspeților o experiență premium — de la check-in digital la curățenie profesională."} ${amenitiesText ? `Printre dotări se numără: ${amenitiesText}.` : ""}`,
      investmentMetrics: {
        netYield: estimatedYield,
        rentMultiplier: pricePerNight ? `${Math.round((pricePerNight * 30) / (pricePerNight * 10))}x` : "18x",
        zoneSafetyScore: "8.5/10",
      },
      faqs: [
        { question: "Care este randamentul estimat al acestei proprietăți?", answer: `Randamentul net estimat este de aproximativ ${estimatedYield}, bazat pe rata de ocupare medie din zona ${location} și prețul per noapte practicat.` },
        { question: "Ce face zona atractivă pentru investitori?", answer: `Zona ${location} din Timișoara beneficiază de cerere constantă datorită proximității față de centre comerciale, universități și noduri de transport. Rata de ocupare medie în zonă depășește 65%.` },
        { question: "Proprietatea este potrivită pentru închiriere pe termen scurt?", answer: `Da, ${propertyName} este ideală pentru regim hotelier sau Airbnb, având ${capacity ? `capacitate de ${capacity} oaspeți` : "dotări moderne"} și acces la facilități premium.` },
        { question: "Ce servicii oferă RealTrust pentru această proprietate?", answer: "RealTrust oferă management complet: listare pe platforme (Booking, Airbnb), optimizare prețuri, curățenie profesională, check-in digital și suport 24/7 pentru oaspeți." },
        { question: "Cum se compară cu alte investiții din zonă?", answer: `Proprietatea se poziționează competitiv în segmentul premium din ${location}, cu un raport preț-calitate excelent și potențial de apreciere pe termen mediu.` },
      ],
    };
  }

  // English rental
  if (isRental) {
    return {
      expertInsight: `${propertyName} is located in the ${location} area of Timișoara — one of the most sought-after rental neighborhoods in western Romania. ${sizeText ? `With a surface area of ${sizeText}` : "The property"}${bedrooms ? ` and ${bedsText} bedrooms` : ""}, this property offers an excellent balance between comfort and accessibility.\n\nThe ${location} area benefits from easy access to public transport, commercial zones, and universities, making it ideal for tenants — from professionals to students. ${yearBuilt ? `Built in ${yearBuilt}, the property` : "The property"} meets modern quality and energy efficiency standards.\n\nProfessionally managed, the property is ready for hassle-free long-term rental. ${amenitiesText ? `Amenities include: ${amenitiesText}.` : ""}`,
      investmentMetrics: { netYield: "", rentMultiplier: "", zoneSafetyScore: "" },
      faqs: [
        { question: "What types of tenants are suitable for this property?", answer: `${propertyName} is ideal for professionals, couples, or students looking for a modern, well-located home in the ${location} area.` },
        { question: "What amenities are included in the rent?", answer: `The property includes modern amenities${amenitiesText ? ` such as ${amenitiesText}` : ""}, ensuring high daily comfort standards.` },
        { question: "What are the advantages of the area for living?", answer: `The ${location} area in Timișoara offers quick access to public transport, supermarkets, restaurants, and green spaces, making it one of the most desirable residential areas.` },
        { question: "What are the rental contract terms?", answer: "The rental contract is long-term (minimum 12 months), with the possibility of extension. Additional details are available upon request." },
        { question: "What services does RealTrust offer for landlords?", answer: "RealTrust offers complete management services: tenant selection, contracts, maintenance, and ongoing support for property owners." },
      ],
    };
  }

  return {
    expertInsight: `${propertyName} is located in the ${location} area of Timișoara — one of the most dynamic real estate markets in western Romania. ${sizeText ? `With a surface area of ${sizeText}` : "The property"}${bedrooms ? ` and ${bedsText} bedrooms` : ""}, this property offers an excellent balance between comfort and investment potential.\n\nThe ${location} area benefits from easy access to public transport, commercial zones, and universities, ensuring consistent demand from both tourists and business travelers. ${yearBuilt ? `Built in ${yearBuilt}, the property` : "The property"} meets modern quality and energy efficiency standards.\n\n${isInvestment ? "As an investment, the property stands out for its high yield potential and area liquidity." : "Professionally managed by RealTrust, the property offers guests a premium experience — from digital check-in to professional cleaning."} ${amenitiesText ? `Amenities include: ${amenitiesText}.` : ""}`,
    investmentMetrics: {
      netYield: estimatedYield,
      rentMultiplier: pricePerNight ? `${Math.round((pricePerNight * 30) / (pricePerNight * 10))}x` : "18x",
      zoneSafetyScore: "8.5/10",
    },
    faqs: [
      { question: "What is the estimated yield for this property?", answer: `The estimated net yield is approximately ${estimatedYield}, based on the average occupancy rate in the ${location} area and the nightly rate.` },
      { question: "What makes this area attractive for investors?", answer: `The ${location} area in Timișoara benefits from consistent demand due to its proximity to shopping centers, universities, and transport hubs. The average occupancy rate in the area exceeds 65%.` },
      { question: "Is the property suitable for short-term rental?", answer: `Yes, ${propertyName} is ideal for hotel-style or Airbnb rental, with ${capacity ? `capacity for ${capacity} guests` : "modern amenities"} and access to premium facilities.` },
      { question: "What services does RealTrust provide?", answer: "RealTrust offers complete management: platform listings (Booking, Airbnb), price optimization, professional cleaning, digital check-in, and 24/7 guest support." },
      { question: "How does it compare to other investments in the area?", answer: `The property is competitively positioned in the premium segment of ${location}, with an excellent price-quality ratio and medium-term appreciation potential.` },
    ],
  };
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
  expertInsightOverride,
}: TheAdvisorProps) => {
  const { language } = useLanguage();
  const [content, setContent] = useState<AdvisorContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const amenitiesKey = amenities?.join("|") || "";

  const t = language === "ro"
    ? {
        sectionTitle: "The Advisor",
        sectionSubtitle: "Analiză premium generată de RealTrust Expert AI",
        expertTitle: "Expert Insight",
        investmentTitle: "Indicatori de Investiție",
        faqTitle: "Întrebări Frecvente — Concierge",
        netYield: "RANDAMENT (ROI)",
        rentMultiplier: "Multiplicator Chirie",
        safetyScore: "Scor Siguranță Zonă",
        loading: "Se generează analiza...",
        errorMsg: "Nu s-a putut genera analiza.",
      }
    : {
        sectionTitle: "The Advisor",
        sectionSubtitle: "Premium analysis by RealTrust Expert AI",
        expertTitle: "Expert Insight",
        investmentTitle: "Investment Metrics",
        faqTitle: "Frequently Asked Questions — Concierge",
        netYield: "YIELD (ROI)",
        rentMultiplier: "Rent Multiplier",
        safetyScore: "Zone Safety Score",
        loading: "Generating analysis...",
        errorMsg: "Could not generate analysis.",
      };

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_INTERVAL = 30 * 60 * 1000; // 30 minutes

    const fetchContent = async (isRetry = false) => {
      if (!isRetry) {
        setError(false);
        setIsLoading(true);
      }
      const cacheKey = `advisor_v2_${propertySlug || propertyName}_${location}_${language}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached && !isRetry) {
        try {
          setContent(JSON.parse(cached));
          setIsFallback(false);
          setIsLoading(false);
          return;
        } catch { /* ignore bad cache */ }
      }

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "generate-advisor-content",
          {
            body: {
              propertyName, propertySlug, location, size, bedrooms, bathrooms,
              capacity, floor, pricePerNight, amenities, listingType, yearBuilt,
              energyClass, roi, language,
            },
          }
        );

        if (fnError || !data) throw new Error(fnError?.message || "No data returned");

        if (!cancelled) {
          setContent(data as AdvisorContent);
          setIsFallback(false);
          sessionStorage.setItem(cacheKey, JSON.stringify(data));
        }
      } catch (err) {
        console.error("TheAdvisor fetch error:", err);
        if (!cancelled) {
          if (!isRetry) {
            const lang = language === "en" ? "en" : "ro";
            const fallback = generateFallbackContent(
              { propertyName, propertySlug, location, size, bedrooms, bathrooms, capacity, floor, pricePerNight, amenities, listingType, yearBuilt, energyClass, roi },
              lang
            );
            setContent(fallback);
            setIsFallback(true);
          }
          // Retry max 3 times, every 30 min
          retryCount++;
          if (retryCount <= MAX_RETRIES) {
            retryTimer = setTimeout(() => {
              if (!cancelled) fetchContent(true);
            }, RETRY_INTERVAL);
          }
        }
      } finally {
        if (!cancelled && !isRetry) setIsLoading(false);
      }
    };

    fetchContent();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [propertyName, propertySlug, location, size, bedrooms, bathrooms, capacity, floor, pricePerNight, amenitiesKey, listingType, yearBuilt, energyClass, roi, language]);

  // Register FAQ items via centralized context (single FAQPage per page)
  const advisorFaqItems = (content?.faqs || []).map((faq) => ({
    question: faq.question,
    answer: faq.answer,
  }));
  useRegisterFAQs("the-advisor", advisorFaqItems);

  // If error and no content, force fallback via effect
  useEffect(() => {
    if (error && !content && !isLoading) {
      const lang = language === "en" ? "en" : "ro";
      const fallback = generateFallbackContent(
        { propertyName, propertySlug, location, size, bedrooms, bathrooms, capacity, floor, pricePerNight, amenities, listingType, yearBuilt, energyClass, roi },
        lang
      );
      setContent(fallback);
      setIsFallback(true);
      setError(false);
    }
  }, [error, content, isLoading]);

  return (
    <section className="space-y-6" aria-label="The Advisor">

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
        (() => {
          const isRental = listingType === "inchiriere";
          // Use manual override if available, otherwise use AI-generated text
          let expertText = expertInsightOverride?.trim() || content.expertInsight;
          if (isRental) {
            expertText = expertText
              .replace(/Această investiție nu vizează doar o proprietate[^.]*\./gi, '')
              .replace(/[^.]*sursă de venit pasiv[^.]*\./gi, '')
              .replace(/[^.]*randament[^.]*regim hotelier[^.]*\./gi, '')
              .replace(/[^.]*Booking[^.]*Airbnb[^.]*\./gi, '')
              .replace(/[^.]*dynamic pricing[^.]*\./gi, '')
              .replace(/[^.]*smart lock[^.]*\./gi, '')
              .replace(/[^.]*potențial investițional[^.]*\./gi, '')
              .replace(/[^.]*investment potential[^.]*\./gi, '')
              .replace(/\n{3,}/g, '\n\n')
              .trim();
          }
          return (
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
                    {expertText.split("\n").map((paragraph, i) =>
                      paragraph.trim() ? (
                        <p key={i} className="mb-3 last:mb-0">
                          {paragraph}
                        </p>
                      ) : null
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* ─── Investment Table (hidden for rentals) ─── */}
              {!isRental && (
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
                          {roi ? (roi.includes('%') ? roi : `${roi}%`) : (content.investmentMetrics.netYield || "").replace(/[^0-9.,%-]/g, "").trim() || content.investmentMetrics.netYield}
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
              )}

              {/* ─── FAQ Concierge (hidden for rentals — PropertyFAQ handles it) ─── */}
              {!isRental && (
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
              )}
            </div>
          );
        })()
      ) : null}
    </section>
  );
};

export default TheAdvisor;
