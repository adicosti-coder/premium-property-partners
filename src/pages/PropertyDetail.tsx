import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Star, Users, BedDouble, Bath, Maximize2, 
  Wifi, Car, Key, Calendar, Clock, Check, X, ChevronLeft, ChevronRight,
  ExternalLink, Share2, Heart, Loader2, Play, Pause, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPropertyBySlug } from "@/data/properties";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StickyPropertyCTA from "@/components/StickyPropertyCTA";
import SEOHead from "@/components/SEOHead";
import OptimizedImage from "@/components/OptimizedImage";

const BookingForm = lazy(() => import("@/components/BookingForm"));
const StayCalculator = lazy(() => import("@/components/StayCalculator"));
const AvailabilityCalendar = lazy(() => import("@/components/AvailabilityCalendar"));
const PriceCompareWidget = lazy(() => import("@/components/PriceCompareWidget"));
const SmartFeaturesBadge = lazy(() => import("@/components/SmartFeaturesBadge"));
const PropertyReviews = lazy(() => import("@/components/PropertyReviews"));
const GuestReviewForm = lazy(() => import("@/components/GuestReviewForm"));
const InvestorGuideButton = lazy(() => import("@/components/InvestorGuideButton"));
const PropertyFAQ = lazy(() => import("@/components/PropertyFAQ"));
const InvestmentEngineV34 = lazy(() => import("@/components/InvestmentEngineV34"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useImagePreload } from "@/hooks/useImagePreload";
import { usePropertyViewTracking } from "@/hooks/usePropertyViewTracking";
import { supabase } from "@/lib/supabaseClient";
import { 
  generatePropertyPageSchemas, 
  generateBreadcrumbSchema,
  type PropertySchemaData 
} from "@/utils/schemaGenerators";

// Extindem interfața pentru a include noile câmpuri de investiție
interface DbPropertyData {
  id: string;
  name: string;
  location?: string;
  description_ro?: string;
  description_en?: string;
  tag?: string;
  image_path?: string | null;
  capital_necesar?: number | null;
  estimated_revenue?: string | null;
  roi_percentage?: string | null;
  listing_type?: string | null;
  status_operativ?: string;
  property_code?: string | null;
}

// Helper to check if a string is a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const PropertyDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const isDbProperty = isUUID(slug || "");
  const staticProperty = !isDbProperty ? getPropertyBySlug(slug || "") : undefined;
  const { toast } = useToast();
  const { t, language } = useLanguage();
  
  // State pentru proprietatea din DB
  const [dbProperty, setDbProperty] = useState<DbPropertyData | null>(null);
  const [isLoadingProperty, setIsLoadingProperty] = useState(isDbProperty);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [dbImages, setDbImages] = useState<any[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // Track property views
  usePropertyViewTracking(dbProperty?.id);

  // 1. Fetch Date din Supabase (inclusiv noile coloane)
  useEffect(() => {
    const fetchPropertyData = async () => {
      setIsLoadingImages(true);
      
      try {
        let propertyId: string | null = null;
        
        // If it's a UUID, fetch directly by ID
        if (isDbProperty && slug) {
          setIsLoadingProperty(true);
          const { data: dbProp } = await supabase
            .from("properties")
            .select("id, name, location, description_ro, description_en, tag, image_path, capital_necesar, estimated_revenue, roi_percentage, listing_type, status_operativ, property_code")
            .eq("id", slug)
            .maybeSingle();
          
          if (dbProp) {
            setDbProperty(dbProp);
            propertyId = dbProp.id;
          }
          setIsLoadingProperty(false);
        } else if (staticProperty) {
          // Static property - fetch additional data by name
          const { data: dbProp } = await supabase
            .from("properties")
            .select("id, name, location, description_ro, description_en, tag, image_path, capital_necesar, estimated_revenue, roi_percentage, listing_type, status_operativ, property_code")
            .eq("name", staticProperty.name)
            .maybeSingle();
          
          if (dbProp) {
            setDbProperty(dbProp);
            propertyId = dbProp.id;
          }
        }

        // Fetch images if we have a property ID
        if (propertyId) {
          const { data: images } = await supabase
            .from("property_images")
            .select("*")
            .eq("property_id", propertyId)
            .order("display_order", { ascending: true });
          if (images) setDbImages(images);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingImages(false);
      }
    };
    
    if (isDbProperty || staticProperty) {
      fetchPropertyData();
    }
  }, [slug, isDbProperty, staticProperty]);

  // Create unified property object
  const property = staticProperty || (dbProperty ? {
    id: 0, // DB properties use UUID in dbProperty.id
    slug: slug || "",
    name: dbProperty.name,
    location: dbProperty.location || "Timișoara",
    images: dbProperty.image_path ? [dbProperty.image_path.startsWith("http") ? dbProperty.image_path : `https://mvzssjyzbwccioqvhjpo.supabase.co/storage/v1/object/public/property-images/${dbProperty.image_path}`] : [],
    features: [],
    bookingUrl: "",
    description: dbProperty.description_ro || "",
    descriptionEn: dbProperty.description_en || "",
    longDescription: dbProperty.description_ro || "",
    longDescriptionEn: dbProperty.description_en || "",
    rating: 0,
    reviews: 0,
    capacity: 0,
    bedrooms: 0,
    bathrooms: 0,
    size: 0,
    pricePerNight: dbProperty.capital_necesar || 0,
    amenities: [],
    amenitiesEn: [],
    houseRules: [],
    houseRulesEn: [],
    checkInTime: "",
    checkOutTime: "",
    isActive: true,
  } : null);

  // 2. Funcție Trimitere către Make.com
  const handleSendInvestmentLead = async (email: string, name: string = "Client Site") => {
    if (!email) {
      toast({ title: "Eroare", description: "Te rugăm să introduci email-ul.", variant: "destructive" });
      return;
    }

    const webhookUrl = "https://hook.eu1.make.com/swcd8yafsc17xlrys9w2ivlfnhukay4p";

    const payload = {
      contents: {
        nume: name,
        email: email,
        mesaj: `Cerere plan management pentru: ${property?.name}`,
        proprietate: property?.name,
        roi_estimat: dbProperty?.roi_percentage || "9.4%",
        sursa: "Property Details Page"
      }
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast({ title: "Cerere trimisă!", description: "Vei primi ghidul de randament pe email în scurt timp." });
      } else {
        toast({ title: "Eroare la trimitere", description: "Te rugăm să încerci din nou.", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Eroare la trimitere", description: "Te rugăm să încerci din nou.", variant: "destructive" });
    }
  };

  // Logica de Galerie imagini
  const getPublicUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("property-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const galleryImages = dbImages.length > 0 
    ? dbImages.map(img => getPublicUrl(img.image_path))
    : property?.images || [];

  const nextImage = useCallback(() => {
    if (galleryImages.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const prevImage = useCallback(() => {
    if (galleryImages.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  // Show loading state for DB properties
  if (isLoadingProperty) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{language === 'ro' ? 'Se încarcă...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!property) return null;

  // Generate rich schema for this property
  const propertySchemas = [
    ...generatePropertyPageSchemas({
      name: property.name,
      slug: slug || "",
      description: language === 'ro' ? property.longDescription : (property.longDescriptionEn || property.longDescription),
      image: galleryImages[0] || "",
      images: galleryImages,
      location: property.location,
      pricePerNight: property.pricePerNight || 0,
      capacity: property.capacity || 2,
      bedrooms: property.bedrooms || 1,
      bathrooms: property.bathrooms || 1,
      size: property.size || 0,
      rating: staticProperty?.rating || 4.9,
      reviewCount: staticProperty?.reviews || 50,
      amenities: property.amenities || [],
    }),
    // AggregateRating standalone for Google rich results
    {
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      "name": property.name,
      "url": `https://realtrust.ro/proprietate/${slug}`,
      "image": galleryImages[0] || "",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": staticProperty?.rating?.toFixed(1) || "4.9",
        "reviewCount": staticProperty?.reviews || 50,
        "bestRating": "5",
        "worstRating": "1",
      },
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Timișoara",
        "addressRegion": "Timiș",
        "addressCountry": "RO",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEOHead 
        title={`${property.name} | RealTrust Timișoara`}
        description={language === 'ro' 
          ? `${property.name} - Cazare premium în ${property.location}, Timișoara. ${property.capacity} oaspeți, ${property.bedrooms} dormitoare. Rezervă direct!`
          : `${property.name} - Premium accommodation in ${property.location}, Timișoara. ${property.capacity} guests, ${property.bedrooms} bedrooms. Book direct!`}
        url={`https://realtrust.ro/proprietate/${slug}`}
        image={galleryImages[0] || undefined}
        type="product"
        productPrice={property.pricePerNight || undefined}
        productCurrency="EUR"
        jsonLd={propertySchemas}
      />
      <Header />
      
      <main className="pt-20">
        <div className="container mx-auto px-6 py-4">
          <Link to="/#portofoliu" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t.propertyDetail.backToPortfolio}
          </Link>
        </div>

        {/* Galerie - Rămâne neschimbată */}
        <div className="container mx-auto px-4 sm:px-6 mb-8">
           <div className="relative aspect-[16/9] lg:aspect-[21/9] rounded-2xl overflow-hidden cursor-pointer" onClick={() => setLightboxOpen(true)}>
             <OptimizedImage src={galleryImages[0]} alt={property.name} className="w-full h-full object-cover" priority={true} />
             <div className="absolute bottom-4 right-4"><Badge variant="secondary">{galleryImages.length} Foto</Badge></div>
           </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 pb-24 overflow-hidden">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8 min-w-0">
              
              {/* Header Info */}
              <div className="min-w-0">
                {dbProperty?.property_code && (
                  <Badge variant="secondary" className="font-mono text-sm bg-muted mb-2 inline-block">
                    {dbProperty.property_code}
                  </Badge>
                )}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold break-words">{property.name}</h1>
                <p className="text-muted-foreground flex items-center gap-1 min-w-0"><MapPin className="w-4 h-4 shrink-0" /> <span className="break-all truncate">{property.location}</span></p>
              </div>

              {/* SECȚIUNEA PREȚ SIMPLU - pentru închirieri */}
              {dbProperty?.listing_type === 'inchiriere' && dbProperty.capital_necesar && (
                <div className="bg-card border p-6 rounded-2xl">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                    {language === 'ro' ? 'Preț' : 'Price'}
                  </p>
                  <p className="text-3xl font-bold">€{dbProperty.capital_necesar.toLocaleString('ro-RO')}<span className="text-lg font-normal text-muted-foreground">/lună</span></p>
                </div>
              )}

              {/* SECȚIUNEA DE INVESTIȚIE - apare pentru DB properties când NU este închiriere */}
              {dbProperty && dbProperty.listing_type !== 'inchiriere' && (isDbProperty || dbProperty.status_operativ === 'investitie') && (dbProperty.estimated_revenue || dbProperty.roi_percentage || dbProperty.capital_necesar) && (
                <div className="bg-gradient-to-br from-primary/5 to-primary/15 border border-primary/20 p-5 sm:p-8 rounded-3xl shadow-sm border-l-4 border-l-primary overflow-hidden">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-serif font-bold">
                      {language === 'ro' ? 'Oportunitate de Investiție' : 'Investment Opportunity'}
                    </h2>
                  </div>
                  {(dbProperty.estimated_revenue || dbProperty.roi_percentage || dbProperty.capital_necesar) && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                      {dbProperty.capital_necesar && (
                        <div>
                          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                            {language === 'ro' ? 'Capital Necesar' : 'Required Capital'}
                          </p>
                          <p className="text-3xl font-bold">€{dbProperty.capital_necesar.toLocaleString('ro-RO')}</p>
                        </div>
                      )}
                      {dbProperty.estimated_revenue && (
                        <div>
                          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                            {language === 'ro' ? 'Venit Lunar Estimat' : 'Est. Monthly Revenue'}
                          </p>
                          <p className="text-3xl font-bold text-primary">€{dbProperty.estimated_revenue}</p>
                        </div>
                      )}
                      {dbProperty.roi_percentage && (
                        <div>
                          <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">
                            {language === 'ro' ? 'Randament (ROI)' : 'Annual Yield (ROI)'}
                          </p>
                          <p className="text-3xl font-bold text-primary">{dbProperty.roi_percentage}%</p>
                        </div>
                      )}
                    </div>
                  )}
                  <InvestorGuideButton fullWidth size="lg" className="py-7 text-lg rounded-2xl" />
                </div>
              )}

              {/* Detalii Standard - doar pentru proprietăți cu date complete */}
              {staticProperty && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-card rounded-2xl border">
                  <div className="flex flex-col items-center"><Users className="text-primary mb-1"/><span className="text-sm font-medium">{property.capacity} Oaspeți</span></div>
                  <div className="flex flex-col items-center"><BedDouble className="text-primary mb-1"/><span className="text-sm font-medium">{property.bedrooms} Dormitoare</span></div>
                  <div className="flex flex-col items-center"><Bath className="text-primary mb-1"/><span className="text-sm font-medium">{property.bathrooms} Băi</span></div>
                  <div className="flex flex-col items-center"><Maximize2 className="text-primary mb-1"/><span className="text-sm font-medium">{property.size} m²</span></div>
                </div>
              )}

              {property.longDescription && (
                <div>
                  <h2 className="text-2xl font-serif font-semibold mb-4">{t.propertyDetail.about}</h2>
                  <p className="text-muted-foreground leading-relaxed">{language === 'en' ? property.longDescriptionEn : property.longDescription}</p>
                </div>
              )}
              
              {/* Calculator Investiție + Card Vânzare Rapidă — ascuns pentru închirieri */}
              {!staticProperty && dbProperty?.listing_type !== 'inchiriere' && (
                <InvestmentEngineV34
                  propertyName={property.name}
                  propertyCode={dbProperty?.property_code}
                  defaultPrice={dbProperty?.capital_necesar || 120000}
                  defaultRent={dbProperty?.estimated_revenue ? parseInt(dbProperty.estimated_revenue) : 550}
                  hideRecommendations
                />
              )}

              {/* Recenzii oaspeți - doar pentru proprietăți de cazare, nu pentru vânzări/închirieri imobiliare */}
              {staticProperty && (
                <PropertyReviews propertyId={dbProperty?.id || ""} propertyName={property.name} />
              )}

              {/* FAQ Section with Schema.org markup */}
              <PropertyFAQ
                propertyName={property.name}
                location={property.location}
                capacity={staticProperty ? property.capacity : undefined}
                bedrooms={staticProperty ? property.bedrooms : undefined}
                pricePerNight={staticProperty ? property.pricePerNight : undefined}
                isInvestment={dbProperty?.listing_type !== 'inchiriere' && (isDbProperty || dbProperty?.status_operativ === 'investitie')}
              />
            </div>

            {/* Bara Laterală - Rezervări - doar pentru proprietăți cu date complete */}
            {staticProperty ? (
              <div className="lg:col-span-1 space-y-6">
                <PriceCompareWidget basePrice={property.pricePerNight} />
                <StayCalculator property={property as any} onBook={() => setBookingOpen(true)} />
                <AvailabilityCalendar propertyId={property.id} />
              </div>
            ) : (
              <div className="lg:col-span-1 space-y-6">
                {/* CTA pentru proprietăți de investiție */}
                <div className="bg-card rounded-2xl border p-6 space-y-4">
                  <h3 className="text-xl font-semibold">
                    {language === 'ro' ? 'Interesat?' : 'Interested?'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {language === 'ro' 
                      ? 'Contactează-ne pentru mai multe detalii despre această oportunitate de investiție.'
                      : 'Contact us for more details about this investment opportunity.'}
                  </p>
                  <Button 
                    variant="hero" 
                    className="w-full"
                    onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(`${language === "ro" ? "Bună ziua, sunt interesat de proprietatea" : "Hello, I'm interested in the property"} ${dbProperty?.property_code ? `[${dbProperty.property_code}]` : ""}: ${property.name}`)}`, '_blank')}
                  >
                    {language === 'ro' ? 'Contactează-ne' : 'Contact Us'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <Suspense fallback={null}>
      
      <Footer />
      <BookingForm isOpen={bookingOpen} onClose={() => setBookingOpen(false)} propertyName={property.name} />
      <GlobalConversionWidgets showExitIntent={false} />
      </Suspense>
    </div>
  );
};

export default PropertyDetail;
