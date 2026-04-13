import { Building2, Layers, Maximize, MapPin, TrendingUp, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import ImageWithFallback from "@/components/ImageWithFallback";
import type { NeighborhoodProperty } from "@/hooks/useNeighborhoodProperties";
import { resolvePropertyImageUrl } from "@/utils/resolvePropertyImageUrl";

function getImageUrl(property: NeighborhoodProperty): string | null {
  const propertyImages = [...(property.property_images ?? [])]
    .filter((image): image is NonNullable<NeighborhoodProperty["property_images"]>[number] & { image_path: string } => Boolean(image.image_path?.trim()))
    .sort(
      (a, b) =>
        Number(Boolean(b.is_primary)) - Number(Boolean(a.is_primary)) ||
        (a.display_order ?? Number.MAX_SAFE_INTEGER) - (b.display_order ?? Number.MAX_SAFE_INTEGER)
    )
    .map((image) => image.image_path.trim());

  const candidates = [...propertyImages, ...(property.images ?? []), property.image_path]
    .filter((image): image is string => Boolean(image && image.trim()))
    .map((image) => image.trim())
    .filter((image, index, array) => array.indexOf(image) === index);

  for (const candidate of candidates) {
    const resolved = resolvePropertyImageUrl(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

function parseFloor(floor: string | null): string {
  if (!floor) return "";
  if (floor === "0" || floor.toLowerCase() === "parter") return "Parter";
  return `Etaj ${floor}`;
}

export default function RealPropertyCard({ property }: { property: NeighborhoodProperty }) {
  const imageUrl = getImageUrl(property);
  const floorLabel = parseFloor(property.floor);
  const price = property.capital_necesar || (property.price_per_sqm && property.size ? property.price_per_sqm * property.size : null);
  const isInvestment = property.listing_type === "investitie";
  const roi = property.roi_percentage;
  const detailUrl = property.slug ? `/proprietate/${property.slug}` : `/proprietate/${property.id}`;

  return (
    <Link to={detailUrl} className="group block">
      <article className="bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all hover:shadow-xl hover:-translate-y-0.5 duration-300">
        {/* Image */}
        <div className="relative h-48 bg-gradient-to-br from-muted/60 via-muted/40 to-muted/60 overflow-hidden">
          {imageUrl ? (
            <ImageWithFallback
              src={imageUrl}
              alt={property.name}
              className="w-full h-full group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              fallbackType="gradient"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}

          {/* Badge */}
          <Badge
            className={`absolute top-3 left-3 text-[10px] font-bold ${
              isInvestment
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-accent-foreground"
            }`}
          >
            {isInvestment ? "🔥 Investiție" : "Vânzare"}
          </Badge>

          {/* ROI badge */}
          {roi && (
            <Badge className="absolute top-3 right-3 bg-emerald-600 text-white text-[10px] font-bold">
              ROI {roi}
            </Badge>
          )}

          {/* Rating */}
          {property.booking_rating && (
            <div className="absolute bottom-3 right-3 bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1">
              ⭐ {property.booking_rating}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {property.name}
          </h3>

          {/* Price */}
          {price && (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-primary">
                {price.toLocaleString("ro-RO")} €
              </span>
              {property.price_per_sqm && (
                <span className="text-xs text-muted-foreground">
                  {property.price_per_sqm.toLocaleString("ro-RO")} €/mp
                </span>
              )}
            </div>
          )}

          {/* Specs */}
          <div className="flex flex-wrap gap-2.5 text-xs text-muted-foreground">
            {property.bedrooms != null && (
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3" />
                {property.bedrooms} {property.bedrooms === 1 ? "cameră" : "camere"}
              </span>
            )}
            {floorLabel && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {floorLabel}
              </span>
            )}
            {property.size && (
              <span className="flex items-center gap-1">
                <Maximize className="w-3 h-3" />
                {property.size} mp
              </span>
            )}
          </div>

          {/* Estimated revenue */}
          {property.estimated_revenue && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1.5 rounded-md">
              <TrendingUp className="w-3 h-3" />
              Venit estimat: {property.estimated_revenue}
            </div>
          )}

          {/* CTA link */}
          <div className="flex items-center gap-1 text-xs font-semibold text-primary pt-1">
            <ExternalLink className="w-3 h-3" />
            Vezi detalii complete
          </div>
        </div>
      </article>
    </Link>
  );
}
