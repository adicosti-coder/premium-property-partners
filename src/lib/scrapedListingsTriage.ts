/**
 * Vizualizarea de triere pentru anunțurile colectate: aplică „Ascunde duplicatele”
 * și filtrul de disponibilitate a telefonului peste grupurile din `crossPortalDedup`.
 */
import {
  matchesPhoneFilter, outreachBlockReason, phoneAvailability, portalKey,
  type DedupListing, type DuplicateGroup, type PhoneAvailabilityFilter,
} from "@/lib/crossPortalDedup";
import { norm } from "@/lib/portalSearch";
import { andreiIneligibleReason } from "@/lib/andreiBulkQueue";

export type TriageListing = DedupListing & {
  do_not_call?: boolean | null;
  seller_type?: string | null;
  lifecycle_status?: string | null;
  tags?: string[] | null;
  andrei_queued_at?: string | null;
  outreach_status?: string | null;
  lead_score?: number | null;
  agency_suspicion_score?: number | null;
  owner_sentiment?: string | null;
  prospect_type?: string | null;
  contact_name?: string | null;
  dismissed_at?: string | null;
};

/** De ce nu poate pleca spre coada de contactare (telefon, stare, proprietar confirmat, contact anterior), sau null. */
export function triageBlockReason(l: TriageListing): string | null {
  return outreachBlockReason(l) ?? andreiIneligibleReason({
    phone_normalized: l.phone_normalized ?? null,
    contact_phone: l.contact_phone ?? null,
    lifecycle_status: l.lifecycle_status ?? null,
    seller_type: l.seller_type ?? null,
    andrei_queued_at: l.andrei_queued_at ?? null,
    tags: l.tags ?? null,
    outreach_status: l.outreach_status ?? null,
    lead_score: l.lead_score ?? null,
    agency_suspicion_score: l.agency_suspicion_score ?? null,
    owner_sentiment: l.owner_sentiment ?? null,
    prospect_type: l.prospect_type ?? null,
    contact_name: l.contact_name ?? null,
    title: l.title ?? null,
  });
}

/** Pregătit pentru prospectare: are mobil, e activ și poate intra acum în coada lui Andrei. */
export const isReadyForOutreach = (l: TriageListing) => triageBlockReason(l) === null;

export interface TriageRow<T extends TriageListing = TriageListing> {
  listing: T;
  group: DuplicateGroup<T>;
  isPrimary: boolean;
  /** Numărul de variante duplicate găsite pentru același imobil. */
  duplicateCount: number;
}

export interface TriageFilters {
  hideDuplicates: boolean;
  phone: PhoneAvailabilityFilter;
  status: "all" | "active" | "inactive" | "dismissed";
  /** Anunțurile marcate „Indisponibil / renunțat” sunt ascunse implicit. */
  hideDismissed: boolean;
  portal: string;
  search: string;
}

export const DEFAULT_TRIAGE_FILTERS: TriageFilters = {
  hideDuplicates: true,
  phone: "all",
  status: "all",
  hideDismissed: true,
  portal: "all",
  search: "",
};

export const isDismissed = (l: TriageListing) => !!l.dismissed_at;

/**
 * Anunțurile care intră în grupare: fără cele indisponibile când sunt ascunse
 * (ca un anunț renunțat să nu ascundă variantele lui de pe alte portaluri).
 */
export function triagePool<T extends TriageListing>(listings: T[], f: TriageFilters): T[] {
  if (f.status === "dismissed" || !f.hideDismissed) return listings;
  return listings.filter((l) => !isDismissed(l));
}

function matchesBase(l: TriageListing, f: TriageFilters): boolean {
  if (f.status === "dismissed") { if (!isDismissed(l)) return false; }
  else if (f.hideDismissed && isDismissed(l)) return false;
  if (f.status === "active" && l.is_active === false) return false;
  if (f.status === "inactive" && l.is_active !== false) return false;
  if (f.portal !== "all" && portalKey(l) !== f.portal) return false;
  const terms = norm(f.search).split(" ").filter(Boolean);
  if (terms.length) {
    const hay = norm(`${l.title ?? ""} ${l.zone ?? ""} ${l.location ?? ""} ${l.source_platform ?? ""}`);
    if (!terms.every((t) => hay.includes(t))) return false;
  }
  return true;
}

/** Ordinea de lucru: pregătite pentru prospectare, apoi active cu telefon, active, inactive; apoi cele mai recente. */
export function triagePriority(l: TriageListing): number {
  if (isReadyForOutreach(l)) return 3;
  if (l.is_active === false) return 0;
  return phoneAvailability(l) === "available" ? 2 : 1;
}

const seenAt = (l: TriageListing) => {
  const t = Date.parse(l.last_seen_at ?? l.scraped_at ?? l.created_at ?? "");
  return Number.isFinite(t) ? t : 0;
};

export function buildTriageRows<T extends TriageListing>(groups: DuplicateGroup<T>[], f: TriageFilters): TriageRow<T>[] {
  const rows: TriageRow<T>[] = [];
  const ordered = [...groups].sort((a, b) =>
    triagePriority(b.primary) - triagePriority(a.primary) || seenAt(b.primary) - seenAt(a.primary));
  for (const group of ordered) {
    const members = f.hideDuplicates ? [group.primary] : [group.primary, ...group.variants];
    for (const listing of members) {
      if (!matchesBase(listing, f) || !matchesPhoneFilter(listing, f.phone)) continue;
      rows.push({ listing, group, isPrimary: listing.id === group.primary.id, duplicateCount: group.variants.length });
    }
  }
  return rows;
}

export interface TriageSummary {
  listings: number;
  properties: number;
  duplicateGroups: number;
  variants: number;
  withPhone: number;
  manualReveal: number;
  ready: number;
}

/** Contoarele de pe ecran, pe imobile unice (anunțul principal al fiecărui grup). */
export function summarizeTriage<T extends TriageListing>(groups: DuplicateGroup<T>[]): TriageSummary {
  let withPhone = 0, ready = 0, variants = 0, duplicateGroups = 0, listings = 0;
  for (const g of groups) {
    listings += 1 + g.variants.length;
    variants += g.variants.length;
    if (g.variants.length) duplicateGroups++;
    if (phoneAvailability(g.primary) === "available") withPhone++;
    if (isReadyForOutreach(g.primary)) ready++;
  }
  return { listings, properties: groups.length, duplicateGroups, variants, withPhone, manualReveal: groups.length - withPhone, ready };
}
