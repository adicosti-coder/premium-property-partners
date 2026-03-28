import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ViewingRequestModal from "@/components/ViewingRequestModal";
import { Building2, Key, MapPin, Maximize2, BedDouble, CalendarCheck, ArrowRight } from "lucide-react";

interface ListingProperty {
  id: string;
  slug: string | null;
  name: string;
  location: string;
  listing_type: string | null;
  capital_necesar: number | null;
  image_path: string | null;
  description_ro: string;
  description_en: string;
  size: number | null;
  bedrooms: number | null;
  property_images: { image_path: string; is_primary: boolean; display_order: number }[];
}

const RealEstateListings = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"vanzare" | "inchiriere">("vanzare");
  const [viewingModal, setViewingModal] = useState<{ open: boolean; name: string; id: string }>({ open: false, name: "", id: "" });

  const { data: listings, isLoading } = useQuery({
    queryKey: ["real-estate-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, slug, name, location, listing_type, capital_necesar, image_path, description_ro, description_en, size, bedrooms, property_images(image_path, is_primary, display_order)")
        .in("listing_type", ["vanzare", "inchiriere"])
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data || []) as ListingProperty[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const filtered = listings?.filter(l => l.listing_type === activeTab) || [];

  const t = language === "ro" ? {
    badge: "Anunțuri Active",
    title: "Proprietăți Disponibile",
    subtitle: "Explorați ofertele noastre curente de vânzare și închiriere în Timișoara.",
    tabSale: "Vânzări",
    tabRent: "Închirieri",
    size: "Suprafață",
    rooms: "Camere",
    price: "Preț",
    perMonth: "/lună",
    cta: "Programează o Vizionare",
    details: "Detalii",
    noResults: "Niciun anunț disponibil în această categorie.",
  } : {
    badge: "Active Listings",
    title: "Available Properties",
    subtitle: "Explore our current sale and rental offers in Timișoara.",
    tabSale: "For Sale",
    tabRent: "For Rent",
    size: "Area",
    rooms: "Rooms",
    price: "Price",
    perMonth: "/month",
    cta: "Schedule a Viewing",
    details: "Details",
    noResults: "No listings available in this category.",
  };

  const getImageUrl = (listing: ListingProperty) => {
    const path = listing.image_path ||
      listing.property_images?.find(i => i.is_primary)?.image_path ||
      listing.property_images?.[0]?.image_path;
    if (!path) return "/placeholder.svg";
    if (path.startsWith("http")) return path;
    return `https://mvzssjyzbwccioqvhjpo.supabase.co/storage/v1/object/public/property-images/${path}`;
  };

  const formatPrice = (price: number | null, type: string | null) => {
    if (!price) return null;
    const formatted = price.toLocaleString("ro-RO");
    if (type === "inchiriere") return `${formatted} €${t.perMonth}`;
    return `${formatted} €`;
  };

  return (
    <section id="listings" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
            {t.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
            {t.subtitle}
          </p>

          {/* Tabs */}
          <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-full">
            <button
              onClick={() => setActiveTab("vanzare")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === "vanzare"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Building2 className="w-4 h-4" />
              {t.tabSale}
            </button>
            <button
              onClick={() => setActiveTab("inchiriere")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeTab === "inchiriere"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Key className="w-4 h-4" />
              {t.tabRent}
            </button>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">{t.noResults}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filtered.map((listing) => {
              const price = formatPrice(listing.capital_necesar, listing.listing_type);
              const propertyPath = `/proprietate/${listing.slug ?? listing.id}`;

              return (
                <div
                  key={listing.id}
                  className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                  onClick={() => navigate(propertyPath)}
                >
                  {/* Image */}
                  <div className="relative h-52 overflow-hidden">
                    <img
                      src={getImageUrl(listing)}
                      alt={listing.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <Badge
                      variant={listing.listing_type === "vanzare" ? "default" : "secondary"}
                      className="absolute top-3 left-3"
                    >
                      {listing.listing_type === "vanzare" ? (
                        <><Building2 className="w-3 h-3 mr-1" />{language === "ro" ? "De Vânzare" : "For Sale"}</>
                      ) : (
                        <><Key className="w-3 h-3 mr-1" />{language === "ro" ? "De Închiriat" : "For Rent"}</>
                      )}
                    </Badge>
                    {price && (
                      <div className="absolute bottom-3 right-3 bg-card/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-sm">
                        <span className="text-sm font-bold text-foreground">{price}</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-lg font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {listing.name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                      <MapPin className="w-3 h-3" />
                      <span>{listing.location}</span>
                    </div>

                    {/* Specs Row */}
                    <div className="flex items-center gap-4 mb-5 pb-4 border-b border-border">
                      {listing.size && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground">{listing.size}</span> mp
                        </div>
                      )}
                      {listing.bedrooms && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <BedDouble className="w-3.5 h-3.5" />
                          <span className="font-medium text-foreground">{listing.bedrooms}</span> {t.rooms.toLowerCase()}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewingModal({ open: true, name: listing.name, id: listing.id });
                        }}
                      >
                        <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                        {t.cta}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(propertyPath);
                        }}
                      >
                        {t.details}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ViewingRequestModal
        open={viewingModal.open}
        onOpenChange={(open) => setViewingModal(prev => ({ ...prev, open }))}
        propertyName={viewingModal.name}
        propertyId={viewingModal.id}
      />
    </section>
  );
};

export default RealEstateListings;
