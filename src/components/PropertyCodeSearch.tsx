import { useState, useEffect, useRef } from "react";
import { Search, X, Home, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PropertyResult {
  id: string;
  name: string;
  property_code: string;
  location: string;
  listing_type: string | null;
}

interface PropertyCodeSearchProps {
  /** Optional classes applied to the trigger button (width, visibility, etc.) */
  className?: string;
}

const PropertyCodeSearch = ({ className }: PropertyCodeSearchProps) => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [results, setResults] = useState<PropertyResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const searchProperties = async () => {
      if (!searchValue.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("id, name, property_code, location, listing_type")
          .or(`property_code.ilike.%${searchValue}%,name.ilike.%${searchValue}%`)
          .eq("is_active", true)
          .limit(10);

        if (error) throw error;
        setResults(data || []);
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchProperties, 300);
    return () => clearTimeout(debounce);
  }, [searchValue]);

  const handleSelect = (property: PropertyResult) => {
    setOpen(false);
    setSearchValue("");
    navigate(`/proprietate/${property.id}`);
  };

  const getListingTypeLabel = (type: string | null) => {
    if (!type) return "";
    const labels: Record<string, { ro: string; en: string }> = {
      vanzare: { ro: "Vânzare", en: "Sale" },
      inchiriere: { ro: "Închiriere", en: "Rental" },
      cazare: { ro: "Cazare", en: "Accommodation" },
      investitie: { ro: "Investiție", en: "Investment" },
    };
    return labels[type]?.[language] || type;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between gap-2 bg-background/80 backdrop-blur-sm border-primary/20 hover:border-primary/40",
            className,
          )}
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground font-normal truncate">
            {language === "ro" ? "Caută după ID (ex: RT-001)" : "Search by ID (e.g., RT-001)"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={language === "ro" ? "ID sau nume proprietate..." : "Property ID or name..."}
              className="flex h-11 w-full border-0 bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {searchValue && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSearchValue("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                {language === "ro" ? "Se caută..." : "Searching..."}
              </div>
            ) : searchValue && results.length === 0 ? (
              <CommandEmpty>
                {language === "ro" ? "Nicio proprietate găsită." : "No property found."}
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {results.map((property) => (
                  <CommandItem
                    key={property.id}
                    value={property.id}
                    onSelect={() => handleSelect(property)}
                    className="flex items-center gap-3 p-3 cursor-pointer"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {property.property_code}
                        </span>
                        {property.listing_type && (
                          <span className="text-xs text-muted-foreground">
                            {getListingTypeLabel(property.listing_type)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{property.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{property.location}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          {!searchValue && (
            <div className="p-3 border-t bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                {language === "ro" 
                  ? "💡 Introdu codul (RT-001) sau numele proprietății" 
                  : "💡 Enter the code (RT-001) or property name"}
              </p>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default PropertyCodeSearch;
