import { MapPin, Clock, ShoppingCart, Train, Building2, Waves, TreePine, Utensils, GraduationCap, Landmark } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface ProximityItem {
  icon: React.ComponentType<{ className?: string }>;
  labelRo: string;
  labelEn: string;
  minutes: number;
  mode: "walk" | "drive";
}

// Proximity data per property slug
const proximityData: Record<string, ProximityItem[]> = {
  "ring-apart-hotel-spacious-deluxe": [
    { icon: Landmark, labelRo: "Centrul Vechi", labelEn: "Old Town Center", minutes: 10, mode: "walk" },
    { icon: ShoppingCart, labelRo: "Lidl Supermarket", labelEn: "Lidl Supermarket", minutes: 3, mode: "walk" },
    { icon: Waves, labelRo: "Aquapark Amazonia", labelEn: "Amazonia Aquapark", minutes: 5, mode: "drive" },
    { icon: Building2, labelRo: "Iulius Town Mall", labelEn: "Iulius Town Mall", minutes: 8, mode: "drive" },
    { icon: Train, labelRo: "Gara de Nord", labelEn: "North Railway Station", minutes: 10, mode: "drive" },
    { icon: TreePine, labelRo: "Parcul Rozelor", labelEn: "Rose Park", minutes: 12, mode: "walk" },
  ],
  "green-forest-apart-hotel": [
    { icon: Waves, labelRo: "Aquapark Amazonia", labelEn: "Amazonia Aquapark", minutes: 2, mode: "walk" },
    { icon: ShoppingCart, labelRo: "Lidl Supermarket", labelEn: "Lidl Supermarket", minutes: 3, mode: "walk" },
    { icon: Landmark, labelRo: "Centrul Vechi", labelEn: "Old Town Center", minutes: 12, mode: "drive" },
    { icon: Building2, labelRo: "Iulius Town Mall", labelEn: "Iulius Town Mall", minutes: 10, mode: "drive" },
    { icon: Train, labelRo: "Gara de Nord", labelEn: "North Railway Station", minutes: 15, mode: "drive" },
    { icon: TreePine, labelRo: "Pădurea Verde", labelEn: "Green Forest Park", minutes: 5, mode: "walk" },
  ],
  "fructus-plaza-ultracentral-apart-hotel": [
    { icon: Landmark, labelRo: "Piața Unirii", labelEn: "Union Square", minutes: 5, mode: "walk" },
    { icon: Landmark, labelRo: "Piața Victoriei", labelEn: "Victory Square", minutes: 7, mode: "walk" },
    { icon: ShoppingCart, labelRo: "Supermarket (Penny)", labelEn: "Supermarket (Penny)", minutes: 2, mode: "walk" },
    { icon: Utensils, labelRo: "Restaurante Centru", labelEn: "Downtown Restaurants", minutes: 5, mode: "walk" },
    { icon: Train, labelRo: "Gara de Nord", labelEn: "North Railway Station", minutes: 8, mode: "drive" },
    { icon: Building2, labelRo: "Iulius Town Mall", labelEn: "Iulius Town Mall", minutes: 10, mode: "drive" },
  ],
  "fullview-studio-deluxe": [
    { icon: Landmark, labelRo: "Centrul Vechi", labelEn: "Old Town Center", minutes: 8, mode: "walk" },
    { icon: ShoppingCart, labelRo: "Lidl Supermarket", labelEn: "Lidl Supermarket", minutes: 2, mode: "walk" },
    { icon: Building2, labelRo: "Iulius Town Mall", labelEn: "Iulius Town Mall", minutes: 5, mode: "drive" },
    { icon: Train, labelRo: "Gara de Nord", labelEn: "North Railway Station", minutes: 5, mode: "drive" },
    { icon: Waves, labelRo: "Aquapark Amazonia", labelEn: "Amazonia Aquapark", minutes: 8, mode: "drive" },
    { icon: Utensils, labelRo: "Restaurante & Cafenele", labelEn: "Restaurants & Cafés", minutes: 3, mode: "walk" },
  ],
  "avenue-of-mara-apart-hotel": [
    { icon: Landmark, labelRo: "Centrul Vechi", labelEn: "Old Town Center", minutes: 8, mode: "walk" },
    { icon: ShoppingCart, labelRo: "Lidl Supermarket", labelEn: "Lidl Supermarket", minutes: 2, mode: "walk" },
    { icon: Building2, labelRo: "Iulius Town Mall", labelEn: "Iulius Town Mall", minutes: 5, mode: "drive" },
    { icon: Train, labelRo: "Gara de Nord", labelEn: "North Railway Station", minutes: 5, mode: "drive" },
    { icon: Waves, labelRo: "Aquapark Amazonia", labelEn: "Amazonia Aquapark", minutes: 8, mode: "drive" },
    { icon: Utensils, labelRo: "Restaurante & Cafenele", labelEn: "Restaurants & Cafés", minutes: 3, mode: "walk" },
  ],
  "helios-apart-hotel": [
    { icon: Landmark, labelRo: "Centrul Vechi", labelEn: "Old Town Center", minutes: 10, mode: "walk" },
    { icon: ShoppingCart, labelRo: "Kaufland Supermarket", labelEn: "Kaufland Supermarket", minutes: 4, mode: "walk" },
    { icon: TreePine, labelRo: "Parcul Civic", labelEn: "Civic Park", minutes: 5, mode: "walk" },
    { icon: Train, labelRo: "Gara de Nord", labelEn: "North Railway Station", minutes: 8, mode: "drive" },
    { icon: Building2, labelRo: "Iulius Town Mall", labelEn: "Iulius Town Mall", minutes: 10, mode: "drive" },
    { icon: GraduationCap, labelRo: "Universitatea de Vest", labelEn: "West University", minutes: 8, mode: "walk" },
  ],
  "ateneo-trevi-2-apart-hotel": [
    { icon: ShoppingCart, labelRo: "Lidl Supermarket", labelEn: "Lidl Supermarket", minutes: 2, mode: "walk" },
    { icon: Waves, labelRo: "Aquapark Amazonia", labelEn: "Amazonia Aquapark", minutes: 5, mode: "drive" },
    { icon: Landmark, labelRo: "Centrul Vechi", labelEn: "Old Town Center", minutes: 12, mode: "drive" },
    { icon: Building2, labelRo: "Iulius Town Mall", labelEn: "Iulius Town Mall", minutes: 8, mode: "drive" },
    { icon: Train, labelRo: "Gara de Nord", labelEn: "North Railway Station", minutes: 12, mode: "drive" },
    { icon: TreePine, labelRo: "Zona Verde Rezidențială", labelEn: "Green Residential Area", minutes: 1, mode: "walk" },
  ],
  "sunset-da-ra-studio-deluxe": [
    { icon: Landmark, labelRo: "Centrul Vechi", labelEn: "Old Town Center", minutes: 8, mode: "walk" },
    { icon: ShoppingCart, labelRo: "Lidl Supermarket", labelEn: "Lidl Supermarket", minutes: 2, mode: "walk" },
    { icon: Building2, labelRo: "Iulius Town Mall", labelEn: "Iulius Town Mall", minutes: 5, mode: "drive" },
    { icon: Train, labelRo: "Gara de Nord", labelEn: "North Railway Station", minutes: 5, mode: "drive" },
    { icon: Waves, labelRo: "Aquapark Amazonia", labelEn: "Amazonia Aquapark", minutes: 8, mode: "drive" },
    { icon: Utensils, labelRo: "Restaurante & Cafenele", labelEn: "Restaurants & Cafés", minutes: 3, mode: "walk" },
  ],
  "ateneo-apart-hotel-studio-deluxe": [
    { icon: ShoppingCart, labelRo: "Lidl Supermarket", labelEn: "Lidl Supermarket", minutes: 2, mode: "walk" },
    { icon: Waves, labelRo: "Aquapark Amazonia", labelEn: "Amazonia Aquapark", minutes: 5, mode: "drive" },
    { icon: Landmark, labelRo: "Centrul Vechi", labelEn: "Old Town Center", minutes: 12, mode: "drive" },
    { icon: Building2, labelRo: "Iulius Town Mall", labelEn: "Iulius Town Mall", minutes: 8, mode: "drive" },
    { icon: Train, labelRo: "Gara de Nord", labelEn: "North Railway Station", minutes: 12, mode: "drive" },
    { icon: TreePine, labelRo: "Zona Verde Rezidențială", labelEn: "Green Residential Area", minutes: 1, mode: "walk" },
  ],
  "modern-studio-apart-hotel": [
    { icon: Waves, labelRo: "Aquapark Amazonia", labelEn: "Amazonia Aquapark", minutes: 3, mode: "walk" },
    { icon: ShoppingCart, labelRo: "Lidl Supermarket", labelEn: "Lidl Supermarket", minutes: 3, mode: "walk" },
    { icon: GraduationCap, labelRo: "Spitalul Județean", labelEn: "County Hospital", minutes: 5, mode: "walk" },
    { icon: Landmark, labelRo: "Centrul Vechi", labelEn: "Old Town Center", minutes: 12, mode: "drive" },
    { icon: Building2, labelRo: "Iulius Town Mall", labelEn: "Iulius Town Mall", minutes: 10, mode: "drive" },
    { icon: Train, labelRo: "Gara de Nord", labelEn: "North Railway Station", minutes: 10, mode: "drive" },
  ],
};

interface PropertyProximityProps {
  propertySlug: string;
}

const PropertyProximity = ({ propertySlug }: PropertyProximityProps) => {
  const { language } = useLanguage();
  const items = proximityData[propertySlug];

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-serif font-semibold flex items-center gap-2">
        <MapPin className="w-6 h-6 text-primary" />
        {language === "ro" ? "Ce ai în apropiere" : "What's Nearby"}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, index) => {
          const Icon = item.icon;
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
