import React, { useEffect, useRef, useState, memo } from 'react';
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
import { isWebGLSupported, acquireMapSlot, releaseMapSlot } from '@/utils/webglSupport';
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
  Lock,
  Sparkles,
  ChevronRight
} from 'lucide-react';

// Main apartment location in Timișoara
const APARTMENT_LOCATION: [number, number] = [21.2270, 45.7540];

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
};

const InteractiveMapWithPOI = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [webglSupported, setWebglSupported] = useState(true);
  const { language } = useLanguage();
  const animation = useScrollAnimation({ threshold: 0.1 });

  // WebGL support is checked via the imported isWebGLSupported from webglSupport.ts
  // (no local re-declaration needed – avoids context leak)

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

  // Fetch premium count for unauthenticated users
  useEffect(() => {
    const fetchPremiumCount = async () => {
      if (!isAuthenticated) {
        // Use a simple count - in real app this would be from a public endpoint
        setPremiumCount(5); // We know we marked 5 as premium
      }
    };
    fetchPremiumCount();
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
    }
  };

  const t = content[language];

  // Get Mapbox token from environment or edge function
  useEffect(() => {
    // Check WebGL support first
    if (!isWebGLSupported()) {
      setWebglSupported(false);
      setTokenError(language === 'ro' 
        ? 'Browserul nu suportă WebGL pentru afișarea hărții' 
        : 'Browser does not support WebGL for map display');
      setTokenLoading(false);
      return;
    }

    // Try client-side environment variable first
    const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
    if (token) {
      setMapboxToken(token);
      setTokenLoading(false);
      return;
    }

    // Fallback: fetch token from edge function
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

    // Guard: only allow limited active Mapbox instances globally
    if (!acquireMapSlot()) {
      console.warn('[InteractiveMap] Map slot unavailable – another map is active');
      return;
    }

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let ro: ResizeObserver | null = null;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: APARTMENT_LOCATION,
        zoom: 13,
        pitch: 0,
        failIfMajorPerformanceCaveat: false,
      });

      // Handle WebGL context loss and restoration
      const canvas = map.current.getCanvas();
      const handleContextLost = (e: Event) => {
        e.preventDefault();
        console.warn('[InteractiveMap] WebGL context lost');
        setTokenError(language === 'ro' ? 'Context grafic pierdut – reîncărcați pagina' : 'Graphics context lost – please reload');
      };
      const handleContextRestored = () => {
        console.log('[InteractiveMap] WebGL context restored');
        setTokenError(null);
        try { map.current?.triggerRepaint(); } catch (_) {}
      };
      if (canvas) {
        canvas.addEventListener('webglcontextlost', handleContextLost);
        canvas.addEventListener('webglcontextrestored', handleContextRestored);
      }

      // Force resize after load (critical when map is in a hidden tab)
      map.current.on('load', () => {
        try { map.current?.getCanvas() && map.current.resize(); } catch (_) {}
        setTimeout(() => { try { map.current?.getCanvas() && map.current.resize(); } catch (_) {} }, 300);
        setTimeout(() => { try { map.current?.getCanvas() && map.current.resize(); } catch (_) {} }, 1000);
      });

      // ResizeObserver with debounce
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

      // Handle map errors (including WebGL failures)
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
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
      if (resizeTimer) clearTimeout(resizeTimer);
      ro?.disconnect();
      map.current?.remove();
      map.current = null;
      releaseMapSlot();
      style.remove();
    };
  }, [mapboxToken, t.apartment]);

  // Trigger resize when map becomes visible (e.g. tab switch)
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
    if (!map.current || !pois.length) return;

    // Clear existing POI markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    pois.forEach((poi) => {
      const config = poiTypeConfig[poi.category] || poiTypeConfig.attraction;
      
      const poiEl = document.createElement('div');
      poiEl.className = `poi-marker poi-${poi.category}`;
      poiEl.dataset.type = poi.category;
      poiEl.style.cssText = `
        width: 36px;
        height: 36px;
        background: ${config.color};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        border: 3px solid ${poi.is_premium ? '#c9a962' : 'white'};
        cursor: pointer;
        transition: transform 0.2s ease;
        position: relative;
      `;
      
      const iconSvg = getIconSvg(poi.category);
      poiEl.innerHTML = iconSvg;

      // Add premium badge
      if (poi.is_premium) {
        const premiumBadge = document.createElement('div');
        premiumBadge.style.cssText = `
          position: absolute;
          top: -6px;
          right: -6px;
          width: 16px;
          height: 16px;
          background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        premiumBadge.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/></svg>`;
        poiEl.appendChild(premiumBadge);
      }

      poiEl.addEventListener('mouseenter', () => {
        poiEl.style.transform = 'scale(1.2)';
      });
      poiEl.addEventListener('mouseleave', () => {
        poiEl.style.transform = 'scale(1)';
      });

      const name = language === 'ro' ? poi.name : poi.name_en;
      const description = language === 'ro' ? poi.description : poi.description_en;
      const premiumLabel = language === 'ro' ? 'Premium' : 'Premium';

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
              ${poi.is_premium ? `
                <div style="position: absolute; top: 8px; left: 8px; display: flex; align-items: center; gap: 4px; padding: 4px 8px; background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%); color: white; font-size: 10px; font-weight: 600; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/></svg>
                  ${premiumLabel}
                </div>
              ` : ''}
              ${poi.rating ? `
                <div style="position: absolute; top: 8px; right: 8px; display: flex; align-items: center; gap: 3px; padding: 4px 8px; background: rgba(255,255,255,0.95); border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span style="font-size: 11px; font-weight: 600; color: #1a1a1a;">${poi.rating}</span>
                </div>
              ` : ''}
            </div>
          ` : ''}
          <div style="padding: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="width: 28px; height: 28px; background: ${config.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${iconSvg}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                  <strong style="font-size: 14px; color: #1a1a1a;">${name}</strong>
                  ${!poi.image_url && poi.is_premium ? `<span style="font-size: 10px; background: linear-gradient(135deg, #c9a962 0%, #b8963e 100%); color: white; padding: 2px 6px; border-radius: 10px; font-weight: 600;">${premiumLabel}</span>` : ''}
                </div>
                ${!poi.image_url && poi.rating ? `
                  <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    <span style="font-size: 12px; color: #666;">${poi.rating}</span>
                  </div>
                ` : ''}
              </div>
            </div>
            ${description ? `<p style="font-size: 12px; color: #666; margin: 0 0 8px 0; line-height: 1.4;">${description}</p>` : ''}
            ${poi.address ? `<p style="font-size: 11px; color: #888; margin: 0 0 6px 0; display: flex; align-items: flex-start; gap: 4px;"><span>📍</span> <span>${poi.address}</span></p>` : ''}
            ${poi.website ? `<a href="${poi.website}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #3b82f6; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">🔗 Website</a>` : ''}
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(poiEl)
        .setLngLat([poi.longitude, poi.latitude])
        .setPopup(poiPopup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [pois, language]);

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

  // Get available categories from POIs
  const availableCategories = [...new Set(pois.map(p => p.category))];

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
          
          <p className="text-lg text-muted-foreground mb-6">
            {t.subtitle}
          </p>

          {/* Enhanced Premium Banner for unauthenticated users */}
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
                  {/* Animated background shimmer */}
                  <div className="absolute inset-0 -translate-x-full animate-[shimmer-sweep_3s_infinite] bg-gradient-to-r from-transparent via-gold/10 to-transparent skew-x-12 pointer-events-none" />
                  
                  <div className="relative flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <motion.div
                        animate={{ 
                          rotate: [0, 10, -10, 0],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          repeatDelay: 3 
                        }}
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
                        <Button 
                          size="default" 
                          className="gap-2 bg-gold hover:bg-gold/90 text-gold-foreground font-semibold shadow-md shadow-gold/20 hover:shadow-lg hover:shadow-gold/30 transition-all hover:scale-105"
                        >
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
              {availableCategories.map((category) => {
                const config = poiTypeConfig[category];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <div key={category} className="flex items-center gap-1.5">
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
    attraction: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" x2="21" y1="22" y2="22"/><line x1="6" x2="6" y1="18" y2="11"/><line x1="10" x2="10" y1="18" y2="11"/><line x1="14" x2="14" y1="18" y2="11"/><line x1="18" x2="18" y1="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>`,
    transport: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/></svg>`,
    health: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`,
    entertainment: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="20" x="2" y="2" rx="2.18" ry="2.18"/><line x1="7" x2="7" y1="2" y2="22"/><line x1="17" x2="17" y1="2" y2="22"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="2" x2="7" y1="7" y2="7"/><line x1="2" x2="7" y1="17" y2="17"/><line x1="17" x2="22" y1="17" y2="17"/><line x1="17" x2="22" y1="7" y2="7"/></svg>`,
  };
  return icons[type] || icons.attraction;
}

export default memo(InteractiveMapWithPOI);
