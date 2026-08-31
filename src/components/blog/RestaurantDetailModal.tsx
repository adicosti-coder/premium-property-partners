import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Star,
  Phone,
  Navigation,
  ExternalLink,
  Footprints,
  Heart,
  MapPin,
  Clock,
} from 'lucide-react';
import type { PoiReview } from '@/hooks/usePoiReviews';
import { trackConversion } from '@/lib/conversionTracking';

export interface RestaurantModalPoi {
  id: string;
  name: string;
  category: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  rating: number | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
  walkMinutes: number;
  walkMeters: number;
  property: string;
}

interface Props {
  poi: RestaurantModalPoi | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviews: PoiReview[];
  guestRating: number | null;
  guestReviewCount: number;
  isAuthenticated: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSubmitReview: (rating: number, comment: string, honeypot?: string) => void;
  isSubmitting: boolean;
}

const StarPicker: React.FC<{ value: number; onChange: (v: number) => void }> = ({
  value,
  onChange,
}) => (
  <div className="flex items-center gap-1" role="radiogroup" aria-label="Nota acordată (1-5 stele)">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        role="radio"
        aria-checked={value === n}
        aria-label={`${n} ${n === 1 ? 'stea' : 'stele'}`}
        onClick={() => onChange(n)}
        className="p-2 rounded-md hover:bg-muted transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <Star
          className={`w-6 h-6 ${n <= value ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'}`}
          aria-hidden="true"
        />
      </button>
    ))}
  </div>
);

const RestaurantDetailModal: React.FC<Props> = ({
  poi,
  open,
  onOpenChange,
  reviews,
  guestRating,
  guestReviewCount,
  isAuthenticated,
  isFavorite,
  onToggleFavorite,
  onSubmitReview,
  isSubmitting,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    setRating(0);
    setComment('');
  }, [poi?.id]);

  // GA4 + Meta: modal opened (guest engagement with a recommended venue).
  useEffect(() => {
    if (!open || !poi) return;
    trackConversion({
      event: 'poi_detail_open',
      poi_id: poi.id,
      poi_name: poi.name,
      poi_category: poi.category,
    });
  }, [open, poi?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!poi) return null;

  const walk =
    poi.walkMeters < 1000 ? `${poi.walkMeters} m` : `${(poi.walkMeters / 1000).toFixed(1)} km`;
  const gpsUrl = `https://www.google.com/maps/dir/?api=1&destination=${poi.latitude},${poi.longitude}&travelmode=walking`;
  // Google Maps place lookup (local pack discovery → extra restaurant traffic).
  const mapsPlaceUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${poi.name} Timișoara`,
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">{poi.name}</DialogTitle>
          <DialogDescription>
            {poi.category === 'cafe' ? 'Cafenea' : 'Restaurant'} recomandat de gazdele ApArt Hotel
          </DialogDescription>
        </DialogHeader>

        {poi.image_url && (
          <img
            src={poi.image_url}
            alt={`${poi.name} din Timișoara`}
            loading="lazy"
            decoding="async"
            width={640}
            height={360}
            className="w-full h-44 object-cover rounded-lg"
            style={{ aspectRatio: '16 / 9' }}
          />
        )}


        <div className="flex flex-wrap items-center gap-2">
          {poi.rating ? (
            <Badge variant="secondary" className="gap-1">
              <Star className="w-3 h-3" aria-hidden="true" /> Google {poi.rating}/5
            </Badge>
          ) : null}
          {guestRating ? (
            <Badge className="gap-1">
              <Star className="w-3 h-3" aria-hidden="true" /> Oaspeți ApArt {guestRating}/5 (
              {guestReviewCount})
            </Badge>
          ) : (
            <Badge variant="outline">Fără recenzii de la oaspeți încă</Badge>
          )}
        </div>

        <ul className="text-sm space-y-2 text-muted-foreground">
          <li className="flex items-start gap-2">
            <Footprints className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            {poi.walkMinutes} min pe jos ({walk}) de la {poi.property}
          </li>
          {poi.address && (
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              {poi.address}
            </li>
          )}
          <li className="flex items-start gap-2">
            <Clock className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            Program recomandat: verifică orarul actualizat pe pagina oficială înainte de vizită.
          </li>
        </ul>

        {poi.description && <p className="text-sm">{poi.description}</p>}

        <div className="flex flex-wrap gap-2">
          {poi.phone && (
            <Button size="sm" className="min-h-[44px]" asChild>
              <a
                href={`tel:${poi.phone.replace(/\s/g, '')}`}
                aria-label={`Sună la ${poi.name}`}
                onClick={() =>
                  trackConversion({
                    event: 'phone_click',
                    poi_id: poi.id,
                    poi_name: poi.name,
                    source: 'restaurant_guide_modal',
                  })
                }
              >
                <Phone className="w-4 h-4 mr-1" aria-hidden="true" /> Sună
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" className="min-h-[44px]" asChild>
            <a
              href={gpsUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Navigație GPS către ${poi.name}`}
              onClick={() =>
                trackConversion({
                  event: 'poi_navigate_gps',
                  poi_id: poi.id,
                  poi_name: poi.name,
                  walk_minutes: poi.walkMinutes,
                })
              }
            >
              <Navigation className="w-4 h-4 mr-1" aria-hidden="true" /> Navigare GPS
            </a>
          </Button>

          <Button size="sm" variant="outline" className="min-h-[44px]" asChild>
            <a
              href={mapsPlaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Deschide ${poi.name} în Google Maps`}
              onClick={() =>
                trackConversion({
                  event: 'poi_open_google_maps',
                  poi_id: poi.id,
                  poi_name: poi.name,
                  poi_category: poi.category,
                })
              }
            >
              <MapPin className="w-4 h-4 mr-1" aria-hidden="true" /> Deschide în Google Maps
            </a>
          </Button>



          {poi.website && (
            <Button size="sm" variant="ghost" className="min-h-[44px]" asChild>
              <a
                href={poi.website}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Site oficial ${poi.name}`}
              >
                <ExternalLink className="w-4 h-4 mr-1" aria-hidden="true" /> Site
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant={isFavorite ? 'default' : 'outline'}
            className="min-h-[44px]"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            aria-label={
              isFavorite ? `Elimină ${poi.name} din favorite` : `Salvează ${poi.name} la favorite`
            }
          >
            <Heart className={`w-4 h-4 mr-1 ${isFavorite ? 'fill-current' : ''}`} aria-hidden="true" />
            {isFavorite ? 'Salvat' : 'Salvează'}
          </Button>
        </div>

        <Separator />

        <section aria-label="Recenzii oaspeți">
          <h3 className="text-sm font-semibold mb-2">Recenzii de la oaspeții ApArt Hotel</h3>
          {reviews.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nu există încă recenzii. Fii primul care evaluează această locație.
            </p>
          ) : (
            <ul className="space-y-3 max-h-52 overflow-y-auto pr-1">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="flex" aria-label={`${r.rating} din 5 stele`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-3.5 h-3.5 ${
                            n <= r.rating ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground'
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                    <span className="text-xs font-medium">{r.guest_name || 'Oaspete ApArt'}</span>
                    <span className="text-[11px] text-muted-foreground ml-auto">
                      {new Date(r.created_at).toLocaleDateString('ro-RO')}
                    </span>
                  </div>
                  {r.comment && <p className="text-xs mt-1.5">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            {isAuthenticated ? (
              <>
                <p className="text-xs font-medium mb-1">Lasă-ți nota:</p>
                <StarPicker value={rating} onChange={setRating} />
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={1000}
                  placeholder="Ce ți-a plăcut? (opțional)"
                  aria-label="Comentariu recenzie"
                  className="mt-2"
                  rows={3}
                />
                {/* Honeypot: invisible to guests, filled in by bots. */}
                <input
                  type="text"
                  name="website_url"
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  className="absolute left-[-9999px] w-px h-px opacity-0"
                />
                <Button
                  size="sm"
                  className="mt-2 min-h-[44px]"
                  disabled={rating === 0 || isSubmitting}
                  onClick={() => onSubmitReview(rating, comment, honeypot)}
                  aria-label="Trimite recenzia"
                >
                  {isSubmitting ? 'Se salvează...' : 'Trimite recenzia'}
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                <a href="/auth" className="underline font-medium">
                  Intră în cont
                </a>{' '}
                pentru a lăsa un rating și o recenzie.
              </p>
            )}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default RestaurantDetailModal;
