/**
 * B2C outreach helpers — render templates for FSBO leads coming from
 * scraper_leads_archive_2026 / v_prospect_funnel using the dynamic tags:
 *   {{owner_name}}, {{property_type}}, {{rooms}}, {{zone}}, {{price}}
 */

export interface B2CLeadLike {
  title?: string | null;
  contact_name?: string | null;
  zone?: string | null;
  location?: string | null;
  neighborhood_slug?: string | null;
  listing_type?: string | null;
  original_price?: number | null;
  description?: string | null;
  url?: string | null;
  phone?: string | null;
}

export interface B2CTemplate {
  id: string;
  platform: string;
  name: string;
  subject: string;
  body: string;
  is_active: boolean;
}

export const B2C_PLATFORMS = ["fsbo_initial", "fsbo_followup"] as const;

export const B2C_AVAILABLE_TAGS = [
  "{{owner_name}}",
  "{{property_type}}",
  "{{rooms}}",
  "{{zone}}",
  "{{price}}",
] as const;

const propertyTypeFromTitle = (title?: string | null): string => {
  if (!title) return "proprietatea";
  const t = title.toLowerCase();
  if (/garson/.test(t)) return "garsonieră";
  if (/apartament/.test(t)) return "apartament";
  if (/cas[aă]|vil[aă]/.test(t)) return "casă";
  if (/teren|lot/.test(t)) return "teren";
  if (/spa[țt]iu|comercial|birou/.test(t)) return "spațiu";
  return "proprietatea";
};

const roomsFromTitle = (title?: string | null): string => {
  if (!title) return "—";
  const m = title.match(/(\d+)\s*camer/i);
  if (m) return m[1];
  if (/garson/i.test(title)) return "1";
  return "—";
};

const formatPrice = (p?: number | null): string => {
  if (!p || !Number.isFinite(p)) return "—";
  return new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(p);
};

export const buildB2CTagMap = (lead: B2CLeadLike): Record<string, string> => ({
  "{{owner_name}}": (lead.contact_name && lead.contact_name.trim()) || "proprietar",
  "{{property_type}}": propertyTypeFromTitle(lead.title),
  "{{rooms}}": roomsFromTitle(lead.title),
  "{{zone}}":
    (lead.zone && lead.zone.trim()) ||
    (lead.neighborhood_slug && lead.neighborhood_slug.replace(/-/g, " ")) ||
    (lead.location && lead.location.trim()) ||
    "Timișoara",
  "{{price}}": formatPrice(lead.original_price),
});

export const renderB2CTemplate = (tpl: string, lead: B2CLeadLike): string => {
  const map = buildB2CTagMap(lead);
  return tpl.replace(
    /\{\{(owner_name|property_type|rooms|zone|price)\}\}/g,
    (m) => map[m] ?? m,
  );
};
