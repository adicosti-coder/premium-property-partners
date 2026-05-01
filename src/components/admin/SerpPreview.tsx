import { useEffect, useRef, useState } from "react";
import { Monitor, Smartphone, AlertTriangle, CheckCircle2, Link2, Ban, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * SERP Preview Live
 * - Simulates Google SERP snippet (Mobile + Desktop)
 * - Measures real pixel width using canvas (Arial fallback to match Google)
 * - Limits: Title ≤ 580px (desktop) / ~600px mobile, Meta ≤ 920px (desktop) / ~990px mobile
 */

type Device = "desktop" | "mobile";

const LIMITS: Record<Device, { titleMax: number; metaMax: number; titleFont: string; metaFont: string }> = {
  desktop: {
    titleMax: 580,
    metaMax: 920,
    titleFont: "20px Arial, sans-serif",
    metaFont: "14px Arial, sans-serif",
  },
  mobile: {
    titleMax: 600,
    metaMax: 990,
    titleFont: "18px Arial, sans-serif",
    metaFont: "14px Arial, sans-serif",
  },
};

function measureText(text: string, font: string): number {
  if (typeof document === "undefined") return 0;
  const canvas = (measureText as any)._c || ((measureText as any)._c = document.createElement("canvas"));
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;
  return Math.round(ctx.measureText(text).width);
}

function truncateToWidth(text: string, font: string, maxWidth: number): { display: string; truncated: boolean } {
  if (measureText(text, font) <= maxWidth) return { display: text, truncated: false };
  let lo = 0, hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measureText(text.slice(0, mid) + "…", font) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return { display: text.slice(0, lo).trimEnd() + "…", truncated: true };
}

interface Props {
  title: string;
  description: string;
  /** Page URL (used as canonical fallback if `canonical` not provided) */
  url?: string;
  /** Optional explicit canonical URL — takes precedence over `url` for the displayed link */
  canonical?: string;
}

/**
 * Format URL the way Google renders it in SERP:
 * - Shows full host (including subdomain like "blog.realtrust.ro")
 * - Strips leading "www."
 * - Path segments separated by " › " (decoded, hyphens → spaces capitalized lightly)
 * - Trailing slash removed
 */
function formatSerpUrl(raw: string, device: Device): { host: string; crumbs: string[]; full: string } {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    const segments = u.pathname.split("/").filter(Boolean).map((seg) => {
      try {
        return decodeURIComponent(seg).replace(/-/g, " ");
      } catch {
        return seg.replace(/-/g, " ");
      }
    });
    // Mobile collapses long paths: keep first + last if more than 2 segments
    const crumbs = device === "mobile" && segments.length > 2
      ? [segments[0], "…", segments[segments.length - 1]]
      : segments;
    return { host, crumbs, full: u.origin + u.pathname.replace(/\/$/, "") };
  } catch {
    return { host: raw, crumbs: [], full: raw };
  }
}

export const SerpPreview = ({ title, description, url = "https://realtrust.ro/", canonical }: Props) => {
  const [device, setDevice] = useState<Device>("desktop");
  const [, force] = useState(0);
  const ready = useRef(false);

  // Ensure measurements after mount (canvas needs DOM)
  useEffect(() => {
    ready.current = true;
    force((v) => v + 1);
  }, []);

  const cfg = LIMITS[device];
  const titlePx = ready.current ? measureText(title || "", cfg.titleFont) : 0;
  const metaPx = ready.current ? measureText(description || "", cfg.metaFont) : 0;
  const titleOver = titlePx > cfg.titleMax;
  const metaOver = metaPx > cfg.metaMax;

  const titleShown = ready.current ? truncateToWidth(title || "", cfg.titleFont, cfg.titleMax) : { display: title, truncated: false };
  const metaShown = ready.current ? truncateToWidth(description || "", cfg.metaFont, cfg.metaMax) : { display: description, truncated: false };

  // Canonical takes precedence; fall back to provided url
  const effectiveUrl = (canonical && canonical.trim()) || url;
  const serp = formatSerpUrl(effectiveUrl, device);
  const canonicalDiffers = !!canonical && (() => {
    try {
      const a = new URL(canonical);
      const b = new URL(url);
      return a.origin + a.pathname.replace(/\/$/, "") !== b.origin + b.pathname.replace(/\/$/, "");
    } catch { return false; }
  })();

  const PixelBar = ({ value, max, label }: { value: number; max: number; label: string }) => {
    const pct = Math.min(100, (value / max) * 100);
    const over = value > max;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className={`font-mono ${over ? "text-destructive font-semibold" : "text-foreground"}`}>
            {value}px / {max}px
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${over ? "bg-destructive" : pct > 85 ? "bg-amber-500" : "bg-emerald-500"}`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 border border-border rounded-lg p-3 bg-background">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase text-muted-foreground">SERP Preview Live</p>
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setDevice("desktop")}
            className={`px-2.5 py-1 text-xs flex items-center gap-1 ${device === "desktop" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setDevice("mobile")}
            className={`px-2.5 py-1 text-xs flex items-center gap-1 ${device === "mobile" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </button>
        </div>
      </div>

      {/* Snippet mock */}
      <div
        className={`bg-white rounded-md border border-border p-4 mx-auto ${device === "mobile" ? "max-w-[400px]" : "max-w-full"}`}
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-[10px] font-bold">R</div>
          <div className="leading-tight min-w-0 flex-1">
            <div className="text-[12px] text-gray-800 truncate">RealTrust</div>
            <div className="text-[12px] text-gray-600 flex items-center gap-1 flex-wrap">
              <span className="truncate">{serp.host}</span>
              {serp.crumbs.map((c, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="text-gray-400">›</span>
                  <span className="truncate">{c}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div
          className="text-[#1a0dab] hover:underline cursor-pointer leading-snug"
          style={{ fontSize: device === "mobile" ? "18px" : "20px" }}
        >
          {titleShown.display || <span className="text-gray-400 italic">(fără titlu)</span>}
        </div>
        <div className="text-[#4d5156] text-[14px] leading-snug mt-1">
          {metaShown.display || <span className="text-gray-400 italic">(fără meta description)</span>}
        </div>
      </div>

      {/* Pixel indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PixelBar value={titlePx} max={cfg.titleMax} label="Title width" />
        <PixelBar value={metaPx} max={cfg.metaMax} label="Meta description width" />
      </div>

      {/* Canonical / URL info */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md p-2">
        <Link2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="font-mono break-all">
            <span className="font-semibold text-foreground">{canonical ? "Canonical:" : "URL:"}</span> {serp.full}
          </div>
          {canonicalDiffers && (
            <div className="text-amber-700 dark:text-amber-400">
              ⚠ Canonical diferă de URL-ul paginii — Google va indexa varianta canonical.
            </div>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2">
        {titleOver ? (
          <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Titlu trunchiat în Google ({device})</Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3" /> Titlu OK</Badge>
        )}
        {metaOver ? (
          <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Meta trunchiată ({device})</Badge>
        ) : (
          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="h-3 w-3" /> Meta OK</Badge>
        )}
      </div>
    </div>
  );
};

export default SerpPreview;
