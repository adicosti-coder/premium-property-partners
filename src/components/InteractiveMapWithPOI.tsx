import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { 
  Loader2, 
  MapPin, 
  Home, 
  UtensilsCrossed, 
  Coffee, 
  ShoppingBag, 
  Landmark,
  MapIcon
} from 'lucide-react';

// Main apartment location in Timișoara (City of Mara / Circumvalațiunii area)
const APARTMENT_LOCATION: [number, number] = [21.2175, 45.7510];

// Points of Interest near the apartments
const pointsOfInterest = [
  {
    id: 'restaurant-1',
    type: 'restaurant',
    nameRo: 'Restaurant Crinul Alb',
    nameEn: 'Crinul Alb Restaurant',
    descriptionRo: 'Bucătărie tradițională românească',
    descriptionEn: 'Traditional Romanian cuisine',
    coordinates: [21.2230, 45.7545] as [number, number],
    rating: 4.6,
  },
  {
    id: 'restaurant-2',
    type: 'restaurant',
    nameRo: 'Pizzeria Il Calcio',
    nameEn: 'Il Calcio Pizzeria',
    descriptionRo: 'Pizza autentică italiană',
    descriptionEn: 'Authentic Italian pizza',
    coordinates: [21.2195, 45.7530] as [number, number],
    rating: 4.4,
  },
  {
    id: 'restaurant-3',
    type: 'restaurant',
    nameRo: 'La Mama',
    nameEn: 'La Mama',
    descriptionRo: 'Mâncare tradițională și confortabilă',
    descriptionEn: 'Traditional comfort food',
    coordinates: [21.2260, 45.7565] as [number, number],
    rating: 4.5,
  },
  {
    id: 'cafe-1',
    type: 'cafe',
    nameRo: 'Cafenea Scârț',
    nameEn: 'Scârț Café',
    descriptionRo: 'Cafea de specialitate',
    descriptionEn: 'Specialty coffee',
    coordinates: [21.2285, 45.7555] as [number, number],
    rating: 4.7,
  },
  {
    id: 'shopping-1',
    type: 'shopping',
    nameRo: 'Iulius Town',
    nameEn: 'Iulius Town Mall',
    descriptionRo: 'Centru comercial modern',
    descriptionEn: 'Modern shopping center',
    coordinates: [21.2100, 45.7490] as [number, number],
    rating: 4.5,
  },
  {
    id: 'landmark-1',
    type: 'landmark',
    nameRo: 'Piața Unirii',
    nameEn: 'Union Square',
    descriptionRo: 'Centrul istoric al Timișoarei',
    descriptionEn: 'Historic center of Timișoara',
    coordinates: [21.2268, 45.7575] as [number, number],
    rating: 4.8,
  },
];

const poiTypeConfig = {
  restaurant: {
    icon: UtensilsCrossed,
    color: '#ef4444',
    labelRo: 'Restaurante',
    labelEn: 'Restaurants',
  },
  cafe: {
    icon: Coffee,
    color: '#8b5cf6',
    labelRo: 'Cafenele',
    labelEn: 'Cafés',
  },
  shopping: {
    icon: ShoppingBag,
    color: '#3b82f6',
    labelRo: 'Cumpărături',
    labelEn: 'Shopping',
  },
  landmark: {
    icon: Landmark,
    color: '#10b981',
    labelRo: 'Atracții',
    labelEn: 'Attractions',
  },
};

const InteractiveMapWithPOI = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const { language } = useLanguage();
  const animation = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Explorează Zona",
      title: "Descoperă",
      titleHighlight: "vecinătatea",
      subtitle: "Locații recomandate în apropiere de apartamentele noastre",
      apartment: "Apartamentul tău",
      filterAll: "Toate",
      loading: "Se încarcă harta...",
      error: "Nu s-a putut încărca harta",
    },
    en: {
      badge: "Explore the Area",
      title: "Discover the",
      titleHighlight: "neighborhood",
      subtitle: "Recommended locations near our apartments",
      apartment: "Your apartment",
      filterAll: "All",
      loading: "Loading map...",
      error: "Could not load map",
    }
  };

  const t = content[language];

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setError(t.error);
        }
      } catch (err) {
        console.error('Error fetching Mapbox token:', err);
        setError(t.error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchToken();
  }, [t.error]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: APARTMENT_LOCATION,
      zoom: 14,
      pitch: 0,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    // Add main apartment marker
    const apartmentEl = document.createElement('div');
    apartmentEl.className = 'apartment-marker';
    apartmentEl.style.cssText = `
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(201, 169, 98, 0.5);
      border: 4px solid white;
      animation: pulse 2s infinite;
    `;
    apartmentEl.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    `;

    const apartmentPopup = new mapboxgl.Popup({
      offset: 30,
      closeButton: false,
    }).setHTML(`
      <div style="padding: 8px; text-align: center;">
        <strong style="color: #c9a962;">${t.apartment}</strong>
        <br/>
        <small style="color: #666;">ApArt Hotel Timișoara</small>
      </div>
    `);

    new mapboxgl.Marker(apartmentEl)
      .setLngLat(APARTMENT_LOCATION)
      .setPopup(apartmentPopup)
      .addTo(map.current);

    // Add POI markers
    pointsOfInterest.forEach((poi) => {
      const config = poiTypeConfig[poi.type as keyof typeof poiTypeConfig];
      
      const poiEl = document.createElement('div');
      poiEl.className = `poi-marker poi-${poi.type}`;
      poiEl.dataset.type = poi.type;
      poiEl.style.cssText = `
        width: 36px;
        height: 36px;
        background: ${config.color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        border: 3px solid white;
        cursor: pointer;
        transition: transform 0.2s ease;
      `;
      
      // Create SVG for icon based on type
      const iconSvg = getIconSvg(poi.type);
      poiEl.innerHTML = iconSvg;

      poiEl.addEventListener('mouseenter', () => {
        poiEl.style.transform = 'scale(1.2)';
      });
      poiEl.addEventListener('mouseleave', () => {
        poiEl.style.transform = 'scale(1)';
      });

      const poiPopup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        maxWidth: '250px',
      }).setHTML(`
        <div style="padding: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <div style="width: 28px; height: 28px; background: ${config.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
              ${iconSvg}
            </div>
            <div>
              <strong style="font-size: 14px; color: #1a1a1a;">${language === 'ro' ? poi.nameRo : poi.nameEn}</strong>
              <div style="display: flex; align-items: center; gap: 4px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                <span style="font-size: 12px; color: #666;">${poi.rating}</span>
              </div>
            </div>
          </div>
          <p style="font-size: 12px; color: #666; margin: 0;">
            ${language === 'ro' ? poi.descriptionRo : poi.descriptionEn}
          </p>
        </div>
      `);

      new mapboxgl.Marker(poiEl)
        .setLngLat(poi.coordinates)
        .setPopup(poiPopup)
        .addTo(map.current!);
    });

    // Add CSS for pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(201, 169, 98, 0.7); }
        70% { box-shadow: 0 0 0 15px rgba(201, 169, 98, 0); }
        100% { box-shadow: 0 0 0 0 rgba(201, 169, 98, 0); }
      }
    `;
    document.head.appendChild(style);

    return () => {
      map.current?.remove();
      style.remove();
    };
  }, [mapboxToken, language, t.apartment]);

  // Filter POI markers
  useEffect(() => {
    if (!map.current) return;
    
    const markers = document.querySelectorAll('.poi-marker');
    markers.forEach((marker) => {
      const el = marker as HTMLElement;
      const type = el.dataset.type;
      if (activeFilter === null || type === activeFilter) {
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
      }
    });
  }, [activeFilter]);

  const filterOptions = [
    { type: null, labelRo: 'Toate', labelEn: 'All' },
    ...Object.entries(poiTypeConfig).map(([type, config]) => ({
      type,
      labelRo: config.labelRo,
      labelEn: config.labelEn,
      icon: config.icon,
      color: config.color,
    })),
  ];

  if (isLoading) {
    return (
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="h-[500px] bg-muted rounded-xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">{t.loading}</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="h-[500px] bg-muted rounded-xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <MapPin className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{error}</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-background relative overflow-hidden">
      <div
        ref={animation.ref}
        className={`container mx-auto px-4 relative z-10 transition-all duration-700 ${
          animation.isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
            <MapIcon className="w-4 h-4 mr-2 text-primary" />
            {t.badge}
          </Badge>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif font-bold mb-4">
            {t.title}{" "}
            <span className="text-primary">{t.titleHighlight}</span>
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8">
            {t.subtitle}
          </p>

          {/* Filter buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setActiveFilter(null)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeFilter === null
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-card border border-border hover:bg-muted'
              }`}
            >
              {language === 'ro' ? 'Toate' : 'All'}
            </button>
            {Object.entries(poiTypeConfig).map(([type, config]) => {
              const Icon = config.icon;
              const isActive = activeFilter === type;
              return (
                <button
                  key={type}
                  onClick={() => setActiveFilter(type)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-card border border-border hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" style={{ color: isActive ? 'inherit' : config.color }} />
                  {language === 'ro' ? config.labelRo : config.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-2xl border border-border">
          <div ref={mapContainer} className="absolute inset-0" />
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                <Home className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">{t.apartment}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(poiTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <div key={type} className="flex items-center gap-1.5">
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: config.color }}
                    >
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-muted-foreground">
                      {language === 'ro' ? config.labelRo : config.labelEn}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Helper function to generate SVG icons
function getIconSvg(type: string): string {
  const icons: Record<string, string> = {
    restaurant: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>`,
    cafe: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/></svg>`,
    shopping: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
    landmark: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
  };
  return icons[type] || '';
}

export default InteractiveMapWithPOI;
