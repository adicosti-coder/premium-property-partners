/**
 * Centralized column selectors + parametrized fetchers for public listings.
 *
 * Single source of truth for "what columns does a card actually render".
 * Detail pages (`/proprietate/:slug`) build their own heavier select and
 * MUST NOT consume these constants — they need descriptions/long text.
 */

import { supabase } from "@/lib/supabaseClient";
import { fetchWithRetry } from "@/lib/supabaseRetry";

/** Minimum viable columns for any property *card* (no descriptions, no JSONB blobs). */
export const LISTING_CARD_COLUMNS = [
  "id",
  "slug",
  "name",
  "location",
  "listing_type",
  "capital_necesar",
  "image_path",
  "images",
  "size",
  "bedrooms",
] as const;

/** Extended card columns for the investments catalog (financial badges). */
export const INVESTMENT_CARD_COLUMNS = [
  "name",
  "location",
  "size",
  "bedrooms",
  "bathrooms",
  "capacity",
  "base_price_per_night",
  "roi_percentage",
  "estimated_revenue",
  "booking_rating",
  "booking_review_count",
  "tag",
  "listing_type",
  "capital_necesar",
  "slug",
  "image_path",
  "images",
] as const;

export interface FetchListingsParams {
  /** Comma-joined column list. Defaults to LISTING_CARD_COLUMNS. */
  columns?: readonly string[];
  /** Optional `listing_type IN (...)` filter. */
  listingTypes?: string[];
  /** Order column (defaults to `display_order` ascending). */
  orderBy?: { column: string; ascending?: boolean };
  /** Optional joined relation (e.g. property_images for primary thumb). */
  withRelation?: string;
}

export async function fetchPublicListings<T>(params: FetchListingsParams = {}) {
  const cols = (params.columns ?? LISTING_CARD_COLUMNS).join(", ");
  const select = params.withRelation ? `${cols}, ${params.withRelation}` : cols;
  const order = params.orderBy ?? { column: "display_order", ascending: true };

  return fetchWithRetry<T[]>(() => {
    let q = supabase.from("properties").select(select).eq("is_active", true);
    if (params.listingTypes?.length) q = q.in("listing_type", params.listingTypes);
    return q.order(order.column, { ascending: order.ascending ?? true }) as unknown as PromiseLike<{
      data: T[] | null;
      error: { message?: string; code?: string; status?: number } | null;
    }>;
  });
}
