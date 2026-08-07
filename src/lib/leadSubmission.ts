/**
 * Central lead submission helper.
 * - Validates name / email / phone (zod, client-side).
 * - Inserts into `leads`.
 * - Reports all unexpected errors via `reportError` (console + optional webhook + Sentry).
 *
 * Dedup is handled server-side by the `leads_dedupe_upsert` trigger: when a lead with the
 * same normalized phone or email already exists, the existing row is UPDATED (best score,
 * merged simulation data, new source/campaign appended to `activity_history`, marked
 * `engagement_status = 're_engaged'`) instead of inserting a duplicate row. No error is
 * raised, so the client never needs a pre-check.
 */

import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { reportError } from "@/lib/errorReporting";
import { isValidWhatsAppNumber } from "@/lib/conversionTracking";

export const leadInputSchema = z.object({
  name: z.string().trim().min(2, "name_min").max(120, "name_max"),
  whatsapp_number: z
    .string()
    .trim()
    .min(1, "phone_required"),
  email: z
    .string()
    .trim()
    .email("email_invalid")
    .max(255, "email_max")
    .optional()
    .or(z.literal("")),
  property_type: z.string().trim().min(1).max(80),
  property_area: z.number().int().nonnegative().default(0),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  source: z.string().trim().min(1).max(100),
  simulation_data: z.unknown().optional(),
  /** When true, the phone is a sentinel (e.g. "-" / "PRECALC_NO_PHONE") and skipped from phone validation. */
  allowSentinelPhone: z.boolean().optional(),
});

export type LeadInput = z.infer<typeof leadInputSchema>;

export type LeadSubmissionResult =
  | { ok: true; duplicate: boolean }
  | { ok: false; reason: "validation"; errors: Record<string, string> }
  | { ok: false; reason: "network" | "unknown"; message: string };

const SENTINEL_PHONES = new Set(["-", "PRECALC_NO_PHONE", "0", "n/a", "N/A", ""]);

export const submitLead = async (raw: LeadInput): Promise<LeadSubmissionResult> => {

  const parsed = leadInputSchema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const errors: Record<string, string> = {};
    for (const [k, v] of Object.entries(flat)) {
      if (v && v.length) errors[k] = v[0]!;
    }
    return { ok: false, reason: "validation", errors };
  }

  const data = parsed.data;

  // Phone validation: skip when sentinel is allowed
  const phone = data.whatsapp_number.trim();
  if (!data.allowSentinelPhone || !SENTINEL_PHONES.has(phone)) {
    if (!isValidWhatsAppNumber(phone)) {
      return { ok: false, reason: "validation", errors: { whatsapp_number: "phone_invalid" } };
    }
  }

  // Soft client-side dedup (non-blocking — server trigger is authoritative)
  const isDup = await checkDuplicate(data);
  if (isDup) return { ok: true, duplicate: true };

  try {
    const { error } = await supabase.from("leads").insert({
      name: data.name,
      whatsapp_number: phone.replace(/\s/g, ""),
      email: data.email || null,
      message: data.message || null,
      property_type: data.property_type,
      property_area: data.property_area ?? 0,
      source: data.source,
      simulation_data: (data.simulation_data ?? null) as never,
    });

    if (error) {
      // Server-side trigger raises 23505 / message contains "duplicate_lead"
      if (error.code === "23505" || /duplicate_lead/i.test(error.message)) {
        return { ok: true, duplicate: true };
      }
      reportError(error, {
        scope: `form:lead:${data.source}`,
        meta: { code: error.code, hint: error.hint },
      });
      return { ok: false, reason: "network", message: error.message };
    }

    return { ok: true, duplicate: false };
  } catch (err) {
    reportError(err, { scope: `form:lead:${data.source}` });
    return { ok: false, reason: "unknown", message: (err as Error)?.message ?? "unknown" };
  }
};
