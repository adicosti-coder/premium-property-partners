import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isBrowser, getSessionStorage, setSessionStorage } from "@/utils/browserStorage";

const getSessionId = (): string => {
  if (!isBrowser()) return `ssr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  let sessionId = getSessionStorage("property_view_session_id");
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    setSessionStorage("property_view_session_id", sessionId);
  }
  return sessionId;
};

export const usePropertyViewTracking = (propertyId: string | undefined) => {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!isBrowser()) return;
    if (!propertyId || hasTracked.current) return;

    const trackView = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        await supabase.from("property_views").insert({
          property_id: propertyId,
          user_id: user?.id || null,
          session_id: getSessionId(),
          referrer: document.referrer || null,
          user_agent: navigator.userAgent,
          page_path: window.location.pathname,
        });

        // Also feed into AI Memory (cross-function visitor tracker)
        let memorySessionId = window.localStorage.getItem("rt_visitor_session_id");
        if (!memorySessionId) {
          memorySessionId = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
          window.localStorage.setItem("rt_visitor_session_id", memorySessionId);
        }
        supabase.functions.invoke("visitor-memory", {
          body: {
            action: "track",
            sessionId: memorySessionId,
            userId: user?.id || null,
            event: { type: "view", data: { propertyId } },
          },
        }).catch(() => {});

        hasTracked.current = true;
      } catch (error) {
        console.error("Property view tracking error:", error);
      }
    };

    trackView();
  }, [propertyId]);
};
