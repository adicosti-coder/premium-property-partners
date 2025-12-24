import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Star, Users, BedDouble, Bath, Maximize2, 
  Wifi, Car, Key, Calendar, Clock, Check, X, ChevronLeft, ChevronRight,
  ExternalLink, Share2, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getPropertyBySlug } from "@/data/properties";
import BookingForm from "@/components/BookingForm";
import StayCalculator from "@/components/StayCalculator";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

const PropertyDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const property = getPropertyBySlug(slug || "");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();

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

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Main Image */}
            <div 
              className="relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer group"
              onClick={() => setLightboxOpen(true)}
            >
              <img 
                src={property.images[0]} 
                alt={property.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                  {t.propertyDetail.clickForGallery}
                </Badge>
              </div>
            </div>

            {/* Thumbnail Grid */}
            <div className="grid grid-cols-2 gap-4">
              {property.images.slice(1, 5).map((image, index) => (
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
                </div>
              ))}
            </div>
          </div>
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
            </div>

            {/* Right Column - Stay Calculator & Booking Card */}
            <div className="lg:col-span-1 space-y-6">
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
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-6 right-6 text-foreground hover:text-primary transition-colors z-10"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={prevImage}
            className="absolute left-4 md:left-8 text-foreground hover:text-primary transition-colors z-10"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          <div className="max-w-5xl w-full">
            <img
              src={property.images[currentImageIndex]}
              alt={`${property.name} - ${currentImageIndex + 1}`}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <div className="text-center mt-4">
              <p className="text-muted-foreground">
                {currentImageIndex + 1} / {property.images.length}
              </p>
            </div>
          </div>

          <button
            onClick={nextImage}
            className="absolute right-4 md:right-8 text-foreground hover:text-primary transition-colors z-10"
          >
            <ChevronRight className="w-10 h-10" />
          </button>

          {/* Thumbnails */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {property.images.map((image, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                  index === currentImageIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <img src={image} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Booking Form */}
      <BookingForm 
        isOpen={bookingOpen} 
        onClose={() => setBookingOpen(false)} 
        propertyName={property.name}
      />
    </div>
  );
};

export default PropertyDetail;