import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { MapPin, X, ChevronLeft, ChevronRight, SearchX, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useSharedFavorites } from "@/hooks/useSharedFavorites";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import PropertyCardSkeleton from "./PropertyCardSkeleton";
import PropertyFilters, { SortOption } from "./PropertyFilters";
import PropertyCard from "./PropertyCard";
import { properties, Property, getActiveProperties, getImageAlt } from "@/data/properties";
import { toast } from "sonner";
const PropertyCompareModal = lazy(() => import("./PropertyCompareModal"));

/** Click-to-load map wrapper — prevents mapbox-gl (461KB) from loading on page init */
const GalleryMapPlaceholder = ({ language }: { language: string }) => {
  const [MapComp, setMapComp] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(false);

  const activate = () => {
    if (MapComp || loading) return;
    setLoading(true);
    import("./PropertyMap").then(m => {
      setMapComp(() => m.default);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  return (
    <div className="mb-12">
      <div className="flex items-center gap-2 mb-4">
        <Map className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-serif font-semibold text-foreground">
          {language === 'ro' ? 'Hartă Proprietăți' : 'Properties Map'}
        </h3>
      </div>
      {MapComp ? (
        <Suspense fallback={<div className="w-full h-[400px] rounded-xl bg-muted/30 animate-pulse" />}>
          <MapComp className="w-full h-[400px] rounded-xl" />
        </Suspense>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={activate}
          onKeyDown={(e) => e.key === 'Enter' && activate()}
          className="w-full h-[400px] rounded-xl border border-border/50 bg-muted/30 flex items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
        >
          <div className="text-center p-6">
            <div className="text-4xl mb-3">{loading ? '⏳' : '🗺️'}</div>
            <p className="text-lg font-semibold text-foreground/80">
              {loading
                ? (language === 'ro' ? 'Se încarcă harta...' : 'Loading map...')
                : (language === 'ro' ? 'Apasă pentru a vedea harta' : 'Tap to view map')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

/** Lightbox with touch swipe for mobile */
const LightboxOverlay = ({
  filteredProperties,
  currentImageIndex,
  language,
  onClose,
  onNext,
  onPrev,
}: {
  filteredProperties: Property[];
  currentImageIndex: number;
  language: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) => {
  const swipeHandlers = useTouchSwipe({
    onSwipeLeft: onNext,
    onSwipeRight: onPrev,
    onSwipeDown: onClose,
  });

  const current = filteredProperties[currentImageIndex];
  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4"
      {...swipeHandlers}
    >
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-foreground hover:text-primary transition-colors z-10"
      >
        <X className="w-8 h-8" />
      </button>
      <button
        onClick={onPrev}
        className="absolute left-4 md:left-8 text-foreground hover:text-primary transition-colors z-10"
      >
        <ChevronLeft className="w-10 h-10" />
      </button>
      <div className="max-w-4xl w-full">
        <img
          src={current.images[0]}
          alt={getImageAlt(current, 0, language as 'ro' | 'en')}
          loading="lazy"
          decoding="async"
          sizes="(max-width: 768px) 100vw, 800px"
          className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
        />
        <div className="text-center mt-4">
          <h3 className="text-xl font-serif font-semibold text-foreground">{current.name}</h3>
          <p className="text-muted-foreground flex items-center justify-center gap-1 mt-1">
            <MapPin className="w-4 h-4" />
            {current.location}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {currentImageIndex + 1} / {filteredProperties.length}
            <span className="ml-2 md:hidden">← {language === 'ro' ? 'Glisați' : 'Swipe'} →</span>
          </p>
        </div>
      </div>
      <button
        onClick={onNext}
        className="absolute right-4 md:right-8 text-foreground hover:text-primary transition-colors z-10"
      >
        <ChevronRight className="w-10 h-10" />
      </button>
    </div>
  );
};

const PropertyGallery = () => {
  const { t, language } = useLanguage();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { copyShareableLink } = useSharedFavorites();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedCapacity, setSelectedCapacity] = useState("all");
  const [selectedFeature, setSelectedFeature] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.02 });

  const handleToggleFavorite = (propertyId: string, propertyName: string) => {
    const wasFavorite = isFavorite(propertyId);
    toggleFavorite(propertyId);
    toast(wasFavorite ? t.portfolio.favorites.removed : t.portfolio.favorites.added, {
      description: propertyName,
    });
  };

  const handleShareFavorites = async () => {
    const success = await copyShareableLink();
    if (success) {
      toast.success(t.portfolio.filters.linkCopied);
    }
  };

  const handleExportPdf = async () => {
    const { exportFavoritesPdf } = await import("@/utils/exportFavoritesPdf");
    const favoriteProperties = properties.filter((p) => favorites.includes(String(p.id)));
    if (favoriteProperties.length === 0) return;

    exportFavoritesPdf({
      title: t.portfolio.filters.pdfTitle,
      properties: favoriteProperties,
      language: language as "ro" | "en",
      labels: {
        guests: t.portfolio.guests,
        bedroom: t.portfolio.bedroom,
        bedrooms: t.portfolio.bedrooms,
        reviews: t.portfolio.reviews,
        features: t.portfolio.filters.features,
        rating: "Rating",
        location: t.portfolio.filters.location,
        generatedOn: t.portfolio.filters.generatedOn,
      },
    });
  };

  const handleToggleCompare = (propertyId: number) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(propertyId)) {
        return prev.filter((id) => id !== propertyId);
      }
      if (prev.length >= 4) {
        toast.error(t.portfolio.compare.maxReached);
        return prev;
      }
      return [...prev, propertyId];
    });
  };

  const handleOpenCompare = () => {
    if (selectedForCompare.length >= 2) {
      setCompareModalOpen(true);
    } else {
      toast.info(t.portfolio.compare.selectToCompare);
    }
  };

  const handleRemoveFromCompare = (propertyId: number) => {
    setSelectedForCompare((prev) => prev.filter((id) => id !== propertyId));
  };

  const compareProperties = useMemo(() => {
    return properties.filter((p) => selectedForCompare.includes(p.id));
  }, [selectedForCompare]);

  // Simulate loading state for demonstration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    // Start with active properties only
    let result = getActiveProperties().filter((property) => {
      // Favorites filter
      if (showFavoritesOnly && !favorites.includes(String(property.id))) {
        return false;
      }

      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = property.name.toLowerCase().includes(query);
        const matchesLocation = property.location.toLowerCase().includes(query);
        const matchesDescription = property.description.toLowerCase().includes(query) || 
                                   property.descriptionEn.toLowerCase().includes(query);
        const matchesFeatures = property.features.some(f => f.toLowerCase().includes(query));
        
        if (!matchesName && !matchesLocation && !matchesDescription && !matchesFeatures) {
          return false;
        }
      }
      
      // Location filter
      if (selectedLocation !== "all" && property.location !== selectedLocation) {
        return false;
      }
      
      // Capacity filter
      if (selectedCapacity !== "all") {
        const capacity = property.capacity;
        if (selectedCapacity === "1-2" && capacity > 2) return false;
        if (selectedCapacity === "3-4" && (capacity < 3 || capacity > 4)) return false;
        if (selectedCapacity === "5+" && capacity < 5) return false;
      }
      
      // Feature filter
      if (selectedFeature !== "all" && !property.features.includes(selectedFeature)) {
        return false;
      }
      
      return true;
    });

    // Sort properties
    if (sortBy !== "default") {
      result = [...result].sort((a, b) => {
        switch (sortBy) {
          case "rating-desc":
            return b.rating - a.rating;
          case "rating-asc":
            return a.rating - b.rating;
          case "reviews-desc":
            return b.reviews - a.reviews;
          case "reviews-asc":
            return a.reviews - b.reviews;
          default:
            return 0;
        }
      });
    }

    return result;
  }, [searchQuery, selectedLocation, selectedCapacity, selectedFeature, sortBy, showFavoritesOnly, favorites]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLocation("all");
    setSelectedCapacity("all");
    setSelectedFeature("all");
    setSortBy("default");
    setShowFavoritesOnly(false);
    setSelectedForCompare([]);
  };

  const openBookingForm = (propertyName: string) => {
    setSelectedProperty(propertyName);
    setBookingOpen(true);
  };

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % filteredProperties.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + filteredProperties.length) % filteredProperties.length);
  };

  return (
    <section id="portofoliu" className="py-24 bg-gradient-subtle relative overflow-hidden">
      {/* Background decorations - hidden on mobile to prevent edge shadows */}
      <div className="absolute top-20 -right-36 w-72 h-72 bg-primary/5 rounded-full blur-3xl hidden md:block" />
      <div className="absolute bottom-20 -left-36 w-72 h-72 bg-primary/5 rounded-full blur-3xl hidden md:block" />

      <div className="container mx-auto px-6 relative z-10">
        <div 
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4">{t.portfolio.label}</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {t.portfolio.title} <span className="text-gradient-gold">{t.portfolio.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t.portfolio.subtitle}
          </p>
        </div>

        {/* Filters */}
        {!isLoading && (
          <PropertyFilters
            searchQuery={searchQuery}
            selectedLocation={selectedLocation}
            selectedCapacity={selectedCapacity}
            selectedFeature={selectedFeature}
            sortBy={sortBy}
            showFavoritesOnly={showFavoritesOnly}
            favoritesCount={favorites.length}
            compareCount={selectedForCompare.length}
            onSearchChange={setSearchQuery}
            onLocationChange={setSelectedLocation}
            onCapacityChange={setSelectedCapacity}
            onFeatureChange={setSelectedFeature}
            onSortChange={setSortBy}
            onFavoritesToggle={() => setShowFavoritesOnly(!showFavoritesOnly)}
            onShareFavorites={handleShareFavorites}
            onExportPdf={handleExportPdf}
            onClearFilters={clearFilters}
            onCompare={handleOpenCompare}
          />
        )}

        {/* Results counter */}
        {!isLoading && (
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">
              {t.portfolio.filters.showingResults
                .replace("{count}", filteredProperties.length.toString())
                .replace("{total}", properties.length.toString())}
            </p>
          </div>
        )}

        {/* Interactive Map — click-to-load to avoid mapbox-gl (461KB, 959ms CPU) on initial render */}
        {!isLoading && (
          <GalleryMapPlaceholder language={language} />
        )}

        {/* Property Grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {isLoading ? (
            // Skeleton loading state
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <PropertyCardSkeleton />
              </div>
            ))
          ) : filteredProperties.length === 0 ? (
            // No results state
            <div className="col-span-full text-center py-16">
              <SearchX className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-serif font-semibold text-foreground mb-2">
                {t.portfolio.filters.noResults}
              </h3>
              <p className="text-muted-foreground mb-6">
                {t.portfolio.filters.noResultsMessage}
              </p>
              <Button variant="outline" onClick={clearFilters}>
                {t.portfolio.filters.clearFilters}
              </Button>
            </div>
          ) : (
            // Actual property cards
            filteredProperties.map((property, index) => (
              <PropertyCard
                key={property.id}
                property={property}
                index={index}
                isVisible={gridVisible}
                isFavorite={isFavorite(String(property.id))}
                isSelectedForCompare={selectedForCompare.includes(property.id)}
                onToggleFavorite={handleToggleFavorite}
                onToggleCompare={handleToggleCompare}
              />
            ))
          )}
        </div>
      </div>

      {/* Lightbox Modal with swipe support */}
      {lightboxOpen && (
        <LightboxOverlay
          filteredProperties={filteredProperties}
          currentImageIndex={currentImageIndex}
          language={language}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}

      {/* Compare Modal */}
      <PropertyCompareModal
        open={compareModalOpen}
        onOpenChange={setCompareModalOpen}
        properties={compareProperties}
        onRemoveProperty={handleRemoveFromCompare}
      />
    </section>
  );
};

export default PropertyGallery;