import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { properties } from '@/data/properties';
import { useLanguage } from '@/i18n/LanguageContext';
import { Home, Loader2, MapPin } from 'lucide-react';

// Property coordinates in Timișoara - matched to actual locations
const propertyCoordinates: Record<string, [number, number]> = {
  // Strada Loichița Vasile - zona Circumvalațiunii/City of Mara
  'ring-apart-hotel-spacious-deluxe': [21.2175, 45.7510],
  // Denya Forest - Strada Constructorilor 52, lângă Amazonia (nord-vest)
  'green-forest-apart-hotel': [21.1950, 45.7750],
  // Fructus Plaza - ultracentral Timișoara
  'fructus-plaza-ultracentral-apart-hotel': [21.2260, 45.7565],
  // City of Mara M9 - zona Circumvalațiunii
  'fullview-studio-deluxe': [21.2170, 45.7505],
  // City of Mara M8 - Calea Circumvalațiunii nr.1
  'avenue-of-mara-apart-hotel': [21.2165, 45.7500],
  // Strada Argeș 4 - aproape de centru
  'helios-apart-hotel': [21.2280, 45.7490],
  // Calea Torontalului 104K - nord Timișoara
  'ateneo-trevi-2-apart-hotel': [21.2050, 45.7780],
  // Circumvalațiunii M11 - zona City of Mara
  'sunset-da-ra-studio-deluxe': [21.2180, 45.7495],
  // Strada Sinaia nr.2B - ultracentral
  'mara-luxury-golden-apart-hotel': [21.2240, 45.7555],
  // Calea Torontalului 104K, Trevi 2 - nord Timișoara
  'ateneo-apart-hotel-studio-deluxe': [21.2055, 45.7785],
  // Complex Maurer Residence - sud-vest
  'modern-studio-apart-hotel': [21.2100, 45.7350],
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const { language } = useLanguage();

  // Check WebGL support
  const isWebGLSupported = () => {
    try {
      const canvas = document.createElement('canvas');
      return !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (e) {
      return false;
    }
  };

  // Get Mapbox token: prefer env var, fallback to edge function
  useEffect(() => {
    // Check WebGL support first
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
        const response = await fetch(
          'https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/get-mapbox-token',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8',
            },
          }
        );
        const data = await response.json();
        if (data.token) {
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

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [21.2270, 45.7540],
        zoom: 12,
        pitch: 0,
      });

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

    // Add markers
    properties.forEach((property) => {
      const coords = propertyCoordinates[property.slug];
      if (!coords) return;

      const markerEl = document.createElement('div');
      markerEl.className = 'property-marker cursor-pointer';
      markerEl.style.cssText = `
        width: 40px;
        height: 40px;
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
        <div style="padding: 0; min-width: 280px; font-family: system-ui, -apple-system, sans-serif;">
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
            <a href="/proprietate/${property.slug}" style="display: block; width: 100%; text-align: center; background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%); color: white; font-size: 12px; font-weight: 500; padding: 10px 16px; border-radius: 6px; text-decoration: none; transition: opacity 0.2s;">
              ${language === 'ro' ? 'Vezi Detalii' : 'View Details'}
            </a>
          </div>
        </div>
      `;

      popup.setHTML(popupContent);

      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current!);

      markerEl.addEventListener('click', () => {
        if (onPropertySelect) {
          onPropertySelect(property.slug);
        }
      });

      markersRef.current.push(marker);
    });

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      ro?.disconnect();
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
    };
  }, [mapboxToken, language, onPropertySelect]);

  // Fly to selected property
  useEffect(() => {
    if (selectedProperty && map.current) {
      const coords = propertyCoordinates[selectedProperty];
      if (coords) {
        map.current.flyTo({
          center: coords,
          zoom: 15,
          duration: 1500,
        });
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
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainer} className="absolute inset-0 rounded-xl shadow-lg overflow-hidden" />
      
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

export default PropertyMap;
