import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const DWELL_THRESHOLD_MS = 10_000;
const TRACKED_TAGS = ["lux", "gradina"];

interface DwellTrackerOptions {
  propertyId?: string;
  propertyTag?: string;
  listingType?: string;
  roiPercentage?: string | null;
}

/**
 * Tracks time spent on a listing page.
 * Records an interaction after 10+ seconds when:
 * 1. Tag matches 'lux' or 'gradina' (original behavior)
 * 2. OR listing is 'regim_hotelier' with ROI >= 70% and tag 'pretabil_administrare'
 */
export function useListingDwellTracker(opts: DwellTrackerOptions) {
  const { propertyId, propertyTag, listingType, roiPercentage } = opts;
  const startRef = useRef<number>(0);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!propertyId) return;

    const normalizedTag = (propertyTag || "").toLowerCase().trim();
    const normalizedListing = (listingType || "").toLowerCase().trim();

    // Parse ROI: handles "9.4%", "70", "70%", etc.
    const roiNum = parseFloat((roiPercentage || "0").replace("%", ""));

    // Determine which tracking reason applies
    const isLuxOrGradina = TRACKED_TAGS.includes(normalizedTag);
    const isHighPerformanceHotelier =
      normalizedListing === "regim_hotelier" &&
      roiNum >= 70 &&
      normalizedTag === "pretabil_administrare";

    if (!isLuxOrGradina && !isHighPerformanceHotelier) return;

    const interactionTag = isHighPerformanceHotelier
      ? "pretabil_administrare"
      : normalizedTag;

    startRef.current = Date.now();
    sentRef.current = false;

    const timer = setTimeout(async () => {
      if (sentRef.current) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return;

      sentRef.current = true;
      const durationSeconds = Math.round(
        (Date.now() - startRef.current) / 1000
      );

      await supabase.from("user_interactions").insert({
        user_id: session.user.id,
        interaction_type: "time_on_listing",
        property_id: propertyId,
        property_tag: interactionTag,
        duration_seconds: durationSeconds,
        metadata: {
          threshold: "10s",
          url: window.location.pathname,
          ...(isHighPerformanceHotelier && {
            listing_type: normalizedListing,
            roi_percentage: roiPercentage,
            reason: "high_roi_hotelier",
          }),
        },
      });
    }, DWELL_THRESHOLD_MS);

    return () => clearTimeout(timer);
  }, [propertyId, propertyTag, listingType, roiPercentage]);
}
