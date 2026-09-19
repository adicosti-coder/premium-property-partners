import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SlidersHorizontal, X, Search } from "lucide-react";
import {
  AMENITY_OPTIONS,
  FLOOR_OPTIONS,
  PARTITION_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  ROOM_OPTIONS,
  SORT_OPTIONS,
  TRANSACTION_OPTIONS,
  YEAR_OPTIONS,
  activeFilterCount,
  type PortalFilters,
  type SortValue,
} from "@/lib/portalSearch";
import { PORTAL_ZONE_LABELS } from "@/lib/timisoaraPortalZones";

const ANY = "__any__";

interface Props {
  filters: PortalFilters;
  onChange: (next: PortalFilters) => void;
  onReset: () => void;
  resultCount: number;
  /** Etichete în engleză pentru site-ul internațional. */
  english?: boolean;
}

/**
 * Bara de căutare cu tipologia marilor portaluri (OLX, Storia, imobiliare.ro,
 * Publi24): text liber, tranzacție, tip, camere, preț, suprafață, etaj,
 * compartimentare, an, dotări, zonă și sortare.
 */
export default function PortalSearchFilters({ filters, onChange, onReset, resultCount, english = false }: Props) {
  const [open, setOpen] = useState(false);
  const set = <K extends keyof PortalFilters>(key: K, value: PortalFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const toggle = (key: "types" | "rooms" | "partitions" | "amenities", value: string) =>
    onChange({
      ...filters,
      [key]: filters[key].includes(value)
        ? filters[key].filter((v) => v !== value)
        : [...filters[key], value],
    });

  const count = activeFilterCount(filters);
  const t = (ro: string, en: string) => (english ? en : ro);

  const chip = (active: boolean) =>
    `min-h-11 rounded-full px-4 text-sm border transition-colors ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background text-foreground border-border hover:border-primary/50"
    }`;

  return (
    <section
      aria-label={t("Căutare anunțuri", "Listing search")}
      className="bg-card border border-border rounded-2xl p-4 md:p-6 shadow-sm"
    >
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={filters.q}
            onChange={(e) => set("q", e.target.value)}
            placeholder={t(
              "Caută: 3 camere decomandat Dumbrăvița, penthouse Cetate…",
              "Search: 3 rooms, Dumbrăvița, penthouse…",
            )}
            aria-label={t("Caută în anunțuri", "Search listings")}
            className="pl-9 min-h-12"
          />
        </div>

        <Select
          value={filters.transaction || ANY}
          onValueChange={(v) => set("transaction", v === ANY ? "" : v)}
        >
          <SelectTrigger className="min-h-12 lg:w-52" aria-label={t("Tip tranzacție", "Transaction")}>
            <SelectValue placeholder={t("Tranzacție", "Transaction")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ANY}>{t("Orice tranzacție", "Any transaction")}</SelectItem>
            {TRANSACTION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.zone || ANY} onValueChange={(v) => set("zone", v === ANY ? "" : v)}>
          <SelectTrigger className="min-h-12 lg:w-52" aria-label={t("Zonă", "Area")}>
            <SelectValue placeholder={t("Zonă", "Area")} />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={ANY}>{t("Toate zonele", "All areas")}</SelectItem>
            {PORTAL_ZONE_LABELS.map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          className="min-h-12"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" aria-hidden="true" />
          {t("Filtre", "Filters")}
          {count > 0 && <Badge className="ml-2">{count}</Badge>}
        </Button>
      </div>

      {open && (
        <div className="mt-5 grid gap-5">
          <fieldset>
            <legend className="text-sm font-medium mb-2">{t("Tip imobil", "Property type")}</legend>
            <div className="flex flex-wrap gap-2">
              {PROPERTY_TYPE_OPTIONS.map((o) => (
                <button key={o.value} type="button" aria-pressed={filters.types.includes(o.value)}
                  className={chip(filters.types.includes(o.value))} onClick={() => toggle("types", o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium mb-2">{t("Camere", "Rooms")}</legend>
            <div className="flex flex-wrap gap-2">
              {ROOM_OPTIONS.map((o) => (
                <button key={o.value} type="button" aria-pressed={filters.rooms.includes(o.value)}
                  className={chip(filters.rooms.includes(o.value))} onClick={() => toggle("rooms", o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium mb-2">{t("Compartimentare", "Layout")}</legend>
            <div className="flex flex-wrap gap-2">
              {PARTITION_OPTIONS.map((o) => (
                <button key={o.value} type="button" aria-pressed={filters.partitions.includes(o.value)}
                  className={chip(filters.partitions.includes(o.value))} onClick={() => toggle("partitions", o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium mb-2">{t("Dotări", "Amenities")}</legend>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map((o) => (
                <button key={o.value} type="button" aria-pressed={filters.amenities.includes(o.value)}
                  className={chip(filters.amenities.includes(o.value))} onClick={() => toggle("amenities", o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-sm font-medium" htmlFor="ps-pmin">{t("Preț min (€)", "Min price (€)")}</label>
              <Input id="ps-pmin" inputMode="numeric" value={filters.minPrice}
                onChange={(e) => set("minPrice", e.target.value)} className="min-h-12 mt-1" placeholder="40000" />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="ps-pmax">{t("Preț max (€)", "Max price (€)")}</label>
              <Input id="ps-pmax" inputMode="numeric" value={filters.maxPrice}
                onChange={(e) => set("maxPrice", e.target.value)} className="min-h-12 mt-1" placeholder="150000" />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="ps-smin">{t("Suprafață min (mp)", "Min size (sqm)")}</label>
              <Input id="ps-smin" inputMode="numeric" value={filters.minSurface}
                onChange={(e) => set("minSurface", e.target.value)} className="min-h-12 mt-1" placeholder="45" />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="ps-smax">{t("Suprafață max (mp)", "Max size (sqm)")}</label>
              <Input id="ps-smax" inputMode="numeric" value={filters.maxSurface}
                onChange={(e) => set("maxSurface", e.target.value)} className="min-h-12 mt-1" placeholder="90" />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-sm font-medium">{t("Etaj", "Floor")}</label>
              <Select value={filters.floor || ANY} onValueChange={(v) => set("floor", v === ANY ? "" : v)}>
                <SelectTrigger className="min-h-12 mt-1"><SelectValue placeholder={t("Orice etaj", "Any floor")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>{t("Orice etaj", "Any floor")}</SelectItem>
                  {FLOOR_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("An construcție", "Year built")}</label>
              <Select value={filters.year || ANY} onValueChange={(v) => set("year", v === ANY ? "" : v)}>
                <SelectTrigger className="min-h-12 mt-1"><SelectValue placeholder={t("Orice an", "Any year")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>{t("Orice an", "Any year")}</SelectItem>
                  {YEAR_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{t("Sortare", "Sort")}</label>
              <Select value={filters.sort} onValueChange={(v) => set("sort", v as SortValue)}>
                <SelectTrigger className="min-h-12 mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {resultCount} {t("anunțuri care respectă filtrele", "listings match your filters")}
        </p>
        {count > 0 && (
          <Button type="button" variant="ghost" className="min-h-11" onClick={onReset}>
            <X className="w-4 h-4 mr-2" aria-hidden="true" />
            {t("Șterge filtrele", "Clear filters")}
          </Button>
        )}
      </div>
    </section>
  );
}
