import { useEffect, useRef, useState, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useLanguage } from '@/i18n/LanguageContext';
import { MapPin } from 'lucide-react';

// Zone coordinates in Timișoara
const ZONE_COORDS: Record<string, [number, number]> = {
  "Fructus Plaza": [21.2270, 45.7580],
  "ISHO": [21.2180, 45.7470],
  "Paltim": [21.2320, 45.7580],
  "Centru": [21.2246, 45.7537],
  "Iulius Town": [21.2370, 45.7630],
  "City of Mara": [21.2080, 45.7440],
  "Nord-One": [21.2280, 45.7680],
  "Monarch": [21.2190, 45.7600],
  "Ateneo": [21.2250, 45.7510],
  "Vivalia": [21.2360, 45.7610],
  "Altă zonă": [21.2246, 45.7537],
};

const NEARBY_POIS: { name: string; nameEn: string; emoji: string; lat: number; lng: number; color: string }[] = [
  { name: "Iulius Town", nameEn: "Iulius Town Mall", emoji: "🛍️", lat: 45.7630, lng: 21.2370, color: "#3b82f6" },
  { name: "Piața Victoriei", nameEn: "Victory Square", emoji: "🏛️", lat: 45.7537, lng: 21.2246, color: "#f59e0b" },
  { name: "Parcul Central", nameEn: "Central Park", emoji: "🌳", lat: 45.7530, lng: 21.2280, color: "#22c55e" },
  { name: "Gara de Nord", nameEn: "North Station", emoji: "🚂", lat: 45.7500, lng: 21.2070, color: "#ef4444" },
  { name: "UPT", nameEn: "Politehnica University", emoji: "🎓", lat: 45.7470, lng: 21.2260, color: "#8b5cf6" },
];

interface HostScanMiniMapProps {
  zone: string;
  className?: string;
}

const HostScanMiniMap = memo(({ zone, className = "" }: HostScanMiniMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState(false);
  const { language } = useLanguage();

  const coords = ZONE_COORDS[zone] || ZONE_COORDS["Centru"];

  useEffect(() => {
    if (!mapContainer.current) return;

    const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (!token) { setError(true); return; }

    mapboxgl.accessToken = token;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: coords,
        zoom: 13.5,
        interactive: true,
        attributionControl: false,
      });

      map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

      // Zone marker (gold)
      const zoneEl = document.createElement('div');
      zoneEl.className = 'hostscan-zone-marker';
      zoneEl.style.cssText = 'width:36px;height:36px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 12px rgba(245,158,11,0.5);cursor:pointer;';
      zoneEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';

      const zonePopup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div style="padding:8px;font-family:system-ui;"><strong style="font-size:13px;">📍 ${zone}</strong><p style="font-size:11px;color:#888;margin:2px 0 0;">${language === 'ro' ? 'Zona analizată' : 'Analyzed zone'}</p></div>`
      );

      new mapboxgl.Marker(zoneEl).setLngLat(coords).setPopup(zonePopup).addTo(map.current);

      // POI markers
      NEARBY_POIS.forEach(poi => {
        const el = document.createElement('div');
        el.style.cssText = `width:26px;height:26px;background:${poi.color};border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.8);box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer;font-size:12px;`;
        el.textContent = poi.emoji;

        const popup = new mapboxgl.Popup({ offset: 18 }).setHTML(
          `<div style="padding:6px 10px;font-family:system-ui;"><strong style="font-size:12px;">${poi.emoji} ${language === 'ro' ? poi.name : poi.nameEn}</strong></div>`
        );

        new mapboxgl.Marker(el).setLngLat([poi.lng, poi.lat]).setPopup(popup).addTo(map.current!);
      });

    } catch {
      setError(true);
    }

    return () => { map.current?.remove(); };
  }, [coords, zone, language]);

  if (error) {
    return (
      <div className={`rounded-2xl bg-muted/30 border border-border/30 p-6 flex flex-col items-center justify-center gap-2 ${className}`} style={{ minHeight: 200 }}>
        <MapPin className="w-6 h-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">{language === 'ro' ? 'Harta nu este disponibilă' : 'Map unavailable'}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden border border-border/30 shadow-lg ${className}`}>
      <div ref={mapContainer} style={{ width: '100%', height: 250 }} />
      <div className="bg-card/80 backdrop-blur-sm px-3 py-2 flex items-center gap-2 border-t border-border/20">
        <MapPin className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-medium text-foreground">{zone}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {language === 'ro' ? 'Hartă interactivă' : 'Interactive map'}
        </span>
      </div>
    </div>
  );
});

HostScanMiniMap.displayName = 'HostScanMiniMap';
export default HostScanMiniMap;
