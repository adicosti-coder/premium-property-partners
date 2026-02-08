import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
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
      metaDescription: "Administrare profesională în regim hotelier pentru cele mai căutate complexe rezidențiale din Timișoara: Fructus Plaza, City of Mara, Ateneo, Ring, Vivalia și multe altele. ROI 9%+.",
      heroTitle: "Complexe Rezidențiale",
      heroTitleHighlight: "Timișoara",
      heroSubtitle: "Administrăm proprietăți în cele mai exclusiviste ansambluri rezidențiale din Timișoara. Descoperă complexul tău și află potențialul de venit.",
      properties: "proprietăți",
      viewDetails: "Vezi Detalii",
      neighborhoods: "Zone Acoperite",
      neighborhoodsList: ["Centru", "Nord", "Sud", "Est", "Vest", "Pădurea Verde"],
      statsTitle: "Rezultate Demonstrate",
      avgRoi: "ROI Mediu",
      avgRoiValue: "9.2%",
      occupancy: "Ocupare Medie",
      occupancyValue: "95%",
      totalProperties: "Proprietăți",
      totalPropertiesValue: "60+",
      localSeoTitle: "Management Regim Hotelier Timișoara",
      localSeoText: "RealTrust & ApArt Hotel oferă servicii complete de administrare în regim hotelier pentru proprietățile din cele mai căutate zone ale Timișoarei: Fructus Plaza, City of Mara, Ateneo, Ring, Vivalia, Nord-One, Monarch, Paltim, Denya Forest, Campeador, XCity Towers, Iris și multe altele. Lista se completează continuu cu noi ansambluri și complexe rezidențiale.",
    },
    en: {
      title: "Residential Complexes Timișoara | Short-Term Rental Management",
      metaDescription: "Professional short-term rental management for Timișoara's most sought-after residential complexes: Fructus Plaza, City of Mara, Ateneo, Ring, Vivalia and more. 9%+ ROI.",
      heroTitle: "Residential Complexes",
      heroTitleHighlight: "Timișoara",
      heroSubtitle: "We manage properties in Timișoara's most exclusive residential complexes. Discover your complex and find out your income potential.",
      properties: "properties",
      viewDetails: "View Details",
      neighborhoods: "Covered Areas",
      neighborhoodsList: ["Center", "North", "South", "East", "West", "Green Forest"],
      statsTitle: "Proven Results",
      avgRoi: "Average ROI",
      avgRoiValue: "9.2%",
      occupancy: "Avg Occupancy",
      occupancyValue: "95%",
      totalProperties: "Properties",
      totalPropertiesValue: "60+",
      localSeoTitle: "Short-Term Rental Management Timișoara",
      localSeoText: "RealTrust & ApArt Hotel offers complete short-term rental management services for properties in Timișoara's most sought-after residential complexes: Fructus Plaza, City of Mara, Ateneo, Ring, Vivalia, Nord-One, Monarch, Paltim, Denya Forest, Campeador, XCity Towers, Iris and many more. The list is continuously expanding with new residential ensembles and complexes.",
    },
  };

  const t = translations[language as keyof typeof translations] || translations.ro;

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
    { name: "Complexe Rezidențiale", url: "https://realtrust.ro/complexe" },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
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
  };

  return (
    <>
      <SEOHead
        title={t.title}
        description={t.metaDescription}
        url="https://realtrust.ro/complexe"
        jsonLd={jsonLd}
        breadcrumbItems={breadcrumbItems}
      />

      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="pt-32 pb-16 bg-gradient-to-br from-primary/5 via-background to-muted/30">
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

        {/* Stats Section */}
        <section className="py-12 border-b border-border">
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
        <section className="py-16">
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
                        <div className="absolute top-4 right-4">
                          <Badge className="bg-primary text-primary-foreground">
                            <Home className="w-3 h-3 mr-1" />
                            {complex.property_count} {t.properties}
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
                            <span className="font-medium">ROI 8.5%+</span>
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

        {/* Local SEO Content */}
        <section className="py-16 bg-muted/30">
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
      </main>

      <Footer />
    </>
  );
};

export default Complexe;
