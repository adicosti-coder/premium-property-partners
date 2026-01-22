/**
 * Country data for phone number detection
 */
export interface CountryInfo {
  code: string;
  name: string;
  nameEn: string;
  flag: string;
  prefix: string;
  phoneLength: number; // digits after country code
}

export const countries: CountryInfo[] = [
  { code: 'RO', name: 'România', nameEn: 'Romania', flag: '🇷🇴', prefix: '+40', phoneLength: 9 },
  { code: 'MD', name: 'Moldova', nameEn: 'Moldova', flag: '🇲🇩', prefix: '+373', phoneLength: 8 },
  { code: 'UA', name: 'Ucraina', nameEn: 'Ukraine', flag: '🇺🇦', prefix: '+380', phoneLength: 9 },
  { code: 'HU', name: 'Ungaria', nameEn: 'Hungary', flag: '🇭🇺', prefix: '+36', phoneLength: 9 },
  { code: 'BG', name: 'Bulgaria', nameEn: 'Bulgaria', flag: '🇧🇬', prefix: '+359', phoneLength: 9 },
  { code: 'RS', name: 'Serbia', nameEn: 'Serbia', flag: '🇷🇸', prefix: '+381', phoneLength: 9 },
  { code: 'DE', name: 'Germania', nameEn: 'Germany', flag: '🇩🇪', prefix: '+49', phoneLength: 11 },
  { code: 'AT', name: 'Austria', nameEn: 'Austria', flag: '🇦🇹', prefix: '+43', phoneLength: 10 },
  { code: 'IT', name: 'Italia', nameEn: 'Italy', flag: '🇮🇹', prefix: '+39', phoneLength: 10 },
  { code: 'ES', name: 'Spania', nameEn: 'Spain', flag: '🇪🇸', prefix: '+34', phoneLength: 9 },
  { code: 'FR', name: 'Franța', nameEn: 'France', flag: '🇫🇷', prefix: '+33', phoneLength: 9 },
  { code: 'UK', name: 'Marea Britanie', nameEn: 'United Kingdom', flag: '🇬🇧', prefix: '+44', phoneLength: 10 },
  { code: 'US', name: 'SUA', nameEn: 'United States', flag: '🇺🇸', prefix: '+1', phoneLength: 10 },
  { code: 'GR', name: 'Grecia', nameEn: 'Greece', flag: '🇬🇷', prefix: '+30', phoneLength: 10 },
  { code: 'PL', name: 'Polonia', nameEn: 'Poland', flag: '🇵🇱', prefix: '+48', phoneLength: 9 },
  { code: 'CZ', name: 'Cehia', nameEn: 'Czech Republic', flag: '🇨🇿', prefix: '+420', phoneLength: 9 },
  { code: 'NL', name: 'Olanda', nameEn: 'Netherlands', flag: '🇳🇱', prefix: '+31', phoneLength: 9 },
  { code: 'BE', name: 'Belgia', nameEn: 'Belgium', flag: '🇧🇪', prefix: '+32', phoneLength: 9 },
  { code: 'CH', name: 'Elveția', nameEn: 'Switzerland', flag: '🇨🇭', prefix: '+41', phoneLength: 9 },
  { code: 'PT', name: 'Portugalia', nameEn: 'Portugal', flag: '🇵🇹', prefix: '+351', phoneLength: 9 },
];

/**
 * Detects country from phone number based on prefix
 * Sorts by prefix length (longest first) to match more specific prefixes first
 */
export const detectCountryFromPhone = (phone: string): CountryInfo | null => {
  if (!phone) return null;
  
  // Clean the phone number - keep only + and digits
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  if (!cleanPhone.startsWith('+')) return null;
  
  // Sort countries by prefix length (longest first) for accurate matching
  const sortedCountries = [...countries].sort((a, b) => b.prefix.length - a.prefix.length);
  
  for (const country of sortedCountries) {
    if (cleanPhone.startsWith(country.prefix)) {
      return country;
    }
  }
  
  return null;
};

/**
 * Get default country (Romania)
 */
export const getDefaultCountry = (): CountryInfo => {
  return countries.find(c => c.code === 'RO')!;
};
