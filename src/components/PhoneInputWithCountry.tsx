import { useState, useEffect, useRef, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Check, X, ChevronDown, MapPin, Loader2, Info } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { 
  detectCountryFromPhone, 
  getDefaultCountry, 
  countries, 
  CountryInfo,
  formatInternationalPhone,
  validatePhoneForCountry,
  regions,
  CountryRegion
} from "@/utils/phoneCountryDetector";
import { useGeoCountryDetection } from "@/hooks/useGeoCountryDetection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PhoneInputWithCountryProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  required?: boolean;
  autoDetectLocation?: boolean;
}

const PhoneInputWithCountry = ({
  value,
  onChange,
  placeholder,
  error,
  className = "",
  inputClassName = "",
  id,
  required = false,
  autoDetectLocation = true,
}: PhoneInputWithCountryProps) => {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(getDefaultCountry());
  const [searchQuery, setSearchQuery] = useState("");
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-detect country from geolocation
  const geoDetection = useGeoCountryDetection();

  // Set initial country from geolocation (only if user hasn't manually selected)
  useEffect(() => {
    if (autoDetectLocation && !geoDetection.isLoading && !hasUserSelected && !value) {
      setSelectedCountry(geoDetection.country);
    }
  }, [geoDetection.isLoading, geoDetection.country, autoDetectLocation, hasUserSelected, value]);

  // Auto-detect country from phone number (overrides geolocation)
  useEffect(() => {
    const detected = detectCountryFromPhone(value);
    if (detected && detected.code !== selectedCountry.code) {
      setSelectedCountry(detected);
    }
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCountrySelect = (country: CountryInfo) => {
    setSelectedCountry(country);
    setHasUserSelected(true);
    setIsOpen(false);
    setSearchQuery("");
    
    // Replace the prefix in the current value
    const cleanValue = value.replace(/[^\d]/g, "");
    const currentCountryDigits = selectedCountry.prefix.replace(/\D/g, "");
    
    let digitsWithoutPrefix = cleanValue;
    if (cleanValue.startsWith(currentCountryDigits)) {
      digitsWithoutPrefix = cleanValue.slice(currentCountryDigits.length);
    }
    
    // Format with new country prefix
    onChange(formatInternationalPhone(`${country.prefix}${digitsWithoutPrefix}`, country));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const detected = detectCountryFromPhone(newValue);
    const countryToUse = detected || selectedCountry;
    
    // Format the phone number
    const formatted = formatInternationalPhone(newValue, countryToUse);
    onChange(formatted);
  };

  // Handle paste from clipboard with automatic formatting
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    const pastedText = e.clipboardData.getData('text');
    
    // Clean the pasted text - keep only digits and + sign
    const cleanedText = pastedText.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, try to add the current country prefix
    let phoneToFormat = cleanedText;
    if (!cleanedText.startsWith('+') && cleanedText.length > 0) {
      // Check if it might be a local number (starts with 0 or just digits)
      if (cleanedText.startsWith('0')) {
        // Remove leading 0 and add country prefix
        phoneToFormat = selectedCountry.prefix + cleanedText.slice(1);
      } else {
        // Assume it's a local number without prefix
        phoneToFormat = selectedCountry.prefix + cleanedText;
      }
    }
    
    // Detect country from the formatted number
    const detected = detectCountryFromPhone(phoneToFormat);
    if (detected) {
      setSelectedCountry(detected);
    }
    
    // Format and set the value
    const countryToUse = detected || selectedCountry;
    const formatted = formatInternationalPhone(phoneToFormat, countryToUse);
    onChange(formatted);
  };

  // Get detection source label
  const getDetectionLabel = () => {
    if (geoDetection.isLoading) {
      return language === 'en' ? 'Detecting location...' : 'Se detectează locația...';
    }
    if (!hasUserSelected && !value && geoDetection.source === 'ip') {
      return language === 'en' ? 'Auto-detected from your location' : 'Detectat automat din locația ta';
    }
    return null;
  };

  // Filter countries based on search query
  const filteredCountries = useMemo(() => {
    if (!searchQuery) return countries;
    
    const query = searchQuery.toLowerCase();
    return countries.filter(country => 
      country.name.toLowerCase().includes(query) ||
      country.nameEn.toLowerCase().includes(query) ||
      country.prefix.includes(query) ||
      country.code.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group filtered countries by region
  const groupedCountries = useMemo(() => {
    const grouped = new Map<CountryRegion, CountryInfo[]>();
    
    for (const region of regions) {
      const regionCountries = filteredCountries.filter(c => c.region === region.key);
      if (regionCountries.length > 0) {
        grouped.set(region.key, regionCountries);
      }
    }
    
    return grouped;
  }, [filteredCountries]);

  // Flat list of all filtered countries for keyboard navigation
  const flatCountryList = useMemo(() => {
    const list: CountryInfo[] = [];
    for (const [, regionCountries] of groupedCountries) {
      list.push(...regionCountries);
    }
    return list;
  }, [groupedCountries]);

  // Reset highlighted index when search query changes or dropdown opens/closes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchQuery, isOpen]);

  // Handle keyboard navigation in dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const PAGE_SIZE = 10;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < flatCountryList.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : flatCountryList.length - 1
        );
        break;
      case 'PageDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          Math.min(prev + PAGE_SIZE, flatCountryList.length - 1)
        );
        break;
      case 'PageUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          Math.max(prev - PAGE_SIZE, 0)
        );
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(flatCountryList.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < flatCountryList.length) {
          handleCountrySelect(flatCountryList[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery("");
        buttonRef.current?.focus();
        break;
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [highlightedIndex]);

  // International validation
  const isValid = validatePhoneForCountry(value, selectedCountry);
  const hasValue = value && value.length > 3;

  // Dynamic placeholder based on selected country
  const dynamicPlaceholder = placeholder || `${selectedCountry.prefix} ${'X'.repeat(selectedCountry.phoneLength).replace(/(.{3})/g, '$1 ').trim()}`;

  // Generate example format for tooltip
  const getExampleFormat = () => {
    const exampleDigits = '123456789012'.slice(0, selectedCountry.phoneLength);
    const formatted = exampleDigits.replace(/(.{3})/g, '$1 ').trim();
    return `${selectedCountry.prefix} ${formatted}`;
  };

  // Get region name
  const getRegionName = (key: CountryRegion): string => {
    const region = regions.find(r => r.key === key);
    return region ? (language === 'en' ? region.nameEn : region.nameRo) : key;
  };

  return (
    <TooltipProvider>
      <div className={`space-y-2 ${className}`}>
        <div className="relative flex">
          {/* Country Selector Button with Tooltip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1 px-3 py-2 border border-r-0 rounded-l-md bg-muted/50 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0"
                aria-label={language === 'en' ? 'Select country' : 'Selectează țara'}
              >
                {geoDetection.isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <span className="text-lg">{selectedCountry.flag}</span>
                )}
                <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedCountry.flag}</span>
                  <span className="font-medium">
                    {language === 'en' ? selectedCountry.nameEn : selectedCountry.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="w-3 h-3" />
                  <span>
                    {language === 'en' ? 'Expected format:' : 'Format așteptat:'}
                  </span>
                </div>
                <div className="font-mono text-sm bg-muted/50 px-2 py-1 rounded">
                  {getExampleFormat()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {language === 'en' 
                    ? `${selectedCountry.phoneLength} digits after ${selectedCountry.prefix}`
                    : `${selectedCountry.phoneLength} cifre după ${selectedCountry.prefix}`
                  }
                </div>
              </div>
            </TooltipContent>
          </Tooltip>

        {/* Phone Input */}
        <div className="relative flex-1">
          <Input
            id={id}
            type="tel"
            placeholder={dynamicPlaceholder}
            value={value}
            onChange={handleInputChange}
            onPaste={handlePaste}
            required={required}
            maxLength={25}
            className={`rounded-l-none pr-16 ${
              error 
                ? "border-destructive focus-visible:ring-destructive" 
                : isValid
                  ? "border-green-500 focus-visible:ring-green-500"
                  : ""
            } ${inputClassName}`}
          />
          
          {/* Clear & Validation Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {/* Clear Button */}
            <button
              type="button"
              onClick={() => onChange("")}
              className={`p-0.5 rounded-full hover:bg-muted transition-all duration-200 ${
                hasValue 
                  ? "opacity-100 scale-100" 
                  : "opacity-0 scale-75 pointer-events-none"
              }`}
              aria-label={language === 'en' ? 'Clear phone number' : 'Șterge numărul'}
              title={language === 'en' ? 'Clear' : 'Șterge'}
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
            
            {/* Validation Icon */}
            <div className={`transition-all duration-200 ${
              hasValue 
                ? "opacity-100 scale-100" 
                : "opacity-0 scale-75"
            }`}>
              {isValid ? (
                <Check className="w-4 h-4 text-green-500 animate-scale-in" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-destructive/20 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-1 w-80 max-h-80 overflow-hidden bg-popover border border-border rounded-lg shadow-lg z-50"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-border sticky top-0 bg-popover">
              <Input
                type="text"
                placeholder={language === 'en' ? 'Search country...' : 'Caută țara...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            
            {/* Countries List Grouped by Region */}
            <div ref={listRef} className="overflow-y-auto max-h-64">
              {groupedCountries.size > 0 ? (
                (() => {
                  let globalIndex = -1;
                  return Array.from(groupedCountries.entries()).map(([regionKey, regionCountries]) => (
                    <div key={regionKey}>
                      {/* Region Header */}
                      <div className="sticky top-0 px-3 py-1.5 bg-muted/80 backdrop-blur-sm border-b border-border/50">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {getRegionName(regionKey)}
                        </span>
                      </div>
                      
                      {/* Region Countries */}
                      {regionCountries.map((country) => {
                        globalIndex++;
                        const isHighlighted = globalIndex === highlightedIndex;
                        return (
                          <button
                            key={country.code}
                            type="button"
                            data-index={globalIndex}
                            onClick={() => handleCountrySelect(country)}
                            onMouseEnter={() => setHighlightedIndex(globalIndex)}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                              isHighlighted 
                                ? 'bg-accent' 
                                : selectedCountry.code === country.code 
                                  ? 'bg-accent/50' 
                                  : 'hover:bg-accent'
                            }`}
                          >
                            <span className="text-lg">{country.flag}</span>
                            <span className="flex-1 text-sm truncate">
                              {language === 'en' ? country.nameEn : country.name}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">{country.prefix}</span>
                            {selectedCountry.code === country.code && (
                              <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ));
                })()
              ) : (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  {language === 'en' ? 'No country found' : 'Nicio țară găsită'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hint / Error Message */}
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : isValid ? (
        <p className="text-xs text-green-600 flex items-center gap-1">
          ✓ {selectedCountry[language === 'en' ? 'nameEn' : 'name']} - {language === 'en' ? 'Valid number' : 'Număr valid'}
        </p>
      ) : getDetectionLabel() ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {getDetectionLabel()}
        </p>
      ) : hasValue ? (
        <p className="text-xs text-muted-foreground">
          {language === 'en' 
            ? `Expected ${selectedCountry.phoneLength} digits after ${selectedCountry.prefix}` 
            : `Se așteaptă ${selectedCountry.phoneLength} cifre după ${selectedCountry.prefix}`}
        </p>
      ) : null}
      </div>
    </TooltipProvider>
  );
};

export default PhoneInputWithCountry;
