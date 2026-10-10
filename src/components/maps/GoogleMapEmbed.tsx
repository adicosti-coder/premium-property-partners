import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

/** Browser Maps key (referrer-restricted to realtrust.ro), safe to embed publicly. */
export const GOOGLE_MAPS_BROWSER_KEY =
  (import.meta.env["VITE_GOOGLE_MAPS_API_KEY"] as string | undefined) || "AIzaSyOzEguKXY_yi738etpgK8A5V-QkKN2vvFo";

type Props = {
  latitude?: number | null;
  longitude?: number | null;
  /** Free-text fallback (zone/address); Timișoara is appended automatically. */
  query?: string | null;
  title?: string;
  zoom?: number;
  className?: string;
};

export function buildGoogleMapEmbedUrl({ latitude, longitude, query, zoom = 15 }: Props): string | null {
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude) && latitude && longitude;
  const q = hasCoords
    ? `${latitude},${longitude}`
    : query?.trim()
      ? `${query.trim()}${/timi[sș]oara/i.test(query) ? "" : ", Timișoara"}, Romania`
      : null;
  if (!q) return null;
  return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_BROWSER_KEY}&q=${encodeURIComponent(q)}&zoom=${hasCoords ? zoom : 14}&language=ro`;
}

/** Lazy Google Maps Embed — mounts only when near the viewport (keeps LCP fast). */
const GoogleMapEmbed = ({ title = "Hartă locație", className = "h-72", ...rest }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const src = buildGoogleMapEmbedUrl(rest);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  if (!src) return null;
  return (
    <div ref={ref} className={`relative w-full overflow-hidden rounded-xl border border-border bg-muted ${className}`}>
      {visible ? (
        <iframe title={title} src={src} className="h-full w-full" style={{ border: 0 }} loading="lazy" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-5 w-5 text-primary" /> {title}
        </div>
      )}
    </div>
  );
};

/** Small admin button that opens the exact location in a dialog. */
export const GoogleMapButton = (props: Props) => {
  if (!buildGoogleMapEmbedUrl(props)) return null;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="inline-flex min-h-[32px] items-center gap-1 text-xs text-primary hover:underline" aria-label="Vezi locația pe hartă">
          <MapPin className="h-3 w-3" /> Hartă
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{props.title || "Locație pe hartă"}</DialogTitle></DialogHeader>
        <GoogleMapEmbed {...props} className="h-[420px]" />
      </DialogContent>
    </Dialog>
  );
};

export default GoogleMapEmbed;
