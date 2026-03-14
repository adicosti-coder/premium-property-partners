import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface AISearchResult {
  id: string;
  name: string;
  slug: string | null;
  location: string;
  base_price_per_night: number | null;
  bedrooms: number | null;
  capacity: number | null;
  booking_rating: number | null;
  image_path: string | null;
  property_images?: { image_path: string; is_primary: boolean }[];
}

interface SearchMeta {
  parsed_filters: Record<string, unknown>;
  result_count: number;
  listing_type: string;
}

const AISearchBar = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AISearchResult[]>([]);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const t = {
    ro: {
      placeholder: "Caută cu AI — ex: 'apartament 2 camere lângă Iulius Mall cu parcare'",
      placeholderShort: "Caută cu AI...",
      searching: "Analizez cererea ta...",
      noResults: "Niciun rezultat găsit. Încearcă altă formulare.",
      results: "rezultate",
      perNight: "/noapte",
      viewDetails: "Vezi Detalii",
      aiPowered: "Căutare Inteligentă",
      guests: "oaspeți",
      bedrooms: "dormitoare",
    },
    en: {
      placeholder: "AI Search — e.g. 'bright 2-bedroom apartment near Iulius Mall with parking'",
      placeholderShort: "AI Search...",
      searching: "Analyzing your request...",
      noResults: "No results found. Try rephrasing.",
      results: "results",
      perNight: "/night",
      viewDetails: "View Details",
      aiPowered: "Smart Search",
      guests: "guests",
      bedrooms: "bedrooms",
    },
  };
  const txt = t[language] || t.ro;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < 3) {
        setResults([]);
        setMeta(null);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      setIsOpen(true);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "ai-property-search",
          {
            body: { query: searchQuery, language },
          }
        );

        if (fnError) throw fnError;

        setResults(data?.results || []);
        setMeta(data?.meta || null);
      } catch (err: any) {
        console.error("AI search error:", err);
        setError(
          language === "ro"
            ? "Eroare la căutare. Încearcă din nou."
            : "Search error. Please try again."
        );
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [language]
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setResults([]);
      setMeta(null);
      setIsOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => handleSearch(value), 800);
  };

  const handleResultClick = (property: AISearchResult) => {
    setIsOpen(false);
    setQuery("");
    const slug = property.slug || property.id;
    navigate(`/proprietate/${slug}`);
  };

  const getPropertyImage = (property: AISearchResult): string => {
    const primaryImage = property.property_images?.find((img) => img.is_primary);
    return primaryImage?.image_path || property.property_images?.[0]?.image_path || property.image_path || "/placeholder.svg";
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-2xl mx-auto">
      {/* Search Input */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
        <div className="relative flex items-center bg-card border border-border rounded-xl shadow-sm focus-within:shadow-md focus-within:border-primary/50 transition-all duration-200">
          <div className="flex items-center gap-1.5 pl-4 text-primary">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-medium uppercase tracking-wider hidden sm:inline">
              AI
            </span>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder={
              window.innerWidth < 640 ? txt.placeholderShort : txt.placeholder
            }
            className="flex-1 px-3 py-3.5 bg-transparent text-foreground placeholder:text-muted-foreground text-sm outline-none"
          />
          {isLoading ? (
            <Loader2 className="w-5 h-5 mr-3 text-primary animate-spin" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="mr-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <Search className="w-5 h-5 mr-3 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Results Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-[60vh] overflow-y-auto"
          >
            {isLoading && (
              <div className="flex items-center gap-3 px-4 py-6 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm">{txt.searching}</span>
              </div>
            )}

            {!isLoading && error && (
              <div className="px-4 py-6 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            {!isLoading && !error && results.length === 0 && query.length >= 3 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                {txt.noResults}
              </div>
            )}

            {!isLoading && results.length > 0 && (
              <>
                <div className="px-4 py-2 border-b border-border bg-muted/30">
                  <span className="text-xs font-medium text-muted-foreground">
                    {results.length} {txt.results}
                    {meta?.parsed_filters?.location && (
                      <span className="ml-2 text-primary">
                        📍 {meta.parsed_filters.location as string}
                      </span>
                    )}
                  </span>
                </div>
                {results.map((property) => (
                  <button
                    key={property.id}
                    onClick={() => handleResultClick(property)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/50 last:border-0"
                  >
                    <img
                      src={getPropertyImage(property)}
                      alt={property.name}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                      loading="lazy"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {property.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        📍 {property.location}
                        {property.bedrooms && (
                          <span className="ml-2">
                            🛏 {property.bedrooms} {txt.bedrooms}
                          </span>
                        )}
                        {property.capacity && (
                          <span className="ml-2">
                            👥 {property.capacity} {txt.guests}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {property.base_price_per_night && (
                        <p className="text-sm font-semibold text-primary">
                          €{property.base_price_per_night}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            {txt.perNight}
                          </span>
                        </p>
                      )}
                      {property.booking_rating && (
                        <p className="text-[10px] text-muted-foreground">
                          ⭐ {property.booking_rating}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AISearchBar;
