import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Check, X, ChevronDown, MapPin, Loader2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { romanianPhoneRegex } from "@/utils/phoneFormatter";
import { 
  detectCountryFromPhone, 
  getDefaultCountry, 
  countries, 
  CountryInfo 
} from "@/utils/phoneCountryDetector";
import { useGeoCountryDetection } from "@/hooks/useGeoCountryDetection";

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
  placeholder = "+40 7XX XXX XXX",
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
    const newPrefix = country.prefix;
    onChange(`${newPrefix} ${digitsWithoutPrefix}`);
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

  const filteredCountries = countries.filter(country => {
    const query = searchQuery.toLowerCase();
    return (
      country.name.toLowerCase().includes(query) ||
      country.nameEn.toLowerCase().includes(query) ||
      country.prefix.includes(query) ||
      country.code.toLowerCase().includes(query)
    );
  });

  const isValid = value && romanianPhoneRegex.test(value);
  const hasValue = value && value.length > 3;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative flex">
        {/* Country Selector Button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1 px-3 py-2 border border-r-0 rounded-l-md bg-muted/50 hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0"
          aria-label={language === 'en' ? 'Select country' : 'Selectează țara'}
          title={getDetectionLabel() || (language === 'en' ? 'Select country' : 'Selectează țara')}
        >
          {geoDetection.isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <span className="text-lg">{selectedCountry.flag}</span>
          )}
          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Phone Input */}
        <div className="relative flex-1">
          <Input
            id={id}
            type="tel"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            maxLength={20}
            className={`rounded-l-none pr-10 ${
              error 
                ? "border-destructive focus-visible:ring-destructive" 
                : isValid
                  ? "border-green-500 focus-visible:ring-green-500"
                  : ""
            } ${inputClassName}`}
          />
          {hasValue && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-destructive" />
              )}
            </div>
          )}
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 mt-1 w-72 max-h-64 overflow-hidden bg-popover border border-border rounded-lg shadow-lg z-50"
          >
            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <Input
                type="text"
                placeholder={language === 'en' ? 'Search country...' : 'Caută țara...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
            </div>
            
            {/* Countries List */}
            <div className="overflow-y-auto max-h-48">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors ${
                      selectedCountry.code === country.code ? 'bg-accent' : ''
                    }`}
                  >
                    <span className="text-lg">{country.flag}</span>
                    <span className="flex-1 text-sm">
                      {language === 'en' ? country.nameEn : country.name}
                    </span>
                    <span className="text-sm text-muted-foreground">{country.prefix}</span>
                    {selectedCountry.code === country.code && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))
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
      ) : (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          📞 {language === 'en' ? 'Mobile: +40 7XX or Landline: +40 2XX' : 'Mobil: +40 7XX sau Fix: +40 2XX'}
        </p>
      )}
    </div>
  );
};

export default PhoneInputWithCountry;
