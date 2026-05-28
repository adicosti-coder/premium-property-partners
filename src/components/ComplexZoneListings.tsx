import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";
import WatermarkedImage from "@/components/WatermarkedImage";

interface Listing {
  id: string;
  name: string | null;
  slug: string | null;
  location: string | null;
  listing_type: string | null;
  base_price_per_night: number | null;
  size: number | null;
  rooms: number | null;
  images: any;
}

interface Props {
  complexName: string;
  zoneMatchers: string[];
  isRo: boolean;
}

/**
 * Loads recent approved (is_active=true) properties whose location/zone matches any of
 * the complex's zone keywords. Renders an SEO-friendly grid of internal links.
 */
export default function ComplexZoneListings({ complexName, zoneMatchers, isRo }: Props) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Build OR filter across `location` ilike for each matcher.
      const orClause = zoneMatchers
        .map((m) => `location.ilike.%${m}%`)
        .join(",");
      const { data } = await supabase
        .from("properties")
        .select("id,name,slug,location,listing_type,base_price_per_night,size,rooms,images")
        .eq("is_active", true)
        .or(orClause)
        .order("imported_at", { ascending: false, nullsFirst: false })
        .limit(6);
      if (!cancelled) {
        setListings((data as Listing[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [zoneMatchers.join("|")]);

  if (!loading && listings.length === 0) return null;

  return (
    <section className="py-16 bg-background" aria-labelledby={`zone-listings-${complexName}`}>
      <div className="container mx-auto px-6">
        <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h2 id={`zone-listings-${complexName}`} className="text-2xl md:text-3xl font-serif font-bold text-foreground">
              {isRo
                ? `Apartamente disponibile în ${complexName}, Timișoara`
                : `Available apartments in ${complexName}, Timișoara`}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isRo
                ? "Cele mai recente anunțuri verificate și aprobate de echipa RealTrust."
                : "The latest listings verified and approved by the RealTrust team."}
            </p>
          </div>
          <Link to="/proprietati">
            <Button variant="outline" size="sm" className="gap-1">
              {isRo ? "Vezi toate proprietățile" : "View all properties"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-48 rounded-lg bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {listings.map((l) => {
              const img = Array.isArray(l.images) ? l.images[0] : null;
              const href = l.slug ? `/proprietate/${l.slug}` : "/proprietati";
              const priceLabel = l.listing_type === "vanzare"
                ? null
                : l.base_price_per_night
                ? `${l.base_price_per_night} EUR/${l.listing_type === "inchiriere" ? (isRo ? "lună" : "mo") : (isRo ? "noapte" : "night")}`
                : null;
              return (
                <Link key={l.id} to={href} className="group">
                  <Card className="overflow-hidden border-border/50 transition-shadow hover:shadow-md h-full">
                    {img && (
                      <WatermarkedImage
                        src={img}
                        alt={`${l.name || complexName} — ${l.location || "Timișoara"}`}
                        width={640}
                        height={360}
                        watermark
                        imgClassName="group-hover:scale-105"
                      />
                    )}
                    <CardContent className="pt-4 space-y-1">
                      <h3 className="font-medium text-foreground line-clamp-1">{l.name || complexName}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span className="line-clamp-1">{l.location || "Timișoara"}</span>
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex gap-1 flex-wrap">
                          {l.rooms ? <Badge variant="secondary" className="text-xs">{l.rooms} {isRo ? "cam" : "rm"}</Badge> : null}
                          {l.size ? <Badge variant="secondary" className="text-xs">{l.size}m²</Badge> : null}
                        </div>
                        {priceLabel && <span className="text-sm font-semibold text-primary">{priceLabel}</span>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
