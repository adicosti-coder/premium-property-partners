/**
 * Country data for phone number detection and validation
 */
export interface CountryInfo {
  code: string;
  name: string;
  nameEn: string;
  flag: string;
  prefix: string;
  phoneLength: number; // digits after country code
  mobileStartDigits?: string[]; // optional: valid starting digits for mobile numbers
}

export const countries: CountryInfo[] = [
  { code: 'RO', name: 'România', nameEn: 'Romania', flag: '🇷🇴', prefix: '+40', phoneLength: 9, mobileStartDigits: ['7'] },
  { code: 'MD', name: 'Moldova', nameEn: 'Moldova', flag: '🇲🇩', prefix: '+373', phoneLength: 8, mobileStartDigits: ['6', '7'] },
  { code: 'UA', name: 'Ucraina', nameEn: 'Ukraine', flag: '🇺🇦', prefix: '+380', phoneLength: 9, mobileStartDigits: ['5', '6', '7', '9'] },
  { code: 'HU', name: 'Ungaria', nameEn: 'Hungary', flag: '🇭🇺', prefix: '+36', phoneLength: 9, mobileStartDigits: ['2', '3', '7'] },
  { code: 'BG', name: 'Bulgaria', nameEn: 'Bulgaria', flag: '🇧🇬', prefix: '+359', phoneLength: 9, mobileStartDigits: ['8', '9'] },
  { code: 'RS', name: 'Serbia', nameEn: 'Serbia', flag: '🇷🇸', prefix: '+381', phoneLength: 9, mobileStartDigits: ['6'] },
  { code: 'DE', name: 'Germania', nameEn: 'Germany', flag: '🇩🇪', prefix: '+49', phoneLength: 11, mobileStartDigits: ['1'] },
  { code: 'AT', name: 'Austria', nameEn: 'Austria', flag: '🇦🇹', prefix: '+43', phoneLength: 10, mobileStartDigits: ['6'] },
  { code: 'IT', name: 'Italia', nameEn: 'Italy', flag: '🇮🇹', prefix: '+39', phoneLength: 10, mobileStartDigits: ['3'] },
  { code: 'ES', name: 'Spania', nameEn: 'Spain', flag: '🇪🇸', prefix: '+34', phoneLength: 9, mobileStartDigits: ['6', '7'] },
  { code: 'FR', name: 'Franța', nameEn: 'France', flag: '🇫🇷', prefix: '+33', phoneLength: 9, mobileStartDigits: ['6', '7'] },
  { code: 'UK', name: 'Marea Britanie', nameEn: 'United Kingdom', flag: '🇬🇧', prefix: '+44', phoneLength: 10, mobileStartDigits: ['7'] },
  { code: 'US', name: 'SUA', nameEn: 'United States', flag: '🇺🇸', prefix: '+1', phoneLength: 10 },
  { code: 'GR', name: 'Grecia', nameEn: 'Greece', flag: '🇬🇷', prefix: '+30', phoneLength: 10, mobileStartDigits: ['6', '9'] },
  { code: 'PL', name: 'Polonia', nameEn: 'Poland', flag: '🇵🇱', prefix: '+48', phoneLength: 9, mobileStartDigits: ['5', '6', '7', '8'] },
  { code: 'CZ', name: 'Cehia', nameEn: 'Czech Republic', flag: '🇨🇿', prefix: '+420', phoneLength: 9, mobileStartDigits: ['6', '7'] },
  { code: 'NL', name: 'Olanda', nameEn: 'Netherlands', flag: '🇳🇱', prefix: '+31', phoneLength: 9, mobileStartDigits: ['6'] },
  { code: 'BE', name: 'Belgia', nameEn: 'Belgium', flag: '🇧🇪', prefix: '+32', phoneLength: 9, mobileStartDigits: ['4'] },
  { code: 'CH', name: 'Elveția', nameEn: 'Switzerland', flag: '🇨🇭', prefix: '+41', phoneLength: 9, mobileStartDigits: ['7'] },
  { code: 'PT', name: 'Portugalia', nameEn: 'Portugal', flag: '🇵🇹', prefix: '+351', phoneLength: 9, mobileStartDigits: ['9'] },
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

/**
 * Validates a phone number for a specific country
 * Returns true if the phone number has the correct length for the country
 */
export const validatePhoneForCountry = (phone: string, country: CountryInfo): boolean => {
  if (!phone || !country) return false;
  
  // Extract only digits
  const cleanPhone = phone.replace(/[^\d+]/g, '');
  
  // Check if it starts with the country prefix
  if (!cleanPhone.startsWith(country.prefix)) return false;
  
  // Get digits after prefix
  const digitsAfterPrefix = cleanPhone.slice(country.prefix.length);
  
  // Check length (allow some flexibility: ±1 digit for different formats)
  const minLength = country.phoneLength - 1;
  const maxLength = country.phoneLength + 1;
  
  return digitsAfterPrefix.length >= minLength && digitsAfterPrefix.length <= maxLength;
};

/**
 * Formats a phone number for any detected country
 * Groups digits in a readable format based on country conventions
 */
export const formatInternationalPhone = (value: string, country?: CountryInfo): string => {
  // Remove all non-digit characters except leading +
  let digits = value.replace(/[^\d+]/g, "");
  
  // If no country provided, try to detect it
  const detectedCountry = country || detectCountryFromPhone(digits);
  
  if (!detectedCountry) {
    // Return as-is if no country detected
    return value;
  }
  
  const prefixDigits = detectedCountry.prefix.replace(/\D/g, "");
  
  // Handle various input formats
  if (digits.startsWith(detectedCountry.prefix)) {
    digits = digits.slice(detectedCountry.prefix.length);
  } else if (digits.startsWith('+')) {
    // Different country prefix, return as-is
    return value;
  } else if (digits.startsWith(prefixDigits)) {
    digits = digits.slice(prefixDigits.length);
  } else if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  
  // Keep only digits now
  digits = digits.replace(/\D/g, "");
  
  // Limit to expected phone length + 2 for safety
  digits = digits.slice(0, detectedCountry.phoneLength + 2);
  
  if (!digits) return detectedCountry.prefix + " ";
  
  // Format based on phone length (common patterns)
  let formatted = detectedCountry.prefix + " ";
  
  if (detectedCountry.phoneLength <= 9) {
    // Format as XXX XXX XXX
    if (digits.length > 0) formatted += digits.slice(0, 3);
    if (digits.length > 3) formatted += " " + digits.slice(3, 6);
    if (digits.length > 6) formatted += " " + digits.slice(6);
  } else if (detectedCountry.phoneLength === 10) {
    // Format as XX XXXX XXXX or XXX XXX XXXX
    if (digits.length > 0) formatted += digits.slice(0, 3);
    if (digits.length > 3) formatted += " " + digits.slice(3, 6);
    if (digits.length > 6) formatted += " " + digits.slice(6);
  } else {
    // Format as XXXX XXXXXXX for longer numbers
    if (digits.length > 0) formatted += digits.slice(0, 4);
    if (digits.length > 4) formatted += " " + digits.slice(4);
  }
  
  return formatted;
};

/**
 * Creates a regex for validating phone numbers from any supported country
 * This is a general pattern that accepts most international formats
 */
export const createPhoneValidationRegex = (): RegExp => {
  // Match: +XX(X) followed by 7-12 digits with optional spaces
  return /^\+\d{1,4}\s?\d{2,4}\s?\d{2,4}\s?\d{2,4}$/;
};

/**
 * General international phone validation
 */
export const isValidInternationalPhone = (phone: string): boolean => {
  if (!phone) return false;
  
  const country = detectCountryFromPhone(phone);
  if (!country) return false;
  
  return validatePhoneForCountry(phone, country);
};
