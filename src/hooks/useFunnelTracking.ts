import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { isBrowser, getSessionStorage, setSessionStorage } from "@/utils/browserStorage";

export type FunnelStep =
  | "page_view"
  | "property_click"
  | "gallery_view"
  | "calculator_open"
  | "calculator_complete"
  | "booking_form_open"
  | "booking_form_submit"
  | "lead_form_open"
  | "lead_form_submit"
  | "whatsapp_click"
  | "phone_click"
  | "discount_code_applied";

const getSessionId = (): string => {
  if (!isBrowser()) return `ssr-${Date.now()}`;
  let id = getSessionStorage("funnel_session_id");
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setSessionStorage("funnel_session_id", id);
  }
  return id;
};

/**
 * Tracks user journey through the conversion funnel.
 * Records each step with metadata for analytics.
 */
export const useFunnelTracking = () => {
  const location = useLocation();

  const trackStep = useCallback(
    async (step: FunnelStep, metadata?: Record<string, unknown>) => {
      if (!isBrowser()) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from("cta_analytics").insert({
          cta_type: `funnel_${step}`,
          page_path: location.pathname,
          user_id: user?.id || null,
          session_id: getSessionId(),
          metadata: {
            funnel_step: step,
            ...metadata,
            referrer: document.referrer,
            screen_width: window.innerWidth,
            timestamp_local: new Date().toISOString(),
          },
        });
      } catch {
        // Silent fail
      }
    },
    [location.pathname]
  );

  return { trackStep };
};
