import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const DWELL_THRESHOLD_MS = 10_000;
const TRACKED_TAGS = ["lux", "gradina"];

/**
 * Tracks time spent on a listing page.
 * If the user is authenticated and the property tag matches 'lux' or 'gradina',
 * records an interaction after 10+ seconds.
 */
export function useListingDwellTracker(
  propertyId: string | undefined,
  propertyTag: string | undefined
) {
  const startRef = useRef<number>(0);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!propertyId || !propertyTag) return;

    const normalizedTag = propertyTag.toLowerCase().trim();
    if (!TRACKED_TAGS.includes(normalizedTag)) return;

    startRef.current = Date.now();
    sentRef.current = false;

    const timer = setTimeout(async () => {
      if (sentRef.current) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      sentRef.current = true;
      const durationSeconds = Math.round((Date.now() - startRef.current) / 1000);

      await supabase.from("user_interactions").insert({
        user_id: session.user.id,
        interaction_type: "time_on_listing",
        property_id: propertyId,
        property_tag: normalizedTag,
        duration_seconds: durationSeconds,
        metadata: { threshold: "10s", url: window.location.pathname },
      });
    }, DWELL_THRESHOLD_MS);

    return () => clearTimeout(timer);
  }, [propertyId, propertyTag]);
}
