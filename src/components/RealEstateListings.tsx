import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Key, MapPin, ArrowRight } from "lucide-react";

interface ListingProperty {
  id: string;
  name: string;
  location: string;
  listing_type: string | null;
  capital_necesar: number | null;
  image_path: string | null;
  description_ro: string;
  description_en: string;
}

const RealEstateListings = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [listings, setListings] = useState<ListingProperty[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      const { data } = await supabase
        .from("properties")
        .select("id, name, location, listing_type, capital_necesar, image_path, description_ro, description_en")
        .in("listing_type", ["vanzare", "inchiriere"])
        .eq("is_active", true)
        .order("display_order");
      setListings(data || []);
      setLoading(false);
    };
    fetchListings();
  }, []);

  if (!loading && listings.length === 0) return null;

  const getImageUrl = (path: string | null) => {
    if (!path) return "/placeholder.svg";
    if (path.startsWith("http")) return path;
    const { data } = supabase.storage.from("property-images").getPublicUrl(path);
    return data?.publicUrl || "/placeholder.svg";
  };

  const getListingBadge = (type: string | null) => {
    if (type === "vanzare") return { label: language === "ro" ? "De Vânzare" : "For Sale", icon: Building2, variant: "default" as const };
    if (type === "inchiriere") return { label: language === "ro" ? "De Închiriat" : "For Rent", icon: Key, variant: "secondary" as const };
    return null;
  };

  const formatPrice = (price: number | null, type: string | null) => {
    if (!price) return null;
    if (type === "inchiriere") return `${price} €/${language === "ro" ? "lună" : "month"}`;
    return `${price.toLocaleString()} €`;
  };

  return (
    <section id="listings" className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
            {language === "ro" ? "Anunțuri Active" : "Active Listings"}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            {language === "ro" ? "Proprietăți Disponibile" : "Available Properties"}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {language === "ro"
              ? "Explorați ofertele noastre curente de vânzare și închiriere în Timișoara."
              : "Explore our current sale and rental offers in Timișoara."}
          </p>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-80 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((listing, index) => {
              const badge = getListingBadge(listing.listing_type);
              const price = formatPrice(listing.capital_necesar, listing.listing_type);
              const description = language === "ro" ? listing.description_ro : listing.description_en;

              return (
                <Card
                  key={listing.id}
                  className="group overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 cursor-pointer"
                  style={{ transitionDelay: `${index * 100}ms` }}
                  onClick={() => navigate(`/proprietati/${listing.id}`)}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={getImageUrl(listing.image_path)}
                      alt={listing.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    {badge && (
                      <Badge variant={badge.variant} className="absolute top-3 left-3">
                        <badge.icon className="w-3 h-3 mr-1" />
                        {badge.label}
                      </Badge>
                    )}
                    {price && (
                      <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                        <span className="text-sm font-bold text-foreground">{price}</span>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
                      {listing.name}
                    </h3>
                    {description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>Timișoara</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-primary p-0 h-auto">
                        {language === "ro" ? "Detalii" : "Details"}
                        <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default RealEstateListings;
