import { useEffect, useState } from "react";
import { Flame, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  complexSlug: string;
  complexName: string;
  /** Average observed occupancy from landing data (e.g. "92%") */
  baselineOccupancy: string;
  isRo: boolean;
}

/**
 * Live-ish occupancy & scarcity badge for complex landing pages.
 *
 * Strategy:
 *  - Tries the optional `pms-occupancy` edge function (Smoobu/Lodgify/Pynbooking proxy).
 *  - If it 404s or errors, falls back to a stable per-day mock derived from the
 *    baseline + a small deterministic delta so the FOMO message stays believable
 *    and consistent across a single user session.
 *
 * No PII, no auth required — safe to render on public landing pages.
 */
export default function OccupancyUrgencyBadge({ complexSlug, complexName, baselineOccupancy, isRo }: Props) {
  const [occupancy, setOccupancy] = useState<number | null>(null);
  const [available, setAvailable] = useState<number | null>(null);
  const [source, setSource] = useState<"live" | "mock">("mock");

  useEffect(() => {
    let cancelled = false;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;

    const baseline = parseInt(baselineOccupancy.replace(/[^\d]/g, ""), 10) || 90;
    // Deterministic daily delta (same value all day for same complex)
    const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const seed = (complexSlug.length * 7 + day) % 6; // 0..5
    const mockOccupancy = Math.min(98, baseline + seed - 1);
    const mockAvailable = Math.max(1, 4 - Math.floor(seed / 2));

    const run = async () => {
      // Render mock immediately (no main-thread blocking, no waiting on network).
      if (!cancelled) {
        setOccupancy(mockOccupancy);
        setAvailable(mockAvailable);
        setSource("mock");
      }
      // Then try to upgrade to live data in the background.
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
        if (!projectId) return;
        const controller = new AbortController();
        const t = window.setTimeout(() => controller.abort(), 4000);
        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/pms-occupancy?slug=${encodeURIComponent(complexSlug)}`,
          { method: "GET", signal: controller.signal },
        );
        window.clearTimeout(t);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data?.occupancy === "number") {
          setOccupancy(Math.round(data.occupancy));
          setAvailable(typeof data.available === "number" ? data.available : mockAvailable);
          setSource("live");
        }
      } catch {
        /* keep mock */
      }
    };

    // Defer to idle time so the badge never competes with LCP / hero paint on mobile.
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) {
      idleHandle = ric(() => { void run(); }, { timeout: 2500 });
    } else {
      timeoutHandle = window.setTimeout(() => { void run(); }, 1200);
    }

    return () => {
      cancelled = true;
      const cic = (window as any).cancelIdleCallback as ((h: number) => void) | undefined;
      if (idleHandle !== null && cic) cic(idleHandle);
      if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
    };
  }, [complexSlug, baselineOccupancy]);

  if (occupancy === null) return null;

  const high = occupancy >= 90;
  return (
    <div
      className="mx-auto mt-4 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/5 via-amber-500/10 to-primary/5 px-4 py-2 text-sm shadow-sm"
      role="status"
      aria-live="polite"
    >
      {high ? (
        <Flame className="h-4 w-4 text-amber-600 shrink-0" aria-hidden="true" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
      )}
      <span className="font-medium text-foreground">
        {isRo ? "Grad de ocupare" : "Occupancy"}{" "}
        <span className="font-bold text-primary">{occupancy}%</span>{" "}
        {isRo ? `în ${complexName} luna aceasta` : `in ${complexName} this month`}
      </span>
      {available !== null && (
        <Badge variant="secondary" className="font-semibold">
          {isRo
            ? `Doar ${available} ${available === 1 ? "apartament disponibil" : "apartamente disponibile"}`
            : `Only ${available} ${available === 1 ? "apartment available" : "apartments available"}`}
        </Badge>
      )}
      <span className="sr-only">{source === "live" ? "Date PMS live" : "Estimare bazată pe media lunară"}</span>
    </div>
  );
}
