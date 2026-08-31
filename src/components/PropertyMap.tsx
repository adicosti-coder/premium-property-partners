import React, { useEffect, useRef, useState, memo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { properties } from '@/data/properties';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/i18n/LanguageContext';
import { Home, Loader2, MapPin } from 'lucide-react';
import { isWebGLSupported, acquireMapSlot, releaseMapSlot } from '@/utils/webglSupport';
import { resolvePropertyCoordinates } from '@/utils/propertyGeo';

// Property coordinates in Timișoara - matched to actual locations
const propertyCoordinates: Record<string, [number, number]> = {
  // Calea Circumvalațiunii 4, Ansamblul NordOne (Timișoara)
  'ring-apart-hotel-spacious-deluxe': [21.217955, 45.756134],
  // Strada Constructorilor 52, Denya Forest 5 (zona Lipovei)
  'green-forest-apart-hotel': [21.2490, 45.7785],
  // Str. Gheorghe Lazăr nr.24, clădirea Fructus Plaza
  'fructus-plaza-ultracentral-apart-hotel': [21.2209, 45.7595],
  // Calea Circumvalațiunii nr.1, City of Mara, M9 (spread for tap-target spacing)
  'fullview-studio-deluxe': [21.2165, 45.7522],
  // Calea Circumvalațiunii nr.1, City of Mara, M8
  'avenue-of-mara-apart-hotel': [21.2130, 45.7520],
  // Strada Argeș nr.4 (zona Elisabetin)
  'helios-apart-hotel': [21.2345, 45.7433],
  // Calea Torontalului nr.104K, Trevi 2, Ansamblul Ateneo (spread for tap-target spacing)
  'ateneo-trevi-2-apart-hotel': [21.2095, 45.7792],
  // Calea Circumvalațiunii nr.1, City of Mara, M11
  'sunset-da-ra-studio-deluxe': [21.2150, 45.7540],
  // Strada Sinaia nr.2B - City of Mara M2-M7
  'mara-luxury-golden-apart-hotel': [21.2115, 45.7535],
  // Calea Torontalului nr.104K, Trevi 2, Ansamblul Ateneo
  'ateneo-apart-hotel-studio-deluxe': [21.2130, 45.7780],
  // Bd. Simion Bărnuțiu nr.79 (zona Dorobanților)
  'modern-studio-apart-hotel': [21.2603, 45.7656],
};

interface PropertyMapProps {
  onPropertySelect?: (slug: string) => void;
  selectedProperty?: string;
  className?: string;
}

const PropertyMap: React.FC<PropertyMapProps> = ({ 
  onPropertySelect, 
  selectedProperty,
  className = "w-full h-[500px]" 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const markersBySlug = useRef<Record<string, mapboxgl.Marker>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const { language } = useLanguage();
  const [slotRetry, setSlotRetry] = useState(0);
  const [dbCoordinates, setDbCoordinates] = useState<Record<string, [number, number]>>({});

  // Fetch DB coordinates for all properties
  useEffect(() => {
    const fetchDbCoords = async () => {
      try {
        const { data } = await supabase
          .from('properties')
          .select('slug, latitude, longitude')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null);
        if (data) {
          const coords: Record<string, [number, number]> = {};
          data.forEach((p: any) => {
            if (p.slug && Number.isFinite(p.latitude) && Number.isFinite(p.longitude)) {
              coords[p.slug] = [p.longitude, p.latitude];
            }
          });
          setDbCoordinates(coords);
        }
      } catch (err) {
        console.error('Failed to fetch DB coordinates:', err);
      }
    };
    fetchDbCoords();
  }, []);

  // Get Mapbox token: prefer env var, fallback to edge function
  useEffect(() => {
    // Check WebGL support first (singleton, no context leak)
    if (!isWebGLSupported()) {
      setError(language === 'ro' 
        ? 'Browserul nu suportă WebGL pentru afișarea hărții' 
        : 'Browser does not support WebGL for map display');
      setIsLoading(false);
      return;
    }

    // Try client-side environment variable first
    const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (envToken) {
      setMapboxToken(envToken);
      setIsLoading(false);
      return;
    }

    // Fallback: fetch token from edge function
    const fetchTokenFromBackend = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-mapbox-token');
        if (fnError) throw fnError;
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setError(language === 'ro' ? 'Token Mapbox nu a fost configurat' : 'Mapbox token not configured');
        }
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        setError(language === 'ro' ? 'Eroare la încărcarea hărții' : 'Failed to load map');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenFromBackend();
  }, [language]);

  // Initialize map when token is available
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let ro: ResizeObserver | null = null;

    mapboxgl.accessToken = mapboxToken;

    // Guard: only allow limited active Mapbox instances globally
    // Retry with delay to handle tab-switch race condition
    if (!acquireMapSlot()) {
      if (slotRetry < 3) {
        const retryTimer = setTimeout(() => setSlotRetry(prev => prev + 1), 400);
        return () => clearTimeout(retryTimer);
      }
      setError(language === 'ro' ? 'O singură hartă poate fi activă' : 'Only one map can be active');
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [21.2270, 45.7540],
        zoom: 12,
        pitch: 0,
        failIfMajorPerformanceCaveat: false,
      });

      // Handle WebGL context loss and restoration
      const canvas = map.current.getCanvas();
      let contextLostTimeout: ReturnType<typeof setTimeout> | null = null;
      const handleContextLost = (e: Event) => {
        e.preventDefault();
        console.warn('[PropertyMap] WebGL context lost – will attempt recovery');
        // Don't show error immediately, wait for potential auto-restore
        contextLostTimeout = setTimeout(() => {
          setError(language === 'ro' ? 'Context grafic pierdut – reîncărcați pagina' : 'Graphics context lost – please reload');
        }, 3000);
      };
      const handleContextRestored = () => {
        console.log('[PropertyMap] WebGL context restored');
        if (contextLostTimeout) {
          clearTimeout(contextLostTimeout);
          contextLostTimeout = null;
        }
        setError(null);
        try { map.current?.triggerRepaint(); } catch (_) {}
      };
      if (canvas) {
        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);
      }

      // Force resize after load with defensive checks
      map.current.on('load', () => {
        try { map.current?.getCanvas() && map.current.resize(); } catch (_) {}
        setTimeout(() => { try { map.current?.getCanvas() && map.current.resize(); } catch (_) {} }, 300);
        setTimeout(() => { try { map.current?.getCanvas() && map.current.resize(); } catch (_) {} }, 1000);
      });

      // Use ResizeObserver with debounce to handle container size changes
      const container = mapContainer.current;
      if (typeof ResizeObserver !== 'undefined' && container) {
        ro = new ResizeObserver(() => {
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            try {
              if (map.current && map.current.getCanvas() && map.current.getCanvasContainer()) {
                map.current.resize();
              }
            } catch (_) { /* canvas not ready */ }
          }, 250);
        });
        ro.observe(container);
      }

      // Handle map errors (including WebGL failures)
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        if (e.error?.message?.includes('WebGL')) {
          setError(language === 'ro' 
            ? 'Eroare WebGL - harta nu poate fi afișată' 
            : 'WebGL error - map cannot be displayed');
        }
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );
    } catch (err: any) {
      console.error('Failed to initialize map:', err);
      setError(language === 'ro' 
        ? 'Nu s-a putut inițializa harta' 
        : 'Could not initialize map');
      return;
    }

    // Add markers — DB coordinates take priority over hardcoded
    properties.forEach((property) => {
      const dbCoords = dbCoordinates[property.slug];
      const coords = dbCoords || resolvePropertyCoordinates({ slug: property.slug, name: property.name, location: property.location });
      if (!coords) return;

      const markerEl = document.createElement('div');
      markerEl.className = 'property-marker cursor-pointer';
      markerEl.setAttribute('aria-label', property.name);
      markerEl.style.cssText = `
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 3px solid white;
        transition: transform 0.2s ease;
      `;
      markerEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      `;

      markerEl.addEventListener('mouseenter', () => {
        markerEl.style.transform = 'scale(1.15)';
      });
      markerEl.addEventListener('mouseleave', () => {
        markerEl.style.transform = 'scale(1)';
      });

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: true,
        maxWidth: '320px',
      });

      const popupContent = `
        <a href="/proprietate/${property.slug}" style="display: block; padding: 0; min-width: 280px; font-family: system-ui, -apple-system, sans-serif; text-decoration: none; color: inherit; cursor: pointer;">
          <img src="${property.images[0]}" alt="${property.name}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px 8px 0 0;" />
          <div style="padding: 12px;">
            <h3 style="font-weight: 600; font-size: 14px; margin: 0 0 4px 0; color: #1a1a1a;">${property.name}</h3>
            <p style="font-size: 12px; color: #666; margin: 0 0 8px 0; display: flex; align-items: center; gap: 4px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
              ${property.location}
            </p>
            <div style="display: flex; align-items: center; gap: 12px; font-size: 12px; color: #666; margin-bottom: 12px;">
              <span style="display: flex; align-items: center; gap: 4px; background: #fef3c7; padding: 2px 8px; border-radius: 12px; color: #92400e; font-weight: 600;">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                ${property.rating}/10
              </span>
              <span>${property.reviews} ${language === 'ro' ? 'recenzii' : 'reviews'}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #888; margin-bottom: 12px;">
              <span>${property.capacity} ${language === 'ro' ? 'oaspeți' : 'guests'}</span>
              <span>•</span>
              <span>${property.bedrooms} ${language === 'ro' ? 'dorm.' : 'bed.'}</span>
              <span>•</span>
              <span>${property.size} m²</span>
            </div>
            <div style="display: block; width: 100%; text-align: center; background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%); color: white; font-size: 12px; font-weight: 500; padding: 10px 16px; border-radius: 6px;">
              ${language === 'ro' ? 'Vezi Detalii' : 'View Details'}
            </div>
          </div>
        </a>
      `;

      popup.setHTML(popupContent);

      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current!);

      markersBySlug.current[property.slug] = marker;

      markerEl.addEventListener('click', () => {
        if (onPropertySelect) {
          onPropertySelect(property.slug);
        }
        // Scroll to property card below the map
        const card = document.getElementById(`property-card-${property.slug}`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          card.classList.add('ring-highlight-property');
          setTimeout(() => card.classList.remove('ring-highlight-property'), 2000);
        }
      });

      markersRef.current.push(marker);
    });

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      ro?.disconnect();
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      markersBySlug.current = {};
      map.current?.remove();
      map.current = null;
      releaseMapSlot();
    };
  }, [mapboxToken, language, onPropertySelect, slotRetry, dbCoordinates]);

  // Fly to selected property and open its popup
  useEffect(() => {
    if (selectedProperty && map.current) {
      const coords = propertyCoordinates[selectedProperty];
      if (coords) {
        map.current.flyTo({
          center: coords,
          zoom: 15,
          duration: 1500,
        });
        // Open popup after fly animation
        setTimeout(() => {
          const marker = markersBySlug.current[selectedProperty];
          if (marker && map.current) {
            marker.getPopup()?.addTo(map.current);
          }
        }, 800);
      }
    }
  }, [selectedProperty]);

  // Trigger resize when map scrolls into view
  useEffect(() => {
    if (!mapContainer.current || !map.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          try { map.current?.getCanvas() && map.current.resize(); } catch (_) {}
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(mapContainer.current);
    return () => observer.disconnect();
  }, [mapboxToken]);

  if (isLoading) {
    return (
      <div className={`relative ${className} bg-muted rounded-xl flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            {language === 'ro' ? 'Se încarcă harta...' : 'Loading map...'}
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative ${className} bg-muted rounded-xl flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-3 text-center px-4">
          <MapPin className="w-8 h-8 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{error}</span>
          <button
            onClick={() => { setError(null); setSlotRetry(prev => prev + 1); }}
            className="mt-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {language === 'ro' ? 'Reîncearcă' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <Home className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="text-foreground font-medium">
            {properties.length} {language === 'ro' ? 'proprietăți' : 'properties'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default memo(PropertyMap);
