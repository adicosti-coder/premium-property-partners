import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Compass, Eye, Thermometer, Zap, ShieldCheck,
  Ruler, Euro, Calendar, Layers, ParkingCircle, Sofa,
} from "lucide-react";

export interface PremiumFieldsData {
  long_description_ro: string | null;
  long_description_en: string | null;
  balconies: number | null;
  terrace_area: number | null;
  has_storage: boolean | null;
  has_cellar: boolean | null;
  has_elevator: boolean | null;
  has_ac: boolean | null;
  orientation: string | null;
  view_type: string | null;
  intercom_type: string | null;
  usable_area: number | null;
  built_area: number | null;
  land_area: number | null;
  price_per_sqm: number | null;
  annual_tax: number | null;
  monthly_maintenance: number | null;
  renovation_year: number | null;
  property_condition: string | null;
  total_building_floors: number | null;
  apartments_in_building: number | null;
  floor: string | null;
  parking: string | null;
  heating_type: string | null;
  energy_class: string | null;
  furnished: string | null;
  construction_type: string | null;
  compartimentare: string | null;
}

export const defaultPremiumFields: PremiumFieldsData = {
  long_description_ro: null,
  long_description_en: null,
  balconies: null,
  terrace_area: null,
  has_storage: false,
  has_cellar: false,
  has_elevator: null,
  has_ac: null,
  orientation: null,
  view_type: null,
  intercom_type: null,
  usable_area: null,
  built_area: null,
  land_area: null,
  price_per_sqm: null,
  annual_tax: null,
  monthly_maintenance: null,
  renovation_year: null,
  property_condition: null,
  total_building_floors: null,
  apartments_in_building: null,
  floor: null,
  parking: null,
  heating_type: null,
  energy_class: null,
  furnished: null,
  construction_type: null,
  compartimentare: null,
};

interface Props {
  data: PremiumFieldsData;
  onChange: <K extends keyof PremiumFieldsData>(key: K, value: PremiumFieldsData[K]) => void;
}

export default function PropertyPremiumFields({ data, onChange }: Props) {
  return (
    <div className="space-y-6">
      {/* Despre Proprietate - Descrieri extinse */}
      <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Despre Proprietate (Descriere Extinsă)</h4>
        </div>
        <div className="space-y-2">
          <Label>Descriere detaliată (RO)</Label>
          <Textarea
            value={data.long_description_ro || ""}
            onChange={(e) => onChange("long_description_ro", e.target.value || null)}
            placeholder="Descriere completă în română..."
            rows={4}
          />
        </div>
        <div className="space-y-2">
          <Label>Descriere detaliată (EN)</Label>
          <Textarea
            value={data.long_description_en || ""}
            onChange={(e) => onChange("long_description_en", e.target.value || null)}
            placeholder="Detailed description in English..."
            rows={4}
          />
        </div>
      </div>

      {/* Caracteristici Generale */}
      <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Caracteristici Generale</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Nr. Camere</Label>
            <Input type="number" value={data.rooms ?? ""} onChange={(e) => onChange("rooms", e.target.value ? parseInt(e.target.value) : null)} placeholder="3" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nr. Bucătării</Label>
            <Input type="number" value={data.kitchens ?? ""} onChange={(e) => onChange("kitchens", e.target.value ? parseInt(e.target.value) : null)} placeholder="1" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Confort</Label>
            <Input value={data.comfort_level || ""} onChange={(e) => onChange("comfort_level", e.target.value || null)} placeholder="Lux, 1, 2, 3" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Compartimentare</Label>
            <Input value={data.compartimentare || ""} onChange={(e) => onChange("compartimentare", e.target.value || null)} placeholder="Decomandat, Semidecomandat..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tip Imobil</Label>
            <Input value={data.property_subtype || ""} onChange={(e) => onChange("property_subtype", e.target.value || null)} placeholder="Bloc, Casă, Vilă..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Destinație</Label>
            <Input value={data.destination || ""} onChange={(e) => onChange("destination", e.target.value || null)} placeholder="Rezidențial, Birouri..." />
          </div>
        </div>
      </div>

      {/* Suprafețe */}
      <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Ruler className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Suprafețe</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Suprafață utilă (m²)</Label>
            <Input type="number" value={data.usable_area ?? ""} onChange={(e) => onChange("usable_area", e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Suprafață construită (m²)</Label>
            <Input type="number" value={data.built_area ?? ""} onChange={(e) => onChange("built_area", e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Teren (m²)</Label>
            <Input type="number" value={data.land_area ?? ""} onChange={(e) => onChange("land_area", e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
        </div>
      </div>

      {/* Balcoane & Terase */}
      <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Balcoane, Terase & Orientare</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Nr. Balcoane</Label>
            <Input type="number" value={data.balconies ?? ""} onChange={(e) => onChange("balconies", e.target.value ? parseInt(e.target.value) : null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Suprafață Terasă (m²)</Label>
            <Input type="number" value={data.terrace_area ?? ""} onChange={(e) => onChange("terrace_area", e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Orientare</Label>
            <Input value={data.orientation || ""} onChange={(e) => onChange("orientation", e.target.value || null)} placeholder="Sud, Est, Nord-Vest..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Vedere</Label>
            <Input value={data.view_type || ""} onChange={(e) => onChange("view_type", e.target.value || null)} placeholder="Panoramică, Curte, Stradă..." />
          </div>
        </div>
      </div>

      {/* Clădire */}
      <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Clădire & Etaj</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Etaj</Label>
            <Input value={data.floor || ""} onChange={(e) => onChange("floor", e.target.value || null)} placeholder="3, Parter, Mansardă..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Total Etaje Clădire</Label>
            <Input type="number" value={data.total_building_floors ?? ""} onChange={(e) => onChange("total_building_floors", e.target.value ? parseInt(e.target.value) : null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Regim Înălțime</Label>
            <Input value={data.height_regime || ""} onChange={(e) => onChange("height_regime", e.target.value || null)} placeholder="P+2E, P+5E, D+P+M..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Nr. Apartamente Bloc</Label>
            <Input type="number" value={data.apartments_in_building ?? ""} onChange={(e) => onChange("apartments_in_building", e.target.value ? parseInt(e.target.value) : null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tip Construcție</Label>
            <Input value={data.construction_type || ""} onChange={(e) => onChange("construction_type", e.target.value || null)} placeholder="Cărămidă, BCA, Beton..." />
          </div>
        </div>
      </div>

      {/* Dotări */}
      <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Dotări & Facilități</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <Switch checked={data.has_elevator ?? false} onCheckedChange={(v) => onChange("has_elevator", v)} />
            <Label>Lift</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data.has_ac ?? false} onCheckedChange={(v) => onChange("has_ac", v)} />
            <Label>Aer Condiționat</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data.has_storage ?? false} onCheckedChange={(v) => onChange("has_storage", v)} />
            <Label>Boxă / Debara</Label>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={data.has_cellar ?? false} onCheckedChange={(v) => onChange("has_cellar", v)} />
            <Label>Pivniță</Label>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Interfon / Videointerfon</Label>
            <Input value={data.intercom_type || ""} onChange={(e) => onChange("intercom_type", e.target.value || null)} placeholder="Videointerfon, Interfon..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Parcare</Label>
            <Input value={data.parking || ""} onChange={(e) => onChange("parking", e.target.value || null)} placeholder="Garaj, Loc parcare, Curte..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mobilat</Label>
            <Input value={data.furnished || ""} onChange={(e) => onChange("furnished", e.target.value || null)} placeholder="Mobilat, Nemobilat, Partial..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Încălzire</Label>
            <Input value={data.heating_type || ""} onChange={(e) => onChange("heating_type", e.target.value || null)} placeholder="Centrală proprie, Termoficare..." />
          </div>
        </div>
      </div>

      {/* Stare & Investiție */}
      <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-4">
        <div className="flex items-center gap-2">
          <Euro className="w-5 h-5 text-primary" />
          <h4 className="font-semibold text-foreground">Stare Imobil & Costuri</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Stare Imobil</Label>
            <Input value={data.property_condition || ""} onChange={(e) => onChange("property_condition", e.target.value || null)} placeholder="Renovat, Nou, De renovat..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">An Renovare</Label>
            <Input type="number" value={data.renovation_year ?? ""} onChange={(e) => onChange("renovation_year", e.target.value ? parseInt(e.target.value) : null)} placeholder="2023" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Clasă Energetică</Label>
            <Input value={data.energy_class || ""} onChange={(e) => onChange("energy_class", e.target.value || null)} placeholder="A, B, C..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Preț / m² (€)</Label>
            <Input type="number" value={data.price_per_sqm ?? ""} onChange={(e) => onChange("price_per_sqm", e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Taxă Anuală (€)</Label>
            <Input type="number" value={data.annual_tax ?? ""} onChange={(e) => onChange("annual_tax", e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Întreținere Lunară (€)</Label>
            <Input type="number" value={data.monthly_maintenance ?? ""} onChange={(e) => onChange("monthly_maintenance", e.target.value ? parseFloat(e.target.value) : null)} />
          </div>
        </div>
      </div>
    </div>
  );
}
