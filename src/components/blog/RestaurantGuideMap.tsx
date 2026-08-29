import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// Mapbox GL (~800 kB JS + CSS) is loaded on demand — see `useDeferredMapbox` below.
// Type-only import: erased at build time, so it does not pull the runtime bundle.
import type mapboxgl from 'mapbox-gl';

import { supabase } from '@/lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePoiFavorites } from '@/hooks/usePoiFavorites';
import { usePoiReviews } from '@/hooks/usePoiReviews';
import { isWebGLSupported } from '@/utils/webglSupport';
import RestaurantDetailModal, { type RestaurantModalPoi } from './RestaurantDetailModal';
import {
  exportRestaurantGuidePdf,
  buildRestaurantGuideWhatsAppText,
  type RestaurantGuideItem,
} from '@/utils/exportRestaurantGuidePdf';
import { toast } from 'sonner';
import {
  Loader2,
  MapPin,
  Heart,
  Coffee,
  UtensilsCrossed,
  Footprints,
  ExternalLink,
  Navigation,
  Star,
  FileDown,
  Share2,
  Info,
} from 'lucide-react';


/** ApArt Hotel / RealTrust properties used as walking-distance reference points. */
const APART_PROPERTIES: { name: string; coords: [number, number] }[] = [
  { name: 'Ring ApArt Hotel', coords: [21.2175, 45.751] },
  { name: 'Green Forest ApArt Hotel', coords: [21.195, 45.775] },
  { name: 'Fructus Plaza Ultracentral', coords: [21.226, 45.7565] },
  { name: 'Fullview Studio Deluxe', coords: [21.217, 45.7505] },
  { name: 'Avenue of Mara ApArt Hotel', coords: [21.2165, 45.75] },
  { name: 'Helios ApArt Hotel', coords: [21.228, 45.749] },
  { name: 'Ateneo Trevi 2 ApArt Hotel', coords: [21.205, 45.778] },
  { name: 'Mara Luxury Golden ApArt Hotel', coords: [21.224, 45.7555] },
];

const MAP_CENTER: [number, number] = [21.227, 45.754] as [number, number];
const WALKING_SPEED_KMH = 4.8;

interface GuidePoi {
  id: string;
  name: string;
  category: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  website: string | null;
  rating: number | null;
  phone: string | null;
  image_url: string | null;
}


type FilterKey = 'all' | 'breakfast' | 'dinner' | 'centru' | 'aradului' | 'favorites';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Toate' },
  { key: 'breakfast', label: 'Mic dejun & Cafenele' },
  { key: 'dinner', label: 'Cină' },
  { key: 'centru', label: 'Centru / Cetate' },
  { key: 'aradului', label: 'Calea Aradului' },
  { key: 'favorites', label: 'Favoritele mele' },
];

/** Haversine distance in meters. */
const distanceMeters = (a: [number, number], b: [number, number]) => {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

/** Nearest ApArt property + walking estimate (street factor 1.25 applied). */
const nearestProperty = (poi: GuidePoi) => {
  let best = APART_PROPERTIES[0];
  let bestDist = Infinity;
  for (const p of APART_PROPERTIES) {
    const d = distanceMeters(p.coords, [poi.longitude, poi.latitude]);
    if (d < bestDist) {
      bestDist = d;
      best = p;
    }
  }
  const walkMeters = Math.round(bestDist * 1.25);
  const walkMinutes = Math.max(1, Math.round(walkMeters / 1000 / WALKING_SPEED_KMH * 60));
  return { property: best.name, walkMeters, walkMinutes };
};

const isCentral = (poi: GuidePoi) =>
  distanceMeters([21.2265, 45.7565], [poi.longitude, poi.latitude]) < 1200;

const isAradului = (poi: GuidePoi) =>
  /aradului/i.test(poi.address ?? '') ||
  distanceMeters([21.2245, 45.7765], [poi.longitude, poi.latitude]) < 1500;

type MapboxModule = typeof import('mapbox-gl');

const RestaurantGuideMap: React.FC = () => {
  const sectionRef = useRef<HTMLElement | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapbox, setMapbox] = useState<MapboxModule | null>(null);
  const [shouldLoadMap, setShouldLoadMap] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState(false);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const { isFavorite, toggleFavorite, favorites, favoritesCount, isAuthenticated } =
    usePoiFavorites();

  const { data: pois = [], isLoading } = useQuery({
    queryKey: ['restaurant-guide-pois'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_of_interest')
        .select(
          'id,name,category,description,latitude,longitude,address,website,rating,phone,image_url',
        )
        .in('category', ['restaurant', 'cafe'])
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as GuidePoi[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const poiIds = useMemo(() => pois.map((p) => p.id), [pois]);
  const { reviewsFor, summaryFor, submitReview, isSubmitting } = usePoiReviews(poiIds);

  const enriched = useMemo(
    () => pois.map((poi) => ({ ...poi, ...nearestProperty(poi) })),
    [pois],
  );


  const filtered = useMemo(() => {
    switch (filter) {
      case 'breakfast':
        return enriched.filter((p) => p.category === 'cafe');
      case 'dinner':
        return enriched.filter((p) => p.category === 'restaurant');
      case 'centru':
        return enriched.filter(isCentral);
      case 'aradului':
        return enriched.filter(isAradului);
      case 'favorites':
        return enriched.filter((p) => isFavorite(p.id));
      default:
        return enriched;
    }
  }, [enriched, filter, isFavorite]);

  // Defer the whole map subsystem (token fetch + mapbox-gl chunk) until the
  // guide section is close to the viewport. Keeps LCP/TBT clean on the article.
  useEffect(() => {
    if (shouldLoadMap || typeof window === 'undefined') return;
    const el = sectionRef.current;
    if (!el) return;
    if (!('IntersectionObserver' in window)) {
      setShouldLoadMap(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoadMap(true);
          observer.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [shouldLoadMap]);

  // Lazy-load the Mapbox GL runtime + stylesheet on demand.
  useEffect(() => {
    if (!shouldLoadMap || mapbox || !isWebGLSupported()) return;
    let cancelled = false;
    (async () => {
      try {
        const [mod] = await Promise.all([
          import('mapbox-gl'),
          import('mapbox-gl/dist/mapbox-gl.css'),
        ]);
        if (!cancelled) setMapbox((mod.default ? mod : mod) as MapboxModule);
      } catch {
        if (!cancelled) setTokenError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldLoadMap, mapbox]);

  // Mapbox token (only once the map is actually needed)
  useEffect(() => {
    if (!shouldLoadMap || token) return;
    const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined;
    if (envToken) {
      setToken(envToken);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        if (!cancelled && data?.token) setToken(data.token);
        else if (!cancelled) setTokenError(true);
      } catch {
        if (!cancelled) setTokenError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shouldLoadMap, token]);

  // Init map
  useEffect(() => {
    const gl = mapbox?.default ?? mapbox;
    if (!gl || !token || !mapContainer.current || mapRef.current || !isWebGLSupported()) return;
    gl.accessToken = token;
    const map = new gl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: MAP_CENTER,
      zoom: 12.6,
      attributionControl: true,
    });
    map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [token, mapbox]);

  // Render markers
  useEffect(() => {
    const gl = mapbox?.default ?? mapbox;
    const map = mapRef.current;
    if (!gl || !map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    APART_PROPERTIES.forEach((prop) => {
      const el = document.createElement('div');
      el.className =
        'w-6 h-6 rounded-full bg-primary border-2 border-white shadow-md flex items-center justify-center';
      el.setAttribute('aria-label', `Proprietate ${prop.name}`);
      el.innerHTML =
        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M3 10.5 12 3l9 7.5V21H3z"/></svg>';
      markersRef.current.push(
        new gl.Marker({ element: el })
          .setLngLat(prop.coords)
          .setPopup(new gl.Popup({ offset: 16 }).setText(prop.name))
          .addTo(map),
      );
    });

    filtered.forEach((poi) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', `${poi.name} — ${poi.walkMinutes} minute de mers pe jos`);
      el.className =
        'w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[10px] font-bold text-white ' +
        (poi.category === 'cafe' ? 'bg-amber-600' : 'bg-rose-600');
      el.textContent = poi.category === 'cafe' ? '☕' : '🍽';
      el.addEventListener('click', () => {
        setActiveId(poi.id);
        setDetailId(poi.id);
      });
      const popup = new gl.Popup({ offset: 18 }).setHTML(
        `<strong>${poi.name}</strong><br/><span>${poi.walkMinutes} min pe jos de la ${poi.property}</span>`,
      );
      markersRef.current.push(
        new gl.Marker({ element: el })
          .setLngLat([poi.longitude, poi.latitude])
          .setPopup(popup)
          .addTo(map),
      );
    });
  }, [filtered, mapbox]);


  const focusPoi = useCallback((poi: GuidePoi) => {
    setActiveId(poi.id);
    mapRef.current?.flyTo({ center: [poi.longitude, poi.latitude], zoom: 15.5, duration: 800 });
    mapContainer.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  const favoriteItems = useMemo<RestaurantGuideItem[]>(
    () =>
      enriched
        .filter((p) => favorites.includes(p.id))
        .map((p) => {
          const s = summaryFor(p.id);
          return {
            name: p.name,
            category: p.category,
            address: p.address,
            phone: p.phone,
            website: p.website,
            walkMinutes: p.walkMinutes,
            walkMeters: p.walkMeters,
            property: p.property,
            rating: p.rating,
            guestRating: s.average,
            guestReviews: s.count,
          };
        }),
    [enriched, favorites, summaryFor],
  );

  const handleExportPdf = useCallback(async () => {
    if (favoriteItems.length === 0) {
      toast.error('Salvează cel puțin o locație pentru a genera ghidul PDF.');
      return;
    }
    try {
      await exportRestaurantGuidePdf(favoriteItems);
      toast.success('Ghidul tău PDF a fost descărcat.');
    } catch {
      toast.error('Nu am putut genera PDF-ul. Încearcă din nou.');
    }
  }, [favoriteItems]);

  const handleShareWhatsApp = useCallback(() => {
    if (favoriteItems.length === 0) {
      toast.error('Salvează cel puțin o locație pentru a trimite lista pe WhatsApp.');
      return;
    }
    const text = encodeURIComponent(buildRestaurantGuideWhatsAppText(favoriteItems));
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }, [favoriteItems]);

  const detailPoi = useMemo<RestaurantModalPoi | null>(() => {
    const found = enriched.find((p) => p.id === detailId);
    return found ? (found as RestaurantModalPoi) : null;
  }, [enriched, detailId]);


  return (
    <section className="not-prose my-10 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <header className="mb-4">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-primary" aria-hidden="true" />
          Hartă interactivă: restaurante & cafenele
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Distanțele și timpul de mers pe jos sunt calculate de la cea mai apropiată proprietate
          ApArt Hotel / RealTrust din Timișoara.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Filtre rapide restaurante">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            type="button"
            size="sm"
            variant={filter === f.key ? 'default' : 'outline'}
            aria-pressed={filter === f.key}
            aria-label={`Filtrează: ${f.label}`}
            className="min-h-[40px]"
            onClick={() => setFilter(f.key)}
          >
            {f.key === 'favorites' && <Heart className="w-3.5 h-3.5 mr-1" aria-hidden="true" />}
            {f.label}
            {f.key === 'favorites' && favoritesCount > 0 ? ` (${favoritesCount})` : ''}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          size="sm"
          variant="secondary"
          className="min-h-[40px]"
          onClick={handleExportPdf}
          aria-label="Descarcă ghidul PDF cu locațiile salvate"
        >
          <FileDown className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
          Ghid PDF ({favoritesCount})
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="min-h-[40px]"
          onClick={handleShareWhatsApp}
          aria-label="Trimite lista salvată pe WhatsApp"
        >
          <Share2 className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
          Trimite pe WhatsApp
        </Button>
      </div>

      {!isAuthenticated && (
        <p className="text-xs text-muted-foreground mb-3">
          Locațiile premium recomandate de gazdele noastre devin vizibile pe hartă după autentificare.{' '}
          <a href="/auth" className="underline font-medium">Intră în cont</a> pentru lista completă și
          sincronizarea favoritelor pe contul tău.
        </p>
      )}


      <div className="relative rounded-xl overflow-hidden border border-border">
        <div ref={mapContainer} className="w-full h-[360px] sm:h-[440px]" />
        {(!token || isLoading) && !tokenError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
            <Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Se încarcă harta" />
          </div>
        )}
        {tokenError && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80 p-4 text-center text-sm text-muted-foreground">
            Harta nu poate fi încărcată momentan. Lista completă rămâne disponibilă mai jos.
          </div>
        )}
      </div>

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {filtered.map((poi) => (
          <li
            key={poi.id}
            id={`guide-poi-${poi.id}`}
            className={`rounded-xl border p-3 transition-colors ${
              activeId === poi.id ? 'border-primary bg-primary/5' : 'border-border bg-background'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {poi.category === 'cafe' ? (
                    <Coffee className="w-4 h-4 text-amber-600 shrink-0" aria-hidden="true" />
                  ) : (
                    <UtensilsCrossed className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
                  )}
                  <span className="font-semibold truncate">{poi.name}</span>
                  {poi.rating ? (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="w-3 h-3" aria-hidden="true" />
                      {poi.rating}
                    </Badge>
                  ) : null}
                  {summaryFor(poi.id).count > 0 && (
                    <Badge className="gap-1">
                      <Star className="w-3 h-3" aria-hidden="true" />
                      {summaryFor(poi.id).average} ({summaryFor(poi.id).count})
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Footprints className="w-3.5 h-3.5" aria-hidden="true" />
                  {poi.walkMinutes} min ({poi.walkMeters < 1000
                    ? `${poi.walkMeters} m`
                    : `${(poi.walkMeters / 1000).toFixed(1)} km`}
                  ) de la {poi.property}
                </p>
                {poi.address && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{poi.address}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleFavorite(poi.id)}
                aria-label={
                  isFavorite(poi.id)
                    ? `Elimină ${poi.name} din favorite`
                    : `Salvează ${poi.name} la favorite`
                }
                aria-pressed={isFavorite(poi.id)}
                className="p-3 -m-1 rounded-full hover:bg-muted transition-colors"
              >
                <Heart
                  className={`w-5 h-5 ${
                    isFavorite(poi.id) ? 'fill-rose-500 text-rose-500' : 'text-muted-foreground'
                  }`}
                  aria-hidden="true"
                />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                size="sm"
                className="min-h-[40px]"
                onClick={() => setDetailId(poi.id)}
                aria-label={`Vezi detalii despre ${poi.name}`}
              >
                <Info className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Detalii & recenzii
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-[40px]"
                onClick={() => focusPoi(poi)}
                aria-label={`Vezi ${poi.name} pe hartă`}
              >
                <Navigation className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                Vezi pe hartă
              </Button>
              {poi.website && (
                <Button size="sm" variant="ghost" className="min-h-[40px]" asChild>
                  <a
                    href={poi.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Site oficial ${poi.name}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    Site
                  </a>
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          {filter === 'favorites'
            ? 'Nu ai salvat încă nicio locație. Apasă pe inimă pentru a-ți construi lista pentru sejur.'
            : 'Nu am găsit locații pentru acest filtru.'}
        </p>
      )}

      <RestaurantDetailModal
        poi={detailPoi}
        open={!!detailPoi}
        onOpenChange={(o) => !o && setDetailId(null)}
        reviews={detailPoi ? reviewsFor(detailPoi.id) : []}
        guestRating={detailPoi ? summaryFor(detailPoi.id).average : null}
        guestReviewCount={detailPoi ? summaryFor(detailPoi.id).count : 0}
        isAuthenticated={isAuthenticated}
        isFavorite={detailPoi ? isFavorite(detailPoi.id) : false}
        onToggleFavorite={() => detailPoi && toggleFavorite(detailPoi.id)}
        onSubmitReview={(rating, comment) =>
          detailPoi && submitReview({ poiId: detailPoi.id, rating, comment })
        }
        isSubmitting={isSubmitting}
      />
    </section>

  );
};

export default RestaurantGuideMap;
