import { useEffect, useState, useCallback, useRef } from "react";
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
import BookingForm from "@/components/BookingForm";
import StayCalculator from "@/components/StayCalculator";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import PriceCompareWidget from "@/components/PriceCompareWidget";
import SmartFeaturesBadge from "@/components/SmartFeaturesBadge";
import PropertyReviews from "@/components/PropertyReviews";
import GuestReviewForm from "@/components/GuestReviewForm";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import StickyPropertyCTA from "@/components/StickyPropertyCTA";
import SEOHead from "@/components/SEOHead";
import OptimizedImage from "@/components/OptimizedImage";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { useImagePreload } from "@/hooks/useImagePreload";
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
  status_operativ?: string;
  estimated_revenue?: string;
  roi_percentage?: string;
}

const PropertyDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const property = getPropertyBySlug(slug || "");
  const { toast } = useToast();
  const { t, language } = useLanguage();
  
  // State pentru proprietatea din DB
  const [dbProperty, setDbProperty] = useState<DbPropertyData | null>(null);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [dbImages, setDbImages] = useState<any[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Date din Supabase (inclusiv noile coloane)
  useEffect(() => {
    const fetchPropertyData = async () => {
      if (!property) return;
      setIsLoadingImages(true);
      try {
        const { data: dbProp } = await supabase
          .from("properties")
          .select("id, name, status_operativ, estimated_revenue, roi_percentage")
          .eq("name", property.name)
          .maybeSingle();

        if (dbProp) {
          setDbProperty(dbProp);
          const { data: images } = await supabase
            .from("property_images")
            .select("*")
            .eq("property_id", dbProp.id)
            .order("display_order", { ascending: true });
          if (images) setDbImages(images);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoadingImages(false);
      }
    };
    fetchPropertyData();
  }, [property]);

  // 2. Funcție Trimitere către Make.com (folosind window.prompt)
  const handleRequestInvestmentPlan = async () => {
    const userEmail = window.prompt("Introdu adresa ta de email pentru a primi planul de management:");
    if (!userEmail) return;

    const webhookUrl = "https://hook.eu1.make.com/swcd8yafsc17xlrys9w2ivlfnhukay4p";

    const payload = {
      contents: {
        email: userEmail,
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

  if (!property || property.isActive === false) return null;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={`${property.name} | RealTrust Timișoara`} />
      <Header />
      
      <main className="pt-20">
        <div className="container mx-auto px-6 py-4">
          <Link to="/#portofoliu" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t.propertyDetail.backToPortfolio}
          </Link>
        </div>

        {/* Galerie - Rămâne neschimbată */}
        <div className="container mx-auto px-6 mb-8">
           <div className="relative aspect-[16/9] lg:aspect-[21/9] rounded-2xl overflow-hidden cursor-pointer" onClick={() => setLightboxOpen(true)}>
             <OptimizedImage src={galleryImages[0]} alt={property.name} className="w-full h-full object-cover" priority={true} />
             <div className="absolute bottom-4 right-4"><Badge variant="secondary">{galleryImages.length} Foto</Badge></div>
           </div>
        </div>

        <div className="container mx-auto px-6 pb-24">
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
              
              {/* Header Info */}
              <div>
                <h1 className="text-4xl font-serif font-bold mb-2">{property.name}</h1>
                <p className="text-muted-foreground flex items-center gap-1"><MapPin className="w-4 h-4" /> {property.location}, Timișoara</p>
              </div>

              {/* SECȚIUNEA DE INVESTIȚIE (ROI) - APARE DOAR DACĂ status_operativ === 'investitie' */}
              {dbProperty?.status_operativ === 'investitie' && (
                <div className="bg-gradient-to-br from-primary/5 to-primary/15 border border-primary/20 p-8 rounded-3xl shadow-sm border-l-4 border-l-primary">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    <h2 className="text-2xl font-serif font-bold">Oportunitate de Investiție</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Venit Estimativ</p>
                      <p className="text-3xl font-bold text-primary">€{dbProperty.estimated_revenue || "1.200"} / lună</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Randament (ROI)</p>
                      <p className="text-3xl font-bold">{dbProperty.roi_percentage || "9.2"}%</p>
                    </div>
                  </div>
                  <Button size="lg" className="w-full py-7 text-lg rounded-2xl shadow-lg hover:shadow-primary/20" onClick={handleRequestInvestmentPlan}>
                    Vreau Planul de Management Detaliat
                  </Button>
                </div>
              )}

              {/* Detalii Standard */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-card rounded-2xl border">
                <div className="flex flex-col items-center"><Users className="text-primary mb-1"/><span className="text-sm font-medium">{property.capacity} Oaspeți</span></div>
                <div className="flex flex-col items-center"><BedDouble className="text-primary mb-1"/><span className="text-sm font-medium">{property.bedrooms} Dormitoare</span></div>
                <div className="flex flex-col items-center"><Bath className="text-primary mb-1"/><span className="text-sm font-medium">{property.bathrooms} Băi</span></div>
                <div className="flex flex-col items-center"><Maximize2 className="text-primary mb-1"/><span className="text-sm font-medium">{property.size} m²</span></div>
              </div>

              <div>
                <h2 className="text-2xl font-serif font-semibold mb-4">{t.propertyDetail.about}</h2>
                <p className="text-muted-foreground leading-relaxed">{language === 'en' ? property.longDescriptionEn : property.longDescription}</p>
              </div>
              
              <PropertyReviews propertyId={dbProperty?.id || ""} propertyName={property.name} />
            </div>

            {/* Bara Laterală - Rezervări */}
            <div className="lg:col-span-1 space-y-6">
              <PriceCompareWidget basePrice={property.pricePerNight} />
              <StayCalculator property={property} onBook={() => setBookingOpen(true)} />
              <AvailabilityCalendar propertyId={property.id} />
            </div>
          </div>
        </div>
      </main>


      <Footer />
      <BookingForm isOpen={bookingOpen} onClose={() => setBookingOpen(false)} propertyName={property.name} />
    </div>
  );
};

export default PropertyDetail;
