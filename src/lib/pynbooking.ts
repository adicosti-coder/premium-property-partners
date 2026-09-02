// Conectarea cererilor de rezervare din site la motorul real de rezervări
// Pynbooking. Fiecare apartament are propriul subdomeniu `*.pynbooking.direct`,
// iar motorul acceptă datele sejurului ca parametri în URL, astfel încât
// oaspetele (sau adminul) ajunge direct în pasul de confirmare cu datele
// pre-completate — nu doar o cerere internă.

export interface PynbookingStay {
  checkIn?: string;  // YYYY-MM-DD
  checkOut?: string; // YYYY-MM-DD
  guests?: number;
  /** Cod de reducere direct (ex. DIRECT5) */
  promo?: string;
  /** Referința internă RealTrust, transmisă pentru reconciliere. */
  reference?: string;
}

const isDay = (value?: string) => !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Doar motoarele proprii (Pynbooking) acceptă pre-completarea datelor. */
export const isPynbookingUrl = (url?: string | null) =>
  !!url && /(^|\.)pynbooking\.direct/i.test(url);

/**
 * Construiește URL-ul de rezervare reală cu sejurul pre-completat.
 * Trimitem aliasurile uzuale de parametri (checkin/arrival/date_from) pentru a
 * rămâne compatibili cu variantele motorului Pynbooking.
 */
export const buildPynbookingUrl = (bookingUrl: string, stay: PynbookingStay = {}): string => {
  if (!bookingUrl) return bookingUrl;
  if (!isPynbookingUrl(bookingUrl)) return bookingUrl;

  let url: URL;
  try {
    url = new URL(bookingUrl);
  } catch {
    return bookingUrl;
  }

  const set = (keys: string[], value: string) => keys.forEach((k) => url.searchParams.set(k, value));

  if (isDay(stay.checkIn)) set(["checkin", "arrival", "date_from"], stay.checkIn!);
  if (isDay(stay.checkOut)) set(["checkout", "departure", "date_to"], stay.checkOut!);
  if (stay.guests && stay.guests > 0) {
    set(["adults", "guests", "persons"], String(Math.min(Math.round(stay.guests), 30)));
  }
  if (stay.promo) url.searchParams.set("promo", stay.promo.toUpperCase().slice(0, 40));
  if (stay.reference) url.searchParams.set("ref", stay.reference.slice(0, 40));
  url.searchParams.set("utm_source", "realtrust.ro");
  url.searchParams.set("utm_medium", "direct_booking");

  return url.toString();
};

/** Numărul de nopți dintre două date ISO (0 dacă intervalul e invalid). */
export const nightsBetween = (checkIn?: string, checkOut?: string): number => {
  if (!isDay(checkIn) || !isDay(checkOut)) return 0;
  const diff = Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`);
  const nights = Math.round(diff / 86_400_000);
  return nights > 0 ? nights : 0;
};

/** Tarif live acceptat doar în intervalul plauzibil pentru cazare (€/noapte). */
export const LIVE_RATE_MIN = 25;
export const LIVE_RATE_MAX = 250;

export const sanitizeLiveRate = (
  live: number | null | undefined,
  fallback: number,
): number => {
  if (typeof live === "number" && isFinite(live) && live >= LIVE_RATE_MIN && live <= LIVE_RATE_MAX) {
    return Math.round(live);
  }
  return fallback;
};
