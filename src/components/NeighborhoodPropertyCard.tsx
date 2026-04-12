import { Building2, Layers, Maximize, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { MockListing } from "@/data/neighborhoods";

const NeighborhoodPropertyCard = ({ listing }: { listing: MockListing }) => {
  const floorLabel = listing.floor === 0 ? 'Parter' : `Etaj ${listing.floor}`;

  return (
    <article className="group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all hover:shadow-lg">
      {/* Image placeholder */}
      <div className="relative h-48 bg-gradient-to-br from-muted/60 via-muted/40 to-muted/60 flex items-center justify-center">
        <Building2 className="w-10 h-10 text-muted-foreground/30" />
        <Badge
          className={`absolute top-3 left-3 text-xs font-semibold ${
            listing.badge === 'administrare'
              ? 'bg-primary text-primary-foreground'
              : 'bg-accent text-accent-foreground'
          }`}
        >
          {listing.badge === 'administrare' ? 'Administrare RealTrust' : 'Vânzare'}
        </Badge>
      </div>

      {/* Content */}
      <div className="p-5 space-y-3">
        <h3 className="font-semibold text-foreground text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {listing.title}
        </h3>

        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-primary">
            {listing.price.toLocaleString('ro-RO')} €
          </span>
          <span className="text-sm text-muted-foreground">
            {listing.pricePerSqm.toLocaleString('ro-RO')} €/mp
          </span>
        </div>

        {/* Specs */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            {listing.rooms} {listing.rooms === 1 ? 'cameră' : 'camere'}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {floorLabel}
          </span>
          <span className="flex items-center gap-1">
            <Maximize className="w-3.5 h-3.5" />
            {listing.surface} mp
          </span>
        </div>
      </div>

      {/* JSON-LD for each listing */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: listing.title,
            price: listing.price,
            priceCurrency: "EUR",
            floorSize: {
              "@type": "QuantitativeValue",
              value: listing.surface,
              unitCode: "MTK",
            },
            numberOfRooms: listing.rooms,
          }),
        }}
      />
    </article>
  );
};

export default NeighborhoodPropertyCard;
