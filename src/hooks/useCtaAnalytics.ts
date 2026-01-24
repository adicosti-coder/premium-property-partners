import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type CtaType = "call" | "whatsapp" | "booking" | "airbnb" | "email" | "form_submit";

interface TrackCtaOptions {
  ctaType: CtaType;
  propertyId?: string;
  propertyName?: string;
  metadata?: Record<string, unknown>;
}

// Generate or retrieve session ID
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("cta_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem("cta_session_id", sessionId);
  }
  return sessionId;
};

export const useCtaAnalytics = () => {
  const location = useLocation();

  const trackCta = useCallback(
    async (options: TrackCtaOptions) => {
      const { ctaType, propertyId, propertyName, metadata = {} } = options;

      try {
        // Get current user if authenticated
        const { data: { user } } = await supabase.auth.getUser();

        await supabase.from("cta_analytics").insert({
          cta_type: ctaType,
          page_path: location.pathname,
          property_id: propertyId,
          property_name: propertyName,
          user_id: user?.id || null,
          session_id: getSessionId(),
          metadata: {
            ...metadata,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            screen_width: window.innerWidth,
            timestamp_local: new Date().toISOString(),
          },
        });
      } catch (error) {
        // Silent fail - don't block user action for analytics
        console.error("CTA tracking error:", error);
      }
    },
    [location.pathname]
  );

  // Convenience methods
  const trackCall = useCallback(
    (propertyId?: string, propertyName?: string) =>
      trackCta({ ctaType: "call", propertyId, propertyName }),
    [trackCta]
  );

  const trackWhatsApp = useCallback(
    (propertyId?: string, propertyName?: string) =>
      trackCta({ ctaType: "whatsapp", propertyId, propertyName }),
    [trackCta]
  );

  const trackBooking = useCallback(
    (propertyId?: string, propertyName?: string) =>
      trackCta({ ctaType: "booking", propertyId, propertyName }),
    [trackCta]
  );

  const trackAirbnb = useCallback(
    (propertyId?: string, propertyName?: string) =>
      trackCta({ ctaType: "airbnb", propertyId, propertyName }),
    [trackCta]
  );

  const trackEmail = useCallback(
    (propertyId?: string, propertyName?: string) =>
      trackCta({ ctaType: "email", propertyId, propertyName }),
    [trackCta]
  );

  const trackFormSubmit = useCallback(
    (formType: string, metadata?: Record<string, unknown>) =>
      trackCta({ ctaType: "form_submit", metadata: { formType, ...metadata } }),
    [trackCta]
  );

  return {
    trackCta,
    trackCall,
    trackWhatsApp,
    trackBooking,
    trackAirbnb,
    trackEmail,
    trackFormSubmit,
  };
};
