/**
 * Linkuri marcate cu sursa pentru anunțurile de cazare.
 * Folosite în Admin → Anunțuri pe Canale: linkul lipit în anunțul de pe
 * Booking.com / Airbnb trimite vizitatorul pe realtrust.ro cu sursa marcată,
 * ca vizita să apară în raportul pe anunțuri.
 */
export const SITE_URL = "https://realtrust.ro";

export type ListingUtmSource = "airbnb" | "booking";

export const listingUtmUrl = (slug: string, source: ListingUtmSource): string =>
  `${SITE_URL}/cazare/${slug}?utm_source=${source}&utm_medium=listing&utm_campaign=cazare_timisoara`;

/** Citește sursa marcată dintr-un page_path salvat (ex. „/cazare/helios?utm_source=airbnb”). */
export const utmSourceFromPath = (path: string | null): ListingUtmSource | null => {
  if (!path) return null;
  const m = /utm_source=([a-z0-9_.-]+)/i.exec(path);
  const v = m?.[1]?.toLowerCase() ?? "";
  if (v.includes("airbnb")) return "airbnb";
  if (v.includes("booking")) return "booking";
  return null;
};
