import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowRight } from "lucide-react";
import OptimizedImage from "@/components/OptimizedImage";

interface SimilarPropertiesProps {
  currentPropertyId?: string;
  location: string;
  listingType?: string | null;
  className?: string;
}

interface SimilarProperty {
  id: string;
  name: string;
  location: string;
  slug: string | null;
  image_path: string | null;
  base_price_per_night: number | null;
  capital_necesar: number | null;
  bedrooms: number | null;
  size: number | null;
  listing_type: string | null;
  tag: string | null;
}

const SimilarProperties = ({
  currentPropertyId,
  location,
  listingType,
  className = "",
}: SimilarPropertiesProps) => {
  const { language } = useLanguage();
  const [properties, setProperties] = useState<SimilarProperty[]>([]);

  useEffect(() => {
    const fetchSimilar = async () => {
      // Extract zone keyword from location
      const zoneKeywords = (location || "").split(/[,\-–·]/);
      const mainZone = zoneKeywords[0]?.trim() || "Timișoara";

      let query = supabase
        .from("properties")
        .select("id, name, location, slug, image_path, base_price_per_night, capital_necesar, bedrooms, size, listing_type, tag")
        .eq("is_active", true)
        .limit(6);

      if (currentPropertyId) {
        query = query.neq("id", currentPropertyId);
      }

      // Try to match by location keyword
      if (mainZone.length > 3) {
        query = query.ilike("location", `%${mainZone}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("SimilarProperties fetch error:", error);
        return;
      }

      let results = data || [];

      // If not enough results with zone filter, fetch any active properties
      if (results.length < 3) {
        const { data: fallback } = await supabase
          .from("properties")
          .select("id, name, location, slug, image_path, base_price_per_night, capital_necesar, bedrooms, size, listing_type, tag")
          .eq("is_active", true)
          .neq("id", currentPropertyId || "")
          .limit(4);

        if (fallback) {
          const existingIds = new Set(results.map((r) => r.id));
          results = [...results, ...fallback.filter((f) => !existingIds.has(f.id))].slice(0, 4);
        }
      }

      setProperties(results.slice(0, 4));
    };

    fetchSimilar();
  }, [currentPropertyId, location, listingType]);

  if (properties.length === 0) return null;

  const getImageUrl = (path: string | null) => {
    if (!path) return "/placeholder.svg";
    if (path.startsWith("http")) return path;
    // Local asset paths like /assets/apt-03.webp are in src/assets, not storage
    if (path.startsWith("/assets/")) return path;
    const { data } = supabase.storage.from("property-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const zoneKeywords = (location || "").split(/[,\-–·]/);
  const displayZone = zoneKeywords[0]?.trim() || "Timișoara";

  const t = language === "ro"
    ? {
        title: `Proprietăți Similare în ${displayZone}`,
        viewAll: "Vezi toate proprietățile",
        rooms: "camere",
      }
    : {
        title: `Similar Properties in ${displayZone}`,
        viewAll: "View all properties",
        rooms: "rooms",
      };

  return (
    <section className={`space-y-4 ${className}`} aria-label={t.title}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-serif font-semibold text-foreground">{t.title}</h2>
        </div>
        <Link
          to="/oaspeti"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          {t.viewAll} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {properties.map((prop) => {
          const href = prop.slug
            ? `/proprietate/${prop.slug}`
            : `/proprietate/${prop.id}`;
          const isRental = prop.listing_type === "inchiriere";
          const isSaleOrInvest = prop.listing_type === "vanzare" || prop.listing_type === "investitie";
          const price = isSaleOrInvest
            ? (prop.capital_necesar || prop.base_price_per_night)
            : isRental
              ? prop.capital_necesar
              : prop.base_price_per_night;
          const priceSuffix = isSaleOrInvest ? "" : isRental ? "/lună" : "/noapte";
          const priceLabel = price
            ? `€${price.toLocaleString("ro-RO")}${priceSuffix}`
            : null;

          return (
            <Link key={prop.id} to={href} className="group">
              <Card className="overflow-hidden hover:border-primary/30 transition-colors">
                <div className="relative aspect-[16/10] overflow-hidden">
                  <OptimizedImage
                    src={getImageUrl(prop.image_path)}
                    alt={`${prop.name} — ${prop.location}, Timișoara`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {prop.tag && (
                    <Badge className="absolute top-2 left-2 text-[10px]" variant="secondary">
                      {prop.tag}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                    {prop.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{prop.location}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-muted-foreground">
                      {prop.bedrooms && `${prop.bedrooms} ${t.rooms}`}
                      {prop.size && ` · ${prop.size} m²`}
                    </span>
                    {priceLabel && (
                      <span className="text-sm font-bold text-primary">{priceLabel}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default SimilarProperties;
