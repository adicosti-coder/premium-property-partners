import { useRef, useCallback, useState } from "react";
import { MapPin, Star, Users, BedDouble, Calendar, Eye, Heart, Check, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import SmartFeaturesBadge from "./SmartFeaturesBadge";
import OptimizedImage from "./OptimizedImage";
import { PrefetchLink } from "@/components/PrefetchLink";
import { Property, getImageAlt } from "@/data/properties";
import { usePropertyLiveData } from "@/hooks/usePropertyLiveData";
import { useRealtimeViewers } from "@/hooks/useRealtimeViewers";
import { usePrefetch } from "@/hooks/usePrefetch";
import ViewersBadge from "@/components/ViewersBadge";
import PropertyImageLightbox from "@/components/PropertyImageLightbox";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  property: Property;
  index?: number;
  isVisible?: boolean;
  isFavorite?: boolean;
  isSelectedForCompare?: boolean;
  onToggleFavorite?: (propertyId: string, propertyName: string) => void;
  onToggleCompare?: (propertyId: number) => void;
  /** Hide compare/favorite for simpler contexts */
  minimal?: boolean;
}

const PropertyCard = ({
  property,
  index = 0,
  isVisible = true,
  isFavorite: isFav = false,
  isSelectedForCompare = false,
  onToggleFavorite,
  onToggleCompare,
  minimal = false,
}: PropertyCardProps) => {
  const { language } = useLanguage();
  const { data: liveDataMap } = usePropertyLiveData();
  const { data: viewersMap } = useRealtimeViewers();
  const liveData = liveDataMap?.[property.slug];
  const viewerCount = viewersMap?.[String(property.id)] || 0;
  const displayRating = liveData?.rating ?? property.rating;
  const displayReviews = liveData?.reviews_count ?? property.reviews;
  // Sanity guard: ignore implausible live prices (scraper poate prinde total sejur / RON)
  const livePrice = liveData?.price_per_night;
  const isPlausiblePrice =
    typeof livePrice === "number" && livePrice >= 25 && livePrice <= 250;
  const displayPrice = isPlausiblePrice ? livePrice! : property.pricePerNight;
  const displayCapacity = liveData?.capacity ?? property.capacity;
  const displayBedrooms = liveData?.bedrooms ?? property.bedrooms;

  const t = {
    guests: language === "ro" ? "oaspeți" : "guests",
    bedroom: language === "ro" ? "dormitor" : "bedroom",
    bedrooms: language === "ro" ? "dormitoare" : "bedrooms",
    reviews: language === "ro" ? "recenzii" : "reviews",
    bookDirect: language === "ro" ? "Rezervă Direct" : "Book Direct",
    viewDetails: language === "ro" ? "Vezi Detalii" : "View Details",
    perNight: language === "ro" ? "/noapte" : "/night",
  };

  const getFeatureIcon = (feature: string) => {
    const icons: Record<string, JSX.Element | null> = {
      wifi: <span className="w-3 h-3">📶</span>,
      parcare: <span className="w-3 h-3">🅿️</span>,
    };
    const key = feature.toLowerCase();
    for (const [k, icon] of Object.entries(icons)) {
      if (key.includes(k)) return icon;
    }
    return null;
  };

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { prefetchPropertyImage } = usePrefetch();
  const hoverPrefetched = useRef(false);

  const openDirectBooking = useCallback(() => {
    window.open(property.bookingUrl, "_blank", "noopener,noreferrer");
  }, [property.bookingUrl]);

  const handleCardHover = useCallback(() => {
    if (!hoverPrefetched.current && property.images[1]) {
      prefetchPropertyImage(property.images[1]);
      hoverPrefetched.current = true;
    }
  }, [property.images, prefetchPropertyImage]);

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`${t.bookDirect} — ${property.name}`}
      className={cn(
        "group block cursor-pointer bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: isVisible ? `${index * 75}ms` : "0ms" }}
      onMouseEnter={handleCardHover}
      onClick={openDirectBooking}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDirectBooking();
        }
      }}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden cursor-pointer">
        <OptimizedImage
          src={property.images[0]}
          alt={getImageAlt(property, 0, language as 'ro' | 'en')}
          className="w-full h-full"
          aspectRatio="4/3"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          priority={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Location badge */}
        <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center gap-1 max-w-[60%]">
          <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
          <span className="text-xs font-medium text-foreground truncate">{property.location}</span>
        </div>

        {/* Expand image button */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setLightboxOpen(true); }}
          className="absolute bottom-4 left-4 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center justify-center text-muted-foreground hover:text-primary transition-colors z-10"
          aria-label={language === "ro" ? "Mărește imaginea" : "Enlarge image"}
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Smart Features Badge */}
        <SmartFeaturesBadge
          features={[...property.features, ...property.amenities]}
          className="absolute bottom-4 left-4"
          variant="compact"
        />

        {/* Real-time viewers badge */}
        {viewerCount >= 2 && (
          <ViewersBadge count={viewerCount} className="absolute bottom-4 right-4" />
        )}

        {/* Rating badge */}
        <div className="absolute top-4 right-12 px-2 py-1 rounded-lg bg-primary/90 backdrop-blur-sm flex items-center gap-1">
          <Star className="w-3 h-3 fill-primary-foreground text-primary-foreground" />
          <span className="text-xs font-bold text-primary-foreground">{displayRating}</span>
        </div>

        {/* Favorite button */}
        {!minimal && onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(String(property.id), property.name);
            }}
            className={cn(
              "absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
              isFav
                ? "bg-red-500 text-white"
                : "bg-background/90 backdrop-blur-sm border border-border text-muted-foreground hover:text-red-500"
            )}
            aria-label={
              isFav
                ? language === "ro" ? `Elimină ${property.name} din favorite` : `Remove ${property.name} from favorites`
                : language === "ro" ? `Adaugă ${property.name} la favorite` : `Add ${property.name} to favorites`
            }
          >
            <Heart className={cn("w-4 h-4", isFav && "fill-current")} />
          </button>
        )}

        {/* Compare checkbox */}
        {!minimal && isFav && onToggleCompare && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleCompare(property.id);
            }}
            aria-label={
              isSelectedForCompare
                ? language === "ro" ? `Deselectează ${property.name} din comparare` : `Deselect ${property.name} from compare`
                : language === "ro" ? `Selectează ${property.name} pentru comparare` : `Select ${property.name} for compare`
            }
            className={cn(
              "absolute bottom-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
              isSelectedForCompare
                ? "bg-primary text-primary-foreground"
                : "bg-background/90 backdrop-blur-sm border border-border text-muted-foreground hover:border-primary hover:text-primary"
            )}
          >
            <Check className={cn("w-4 h-4", !isSelectedForCompare && "opacity-50")} />
          </button>
        )}

        {/* View details overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium flex items-center gap-2">
            <Eye className="w-4 h-4" />
            {t.viewDetails}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-serif font-semibold text-foreground group-hover:text-primary transition-colors">
            {property.name}
          </h3>
          <div className="flex items-baseline gap-1 ml-2 flex-shrink-0">
            <span className="text-lg font-bold text-primary">€{displayPrice}</span>
            <span className="text-xs text-muted-foreground">{t.perNight}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {language === "en" ? property.descriptionEn : property.description}
        </p>

        {/* Capacity info */}
        <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {displayCapacity} {t.guests}
          </span>
          <span className="flex items-center gap-1">
            <BedDouble className="w-4 h-4" />
            {displayBedrooms} {displayBedrooms === 1 ? t.bedroom : t.bedrooms}
          </span>
          <span className="text-xs text-muted-foreground/70">
            ({displayReviews} {t.reviews})
          </span>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-4">
          {(language === "en" && property.featuresEn ? property.featuresEn : property.features).slice(0, 3).map((feature, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary text-xs text-muted-foreground"
            >
              {getFeatureIcon(feature)}
              {feature}
            </span>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <Button variant="default" size="sm" className="flex-1" asChild>
            <a
              href={property.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label={`${t.bookDirect} — ${property.name}`}
            >
              <Calendar className="w-4 h-4 mr-1" />
              {t.bookDirect}
            </a>
          </Button>
          <Button variant="booking" size="sm" asChild>
            <PrefetchLink
              to={`/proprietate/${property.slug}`}
              propertyId={String(property.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={language === "ro" ? `Vezi detalii ${property.name}` : `View details ${property.name}`}
            >
              <Eye className="w-4 h-4" />
            </PrefetchLink>
          </Button>
        </div>
      </div>

      <PropertyImageLightbox
        property={property}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
};

export default PropertyCard;
