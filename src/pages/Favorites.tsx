import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Trash2, MapPin, Star, Users, BedDouble, Calendar, Eye, GitCompare, Share2, FileDown, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import { useFavorites } from "@/hooks/useFavorites";
import { useSharedFavorites } from "@/hooks/useSharedFavorites";
import { properties, Property } from "@/data/properties";
import { toast } from "sonner";
import { exportFavoritesPdf } from "@/utils/exportFavoritesPdf";
import PropertyCompareModal from "@/components/PropertyCompareModal";
import BookingForm from "@/components/BookingForm";
import NotificationSettings from "@/components/NotificationSettings";
import { supabase } from "@/integrations/supabase/client";

const Favorites = () => {
  const { t, language } = useLanguage();
  const { favorites, toggleFavorite, clearFavorites } = useFavorites();
  const { copyShareableLink } = useSharedFavorites();
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | undefined>();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  const favoriteProperties = useMemo(() => {
    return properties.filter((p) => favorites.includes(String(p.id)));
  }, [favorites]);

  const compareProperties = useMemo(() => {
    return properties.filter((p) => selectedForCompare.includes(p.id));
  }, [selectedForCompare]);

  const handleRemoveFavorite = (propertyId: string, propertyName: string) => {
    toggleFavorite(propertyId);
    setSelectedForCompare((prev) => prev.filter((id) => id !== Number(propertyId)));
    toast(t.portfolio.favorites.removed, { description: propertyName });
  };

  const handleClearAll = () => {
    clearFavorites();
    setSelectedForCompare([]);
    toast.success(t.favorites.clearedAll);
  };

  const handleShareFavorites = async () => {
    const success = await copyShareableLink();
    if (success) {
      toast.success(t.portfolio.filters.linkCopied);
    }
  };

  const handleExportPdf = () => {
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

  const openBookingForm = (propertyName: string) => {
    setSelectedProperty(propertyName);
    setBookingOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t.favorites.backToHome}
                </Button>
              </Link>
              <h1 className="text-xl font-serif font-semibold">
                <Heart className="w-5 h-5 inline-block mr-2 text-red-500 fill-red-500" />
                {t.favorites.title} ({favoriteProperties.length})
              </h1>
            </div>

            {favoriteProperties.length > 0 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleShareFavorites}>
                  <Share2 className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">{t.portfolio.filters.shareLink}</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPdf}>
                  <FileDown className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
                {selectedForCompare.length >= 2 && (
                  <Button variant="default" size="sm" onClick={handleOpenCompare}>
                    <GitCompare className="w-4 h-4 mr-2" />
                    {t.portfolio.compare.button} ({selectedForCompare.length})
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {favoriteProperties.length === 0 ? (
          <div className="text-center py-20">
            <SearchX className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">
              {t.favorites.empty}
            </h2>
            <p className="text-muted-foreground mb-6">
              {t.favorites.emptyMessage}
            </p>
            <Link to="/#portofoliu">
              <Button variant="default">
                {t.favorites.browseProperties}
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Notification Settings for authenticated users */}
            {isAuthenticated && (
              <div className="mb-6">
                <NotificationSettings />
              </div>
            )}

            {/* Selection hint */}
            <div className="mb-6 p-4 bg-secondary/50 rounded-lg">
              <p className="text-sm text-muted-foreground text-center">
                {t.favorites.selectHint}
              </p>
            </div>

            {/* Property Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {favoriteProperties.map((property) => (
                <div
                  key={property.id}
                  className={`group bg-card rounded-2xl overflow-hidden border transition-all duration-300 ${
                    selectedForCompare.includes(property.id)
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <Link to={`/proprietate/${property.slug}`}>
                      <img
                        src={property.images[0]}
                        alt={property.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </Link>

                    {/* Location badge */}
                    <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span className="text-xs font-medium text-foreground">{property.location}</span>
                    </div>

                    {/* Rating badge */}
                    <div className="absolute top-4 right-14 px-2 py-1 rounded-lg bg-primary/90 backdrop-blur-sm flex items-center gap-1">
                      <Star className="w-3 h-3 fill-primary-foreground text-primary-foreground" />
                      <span className="text-xs font-bold text-primary-foreground">{property.rating}</span>
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveFavorite(String(property.id), property.name)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Compare selection overlay */}
                    <button
                      onClick={() => handleToggleCompare(property.id)}
                      className={`absolute inset-0 flex items-center justify-center transition-all ${
                        selectedForCompare.includes(property.id)
                          ? "bg-primary/20"
                          : "bg-transparent hover:bg-black/10"
                      }`}
                    >
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedForCompare.includes(property.id)
                            ? "bg-primary text-primary-foreground"
                            : "bg-background/90 text-foreground opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {selectedForCompare.includes(property.id)
                          ? t.favorites.selected
                          : t.favorites.selectToCompare}
                      </span>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <Link to={`/proprietate/${property.slug}`}>
                      <h3 className="text-lg font-serif font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {property.name}
                      </h3>
                    </Link>

                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {language === "en" ? property.descriptionEn : property.description}
                    </p>

                    <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {property.capacity} {t.portfolio.guests}
                      </span>
                      <span className="flex items-center gap-1">
                        <BedDouble className="w-4 h-4" />
                        {property.bedrooms} {property.bedrooms === 1 ? t.portfolio.bedroom : t.portfolio.bedrooms}
                      </span>
                    </div>

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
              ))}
            </div>

            {/* Clear all button */}
            <div className="text-center">
              <Button variant="ghost" onClick={handleClearAll} className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                {t.favorites.clearAll}
              </Button>
            </div>
          </>
        )}
      </main>

      {/* Compare Modal */}
      <PropertyCompareModal
        open={compareModalOpen}
        onOpenChange={setCompareModalOpen}
        properties={compareProperties}
        onRemoveProperty={handleRemoveFromCompare}
      />

      {/* Booking Form Modal */}
      <BookingForm
        isOpen={bookingOpen}
        onClose={() => setBookingOpen(false)}
        propertyName={selectedProperty}
      />
    </div>
  );
};

export default Favorites;