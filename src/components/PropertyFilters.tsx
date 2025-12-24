import { useMemo } from "react";
import { MapPin, Users, Sparkles, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { properties } from "@/data/properties";

interface PropertyFiltersProps {
  searchQuery: string;
  selectedLocation: string;
  selectedCapacity: string;
  selectedFeature: string;
  onSearchChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onCapacityChange: (value: string) => void;
  onFeatureChange: (value: string) => void;
  onClearFilters: () => void;
}

const PropertyFilters = ({
  searchQuery,
  selectedLocation,
  selectedCapacity,
  selectedFeature,
  onSearchChange,
  onLocationChange,
  onCapacityChange,
  onFeatureChange,
  onClearFilters,
}: PropertyFiltersProps) => {
  const { t } = useLanguage();

  // Extract unique locations
  const locations = useMemo(() => {
    const uniqueLocations = [...new Set(properties.map((p) => p.location))];
    return uniqueLocations.sort();
  }, []);

  // Extract unique capacity ranges
  const capacityRanges = useMemo(() => {
    return [
      { value: "1-2", label: "1-2" },
      { value: "3-4", label: "3-4" },
      { value: "5+", label: "5+" },
    ];
  }, []);

  // Extract unique features
  const features = useMemo(() => {
    const allFeatures = properties.flatMap((p) => p.features);
    const uniqueFeatures = [...new Set(allFeatures)];
    return uniqueFeatures.sort();
  }, []);

  const hasActiveFilters = searchQuery !== "" || selectedLocation !== "all" || selectedCapacity !== "all" || selectedFeature !== "all";

  return (
    <div className="flex flex-col gap-4 mb-10">
      {/* Search Input */}
      <div className="flex justify-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t.portfolio.filters.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-10 bg-card border-border"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Dropdowns */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Location Filter */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedLocation} onValueChange={onLocationChange}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <SelectValue placeholder={t.portfolio.filters.location} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">{t.portfolio.filters.allLocations}</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Capacity Filter */}
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedCapacity} onValueChange={onCapacityChange}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue placeholder={t.portfolio.filters.capacity} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">{t.portfolio.filters.allCapacities}</SelectItem>
              {capacityRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label} {t.portfolio.guests}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Features Filter */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muted-foreground" />
          <Select value={selectedFeature} onValueChange={onFeatureChange}>
            <SelectTrigger className="w-[160px] bg-card border-border">
              <SelectValue placeholder={t.portfolio.filters.features} />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">{t.portfolio.filters.allFeatures}</SelectItem>
              {features.map((feature) => (
                <SelectItem key={feature} value={feature}>
                  {feature}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            {t.portfolio.filters.clearFilters}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PropertyFilters;