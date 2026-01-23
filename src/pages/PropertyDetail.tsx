import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Star, Users, BedDouble, Bath, Maximize2, 
  Wifi, Car, Key, Calendar, Clock, Check, X, ChevronLeft, ChevronRight,
  ExternalLink, Share2, Heart, Loader2, Play, Pause
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
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

interface PropertyImage {
  id: string;
  image_path: string;
  display_order: number;
  is_primary: boolean;
}

interface DbProperty {
  id: string;
  name: string;
}

const PropertyDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const property = getPropertyBySlug(slug || "");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [dbImages, setDbImages] = useState<PropertyImage[]>([]);
  const [dbPropertyId, setDbPropertyId] = useState<string | null>(null);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [isAutoplay, setIsAutoplay] = useState(false);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  // Fetch images from database based on property name/slug
  useEffect(() => {
    const fetchPropertyImages = async () => {
      if (!property) return;
      
      setIsLoadingImages(true);
      try {
        // First, find the property in the database by name
        const { data: dbProperty } = await supabase
          .from("properties")
          .select("id")
          .eq("name", property.name)
          .maybeSingle();

        if (dbProperty) {
          setDbPropertyId(dbProperty.id);
          // Fetch images for this property
          const { data: images } = await supabase
            .from("property_images")
            .select("*")
            .eq("property_id", dbProperty.id)
            .order("display_order", { ascending: true });

          if (images && images.length > 0) {
            setDbImages(images);
          }
        }
      } catch (error) {
        console.error("Error fetching property images:", error);
      } finally {
        setIsLoadingImages(false);
      }
    };

    fetchPropertyImages();
  }, [property]);

  // Get public URL for storage images
  const getPublicUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("property-images").getPublicUrl(path);
    return data.publicUrl;
  };

  // Use database images if available, otherwise fallback to static images
  const galleryImages = dbImages.length > 0 
    ? dbImages.map(img => getPublicUrl(img.image_path))
    : property?.images || [];

  const nextImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  }, [galleryImages.length]);

  const prevImage = useCallback(() => {
    setCurrentImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  }, [galleryImages.length]);

  if (!property) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-serif font-bold text-foreground mb-4">{t.propertyDetail.notFound}</h1>
          <p className="text-muted-foreground mb-8">{t.propertyDetail.notFoundMessage}</p>
          <Link to="/#portofoliu">
            <Button variant="default">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.propertyDetail.backToPortfolio}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          prevImage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextImage();
          break;
        case 'Escape':
          e.preventDefault();
          setLightboxOpen(false);
          break;
        case ' ':
          e.preventDefault();
          setIsAutoplay(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, nextImage, prevImage]);

  // Autoplay slideshow
  useEffect(() => {
    if (isAutoplay && lightboxOpen) {
      autoplayRef.current = setInterval(() => {
        nextImage();
      }, 3000);
    } else {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
        autoplayRef.current = null;
      }
    }

    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
    };
  }, [isAutoplay, lightboxOpen, nextImage]);

  // Touch swipe handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      nextImage();
    } else if (isRightSwipe) {
      prevImage();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }, [nextImage, prevImage]);

  const handleShare = async () => {
    const description = language === 'en' ? property.descriptionEn : property.description;
    if (navigator.share) {
      await navigator.share({
        title: property.name,
        text: description,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: language === 'en' ? "Link copied!" : "Link copiat!",
        description: language === 'en' ? "You can send this link to your friends." : "Poți trimite link-ul prietenilor tăi.",
      });
    }
  };

  const longDescription = language === 'en' ? property.longDescriptionEn : property.longDescription;
  const amenities = language === 'en' ? property.amenitiesEn : property.amenities;
  const houseRules = language === 'en' ? property.houseRulesEn : property.houseRules;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Breadcrumb */}
        <div className="container mx-auto px-6 py-4">
          <Link 
            to="/#portofoliu" 
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.propertyDetail.backToPortfolio}
          </Link>
        </div>

        {/* Image Gallery */}
        <div className="container mx-auto px-6 mb-8">
          {isLoadingImages ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : galleryImages.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Main Image */}
              <div 
                className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group"
                onClick={() => setLightboxOpen(true)}
              >
                <img 
                  src={galleryImages[0]} 
                  alt={property.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                    {t.propertyDetail.clickForGallery}
                  </Badge>
                </div>
                {/* Smart Features Badge on main image */}
                <SmartFeaturesBadge 
                  features={[...property.features, ...property.amenities]} 
                  className="absolute bottom-4 right-4"
                  variant="compact"
                />
                {dbImages.length > 0 && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary/90 backdrop-blur-sm">
                      {galleryImages.length} {language === 'en' ? 'photos' : 'fotografii'}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Thumbnail Grid */}
              <div className="grid grid-cols-2 gap-4">
                {galleryImages.slice(1, 5).map((image, index) => (
                  <div 
                    key={index}
                    className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group"
                    onClick={() => {
                      setCurrentImageIndex(index + 1);
                      setLightboxOpen(true);
                    }}
                  >
                    <img 
                      src={image} 
                      alt={`${property.name} - ${index + 2}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {/* Show "+X more" on last thumbnail if there are more images */}
                    {index === 3 && galleryImages.length > 5 && (
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                        <span className="text-2xl font-semibold text-foreground">
                          +{galleryImages.length - 5}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="aspect-[16/9] rounded-2xl bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">{language === 'en' ? 'No images available' : 'Nu există imagini'}</p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="container mx-auto px-6 pb-24">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
                      {property.name}
                    </h1>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-primary" />
                        {property.location}, Timișoara
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-primary text-primary" />
                        {property.rating} ({property.reviews} {t.propertyDetail.reviews})
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={handleShare}>
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Heart className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap gap-6 py-4 border-y border-border">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-foreground">{property.capacity} {t.propertyDetail.guests}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BedDouble className="w-5 h-5 text-primary" />
                    <span className="text-foreground">{property.bedrooms} {property.bedrooms === 1 ? t.propertyDetail.bedroom : t.propertyDetail.bedrooms}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bath className="w-5 h-5 text-primary" />
                    <span className="text-foreground">{property.bathrooms} {property.bathrooms === 1 ? t.propertyDetail.bathroom : t.propertyDetail.bathrooms}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-5 h-5 text-primary" />
                    <span className="text-foreground">{property.size} m²</span>
                  </div>
                </div>

                {/* Smart Features Badge - Full variant */}
                <SmartFeaturesBadge 
                  features={[...property.features, ...property.amenities]} 
                  className="mt-4"
                  variant="full"
                />
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xl font-serif font-semibold text-foreground mb-4">{t.propertyDetail.about}</h2>
                <p className="text-muted-foreground leading-relaxed">{longDescription}</p>
              </div>

              {/* Amenities */}
              <div>
                <h2 className="text-xl font-serif font-semibold text-foreground mb-4">{t.propertyDetail.amenities}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* House Rules */}
              <div>
                <h2 className="text-xl font-serif font-semibold text-foreground mb-4">{t.propertyDetail.houseRules}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {houseRules.map((rule, index) => (
                    <div key={index} className="flex items-center gap-2 text-muted-foreground">
                      <X className="w-4 h-4 text-destructive flex-shrink-0" />
                      <span className="text-sm">{rule}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Check-in/out Times */}
              <div className="flex flex-wrap gap-6 p-6 bg-card rounded-xl border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.propertyDetail.checkIn}</p>
                    <p className="font-semibold text-foreground">{t.propertyDetail.after} {property.checkInTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t.propertyDetail.checkOut}</p>
                    <p className="font-semibold text-foreground">{t.propertyDetail.until} {property.checkOutTime}</p>
                  </div>
                </div>
              </div>

              {/* Guest Reviews */}
              {dbPropertyId && (
                <PropertyReviews 
                  propertyId={dbPropertyId} 
                  propertyName={property.name} 
                />
              )}
            </div>

            {/* Right Column - Stay Calculator & Booking Card */}
            <div className="lg:col-span-1 space-y-6">
              {/* Price Compare Widget */}
              <PriceCompareWidget basePrice={property.pricePerNight} />
              
              {/* Stay Calculator */}
              <StayCalculator 
                property={property} 
                onBook={() => setBookingOpen(true)} 
              />

              {/* Availability Calendar */}
              <AvailabilityCalendar propertyId={property.id} />

              {/* Quick Info Card */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-primary text-primary" />
                    <span className="font-semibold text-foreground">{property.rating}</span>
                    <span className="text-muted-foreground">({property.reviews} {t.propertyDetail.reviews})</span>
                  </div>
                </div>

                <Separator className="mb-6" />

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Key className="w-5 h-5 text-primary" />
                    <span>{t.propertyDetail.autoCheckIn}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Wifi className="w-5 h-5 text-primary" />
                    <span>{t.propertyDetail.wifiIncluded}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Car className="w-5 h-5 text-primary" />
                    <span>{t.propertyDetail.privateParking}</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => window.open(property.bookingUrl, "_blank")}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t.propertyDetail.viewOnBooking}
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  {t.propertyDetail.bestPrice}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Close button */}
          <button
            onClick={() => {
              setLightboxOpen(false);
              setIsAutoplay(false);
            }}
            className="absolute top-6 right-6 text-foreground hover:text-primary transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Autoplay button */}
          <button
            onClick={() => setIsAutoplay(prev => !prev)}
            className="absolute top-6 right-20 text-foreground hover:text-primary transition-colors z-10"
            title={isAutoplay ? (language === 'en' ? 'Pause slideshow' : 'Oprește slideshow') : (language === 'en' ? 'Start slideshow' : 'Pornește slideshow')}
          >
            {isAutoplay ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
          </button>

          {/* Navigation - Previous (hidden on mobile) */}
          <button
            onClick={prevImage}
            className="absolute left-4 md:left-8 text-foreground hover:text-primary transition-colors z-10 hidden md:block"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          <div className="max-w-5xl w-full select-none">
            <img
              src={galleryImages[currentImageIndex]}
              alt={`${property.name} - ${currentImageIndex + 1}`}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
              draggable={false}
            />
            <div className="text-center mt-4 flex items-center justify-center gap-4">
              <p className="text-muted-foreground">
                {currentImageIndex + 1} / {galleryImages.length}
              </p>
              {isAutoplay && (
                <span className="text-xs text-primary animate-pulse">
                  {language === 'en' ? 'Slideshow active' : 'Slideshow activ'}
                </span>
              )}
            </div>
          </div>

          {/* Navigation - Next (hidden on mobile) */}
          <button
            onClick={nextImage}
            className="absolute right-4 md:right-8 text-foreground hover:text-primary transition-colors z-10 hidden md:block"
          >
            <ChevronRight className="w-10 h-10" />
          </button>

          {/* Thumbnails */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4">
            {galleryImages.slice(0, 10).map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors flex-shrink-0 ${
                  index === currentImageIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={image} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Mobile swipe hint */}
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 text-xs text-muted-foreground md:hidden">
            ← {language === 'en' ? 'Swipe to navigate' : 'Swipe pentru navigare'} →
          </div>
        </div>
      )}

      {/* Booking Form */}
      <BookingForm 
        isOpen={bookingOpen} 
        onClose={() => setBookingOpen(false)} 
        propertyName={property.name}
      />
      <AccessibilityPanel />
    </div>
  );
};

export default PropertyDetail;