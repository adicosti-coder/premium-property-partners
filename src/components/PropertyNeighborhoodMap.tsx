import React, { useEffect, useRef, useState, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/i18n/LanguageContext';
import { Loader2, MapPin } from 'lucide-react';
import { isWebGLSupported, acquireMapSlot, releaseMapSlot } from '@/utils/webglSupport';
import { getPropertyPois, resolvePropertyCoordinates } from '@/utils/propertyGeo';

/** Category colors for POI markers */
const categoryColors: Record<string, string> = {
  tourist: '#e74c3c',
  restaurant: '#e67e22',
  supermarket: '#27ae60',
  pharmacy: '#3498db',
  cafe: '#8e44ad',
  park: '#2ecc71',
  transport: '#34495e',
  mall: '#f39c12',
  bar: '#e91e63',
};

interface Props {
  propertySlug: string;
  propertyName?: string;
  propertyLocation?: string;
  propertyLatitude?: number | null;
  propertyLongitude?: number | null;
}

/** Default center: Timișoara center (Piața Victoriei) */
const defaultCoordinates: [number, number] = [21.2246, 45.7537];


const PropertyNeighborhoodMap: React.FC<Props> = ({ propertySlug, propertyName, propertyLocation, propertyLatitude, propertyLongitude }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const { language } = useLanguage();

  // Resolve coordinates: slug match → name match → default
  const coords = resolvePropertyCoordinates({ slug: propertySlug, name: propertyName, location: propertyLocation, latitude: propertyLatitude, longitude: propertyLongitude }) || defaultCoordinates;
  const pois = getPropertyPois({ slug: propertySlug, name: propertyName, location: propertyLocation, latitude: propertyLatitude, longitude: propertyLongitude });

  // Fetch token
  useEffect(() => {
    if (!isWebGLSupported()) {
      setError(language === 'ro' ? 'Browserul nu suportă WebGL' : 'Browser does not support WebGL');
      setIsLoading(false);
      return;
    }
    const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (envToken) { setMapboxToken(envToken); setIsLoading(false); return; }

    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-mapbox-token');
        if (fnError) throw fnError;
        if (data?.token) setMapboxToken(data.token);
        else setError(language === 'ro' ? 'Token hartă neconfigurat' : 'Map token not configured');
      } catch {
        setError(language === 'ro' ? 'Eroare la încărcarea hărții' : 'Failed to load map');
      } finally { setIsLoading(false); }
    })();
  }, [language]);

  // Init map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !coords) return;

    if (!acquireMapSlot()) {
      setError(language === 'ro' ? 'O singură hartă poate fi activă' : 'Only one map can be active');
      return;
    }

    mapboxgl.accessToken = mapboxToken;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: coords,
        zoom: 14,
        failIfMajorPerformanceCaveat: false,
      });

      map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

      // Property marker
      const markerEl = document.createElement('div');
      markerEl.setAttribute('aria-label', propertyName || propertySlug);
      markerEl.style.cssText = `
        width: 44px; height: 44px;
        background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%);
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white; z-index: 10;
      `;
      markerEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div style="padding:8px;font-family:system-ui;"><strong style="font-size:13px;">${propertyName || propertySlug}</strong></div>`
      );

      new mapboxgl.Marker(markerEl).setLngLat(coords).setPopup(popup).addTo(map.current);

      // POI markers
      pois.forEach((poi) => {
        const poiEl = document.createElement('div');
        const poiLabel = language === 'ro' ? poi.name : poi.nameEn;
        poiEl.setAttribute('aria-label', poiLabel);
        const color = categoryColors[poi.category] || '#95a5a6';
        poiEl.style.cssText = `
          width: 32px; height: 32px;
          background: ${color};
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid white;
          font-size: 14px; cursor: pointer;
        `;
        poiEl.textContent = poi.emoji;

        const poiName = language === 'ro' ? poi.name : poi.nameEn;
        const poiPopup = new mapboxgl.Popup({ offset: 20 }).setHTML(
          `<div style="padding:6px 10px;font-family:system-ui;">
            <strong style="font-size:12px;">${poi.emoji} ${poiName}</strong>
          </div>`
        );

        new mapboxgl.Marker(poiEl)
          .setLngLat([poi.lng, poi.lat])
          .setPopup(poiPopup)
          .addTo(map.current!);
      });

      map.current.on('load', () => {
        try { map.current?.resize(); } catch {}
      });

    } catch {
      setError(language === 'ro' ? 'Nu s-a putut inițializa harta' : 'Could not initialize map');
    }

    return () => {
      map.current?.remove();
      map.current = null;
      releaseMapSlot();
    };
  }, [mapboxToken, coords, propertySlug, language, propertyName, pois]);

  // coords always available via fallback

  if (isLoading) {
    return (
      <div className="w-full bg-muted rounded-2xl flex items-center justify-center" style={{ minHeight: '600px' }}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-muted rounded-2xl flex items-center justify-center text-center px-4" style={{ minHeight: '600px' }}>
        <div className="flex flex-col items-center gap-2">
          <MapPin className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div ref={mapContainer} className="w-full rounded-2xl border border-border shadow-sm" style={{ minHeight: '600px', height: '600px' }} />
      {/* POI Legend */}
      {pois.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {Array.from(new Set(pois.map(p => p.category))).map(cat => {
            const sample = pois.find(p => p.category === cat)!;
            const labels: Record<string, { ro: string; en: string }> = {
              tourist: { ro: 'Atracții', en: 'Attractions' },
              restaurant: { ro: 'Restaurante', en: 'Restaurants' },
              supermarket: { ro: 'Supermarket', en: 'Supermarket' },
              pharmacy: { ro: 'Farmacie', en: 'Pharmacy' },
              cafe: { ro: 'Cafenea', en: 'Café' },
              park: { ro: 'Parc', en: 'Park' },
              transport: { ro: 'Transport', en: 'Transport' },
              mall: { ro: 'Mall', en: 'Mall' },
              bar: { ro: 'Bar', en: 'Bar' },
            };
            return (
              <span key={cat} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border border-border bg-card">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: categoryColors[cat] }} />
                {sample.emoji} {labels[cat]?.[language === 'ro' ? 'ro' : 'en'] || cat}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default memo(PropertyNeighborhoodMap);
