import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Wifi, Car, Key, X, ChevronLeft, ChevronRight, Star, Users, BedDouble, Calendar, Eye, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import BookingForm from "./BookingForm";
import PropertyCardSkeleton from "./PropertyCardSkeleton";
import PropertyFilters, { SortOption } from "./PropertyFilters";
import { properties, Property } from "@/data/properties";

const getFeatureIcon = (feature: string) => {
  switch (feature.toLowerCase()) {
    case "wifi":
      return <Wifi className="w-3 h-3" />;
    case "parcare":
      return <Car className="w-3 h-3" />;
    case "auto check-in":
      return <Key className="w-3 h-3" />;
    default:
      return null;
  }
};

const PropertyGallery = () => {
  const { t, language } = useLanguage();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedCapacity, setSelectedCapacity] = useState("all");
  const [selectedFeature, setSelectedFeature] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.02 });

  // Simulate loading state for demonstration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Filter and sort properties
  const filteredProperties = useMemo(() => {
    let result = properties.filter((property) => {
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
  }, [searchQuery, selectedLocation, selectedCapacity, selectedFeature, sortBy]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLocation("all");
    setSelectedCapacity("all");
    setSelectedFeature("all");
    setSortBy("default");
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
      {/* Background decorations */}
      <div className="absolute top-20 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />

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
            onSearchChange={setSearchQuery}
            onLocationChange={setSelectedLocation}
            onCapacityChange={setSelectedCapacity}
            onFeatureChange={setSelectedFeature}
            onSortChange={setSortBy}
            onClearFilters={clearFilters}
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
              <div
                key={property.id}
                className={`group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant ${
                  gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: gridVisible ? `${index * 75}ms` : '0ms' }}
              >
                {/* Image */}
                <Link to={`/proprietate/${property.slug}`}>
                  <div className="relative h-48 overflow-hidden cursor-pointer">
                    <img
                      src={property.images[0]}
                      alt={property.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Location badge */}
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-foreground">{property.location}</span>
                    </div>

                    {/* Rating badge */}
                    <div className="absolute top-4 right-4 px-2 py-1 rounded-lg bg-primary/90 backdrop-blur-sm flex items-center gap-1">
                      <Star className="w-3 h-3 fill-primary-foreground text-primary-foreground" />
                      <span className="text-xs font-bold text-primary-foreground">{property.rating}</span>
                    </div>

                    {/* View details overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        {t.portfolio.viewDetails}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Content */}
                <div className="p-5">
                  <Link to={`/proprietate/${property.slug}`}>
                    <h3 className="text-lg font-serif font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                      {property.name}
                    </h3>
                  </Link>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {language === 'en' ? property.descriptionEn : property.description}
                  </p>

                  {/* Capacity info */}
                  <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {property.capacity} {t.portfolio.guests}
                    </span>
                    <span className="flex items-center gap-1">
                      <BedDouble className="w-4 h-4" />
                      {property.bedrooms} {property.bedrooms === 1 ? t.portfolio.bedroom : t.portfolio.bedrooms}
                    </span>
                    <span className="text-xs text-muted-foreground/70">
                      ({property.reviews} {t.portfolio.reviews})
                    </span>
                  </div>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {property.features.slice(0, 3).map((feature, idx) => (
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
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => openBookingForm(property.name)}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      {t.portfolio.bookDirect}
                    </Button>
                    <Link to={`/proprietate/${property.slug}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            onClick={closeLightbox}
            className="absolute top-6 right-6 text-foreground hover:text-primary transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          <button
            onClick={prevImage}
            className="absolute left-4 md:left-8 text-foreground hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-10 h-10" />
          </button>

          <div className="max-w-4xl w-full">
            <img
              src={filteredProperties[currentImageIndex]?.images[0]}
              alt={filteredProperties[currentImageIndex]?.name}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <div className="text-center mt-4">
              <h3 className="text-xl font-serif font-semibold text-foreground">
                {filteredProperties[currentImageIndex]?.name}
              </h3>
              <p className="text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {filteredProperties[currentImageIndex]?.location}
              </p>
            </div>
          </div>

          <button
            onClick={nextImage}
            className="absolute right-4 md:right-8 text-foreground hover:text-primary transition-colors"
          >
            <ChevronRight className="w-10 h-10" />
          </button>
        </div>
      )}

      {/* Booking Form Modal */}
      <BookingForm 
        isOpen={bookingOpen} 
        onClose={() => setBookingOpen(false)} 
        propertyName={selectedProperty}
      />
    </section>
  );
};

export default PropertyGallery;