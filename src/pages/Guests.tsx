import { useState, useMemo, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Star, Users, BedDouble, Heart, Wifi, Car, Key, Calendar, ArrowRight, Search, Filter, Sparkles, Euro, X, ArrowUpDown, TrendingUp, TrendingDown, Share2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import PropertyImageCarousel from "@/components/PropertyImageCarousel";
import { PrefetchLink } from "@/components/PrefetchLink";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { properties } from "@/data/properties";
import { toast } from "sonner";

const getFeatureIcon = (feature: string) => {
  switch (feature.toLowerCase()) {
    case "wifi":
      return <Wifi className="w-4 h-4" />;
    case "parcare":
      return <Car className="w-4 h-4" />;
    case "auto check-in":
      return <Key className="w-4 h-4" />;
    default:
      return null;
  }
};

const Guests = () => {
  const { t, language } = useLanguage();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("q") || "");
  const [selectedLocation, setSelectedLocation] = useState(() => searchParams.get("location") || "all");
  const [selectedCapacity, setSelectedCapacity] = useState(() => searchParams.get("capacity") || "all");
  
  // Price filter
  const priceRange = useMemo(() => {
    const prices = properties.map(p => p.pricePerNight);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, []);
  
  const [priceFilter, setPriceFilter] = useState<[number, number]>(() => {
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    return [
      minPrice ? parseInt(minPrice) : priceRange.min,
      maxPrice ? parseInt(maxPrice) : priceRange.max
    ];
  });
  const isPriceFiltered = priceFilter[0] !== priceRange.min || priceFilter[1] !== priceRange.max;
  
  // Sort
  const [sortBy, setSortBy] = useState<"default" | "price-asc" | "price-desc" | "rating-desc">(() => {
    const sort = searchParams.get("sort");
    return (sort as typeof sortBy) || "default";
  });
  
  // Rating filter
  const [minRating, setMinRating] = useState<string>(() => searchParams.get("rating") || "all");

  // Sync state to URL
  const updateURL = useCallback(() => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.set("q", searchQuery);
    if (selectedLocation !== "all") params.set("location", selectedLocation);
    if (selectedCapacity !== "all") params.set("capacity", selectedCapacity);
    if (priceFilter[0] !== priceRange.min) params.set("minPrice", priceFilter[0].toString());
    if (priceFilter[1] !== priceRange.max) params.set("maxPrice", priceFilter[1].toString());
    if (sortBy !== "default") params.set("sort", sortBy);
    if (minRating !== "all") params.set("rating", minRating);
    
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedLocation, selectedCapacity, priceFilter, sortBy, minRating, priceRange, setSearchParams]);

  // Update URL when filters change
  useEffect(() => {
    updateURL();
  }, [updateURL]);

  // Share URL function
  const shareFilters = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(language === 'ro' ? 'Link copiat!' : 'Link copied!', {
        description: language === 'ro' ? 'Poți partaja acest link pentru a arăta căutarea ta.' : 'You can share this link to show your search.'
      });
    } catch {
      toast.error(language === 'ro' ? 'Eroare la copiere' : 'Failed to copy');
    }
  };

  // Scroll animations
  const { ref: heroRef, isVisible: heroVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: filtersRef, isVisible: filtersVisible } = useScrollAnimation({ threshold: 0.1 });
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.02 });
  const { ref: ctaRef, isVisible: ctaVisible } = useScrollAnimation({ threshold: 0.2 });

  const locations = useMemo(() => {
    const locs = [...new Set(properties.map(p => p.location))];
    return locs.sort();
  }, []);

  const filteredProperties = useMemo(() => {
    let result = properties.filter((property) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = property.name.toLowerCase().includes(query);
        const matchesLocation = property.location.toLowerCase().includes(query);
        if (!matchesName && !matchesLocation) return false;
      }
      
      if (selectedLocation !== "all" && property.location !== selectedLocation) {
        return false;
      }
      
      if (selectedCapacity !== "all") {
        const capacity = property.capacity;
        if (selectedCapacity === "1-2" && capacity > 2) return false;
        if (selectedCapacity === "3-4" && (capacity < 3 || capacity > 4)) return false;
        if (selectedCapacity === "5+" && capacity < 5) return false;
      }
      
      // Price filter
      if (property.pricePerNight < priceFilter[0] || property.pricePerNight > priceFilter[1]) {
        return false;
      }
      
      // Rating filter
      if (minRating !== "all" && property.rating < parseFloat(minRating)) {
        return false;
      }
      
      return true;
    });

    // Sort
    if (sortBy !== "default") {
      result = [...result].sort((a, b) => {
        switch (sortBy) {
          case "price-asc":
            return a.pricePerNight - b.pricePerNight;
          case "price-desc":
            return b.pricePerNight - a.pricePerNight;
          case "rating-desc":
            return b.rating - a.rating;
          default:
            return 0;
        }
      });
    }

    return result;
  }, [searchQuery, selectedLocation, selectedCapacity, priceFilter, sortBy, minRating]);

const hasActiveFilters = searchQuery || selectedLocation !== "all" || selectedCapacity !== "all" || isPriceFiltered || sortBy !== "default" || minRating !== "all";

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedLocation("all");
    setSelectedCapacity("all");
    setPriceFilter([priceRange.min, priceRange.max]);
    setSortBy("default");
    setMinRating("all");
    setSearchParams({}, { replace: true });
  };

  const handleToggleFavorite = (propertyId: string, propertyName: string) => {
    const wasFavorite = isFavorite(propertyId);
    toggleFavorite(propertyId);
    toast(wasFavorite ? t.portfolio.favorites.removed : t.portfolio.favorites.added, {
      description: propertyName,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 bg-gradient-to-b from-primary/10 to-background overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.1),transparent_70%)]" />
        {/* Floating decorations */}
        <div className="absolute top-40 left-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl animate-pulse" />
        <div className="absolute top-60 right-20 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/4 w-24 h-24 bg-primary/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div 
          ref={heroRef}
          className={`container mx-auto px-6 relative z-10 transition-all duration-1000 ${
            heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <div className="text-center max-w-3xl mx-auto">
            <div 
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 transition-all duration-700 ${
                heroVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
              style={{ transitionDelay: '200ms' }}
            >
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">
                ApArt Hotel
              </span>
            </div>
            <h1 
              className={`text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 transition-all duration-700 ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '300ms' }}
            >
              {language === 'ro' ? 'Găsește' : 'Find'}{' '}
              <span className="text-gradient-gold">
                {language === 'ro' ? 'Apartamentul Perfect' : 'Your Perfect Stay'}
              </span>
            </h1>
            <p 
              className={`text-lg text-muted-foreground mb-8 transition-all duration-700 ${
                heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: '400ms' }}
            >
              {language === 'ro' 
                ? 'Descoperă colecția noastră de apartamente premium în cele mai căutate zone din București. Rezervare directă, fără comisioane ascunse.'
                : 'Discover our collection of premium apartments in Bucharest\'s most sought-after locations. Direct booking, no hidden fees.'}
            </p>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section 
        ref={filtersRef}
        className={`py-8 border-b border-border bg-card/50 transition-all duration-700 ${
          filtersVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="container mx-auto px-6">
          <div 
            className={`flex flex-col md:flex-row gap-4 items-center justify-center transition-all duration-500 ${
              filtersVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{ transitionDelay: '150ms' }}
          >
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={language === 'ro' ? 'Caută apartamente...' : 'Search apartments...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 transition-shadow duration-300 focus:shadow-lg focus:shadow-primary/10"
              />
            </div>
            
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-full md:w-[180px] transition-shadow duration-300 hover:shadow-md">
                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={language === 'ro' ? 'Locație' : 'Location'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ro' ? 'Toate locațiile' : 'All locations'}</SelectItem>
                {locations.map((loc) => (
                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCapacity} onValueChange={setSelectedCapacity}>
              <SelectTrigger className="w-full md:w-[180px] transition-shadow duration-300 hover:shadow-md">
                <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={language === 'ro' ? 'Capacitate' : 'Capacity'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ro' ? 'Orice capacitate' : 'Any capacity'}</SelectItem>
                <SelectItem value="1-2">1-2 {language === 'ro' ? 'oaspeți' : 'guests'}</SelectItem>
                <SelectItem value="3-4">3-4 {language === 'ro' ? 'oaspeți' : 'guests'}</SelectItem>
                <SelectItem value="5+">5+ {language === 'ro' ? 'oaspeți' : 'guests'}</SelectItem>
              </SelectContent>
            </Select>

            {/* Rating Filter */}
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger className={`w-full md:w-[160px] transition-shadow duration-300 hover:shadow-md ${
                minRating !== "all" ? 'border-primary text-primary' : ''
              }`}>
                <Star className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ro' ? 'Orice rating' : 'Any rating'}</SelectItem>
                <SelectItem value="4.9">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-primary text-primary" /> 4.9+
                  </span>
                </SelectItem>
                <SelectItem value="4.8">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-primary text-primary" /> 4.8+
                  </span>
                </SelectItem>
                <SelectItem value="4.5">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-primary text-primary" /> 4.5+
                  </span>
                </SelectItem>
                <SelectItem value="4.0">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-primary text-primary" /> 4.0+
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Price Filter */}
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={`w-full md:w-[180px] justify-start transition-shadow duration-300 hover:shadow-md ${
                    isPriceFiltered ? 'border-primary text-primary' : ''
                  }`}
                >
                  <Euro className="w-4 h-4 mr-2 text-muted-foreground" />
                  {isPriceFiltered 
                    ? `€${priceFilter[0]} - €${priceFilter[1]}`
                    : (language === 'ro' ? 'Preț' : 'Price')
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 bg-popover border border-border" align="start">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm text-foreground">
                      {language === 'ro' ? 'Interval de preț' : 'Price range'}
                    </h4>
                    {isPriceFiltered && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setPriceFilter([priceRange.min, priceRange.max])}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                      >
                        {language === 'ro' ? 'Resetează' : 'Reset'}
                      </Button>
                    )}
                  </div>
                  
                  <div className="px-2">
                    <Slider
                      value={priceFilter}
                      onValueChange={(value) => setPriceFilter(value as [number, number])}
                      min={priceRange.min}
                      max={priceRange.max}
                      step={5}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Min</label>
                      <div className="flex items-center gap-1 px-3 py-2 rounded-md border border-input bg-background">
                        <Euro className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{priceFilter[0]}</span>
                      </div>
                    </div>
                    <div className="text-muted-foreground mt-4">—</div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1 block">Max</label>
                      <div className="flex items-center gap-1 px-3 py-2 rounded-md border border-input bg-background">
                        <Euro className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm font-medium">{priceFilter[1]}</span>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    {language === 'ro' ? 'per noapte' : 'per night'}
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className={`w-full md:w-[180px] transition-shadow duration-300 hover:shadow-md ${
                sortBy !== "default" ? 'border-primary text-primary' : ''
              }`}>
                <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder={language === 'ro' ? 'Sortare' : 'Sort'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  {language === 'ro' ? 'Implicit' : 'Default'}
                </SelectItem>
                <SelectItem value="price-asc">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    {language === 'ro' ? 'Preț crescător' : 'Price: Low to High'}
                  </span>
                </SelectItem>
                <SelectItem value="price-desc">
                  <span className="flex items-center gap-2">
                    <TrendingDown className="w-3 h-3" />
                    {language === 'ro' ? 'Preț descrescător' : 'Price: High to Low'}
                  </span>
                </SelectItem>
                <SelectItem value="rating-desc">
                  <span className="flex items-center gap-2">
                    <Star className="w-3 h-3" />
                    {language === 'ro' ? 'Rating' : 'Top Rated'}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            {/* Share search */}
            {hasActiveFilters && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={shareFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <Share2 className="w-4 h-4 mr-1" />
                {language === 'ro' ? 'Partajează' : 'Share'}
              </Button>
            )}

            {/* Clear all filters */}
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4 mr-1" />
                {language === 'ro' ? 'Șterge' : 'Clear'}
              </Button>
            )}
          </div>
          
          <div 
            className={`text-center mt-4 transition-all duration-500 ${
              filtersVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            <p className="text-sm text-muted-foreground">
              {language === 'ro' 
                ? `${filteredProperties.length} apartamente disponibile`
                : `${filteredProperties.length} apartments available`}
            </p>
          </div>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-16 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-20 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        
        <div ref={gridRef} className="container mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProperties.map((property, index) => (
              <article 
                key={property.id}
                className={`group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant hover:-translate-y-2 ${
                  gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: gridVisible ? `${index * 100}ms` : '0ms' }}
              >
                {/* Image Carousel */}
                <div className="relative">
                  <PropertyImageCarousel 
                    images={property.images} 
                    propertyName={property.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
                  
                  {/* Location badge */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center gap-1.5 z-20">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-medium text-foreground">{property.location}</span>
                  </div>

                  {/* Rating badge */}
                  <div className="absolute top-4 right-14 px-2.5 py-1.5 rounded-lg bg-primary/90 backdrop-blur-sm flex items-center gap-1 z-20">
                    <Star className="w-3.5 h-3.5 fill-primary-foreground text-primary-foreground" />
                    <span className="text-xs font-bold text-primary-foreground">{property.rating}</span>
                  </div>

                  {/* Favorite button */}
                  <button
                    onClick={() => handleToggleFavorite(String(property.id), property.name)}
                    className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 z-20 ${
                      isFavorite(String(property.id))
                        ? "bg-red-500 text-white"
                        : "bg-background/90 backdrop-blur-sm border border-border text-muted-foreground hover:text-red-500"
                    }`}
                    aria-label={isFavorite(String(property.id)) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-4 h-4 ${isFavorite(String(property.id)) ? "fill-current" : ""}`} />
                  </button>

                  {/* Price badge */}
                  <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border z-20">
                    <span className="text-lg font-bold text-primary">€{property.pricePerNight}</span>
                    <span className="text-xs text-muted-foreground ml-1">/{language === 'ro' ? 'noapte' : 'night'}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-xl font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {property.name}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {language === 'en' ? property.descriptionEn : property.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      {property.capacity} {language === 'ro' ? 'oaspeți' : 'guests'}
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                      <BedDouble className="w-3.5 h-3.5" />
                      {property.bedrooms} {property.bedrooms === 1 ? (language === 'ro' ? 'dormitor' : 'bedroom') : (language === 'ro' ? 'dormitoare' : 'bedrooms')}
                    </div>
                    {property.features.slice(0, 2).map((feature) => (
                      <div key={feature} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                        {getFeatureIcon(feature)}
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* Reviews */}
                  <p className="text-xs text-muted-foreground mb-4">
                    {property.reviews} {language === 'ro' ? 'recenzii' : 'reviews'}
                  </p>

                  {/* CTA Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(`https://www.airbnb.com/rooms/${property.id}`, '_blank')}
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      {language === 'ro' ? 'Rezervă Direct' : 'Book Direct'}
                    </Button>
                    <PrefetchLink to={`/proprietate/${property.slug}`} propertyId={String(property.id)}>
                      <Button variant="booking" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </PrefetchLink>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {filteredProperties.length === 0 && (
            <div className="text-center py-16">
              <Filter className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-serif font-semibold text-foreground mb-2">
                {language === 'ro' ? 'Niciun rezultat găsit' : 'No results found'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {language === 'ro' ? 'Încearcă să modifici filtrele' : 'Try adjusting your filters'}
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedLocation("all");
                  setSelectedCapacity("all");
                }}
              >
                {language === 'ro' ? 'Resetează filtrele' : 'Reset filters'}
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section 
        ref={ctaRef}
        className="py-20 bg-gradient-to-r from-primary/10 to-primary/5 relative overflow-hidden"
      >
        {/* Animated background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.15),transparent_70%)]" />
        <div className="absolute top-10 left-1/4 w-40 h-40 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div 
          className={`container mx-auto px-6 text-center relative z-10 transition-all duration-1000 ${
            ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
          }`}
        >
          <h2 
            className={`text-3xl md:text-4xl font-serif font-bold text-foreground mb-4 transition-all duration-700 ${
              ctaVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
            style={{ transitionDelay: '150ms' }}
          >
            {language === 'ro' ? 'Ai nevoie de ajutor?' : 'Need help?'}
          </h2>
          <p 
            className={`text-muted-foreground mb-8 max-w-xl mx-auto transition-all duration-700 ${
              ctaVisible ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ transitionDelay: '300ms' }}
          >
            {language === 'ro' 
              ? 'Contactează-ne pentru recomandări personalizate sau întrebări despre disponibilitate.'
              : 'Contact us for personalized recommendations or availability questions.'}
          </p>
          <a 
            href={`https://wa.me/40723154520?text=${encodeURIComponent(language === 'ro' ? 'Bună ziua! Sunt interesat de serviciile RealTrust & ApArt Hotel.' : 'Hello! I\'m interested in RealTrust & ApArt Hotel services.')}`}
            target="_blank" 
            rel="noopener noreferrer"
            className={`inline-block transition-all duration-700 ${
              ctaVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '450ms' }}
          >
            <Button variant="hero" size="lg" className="group/cta hover:shadow-glow transition-shadow duration-300">
              {language === 'ro' ? 'Contactează-ne pe WhatsApp' : 'Contact us on WhatsApp'}
              <ArrowRight className="w-5 h-5 ml-2 group-hover/cta:translate-x-1 transition-transform" />
            </Button>
          </a>
        </div>
      </section>

      <Footer />
      <FloatingWhatsApp />
      <AccessibilityPanel />
    </div>
  );
};

export default Guests;