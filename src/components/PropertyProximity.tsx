import { MapPin, Clock, ShoppingCart, Train, Building2, Waves, TreePine, Utensils, GraduationCap, Landmark, Pill, Coffee } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { getPropertyPois, type GeoPoiCategory } from "@/utils/propertyGeo";

interface ProximityItem {
  labelRo: string;
  labelEn: string;
  minutes: number;
  mode: "walk" | "drive";
  category: GeoPoiCategory;
}

interface PropertyProximityProps {
  propertySlug?: string | null;
  propertyName?: string;
  propertyLocation?: string;
  propertyLatitude?: number | null;
  propertyLongitude?: number | null;
}

const categoryIcons: Record<GeoPoiCategory, React.ComponentType<{ className?: string }>> = {
  tourist: Landmark,
  restaurant: Utensils,
  supermarket: ShoppingCart,
  pharmacy: Pill,
  cafe: Coffee,
  park: TreePine,
  transport: Train,
  mall: Building2,
  bar: Waves,
};

const PropertyProximity = ({ propertySlug, propertyName, propertyLocation, propertyLatitude, propertyLongitude }: PropertyProximityProps) => {
  const { language } = useLanguage();
  const items: ProximityItem[] = getPropertyPois({
    slug: propertySlug,
    name: propertyName,
    location: propertyLocation,
    latitude: propertyLatitude,
    longitude: propertyLongitude,
  }).slice(0, 6).map((poi) => ({
    labelRo: poi.name,
    labelEn: poi.nameEn,
    minutes: poi.minutes,
    mode: poi.mode,
    category: poi.category,
  }));

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
        <MapPin className="w-6 h-6 text-primary" />
        {language === "ro" ? "Ce ai în apropiere" : "What's Nearby"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, index) => {
            const Icon = categoryIcons[item.category] || MapPin;
          const label = language === "ro" ? item.labelRo : item.labelEn;
          const modeLabel = item.mode === "walk"
            ? (language === "ro" ? "mers pe jos" : "walk")
            : (language === "ro" ? "cu mașina" : "drive");
          
          return (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/20 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{label}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.minutes} min {modeLabel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PropertyProximity;
