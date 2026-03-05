import React, { useEffect, useRef, useState, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/i18n/LanguageContext';
import { Loader2, MapPin } from 'lucide-react';
import { isWebGLSupported, acquireMapSlot, releaseMapSlot } from '@/utils/webglSupport';

/** Verified geocoded coordinates per property slug */
const propertyCoordinates: Record<string, [number, number]> = {
  'ring-apart-hotel-spacious-deluxe': [21.2110, 45.7805],
  'green-forest-apart-hotel': [21.2490, 45.7785],
  'fructus-plaza-ultracentral-apart-hotel': [21.2209, 45.7595],
  'fullview-studio-deluxe': [21.2150, 45.7529],
  'avenue-of-mara-apart-hotel': [21.2148, 45.7527],
  'helios-apart-hotel': [21.2345, 45.7433],
  'ateneo-trevi-2-apart-hotel': [21.2113, 45.7786],
  'sunset-da-ra-studio-deluxe': [21.2145, 45.7530],
  'mara-luxury-golden-apart-hotel': [21.2134, 45.7535],
  'ateneo-apart-hotel-studio-deluxe': [21.2115, 45.7788],
  'modern-studio-apart-hotel': [21.2603, 45.7656],
};

interface Props {
  propertySlug: string;
  propertyName?: string;
}

const PropertyNeighborhoodMap: React.FC<Props> = ({ propertySlug, propertyName }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const { language } = useLanguage();

  const coords = propertyCoordinates[propertySlug];

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
        zoom: 15,
        failIfMajorPerformanceCaveat: false,
      });

      map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

      // Property marker
      const markerEl = document.createElement('div');
      markerEl.style.cssText = `
        width: 44px; height: 44px;
        background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%);
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white;
      `;
      markerEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `<div style="padding:8px;font-family:system-ui;"><strong style="font-size:13px;">${propertyName || propertySlug}</strong></div>`
      );

      new mapboxgl.Marker(markerEl).setLngLat(coords).setPopup(popup).addTo(map.current);

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
  }, [mapboxToken, coords, propertySlug, language, propertyName]);

  if (!coords) return null;

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

  return <div ref={mapContainer} className="w-full rounded-2xl border border-border shadow-sm" style={{ minHeight: '600px', height: '600px' }} />;
};

export default memo(PropertyNeighborhoodMap);
