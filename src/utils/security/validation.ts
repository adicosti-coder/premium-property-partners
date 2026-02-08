/**
 * Centralized Zod Validation Schemas
 * Production-ready input validation for all forms
 */

import { z } from "zod";

// ============================================================================
// Common Field Schemas
// ============================================================================

export const emailSchema = z
  .string()
  .trim()
  .email({ message: "Adresă de email invalidă" })
  .max(255, { message: "Email-ul nu poate depăși 255 de caractere" });

export const passwordSchema = z
  .string()
  .min(8, { message: "Parola trebuie să aibă minim 8 caractere" })
  .max(128, { message: "Parola nu poate depăși 128 de caractere" })
  .regex(/[A-Z]/, { message: "Parola trebuie să conțină cel puțin o literă mare" })
  .regex(/[a-z]/, { message: "Parola trebuie să conțină cel puțin o literă mică" })
  .regex(/[0-9]/, { message: "Parola trebuie să conțină cel puțin o cifră" });

export const phoneSchema = z
  .string()
  .trim()
  .min(10, { message: "Număr de telefon prea scurt" })
  .max(20, { message: "Număr de telefon prea lung" })
  .regex(/^[+]?[\d\s\-().]+$/, { message: "Format de telefon invalid" });

export const nameSchema = z
  .string()
  .trim()
  .min(2, { message: "Numele trebuie să aibă minim 2 caractere" })
  .max(100, { message: "Numele nu poate depăși 100 de caractere" })
  .regex(/^[a-zA-ZăâîșțĂÂÎȘȚ\s\-']+$/u, { message: "Numele conține caractere invalide" });

export const urlSchema = z
  .string()
  .trim()
  .url({ message: "URL invalid" })
  .max(2048, { message: "URL-ul nu poate depăși 2048 de caractere" })
  .refine((url) => {
    const lower = url.toLowerCase();
    return !lower.startsWith("javascript:") && !lower.startsWith("data:");
  }, { message: "URL nesigur" });

export const optionalUrlSchema = urlSchema.optional().or(z.literal(""));

// ============================================================================
// Lead Capture Form Schema
// ============================================================================

export const leadCaptureSchema = z.object({
  name: nameSchema,
  whatsappNumber: phoneSchema,
  propertyArea: z
    .number()
    .int()
    .min(10, { message: "Suprafața minimă este 10 mp" })
    .max(10000, { message: "Suprafața maximă este 10000 mp" }),
  propertyType: z.enum(["apartament", "casa", "studio", "penthouse", "vila"], {
    errorMap: () => ({ message: "Selectează un tip de proprietate" }),
  }),
  listingUrl: optionalUrlSchema,
});

export type LeadCaptureData = z.infer<typeof leadCaptureSchema>;

// ============================================================================
// Contact Form Schema
// ============================================================================

export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, { message: "Mesajul trebuie să aibă minim 10 caractere" })
    .max(2000, { message: "Mesajul nu poate depăși 2000 de caractere" }),
  subject: z
    .string()
    .trim()
    .max(200, { message: "Subiectul nu poate depăși 200 de caractere" })
    .optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// ============================================================================
// Booking Form Schema
// ============================================================================

export const bookingFormSchema = z.object({
  guestName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Dată invalidă" }),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Dată invalidă" }),
  guests: z.number().int().min(1).max(20),
  notes: z.string().max(1000).optional(),
  discountCode: z.string().max(50).optional(),
}).refine((data) => {
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  return checkOut > checkIn;
}, {
  message: "Data de check-out trebuie să fie după data de check-in",
  path: ["checkOut"],
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;

// ============================================================================
// Authentication Schemas
// ============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: "Parola este obligatorie" }),
});

export type LoginData = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: nameSchema.optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Parolele nu se potrivesc",
  path: ["confirmPassword"],
});

export type SignupData = z.infer<typeof signupSchema>;

// ============================================================================
// Blog Comment Schema
// ============================================================================

export const blogCommentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, { message: "Comentariul nu poate fi gol" })
    .max(1000, { message: "Comentariul nu poate depăși 1000 de caractere" }),
  articleId: z.string().uuid(),
});

export type BlogCommentData = z.infer<typeof blogCommentSchema>;

// ============================================================================
// Referral Form Schema
// ============================================================================

export const referralFormSchema = z.object({
  referrerName: nameSchema,
  referrerEmail: emailSchema,
  referrerPhone: phoneSchema.optional(),
  ownerName: nameSchema,
  ownerEmail: emailSchema,
  ownerPhone: phoneSchema,
  ownerMessage: z.string().max(1000).optional(),
  propertyType: z.string().max(100).optional(),
  propertyLocation: z.string().max(200).optional(),
  propertyRooms: z.number().int().min(1).max(50).optional(),
});

export type ReferralFormData = z.infer<typeof referralFormSchema>;

// ============================================================================
// Newsletter Schema
// ============================================================================

export const newsletterSchema = z.object({
  email: emailSchema,
});

export type NewsletterData = z.infer<typeof newsletterSchema>;

// ============================================================================
// Property Search Schema
// ============================================================================

export const propertySearchSchema = z.object({
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  guests: z.number().int().min(1).max(20).optional(),
  location: z.string().max(100).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
});

export type PropertySearchData = z.infer<typeof propertySearchSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate data against a schema and return typed result
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  
  return { success: false, errors };
}

/**
 * Create form error messages from Zod validation
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join(".");
    if (!errors[path]) {
      errors[path] = issue.message;
    }
  }
  return errors;
}
