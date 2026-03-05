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

/** POI data per property - tourist + utility POIs with real coordinates */
interface POI {
  name: string;
  nameEn: string;
  lng: number;
  lat: number;
  category: 'tourist' | 'restaurant' | 'supermarket' | 'pharmacy' | 'cafe' | 'park' | 'transport' | 'mall' | 'bar';
  emoji: string;
}

const poiData: Record<string, POI[]> = {
  'ring-apart-hotel-spacious-deluxe': [
    { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️' },
    { name: 'Piața Victoriei', nameEn: 'Victory Square', lng: 21.2246, lat: 45.7537, category: 'tourist', emoji: '🏛️' },
    { name: 'Catedrala Mitropolitană', nameEn: 'Metropolitan Cathedral', lng: 21.2253, lat: 45.7530, category: 'tourist', emoji: '⛪' },
    { name: 'Iulius Town Mall', nameEn: 'Iulius Town Mall', lng: 21.2270, lat: 45.7695, category: 'mall', emoji: '🛍️' },
    { name: 'Lidl Calea Aradului', nameEn: 'Lidl Calea Aradului', lng: 21.2125, lat: 45.7830, category: 'supermarket', emoji: '🛒' },
    { name: 'Farmacia Catena', nameEn: 'Catena Pharmacy', lng: 21.2105, lat: 45.7815, category: 'pharmacy', emoji: '💊' },
    { name: 'Restaurant La Capite', nameEn: 'La Capite Restaurant', lng: 21.2274, lat: 45.7560, category: 'restaurant', emoji: '🍽️' },
    { name: 'Parcul Rozelor', nameEn: 'Rose Park', lng: 21.2290, lat: 45.7620, category: 'park', emoji: '🌳' },
    { name: 'Cafenea de Specialitate', nameEn: 'Specialty Coffee', lng: 21.2130, lat: 45.7800, category: 'cafe', emoji: '☕' },
  ],
  'green-forest-apart-hotel': [
    { name: 'Aquapark Amazonia', nameEn: 'Amazonia Aquapark', lng: 21.2570, lat: 45.7720, category: 'tourist', emoji: '🏊' },
    { name: 'Iulius Town Mall', nameEn: 'Iulius Town Mall', lng: 21.2270, lat: 45.7695, category: 'mall', emoji: '🛍️' },
    { name: 'Lidl Constructorilor', nameEn: 'Lidl Constructorilor', lng: 21.2510, lat: 45.7810, category: 'supermarket', emoji: '🛒' },
    { name: 'Farmacia Sensiblu', nameEn: 'Sensiblu Pharmacy', lng: 21.2480, lat: 45.7790, category: 'pharmacy', emoji: '💊' },
    { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️' },
    { name: 'Pădurea Verde', nameEn: 'Green Forest Park', lng: 21.2620, lat: 45.7850, category: 'park', emoji: '🌳' },
    { name: 'Restaurant Pizzeria', nameEn: 'Pizzeria Restaurant', lng: 21.2500, lat: 45.7780, category: 'restaurant', emoji: '🍽️' },
    { name: 'Bar & Lounge', nameEn: 'Bar & Lounge', lng: 21.2495, lat: 45.7775, category: 'bar', emoji: '🍸' },
  ],
  'fructus-plaza-ultracentral-apart-hotel': [
    { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️' },
    { name: 'Piața Victoriei', nameEn: 'Victory Square', lng: 21.2246, lat: 45.7537, category: 'tourist', emoji: '🏛️' },
    { name: 'Opera Națională', nameEn: 'National Opera', lng: 21.2245, lat: 45.7545, category: 'tourist', emoji: '🎭' },
    { name: 'Castelul Huniade', nameEn: 'Hunyadi Castle', lng: 21.2255, lat: 45.7570, category: 'tourist', emoji: '🏰' },
    { name: 'Penny Market', nameEn: 'Penny Market', lng: 21.2200, lat: 45.7580, category: 'supermarket', emoji: '🛒' },
    { name: 'Farmacia Dr. Max', nameEn: 'Dr. Max Pharmacy', lng: 21.2215, lat: 45.7590, category: 'pharmacy', emoji: '💊' },
    { name: 'Restaurant Centru', nameEn: 'Downtown Restaurant', lng: 21.2250, lat: 45.7565, category: 'restaurant', emoji: '🍽️' },
    { name: 'Cafenea Centru', nameEn: 'Downtown Café', lng: 21.2230, lat: 45.7560, category: 'cafe', emoji: '☕' },
    { name: 'Parcul Civic', nameEn: 'Civic Park', lng: 21.2310, lat: 45.7510, category: 'park', emoji: '🌳' },
  ],
  'fullview-studio-deluxe': [
    { name: 'Iulius Town Mall', nameEn: 'Iulius Town Mall', lng: 21.2270, lat: 45.7695, category: 'mall', emoji: '🛍️' },
    { name: 'Gara de Nord', nameEn: 'North Railway Station', lng: 21.2070, lat: 45.7490, category: 'transport', emoji: '🚂' },
    { name: 'Lidl Circumvalațiunii', nameEn: 'Lidl Circumvalațiunii', lng: 21.2160, lat: 45.7510, category: 'supermarket', emoji: '🛒' },
    { name: 'Farmacia Catena', nameEn: 'Catena Pharmacy', lng: 21.2155, lat: 45.7520, category: 'pharmacy', emoji: '💊' },
    { name: 'Restaurant & Cafenea', nameEn: 'Restaurant & Café', lng: 21.2165, lat: 45.7540, category: 'restaurant', emoji: '🍽️' },
    { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️' },
    { name: 'Parcul Botanic', nameEn: 'Botanical Park', lng: 21.2100, lat: 45.7500, category: 'park', emoji: '🌳' },
    { name: 'Cocktail Bar', nameEn: 'Cocktail Bar', lng: 21.2145, lat: 45.7535, category: 'bar', emoji: '🍸' },
  ],
  'avenue-of-mara-apart-hotel': [
    { name: 'Iulius Town Mall', nameEn: 'Iulius Town Mall', lng: 21.2270, lat: 45.7695, category: 'mall', emoji: '🛍️' },
    { name: 'Gara de Nord', nameEn: 'North Railway Station', lng: 21.2070, lat: 45.7490, category: 'transport', emoji: '🚂' },
    { name: 'Lidl Circumvalațiunii', nameEn: 'Lidl Circumvalațiunii', lng: 21.2160, lat: 45.7510, category: 'supermarket', emoji: '🛒' },
    { name: 'Farmacia Catena', nameEn: 'Catena Pharmacy', lng: 21.2155, lat: 45.7520, category: 'pharmacy', emoji: '💊' },
    { name: 'Restaurant & Cafenea', nameEn: 'Restaurant & Café', lng: 21.2165, lat: 45.7540, category: 'restaurant', emoji: '🍽️' },
    { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️' },
    { name: 'Parcul Botanic', nameEn: 'Botanical Park', lng: 21.2100, lat: 45.7500, category: 'park', emoji: '🌳' },
    { name: 'Bar & Pub', nameEn: 'Bar & Pub', lng: 21.2140, lat: 45.7525, category: 'bar', emoji: '🍸' },
  ],
  'helios-apart-hotel': [
    { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️' },
    { name: 'Universitatea de Vest', nameEn: 'West University', lng: 21.2280, lat: 45.7475, category: 'tourist', emoji: '🎓' },
    { name: 'Kaufland', nameEn: 'Kaufland Supermarket', lng: 21.2360, lat: 45.7410, category: 'supermarket', emoji: '🛒' },
    { name: 'Farmacia Sensiblu', nameEn: 'Sensiblu Pharmacy', lng: 21.2340, lat: 45.7440, category: 'pharmacy', emoji: '💊' },
    { name: 'Parcul Civic', nameEn: 'Civic Park', lng: 21.2310, lat: 45.7510, category: 'park', emoji: '🌳' },
    { name: 'Restaurant & Cafenea', nameEn: 'Restaurant & Café', lng: 21.2350, lat: 45.7445, category: 'restaurant', emoji: '🍽️' },
    { name: 'Cafenea de Specialitate', nameEn: 'Specialty Coffee', lng: 21.2330, lat: 45.7450, category: 'cafe', emoji: '☕' },
    { name: 'Gara de Nord', nameEn: 'North Railway Station', lng: 21.2070, lat: 45.7490, category: 'transport', emoji: '🚂' },
  ],
  'ateneo-trevi-2-apart-hotel': [
    { name: 'Lidl Torontalului', nameEn: 'Lidl Torontalului', lng: 21.2100, lat: 45.7800, category: 'supermarket', emoji: '🛒' },
    { name: 'Iulius Town Mall', nameEn: 'Iulius Town Mall', lng: 21.2270, lat: 45.7695, category: 'mall', emoji: '🛍️' },
    { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️' },
    { name: 'Farmacia Catena', nameEn: 'Catena Pharmacy', lng: 21.2110, lat: 45.7795, category: 'pharmacy', emoji: '💊' },
    { name: 'Restaurant Ateneo', nameEn: 'Ateneo Restaurant', lng: 21.2120, lat: 45.7790, category: 'restaurant', emoji: '🍽️' },
    { name: 'Cafenea Ateneo', nameEn: 'Ateneo Café', lng: 21.2118, lat: 45.7792, category: 'cafe', emoji: '☕' },
    { name: 'Zona Verde Rezidențială', nameEn: 'Green Residential Area', lng: 21.2105, lat: 45.7795, category: 'park', emoji: '🌳' },
    { name: 'Aquapark Amazonia', nameEn: 'Amazonia Aquapark', lng: 21.2570, lat: 45.7720, category: 'tourist', emoji: '🏊' },
  ],
  'sunset-da-ra-studio-deluxe': [
    { name: 'Iulius Town Mall', nameEn: 'Iulius Town Mall', lng: 21.2270, lat: 45.7695, category: 'mall', emoji: '🛍️' },
    { name: 'Gara de Nord', nameEn: 'North Railway Station', lng: 21.2070, lat: 45.7490, category: 'transport', emoji: '🚂' },
    { name: 'Lidl Circumvalațiunii', nameEn: 'Lidl Circumvalațiunii', lng: 21.2160, lat: 45.7510, category: 'supermarket', emoji: '🛒' },
    { name: 'Farmacia Catena', nameEn: 'Catena Pharmacy', lng: 21.2155, lat: 45.7520, category: 'pharmacy', emoji: '💊' },
    { name: 'Restaurant & Cafenea', nameEn: 'Restaurant & Café', lng: 21.2165, lat: 45.7540, category: 'restaurant', emoji: '🍽️' },
    { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️' },
    { name: 'Parcul Botanic', nameEn: 'Botanical Park', lng: 21.2100, lat: 45.7500, category: 'park', emoji: '🌳' },
    { name: 'Bar City of Mara', nameEn: 'City of Mara Bar', lng: 21.2150, lat: 45.7535, category: 'bar', emoji: '🍸' },
  ],
  'ateneo-apart-hotel-studio-deluxe': [
    { name: 'Lidl Torontalului', nameEn: 'Lidl Torontalului', lng: 21.2100, lat: 45.7800, category: 'supermarket', emoji: '🛒' },
    { name: 'Iulius Town Mall', nameEn: 'Iulius Town Mall', lng: 21.2270, lat: 45.7695, category: 'mall', emoji: '🛍️' },
    { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️' },
    { name: 'Farmacia Catena', nameEn: 'Catena Pharmacy', lng: 21.2110, lat: 45.7795, category: 'pharmacy', emoji: '💊' },
    { name: 'Restaurant Ateneo', nameEn: 'Ateneo Restaurant', lng: 21.2120, lat: 45.7790, category: 'restaurant', emoji: '🍽️' },
    { name: 'Cafenea Ateneo', nameEn: 'Ateneo Café', lng: 21.2118, lat: 45.7792, category: 'cafe', emoji: '☕' },
    { name: 'Zona Verde Rezidențială', nameEn: 'Green Residential Area', lng: 21.2105, lat: 45.7795, category: 'park', emoji: '🌳' },
    { name: 'Aquapark Amazonia', nameEn: 'Amazonia Aquapark', lng: 21.2570, lat: 45.7720, category: 'tourist', emoji: '🏊' },
  ],
  'modern-studio-apart-hotel': [
    { name: 'Aquapark Amazonia', nameEn: 'Amazonia Aquapark', lng: 21.2570, lat: 45.7720, category: 'tourist', emoji: '🏊' },
    { name: 'Lidl Bărnuțiu', nameEn: 'Lidl Bărnuțiu', lng: 21.2580, lat: 45.7670, category: 'supermarket', emoji: '🛒' },
    { name: 'Spitalul Județean', nameEn: 'County Hospital', lng: 21.2550, lat: 45.7630, category: 'tourist', emoji: '🏥' },
    { name: 'Piața Unirii', nameEn: 'Union Square', lng: 21.2265, lat: 45.7571, category: 'tourist', emoji: '🏛️' },
    { name: 'Iulius Town Mall', nameEn: 'Iulius Town Mall', lng: 21.2270, lat: 45.7695, category: 'mall', emoji: '🛍️' },
    { name: 'Farmacia Sensiblu', nameEn: 'Sensiblu Pharmacy', lng: 21.2590, lat: 45.7660, category: 'pharmacy', emoji: '💊' },
    { name: 'Restaurant & Cafenea', nameEn: 'Restaurant & Café', lng: 21.2610, lat: 45.7650, category: 'restaurant', emoji: '🍽️' },
    { name: 'Cafenea de Specialitate', nameEn: 'Specialty Coffee', lng: 21.2595, lat: 45.7665, category: 'cafe', emoji: '☕' },
  ],
};

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
}

const PropertyNeighborhoodMap: React.FC<Props> = ({ propertySlug, propertyName }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const { language } = useLanguage();

  const coords = propertyCoordinates[propertySlug];
  const pois = poiData[propertySlug] || [];

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
