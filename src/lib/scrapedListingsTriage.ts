/**
 * Vizualizarea de triere pentru anunțurile colectate: aplică „Ascunde duplicatele”
 * și filtrul de disponibilitate a telefonului peste grupurile din `crossPortalDedup`.
 */
import {
  isGenericSearchListing, matchesPhoneFilter, outreachBlockReason, phoneAvailability, portalKey,
  type DedupListing, type DuplicateGroup, type PhoneAvailabilityFilter,
} from "@/lib/crossPortalDedup";
import { norm } from "@/lib/portalSearch";
import { andreiIneligibleReason } from "@/lib/andreiBulkQueue";
import { BLOCKED_AGENCY_STATUS, hasAgencyKeyword, isAgencyProspect, OUTREACH_MIN_SCORE, titleHasAgencyKeyword } from "../../supabase/functions/_shared/ownerOutreachEligibility";

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
  /** Marcat manual ca agenție din Triere (se poate anula). */
  agency_marked_at?: string | null;
  /** Blocat automat pe același număr: id-ul anunțului marcat manual (anularea readuce tot grupul). */
  agency_mark_root?: string | null;
  /** Pe anunțul marcat manual: câte alte anunțuri cu același număr au fost blocate odată cu el. */
  agency_mark_sibling_count?: number | null;
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
  /** Doar anunțurile pregătite pentru prospectare (privat, scor > 60, telefon valid, eligibile). */
  readyOnly: boolean;
  portal: string;
  search: string;
}

export const DEFAULT_TRIAGE_FILTERS: TriageFilters = {
  hideDuplicates: true,
  phone: "all",
  status: "all",
  hideDismissed: true,
  readyOnly: false,
  portal: "all",
  search: "",
};

export const isDismissed = (l: TriageListing) => !!l.dismissed_at;

/** Cuvinte de agenție în titlu, nume sau etichete: nicio confirmare manuală nu le poate ridica. */
export const hasAgencyTextSignal = (l: TriageListing) =>
  hasAgencyKeyword(l.contact_name) || titleHasAgencyKeyword(l.title) || (l.tags ?? []).some((t) => hasAgencyKeyword(t));

/**
 * Ce variantă de „Confirmă privat” apare pe card: `confirm` pentru proprietarii neconfirmați,
 * `override` (cu confirmare separată) pentru anunțurile marcate ca agenție doar prin clasificare,
 * null când nu se poate confirma (indisponibil, deja privat, deja contactat, fără telefon, cuvinte de agenție).
 */
export function privateConfirmMode(l: TriageListing): "confirm" | "override" | null {
  if (isDismissed(l) || l.seller_type === "privat" || l.agency_marked_at) return null;
  // „Nu e agenție” apare pe orice agenție blocată automat (și pe anunțurile inactive),
  // cu excepția celor cu cuvinte de agenție în text sau deja contactate.
  if (isAgencyListing(l)) {
    if (hasAgencyTextSignal(l)) return null;
    if (l.outreach_status && l.outreach_status !== BLOCKED_AGENCY_STATUS) return null;
    return "override";
  }
  // Un anunț inactiv nerenunțat poate fi confirmat: confirmarea îl și reactivează.
  return triageBlockReason(asReactivated(l)) === "Neconfirmat" ? "confirm" : null;
}

/** Scorul minim al unui proprietar confirmat manual de admin (mirror al trigger-ului din baza de date). */
export const PRIVATE_CONFIRMED_MIN_SCORE = 75;

/** Starea după „Confirmă privat”: privat și scor ridicat la minim 75. */
export const asConfirmedPrivate = <T extends TriageListing>(l: T): T => ({
  ...l, seller_type: "privat", lead_score: Math.max(Number(l.lead_score ?? 0), PRIVATE_CONFIRMED_MIN_SCORE),
});

/** Inactiv, dar nerenunțat manual: administratorul îl poate reactiva direct. */
export const canReactivate = (l: TriageListing) => l.is_active === false && !isDismissed(l);

/** Starea pe care o primește anunțul după reactivare (activ, ciclu „new”). */
export const asReactivated = <T extends TriageListing>(l: T): T =>
  canReactivate(l) ? { ...l, is_active: true, lifecycle_status: "new" } : l;

/** Agenție după clasificare, marcaj manual sau starea „blocked_agency” — nu primește mesaje. */
export const isAgencyListing = (l: TriageListing) =>
  !!l.agency_marked_at || l.outreach_status === BLOCKED_AGENCY_STATUS || isAgencyProspect(l);

/** „Necesită dezvăluire”: doar anunțuri active fără telefon, nerenunțate și fără agenție blocată. */
export const needsManualReveal = (l: TriageListing) =>
  phoneAvailability(l) === "manual" && l.is_active !== false && !isDismissed(l) && !isAgencyListing(l);

/**
 * Butonul „Agenție” de pe card: `mark` pe anunțurile care nu sunt deja agenție blocată,
 * `undo` pe cele marcate manual din Triere, null pe indisponibile sau agenții detectate automat.
 */
export function agencyMarkMode(l: TriageListing): "mark" | "undo" | null {
  if (isDismissed(l)) return null;
  if (l.agency_marked_at) return "undo";
  return isAgencyListing(l) ? null : "mark";
}

const anunturi = (n: number) => `${n} ${n === 1 ? "anunț" : "anunțuri"}`;

/** Textul de pe card pentru anunțurile marcate manual sau blocate pe același număr. */
export function agencyMarkHint(l: TriageListing): string {
  if (l.agency_mark_root) return "Blocat automat — același număr ca un anunț marcat manual ca agenție";
  const n = Number(l.agency_mark_sibling_count ?? 0);
  return n > 0
    ? `Marcat manual ca agenție — încă ${anunturi(n)} cu același număr blocate`
    : "Marcat manual ca agenție — nu primește mesaje";
}

/** Eticheta butonului de anulare: pe un grup, anularea readuce toate anunțurile deodată. */
export function agencyUndoLabel(l: TriageListing): string {
  return l.agency_mark_root || Number(l.agency_mark_sibling_count ?? 0) > 0
    ? "Nu e agenție — anulează tot grupul"
    : "Nu e agenție — anulează";
}

export interface AgencyMarkResult {
  cancelled_wa?: number;
  cancelled_owner_outreach?: number;
  cancelled_calls?: number;
  siblings_marked?: number;
  siblings_cancelled?: number;
  skipped_private?: number;
  blocklist_added?: boolean;
  already_listed?: boolean;
}

/** Descrierea notificării după „Agenție”: anunțuri blocate pe număr, trimiteri anulate, lista de agenții. */
export function agencyMarkSummary(r: AgencyMarkResult): string {
  const parts: string[] = [];
  const siblings = Number(r.siblings_marked ?? 0);
  if (siblings > 0) parts.push(`Am blocat încă ${anunturi(siblings)} cu același număr.`);
  const cancelled = Number(r.cancelled_wa ?? 0) + Number(r.cancelled_owner_outreach ?? 0)
    + Number(r.cancelled_calls ?? 0) + Number(r.siblings_cancelled ?? 0);
  parts.push(cancelled
    ? `Am anulat ${cancelled} ${cancelled === 1 ? "trimitere programată" : "trimiteri programate"}.`
    : "Nu existau trimiteri programate.");
  const skipped = Number(r.skipped_private ?? 0);
  if (skipped > 0) {
    parts.push(`${skipped === 1 ? "Un anunț confirmat privat" : `${skipped} anunțuri confirmate privat`} cu același număr ${skipped === 1 ? "a rămas neschimbat" : "au rămas neschimbate"}, deci numărul nu a intrat în lista de agenții.`);
  } else if (r.blocklist_added) {
    parts.push("Numărul a intrat în lista de agenții.");
  } else if (r.already_listed) {
    parts.push("Numărul era deja în lista de agenții.");
  }
  return parts.join(" ");
}

export interface PrivateConfirmResult {
  blocklist_removed?: boolean;
  siblings_checked?: number;
  siblings_unblocked?: number;
  reactivated?: boolean;
}

/** Ce a mai schimbat „Confirmă privat”: lista de agenții, reactivarea și anunțurile cu același număr. */
export function privateConfirmSummary(r: PrivateConfirmResult): string {
  const parts: string[] = [];
  if (r.blocklist_removed) parts.push("Numărul a fost scos din lista de agenții.");
  if (r.reactivated) parts.push("Anunțul a redevenit activ.");
  const checked = Number(r.siblings_checked ?? 0);
  const unblocked = Number(r.siblings_unblocked ?? 0);
  if (unblocked > 0) parts.push(`Am deblocat încă ${anunturi(unblocked)} cu același număr.`);
  const still = checked - unblocked;
  if (still > 0) parts.push(`${still === 1 ? "Un anunț" : `${still} anunțuri`} cu același număr ${still === 1 ? "rămâne blocat" : "rămân blocate"} (alte semne de agenție).`);
  return parts.join(" ");
}

/** Motivul exact afișat pe card când „Trimite către Andrei” e blocat. */
export function triageReasonHint(l: TriageListing, reason: string): string {
  switch (reason) {
    case "Neconfirmat": return "Proprietar neconfirmat — apasă „Confirmă privat” sau confirmă-l în „Flux proprietari → Verifică”";
    case "Agenție blocată": if (l.agency_marked_at) return agencyMarkHint(l);
      return hasAgencyTextSignal(l)
      ? "Agenție blocată — titlul, numele sau etichetele conțin cuvinte de agenție"
      : "Marcat ca agenție — confirmă separat doar dacă ai verificat că e proprietar";
    case `Scor ≤ ${OUTREACH_MIN_SCORE}`: return `Confirmat privat, dar scorul este ${Math.round(Number(l.lead_score ?? 0))} — trebuie peste ${OUTREACH_MIN_SCORE} pentru trimitere`;
    case "Procesat": return "Deja în lucru (apel / răspuns înregistrat)";
    case "Telefon invalid": return "Numărul nu e un mobil românesc valid (07…) — nu se trimite pe WhatsApp";
    case "Trimis pe WhatsApp": return "Proprietarul a primit deja mesajul pe WhatsApp";
    case "Trimis la Andrei": return "Deja trimis către Andrei";
    default: return reason;
  }
}

/** Anunțurile reale din Triere: fără paginile de căutare, categoriile, agregatoarele și articolele salvate greșit. */
export const isTriageListing = (l: TriageListing) => !isGenericSearchListing(l);

/**
 * Anunțurile care intră în grupare: niciodată paginile de căutare generice și fără cele
 * indisponibile când sunt ascunse (ca un anunț renunțat să nu ascundă variantele lui de pe alte portaluri).
 */
export function triagePool<T extends TriageListing>(listings: T[], f: TriageFilters): T[] {
  const real = listings.filter(isTriageListing);
  if (f.status === "dismissed" || !f.hideDismissed) return real;
  return real.filter((l) => !isDismissed(l));
}

function matchesBase(l: TriageListing, f: TriageFilters): boolean {
  if (!isTriageListing(l)) return false;
  if (f.status === "dismissed") { if (!isDismissed(l)) return false; }
  else if (f.hideDismissed && isDismissed(l)) return false;
  if (f.status === "active" && l.is_active === false) return false;
  if (f.status === "inactive" && l.is_active !== false) return false;
  if (f.portal !== "all" && portalKey(l) !== f.portal) return false;
  if (f.readyOnly && !isReadyForOutreach(l)) return false;
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

/* ---------- Data colectării, afișată pe fiecare card ---------- */

/** Când a fost adus anunțul: întâi data scrape-uirii, apoi cea de creare, apoi ultima revedere. */
export const collectedAt = (l: TriageListing) => {
  for (const v of [l.scraped_at, l.created_at, l.last_seen_at]) {
    const t = Date.parse(v ?? "");
    if (Number.isFinite(t)) return new Date(t);
  }
  return null;
};

/** „acum”, „acum 12 minute”, „acum 3 ore”, „acum 4 zile”, „acum 2 luni” — în română. */
export const relativeCollectionLabel = (d: Date | null, now = new Date()): string => {
  if (!d) return "fără dată de colectare";
  const secs = Math.max(0, Math.round((now.getTime() - d.getTime()) / 1000));
  if (secs < 60) return "acum";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `acum ${mins} ${mins === 1 ? "minut" : "minute"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `acum ${hours} ${hours === 1 ? "oră" : "ore"}`;
  const days = Math.floor(hours / 24);
  if (days < 31) return `acum ${days} ${days === 1 ? "zi" : "zile"}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `acum ${months} ${months === 1 ? "lună" : "luni"}`;
  const years = Math.floor(months / 12);
  return `acum ${years} ${years === 1 ? "an" : "ani"}`;
};

/** Data și ora complete, în ora României, ex. „25 nov 2026, 22:00:13”. */
export const exactCollectionLabel = (d: Date | null): string =>
  d ? new Intl.DateTimeFormat("ro-RO", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    timeZone: "Europe/Bucharest",
  }).format(d) : "—";

/** Ce afișează cardul: textul relativ, data exactă pentru atingere/hover și marcajul pentru <time>. */
export interface CollectionDisplay {
  relative: string;
  exact: string;
  iso: string | null;
}

export const collectionDisplay = (l: TriageListing, now = new Date()): CollectionDisplay => {
  const d = collectedAt(l);
  return { relative: relativeCollectionLabel(d, now), exact: exactCollectionLabel(d), iso: d ? d.toISOString() : null };
};

export function buildTriageRows<T extends TriageListing>(groups: DuplicateGroup<T>[], f: TriageFilters): TriageRow<T>[] {
  const rows: TriageRow<T>[] = [];
  const ordered = [...groups].sort((a, b) =>
    triagePriority(b.primary) - triagePriority(a.primary) || seenAt(b.primary) - seenAt(a.primary));
  for (const group of ordered) {
    const members = f.hideDuplicates ? [group.primary] : [group.primary, ...group.variants];
    for (const listing of members) {
      if (!matchesBase(listing, f) || !matchesPhoneFilter(listing, f.phone)) continue;
      if (f.phone === "manual" && !needsManualReveal(listing)) continue;
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
  let withPhone = 0, manualReveal = 0, ready = 0, variants = 0, duplicateGroups = 0, listings = 0;
  for (const g of groups) {
    listings += 1 + g.variants.length;
    variants += g.variants.length;
    if (g.variants.length) duplicateGroups++;
    if (phoneAvailability(g.primary) === "available") withPhone++;
    if (needsManualReveal(g.primary)) manualReveal++;
    if (isReadyForOutreach(g.primary)) ready++;
  }
  return { listings, properties: groups.length, duplicateGroups, variants, withPhone, manualReveal, ready };
}

/** Cardurile de cifre din antet, folosite ca filtre rapide. */
export type TriageQuickFilter = "properties" | "withPhone" | "manualReveal" | "ready";

/** Ce card e evidențiat, după filtrele curente. */
export function activeQuickFilter(f: TriageFilters): TriageQuickFilter {
  if (f.readyOnly) return "ready";
  if (f.phone === "available") return "withPhone";
  if (f.phone === "manual") return "manualReveal";
  return "properties";
}

/** Filtrele după apăsarea unui card; apăsarea din nou pe cardul activ revine la toate imobilele. */
export function applyQuickFilter(f: TriageFilters, q: TriageQuickFilter): Partial<TriageFilters> {
  const target = activeQuickFilter(f) === q ? "properties" : q;
  switch (target) {
    case "withPhone": return { phone: "available", readyOnly: false };
    case "manualReveal": return { phone: "manual", readyOnly: false };
    case "ready": return { phone: "all", readyOnly: true };
    default: return { phone: "all", readyOnly: false };
  }
}

/* ---------- Fereastra de 30 de zile pe număr (aceeași regulă ca outreach-dispatch) ---------- */
export const OUTREACH_COOLDOWN_DAYS_UI = 30;
export const RECENT_OUTREACH_REASON = "recent_outreach_30d";
export type OutreachHistoryRow = { id: string; phone_normalized?: string | null; contact_phone?: string | null; outreach_status?: string | null; outreach_status_at?: string | null };
export type OutreachCooldownMap = Map<string, { id: string; at: number }[]>;

const phoneKey = (p?: string | null) => { const d = (p ?? "").replace(/\D/g, ""); return d.length >= 9 ? d.slice(-9) : null; };
const IGNORED_OUTREACH = new Set(["queued", "failed", "skipped"]);

/** Mesajele care contează pentru fereastră: status trimis (nu coadă/eșec/sărit), în ultimele 30 de zile. */
export function buildOutreachCooldownMap(rows: OutreachHistoryRow[], now = Date.now()): OutreachCooldownMap {
  const since = now - OUTREACH_COOLDOWN_DAYS_UI * 86400000;
  const map: OutreachCooldownMap = new Map();
  for (const r of rows) {
    if (!r.outreach_status || IGNORED_OUTREACH.has(r.outreach_status) || !r.outreach_status_at) continue;
    const at = Date.parse(r.outreach_status_at);
    if (!Number.isFinite(at) || at < since) continue;
    for (const k of new Set([phoneKey(r.phone_normalized), phoneKey(r.contact_phone)])) {
      if (!k) continue;
      const list = map.get(k) ?? []; list.push({ id: r.id, at }); map.set(k, list);
    }
  }
  return map;
}

/** Ultimul mesaj trimis altui anunț cu același număr, încă în fereastră → { last, until }, altfel null. */
export function outreachCooldownFor(l: TriageListing & { id: string }, map: OutreachCooldownMap): { last: Date; until: Date } | null {
  let best = 0;
  for (const k of new Set([phoneKey(l.phone_normalized), phoneKey(l.contact_phone)])) {
    for (const e of (k && map.get(k)) || []) if (e.id !== l.id && e.at > best) best = e.at;
  }
  return best ? { last: new Date(best), until: new Date(best + OUTREACH_COOLDOWN_DAYS_UI * 86400000) } : null;
}

const fmtShort = (d: Date) => d.toLocaleDateString("ro-RO", { day: "numeric", month: "short", timeZone: "Europe/Bucharest" }).replace(/\.$/, "");

/** Text clar pentru blocarea de 30 de zile. */
export function outreachCooldownHint(c: { last: Date; until: Date } | null): string {
  if (!c) return "Numărul a primit deja un mesaj în ultimele 30 de zile — următorul e posibil după 30 de zile de la acel mesaj";
  return `Numărul a primit deja un mesaj pe ${fmtShort(c.last)} — următorul e posibil după ${fmtShort(c.until)}`;
}
