// Page context for the public chatbot (ai-chatbot-stream).
// The visitor's browser reports which page it is on; that value is untrusted, so it is
// reduced to a plain pathname and mapped to ONE fixed page kind. Only the fixed guidance
// text for that kind (never free text from the request) reaches the system prompt.

export type ChatPageKind = "owner" | "property" | "guest" | "zone" | "blog" | "real_estate" | "general";

export interface ChatPageContext {
  /** Sanitized pathname: lowercase letters, digits, dashes and slashes only. */
  path: string;
  kind: ChatPageKind;
}

const KIND_PREFIXES: Array<[ChatPageKind, string[]]> = [
  ["owner", ["/pentru-proprietari", "/investitii"]],
  ["property", ["/proprietate/"]],
  ["guest", ["/oaspeti", "/cazare"]],
  ["zone", ["/zona/"]],
  ["blog", ["/blog"]],
  ["real_estate", ["/imobiliare", "/servicii-imobiliare"]],
];

export const CHAT_PAGE_GUIDANCE: Record<ChatPageKind, string> = {
  owner: "→ OWNER/INVESTOR page: Focus on ROI, management packages, Investor Guide 2026. Proactively offer calculate_roi.",
  property: "→ PROPERTY DETAIL page: Focus on this specific property — availability, price, amenities, DIRECT5 discount. Proactively offer check_availability.",
  guest: "→ GUEST page: Focus on booking, availability, local tips, transfer. Proactively use check_availability and get_tourist_recommendations.",
  zone: "→ ZONE LANDING page: Focus on this neighborhood — properties, investment potential, local attractions. Offer ROI comparison.",
  blog: "→ BLOG page: Connect article topics to services. Suggest related properties or investment analysis.",
  real_estate: "→ REAL ESTATE page: Focus on property listings, investment opportunities, consultancy. Offer calculate_roi proactively.",
  general: "",
};

function matchesPrefix(path: string, prefix: string): boolean {
  if (prefix.endsWith("/")) return path.startsWith(prefix) && path.length > prefix.length;
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function resolveChatPageContext(raw: unknown): ChatPageContext {
  let value = String(raw ?? "/").trim().slice(0, 300);
  // Accept a full same-site URL too, but keep only its pathname.
  if (/^https?:\/\//i.test(value)) {
    try { value = new URL(value).pathname; } catch { value = "/"; }
  }
  value = value.split(/[?#]/)[0];
  try { value = decodeURIComponent(value); } catch { /* keep as-is */ }
  value = value.toLowerCase();
  if (!/^\/[a-z0-9\-\/]*$/.test(value) || value.includes("//")) return { path: "/", kind: "general" };
  const path = value.slice(0, 120);
  for (const [kind, prefixes] of KIND_PREFIXES) {
    if (prefixes.some((p) => matchesPrefix(path, p))) return { path, kind };
  }
  return { path, kind: "general" };
}
