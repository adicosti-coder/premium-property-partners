/**
 * Formats a Romanian phone number as the user types.
 * Supports both mobile (+40 7XX XXX XXX) and landline (+40 2XX XXX XXX) formats.
 */
export const formatRomanianPhone = (value: string): string => {
  // Remove all non-digit characters except leading +
  let digits = value.replace(/[^\d+]/g, "");
  
  // Handle the prefix
  if (digits.startsWith("+40")) {
    digits = digits.slice(3);
  } else if (digits.startsWith("+")) {
    // Remove just the + if it's not +40
    digits = digits.slice(1);
  } else if (digits.startsWith("40")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  
  // Keep only digits now
  digits = digits.replace(/\D/g, "");
  
  // Limit to 9 digits (Romanian phone numbers after country code)
  digits = digits.slice(0, 9);
  
  // If empty, return empty
  if (!digits) return "";
  
  // Build formatted number
  let formatted = "+40 ";
  
  // First group: 3 digits (7XX for mobile, 2XX for landline)
  if (digits.length > 0) {
    formatted += digits.slice(0, 3);
  }
  
  // Second group: 3 digits
  if (digits.length > 3) {
    formatted += " " + digits.slice(3, 6);
  }
  
  // Third group: 3 digits
  if (digits.length > 6) {
    formatted += " " + digits.slice(6, 9);
  }
  
  return formatted;
};

/**
 * Extracts raw digits from a formatted phone number for validation/storage
 */
export const extractPhoneDigits = (formattedPhone: string): string => {
  return formattedPhone.replace(/[^\d+]/g, "");
};

/**
 * Regex for validating Romanian phone numbers (mobile and landline)
 * Mobile: +40 7XX XXX XXX
 * Landline: +40 2XX XXX XXX (or +40 3XX for some regions)
 */
export const romanianPhoneRegex = /^\+40\s[237]\d{2}\s\d{3}\s\d{3}$/;
