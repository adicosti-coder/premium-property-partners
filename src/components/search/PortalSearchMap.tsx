import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RADIUS_OPTIONS } from "@/lib/portalSearch";
import { isWebGLSupported } from "@/utils/webglSupport";

export interface MapPin {
  id: string;
  name: string;
  href: string;
  lat: number;
  lng: number;
  priceLabel?: string | null;
}

interface Props {
  pins: MapPin[];
  center: { lat: number; lng: number };
  radiusKm: number;
  onCenterChange: (c: { lat: number; lng: number }) => void;
  onRadiusChange: (km: number) => void;
  onReset: () => void;
  english?: boolean;
}

const DEFAULT_CENTER: [number, number] = [21.227, 45.754];

/** Cerc aproximativ în GeoJSON, pentru raza de căutare. */
function circle(center: { lat: number; lng: number }, km: number) {
  const points: [number, number][] = [];
  const latK = km / 110.574;
  const lngK = km / (111.32 * Math.cos((center.lat * Math.PI) / 180));
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI;
    points.push([center.lng + lngK * Math.cos(a), center.lat + latK * Math.sin(a)]);
  }
  return {
    type: "Feature" as const,
    geometry: { type: "Polygon" as const, coordinates: [points] },
    properties: {},
  };
}

/** Căutare pe hartă cu rază, ca pe portalurile mari. */
export default function PortalSearchMap({
  pins,
  center,
  radiusKm,
  onCenterChange,
  onRadiusChange,
  onReset,
  english = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const t = (ro: string, en: string) => (english ? en : ro);
  const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined;

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !token || !isWebGLSupported()) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DEFAULT_CENTER,
      zoom: 11.5,
      attributionControl: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (e) => onCenterChange({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    map.on("load", () => {
      map.addSource("radius", { type: "geojson", data: circle(center, radiusKm) });
      map.addLayer({
        id: "radius-fill",
        type: "fill",
        source: "radius",
        paint: { "fill-color": "#D4AF37", "fill-opacity": 0.15 },
      });
      map.addLayer({
        id: "radius-line",
        type: "line",
        source: "radius",
        paint: { "line-color": "#D4AF37", "line-width": 2 },
      });
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource("radius") as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(circle(center, radiusKm) as never);
  }, [center, radiusKm]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = pins.map((p) => {
      const el = document.createElement("a");
      el.href = p.href;
      el.setAttribute("aria-label", p.name);
      el.className =
        "block rounded-full bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 shadow";
      el.textContent = p.priceLabel || "•";
      return new mapboxgl.Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(new mapboxgl.Popup({ offset: 16 }).setText(p.name))
        .addTo(map);
    });
  }, [pins]);

  if (!token || !isWebGLSupported()) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("Harta nu se poate afișa pe acest dispozitiv.", "The map cannot be displayed on this device.")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("Rază", "Radius")}</span>
          <Select value={String(radiusKm)} onValueChange={(v) => onRadiusChange(Number(v))}>
            <SelectTrigger className="min-h-11 w-28" aria-label={t("Rază căutare", "Search radius")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((r) => (
                <SelectItem key={r} value={String(r)}>{r} km</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("Apasă pe hartă ca să muți centrul căutării.", "Tap the map to move the search centre.")}
        </p>
        <Button type="button" variant="ghost" className="min-h-11" onClick={onReset}>
          {t("Toată Timișoara", "All of Timișoara")}
        </Button>
      </div>
      <div ref={containerRef} className="w-full h-[420px] rounded-2xl overflow-hidden border border-border" />
    </div>
  );
}
