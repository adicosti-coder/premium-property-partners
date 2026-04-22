/**
 * PDF Lead Magnet Funnel Tracking.
 * Records steps: lead_submitted → pdf_downloaded → thankyou_view → cta_*.
 * Insert is allowed for everyone (RLS), reads are admin-only.
 */
import { supabase } from "@/integrations/supabase/client";

export type PdfFunnelStep =
  | "lead_submitted"
  | "pdf_downloaded"
  | "thankyou_view"
  | "cta_properties"
  | "cta_guide"
  | "cta_evaluation";

const SESSION_KEY = "rt_pdf_funnel_sid";

export const getPdfFunnelSessionId = (): string => {
  if (typeof window === "undefined") return "ssr";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `pdf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `pdf_anon_${Date.now()}`;
  }
};

export const trackPdfFunnel = async (
  step: PdfFunnelStep,
  options?: { source?: string; email?: string; metadata?: Record<string, unknown> },
): Promise<void> => {
  try {
    await supabase.from("pdf_funnel_events").insert({
      session_id: getPdfFunnelSessionId(),
      step,
      source: options?.source ?? null,
      email: options?.email ?? null,
      metadata: options?.metadata ?? null,
    });
  } catch (err) {
    // Non-blocking — funnel tracking failures must never break UX
    console.warn("[pdfFunnel] failed to record step", step, err);
  }
};
