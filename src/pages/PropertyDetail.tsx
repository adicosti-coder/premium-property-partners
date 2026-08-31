import { useEffect, useState, useCallback, useRef, lazy, Suspense, useMemo } from "react";

import { useParams, Link, useLocation } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Star, Users, BedDouble, Bath, Maximize2, 
  Wifi, Car, Key, Calendar, Clock, Check, X, ChevronLeft, ChevronRight,
  ExternalLink, Share2, Heart, Loader2, Play, Pause, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPropertyBySlug, getImageAlt, type Property } from "@/data/properties";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StickyPropertyCTA from "@/components/StickyPropertyCTA";
import SEOHead from "@/components/SEOHead";
import NotFound from "@/pages/NotFound";
import OptimizedImage from "@/components/OptimizedImage";
import PropertyImageLightbox from "@/components/PropertyImageLightbox";
import PinterestPinButton from "@/components/PinterestPinButton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useImageCaptions } from "@/hooks/useImageCaptions";
import { useListingDwellTracker } from "@/hooks/useListingDwellTracker";

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
const PropertyNeighborhoodMap = lazy(() => import("@/components/PropertyNeighborhoodMap"));
const InvestmentEngineV34 = lazy(() => import("@/components/InvestmentEngineV34"));
const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const PropertyAIScore = lazy(() => import("@/components/PropertyAIScore"));
const TheAdvisor = lazy(() => import("@/components/TheAdvisor"));
const NeighborhoodScore = lazy(() => import("@/components/NeighborhoodScore"));
const LiveActivityTracker = lazy(() => import("@/components/LiveActivityTracker"));
const SimilarProperties = lazy(() => import("@/components/SimilarProperties"));
const RelatedBlogGuides = lazy(() => import("@/components/RelatedBlogGuides"));
const PropertyPremiumSpecs = lazy(() => import("@/components/PropertyPremiumSpecs"));
import PropertyRequestCTA from "@/components/PropertyRequestCTA";
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
import { generatePropertySEO } from "@/utils/generatePropertySEO";
import { getDisplayLocation, resolvePropertyCoordinates, getPropertyPois } from "@/utils/propertyGeo";

// Extindem interfața pentru a include noile câmpuri de investiție
interface DbPropertyData {
  id: string;
  name: string;
  booking_url?: string | null;
  location?: string;
  description_ro?: string;
  description_en?: string;
  long_description_ro?: string | null;
  long_description_en?: string | null;
  tag?: string;
  image_path?: string | null;
  images?: string[] | null;
  image_alts?: string[] | null;
  capital_necesar?: number | null;
  estimated_revenue?: string | null;
  roi_percentage?: string | null;
  listing_type?: string | null;
  status_operativ?: string;
  property_code?: string | null;
  amenities?: string[];
  amenities_en?: string[];
  house_rules?: string[];
  house_rules_en?: string[];
  base_price_per_night?: number | null;
  booking_rating?: number | null;
  booking_review_count?: number | null;
  weekend_price_per_night?: number | null;
  // Specs de bază
  size?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  capacity?: number | null;
  floor?: string | null;
  year_built?: number | null;
  // Câmpuri premium noi
  balconies?: number | null;
  terrace_area?: number | null;
  has_storage?: boolean | null;
  has_cellar?: boolean | null;
  orientation?: string | null;
  view_type?: string | null;
  has_elevator?: boolean | null;
  intercom_type?: string | null;
  has_ac?: boolean | null;
  usable_area?: number | null;
  built_area?: number | null;
  land_area?: number | null;
  price_per_sqm?: number | null;
  annual_tax?: number | null;
  monthly_maintenance?: number | null;
  renovation_year?: number | null;
  property_condition?: string | null;
  total_building_floors?: number | null;
  apartments_in_building?: number | null;
  parking?: string | null;
  heating_type?: string | null;
  energy_class?: string | null;
  furnished?: string | null;
  construction_type?: string | null;
  compartimentare?: string | null;
  features?: string[];
  slug?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// Helper to check if a string is a UUID
const isUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

const stripYieldFromPropertyTitle = (title: string) => {
  return title
    .replace(/\s*[,|·\-–—]?\s*(Randament|Yield|ROI)\s*\+?\d+(?:[.,]\d+)?%?\+?\s*(Net)?\s*/gi, " ")
    .replace(/\s*[|·\-–—]\s*$/g, "")
    .replace(/\s+,/g, ",")
    .replace(/\s{2,}/g, " ")
    .trim();
};

const syncInvestmentCopyWithRoi = (text: string, roi?: string | null) => {
  if (!text || !roi) return text;

  return text
    .replace(
      /randament\s+net(?:\s+estimat)?\s+(?:de\s+)?(?:peste\s+|aproximativ\s+|circa\s+)?\d+(?:[.,]\d+)?%\+?/gi,
      `randament net estimat de ${roi}`
    )
    .replace(
      /\bROI\s*(?:net\s*)?(?:de\s+)?(?:peste\s+|aproximativ\s+|circa\s+)?\d+(?:[.,]\d+)?%\+?/gi,
      `ROI ${roi}`
    )
    .replace(/randament\s+\d+(?:[.,]\d+)?%\+?/gi, `randament ${roi}`);
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
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const directBookingUrl = dbProperty?.booking_url || staticProperty?.bookingUrl || "";
  // Static properties (src/data/properties.ts) are the guest apartments —
  // always regim hotelier ("cazare") even when there is no DB row yet.
  const normalizedListingType = ((dbProperty?.listing_type || (staticProperty ? "cazare" : "")).trim().toLowerCase());

  const openDirectBooking = useCallback(() => {
    if (directBookingUrl) {
      window.open(directBookingUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setBookingOpen(true);
  }, [directBookingUrl]);

  // Always reachable request form — saves the request in the database and
  // triggers the confirmation email, even when an external engine exists.
  const openBookingRequest = useCallback(() => setBookingOpen(true), []);

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
            .select("id, slug, name, booking_url, location, description_ro, description_en, long_description_ro, long_description_en, tag, image_path, capital_necesar, estimated_revenue, roi_percentage, listing_type, status_operativ, property_code, base_price_per_night, weekend_price_per_night, size, bedrooms, bathrooms, capacity, floor, year_built, balconies, terrace_area, has_storage, has_cellar, orientation, view_type, has_elevator, intercom_type, has_ac, usable_area, built_area, land_area, price_per_sqm, annual_tax, monthly_maintenance, renovation_year, property_condition, total_building_floors, apartments_in_building, parking, heating_type, energy_class, furnished, construction_type, compartimentare, features, amenities, amenities_en, house_rules, house_rules_en, latitude, longitude, images, image_alts")
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
            .select("id, slug, name, booking_url, location, description_ro, description_en, long_description_ro, long_description_en, tag, image_path, capital_necesar, estimated_revenue, roi_percentage, listing_type, status_operativ, property_code, base_price_per_night, weekend_price_per_night, size, bedrooms, bathrooms, capacity, floor, year_built, balconies, terrace_area, has_storage, has_cellar, orientation, view_type, has_elevator, intercom_type, has_ac, usable_area, built_area, land_area, price_per_sqm, annual_tax, monthly_maintenance, renovation_year, property_condition, total_building_floors, apartments_in_building, parking, heating_type, energy_class, furnished, construction_type, compartimentare, features, amenities, amenities_en, house_rules, house_rules_en, latitude, longitude, images, image_alts")
            .eq("name", staticProperty.name)
            .maybeSingle();
          
          if (dbProp) {
            setDbProperty(dbProp);
            propertyId = dbProp.id;
          }
        } else if (slug) {
          // Fallback: try to fetch by slug column in DB
          setIsLoadingProperty(true);
          const { data: dbProp } = await supabase
            .from("properties")
            .select("id, slug, name, booking_url, location, description_ro, description_en, long_description_ro, long_description_en, tag, image_path, capital_necesar, estimated_revenue, roi_percentage, listing_type, status_operativ, property_code, base_price_per_night, weekend_price_per_night, size, bedrooms, bathrooms, capacity, floor, year_built, balconies, terrace_area, has_storage, has_cellar, orientation, view_type, has_elevator, intercom_type, has_ac, usable_area, built_area, land_area, price_per_sqm, annual_tax, monthly_maintenance, renovation_year, property_condition, total_building_floors, apartments_in_building, parking, heating_type, energy_class, furnished, construction_type, compartimentare, features, amenities, amenities_en, house_rules, house_rules_en, latitude, longitude, images, image_alts")
            .eq("slug", slug)
            .maybeSingle();
          
          if (dbProp) {
            setDbProperty(dbProp);
            propertyId = dbProp.id;
          }
          setIsLoadingProperty(false);
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
              .rpc("get_public_property_reviews", { p_property_id: propertyId })
              .then((res: any) => ({
                data: (res.data || [])
                  .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
                  .slice(0, 10)
                  .map((r: any) => ({ id: r.id, guest_name: r.guest_name, rating: r.rating, content: r.content, title: r.title, created_at: r.created_at })),
                error: res.error,
              })),
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
    
    if (slug) {
      fetchPropertyData();
    }
  }, [slug, isDbProperty, staticProperty]);

  // Create unified property object
  const property = staticProperty || (dbProperty ? {
    id: 0, // DB properties use UUID in dbProperty.id
    slug: dbProperty.slug || slug || "",
    name: dbProperty.name,
    location: dbProperty.location || "Timișoara",
    images: (Array.isArray(dbProperty.images) && dbProperty.images.length > 0)
      ? dbProperty.images.map((u: string) => u && u.startsWith("http") ? u : `https://mvzssjyzbwccioqvhjpo.supabase.co/storage/v1/object/public/property-images/${u}`)
      : (dbProperty.image_path ? [dbProperty.image_path.startsWith("http") ? dbProperty.image_path : `https://mvzssjyzbwccioqvhjpo.supabase.co/storage/v1/object/public/property-images/${dbProperty.image_path}`] : []),
    features: [],
    bookingUrl: dbProperty.booking_url || "",
    description: dbProperty.description_ro || "",
    descriptionEn: dbProperty.description_en || "",
    longDescription: dbProperty.long_description_ro || dbProperty.description_ro || "",
    longDescriptionEn: dbProperty.long_description_en || dbProperty.description_en || "",
    rating: 0,
    reviews: 0,
    capacity: dbProperty.capacity || 0,
    bedrooms: dbProperty.bedrooms || 0,
    bathrooms: dbProperty.bathrooms || 0,
    size: dbProperty.size || 0,
    pricePerNight: dbProperty.capital_necesar || 0,
    amenities: dbProperty.amenities || [],
    amenitiesEn: dbProperty.amenities_en || [],
    houseRules: dbProperty.house_rules || [],
    houseRulesEn: dbProperty.house_rules_en || [],
    checkInTime: "",
    checkOutTime: "",
    isActive: true,
    latitude: dbProperty.latitude || null,
    longitude: dbProperty.longitude || null,
  } : null);

  // Track dwell time for 'lux' and 'gradina' tagged properties
  useListingDwellTracker({
    propertyId: dbProperty?.id,
    propertyTag: dbProperty?.tag,
    listingType: dbProperty?.listing_type ?? undefined,
    roiPercentage: dbProperty?.roi_percentage,
  });

  const resolvedCoordinates = property
    ? resolvePropertyCoordinates({
        slug: property.slug,
        name: property.name,
        location: dbProperty?.location || property.location,
        latitude: dbProperty?.latitude ?? (property as any).latitude ?? null,
        longitude: dbProperty?.longitude ?? (property as any).longitude ?? null,
      })
    : null;

  const displayLocation = property
    ? getDisplayLocation({
        slug: property.slug,
        name: property.name,
        location: dbProperty?.location || property.location,
        latitude: resolvedCoordinates?.[1] ?? null,
        longitude: resolvedCoordinates?.[0] ?? null,
      })
    : "";

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

  // AI image captions
  const imageCaptions = useImageCaptions(galleryImages, property?.name || "", language);

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

  // Property not found after loading → render 404 page (avoids "Redirect Error" / soft 404 in GSC)
  if (!property) {
    return <NotFound />;
  }

  const isInvestmentListing = normalizedListingType === "investitie" || normalizedListingType === "vanzare";
  const displayRoi = dbProperty?.roi_percentage
    ? (dbProperty.roi_percentage.includes("%") ? dbProperty.roi_percentage : `${dbProperty.roi_percentage}%`)
    : null;
  const displayName = isInvestmentListing ? stripYieldFromPropertyTitle(property.name) : property.name;
  const displayDescription = (() => {
    let baseDescription = language === 'en'
      ? (property.longDescriptionEn || property.descriptionEn || property.longDescription || property.description)
      : (property.longDescription || property.description);

    // Strip hotel regime / RealTrust collaboration marketing sections from inchiriere listings
    if (normalizedListingType === 'inchiriere' && baseDescription) {
      // Remove "🏨 Regim Hotelier" section and everything after it until next major section or end
      baseDescription = baseDescription.replace(/###?\s*🏨\s*Regim Hotelier[\s\S]*?(?=###?\s*📞|###?\s*🏠|###?\s*Contactează|$)/gi, '');
      // Remove "🤝 Avantajele Colaborării" section
      baseDescription = baseDescription.replace(/###?\s*🤝\s*Avantajele Colabor[ăa]rii[\s\S]*?(?=###?\s*📞|###?\s*🏠|###?\s*Contactează|$)/gi, '');
      // Remove "📞 Contactează-ne pentru Vizionare" that references hotel regime
      baseDescription = baseDescription.replace(/###?\s*📞?\s*Contactează-ne pentru Vizionare[\s\S]*?(?=###|$)/gi, '');
      // Remove sentences about "investiție" and "venit pasiv" that don't belong in rental
      baseDescription = baseDescription.replace(/Această investiție nu vizează doar o proprietate[^.]*\./g, '');
      baseDescription = baseDescription.replace(/[^.]*sursă de venit pasiv[^.]*\./g, '');
      // Clean up multiple blank lines
      baseDescription = baseDescription.replace(/\n{3,}/g, '\n\n').trim();
    }

    return isInvestmentListing
      ? syncInvestmentCopyWithRoi(baseDescription, displayRoi)
      : baseDescription;
  })();

  const propertyForLightbox: Property = staticProperty || {
    ...property,
    featuresEn: [],
    images: galleryImages,
    imageAlts: galleryImages.map((_, idx) => imageCaptions[idx] || `${property.name} – foto ${idx + 1}`),
    imageAltsEn: galleryImages.map((_, idx) => imageCaptions[idx] || `${property.name} – photo ${idx + 1}`),
  };

  const getDisplayCaption = (idx: number) => {
    if (imageCaptions[idx]) return imageCaptions[idx];
    if (staticProperty) return getImageAlt(staticProperty, idx, language as 'ro' | 'en');
    return `${property.name} – ${language === 'ro' ? `fotografie ${idx + 1}` : `photo ${idx + 1}`}`;
  };

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

  // FAQ items are now registered ONLY by PropertyFAQ component via useRegisterFAQs
  // Do NOT register here to avoid duplicate FAQPage schemas

  // Get nearby POIs for structured data
  const nearbyPoisForSchema = getPropertyPois({
    slug: property.slug,
    name: property.name,
    location: property.location,
    latitude: resolvedCoordinates?.[1],
    longitude: resolvedCoordinates?.[0],
  }).slice(0, 10).map((poi) => ({
    name: poi.name,
    nameEn: poi.nameEn,
    distanceMinutes: poi.minutes,
    mode: poi.mode,
    category: poi.category,
  }));

  // Facilități principale (RO) folosite în meta description + schema amenityFeature
  const amenityList: string[] = (property.amenities || []).map((a: any) =>
    typeof a === 'string' ? a : (a?.name || a?.label || '')
  ).filter(Boolean);

  const amenityHighlights = (() => {
    const haystack = `${amenityList.join(' ')} ${displayDescription || ''}`.toLowerCase();
    const picks: string[] = [];
    if (/parcare|parking|garaj/.test(haystack)) picks.push('parcare');
    if (/wi-?fi|internet/.test(haystack)) picks.push('Wi-Fi');
    if (/self check|check-?in|acces cu cod|keybox/.test(haystack)) picks.push('self check-in');
    return picks.length > 0 ? picks : ['parcare', 'Wi-Fi', 'self check-in'];
  })();


  const propertySchemas = [
    ...generatePropertyPageSchemas({
      name: displayName,
      slug: slug || "",
      description: displayDescription,
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
      latitude: resolvedCoordinates?.[1],
      longitude: resolvedCoordinates?.[0],
      floor: dbProperty?.floor,
      usableArea: dbProperty?.usable_area,
      yearBuilt: dbProperty?.year_built,
      hasElevator: dbProperty?.has_elevator,
      hasAc: dbProperty?.has_ac,
      parking: dbProperty?.parking,
      orientation: dbProperty?.orientation,
      energyClass: dbProperty?.energy_class,
      furnished: dbProperty?.furnished,
      balconies: dbProperty?.balconies,
      listingType: dbProperty?.listing_type,
      basePricePerNight: dbProperty?.base_price_per_night,
      weekendPricePerNight: dbProperty?.weekend_price_per_night,
      neighborhood: dbProperty?.location || property.location,
      nearbyPois: nearbyPoisForSchema,
      roiPercentage: dbProperty?.roi_percentage,
      capitalNecesar: dbProperty?.capital_necesar,
      estimatedRevenue: dbProperty?.estimated_revenue,
    }),
    // LodgingBusiness with AggregateRating + real reviews. Stable @id +
    // provider reference to the canonical RealEstateAgent so Google merges
    // entities across pages.
    {
      "@context": "https://schema.org",
      "@type": "LodgingBusiness",
      "@id": `https://realtrust.ro/proprietate/${slug}#lodgingbusiness`,
      "name": displayName,
      "url": `https://realtrust.ro/proprietate/${slug}`,
      "image": galleryImages[0] || "",
      "provider": { "@id": "https://realtrust.ro/#realestateagent" },
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
      ...(resolvedCoordinates && {
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": resolvedCoordinates[1],
          "longitude": resolvedCoordinates[0],
        },
      }),
      "description": (displayDescription || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 400),
      ...(amenityList.length > 0 && {
        "amenityFeature": amenityList.slice(0, 15).map((a) => ({
          "@type": "LocationFeatureSpecification",
          "name": a,
          "value": true,
        })),
      }),
      ...(property.pricePerNight ? { "priceRange": `€${property.pricePerNight}/noapte` } : {}),
    },

    // HotelRoom pentru unitățile de cazare în regim hotelier
    ...(normalizedListingType === 'cazare' ? [{
      "@context": "https://schema.org",
      "@type": "HotelRoom",
      "@id": `https://realtrust.ro/proprietate/${slug}#hotelroom`,
      "name": displayName,
      "url": `https://realtrust.ro/proprietate/${slug}`,
      "description": (displayDescription || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 400),
      ...(galleryImages[0] ? { "image": galleryImages[0] } : {}),
      "containedInPlace": { "@id": `https://realtrust.ro/proprietate/${slug}#lodgingbusiness` },
      ...(property.capacity ? {
        "occupancy": { "@type": "QuantitativeValue", "maxValue": property.capacity, "unitCode": "C62" },
      } : {}),
      ...(property.bedrooms ? { "numberOfRooms": property.bedrooms } : {}),
      ...(property.bathrooms ? { "numberOfBathroomsTotal": property.bathrooms } : {}),
      ...(property.size ? {
        "floorSize": { "@type": "QuantitativeValue", "value": property.size, "unitCode": "MTK" },
      } : {}),
      ...(amenityList.length > 0 && {
        "amenityFeature": amenityList.slice(0, 15).map((a) => ({
          "@type": "LocationFeatureSpecification",
          "name": a,
          "value": true,
        })),
      }),
      ...(property.pricePerNight ? {
        "offers": {
          "@type": "Offer",
          "price": property.pricePerNight,
          "priceCurrency": "EUR",
          "url": `https://realtrust.ro/proprietate/${slug}#disponibilitate`,
          "availability": "https://schema.org/InStock",
        },
      } : {}),
    }] : []),



    // RealEstateListing schema from generatePropertySEO utility
    ...(dbProperty ? generatePropertySEO({
      name: displayName,
      slug: slug || "",
      location: dbProperty.location || property.location,
      bedrooms: dbProperty.bedrooms ?? property.bedrooms,
      size: dbProperty.size ?? property.size,
      floor: dbProperty.floor,
      roi_percentage: dbProperty.roi_percentage,
      capital_necesar: dbProperty.capital_necesar,
      listing_type: dbProperty.listing_type,
      year_built: dbProperty.year_built,
      base_price_per_night: dbProperty.base_price_per_night,
      capacity: property.capacity,
      latitude: resolvedCoordinates?.[1],
      longitude: resolvedCoordinates?.[0],
      booking_rating: dbProperty.booking_rating,
      booking_review_count: dbProperty.booking_review_count,
    }).jsonLd : []),
  ];

  // FAQ items are registered by PropertyFAQ component only

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SEOHead 
        title={(() => {
          const roi = displayRoi;
          const lt = dbProperty?.listing_type?.toLowerCase();
          if ((lt === 'investitie' || lt === 'vanzare') && roi) {
            return `${displayName} | Randament ${roi} ROI — Investiție Timișoara`;
          }
          if (normalizedListingType === 'cazare') {
            return `${displayName} - Cazare Regim Hotelier Timișoara | RealTrust`;
          }
          return `${displayName} | RealTrust Timișoara`;
        })()}
        description={(() => {
          const roi = displayRoi;
          const capital = dbProperty?.capital_necesar;
          const lt = dbProperty?.listing_type?.toLowerCase();
          // Smart meta description: "Descoperă acest apartament în [Zonă]. Ideal pentru investiție cu ROI de [X]%."
          if ((lt === 'investitie' || lt === 'vanzare') && (roi || capital)) {
            const zone = property.location?.replace(/,?\s*(Timișoara|Timisoara)\s*/gi, '').trim() || 'Timișoara';
            const parts: string[] = [`Descoperă acest apartament în ${zone}, Timișoara.`];
            if (roi) parts.push(`Ideal pentru investiție cu ROI de ${roi}.`);
            if (capital) parts.push(`Capital necesar: €${capital.toLocaleString('ro-RO')}.`);
            parts.push('Vezi detalii și randament estimat.');
            return parts.join(' ').slice(0, 160);
          }
          // Cazare (regim hotelier): zonă exactă + facilități principale, sub 160 caractere
          if (normalizedListingType === 'cazare' && language === 'ro') {
            const zone = property.location?.replace(/,?\s*(Timișoara|Timisoara)\s*/gi, '').trim() || 'Timișoara';
            const amenityText = amenityHighlights.length > 0
              ? amenityHighlights.join(', ')
              : 'parcare, Wi-Fi, self check-in';
            const guests = property.capacity ? `${property.capacity} oaspeți. ` : '';
            const base = `Cazare regim hotelier în ${zone}, Timișoara. ${guests}${amenityText}. Rezervare directă, fără comision.`;
            return base.length > 158 ? base.slice(0, 155).trimEnd() + '…' : base;
          }
          const rawDesc = displayDescription;
          if (rawDesc && rawDesc.length > 0) {
            const clean = rawDesc.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            return clean.length > 150 ? clean.slice(0, 147) + '...' : clean;
          }
          return language === 'ro'
            ? `${displayName} în ${property.location}, Timișoara — ${property.capacity} oaspeți, ${property.bedrooms} dormitoare. Rezervare directă, fără comisioane suplimentare.`
            : `${displayName} in ${property.location}, Timișoara — ${property.capacity} guests, ${property.bedrooms} bedrooms. Book direct, no extra booking fees.`;
        })()}

        url={`https://realtrust.ro/proprietate/${slug}`}
        image={galleryImages[0] || undefined}
        imageAlt={(() => {
          const roi = displayRoi;
          const lt = dbProperty?.listing_type?.toLowerCase();
          if ((lt === 'investitie' || lt === 'vanzare') && roi) {
            return `${displayName} — investiție imobiliară Timișoara, randament ${roi} ROI, property management regim hotelier`;
          }
          return staticProperty ? getImageAlt(staticProperty, 0, language as 'ro' | 'en') : `${displayName} — cazare regim hotelier ${property.location}, Timișoara`;
        })()}
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

        {/* Galerie cu toate imaginile */}
        <div className="container mx-auto px-4 sm:px-6 mb-8">
          {/* Hero image */}
          <div className="relative group aspect-[16/9] lg:aspect-[21/9] rounded-2xl overflow-hidden cursor-pointer mb-3" onClick={() => { setCurrentImageIndex(0); setLightboxOpen(true); }}>
            <PinterestPinButton
              imageUrl={galleryImages[currentImageIndex] || galleryImages[0]}
              description={normalizedListingType === 'inchiriere' ? `${property.name} — apartament de închiriat Timișoara | RealTrust` : `${property.name} — investiție imobiliară Timișoara, randament regim hotelier, property management | RealTrust`}
            />
            <OptimizedImage src={galleryImages[currentImageIndex] || galleryImages[0]} alt={(dbProperty?.image_alts?.[currentImageIndex]) || (staticProperty ? getImageAlt(staticProperty, currentImageIndex, language as 'ro' | 'en') : normalizedListingType === 'inchiriere' ? `${property.name} — apartament de închiriat ${property.location}` : `${property.name} — investiție imobiliară Timișoara, cazare regim hotelier ${property.location}`)} className="w-full h-full object-cover" priority={true} />
            <div className="absolute bottom-4 right-4"><Badge variant="secondary">{galleryImages.length} Foto</Badge></div>
            {/* Navigation arrows on hero */}
            {galleryImages.length > 1 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); prevImage(); }} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-all z-10" aria-label="Previous"><ChevronLeft className="w-5 h-5" /></button>
                <button onClick={(e) => { e.stopPropagation(); nextImage(); }} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-background transition-all z-10" aria-label="Next"><ChevronRight className="w-5 h-5" /></button>
              </>
            )}
          </div>
          {/* Thumbnail strip */}
          {galleryImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {galleryImages.map((img, idx) => (
                <div key={idx} className="flex-shrink-0">
                  <button
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-20 h-14 sm:w-24 sm:h-16 rounded-lg overflow-hidden border-2 transition-all ${idx === currentImageIndex ? 'border-primary ring-2 ring-primary/30' : 'border-border opacity-70 hover:opacity-100'}`}
                    aria-label={`${language === 'ro' ? 'Fotografie' : 'Photo'} ${idx + 1}`}
                  >
                    <OptimizedImage src={img} alt={(dbProperty?.image_alts?.[idx]) || (staticProperty ? getImageAlt(staticProperty, idx, language as 'ro' | 'en') : normalizedListingType === 'inchiriere' ? `${property.name} — apartament de închiriat foto ${idx + 1}` : `${property.name} — investiție imobiliară Timișoara, randament regim hotelier foto ${idx + 1}`)} className="w-full h-full object-cover" />
                  </button>
                  <p className="text-[10px] text-muted-foreground text-center mt-1 max-w-20 sm:max-w-24 line-clamp-2 leading-tight">{getDisplayCaption(idx)}</p>
                </div>
              ))}
            </div>
          )}
          {/* Caption for currently selected image */}
          <p className="text-xs text-muted-foreground italic text-center mt-1">{getDisplayCaption(currentImageIndex)}</p>
        </div>

        {/* ═══ HEADER — Titlu, Score, Locație (PRIMA SECȚIUNE după galerie) ═══ */}
        <div className="container mx-auto px-4 sm:px-6 mb-8">
          <div className="min-w-0">
            {dbProperty?.property_code && (
              <Badge variant="secondary" className="font-mono text-sm bg-muted mb-2 inline-block">
                {dbProperty.property_code}
              </Badge>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold break-words">{displayName}</h1>

            {normalizedListingType === 'cazare' && (
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Button variant="hero" className="w-full sm:w-auto" onClick={openDirectBooking}>
                  {language === 'ro' ? 'Rezervă direct' : 'Book direct'}
                </Button>
                <Button variant="outline" className="w-full sm:w-auto" onClick={openBookingRequest}>
                  {language === 'ro' ? 'Solicită rezervare' : 'Request booking'}
                </Button>
                <Button asChild variant="ghost" className="w-full sm:w-auto">
                  <a href="#disponibilitate">
                    {language === 'ro' ? 'Verifică disponibilitatea' : 'Check availability'}
                  </a>
                </Button>
              </div>
            )}



            {/* ═══ PREȚ PROMINENT ═══ */}
            {(() => {
              const capital = dbProperty?.capital_necesar;
              const nightlyPrice = dbProperty?.base_price_per_night ?? (staticProperty as any)?.price;
              const weekendPrice = dbProperty?.weekend_price_per_night;
              const roi = displayRoi;

              if (isInvestmentListing && capital) {
                return (
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="text-2xl sm:text-3xl font-bold text-primary">
                      €{capital.toLocaleString('ro-RO')}
                    </span>
                    {roi && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-sm font-semibold px-3 py-1">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        ROI {roi}
                      </Badge>
                    )}
                  </div>
                );
              }

              if (nightlyPrice) {
                const isRental = normalizedListingType === 'inchiriere';
                const isSale = normalizedListingType === 'vanzare';
                const priceLabel = isRental
                  ? (language === 'ro' ? '/lună' : '/month')
                  : isSale
                    ? ''
                    : (language === 'ro' ? '/noapte' : '/night');
                return (
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="text-2xl sm:text-3xl font-bold text-primary">
                      €{isRental || isSale ? nightlyPrice.toLocaleString('ro-RO') : nightlyPrice}
                      {priceLabel && (
                        <span className="text-base font-normal text-muted-foreground">
                          {priceLabel}
                        </span>
                      )}
                    </span>
                    {!isRental && !isSale && weekendPrice && weekendPrice !== nightlyPrice && (
                      <span className="text-sm text-muted-foreground">
                        ({language === 'ro' ? 'weekend' : 'weekend'}: €{weekendPrice}/{language === 'ro' ? 'noapte' : 'night'})
                      </span>
                    )}
                  </div>
                );
              }

              return null;
            })()}

            <Suspense fallback={null}>
              <PropertyAIScore
                propertyName={property.name}
                propertySlug={property.slug}
                location={property.location}
                latitude={resolvedCoordinates?.[1] ?? null}
                longitude={resolvedCoordinates?.[0] ?? null}
                listingType={normalizedListingType}
                roi={dbProperty?.roi_percentage}
                basePrice={dbProperty?.base_price_per_night ?? null}
                bookingRating={dbProperty?.booking_rating ?? null}
                reviewCount={dbProperty?.booking_review_count ?? null}
                bedrooms={property.bedrooms}
                capacity={property.capacity}
                amenities={(property as any).amenities ?? null}
                size={(property as any).size ?? null}
                tag={(property as any).tag ?? undefined}
                className="my-2"
              />
            </Suspense>
            <p className="text-muted-foreground flex items-center gap-1 min-w-0 flex-wrap">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="break-all truncate">{displayLocation}</span>
              <span className="text-muted-foreground/50">·</span>
              <a
                href={resolvedCoordinates
                  ? `https://www.google.com/maps/search/?api=1&query=${resolvedCoordinates[1]},${resolvedCoordinates[0]}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.name + ', ' + displayLocation)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline text-sm font-medium whitespace-nowrap"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {language === 'ro' ? 'Poziția pe hartă' : 'View on map'}
              </a>
            </p>
          </div>

          {/* Live Activity */}
          <Suspense fallback={null}>
            <LiveActivityTracker propertyId={dbProperty?.id} />
          </Suspense>
        </div>

        <div className="container mx-auto px-4 sm:px-6 pb-24 overflow-hidden">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8 min-w-0">

              {/* ═══════════════════════════════════════════════════════
                  1. SCOR CARTIER — Validare vizuală rapidă
                  ═══════════════════════════════════════════════════════ */}
              <Suspense fallback={null}>
                <NeighborhoodScore
                  location={property.location}
                  propertySlug={property.slug}
                  propertyName={property.name}
                  latitude={resolvedCoordinates?.[1] ?? null}
                  longitude={resolvedCoordinates?.[0] ?? null}
                />
              </Suspense>

              {/* ═══════════════════════════════════════════════════════
                  2. SPECIFICAȚII PROPRIETATE — Ce este proprietatea
                  ═══════════════════════════════════════════════════════ */}

              {/* Specificații Premium — pentru toate proprietățile din DB */}
              {dbProperty && (
                <Suspense fallback={null}>
                  <PropertyPremiumSpecs specs={dbProperty} />
                </Suspense>
              )}

              {/* Detalii Standard - doar pentru proprietăți statice fără date DB */}
              {staticProperty && !dbProperty && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-card rounded-2xl border">
                  <div className="flex flex-col items-center"><Users className="text-primary mb-1"/><span className="text-sm font-medium">{property.capacity} {language === 'ro' ? 'Oaspeți' : 'Guests'}</span></div>
                  <div className="flex flex-col items-center"><BedDouble className="text-primary mb-1"/><span className="text-sm font-medium">{property.bedrooms} {language === 'ro' ? 'Dormitoare' : 'Bedrooms'}</span></div>
                  <div className="flex flex-col items-center"><Bath className="text-primary mb-1"/><span className="text-sm font-medium">{property.bathrooms} {language === 'ro' ? 'Băi' : 'Bathrooms'}</span></div>
                  <div className="flex flex-col items-center"><Maximize2 className="text-primary mb-1"/><span className="text-sm font-medium">{property.size} m²</span></div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  3. DESPRE PROPRIETATE — Descriere detaliată
                  ═══════════════════════════════════════════════════════ */}
              {property.longDescription && (
                <div>
                  <h2 className="text-2xl font-serif font-semibold mb-4">{t.propertyDetail.about}</h2>
                  <div className="prose prose-sm sm:prose-base max-w-none text-muted-foreground leading-relaxed prose-headings:text-foreground prose-strong:text-foreground prose-ul:my-3 prose-li:my-1">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayDescription}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  3.5 INVESTIȚIE LA CHEIE — Beneficii administrare RealTrust
                  ═══════════════════════════════════════════════════════ */}
              {(normalizedListingType === 'investitie' || normalizedListingType === 'cazare') && (
                <div className="bg-gradient-to-br from-amber-500/5 to-primary/5 border border-amber-500/20 p-5 sm:p-6 rounded-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">🔑</span>
                    <h2 className="text-lg sm:text-xl font-serif font-bold">
                      {language === 'ro' ? 'Investiție la Cheie — Administrare RealTrust' : 'Turnkey Investment — RealTrust Management'}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {language === 'ro'
                      ? 'Această proprietate poate beneficia de administrare completă în regim hotelier. Tu investești, noi ne ocupăm de tot.'
                      : 'This property benefits from complete short-term rental management. You invest, we handle everything.'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(language === 'ro' ? [
                      { icon: '🧹', title: 'Curățenie Profesională', desc: 'După fiecare sejur' },
                      { icon: '🔧', title: 'Mentenanță Non-Stop', desc: 'Intervenții rapide 24/7' },
                      { icon: '💬', title: 'Guest Support 24/7', desc: 'Comunicare cu oaspeții' },
                      { icon: '📊', title: 'Raportare Lunară', desc: 'Transparență totală' },
                      { icon: '📈', title: 'Dynamic Pricing', desc: 'Prețuri optimizate AI' },
                      { icon: '🛡️', title: 'Asigurare 3M EUR', desc: 'Proprietate protejată' },
                    ] : [
                      { icon: '🧹', title: 'Professional Cleaning', desc: 'After every stay' },
                      { icon: '🔧', title: '24/7 Maintenance', desc: 'Rapid interventions' },
                      { icon: '💬', title: '24/7 Guest Support', desc: 'Full guest communication' },
                      { icon: '📊', title: 'Monthly Reports', desc: 'Full transparency' },
                      { icon: '📈', title: 'Dynamic Pricing', desc: 'AI-optimized rates' },
                      { icon: '🛡️', title: '€3M Insurance', desc: 'Property protected' },
                    ]).map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-base shrink-0">{item.icon}</span>
                        <div>
                          <p className="font-semibold text-foreground text-xs">{item.title}</p>
                          <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  4. THE ADVISOR — Analiză AI (după ce utilizatorul cunoaște baza)
                  ═══════════════════════════════════════════════════════ */}
              <Suspense fallback={null}>
                <TheAdvisor
                  propertyName={property.name}
                  propertySlug={property.slug}
                  location={property.location}
                  size={dbProperty?.size || property.size}
                  bedrooms={property.bedrooms}
                  bathrooms={property.bathrooms}
                  capacity={property.capacity}
                  floor={dbProperty?.floor}
                  pricePerNight={dbProperty?.base_price_per_night || property.pricePerNight}
                  amenities={property.amenities}
                  listingType={dbProperty?.listing_type}
                  yearBuilt={dbProperty?.year_built}
                  energyClass={dbProperty?.energy_class}
                  roi={dbProperty?.roi_percentage}
                  expertInsightOverride={language === "en" ? (dbProperty as any)?.expert_insight_en : (dbProperty as any)?.expert_insight_ro}
                />
              </Suspense>

              {/* ═══════════════════════════════════════════════════════
                  5. LOCAȚIE — Proximitate & Hartă
                  ═══════════════════════════════════════════════════════ */}
              <PropertyProximity
                propertySlug={property.slug}
                propertyName={property.name}
                propertyLocation={property.location}
                propertyLatitude={resolvedCoordinates?.[1] ?? null}
                propertyLongitude={resolvedCoordinates?.[0] ?? null}
              />

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
                <PropertyNeighborhoodMap propertySlug={property.slug} propertyName={property.name} propertyLocation={property.location} propertyLatitude={resolvedCoordinates?.[1] ?? null} propertyLongitude={resolvedCoordinates?.[0] ?? null} />
              </div>

              {/* ═══════════════════════════════════════════════════════
                  4. DISPONIBILITATE & PREȚURI (esențial pentru rezervări)
                  ═══════════════════════════════════════════════════════ */}
              {staticProperty && (
                <div id="disponibilitate" className="space-y-6 scroll-mt-24">
                  <h2 className="text-2xl font-serif font-semibold">
                    {language === 'ro' ? 'Verifică disponibilitatea și rezervă direct' : 'Check availability & book direct'}
                  </h2>
                  <PriceCompareWidget basePrice={property.pricePerNight} />
                  <StayCalculator property={property as any} onBook={openDirectBooking} />
                  <AvailabilityCalendar propertyId={property.id} propertySlug={property.slug} bookingUrl={property.bookingUrl} />
                  <div className="bg-card border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      {language === 'ro'
                        ? 'Cel mai bun preț îl obții rezervând direct, fără comision de intermediere.'
                        : 'Get the best rate by booking direct, with no intermediary fee.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <Button variant="hero" className="w-full sm:w-auto" onClick={openDirectBooking}>
                        {language === 'ro' ? 'Rezervă direct' : 'Book direct'}
                      </Button>
                      <Button variant="outline" className="w-full sm:w-auto" onClick={openBookingRequest}>
                        {language === 'ro' ? 'Solicită rezervare' : 'Request booking'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}


              {/* SECȚIUNEA PREȚ SIMPLU - pentru închirieri */}
              {dbProperty?.listing_type === 'inchiriere' && dbProperty.capital_necesar && (
                <div className="bg-card border p-6 rounded-2xl">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-2">
                    {language === 'ro' ? 'Preț' : 'Price'}
                  </p>
                  <p className="text-3xl font-bold">€{dbProperty.capital_necesar.toLocaleString('ro-RO')}<span className="text-lg font-normal text-muted-foreground">/lună</span></p>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════
                  5. SOCIAL PROOF — Recenzii & FAQ
                  ═══════════════════════════════════════════════════════ */}
              {dbProperty?.id && normalizedListingType === 'cazare' && (
                <PropertyReviews propertyId={dbProperty.id} propertyName={property.name} />
              )}

              <PropertyFAQ
                propertyName={property.name}
                location={property.location}
                capacity={staticProperty ? property.capacity : undefined}
                bedrooms={staticProperty ? property.bedrooms : undefined}
                pricePerNight={staticProperty ? property.pricePerNight : undefined}
                isInvestment={dbProperty?.listing_type !== 'inchiriere' && (isDbProperty || dbProperty?.status_operativ === 'investitie')}
                listingType={dbProperty?.listing_type}
                amenities={dbProperty?.amenities || (staticProperty ? property.amenities : [])}
                houseRules={dbProperty?.house_rules || []}
              />

              {/* ═══════════════════════════════════════════════════════
                  6. INVESTIȚIE & ANALIZĂ (pentru investitori/proprietari)
                  ═══════════════════════════════════════════════════════ */}
              {dbProperty && dbProperty.capital_necesar && (normalizedListingType === 'investitie' || normalizedListingType === 'cazare') && (
                (() => {
                  const price = dbProperty.capital_necesar!;
                  const baseRent = dbProperty.estimated_revenue ? parseFloat(dbProperty.estimated_revenue.replace(/[^0-9.]/g, "")) || 550 : 550;
                  const nightlyRate = dbProperty.base_price_per_night || Math.max(Math.round(baseRent / 10), 40);
                  const occupancyPct = 75;
                  const hotelMonthlyGross = nightlyRate * 30 * (occupancyPct / 100);
                  const managementFee = 0.20;
                  const taxRate = 0.07;
                  const invTotal = price * 1.02;
                  const annualGross = hotelMonthlyGross * 12;
                  const annualNet = annualGross * (1 - managementFee) * (1 - taxRate);
                  const yieldNet = (annualNet / invTotal) * 100;
                  const monthlyNet = annualNet / 12;
                  const paybackYears = annualNet > 0 ? invTotal / annualNet : 0;
                  const credit = price * 0.75;
                  const r = 0.065 / 12;
                  const rata = credit > 0 ? (credit * (r * Math.pow(1 + r, 300)) / (Math.pow(1 + r, 300) - 1)) : 0;
                  const cashflowLunar = monthlyNet - rata;

                  return (
                    <div className="bg-gradient-to-br from-primary/5 to-primary/15 border border-primary/20 p-5 sm:p-8 rounded-3xl shadow-sm border-l-4 border-l-primary overflow-hidden">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-serif font-bold">
                          {language === 'ro' ? 'Analiză Investiție — Regim Hotelier' : 'Investment Analysis — Hotel Regime'}
                        </h2>
                      </div>
                      <p className="text-sm text-muted-foreground mb-5">
                        {language === 'ro'
                          ? 'Proiecții calculate pentru strategia de regim hotelier administrat de RealTrust & ApArt Hotel.'
                          : 'Projections calculated for the hotel regime strategy managed by RealTrust & ApArt Hotel.'}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
                        <div className="bg-background/60 rounded-xl p-4 text-center border border-border">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                            {language === 'ro' ? 'Preț Achiziție' : 'Purchase Price'}
                          </p>
                          <p className="text-xl sm:text-2xl font-extrabold">€{price.toLocaleString('ro-RO')}</p>
                        </div>
                        <div className="bg-background/60 rounded-xl p-4 text-center border border-border">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                            {language === 'ro' ? 'Venit Net Lunar' : 'Monthly Net Income'}
                          </p>
                          <p className="text-xl sm:text-2xl font-extrabold text-primary">€{Math.round(monthlyNet).toLocaleString('ro-RO')}</p>
                        </div>
                        <div className="bg-background/60 rounded-xl p-4 text-center border border-border">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                            {language === 'ro' ? 'Randament Net' : 'Net Yield'}
                          </p>
                          <p className={`text-xl sm:text-2xl font-extrabold ${yieldNet >= 7.5 ? 'text-[hsl(var(--success))]' : yieldNet >= 5.5 ? 'text-primary' : 'text-destructive'}`}>
                            {yieldNet.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-background/60 rounded-xl p-4 text-center border border-border">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-1">
                            {language === 'ro' ? 'Cashflow Lunar' : 'Monthly Cashflow'}
                          </p>
                          <p className={`text-xl sm:text-2xl font-extrabold ${cashflowLunar > 0 ? 'text-[hsl(var(--success))]' : 'text-destructive'}`}>
                            {cashflowLunar > 0 ? '+' : ''}{Math.round(cashflowLunar)} €
                          </p>
                        </div>
                      </div>

                      <div className="bg-background/40 rounded-xl border border-border overflow-hidden mb-5">
                        <table className="w-full text-sm">
                          <tbody>
                            <tr className="border-b border-border">
                              <td className="px-4 py-2.5 text-muted-foreground font-medium">{language === 'ro' ? 'Strategie' : 'Strategy'}</td>
                              <td className="px-4 py-2.5 font-bold text-right text-primary">{language === 'ro' ? '🌟 Regim Hotelier' : '🌟 Hotel Regime'}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="px-4 py-2.5 text-muted-foreground font-medium">{language === 'ro' ? 'Tarif Mediu/Noapte' : 'Avg Nightly Rate'}</td>
                              <td className="px-4 py-2.5 font-bold text-right">€{nightlyRate}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="px-4 py-2.5 text-muted-foreground font-medium">{language === 'ro' ? 'Grad Ocupare' : 'Occupancy Rate'}</td>
                              <td className="px-4 py-2.5 font-bold text-right">{occupancyPct}%</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="px-4 py-2.5 text-muted-foreground font-medium">{language === 'ro' ? 'Venit Brut Lunar' : 'Monthly Gross Revenue'}</td>
                              <td className="px-4 py-2.5 font-bold text-right">€{Math.round(hotelMonthlyGross).toLocaleString('ro-RO')}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="px-4 py-2.5 text-muted-foreground font-medium">{language === 'ro' ? 'Management (20%)' : 'Management Fee (20%)'}</td>
                              <td className="px-4 py-2.5 font-bold text-right">-€{Math.round(annualGross * managementFee / 12).toLocaleString('ro-RO')}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="px-4 py-2.5 text-muted-foreground font-medium">{language === 'ro' ? 'Impozit (7% Forfetar)' : 'Tax (7% Flat Rate)'}</td>
                              <td className="px-4 py-2.5 font-bold text-right">-€{Math.round(annualGross * (1 - managementFee) * taxRate / 12).toLocaleString('ro-RO')}</td>
                            </tr>
                            <tr className="border-b border-border bg-primary/5">
                              <td className="px-4 py-2.5 text-foreground font-bold">{language === 'ro' ? 'Venit Net Anual' : 'Annual Net Income'}</td>
                              <td className="px-4 py-2.5 font-extrabold text-right text-primary">€{Math.round(annualNet).toLocaleString('ro-RO')}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="px-4 py-2.5 text-muted-foreground font-medium">{language === 'ro' ? 'Rată Credit Estimată' : 'Est. Mortgage Payment'}</td>
                              <td className="px-4 py-2.5 font-bold text-right">€{Math.round(rata).toLocaleString('ro-RO')}/{language === 'ro' ? 'lună' : 'mo'}</td>
                            </tr>
                            <tr>
                              <td className="px-4 py-2.5 text-muted-foreground font-medium">{language === 'ro' ? 'Amortizare' : 'Payback Period'}</td>
                              <td className="px-4 py-2.5 font-bold text-right">{paybackYears.toFixed(1)} {language === 'ro' ? 'ani' : 'years'}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <p className="text-xs text-muted-foreground italic mb-4">
                        {language === 'ro'
                          ? `* Calculele presupun tarif ${nightlyRate}€/noapte, ocupare ${occupancyPct}%, avans 25%, dobândă 6.5%, 25 ani. Cifrele sunt estimative.`
                          : `* Calculations assume ${nightlyRate}€/night, ${occupancyPct}% occupancy, 25% down, 6.5% interest, 25 yrs. Figures are estimates.`}
                      </p>

                      <InvestorGuideButton fullWidth size="lg" className="py-7 text-lg rounded-2xl" />
                    </div>
                  );
                })()
              )}

              {/* Calculator Investiție detaliat */}
              {!staticProperty && (normalizedListingType === 'investitie' || normalizedListingType === 'cazare') && (() => {
                const baseRentForEngine = dbProperty?.estimated_revenue ? parseFloat(dbProperty.estimated_revenue.replace(/[^0-9.]/g, "")) || 550 : 550;
                const estNightly = dbProperty?.base_price_per_night || Math.max(Math.round(baseRentForEngine / 10), 40);
                return (
                  <InvestmentEngineV34
                    propertyName={property.name}
                    propertyCode={dbProperty?.property_code}
                    defaultPrice={dbProperty?.capital_necesar || 120000}
                    defaultRent={baseRentForEngine}
                    defaultNightlyRate={estNightly}
                    hideRecommendations
                  />
                );
              })()}

              {/* ═══════════════════════════════════════════════════════
                  7. MARKETING — De ce Regim Hotelier & RealTrust (la final)
                  Only show for cazare/investitie listings, not vanzare/inchiriere
                  ═══════════════════════════════════════════════════════ */}
              {(normalizedListingType === 'cazare' || normalizedListingType === 'investitie' || !!staticProperty) && (
              <>
              <div className="bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/15 p-5 sm:p-8 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🏨</span>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold">
                    {language === 'ro' ? 'Regim Hotelier — Randament Superior' : 'Short-Term Rental — Superior Returns'}
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {language === 'ro'
                    ? 'Administrarea în regim hotelier oferă avantaje semnificative față de închirierea clasică pe termen lung:'
                    : 'Short-term rental management offers significant advantages over traditional long-term leasing:'}
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mb-4">
                  {(language === 'ro' ? [
                    { icon: '📈', text: 'Randament net de 9.4% vs 3-4% închiriere clasică' },
                    { icon: '💰', text: 'Dynamic Pricing — prețuri optimizate automat în funcție de cerere' },
                    { icon: '🔑', text: 'Self check-in cu smart lock — fără deplasări la predarea cheilor' },
                    { icon: '🧹', text: 'Curățenie profesionistă după fiecare sejur' },
                    { icon: '📊', text: 'Ocupare optimizată pe Booking.com & Airbnb — vizibilitate maximă' },
                    { icon: '⭐', text: 'Rating-uri ridicate ce cresc valoarea proprietății' },
                  ] : [
                    { icon: '📈', text: 'Net yield of 9.4% vs 3-4% with classic rental' },
                    { icon: '💰', text: 'Dynamic Pricing — rates auto-optimized based on demand' },
                    { icon: '🔑', text: 'Self check-in with smart lock — no key handover needed' },
                    { icon: '🧹', text: 'Professional cleaning after each stay' },
                    { icon: '📊', text: 'Optimized occupancy on Booking.com & Airbnb — maximum visibility' },
                    { icon: '⭐', text: 'High ratings that increase property value' },
                  ]).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-lg shrink-0">{item.icon}</span>
                      <span className="text-foreground/85">{item.text}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground italic">
                  {language === 'ro'
                    ? 'Ocupare medie ~75% pe an | Scor consolidat oaspeți 9,7/10 (Booking.com)'
                    : 'Average occupancy ~75% per year | Consolidated guest score 9.7/10 (Booking.com)'}
                </p>
              </div>

              <div className="bg-card border border-border p-5 sm:p-8 rounded-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">🤝</span>
                  <h2 className="text-xl sm:text-2xl font-serif font-bold">
                    {language === 'ro' ? 'Avantajele Colaborării cu RealTrust' : 'Benefits of Partnering with RealTrust'}
                  </h2>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  {language === 'ro'
                    ? 'Management complet, transparent și orientat spre maximizarea profitului proprietarului:'
                    : 'Complete, transparent management focused on maximizing owner profit:'}
                </p>
                <div className="grid sm:grid-cols-2 gap-3 mb-5">
                  {(language === 'ro' ? [
                    { icon: '📸', label: 'Fotografii profesionale', desc: 'și listare optimizată pe toate platformele' },
                    { icon: '💬', label: 'Guest Relations dedicat', desc: '— comunicare non-stop cu oaspeții' },
                    { icon: '📊', label: 'Raportare lunară detaliată', desc: '— transparență totală financiară' },
                    { icon: '🛡️', label: 'Asigurare 3M EUR', desc: '— proprietatea ta, protejată complet' },
                    { icon: '💵', label: 'Comision transparent 15-25%', desc: '— fără costuri ascunse' },
                    { icon: '✅', label: 'Tu doar încasezi profitul', desc: '— noi ne ocupăm de tot restul' },
                  ] : [
                    { icon: '📸', label: 'Professional photography', desc: 'and optimized listing on all platforms' },
                    { icon: '💬', label: 'Dedicated Guest Relations', desc: '— 24/7 guest communication' },
                    { icon: '📊', label: 'Detailed monthly reports', desc: '— full financial transparency' },
                    { icon: '🛡️', label: '€3M Insurance', desc: '— your property, fully protected' },
                    { icon: '💵', label: 'Transparent 15-25% commission', desc: '— no hidden fees' },
                    { icon: '✅', label: 'You just collect the profit', desc: '— we handle everything else' },
                  ]).map((item, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-lg shrink-0">{item.icon}</span>
                      <div>
                        <span className="font-semibold text-foreground">{item.label}</span>
                        <span className="text-muted-foreground"> {item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild variant="default" size="sm">
                    <Link to="/pentru-proprietari">
                      {language === 'ro' ? 'Află Mai Multe' : 'Learn More'}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://wa.me/40799069256?text=${encodeURIComponent(language === 'ro' ? `Bună ziua, sunt interesat de serviciile de administrare pentru proprietatea ${property.name}` : `Hello, I'm interested in management services for ${property.name}`)}`, '_blank', 'noopener,noreferrer')}
                  >
                    {language === 'ro' ? 'Contactează-ne pe WhatsApp' : 'Contact Us on WhatsApp'}
                  </Button>
                </div>
              </div>
              </>
              )}
            </div>

            {/* Bara Laterală — CTA & Contact */}
            <div className="lg:col-span-1 space-y-6">
              {staticProperty ? (
                <div className="bg-card rounded-2xl border p-6 space-y-4 sticky top-24">
                  <h3 className="text-xl font-semibold">
                    {language === 'ro' ? 'Rezervă direct, fără intermediari' : 'Book direct, no intermediaries'}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {language === 'ro' 
                      ? `Rezervarea directă pentru ${property.name} îți oferă cel mai bun preț disponibil pe site-ul nostru, fără comisioane suplimentare.`
                      : `Booking ${property.name} directly with us gives you the best available rate on our website, with no extra booking fees.`}
                  </p>
                  <Button 
                    variant="hero" 
                    className="w-full"
                    onClick={openDirectBooking}
                  >
                    {language === 'ro' ? 'Verifică disponibilitatea' : 'Check availability'}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={openBookingRequest}>
                    {language === 'ro' ? 'Solicită rezervare' : 'Request booking'}
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

                  {/* Rental price in sidebar */}
                  {normalizedListingType === 'inchiriere' && dbProperty?.base_price_per_night && (
                    <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                          {language === 'ro' ? 'Chirie lunară' : 'Monthly rent'}
                        </span>
                        <span className="text-lg font-bold text-primary">
                          €{dbProperty.base_price_per_night.toLocaleString('ro-RO')}/{language === 'ro' ? 'lună' : 'month'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Price + ROI for investment/sale */}
                  {dbProperty?.capital_necesar && normalizedListingType !== 'inchiriere' && (
                    <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                          {language === 'ro' 
                            ? (normalizedListingType === 'investitie' ? 'Capital necesar' : 'Preț') 
                            : (normalizedListingType === 'investitie' ? 'Investment required' : 'Price')}
                        </span>
                        <span className="text-lg font-bold text-primary">
                          €{dbProperty.capital_necesar.toLocaleString('ro-RO')}
                        </span>
                      </div>
                      {displayRoi && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                            {language === 'ro' ? 'Randament estimat' : 'Estimated ROI'}
                          </span>
                          <Badge className="bg-primary/10 text-primary border-primary/20 text-sm font-bold">
                            <TrendingUp className="w-3.5 h-3.5 mr-1" />
                            {displayRoi}
                          </Badge>
                        </div>
                      )}
                      {dbProperty.estimated_revenue && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                            {language === 'ro' ? 'Venit lunar est.' : 'Est. monthly income'}
                          </span>
                          <span className="text-sm font-semibold text-foreground">
                            €{dbProperty.estimated_revenue}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-muted-foreground text-sm">
                    {normalizedListingType === 'inchiriere'
                      ? (language === 'ro' 
                        ? 'Contactează-ne pentru mai multe detalii despre această proprietate.'
                        : 'Contact us for more details about this property.')
                      : (language === 'ro' 
                        ? 'Contactează-ne pentru mai multe detalii despre această oportunitate.'
                        : 'Contact us for more details about this opportunity.')}
                  </p>
                  <Button 
                    variant="hero" 
                    className="w-full"
                    onClick={() => window.open(`https://wa.me/40799069256?text=${encodeURIComponent(`${language === "ro" ? "Bună ziua, sunt interesat de proprietatea" : "Hello, I'm interested in the property"} ${dbProperty?.property_code ? `[${dbProperty.property_code}]` : ""}: ${property.name}`)}`, '_blank', 'noopener,noreferrer')}
                  >
                    {language === 'ro' ? 'Contactează-ne' : 'Contact Us'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Similar Properties — Internal Linking Loop */}
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <Suspense fallback={null}>
            <SimilarProperties
              currentPropertyId={dbProperty?.id}
              location={property.location}
              listingType={dbProperty?.listing_type}
            />
          </Suspense>
        </div>

        {/* Investor Box — only for investment/cazare/vanzare, not rentals */}
        {normalizedListingType !== 'inchiriere' && (
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
                  ? <>ApArt Hotel by RealTrust administrează proprietăți cu randament de <strong className="text-primary">9.4%</strong>. Află cum te putem ajuta cu <Link to="/pentru-proprietari" className="text-primary hover:underline font-medium">administrare regim hotelier Timișoara</Link> sau vezi ofertele noastre de <Link to="/imobiliare" className="text-primary hover:underline font-medium">vânzări apartamente Timișoara</Link>.</>
                  : <>ApArt Hotel by RealTrust manages properties with <strong className="text-primary">9.4%</strong> returns. Find out how we can help with <Link to="/pentru-proprietari" className="text-primary hover:underline font-medium">short-term rental management in Timișoara</Link> or browse our <Link to="/imobiliare" className="text-primary hover:underline font-medium">apartments for sale in Timișoara</Link>.</>
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
        )}
        {/* Property Request CTA */}
        <PropertyRequestCTA sourceProperty={property.slug || paramSlug} />
        {/* Related Blog Guides */}
        <Suspense fallback={null}>
          <RelatedBlogGuides
            propertyLocation={displayLocation}
            propertyName={property.name}
            listingType={normalizedListingType}
          />
        </Suspense>
      </main>
      <Suspense fallback={null}>
      <PropertyImageLightbox
        property={propertyForLightbox}
        initialIndex={currentImageIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        captions={imageCaptions}
      />
      <Footer />
      <BookingForm
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        propertyName={property.name}
        propertySlug={property.slug}
        propertyRefId={typeof property.id === "number" ? property.id : undefined}
        pricePerNight={dbProperty?.base_price_per_night ?? (staticProperty ? property.pricePerNight : undefined)}
      />
      <GlobalConversionWidgets showExitIntent={false} />
      </Suspense>
    </div>
  );
};

export default PropertyDetail;
