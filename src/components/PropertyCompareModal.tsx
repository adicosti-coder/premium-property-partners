import { X, MapPin, Users, BedDouble, Star, Bath, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import { Property } from "@/data/properties";

interface PropertyCompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  properties: Property[];
  onRemoveProperty: (propertyId: number) => void;
}

const PropertyCompareModal = ({
  open,
  onOpenChange,
  properties,
  onRemoveProperty,
}: PropertyCompareModalProps) => {
  const { t, language } = useLanguage();

  if (properties.length === 0) return null;

  const compareRows = [
    {
      label: t.portfolio.compare.location,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-primary" />
          {p.location}
        </span>
      ),
    },
    {
      label: t.portfolio.compare.rating,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <Star className="w-4 h-4 fill-primary text-primary" />
          {p.rating} ({p.reviews} {t.portfolio.reviews})
        </span>
      ),
    },
    {
      label: t.portfolio.compare.capacity,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4 text-muted-foreground" />
          {p.capacity} {t.portfolio.guests}
        </span>
      ),
    },
    {
      label: t.portfolio.compare.bedrooms,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <BedDouble className="w-4 h-4 text-muted-foreground" />
          {p.bedrooms} {p.bedrooms === 1 ? t.portfolio.bedroom : t.portfolio.bedrooms}
        </span>
      ),
    },
    {
      label: t.portfolio.compare.bathrooms,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <Bath className="w-4 h-4 text-muted-foreground" />
          {p.bathrooms}
        </span>
      ),
    },
    {
      label: t.portfolio.compare.size,
      render: (p: Property) => (
        <span className="flex items-center gap-1">
          <Maximize className="w-4 h-4 text-muted-foreground" />
          {p.size} m²
        </span>
      ),
    },
    {
      label: t.portfolio.compare.checkIn,
      render: (p: Property) => p.checkInTime,
    },
    {
      label: t.portfolio.compare.checkOut,
      render: (p: Property) => p.checkOutTime,
    },
    {
      label: t.portfolio.filters.features,
      render: (p: Property) => (
        <div className="flex flex-wrap gap-1">
          {p.features.map((feature, idx) => (
            <span
              key={idx}
              className="inline-block px-2 py-0.5 rounded-md bg-secondary text-xs text-muted-foreground"
            >
              {feature}
            </span>
          ))}
        </div>
      ),
    },
    {
      label: t.portfolio.compare.amenities,
      render: (p: Property) => (
        <ul className="text-xs text-muted-foreground space-y-1">
          {(language === "en" ? p.amenitiesEn : p.amenities).slice(0, 5).map((amenity, idx) => (
            <li key={idx}>• {amenity}</li>
          ))}
          {p.amenities.length > 5 && (
            <li className="text-primary">+{p.amenities.length - 5} {t.portfolio.compare.more}</li>
          )}
        </ul>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-serif">
            {t.portfolio.compare.title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-100px)]">
          <div className="p-6 pt-4">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr>
                    <th className="text-left p-3 bg-secondary/50 rounded-tl-lg w-[140px] sticky left-0 z-10">
                      {t.portfolio.compare.property}
                    </th>
                    {properties.map((property) => (
                      <th
                        key={property.id}
                        className="text-left p-3 bg-secondary/50 min-w-[200px] last:rounded-tr-lg"
                      >
                        <div className="relative">
                          <button
                            onClick={() => onRemoveProperty(property.id)}
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors"
                          >
                            <X className="w-3 h-3 text-destructive" />
                          </button>
                          <img
                            src={property.images[0]}
                            alt={property.name}
                            className="w-full h-24 object-cover rounded-lg mb-2"
                          />
                          <p className="font-medium text-sm pr-6">{property.name}</p>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={rowIdx % 2 === 0 ? "bg-muted/30" : ""}
                    >
                      <td className="p-3 font-medium text-sm text-muted-foreground sticky left-0 bg-inherit">
                        {row.label}
                      </td>
                      {properties.map((property) => (
                        <td key={property.id} className="p-3 text-sm">
                          {row.render(property)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <div className="p-4 border-t border-border flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.portfolio.compare.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyCompareModal;