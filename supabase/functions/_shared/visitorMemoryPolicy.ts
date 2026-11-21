/**
 * Visitor memory data policy — what the browsing tracker may store and return.
 * Only short, typed values are stored; the response never carries internal ids,
 * the linked account id, the marketing lead score or free-form metadata.
 */

const LISTING_TYPES = new Set(["vanzare", "inchiriere", "cazare", "investitie"]);

const str = (v: unknown, max: number): string | null => {
  if (typeof v !== "string" && typeof v !== "number") return null;
  const s = String(v).replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, max);
  return s || null;
};

const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
};

export function sanitizeViewEvent(data: unknown) {
  const d = (data ?? {}) as Record<string, unknown>;
  const id = str(d.propertyId, 80);
  if (!id) return null;
  return { id, name: str(d.name, 120), price: num(d.price, 0, 50_000_000), type: str(d.type, 40) };
}

export function sanitizePreferenceEvent(data: unknown): Record<string, unknown> {
  const d = (data ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const min = num(d.budget_min, 0, 50_000_000);
  const max = num(d.budget_max, 0, 50_000_000);
  if (min != null) out.budget_min = min;
  if (max != null) out.budget_max = max;
  if (Array.isArray(d.preferred_neighborhoods)) {
    const list = d.preferred_neighborhoods.map((n) => str(n, 60)).filter(Boolean).slice(0, 10);
    if (list.length) out.preferred_neighborhoods = list;
  }
  const type = str(d.preferred_listing_type, 20);
  if (type && LISTING_TYPES.has(type)) out.preferred_listing_type = type;
  const rooms = num(d.preferred_rooms, 1, 20);
  if (rooms != null) out.preferred_rooms = rooms;
  return out;
}

export function sanitizeIntent(v: unknown): string | null {
  return str(v, 40);
}

/** Fields the visitor's own browser may read back. */
export function publicVisitorMemory(row: Record<string, unknown> | null | undefined) {
  if (!row) return null;
  return {
    viewed_properties: Array.isArray(row.viewed_properties) ? row.viewed_properties : [],
    search_history: Array.isArray(row.search_history) ? row.search_history : [],
    budget_min: row.budget_min ?? null,
    budget_max: row.budget_max ?? null,
    preferred_neighborhoods: Array.isArray(row.preferred_neighborhoods) ? row.preferred_neighborhoods : [],
    preferred_listing_type: row.preferred_listing_type ?? null,
    preferred_rooms: row.preferred_rooms ?? null,
    chatbot_summary: row.chatbot_summary ?? null,
    last_intent: row.last_intent ?? null,
  };
}
