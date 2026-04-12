import { useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isBrowser, getSessionStorage, setSessionStorage } from "@/utils/browserStorage";

export type CtaType = "call" | "whatsapp" | "booking" | "airbnb" | "email" | "form_submit";

/** Returns true if the user has accepted analytics cookies */
const hasAnalyticsConsent = (): boolean => {
  if (!isBrowser()) return false;
  try {
    const raw = localStorage.getItem("cookie_consent_v2");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed === "all" || parsed === "analytics_only";
  } catch {
    return false;
  }
};

/** Fire a GA4 event via gtag – only when consent is granted */
const fireGtagEvent = (eventName: string, params?: Record<string, string | undefined>) => {
  if (!isBrowser() || !hasAnalyticsConsent()) return;
  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, params);
  }
};

interface TrackCtaOptions {
  ctaType: CtaType;
  propertyId?: string;
  propertyName?: string;
  metadata?: Record<string, unknown>;
}

// Generate or retrieve session ID
const getSessionId = (): string => {
  if (!isBrowser()) return `ssr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  let sessionId = getSessionStorage("cta_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setSessionStorage("cta_session_id", sessionId);
  }
  return sessionId;
};

/** Safe path getter — works even outside Router context */
const getCurrentPath = () => (isBrowser() ? window.location.pathname : "/");

export const useCtaAnalytics = () => {

  const trackCta = useCallback(
    async (options: TrackCtaOptions) => {
      if (!isBrowser()) return;

      const { ctaType, propertyId, propertyName, metadata = {} } = options;

      // Fire GA4 event (consent-gated)
      const gtagEventMap: Record<CtaType, string> = {
        whatsapp: "click_whatsapp",
        call: "click_phone",
        form_submit: "generate_lead",
        email: "click_email",
        booking: "click_booking",
        airbnb: "click_airbnb",
      };
      fireGtagEvent(gtagEventMap[ctaType], {
        page_path: getCurrentPath(),
        property_id: propertyId,
        property_name: propertyName,
      });

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase.from("cta_analytics").insert({
          cta_type: ctaType,
          page_path: getCurrentPath(),
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
        console.error("CTA tracking error:", error);
      }
    },
    []
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

  /** Custom GA4 events for main CTA categories */
  const trackInvestment = useCallback(() => {
    fireGtagEvent("interes_imobiliar", {
      interes_imobil: "investitie",
      buget_client: "estimat",
      page_path: getCurrentPath(),
    });
  }, []);

  const trackAccommodation = useCallback(() => {
    fireGtagEvent("vizualizare_cazare", {
      interes_imobil: "regim_hotelier",
      capacitate_apartament: "4_persoane",
      page_path: getCurrentPath(),
    });
  }, []);

  const trackManagement = useCallback(() => {
    fireGtagEvent("lead_administrare", {
      tip_proprietar: "colaborare",
      page_path: getCurrentPath(),
    });
  }, []);

  return {
    trackCta,
    trackCall,
    trackWhatsApp,
    trackBooking,
    trackAirbnb,
    trackEmail,
    trackFormSubmit,
    trackInvestment,
    trackAccommodation,
    trackManagement,
  };
};
