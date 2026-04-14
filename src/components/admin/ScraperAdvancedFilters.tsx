import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdvancedFilters {
  priceMin: string;
  priceMax: string;
  surfaceMin: string;
  surfaceMax: string;
  rooms: string;
  floor: string;
  ownerType: string; // "all" | "proprietar" | "agentie" | "dezvoltator"
  zone: string;
}

export const EMPTY_FILTERS: AdvancedFilters = {
  priceMin: "", priceMax: "", surfaceMin: "", surfaceMax: "",
  rooms: "all", floor: "all", ownerType: "all", zone: "all",
};

const ZONE_OPTIONS = [
  { value: "all", label: "Toate zonele" },
  { value: "isho", label: "ISHO" },
  { value: "zona-aradului", label: "Zona Aradului" },
  { value: "zona-girocului", label: "Zona Girocului" },
  { value: "complex-studentesc", label: "Complex Studențesc" },
  { value: "sagului", label: "Șagului" },
  { value: "circumvalatiunii", label: "Circumvalațiunii" },
  { value: "calea-lipovei", label: "Calea Lipovei" },
];

const ROOMS_OPTIONS = [
  { value: "all", label: "Toate" },
  { value: "1", label: "1 cameră / Garsonieră" },
  { value: "2", label: "2 camere" },
  { value: "3", label: "3 camere" },
  { value: "4", label: "4+ camere" },
];

const FLOOR_OPTIONS = [
  { value: "all", label: "Toate" },
  { value: "0", label: "Parter" },
  { value: "1", label: "Etaj 1" },
  { value: "2", label: "Etaj 2" },
  { value: "3", label: "Etaj 3" },
  { value: "4", label: "Etaj 4+" },
];

interface Props {
  filters: AdvancedFilters;
  onChange: (filters: AdvancedFilters) => void;
  activeCount: number;
}

export function ScraperAdvancedFilters({ filters, onChange, activeCount }: Props) {
  const [open, setOpen] = useState(false);

  const update = (key: keyof AdvancedFilters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const reset = () => onChange({ ...EMPTY_FILTERS });

  const hasActive = activeCount > 0;

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 text-sm font-medium transition-colors",
          hasActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Filter className="w-4 h-4" />
        Filtre avansate
        {hasActive && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{activeCount}</Badge>
        )}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <Card className="mt-2 bg-card border-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Price range */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Preț minim (€)</label>
                <Input
                  type="number"
                  placeholder="ex: 50000"
                  value={filters.priceMin}
                  onChange={(e) => update("priceMin", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Preț maxim (€)</label>
                <Input
                  type="number"
                  placeholder="ex: 100000"
                  value={filters.priceMax}
                  onChange={(e) => update("priceMax", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Surface range */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Suprafață min (mp)</label>
                <Input
                  type="number"
                  placeholder="ex: 40"
                  value={filters.surfaceMin}
                  onChange={(e) => update("surfaceMin", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Suprafață max (mp)</label>
                <Input
                  type="number"
                  placeholder="ex: 80"
                  value={filters.surfaceMax}
                  onChange={(e) => update("surfaceMax", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>

              {/* Rooms */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nr. camere</label>
                <Select value={filters.rooms} onValueChange={(v) => update("rooms", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOMS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Floor */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Etaj</label>
                <Select value={filters.floor} onValueChange={(v) => update("floor", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FLOOR_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Owner type */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Privat / Firmă</label>
                <Select value={filters.ownerType} onValueChange={(v) => update("ownerType", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toate</SelectItem>
                    <SelectItem value="proprietar">🏠 Privat (Proprietar)</SelectItem>
                    <SelectItem value="agentie">🏢 Agenție</SelectItem>
                    <SelectItem value="dezvoltator">🏗️ Dezvoltator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Zone */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Zonă</label>
                <Select value={filters.zone} onValueChange={(v) => update("zone", v)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ZONE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {hasActive && (
              <div className="flex justify-end mt-3">
                <Button size="sm" variant="ghost" onClick={reset} className="gap-1.5 text-xs text-muted-foreground">
                  <X className="w-3 h-3" /> Resetează filtre
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Title parsing utilities ──────────────────────

/** Extract surface area (mp) from title string */
export function parseSurface(title: string): number | null {
  // Patterns: "50 mp", "50mp", "50 m²", "50m2", "suprafata 50"
  const m = title.match(/(\d{2,4})\s*(?:mp|m²|m2|metri\s*p)/i);
  if (m) return parseInt(m[1], 10);
  // fallback: "suprafata: 50"
  const m2 = title.match(/supraf[aă][tț][aă]\s*[:\-]?\s*(\d{2,4})/i);
  if (m2) return parseInt(m2[1], 10);
  return null;
}

/** Extract number of rooms from title */
export function parseRooms(title: string): number | null {
  const upper = title.toUpperCase();
  if (upper.includes("GARSONIER") || upper.includes("STUDIO")) return 1;
  // "2 camere", "3 cam", "apartament cu 2 camere"
  const m = title.match(/(\d)\s*(?:camere|cam\b)/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

/** Extract floor from title */
export function parseFloor(title: string): number | null {
  const upper = title.toUpperCase();
  if (upper.includes("PARTER")) return 0;
  // "etaj 3", "et. 2", "etajul 1"
  const m = title.match(/(?:etaj(?:ul)?|et\.?)\s*(\d{1,2})/i);
  if (m) return parseInt(m[1], 10);
  return null;
}

/** Count how many advanced filters are active */
export function countActiveFilters(f: AdvancedFilters): number {
  let c = 0;
  if (f.priceMin) c++;
  if (f.priceMax) c++;
  if (f.surfaceMin) c++;
  if (f.surfaceMax) c++;
  if (f.rooms !== "all") c++;
  if (f.floor !== "all") c++;
  if (f.ownerType !== "all") c++;
  if (f.zone !== "all") c++;
  return c;
}
