import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import PageSummary from "@/components/PageSummary";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { REAL_ESTATE_AGENT_SCHEMA } from "@/lib/orgIdentity";
import {
  Building2,
  MapPin,
  Home,
  ArrowRight,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface ComplexImage {
  id: string;
  image_path: string;
  complex_id: string;
}

interface Complex {
  id: string;
  name: string;
  slug: string;
  location: string;
  neighborhood: string;
  property_count: number;
  description_ro: string;
  description_en: string;
  meta_description_ro: string;
  meta_description_en: string;
}

const Complexe = () => {
  const { language } = useLanguage();
  const [complexes, setComplexes] = useState<Complex[]>([]);
  const [complexImages, setComplexImages] = useState<Record<string, ComplexImage[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const translations = {
    ro: {
      title: "Complexe Rezidențiale Timișoara | Management Regim Hotelier",
      metaDescription: "Apartamente în regim hotelier în 12 complexe rezidențiale din Timișoara: ISHO, ATENEO, City of Mara, Fructus Plaza, XCity Towers și altele. ROI 9.4%.",
      heroTitle: "Complexe Rezidențiale",
      heroTitleHighlight: "Timișoara",
      heroSubtitle: "Administrăm proprietăți în cele mai exclusiviste ansambluri rezidențiale din Timișoara. Descoperă complexul tău și află potențialul de venit.",
      properties: "proprietăți",
      viewDetails: "Vezi Detalii",
      neighborhoods: "Zone Acoperite",
      neighborhoodsList: ["Centru", "Nord", "Sud", "Est", "Vest", "Pădurea Verde"],
      statsTitle: "Rezultate Demonstrate",
      avgRoi: "ROI Mediu",
      avgRoiValue: "9.4%",
      occupancy: "Ocupare Medie",
      occupancyValue: "95%",
      totalProperties: "Proprietăți",
      totalPropertiesValue: "15",
      localSeoTitle: "Management Regim Hotelier Timișoara",
      localSeoText: "RealTrust & ApArt Hotel oferă servicii complete de administrare în regim hotelier pentru proprietățile din cele mai căutate zone ale Timișoarei: Fructus Plaza, City of Mara, Ateneo, Ring, Vivalia, Nord-One, Monarch, Paltim, Denya Forest, Campeador, XCity Towers, Iris și multe altele, acoperind cartiere precum Centru, Iosefin, Fabric, Mehala, Braytim, Soarelui, Girocului și zonele metropolitane Dumbrăvița și Ghiroda. Lista se completează continuu cu noi ansambluri și complexe rezidențiale.",
      tocTitle: "Cuprins",
      tocItems: [
        { id: "stats", label: "Rezultate demonstrate" },
        { id: "complexes", label: "Lista complexelor" },
        { id: "pricing", label: "Prețuri & tipuri apartamente" },
        { id: "local-seo", label: "Zone și cartiere acoperite" },
        { id: "faq", label: "Întrebări frecvente" },
      ],
      pricingTitle: "Prețuri apartamente noi Timișoara & tipuri disponibile",
      pricingText: "Prețurile pentru apartamente noi în Timișoara variază între 1.400 – 2.400 €/mp, în funcție de complex, etaj și finisaje. Administrăm garsoniere, apartamente cu 2 și 3 camere, penthouse-uri și apartamente cu grădină proprie la parter — disponibile în special în complexele din Dumbrăvița, Ghiroda și zona Braytim. Stadiul construcției și disponibilitatea exactă pentru fiecare ansamblu (în construcție / finalizat) sunt detaliate pe pagina dedicată complexului.",
      faqTitle: "Întrebări frecvente despre complexele rezidențiale",
      faqItems: [
        { question: "Care sunt prețurile apartamentelor noi în Timișoara?", answer: "Prețurile pentru apartamente noi în Timișoara variază între 1.400 și 2.400 €/mp, în funcție de complex, etaj, orientare și nivel de finisaje. ISHO și Fructus Plaza se situează în segmentul premium, iar complexele din Dumbrăvița și Ghiroda oferă cel mai bun raport preț/randament." },
        { question: "Care este stadiul construcției pentru complexele noi (ATENEO, City of Mara)?", answer: "Stadiul exact al construcției — în construcție, în curs de finalizare sau finalizat — este actualizat pe pagina dedicată fiecărui complex. Verificați pagina complexului pentru termenele de livrare și disponibilitatea unităților." },
        { question: "Aveți apartamente cu grădină în Timișoara?", answer: "Da, în mai multe complexe noi (în special Dumbrăvița, Ghiroda și zona Braytim) sunt disponibile apartamente la parter cu grădină privată — ideale pentru familii sau ca investiție diferențiată în regim hotelier." },
        { question: "Ce zone și cartiere acoperiți?", answer: "Acoperim toate cartierele majore din Timișoara: Centru, Iosefin, Fabric, Mehala, Circumvalațiunii, Complex Studențesc, Soarelui, Girocului, Braytim, Calea Aradului, plus zonele metropolitane Dumbrăvița, Ghiroda, Moșnița Nouă, Chișoda și Giroc." },
        { question: "Ce randament pot obține printr-un complex rezidențial administrat de RealTrust?", answer: "Randamentul mediu net verificat este de 9.4% anual prin regim hotelier, cu o ocupare medie de 95% în complexele administrate. Calculul include toate costurile (administrare, curățenie, comisioane platforme)." },
        { question: "Pot obține credit ipotecar pentru un apartament într-un complex nou?", answer: "Da, oferim consultanță pentru credit ipotecar prin partenerii noștri bancari, cu pre-aprobare în 48h pentru apartamentele din complexele listate." },
      ],
    },
    en: {
      title: "Residential Complexes Timișoara | Short-Term Rental Management",
      metaDescription: "Professional short-term rental management for Timișoara's most sought-after residential complexes: Fructus Plaza, City of Mara, Ateneo, Ring, Vivalia and more. 9.4%+ ROI.",
      heroTitle: "Residential Complexes",
      heroTitleHighlight: "Timișoara",
      heroSubtitle: "We manage properties in Timișoara's most exclusive residential complexes. Discover your complex and find out your income potential.",
      properties: "properties",
      viewDetails: "View Details",
      neighborhoods: "Covered Areas",
      neighborhoodsList: ["Center", "North", "South", "East", "West", "Green Forest"],
      statsTitle: "Proven Results",
      avgRoi: "Average ROI",
      avgRoiValue: "9.4%",
      occupancy: "Avg Occupancy",
      occupancyValue: "95%",
      totalProperties: "Properties",
      totalPropertiesValue: "15",
      localSeoTitle: "Short-Term Rental Management Timișoara",
      localSeoText: "RealTrust & ApArt Hotel offers complete short-term rental management services for properties in Timișoara's most sought-after residential complexes: Fructus Plaza, City of Mara, Ateneo, Ring, Vivalia, Nord-One, Monarch, Paltim, Denya Forest, Campeador, XCity Towers, Iris and many more, covering neighborhoods such as Centru, Iosefin, Fabric, Mehala, Braytim, Soarelui, Girocului and the metropolitan areas Dumbrăvița and Ghiroda. The list is continuously expanding with new residential ensembles and complexes.",
      tocTitle: "Table of Contents",
      tocItems: [
        { id: "stats", label: "Proven results" },
        { id: "complexes", label: "List of complexes" },
        { id: "pricing", label: "Pricing & apartment types" },
        { id: "local-seo", label: "Areas & neighborhoods covered" },
        { id: "faq", label: "Frequently asked questions" },
      ],
      pricingTitle: "New apartment prices Timișoara & available types",
      pricingText: "Prices for new apartments in Timișoara range between €1,400 – €2,400/sqm, depending on the complex, floor and finishes. We manage studios, 2- and 3-bedroom apartments, penthouses and ground-floor apartments with private gardens — available especially in Dumbrăvița, Ghiroda and the Braytim area. The exact construction stage and unit availability for each complex (under construction / completed) is detailed on the dedicated complex page.",
      faqTitle: "Frequently asked questions about residential complexes",
      faqItems: [
        { question: "What are the prices for new apartments in Timișoara?", answer: "Prices for new apartments in Timișoara range between €1,400 and €2,400/sqm, depending on the complex, floor, orientation and finish level. ISHO and Fructus Plaza sit in the premium segment, while complexes in Dumbrăvița and Ghiroda offer the best price/yield ratio." },
        { question: "What is the construction status for new complexes (ATENEO, City of Mara)?", answer: "The exact construction status — under construction, near completion, or completed — is updated on each complex's dedicated page. Check the complex page for delivery deadlines and unit availability." },
        { question: "Do you have apartments with a garden in Timișoara?", answer: "Yes, several new complexes (especially in Dumbrăvița, Ghiroda and the Braytim area) offer ground-floor apartments with private gardens — ideal for families or as a differentiated short-term rental investment." },
        { question: "What areas and neighborhoods do you cover?", answer: "We cover all major neighborhoods in Timișoara: Centru, Iosefin, Fabric, Mehala, Circumvalațiunii, Complex Studențesc, Soarelui, Girocului, Braytim, Calea Aradului, plus the metropolitan areas Dumbrăvița, Ghiroda, Moșnița Nouă, Chișoda and Giroc." },
        { question: "What yield can I get through a residential complex managed by RealTrust?", answer: "The average verified net yield is 9.4% annually via short-term rental, with an average 95% occupancy in managed complexes. The calculation includes all costs (management, cleaning, platform commissions)." },
        { question: "Can I get a mortgage for an apartment in a new complex?", answer: "Yes, we offer mortgage consulting through our banking partners, with pre-approval in 48h for apartments in the listed complexes." },
      ],
    },
  };

  const t = translations[language as keyof typeof translations] || translations.ro;

  useRegisterFAQs("complexe-page", t.faqItems);

  useEffect(() => {
    const fetchComplexes = async () => {
      setIsLoading(true);
      try {
        const { data: complexesData, error: complexesError } = await supabase
          .from("residential_complexes")
          .select("*")
          .eq("is_active", true)
          .order("display_order", { ascending: true });

        if (complexesError) throw complexesError;

        if (complexesData && complexesData.length > 0) {
          setComplexes(complexesData);

          const { data: imagesData } = await supabase
            .from("complex_images")
            .select("*")
            .in("complex_id", complexesData.map((c) => c.id))
            .order("display_order", { ascending: true });

          if (imagesData) {
            const imagesByComplex: Record<string, ComplexImage[]> = {};
            imagesData.forEach((img) => {
              if (!imagesByComplex[img.complex_id]) {
                imagesByComplex[img.complex_id] = [];
              }
              imagesByComplex[img.complex_id].push(img);
            });
            setComplexImages(imagesByComplex);
          }
        }
      } catch (error) {
        console.error("Error fetching complexes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComplexes();
  }, []);

  const breadcrumbItems = [
    { name: "Acasă", url: "https://realtrust.ro" },
    { name: "Complexe Rezidențiale", url: "https://realtrust.ro/ansambluri-rezidentiale" },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...REAL_ESTATE_AGENT_SCHEMA,
        "hasOfferCatalog": {
          "@type": "OfferCatalog",
          "name": language === "en" ? "Residential Complexes Managed" : "Complexe Rezidențiale Administrate",
          "itemListElement": complexes.map((complex, idx) => ({
            "@type": "Offer",
            "position": idx + 1,
            "itemOffered": {
              "@type": "ApartmentComplex",
              "name": complex.name,
              "url": `https://realtrust.ro/complex/${complex.slug}`,
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Timișoara",
                "addressRegion": "Timiș",
                "addressCountry": "RO",
              },
            },
          })),
        },
      },
      {
        "@type": "ItemList",
        "name": t.heroTitle,
        "description": t.metaDescription,
        "itemListElement": complexes.map((complex, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "item": {
            "@type": "ApartmentComplex",
            "name": complex.name,
            "url": `https://realtrust.ro/complex/${complex.slug}`,
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Timișoara",
              "addressRegion": "Timiș",
              "addressCountry": "RO",
            },
          },
        })),
      },
    ],
  };

  return (
    <>
      <SEOHead
        title={t.title}
        description={t.metaDescription}
        url="https://realtrust.ro/ansambluri-rezidentiale"
        jsonLd={jsonLd}
        breadcrumbItems={breadcrumbItems}
      />

      <Header />

      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-6 pt-24">
          <PageSummary
            summaryRo="Complexe rezidențiale din Timișoara administrate de RealTrust. Apartamente moderne în regim hotelier cu facilități premium, locații centrale și randament verificat."
            summaryEn="Residential complexes in Timișoara managed by RealTrust. Modern short-term rental apartments with premium amenities, central locations and verified yields."
          />
        </div>
        {/* Hero Section */}
        <section className="pt-12 pb-16 bg-gradient-to-br from-primary/5 via-background to-muted/30">
          <div className="container mx-auto px-6 text-center">
            <Badge variant="outline" className="mb-4">
              <Building2 className="w-3 h-3 mr-1" />
              {t.neighborhoods}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              {t.heroTitle}{" "}
              <span className="text-gradient-gold">{t.heroTitleHighlight}</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              {t.heroSubtitle}
            </p>

            {/* Neighborhood Tags */}
            <div className="flex flex-wrap justify-center gap-2">
              {t.neighborhoodsList.map((neighborhood) => (
                <Badge key={neighborhood} variant="secondary" className="text-sm">
                  <MapPin className="w-3 h-3 mr-1" />
                  {neighborhood}
                </Badge>
              ))}
            </div>
          </div>
        </section>

        {/* Table of Contents */}
        <nav aria-label={t.tocTitle} className="py-6 border-b border-border bg-muted/20">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-semibold text-foreground mb-3">{t.tocTitle}</p>
              <ul className="flex flex-wrap gap-2">
                {t.tocItems.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className="text-sm px-3 py-1.5 rounded-md bg-card border border-border hover:border-primary/40 hover:text-primary transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>

        {/* Stats Section */}
        <section id="stats" className="py-12 border-b border-border">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
              <div>
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {t.avgRoiValue}
                </p>
                <p className="text-sm text-muted-foreground">{t.avgRoi}</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {t.occupancyValue}
                </p>
                <p className="text-sm text-muted-foreground">{t.occupancy}</p>
              </div>
              <div>
                <p className="text-3xl md:text-4xl font-bold text-primary mb-1">
                  {t.totalPropertiesValue}
                </p>
                <p className="text-sm text-muted-foreground">{t.totalProperties}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Complexes Grid */}
        <section id="complexes" className="py-16">
          <div className="container mx-auto px-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {complexes.map((complex) => {
                  const images = complexImages[complex.id] || [];
                  const description =
                    language === "en" ? complex.description_en : complex.description_ro;

                  return (
                    <Link
                      key={complex.id}
                      to={`/complex/${complex.slug}`}
                      className="group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-elegant"
                    >
                      {/* Image */}
                      <div className="relative h-56 overflow-hidden">
                        {images.length > 0 ? (
                          <Carousel opts={{ loop: true }} className="w-full h-full">
                            <CarouselContent className="h-full -ml-0">
                              {images.slice(0, 3).map((image, idx) => (
                                <CarouselItem key={image.id} className="pl-0 h-full">
                                  <img
                                    src={image.image_path}
                                    alt={`${complex.name} - ${idx + 1}`}
                                    className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105"
                                  />
                                </CarouselItem>
                              ))}
                            </CarouselContent>
                          </Carousel>
                        ) : (
                          <div className="w-full h-56 bg-muted flex items-center justify-center">
                            <Building2 className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-4 left-4 flex gap-2">
                          <Badge className="bg-background/90 text-foreground backdrop-blur-sm">
                            <MapPin className="w-3 h-3 mr-1" />
                            {complex.neighborhood}
                          </Badge>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h2 className="text-xl font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                          {complex.name}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                          {description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm text-primary">
                            <TrendingUp className="w-4 h-4" />
                            <span className="font-medium">ROI 9.4%+</span>
                          </div>
                          <span className="text-sm text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                            {t.viewDetails}
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Pricing & Apartment Types */}
        <section id="pricing" className="py-16 border-t border-border">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
                {t.pricingTitle}
              </h2>
              <p className="text-foreground/80 leading-relaxed">
                {t.pricingText}
              </p>
            </div>
          </div>
        </section>

        {/* Local SEO Content */}
        <section id="local-seo" className="py-16 bg-muted/30">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-6">
                {t.localSeoTitle}
              </h2>
              <p className="text-foreground/80 leading-relaxed mb-6">
                {t.localSeoText}
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {complexes.slice(0, 6).map((complex) => (
                  <Link
                    key={complex.id}
                    to={`/complex/${complex.slug}`}
                    className="flex items-center gap-3 p-4 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors"
                  >
                    <Building2 className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{complex.name}</p>
                      <p className="text-xs text-muted-foreground">{complex.location}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-16 border-t border-border">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-6 text-center">
                {t.faqTitle}
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {t.faqItems.map((item, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`}>
                    <AccordionTrigger className="text-left">{item.question}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default Complexe;
