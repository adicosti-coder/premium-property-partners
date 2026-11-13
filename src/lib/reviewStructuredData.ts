/**
 * Single source for Review / AggregateRating JSON-LD on accommodation pages.
 *
 * Google review-snippet rules applied here:
 * - Reviews live only on a valid parent type (LodgingBusiness, a LocalBusiness
 *   subtype). Apartment / HotelRoom / Accommodation are not eligible.
 * - Every rating declares its own scale. Guest ratings are stored and shown on
 *   the page on a 1–10 scale, so the markup uses the same scale (no /2 mixing).
 * - A review is emitted only with a named author, a rating inside the scale and
 *   a valid ISO date; anything else is dropped instead of producing an error.
 * - reviewCount is never smaller than the number of reviews marked up.
 */

export const GUEST_RATING_BEST = 10;
export const GUEST_RATING_WORST = 1;

export interface GuestReviewInput {
  guest_name?: string | null;
  rating?: number | string | null;
  content?: string | null;
  title?: string | null;
  review_date?: string | null;
  created_at?: string | null;
}

export interface ReviewedItemRef {
  id: string;
  name: string;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Returns YYYY-MM-DD for real calendar dates not in the future, else null. */
export function toSchemaDate(value?: string | null, now: Date = new Date()): string | null {
  if (!value) return null;
  const m = ISO_DATE.exec(String(value).trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(mo) - 1 ||
    date.getUTCDate() !== Number(d)
  ) return null;
  if (date.getTime() > now.getTime() + 86_400_000) return null;
  return `${y}-${mo}-${d}`;
}

function toRating(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < GUEST_RATING_WORST || n > GUEST_RATING_BEST) return null;
  return Math.round(n * 10) / 10;
}

const clean = (text?: string | null) => (text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export function buildAggregateRating(
  ratingValue: unknown,
  reviewCount: unknown,
  minimumCount = 0,
): Record<string, unknown> | null {
  const rating = toRating(ratingValue);
  const count = Math.max(Math.floor(Number(reviewCount) || 0), minimumCount);
  if (rating === null || count < 1) return null;
  return {
    "@type": "AggregateRating",
    ratingValue: rating,
    reviewCount: count,
    bestRating: GUEST_RATING_BEST,
    worstRating: GUEST_RATING_WORST,
  };
}

export function buildGuestReviews(
  reviews: GuestReviewInput[] | null | undefined,
  item: ReviewedItemRef,
  limit = 5,
  now: Date = new Date(),
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const r of reviews || []) {
    if (out.length >= limit) break;
    const author = clean(r.guest_name).slice(0, 100);
    const rating = toRating(r.rating);
    const date = toSchemaDate(r.review_date, now) || toSchemaDate(r.created_at, now);
    if (!author || rating === null || !date) continue;
    const body = clean(r.content) || clean(r.title);
    const title = clean(r.title);
    out.push({
      "@type": "Review",
      itemReviewed: { "@type": "LodgingBusiness", "@id": item.id, name: item.name },
      author: { "@type": "Person", name: author },
      datePublished: date,
      ...(title ? { name: title.slice(0, 110) } : {}),
      ...(body ? { reviewBody: body.slice(0, 1000) } : {}),
      reviewRating: {
        "@type": "Rating",
        ratingValue: rating,
        bestRating: GUEST_RATING_BEST,
        worstRating: GUEST_RATING_WORST,
      },
    });
  }
  return out;
}

/** Review + AggregateRating fields to spread into one LodgingBusiness node. */
export function lodgingReviewFields(input: {
  item: ReviewedItemRef;
  ratingValue?: unknown;
  reviewCount?: unknown;
  reviews?: GuestReviewInput[] | null;
  limit?: number;
  now?: Date;
}): Record<string, unknown> {
  const review = buildGuestReviews(input.reviews, input.item, input.limit ?? 5, input.now);
  const aggregateRating = buildAggregateRating(input.ratingValue, input.reviewCount, review.length);
  return {
    ...(aggregateRating ? { aggregateRating } : {}),
    ...(review.length > 0 ? { review } : {}),
  };
}

/** Same order as the visible review list: newest stay date first. */
export function sortGuestReviews<T extends GuestReviewInput>(reviews: T[]): T[] {
  return [...reviews].sort((a, b) =>
    String(b.review_date || b.created_at || "").localeCompare(String(a.review_date || a.created_at || "")),
  );
}
