import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Star, Users, BedDouble, Bath, Maximize2, 
  Wifi, Car, Key, Calendar, Clock, Check, X, ChevronLeft, ChevronRight,
  ExternalLink, Share2, Heart, Loader2, Play, Pause, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPropertyBySlug, getImageAlt } from "@/data/properties";
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
const PropertyProximity = lazy(() => import("@/components/PropertyProximity"));
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
  const { slug: paramSlug } = useParams<{ slug: string }>();
  const location = useLocation();
  // Support both /proprietate/:slug and top-level /:slug routes
  const slug = paramSlug || location.pathname.replace(/^\//, '');
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
  const [dbReviews, setDbReviews] = useState<any[]>([]);
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

        // Fetch images and reviews if we have a property ID
        if (propertyId) {
          const [imagesRes, reviewsRes] = await Promise.all([
            supabase
              .from("property_images")
              .select("*")
              .eq("property_id", propertyId)
              .order("display_order", { ascending: true }),
            supabase
              .from("property_reviews")
              .select("id, guest_name, rating, content, title, created_at")
              .eq("property_id", propertyId)
              .eq("is_published", true)
              .order("created_at", { ascending: false })
              .limit(10),
          ]);
          if (imagesRes.data) setDbImages(imagesRes.data);
          if (reviewsRes.data) setDbReviews(reviewsRes.data);
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

  // Generate rich schema for this property (with real reviews for Google rich snippets)
  const reviewSchemaItems = dbReviews.length > 0 ? dbReviews.slice(0, 5).map((r: any) => ({
    "@type": "Review" as const,
    "author": { "@type": "Person" as const, "name": r.guest_name },
    "datePublished": r.created_at?.split("T")[0],
    "reviewBody": r.content || r.title || "Experiență excelentă!",
    "reviewRating": {
      "@type": "Rating" as const,
      "ratingValue": Math.min(r.rating / 2, 5), // Convert 1-10 to 1-5 scale
      "bestRating": 5,
      "worstRating": 1,
    },
  })) : undefined;

  const avgRating = dbReviews.length > 0
    ? (dbReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / dbReviews.length / 2).toFixed(1)
    : staticProperty?.rating ? (staticProperty.rating / 2).toFixed(1) : "4.9";
  const reviewCount = dbReviews.length > 0 ? dbReviews.length : (staticProperty?.reviews || 50);

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
      rating: parseFloat(avgRating),
      reviewCount,
      amenities: property.amenities || [],
    }),
    // LodgingBusiness with AggregateRating + real reviews for Google rich snippets
    {
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      "name": property.name,
      "url": `https://www.realtrust.ro/proprietate/${slug}`,
      "image": galleryImages[0] || "",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": avgRating,
        "reviewCount": reviewCount,
        "bestRating": "5",
        "worstRating": "1",
      },
      ...(reviewSchemaItems && { "review": reviewSchemaItems }),
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
        url={`https://www.realtrust.ro/proprietate/${slug}`}
        image={galleryImages[0] || undefined}
        imageAlt={staticProperty ? getImageAlt(staticProperty, 0, language as 'ro' | 'en') : undefined}
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
             <OptimizedImage src={galleryImages[0]} alt={staticProperty ? getImageAlt(staticProperty, 0, language as 'ro' | 'en') : `${property.name} — cazare apartament regim hotelier ${property.location}, Timișoara`} className="w-full h-full object-cover" priority={true} />
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
                <p className="text-muted-foreground flex items-center gap-1 min-w-0 flex-wrap">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="break-all truncate">{property.location}</span>
                  <span className="text-muted-foreground/50">·</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.name + ', ' + property.location + ', Timișoara')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {language === 'ro' ? 'Poziția pe hartă' : 'View on map'}
                  </a>
                </p>
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
                            {language === 'ro' ? 'Preț Vânzare' : 'Sale Price'}
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

              {/* Proximity List — walking/driving distances */}
              <PropertyProximity propertySlug={slug || ""} />

              {/* Neighborhood Discovery — Google Maps embed */}
              <div className="space-y-4">
                <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  {language === 'ro' ? 'Explorează Zona' : 'Explore the Area'}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {language === 'ro'
                    ? 'Descoperă restaurante, magazine, parcuri și atracții în apropierea apartamentului.'
                    : 'Discover restaurants, shops, parks and attractions near the apartment.'}
                </p>
                <div className="rounded-2xl overflow-hidden border border-border shadow-sm" style={{ minHeight: '600px', height: '600px' }}>
                  <iframe
                    src="https://storage.googleapis.com/maps-solutions-b1w25ppmon/neighborhood-discovery/1b03/neighborhood-discovery.html"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    title={language === 'ro' ? 'Hartă explorare zonă' : 'Neighborhood exploration map'}
                  />
                </div>
              </div>

              {/* Comparație Prețuri, Calculator Sejur, Disponibilitate — inline după Proximitate */}
              {staticProperty && (
                <div className="space-y-6">
                  <PriceCompareWidget basePrice={property.pricePerNight} />
                  <StayCalculator property={property as any} onBook={() => setBookingOpen(true)} />
                  <AvailabilityCalendar propertyId={property.id} />
                </div>
              )}

              {/* Recenzii oaspeți - pentru toate proprietățile cu ID */}
              {dbProperty?.id && (
                <PropertyReviews propertyId={dbProperty.id} propertyName={property.name} />
              )}

              {/* FAQ Section with Schema.org markup */}
              <PropertyFAQ
                propertyName={property.name}
                location={property.location}
                capacity={staticProperty ? property.capacity : undefined}
                bedrooms={staticProperty ? property.bedrooms : undefined}
                pricePerNight={staticProperty ? property.pricePerNight : undefined}
                isInvestment={dbProperty?.listing_type !== 'inchiriere' && (isDbProperty || dbProperty?.status_operativ === 'investitie')}
                listingType={dbProperty?.listing_type}
              />
            </div>

            {/* Bara Laterală — CTA & Contact */}
            <div className="lg:col-span-1 space-y-6">
              {staticProperty ? (
                <div className="bg-card rounded-2xl border p-6 space-y-4 sticky top-24">
                  <h3 className="text-xl font-semibold">
                    {language === 'ro' ? 'Rezervă Direct & Economisește' : 'Book Direct & Save'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {language === 'ro' 
                      ? `Rezervă direct pe site-ul nostru și beneficiezi de cel mai bun preț garantat pentru ${property.name}.`
                      : `Book directly on our website and get the best guaranteed price for ${property.name}.`}
                  </p>
                  <Button 
                    variant="hero" 
                    className="w-full"
                    onClick={() => setBookingOpen(true)}
                  >
                    {language === 'ro' ? 'Rezervă Acum' : 'Book Now'}
                  </Button>
                  {property.bookingUrl && (
                    <a
                      href={property.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      {language === 'ro' ? 'Vezi și pe Pynbooking →' : 'Also on Pynbooking →'}
                    </a>
                  )}
                </div>
              ) : (
                <div className="bg-card rounded-2xl border p-6 space-y-4 sticky top-24">
                  <h3 className="text-xl font-semibold">
                    {language === 'ro' ? 'Interesat?' : 'Interested?'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {language === 'ro' 
                      ? 'Contactează-ne pentru mai multe detalii despre această oportunitate.'
                      : 'Contact us for more details about this opportunity.'}
                  </p>
                  <Button 
                    variant="hero" 
                    className="w-full"
                    onClick={() => window.open(`https://wa.me/40723154520?text=${encodeURIComponent(`${language === "ro" ? "Bună ziua, sunt interesat de proprietatea" : "Hello, I'm interested in the property"} ${dbProperty?.property_code ? `[${dbProperty.property_code}]` : ""}: ${property.name}`)}`, '_blank')}
                  >
                    {language === 'ro' ? 'Contactează-ne' : 'Contact Us'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Investor Box */}
        <section className="py-12 bg-muted/40 border-t border-border">
          <div className="container mx-auto px-6">
            <div className="max-w-3xl mx-auto bg-card border border-primary/20 rounded-2xl p-6 sm:p-8 text-center shadow-sm">
              <div className="flex items-center justify-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-serif font-semibold text-foreground">
                  {language === 'ro' ? 'Îți place acest apartament?' : 'Do you like this apartment?'}
                </h3>
              </div>
              <p className="text-foreground/80 leading-relaxed mb-4">
                {language === 'ro'
                  ? <>ApArt Hotel by RealTrust administrează proprietăți cu randament de <strong className="text-primary">9%+</strong>. Află cum te putem ajuta cu <Link to="/pentru-proprietari" className="text-primary hover:underline font-medium">administrare regim hotelier Timișoara</Link> sau vezi ofertele noastre de <Link to="/imobiliare" className="text-primary hover:underline font-medium">vânzări apartamente Timișoara</Link>.</>
                  : <>ApArt Hotel by RealTrust manages properties with <strong className="text-primary">9%+</strong> returns. Find out how we can help with <Link to="/pentru-proprietari" className="text-primary hover:underline font-medium">short-term rental management in Timișoara</Link> or browse our <Link to="/imobiliare" className="text-primary hover:underline font-medium">apartments for sale in Timișoara</Link>.</>
                }
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="default" size="sm">
                  <Link to="/pentru-proprietari">
                    {language === 'ro' ? 'Administrare Proprietăți' : 'Property Management'}
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/imobiliare">
                    {language === 'ro' ? 'Apartamente de Vânzare' : 'Apartments for Sale'}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
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
