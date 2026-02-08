/**
 * Security Utilities - Centralized Exports
 * Import from @/utils/security for all security-related functionality
 */

// Sanitization
export {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeJson,
  escapeHtml,
  SANITIZE_PRESETS,
} from "./sanitize";

// Validation schemas
export {
  // Common schemas
  emailSchema,
  passwordSchema,
  phoneSchema,
  nameSchema,
  urlSchema,
  optionalUrlSchema,
  // Form schemas
  leadCaptureSchema,
  contactFormSchema,
  bookingFormSchema,
  loginSchema,
  signupSchema,
  blogCommentSchema,
  referralFormSchema,
  newsletterSchema,
  propertySearchSchema,
  // Utility functions
  validateForm,
  formatZodErrors,
  // Types
  type LeadCaptureData,
  type ContactFormData,
  type BookingFormData,
  type LoginData,
  type SignupData,
  type BlogCommentData,
  type ReferralFormData,
  type NewsletterData,
  type PropertySearchData,
} from "./validation";

// CSRF protection
export {
  getCsrfToken,
  validateCsrfToken,
  refreshCsrfToken,
  clearCsrfToken,
  addCsrfToFormData,
  getCsrfHeaders,
} from "./csrf";

// Rate limiting (for edge functions)
export {
  checkRateLimit,
  getClientIp,
  createRateLimitHeaders,
  rateLimitExceededResponse,
} from "./rateLimiter";
