import { useLanguage } from "@/i18n/LanguageContext";
import {
  BedDouble, Bath, Maximize2, Users, Layers, Building2,
  Compass, Eye, Zap, Phone, Snowflake, Car, Flame,
  Leaf, Armchair, Warehouse, Wine, SquareStack, Euro,
  Receipt, Wrench, CalendarClock, Home, Building, Grid3X3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DbPropertySpecs {
  size?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  capacity?: number | null;
  floor?: string | null;
  year_built?: number | null;
  balconies?: number | null;
  terrace_area?: number | null;
  has_storage?: boolean | null;
  has_cellar?: boolean | null;
  orientation?: string | null;
  view_type?: string | null;
  has_elevator?: boolean | null;
  intercom_type?: string | null;
  has_ac?: boolean | null;
  usable_area?: number | null;
  built_area?: number | null;
  land_area?: number | null;
  price_per_sqm?: number | null;
  annual_tax?: number | null;
  monthly_maintenance?: number | null;
  renovation_year?: number | null;
  property_condition?: string | null;
  total_building_floors?: number | null;
  apartments_in_building?: number | null;
  parking?: string | null;
  heating_type?: string | null;
  energy_class?: string | null;
  furnished?: string | null;
  construction_type?: string | null;
  compartimentare?: string | null;
}

interface PropertyPremiumSpecsProps {
  specs: DbPropertySpecs;
  className?: string;
}

const PropertyPremiumSpecs = ({ specs, className }: PropertyPremiumSpecsProps) => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const conditionLabel = (c: string | null | undefined) => {
    if (!c) return null;
    const map: Record<string, { ro: string; en: string }> = {
      nou: { ro: "Nou", en: "New" },
      renovat: { ro: "Renovat", en: "Renovated" },
      de_renovat: { ro: "De renovat", en: "Needs renovation" },
      buna: { ro: "Stare bună", en: "Good condition" },
    };
    return map[c] ? (isRo ? map[c].ro : map[c].en) : c;
  };

  const orientationLabel = (o: string | null | undefined) => {
    if (!o) return null;
    const map: Record<string, string> = {
      N: isRo ? "Nord" : "North",
      S: isRo ? "Sud" : "South",
      E: isRo ? "Est" : "East",
      V: isRo ? "Vest" : "West",
      NE: isRo ? "Nord-Est" : "North-East",
      NV: isRo ? "Nord-Vest" : "North-West",
      SE: isRo ? "Sud-Est" : "South-East",
      SV: isRo ? "Sud-Vest" : "South-West",
    };
    return map[o] || o;
  };

  const viewLabel = (v: string | null | undefined) => {
    if (!v) return null;
    const map: Record<string, { ro: string; en: string }> = {
      strada: { ro: "Spre stradă", en: "Street view" },
      curte: { ro: "Spre curte", en: "Courtyard view" },
      parc: { ro: "Spre parc", en: "Park view" },
      panoramic: { ro: "Panoramic", en: "Panoramic" },
    };
    return map[v] ? (isRo ? map[v].ro : map[v].en) : v;
  };

  // Build spec items - only non-null values
  type SpecItem = {
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
  };

  const items: SpecItem[] = [];

  // Suprafețe
  if (specs.usable_area) items.push({ icon: <Maximize2 className="w-4 h-4" />, label: isRo ? "Suprafață utilă" : "Usable area", value: `${specs.usable_area} m²` });
  if (specs.built_area) items.push({ icon: <SquareStack className="w-4 h-4" />, label: isRo ? "Suprafață construită" : "Built area", value: `${specs.built_area} m²` });
  if (specs.size && !specs.usable_area) items.push({ icon: <Maximize2 className="w-4 h-4" />, label: isRo ? "Suprafață" : "Area", value: `${specs.size} m²` });
  if (specs.land_area) items.push({ icon: <Grid3X3 className="w-4 h-4" />, label: isRo ? "Suprafață teren" : "Land area", value: `${specs.land_area} m²` });

  // Camere
  if (specs.bedrooms) items.push({ icon: <BedDouble className="w-4 h-4" />, label: isRo ? "Dormitoare" : "Bedrooms", value: String(specs.bedrooms) });
  if (specs.bathrooms) items.push({ icon: <Bath className="w-4 h-4" />, label: isRo ? "Băi" : "Bathrooms", value: String(specs.bathrooms) });
  if (specs.capacity) items.push({ icon: <Users className="w-4 h-4" />, label: isRo ? "Capacitate" : "Capacity", value: `${specs.capacity} ${isRo ? "pers." : "pers."}` });
  if (specs.compartimentare) items.push({ icon: <Layers className="w-4 h-4" />, label: isRo ? "Compartimentare" : "Layout", value: specs.compartimentare });

  // Balcoane, terasă, boxă, pivniță
  if (specs.balconies && specs.balconies > 0) items.push({ icon: <Home className="w-4 h-4" />, label: isRo ? "Balcoane" : "Balconies", value: String(specs.balconies) });
  if (specs.terrace_area) items.push({ icon: <Home className="w-4 h-4" />, label: isRo ? "Terasă" : "Terrace", value: `${specs.terrace_area} m²` });
  if (specs.has_storage) items.push({ icon: <Warehouse className="w-4 h-4" />, label: isRo ? "Boxă subsol" : "Storage room", value: "✓" });
  if (specs.has_cellar) items.push({ icon: <Wine className="w-4 h-4" />, label: isRo ? "Pivniță" : "Cellar", value: "✓" });

  // Etaj, lift, bloc
  if (specs.floor) items.push({ icon: <Building2 className="w-4 h-4" />, label: isRo ? "Etaj" : "Floor", value: specs.total_building_floors ? `${specs.floor} / ${specs.total_building_floors}` : specs.floor });
  if (specs.has_elevator != null) items.push({ icon: <Building className="w-4 h-4" />, label: isRo ? "Lift" : "Elevator", value: specs.has_elevator ? "✓" : "✗" });
  if (specs.apartments_in_building) items.push({ icon: <Building2 className="w-4 h-4" />, label: isRo ? "Ap. în bloc" : "Apts in building", value: String(specs.apartments_in_building) });

  // Orientare, vedere
  if (specs.orientation) items.push({ icon: <Compass className="w-4 h-4" />, label: isRo ? "Orientare" : "Orientation", value: orientationLabel(specs.orientation)! });
  if (specs.view_type) items.push({ icon: <Eye className="w-4 h-4" />, label: isRo ? "Vedere" : "View", value: viewLabel(specs.view_type)! });

  // Dotări
  if (specs.has_ac != null) items.push({ icon: <Snowflake className="w-4 h-4" />, label: isRo ? "Aer condiționat" : "Air conditioning", value: specs.has_ac ? "✓" : "✗" });
  if (specs.intercom_type) items.push({ icon: <Phone className="w-4 h-4" />, label: isRo ? "Interfon" : "Intercom", value: specs.intercom_type === "videointerfon" ? (isRo ? "Videointerfon" : "Video intercom") : (isRo ? "Interfon" : "Intercom") });
  if (specs.parking) items.push({ icon: <Car className="w-4 h-4" />, label: isRo ? "Parcare" : "Parking", value: specs.parking });
  if (specs.heating_type) items.push({ icon: <Flame className="w-4 h-4" />, label: isRo ? "Încălzire" : "Heating", value: specs.heating_type });
  if (specs.energy_class) items.push({ icon: <Zap className="w-4 h-4" />, label: isRo ? "Clasă energetică" : "Energy class", value: specs.energy_class });
  if (specs.furnished) items.push({ icon: <Armchair className="w-4 h-4" />, label: isRo ? "Mobilare" : "Furnishing", value: specs.furnished });
  if (specs.construction_type) items.push({ icon: <Building2 className="w-4 h-4" />, label: isRo ? "Tip construcție" : "Construction type", value: specs.construction_type });

  // Stare & an
  if (specs.property_condition) items.push({ icon: <Home className="w-4 h-4" />, label: isRo ? "Stare imobil" : "Condition", value: conditionLabel(specs.property_condition)! });
  if (specs.year_built) items.push({ icon: <CalendarClock className="w-4 h-4" />, label: isRo ? "An construcție" : "Year built", value: String(specs.year_built) });
  if (specs.renovation_year) items.push({ icon: <Wrench className="w-4 h-4" />, label: isRo ? "Ultimă renovare" : "Last renovation", value: String(specs.renovation_year) });

  // Financiar
  if (specs.price_per_sqm) items.push({ icon: <Euro className="w-4 h-4" />, label: isRo ? "Preț / m²" : "Price / sqm", value: `€${specs.price_per_sqm.toLocaleString("ro-RO")}`, highlight: true });
  if (specs.annual_tax) items.push({ icon: <Receipt className="w-4 h-4" />, label: isRo ? "Impozit anual" : "Annual tax", value: `€${specs.annual_tax.toLocaleString("ro-RO")}` });
  if (specs.monthly_maintenance) items.push({ icon: <Receipt className="w-4 h-4" />, label: isRo ? "Întreținere / lună" : "Maintenance / mo", value: `€${specs.monthly_maintenance.toLocaleString("ro-RO")}` });

  if (items.length === 0) return null;

  return (
    <div className={cn("bg-card border border-border rounded-2xl p-5 sm:p-6", className)} itemScope itemType="https://schema.org/Accommodation">
      {/* Hidden structured data mirroring visible specs for crawlers */}
      {specs.usable_area && <meta itemProp="floorSize" content={`${specs.usable_area} m²`} />}
      {specs.size && !specs.usable_area && <meta itemProp="floorSize" content={`${specs.size} m²`} />}
      {specs.bedrooms && <meta itemProp="numberOfRooms" content={String(specs.bedrooms)} />}
      {specs.bathrooms && <meta itemProp="numberOfBathroomsTotal" content={String(specs.bathrooms)} />}
      {specs.capacity && <meta itemProp="occupancy" content={`${specs.capacity} guests`} />}
      {specs.floor && <meta itemProp="floorLevel" content={specs.floor} />}
      {specs.year_built && <meta itemProp="yearBuilt" content={String(specs.year_built)} />}
      {specs.energy_class && <meta itemProp="additionalProperty" content={`Energy Class: ${specs.energy_class}`} />}
      {specs.parking && <meta itemProp="amenityFeature" content={`Parking: ${specs.parking}`} />}
      {specs.has_ac && <meta itemProp="amenityFeature" content="Air Conditioning" />}
      {specs.has_elevator && <meta itemProp="amenityFeature" content="Elevator" />}
      <h3 className="text-lg font-serif font-semibold mb-4">
        {isRo ? "Specificații proprietate" : "Property specifications"}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors",
              item.highlight
                ? "bg-primary/5 border-primary/20"
                : "bg-muted/30 border-border"
            )}
          >
            <span className="text-primary shrink-0">{item.icon}</span>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{item.label}</p>
              <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyPremiumSpecs;
