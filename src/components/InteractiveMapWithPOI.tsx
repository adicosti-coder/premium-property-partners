import React, { useEffect, useRef, useState, memo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Link } from 'react-router-dom';
import PremiumBenefitsBadge from './PremiumBenefitsBadge';
import { isWebGLSupported } from '@/utils/webglSupport';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  MapPin, 
  Home, 
  UtensilsCrossed, 
  Coffee, 
  ShoppingBag, 
  Landmark,
  MapIcon,
  Bus,
  Heart,
  Clapperboard,
  Crown,
  Sparkles,
  ChevronRight,
  Wine,
  Dumbbell,
  Wrench,
  Star,
  ExternalLink,
  Navigation,
  X,
} from 'lucide-react';

// Main center point for the map in Timișoara
const MAP_CENTER: [number, number] = [21.2270, 45.7540];

// All apartment coordinates – same as PropertyMap
const apartmentCoordinates: { name: string; slug: string; coords: [number, number] }[] = [
  { name: 'Ring ApArt Hotel – Spacious Deluxe', slug: 'ring-apart-hotel-spacious-deluxe', coords: [21.2175, 45.7510] },
  { name: 'Green Forest ApArt Hotel', slug: 'green-forest-apart-hotel', coords: [21.1950, 45.7750] },
  { name: 'Fructus Plaza Ultracentral', slug: 'fructus-plaza-ultracentral-apart-hotel', coords: [21.2260, 45.7565] },
  { name: 'Fullview Studio Deluxe', slug: 'fullview-studio-deluxe', coords: [21.2170, 45.7505] },
  { name: 'Avenue of Mara ApArt Hotel', slug: 'avenue-of-mara-apart-hotel', coords: [21.2165, 45.7500] },
  { name: 'Helios ApArt Hotel', slug: 'helios-apart-hotel', coords: [21.2280, 45.7490] },
  { name: 'Ateneo Trevi 2 ApArt Hotel', slug: 'ateneo-trevi-2-apart-hotel', coords: [21.2050, 45.7780] },
  { name: 'Sunset Da Ra Studio Deluxe', slug: 'sunset-da-ra-studio-deluxe', coords: [21.2180, 45.7495] },
  { name: 'Mara Luxury Golden ApArt Hotel', slug: 'mara-luxury-golden-apart-hotel', coords: [21.2240, 45.7555] },
  { name: 'Ateneo ApArt Hotel Studio Deluxe', slug: 'ateneo-apart-hotel-studio-deluxe', coords: [21.2055, 45.7785] },
  { name: 'Modern Studio ApArt Hotel', slug: 'modern-studio-apart-hotel', coords: [21.2100, 45.7350] },
];

interface POI {
  id: string;
  name: string;
  name_en: string;
  category: string;
  description: string | null;
  description_en: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  is_active: boolean;
  is_premium: boolean;
  image_url: string | null;
}

const poiTypeConfig: Record<string, { icon: React.ElementType; color: string; labelRo: string; labelEn: string }> = {
  restaurant: {
    icon: UtensilsCrossed,
    color: '#ef4444',
    labelRo: 'Restaurante',
    labelEn: 'Restaurants',
  },
  cafe: {
    icon: Coffee,
    color: '#d97706',
    labelRo: 'Cafenele',
    labelEn: 'Cafés',
  },
  shopping: {
    icon: ShoppingBag,
    color: '#ec4899',
    labelRo: 'Cumpărături',
    labelEn: 'Shopping',
  },
  attraction: {
    icon: Landmark,
    color: '#8b5cf6',
    labelRo: 'Atracții',
    labelEn: 'Attractions',
  },
  transport: {
    icon: Bus,
    color: '#3b82f6',
    labelRo: 'Transport',
    labelEn: 'Transport',
  },
  health: {
    icon: Heart,
    color: '#dc2626',
    labelRo: 'Sănătate',
    labelEn: 'Health',
  },
  entertainment: {
    icon: Clapperboard,
    color: '#10b981',
    labelRo: 'Divertisment',
    labelEn: 'Entertainment',
  },
  bar: {
    icon: Wine,
    color: '#f59e0b',
    labelRo: 'Baruri & Terase',
    labelEn: 'Bars & Terraces',
  },
  sports: {
    icon: Dumbbell,
    color: '#06b6d4',
    labelRo: 'Sport',
    labelEn: 'Sports',
  },
  services: {
    icon: Wrench,
    color: '#64748b',
    labelRo: 'Servicii',
    labelEn: 'Services',
  },
};

const InteractiveMapWithPOI = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Record<string, mapboxgl.Marker>>({});
  const popupsRef = useRef<Record<string, mapboxgl.Popup>>({});
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const { language } = useLanguage();
  const animation = useScrollAnimation({ threshold: 0.1 });

  // Fetch POIs from Supabase
  const { data: pois = [], isLoading: poisLoading } = useQuery({
    queryKey: ['pois'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_of_interest')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as POI[];
    },
  });

  // Check if user is authenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [premiumCount, setPremiumCount] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setPremiumCount(5);
    }
  }, [isAuthenticated]);

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
      premiumBanner: "locații exclusive",
      premiumCta: "Autentifică-te pentru acces complet",
      premiumLabel: "Premium",
      seeOnMap: "Vezi pe hartă",
      reviews: "recenzii",
      website: "Website",
      noImage: "Fără imagine",
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
      premiumBanner: "exclusive locations",
      premiumCta: "Sign in for full access",
      premiumLabel: "Premium",
      seeOnMap: "See on map",
      reviews: "reviews",
      website: "Website",
      noImage: "No image",
    }
  };

  const t = content[language];

  // Fly to a POI on the map and highlight its marker
  const flyToPoi = useCallback((poi: POI) => {
    if (!map.current) return;
    setSelectedPoiId(poi.id);
    map.current.flyTo({
      center: [poi.longitude, poi.latitude],
      zoom: 16,
      duration: 1000,
    });
    // Open popup for the marker
    const marker = markersRef.current[poi.id];
    const popup = popupsRef.current[poi.id];
    if (marker && popup) {
      popup.addTo(map.current);
    }
    // Scroll to map
    wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // When a marker is clicked, scroll to its card
  const scrollToCard = useCallback((poiId: string) => {
    setSelectedPoiId(poiId);
    const card = cardRefs.current[poiId];
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      // Highlight flash
      card.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
      setTimeout(() => {
        card.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
      }, 2000);
    }
  }, []);

  // Get Mapbox token from environment or edge function
  useEffect(() => {
    if (!isWebGLSupported()) {
      setWebglSupported(false);
      setTokenError(language === 'ro' 
        ? 'Browserul nu suportă WebGL pentru afișarea hărții' 
        : 'Browser does not support WebGL for map display');
      setTokenLoading(false);
      return;
    }

    const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (token) {
      setMapboxToken(token);
      setTokenLoading(false);
      return;
    }

    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setTokenError(t.error);
        }
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        setTokenError(t.error);
      } finally {
        setTokenLoading(false);
      }
    };

    fetchToken();
  }, [t.error, language]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken || !webglSupported) return;

    mapboxgl.accessToken = mapboxToken;

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let ro: ResizeObserver | null = null;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: MAP_CENTER,
        zoom: 13,
        pitch: 0,
        failIfMajorPerformanceCaveat: false,
      });

      const canvas = map.current.getCanvas();
      const handleContextLost = (e: Event) => {
        e.preventDefault();
        setTokenError(language === 'ro' ? 'Context grafic pierdut – reîncărcați pagina' : 'Graphics context lost – please reload');
      };
      const handleContextRestored = () => {
        setTokenError(null);
        try { map.current?.triggerRepaint(); } catch (_) {}
      };
      if (canvas) {
        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);
      }

      map.current.on('load', () => {
        try { map.current?.getCanvas() && map.current.resize(); } catch (_) {}
        setTimeout(() => { try { map.current?.getCanvas() && map.current.resize(); } catch (_) {} }, 300);
        setTimeout(() => { try { map.current?.getCanvas() && map.current.resize(); } catch (_) {} }, 1000);
        setMapReady(true);
      });

      const container = mapContainer.current;
      if (typeof ResizeObserver !== 'undefined' && container) {
        ro = new ResizeObserver(() => {
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            try {
              if (map.current && map.current.getCanvas() && map.current.getCanvasContainer()) {
                map.current.resize();
              }
            } catch (_) {}
          }, 250);
        });
        ro.observe(container);
      }

      map.current.on('error', (e) => {
        if (e.error?.message?.includes('WebGL')) {
          setTokenError(language === 'ro' 
            ? 'Eroare WebGL - harta nu poate fi afișată' 
            : 'WebGL error - map cannot be displayed');
        }
      });
    } catch (err: any) {
      console.error('Failed to initialize map:', err);
      setTokenError(language === 'ro' 
        ? 'Nu s-a putut inițializa harta' 
        : 'Could not initialize map');
      return;
    }

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    // Add apartment markers
    apartmentCoordinates.forEach((apt) => {
      const apartmentEl = document.createElement('div');
      apartmentEl.className = 'apartment-marker';
      apartmentEl.style.cssText = `
        width: 40px; height: 40px;
        background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(201, 169, 98, 0.4);
        border: 3px solid white;
        cursor: pointer;
        transition: transform 0.2s ease;
      `;
      apartmentEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      `;
      apartmentEl.addEventListener('mouseenter', () => { apartmentEl.style.transform = 'scale(1.15)'; });
      apartmentEl.addEventListener('mouseleave', () => { apartmentEl.style.transform = 'scale(1)'; });

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: true }).setHTML(`
        <div style="padding: 8px; text-align: center; min-width: 160px;">
          <strong style="color: #c9a962; font-size: 13px;">${apt.name}</strong>
          <br/>
          <a href="/proprietate/${apt.slug}" style="color: #b8963e; font-size: 11px; text-decoration: underline; margin-top: 4px; display: inline-block;">
            ${language === 'ro' ? 'Vezi detalii →' : 'View details →'}
          </a>
        </div>
      `);

      new mapboxgl.Marker(apartmentEl)
        .setLngLat(apt.coords)
        .setPopup(popup)
        .addTo(map.current!);
    });

    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(201, 169, 98, 0.7); } 70% { box-shadow: 0 0 0 15px rgba(201, 169, 98, 0); } 100% { box-shadow: 0 0 0 0 rgba(201, 169, 98, 0); } }
      .poi-marker-selected { transform: scale(1.3) !important; box-shadow: 0 0 0 4px rgba(201, 169, 98, 0.5) !important; }
    `;
    document.head.appendChild(style);

    return () => {
      if (resizeTimer) clearTimeout(resizeTimer);
      ro?.disconnect();
      map.current?.remove();
      map.current = null;
      markersRef.current = {};
      popupsRef.current = {};
      setMapReady(false);
      style.remove();
    };
  }, [mapboxToken, language]);

  // Trigger resize when map becomes visible
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

  // Add POI markers when data changes
  useEffect(() => {
    if (!map.current || !mapReady || !pois.length) return;

    // Clear existing POI markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};
    popupsRef.current = {};

    pois.forEach((poi) => {
      const config = poiTypeConfig[poi.category] || poiTypeConfig.attraction;
      
      const poiEl = document.createElement('div');
      poiEl.className = `poi-marker poi-${poi.category}`;
      poiEl.dataset.type = poi.category;
      poiEl.dataset.poiId = poi.id;
      poiEl.style.cssText = `
        width: 36px; height: 36px;
        background: ${config.color};
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        border: 3px solid ${poi.is_premium ? '#c9a962' : 'white'};
        cursor: pointer;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        position: relative;
      `;
      
      const iconSvg = getIconSvg(poi.category);
      poiEl.innerHTML = iconSvg;

      if (poi.is_premium) {
        const premiumBadge = document.createElement('div');
        premiumBadge.style.cssText = `
          position: absolute; top: -6px; right: -6px;
          width: 16px; height: 16px;
          background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        premiumBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/></svg>`;
        poiEl.appendChild(premiumBadge);
      }

      poiEl.addEventListener('mouseenter', () => { poiEl.style.transform = 'scale(1.2)'; });
      poiEl.addEventListener('mouseleave', () => { 
        if (selectedPoiId !== poi.id) poiEl.style.transform = 'scale(1)'; 
      });

      // Click on marker → scroll to card below
      poiEl.addEventListener('click', () => {
        scrollToCard(poi.id);
      });

      const name = language === 'ro' ? poi.name : poi.name_en;
      const description = language === 'ro' ? poi.description : poi.description_en;
      const premiumLabel = 'Premium';

      const poiPopup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        maxWidth: '300px',
      }).setHTML(`
        <div style="padding: 0; overflow: hidden; border-radius: 8px;">
          ${poi.image_url ? `
            <div style="position: relative; width: 100%; height: 120px; overflow: hidden; background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);">
              <img 
                src="${poi.image_url}" 
                alt="${name}"
                loading="lazy"
                decoding="async"
                style="width: 100%; height: 100%; object-fit: cover; transition: opacity 0.3s ease;"
                onload="this.style.opacity='1'"
                onerror="this.parentElement.style.display='none'"
              />
              ${poi.is_premium ? `<div style="position: absolute; top: 8px; left: 8px; display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%); color: white; font-size: 10px; font-weight: 600; border-radius: 12px;">${premiumLabel}</div>` : ''}
              ${poi.rating ? `<div style="position: absolute; top: 8px; right: 8px; display: flex; align-items: center; gap: 3px; padding: 4px 8px; background: rgba(255,255,255,0.95); border-radius: 12px;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg><span style="font-size: 11px; font-weight: 600; color: #1a1a1a;">${poi.rating}</span></div>` : ''}
            </div>
          ` : ''}
          <div style="padding: 12px;">
            <strong style="font-size: 14px; color: #1a1a1a;">${name}</strong>
            ${description ? `<p style="font-size: 12px; color: #666; margin: 6px 0 8px 0; line-height: 1.4;">${description}</p>` : ''}
            ${poi.address ? `<p style="font-size: 11px; color: #888; margin: 0 0 6px 0;">📍 ${poi.address}</p>` : ''}
            <button 
              onclick="document.getElementById('poi-card-${poi.id}')?.scrollIntoView({behavior:'smooth',block:'nearest'}); document.getElementById('poi-card-${poi.id}')?.classList.add('ring-highlight');"
              style="font-size: 11px; color: white; background: #8b5cf6; border: none; cursor: pointer; padding: 6px 12px; border-radius: 6px; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px;"
            >
              ↓ ${language === 'ro' ? 'Vezi cardul' : 'See card'}
            </button>
          </div>
        </div>
      `);

      // When popup opens → scroll to card
      poiPopup.on('open', () => {
        scrollToCard(poi.id);
      });

      const marker = new mapboxgl.Marker(poiEl)
        .setLngLat([poi.longitude, poi.latitude])
        .setPopup(poiPopup)
        .addTo(map.current!);

      markersRef.current[poi.id] = marker;
      popupsRef.current[poi.id] = poiPopup;
    });
  }, [pois, language, mapReady, scrollToCard]);

  // Update marker visual when selectedPoiId changes
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const el = marker.getElement();
      if (id === selectedPoiId) {
        el.style.transform = 'scale(1.3)';
        el.style.zIndex = '10';
        el.style.boxShadow = '0 0 0 4px rgba(139, 92, 246, 0.4)';
      } else {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1';
        el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      }
    });
  }, [selectedPoiId]);

  // Filter POI markers
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const el = marker.getElement();
      const type = el.dataset.type;
      el.style.display = (activeFilter === null || type === activeFilter) ? 'flex' : 'none';
    });
  }, [activeFilter]);

  const availableCategories = [...new Set(pois.map(p => p.category))];
  const filteredPois = activeFilter ? pois.filter(p => p.category === activeFilter) : pois;
  const isLoading = tokenLoading || poisLoading;

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

  if (tokenError) {
    return (
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="h-[500px] bg-muted rounded-xl flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center px-4">
              <MapPin className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{tokenError}</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-muted/30 to-background relative">
      <style>{`
        .ring-highlight {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
          animation: highlight-fade 2s ease forwards;
        }
        @keyframes highlight-fade {
          0% { outline-color: hsl(var(--primary)); }
          100% { outline-color: transparent; }
        }
      `}</style>
      <div className="container mx-auto px-4 relative z-10">
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
          
          <p className="text-lg text-muted-foreground mb-6">
            {t.subtitle}
          </p>

          {/* Premium Banner */}
          <AnimatePresence>
            {!isAuthenticated && premiumCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="mb-8"
              >
                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-gold/15 via-gold/5 to-gold/10 border border-gold/30 shadow-lg shadow-gold/5 overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer-sweep_3s_infinite] bg-gradient-to-r from-transparent via-gold/10 to-transparent skew-x-12 pointer-events-none" />
                  <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="w-12 h-12 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0"
                      >
                        <Crown className="w-6 h-6 text-gold" />
                      </motion.div>
                      <div className="text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-semibold text-foreground">
                            +{premiumCount} {t.premiumBanner}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-gold/20 text-gold rounded-full uppercase tracking-wide">
                            {t.premiumLabel}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ro' 
                            ? 'Restaurante, cafenele și locuri ascunse doar pentru membrii noștri' 
                            : 'Restaurants, cafés and hidden gems only for our members'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <PremiumBenefitsBadge variant="compact" className="hidden sm:flex" />
                      <Link to="/auth?mode=signup">
                        <Button size="default" className="gap-2 bg-gold hover:bg-gold/90 text-gold-foreground font-semibold shadow-md shadow-gold/20 hover:shadow-lg hover:shadow-gold/30 transition-all hover:scale-105">
                          <Sparkles className="w-4 h-4" />
                          {language === 'ro' ? 'Deblochează Gratuit' : 'Unlock Free'}
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
              {language === 'ro' ? 'Toate' : 'All'} ({pois.length})
            </button>
            {availableCategories.map((category) => {
              const config = poiTypeConfig[category];
              if (!config) return null;
              const Icon = config.icon;
              const isActive = activeFilter === category;
              const count = pois.filter(p => p.category === category).length;
              return (
                <button
                  key={category}
                  onClick={() => setActiveFilter(category)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-card border border-border hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" style={{ color: isActive ? 'inherit' : config.color }} />
                  {language === 'ro' ? config.labelRo : config.labelEn} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div ref={wrapperRef} className="relative h-[500px] rounded-2xl shadow-2xl border border-border mb-10">
          <div ref={mapContainer} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 'inherit' }} />
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-background/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border max-w-xs">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-primary/80 rounded-full flex items-center justify-center">
                <Home className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-medium text-foreground">{t.apartment}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {availableCategories.map((category) => {
                const config = poiTypeConfig[category];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <div key={category} className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: config.color }}>
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

          {/* Selected POI indicator */}
          <AnimatePresence>
            {selectedPoiId && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 z-10"
              >
                <Navigation className="w-3 h-3" />
                {language === 'ro' ? 'Locație selectată · vezi cardul mai jos' : 'Location selected · see card below'}
                <button onClick={() => setSelectedPoiId(null)} className="ml-1 hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* POI Cards Grid */}
        <div ref={cardsContainerRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPois.map((poi) => {
            const config = poiTypeConfig[poi.category] || poiTypeConfig.attraction;
            const Icon = config.icon;
            const name = language === 'ro' ? poi.name : poi.name_en;
            const description = language === 'ro' ? poi.description : poi.description_en;
            const isSelected = selectedPoiId === poi.id;

            return (
              <motion.div
                key={poi.id}
                id={`poi-card-${poi.id}`}
                ref={(el) => { cardRefs.current[poi.id] = el; }}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`bg-card rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group ${
                  isSelected 
                    ? 'border-primary shadow-md shadow-primary/10 ring-2 ring-primary ring-offset-2' 
                    : 'border-border hover:border-primary/30'
                }`}
                onClick={() => flyToPoi(poi)}
              >
                {/* Image */}
                <div className="relative h-36 overflow-hidden bg-muted">
                  {poi.image_url ? (
                    <img
                      src={poi.image_url}
                      alt={name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => { (e.currentTarget.parentElement as HTMLElement).classList.add('flex', 'items-center', 'justify-center'); e.currentTarget.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: config.color + '20' }}>
                      <Icon className="w-10 h-10 opacity-30" style={{ color: config.color }} />
                    </div>
                  )}
                  
                  {/* Category badge */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-full text-white text-xs font-semibold" style={{ backgroundColor: config.color }}>
                    <Icon className="w-3 h-3" />
                    {language === 'ro' ? config.labelRo : config.labelEn}
                  </div>

                  {/* Premium badge */}
                  {poi.is_premium && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-white text-[10px] font-bold bg-gradient-to-r from-amber-500 to-amber-600 shadow">
                      <Crown className="w-3 h-3" />
                      Premium
                    </div>
                  )}

                  {/* Rating */}
                  {poi.rating && (
                    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-xs">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {poi.rating}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-foreground mb-1 line-clamp-1">{name}</h3>
                  
                  {description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{description}</p>
                  )}
                  
                  {poi.address && (
                    <p className="text-xs text-muted-foreground flex items-start gap-1 mb-2">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{poi.address}</span>
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-2">
                    {/* See on map button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); flyToPoi(poi); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Navigation className="w-3 h-3" />
                      {t.seeOnMap}
                    </button>

                    {/* Website link */}
                    {poi.website && (
                      <a
                        href={poi.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {t.website}
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
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
    attraction: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
    transport: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`,
    health: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    entertainment: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="2" x2="7" y1="7" y2="7"/><line x1="2" x2="7" y1="17" y2="17"/><line x1="17" x2="22" y1="17" y2="17"/><line x1="17" x2="22" y1="7" y2="7"/></svg>`,
    bar: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15V22"/><path d="M17 2H7L2 10h20L17 2Z"/></svg>`,
    sports: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/></svg>`,
    services: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
  };
  return icons[type] || icons.attraction;
}

export default memo(InteractiveMapWithPOI);
