import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem("property_view_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem("property_view_session_id", sessionId);
  }
  return sessionId;
};

export const usePropertyViewTracking = (propertyId: string | undefined) => {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!propertyId || hasTracked.current) return;

    const trackView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        await supabase.from("property_views").insert({
          property_id: propertyId,
          user_id: user?.id || null,
          session_id: getSessionId(),
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          page_path: window.location.pathname,
        });
        
        hasTracked.current = true;
      } catch (error) {
        console.error("Property view tracking error:", error);
      }
    };

    trackView();
  }, [propertyId]);
};
