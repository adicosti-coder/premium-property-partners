import { MapPin, Clock, ShoppingCart, Train, Building2, Waves, TreePine, Utensils, GraduationCap, Landmark } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface ProximityItem {
  icon: React.ComponentType<{ className?: string }>;
  labelRo: string;
  labelEn: string;
  minutes: number;
  mode: "walk" | "drive";
}

const vivaliaProximity: ProximityItem[] = [
  { icon: Building2, labelRo: "Iulius Town", labelEn: "Iulius Town", minutes: 5, mode: "walk" },
  { icon: Utensils, labelRo: "Restaurante & cafenele Take Ionescu", labelEn: "Take Ionescu restaurants & cafés", minutes: 4, mode: "walk" },
  { icon: ShoppingCart, labelRo: "Profi / supermarket", labelEn: "Profi / supermarket", minutes: 3, mode: "walk" },
  { icon: GraduationCap, labelRo: "UVT Oituz", labelEn: "West University Oituz campus", minutes: 6, mode: "walk" },
  { icon: Landmark, labelRo: "Bastion / Centru vechi", labelEn: "Bastion / Old Town", minutes: 6, mode: "drive" },
  { icon: Train, labelRo: "Stații tramvai Take Ionescu", labelEn: "Take Ionescu tram stops", minutes: 4, mode: "walk" },
];

/**
 * Proximity data per property slug.
 * Distances recalculated 2026-03-05 using verified GPS coordinates
 * from PropertyNeighborhoodMap + known POI positions in Timișoara.
 * Formula: straight-line distance × 1.3 road factor.
 * Walk ≈ 12 min/km, city drive ≈ 2.5 min/km.
 */
const proximityData: Record<string, ProximityItem[]> = {
  /* ── Ring Apart Hotel [21.2110, 45.7805] — North, Calea Aradului ── */
  "ring-apart-hotel-spacious-deluxe": [
    { icon: Landmark,      labelRo: "Centrul Vechi",        labelEn: "Old Town Center",          minutes: 10, mode: "drive" },
    { icon: ShoppingCart,   labelRo: "Lidl Supermarket",     labelEn: "Lidl Supermarket",         minutes: 3,  mode: "walk" },
    { icon: Waves,          labelRo: "Aquapark Amazonia",    labelEn: "Amazonia Aquapark",        minutes: 12, mode: "drive" },
    { icon: Building2,      labelRo: "Iulius Town Mall",     labelEn: "Iulius Town Mall",         minutes: 5,  mode: "drive" },
    { icon: Train,          labelRo: "Gara de Nord",         labelEn: "North Railway Station",    minutes: 11, mode: "drive" },
    { icon: TreePine,       labelRo: "Parcul Rozelor",       labelEn: "Rose Park",                minutes: 7,  mode: "drive" },
  ],

  /* ── Green Forest [21.2490, 45.7785] — East, near Pădurea Verde ── */
  "green-forest-apart-hotel": [
    { icon: Waves,          labelRo: "Aquapark Amazonia",    labelEn: "Amazonia Aquapark",        minutes: 11, mode: "walk" },
    { icon: ShoppingCart,   labelRo: "Lidl Supermarket",     labelEn: "Lidl Supermarket",         minutes: 5,  mode: "walk" },
    { icon: Landmark,       labelRo: "Centrul Vechi",        labelEn: "Old Town Center",          minutes: 9,  mode: "drive" },
    { icon: Building2,      labelRo: "Iulius Town Mall",     labelEn: "Iulius Town Mall",         minutes: 6,  mode: "drive" },
    { icon: Train,          labelRo: "Gara de Nord",         labelEn: "North Railway Station",    minutes: 14, mode: "drive" },
    { icon: TreePine,       labelRo: "Pădurea Verde",        labelEn: "Green Forest Park",        minutes: 12, mode: "walk" },
  ],

  /* ── Fructus Plaza [21.2209, 45.7595] — Near center ── */
  "fructus-plaza-ultracentral-apart-hotel": [
    { icon: Landmark,       labelRo: "Piața Unirii",         labelEn: "Union Square",             minutes: 10, mode: "walk" },
    { icon: Landmark,       labelRo: "Piața Victoriei",      labelEn: "Victory Square",           minutes: 12, mode: "walk" },
    { icon: ShoppingCart,   labelRo: "Supermarket (Penny)",  labelEn: "Supermarket (Penny)",      minutes: 2,  mode: "walk" },
    { icon: Utensils,       labelRo: "Restaurante Centru",   labelEn: "Downtown Restaurants",     minutes: 5,  mode: "walk" },
    { icon: Train,          labelRo: "Gara de Nord",         labelEn: "North Railway Station",    minutes: 5,  mode: "drive" },
    { icon: Building2,      labelRo: "Iulius Town Mall",     labelEn: "Iulius Town Mall",         minutes: 4,  mode: "drive" },
  ],

  /* ── Fullview Studio [21.2150, 45.7529] — South-central ── */
  "fullview-studio-deluxe": [
    { icon: Landmark,       labelRo: "Centrul Vechi",        labelEn: "Old Town Center",          minutes: 18, mode: "walk" },
    { icon: ShoppingCart,   labelRo: "Lidl Supermarket",     labelEn: "Lidl Supermarket",         minutes: 2,  mode: "walk" },
    { icon: Building2,      labelRo: "Iulius Town Mall",     labelEn: "Iulius Town Mall",         minutes: 7,  mode: "drive" },
    { icon: Train,          labelRo: "Gara de Nord",         labelEn: "North Railway Station",    minutes: 3,  mode: "drive" },
    { icon: Waves,          labelRo: "Aquapark Amazonia",    labelEn: "Amazonia Aquapark",        minutes: 14, mode: "drive" },
    { icon: Utensils,       labelRo: "Restaurante & Cafenele", labelEn: "Restaurants & Cafés",    minutes: 5,  mode: "walk" },
  ],

  /* ── Avenue of Mara [21.2148, 45.7527] — Same area as Fullview ── */
  "avenue-of-mara-apart-hotel": [
    { icon: Landmark,       labelRo: "Centrul Vechi",        labelEn: "Old Town Center",          minutes: 18, mode: "walk" },
    { icon: ShoppingCart,   labelRo: "Lidl Supermarket",     labelEn: "Lidl Supermarket",         minutes: 2,  mode: "walk" },
    { icon: Building2,      labelRo: "Iulius Town Mall",     labelEn: "Iulius Town Mall",         minutes: 7,  mode: "drive" },
    { icon: Train,          labelRo: "Gara de Nord",         labelEn: "North Railway Station",    minutes: 3,  mode: "drive" },
    { icon: Waves,          labelRo: "Aquapark Amazonia",    labelEn: "Amazonia Aquapark",        minutes: 14, mode: "drive" },
    { icon: Utensils,       labelRo: "Restaurante & Cafenele", labelEn: "Restaurants & Cafés",    minutes: 5,  mode: "walk" },
  ],

  /* ── Helios [21.2345, 45.7433] — South Timișoara ── */
  "helios-apart-hotel": [
    { icon: Landmark,       labelRo: "Centrul Vechi",        labelEn: "Old Town Center",          minutes: 25, mode: "walk" },
    { icon: ShoppingCart,   labelRo: "Kaufland Supermarket", labelEn: "Kaufland Supermarket",     minutes: 5,  mode: "walk" },
    { icon: TreePine,       labelRo: "Parcul Civic",         labelEn: "Civic Park",               minutes: 7,  mode: "walk" },
    { icon: Train,          labelRo: "Gara de Nord",         labelEn: "North Railway Station",    minutes: 7,  mode: "drive" },
    { icon: Building2,      labelRo: "Iulius Town Mall",     labelEn: "Iulius Town Mall",         minutes: 10, mode: "drive" },
    { icon: GraduationCap,  labelRo: "Universitatea de Vest", labelEn: "West University",         minutes: 9,  mode: "walk" },
  ],

  /* ── Ateneo Trevi 2 [21.2113, 45.7786] — North, same area as Ring ── */
  "ateneo-trevi-2-apart-hotel": [
    { icon: ShoppingCart,   labelRo: "Lidl Supermarket",     labelEn: "Lidl Supermarket",         minutes: 2,  mode: "walk" },
    { icon: Waves,          labelRo: "Aquapark Amazonia",    labelEn: "Amazonia Aquapark",        minutes: 12, mode: "drive" },
    { icon: Landmark,       labelRo: "Centrul Vechi",        labelEn: "Old Town Center",          minutes: 9,  mode: "drive" },
    { icon: Building2,      labelRo: "Iulius Town Mall",     labelEn: "Iulius Town Mall",         minutes: 5,  mode: "drive" },
    { icon: Train,          labelRo: "Gara de Nord",         labelEn: "North Railway Station",    minutes: 11, mode: "drive" },
    { icon: TreePine,       labelRo: "Zona Verde Rezidențială", labelEn: "Green Residential Area", minutes: 1,  mode: "walk" },
  ],

  /* ── Sunset Da Ra [21.2145, 45.7530] — Same area as Fullview ── */
  "sunset-da-ra-studio-deluxe": [
    { icon: Landmark,       labelRo: "Centrul Vechi",        labelEn: "Old Town Center",          minutes: 18, mode: "walk" },
    { icon: ShoppingCart,   labelRo: "Lidl Supermarket",     labelEn: "Lidl Supermarket",         minutes: 2,  mode: "walk" },
    { icon: Building2,      labelRo: "Iulius Town Mall",     labelEn: "Iulius Town Mall",         minutes: 7,  mode: "drive" },
    { icon: Train,          labelRo: "Gara de Nord",         labelEn: "North Railway Station",    minutes: 3,  mode: "drive" },
    { icon: Waves,          labelRo: "Aquapark Amazonia",    labelEn: "Amazonia Aquapark",        minutes: 14, mode: "drive" },
    { icon: Utensils,       labelRo: "Restaurante & Cafenele", labelEn: "Restaurants & Cafés",    minutes: 5,  mode: "walk" },
  ],

  /* ── Ateneo Studio Deluxe [21.2115, 45.7788] — Same area as Trevi 2 ── */
  "ateneo-apart-hotel-studio-deluxe": [
    { icon: ShoppingCart,   labelRo: "Lidl Supermarket",     labelEn: "Lidl Supermarket",         minutes: 2,  mode: "walk" },
    { icon: Waves,          labelRo: "Aquapark Amazonia",    labelEn: "Amazonia Aquapark",        minutes: 12, mode: "drive" },
    { icon: Landmark,       labelRo: "Centrul Vechi",        labelEn: "Old Town Center",          minutes: 9,  mode: "drive" },
    { icon: Building2,      labelRo: "Iulius Town Mall",     labelEn: "Iulius Town Mall",         minutes: 5,  mode: "drive" },
    { icon: Train,          labelRo: "Gara de Nord",         labelEn: "North Railway Station",    minutes: 11, mode: "drive" },
    { icon: TreePine,       labelRo: "Zona Verde Rezidențială", labelEn: "Green Residential Area", minutes: 1,  mode: "walk" },
  ],

  /* ── Modern Studio [21.2603, 45.7656] — East Timișoara ── */
  "modern-studio-apart-hotel": [
    { icon: Waves,          labelRo: "Aquapark Amazonia",    labelEn: "Amazonia Aquapark",        minutes: 4,  mode: "drive" },
    { icon: ShoppingCart,   labelRo: "Lidl Supermarket",     labelEn: "Lidl Supermarket",         minutes: 3,  mode: "walk" },
    { icon: GraduationCap,  labelRo: "Spitalul Județean",    labelEn: "County Hospital",          minutes: 5,  mode: "walk" },
    { icon: Landmark,       labelRo: "Centrul Vechi",        labelEn: "Old Town Center",          minutes: 8,  mode: "drive" },
    { icon: Building2,      labelRo: "Iulius Town Mall",     labelEn: "Iulius Town Mall",         minutes: 9,  mode: "drive" },
    { icon: Train,          labelRo: "Gara de Nord",         labelEn: "North Railway Station",    minutes: 14, mode: "drive" },
  ],
  "apartament-1-5-camere-43-5-m2-4-5-m2-ext-vivalia-v6-full-mobilat-la-comanda": vivaliaProximity,
  "apartament-2-camere-vivalia-parter-parcare-terasa-mare-iulius-mall": vivaliaProximity,
  "ideal-investitie-utilat-complet-mobilat": vivaliaProximity,
};

interface PropertyProximityProps {
  propertySlug: string;
}

/** Default proximity for properties without specific data (Timișoara center) */
const defaultProximity: ProximityItem[] = [
  { icon: Landmark,       labelRo: "Centrul Vechi (Piața Unirii)", labelEn: "Old Town (Union Square)", minutes: 8,  mode: "drive" },
  { icon: ShoppingCart,   labelRo: "Supermarket",                  labelEn: "Supermarket",             minutes: 5,  mode: "walk" },
  { icon: Building2,      labelRo: "Iulius Town Mall",             labelEn: "Iulius Town Mall",        minutes: 8,  mode: "drive" },
  { icon: Train,          labelRo: "Gara de Nord",                 labelEn: "North Railway Station",   minutes: 10, mode: "drive" },
  { icon: Waves,          labelRo: "Aquapark Amazonia",            labelEn: "Amazonia Aquapark",       minutes: 12, mode: "drive" },
  { icon: Utensils,       labelRo: "Restaurante & Cafenele",       labelEn: "Restaurants & Cafés",     minutes: 5,  mode: "walk" },
];

const PropertyProximity = ({ propertySlug }: PropertyProximityProps) => {
  const { language } = useLanguage();
  const items = proximityData[propertySlug] || defaultProximity;

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
