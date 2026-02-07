import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  MapPin,
  Home,
  CheckCircle,
  ArrowLeft,
  Phone,
  MessageCircle,
  Loader2,
  Star,
  TrendingUp,
  Shield,
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import QuickLeadForm from "@/components/QuickLeadForm";

interface ComplexImage {
  id: string;
  image_path: string;
  display_order: number;
  is_primary: boolean;
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
  meta_title_ro: string;
  meta_title_en: string;
  meta_description_ro: string;
  meta_description_en: string;
  seo_keywords: string[];
  latitude: number;
  longitude: number;
  features: string[];
  features_en: string[];
}

const ComplexDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language } = useLanguage();
  const [complex, setComplex] = useState<Complex | null>(null);
  const [images, setImages] = useState<ComplexImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const translations = {
    ro: {
      backToComplexes: "Înapoi la Complexe",
      properties: "proprietăți administrate",
      features: "Facilități & Avantaje",
      whyInvest: "De Ce Să Investești Aici?",
      roi: "ROI Estimat",
      roiValue: "8.5% - 9.5%",
      occupancy: "Rată Ocupare",
      occupancyValue: "95%+",
      management: "Management Complet",
      managementValue: "24/7",
      ctaTitle: "Ai o Proprietate în",
      ctaSubtitle: "Solicită o evaluare gratuită și află cât poți câștiga din administrarea în regim hotelier.",
      contactUs: "Contactează-ne",
      whatsapp: "WhatsApp",
      freeEvaluation: "Evaluare Gratuită",
      localSeoTitle: "Management Regim Hotelier",
      localSeoText: "RealTrust oferă servicii complete de administrare în regim hotelier pentru proprietățile din",
      benefits: [
        "Venituri cu până la 40% mai mari decât chiria clasică",
        "Management complet - nu trebuie să te ocupi de nimic",
        "Transparență financiară totală",
        "Mentenanță preventivă inclusă",
      ],
      nearbyAttractions: "Atracții în Apropiere",
      investmentOpportunity: "Oportunitate de Investiție",
      notFound: "Complex negăsit",
      notFoundText: "Complexul pe care îl cauți nu există sau nu este disponibil.",
      backHome: "Înapoi Acasă",
    },
    en: {
      backToComplexes: "Back to Complexes",
      properties: "managed properties",
      features: "Facilities & Benefits",
      whyInvest: "Why Invest Here?",
      roi: "Estimated ROI",
      roiValue: "8.5% - 9.5%",
      occupancy: "Occupancy Rate",
      occupancyValue: "95%+",
      management: "Complete Management",
      managementValue: "24/7",
      ctaTitle: "Have a Property in",
      ctaSubtitle: "Request a free evaluation and find out how much you can earn from short-term rental management.",
      contactUs: "Contact Us",
      whatsapp: "WhatsApp",
      freeEvaluation: "Free Evaluation",
      localSeoTitle: "Short-Term Rental Management",
      localSeoText: "RealTrust offers complete short-term rental management services for properties in",
      benefits: [
        "Income up to 40% higher than traditional rent",
        "Complete management - you don't have to do anything",
        "Total financial transparency",
        "Preventive maintenance included",
      ],
      nearbyAttractions: "Nearby Attractions",
      investmentOpportunity: "Investment Opportunity",
      notFound: "Complex not found",
      notFoundText: "The complex you are looking for does not exist or is not available.",
      backHome: "Back Home",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.ro;

  useEffect(() => {
    const fetchComplex = async () => {
      if (!slug) return;

      setIsLoading(true);
      try {
        const { data: complexData, error: complexError } = await supabase
          .from("residential_complexes")
          .select("*")
          .eq("slug", slug)
          .eq("is_active", true)
          .single();

        if (complexError || !complexData) {
          setNotFound(true);
          return;
        }

        setComplex(complexData);

        // Fetch images
        const { data: imagesData } = await supabase
          .from("complex_images")
          .select("*")
          .eq("complex_id", complexData.id)
          .order("display_order", { ascending: true });

        if (imagesData) {
          setImages(imagesData);
        }
      } catch (error) {
        console.error("Error fetching complex:", error);
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchComplex();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !complex) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center px-6">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">
              {t.notFound}
            </h1>
            <p className="text-muted-foreground mb-6">{t.notFoundText}</p>
            <Button asChild>
              <Link to="/">{t.backHome}</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const metaTitle = language === "en" ? complex.meta_title_en : complex.meta_title_ro;
  const metaDescription = language === "en" ? complex.meta_description_en : complex.meta_description_ro;
  const description = language === "en" ? complex.description_en : complex.description_ro;
  const features = language === "en" ? complex.features_en : complex.features;
  const pageUrl = `https://realtrust.ro/complex/${complex.slug}`;

  // Generate LocalBusiness + Apartment JSON-LD for rich snippets
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": `RealTrust - Management ${complex.name}`,
      "description": description,
      "image": images[0]?.image_path || "https://realtrust.ro/og-image.jpg",
      "url": pageUrl,
      "telephone": "+40723154520",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Timișoara",
        "addressRegion": "Timiș",
        "addressCountry": "RO",
        "streetAddress": complex.location,
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": complex.latitude,
        "longitude": complex.longitude,
      },
      "priceRange": "$$",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "reviewCount": "150",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ApartmentComplex",
      "name": complex.name,
      "description": description,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Timișoara",
        "addressRegion": "Timiș",
        "addressCountry": "RO",
      },
      "numberOfAvailableAccommodationUnits": complex.property_count,
      "amenityFeature": features?.map((f) => ({
        "@type": "LocationFeatureSpecification",
        "name": f,
      })),
    },
  ];

  // Breadcrumb for SEO
  const breadcrumbItems = [
    { name: "Acasă", url: "https://realtrust.ro" },
    { name: "Complexe Rezidențiale", url: "https://realtrust.ro/complexe" },
    { name: complex.name, url: pageUrl },
  ];

  return (
    <>
      <SEOHead
        title={metaTitle}
        description={metaDescription}
        url={pageUrl}
        image={images[0]?.image_path}
        type="website"
        jsonLd={jsonLd}
        breadcrumbItems={breadcrumbItems}
      />

      <Header />

      <main className="min-h-screen bg-background">
        {/* Back Navigation */}
        <div className="container mx-auto px-6 pt-24 pb-4">
          <Link
            to="/complexe"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToComplexes}
          </Link>
        </div>

        {/* Hero Section */}
        <section className="container mx-auto px-6 pb-12">
          <div className="grid lg:grid-cols-2 gap-8 items-start">
            {/* Image Gallery */}
            <div className="relative rounded-2xl overflow-hidden bg-muted">
              {images.length > 0 ? (
                <Carousel opts={{ loop: true }} className="w-full">
                  <CarouselContent>
                    {images.map((image, idx) => (
                      <CarouselItem key={image.id}>
                        <img
                          src={image.image_path}
                          alt={`${complex.name} - ${idx + 1}`}
                          className="w-full h-[400px] object-cover"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="left-4" />
                  <CarouselNext className="right-4" />
                </Carousel>
              ) : (
                <div className="w-full h-[400px] flex items-center justify-center">
                  <Building2 className="w-16 h-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            {/* Complex Info */}
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="secondary" className="text-xs">
                    <MapPin className="w-3 h-3 mr-1" />
                    {complex.neighborhood}
                  </Badge>
                  <Badge className="bg-primary/10 text-primary text-xs">
                    <Home className="w-3 h-3 mr-1" />
                    {complex.property_count} {t.properties}
                  </Badge>
                </div>

                <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
                  {complex.name}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {complex.location}
                </p>
              </div>

              <p className="text-foreground/80 leading-relaxed">{description}</p>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">{t.roi}</p>
                  <p className="font-semibold text-foreground">{t.roiValue}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <Star className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">{t.occupancy}</p>
                  <p className="font-semibold text-foreground">{t.occupancyValue}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">{t.management}</p>
                  <p className="font-semibold text-foreground">{t.managementValue}</p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild size="lg" className="flex-1">
                  <a href="tel:+40723154520">
                    <Phone className="w-4 h-4 mr-2" />
                    {t.contactUs}
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="flex-1">
                  <a
                    href={`https://wa.me/40723154520?text=Bună! Sunt interesat de serviciile de management pentru o proprietate în ${complex.name}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {t.whatsapp}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        {features && features.length > 0 && (
          <section className="py-12 bg-muted/30">
            <div className="container mx-auto px-6">
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-8">
                {t.features}
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {features.map((feature, idx) => (
                  <div
                    key={idx}
                    className="bg-card rounded-xl p-4 border border-border flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Why Invest Section - Local SEO Content */}
        <section className="py-16">
          <div className="container mx-auto px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-serif font-semibold text-foreground mb-6">
                {t.whyInvest}
              </h2>
              
              <div className="prose prose-lg max-w-none text-foreground/80">
                <p className="mb-6">
                  <strong>{t.localSeoTitle} {complex.name} Timișoara</strong> – {t.localSeoText} <strong>{complex.name}</strong>, 
                  în zona <strong>{complex.neighborhood}</strong> din Timișoara.
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {t.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground/80">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Lead Capture Form */}
        <section className="py-16 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="container mx-auto px-6">
            <div className="max-w-2xl mx-auto text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-4">
                {t.ctaTitle} {complex.name}?
              </h2>
              <p className="text-muted-foreground">{t.ctaSubtitle}</p>
            </div>
            <div className="max-w-xl mx-auto">
              <QuickLeadForm />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default ComplexDetail;
