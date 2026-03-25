import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Search, Loader2, LocateFixed } from 'lucide-react';

interface MapLocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number) => void;
  locationText?: string;
}

const TIMISOARA_CENTER: [number, number] = [21.2270, 45.7489];

export default function MapLocationPicker({
  latitude,
  longitude,
  onLocationChange,
  locationText,
}: MapLocationPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [displayCoords, setDisplayCoords] = useState({ lat: latitude, lng: longitude });

  // Fetch Mapbox token
  useEffect(() => {
    supabase.functions.invoke('get-mapbox-token').then(({ data }) => {
      if (data?.token) setToken(data.token);
    });
  }, []);

  const updateMarker = useCallback((lng: number, lat: number) => {
    if (!mapRef.current) return;
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat]);
    } else {
      markerRef.current = new mapboxgl.Marker({ color: '#ef4444', draggable: true })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
      markerRef.current.on('dragend', () => {
        const lngLat = markerRef.current!.getLngLat();
        setDisplayCoords({ lat: lngLat.lat, lng: lngLat.lng });
        onLocationChange(lngLat.lat, lngLat.lng);
      });
    }
  }, [onLocationChange]);

  // Init map
  useEffect(() => {
    if (!token || !mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = token;

    const center: [number, number] = longitude && latitude ? [longitude, latitude] : TIMISOARA_CENTER;
    const zoom = longitude && latitude ? 16 : 13;

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom,
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
      if (latitude && longitude) {
        updateMarker(longitude, latitude);
      }
    });

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;
      updateMarker(lng, lat);
      setDisplayCoords({ lat, lng });
      onLocationChange(lat, lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [token]);

  // Update marker when props change externally
  useEffect(() => {
    if (latitude && longitude && mapRef.current) {
      updateMarker(longitude, latitude);
      setDisplayCoords({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude, updateMarker]);

  const handleSearch = async () => {
    const query = searchQuery.trim() || locationText || '';
    if (!query) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query + ', Timișoara, Romania')}.json?access_token=${token}&limit=1`
      );
      const data = await res.json();
      if (data.features?.length > 0) {
        const [lng, lat] = data.features[0].center;
        mapRef.current?.flyTo({ center: [lng, lat], zoom: 16 });
        updateMarker(lng, lat);
        setDisplayCoords({ lat, lng });
        onLocationChange(lat, lng);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  if (!token) {
    return (
      <div className="flex items-center justify-center h-48 border rounded-lg bg-muted/30">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm text-muted-foreground">Se încarcă harta...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-primary" />
        Poziție pe Hartă
      </Label>

      {/* Search bar */}
      <div className="flex gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Caută adresa (ex: Strada Take Ionescu 50)"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={handleSearch} disabled={isSearching}>
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
        {locationText && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Caută automat din câmpul Locație"
            onClick={() => { setSearchQuery(locationText); handleSearch(); }}
          >
            <LocateFixed className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Map */}
      <div
        ref={mapContainer}
        className="w-full h-64 rounded-lg border overflow-hidden"
        style={{ minHeight: '256px' }}
      />

      {/* Coordinate display */}
      {displayCoords.lat && displayCoords.lng && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>Lat: <strong>{displayCoords.lat.toFixed(6)}</strong></span>
          <span>Lng: <strong>{displayCoords.lng.toFixed(6)}</strong></span>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        💡 Click pe hartă sau trage markerul pentru a seta poziția exactă. Poți și căuta o adresă.
      </p>
    </div>
  );
}