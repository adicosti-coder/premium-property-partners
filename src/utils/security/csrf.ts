/**
 * CSRF Protection Utilities
 * Token-based Cross-Site Request Forgery prevention
 */

import { getSessionStorage, setSessionStorage } from "@/utils/browserStorage";

const CSRF_TOKEN_KEY = "csrf_token";
const CSRF_TOKEN_EXPIRY_KEY = "csrf_token_expiry";
const TOKEN_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Generate a cryptographically secure random token
 */
const generateSecureToken = (): string => {
  if (typeof window !== "undefined" && window.crypto) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for SSR
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

/**
 * Get or generate a CSRF token for the current session
 */
export const getCsrfToken = (): string => {
  const existingToken = getSessionStorage(CSRF_TOKEN_KEY);
  const expiryStr = getSessionStorage(CSRF_TOKEN_EXPIRY_KEY);
  const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;

  // Check if existing token is still valid
  if (existingToken && expiry > Date.now()) {
    return existingToken;
  }

  // Generate new token
  const newToken = generateSecureToken();
  const newExpiry = Date.now() + TOKEN_VALIDITY_MS;

  setSessionStorage(CSRF_TOKEN_KEY, newToken);
  setSessionStorage(CSRF_TOKEN_EXPIRY_KEY, String(newExpiry));

  return newToken;
};

/**
 * Validate a CSRF token against the stored session token
 */
export const validateCsrfToken = (token: string): boolean => {
  if (!token) return false;

  const storedToken = getSessionStorage(CSRF_TOKEN_KEY);
  const expiryStr = getSessionStorage(CSRF_TOKEN_EXPIRY_KEY);
  const expiry = expiryStr ? parseInt(expiryStr, 10) : 0;

  // Token must match and not be expired
  if (!storedToken || expiry <= Date.now()) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (token.length !== storedToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }

  return result === 0;
};

/**
 * Refresh the CSRF token (call after successful form submission)
 */
export const refreshCsrfToken = (): string => {
  const newToken = generateSecureToken();
  const newExpiry = Date.now() + TOKEN_VALIDITY_MS;

  setSessionStorage(CSRF_TOKEN_KEY, newToken);
  setSessionStorage(CSRF_TOKEN_EXPIRY_KEY, String(newExpiry));

  return newToken;
};

/**
 * Clear CSRF token (call on logout)
 */
export const clearCsrfToken = (): void => {
  if (typeof window !== "undefined" && window.sessionStorage) {
    window.sessionStorage.removeItem(CSRF_TOKEN_KEY);
    window.sessionStorage.removeItem(CSRF_TOKEN_EXPIRY_KEY);
  }
};

/**
 * Hook to add CSRF token to form data
 */
export const addCsrfToFormData = (formData: FormData): FormData => {
  formData.append("_csrf", getCsrfToken());
  return formData;
};

/**
 * Add CSRF token to request headers
 */
export const getCsrfHeaders = (): Record<string, string> => {
  return {
    "X-CSRF-Token": getCsrfToken(),
  };
};
