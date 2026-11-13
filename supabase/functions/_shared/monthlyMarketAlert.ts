// Logica pură pentru „Alerta lunară de piață” (calculator → Make.com).
// Fără importuri Deno: e testată și din vitest (src/lib/monthlyMarketAlert.test.ts).

/** Etichetele zonelor din calculator → cheia din `timisoara_market_indices` (paritate testată cu UNIFIED_ZONES). */
export const MARKET_ALERT_ZONES: Record<string, string> = {
  monarch: "Monarch",
  nordone: "NordOne",
  xcity: "XCity Towers",
  "city-of-mara": "City of Mara",
  vivalia: "Vivalia",
  paltim: "Paltim",
  "ring-residence": "Ring Residence",
  "denya-forest": "Denya Forest",
  fructus: "Fructus Plaza",
  ateneo: "Ateneo",
  "future-residence": "Future Residence",
  alenia: "Alenia",
  central: "Central / Iosefin / Elisabetin",
  torontalului: "Calea Torontalului",
  "complex-studentesc": "Complex Studențesc",
  "alta-zona": "Altă zonă Timișoara / Giroc / Dumbrăvița",
};

export type ExclusionReason =
  | "dezabonat"
  | "arhivat"
  | "fara_contact"
  | "zona_fara_indice"
  | "lista_dnc"
  | "email_blocat"
  | "duplicat_contact";

export interface AlertLead {
  id: string;
  name: string | null;
  email: string | null;
  property_type: string | null;
  created_at: string;
  archived_at?: string | null;
  anonymized_at?: string | null;
  simulation_data: Record<string, unknown> | null;
  /** Telefon deja normalizat (407XXXXXXXX) sau null. */
  phone: string | null;
}

export interface MarketIndexRow {
  zone_key: string;
  rooms: number;
  sale_eur_sqm: number | string | null;
  rent_eur_month: number | string | null;
  nightly_rate_eur?: number | string | null;
  hotel_occupancy?: number | string | null;
  hotel_net_min_eur_month?: number | string | null;
  hotel_net_max_eur_month?: number | string | null;
  hotel_source?: string | null;
  source: string | null;
  source_url: string | null;
  period_month: string;
}

export interface AlertSubscriber {
  lead: AlertLead;
  zoneKey: string;
  zoneLabel: string;
  rooms: number | null;
  contactKey: string;
}

export interface AlertValues {
  Luna: string;
  Vanzare_EUR_mp: number | null;
  Chirie_Clasica_EUR_luna: number | null;
  /** Regim hotelier (grila calculatorului); lipsesc în alertele trimise înainte de noiembrie 2026. */
  Tarif_Hotelier_EUR_noapte?: number | null;
  Ocupare_Hotelier_Procent?: number | null;
  Venit_Net_Hotelier_EUR_luna_Min?: number | null;
  Venit_Net_Hotelier_EUR_luna_Max?: number | null;
}

/** Prima zi a lunii curente în Europe/Bucharest, format YYYY-MM-01. */
export function alertPeriodMonth(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit" }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}-01`;
}

export function isOptedIn(sd: Record<string, unknown> | null | undefined): boolean {
  return sd?.market_alert_opt_in === true;
}

export function isUnsubscribed(sd: Record<string, unknown> | null | undefined): boolean {
  return typeof sd?.market_alert_unsubscribed_at === "string" && sd.market_alert_unsubscribed_at.length > 0;
}

/** Cheia zonei: întâi cheia salvată, apoi eticheta exactă; zonele regionale nu au indice. */
export function resolveAlertZoneKey(sd: Record<string, unknown> | null | undefined): string | null {
  if (!sd || sd.location_mode === "regional") return null;
  const key = typeof sd.market_alert_zone_key === "string" ? sd.market_alert_zone_key : null;
  if (key && key in MARKET_ALERT_ZONES) return key;
  const label = String(sd.market_alert_zone ?? sd.zone ?? "").trim().toLowerCase();
  if (!label) return null;
  return Object.entries(MARKET_ALERT_ZONES).find(([, l]) => l.toLowerCase() === label)?.[0] ?? null;
}

export function alertRoomsForType(type: unknown): number | null {
  return type === "garsoniera" ? 1 : type === "2-camere" ? 2 : type === "3-camere" ? 3 : null;
}

export function alertContactKey(phone: string | null, email: string | null): string | null {
  if (phone) return `tel:${phone}`;
  const e = (email ?? "").trim().toLowerCase();
  return e ? `email:${e}` : null;
}

/**
 * Abonații eligibili: acord bifat, nedezabonați, cu contact, cu indice pentru zonă,
 * nu în DNC / e-mail blocat; un singur rând per contact (cererea cea mai nouă).
 */
export function selectAlertSubscribers(
  leads: AlertLead[],
  opts: { indexedZones: Set<string>; dncPhones: Set<string>; blockedEmails: Set<string> },
): { eligible: AlertSubscriber[]; excluded: Array<{ lead_id: string; reason: ExclusionReason }> } {
  const sorted = [...leads].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const eligible: AlertSubscriber[] = [];
  const excluded: Array<{ lead_id: string; reason: ExclusionReason }> = [];
  const seen = new Set<string>();
  const unsubscribedContacts = new Set<string>();
  // O dezabonare pe orice cerere a aceluiași contact oprește alerta pentru toate cererile lui.
  for (const l of sorted) {
    const k = alertContactKey(l.phone, l.email);
    if (k && isOptedIn(l.simulation_data) && isUnsubscribed(l.simulation_data)) unsubscribedContacts.add(k);
  }
  for (const l of sorted) {
    const sd = l.simulation_data;
    if (!isOptedIn(sd)) continue;
    const contactKey = alertContactKey(l.phone, l.email);
    const reason: ExclusionReason | null =
      isUnsubscribed(sd) || (contactKey && unsubscribedContacts.has(contactKey)) ? "dezabonat"
      : l.archived_at || l.anonymized_at ? "arhivat"
      : !contactKey ? "fara_contact"
      : l.phone && opts.dncPhones.has(l.phone) ? "lista_dnc"
      : !l.phone && l.email && opts.blockedEmails.has(l.email.trim().toLowerCase()) ? "email_blocat"
      : seen.has(contactKey) ? "duplicat_contact"
      : null;
    if (reason) { excluded.push({ lead_id: l.id, reason }); continue; }
    const zoneKey = resolveAlertZoneKey(sd);
    if (!zoneKey || !opts.indexedZones.has(zoneKey)) { excluded.push({ lead_id: l.id, reason: "zona_fara_indice" }); continue; }
    seen.add(contactKey!);
    eligible.push({
      lead: l,
      zoneKey,
      zoneLabel: MARKET_ALERT_ZONES[zoneKey],
      rooms: alertRoomsForType(sd?.property_type ?? l.property_type),
      contactKey: contactKey!,
    });
  }
  return { eligible, excluded };
}

const n = (v: unknown): number | null => {
  const x = typeof v === "string" ? Number(v) : v;
  return typeof x === "number" && Number.isFinite(x) ? x : null;
};

/** Rândul indicelui: același număr de camere, altfel rândul general (rooms = 0). */
export function pickMarketIndex(rows: MarketIndexRow[], zoneKey: string, rooms: number | null): MarketIndexRow | null {
  const forZone = rows.filter((r) => r.zone_key === zoneKey);
  return (rooms != null ? forZone.find((r) => Number(r.rooms) === rooms) : undefined) ?? forZone.find((r) => Number(r.rooms) === 0) ?? null;
}

export function indexValues(row: MarketIndexRow): AlertValues {
  return {
    Luna: String(row.period_month).slice(0, 7),
    Vanzare_EUR_mp: n(row.sale_eur_sqm) != null ? Math.round(n(row.sale_eur_sqm)!) : null,
    Chirie_Clasica_EUR_luna: n(row.rent_eur_month) != null ? Math.round(n(row.rent_eur_month)!) : null,
    Tarif_Hotelier_EUR_noapte: round(row.nightly_rate_eur),
    Ocupare_Hotelier_Procent: n(row.hotel_occupancy) != null ? Math.round(n(row.hotel_occupancy)! * 100) : null,
    Venit_Net_Hotelier_EUR_luna_Min: round(row.hotel_net_min_eur_month),
    Venit_Net_Hotelier_EUR_luna_Max: round(row.hotel_net_max_eur_month),
  };
}

const round = (v: unknown): number | null => (n(v) != null ? Math.round(n(v)!) : null);

/** Valorile vechi din payload-ul trimis luna trecută (câmpurile hoteliere pot lipsi la alertele vechi). */
export function previousValuesFromPayload(v: Record<string, unknown> | null | undefined): AlertValues | null {
  if (!v || typeof v.Luna !== "string") return null;
  return {
    Luna: v.Luna,
    Vanzare_EUR_mp: n(v.Vanzare_EUR_mp),
    Chirie_Clasica_EUR_luna: n(v.Chirie_Clasica_EUR_luna),
    Tarif_Hotelier_EUR_noapte: n(v.Tarif_Hotelier_EUR_noapte),
    Ocupare_Hotelier_Procent: n(v.Ocupare_Hotelier_Procent),
    Venit_Net_Hotelier_EUR_luna_Min: n(v.Venit_Net_Hotelier_EUR_luna_Min),
    Venit_Net_Hotelier_EUR_luna_Max: n(v.Venit_Net_Hotelier_EUR_luna_Max),
  };
}

/** Zona are indice dacă are măcar o valoare (vânzare, chirie sau regim hotelier). */
export function rowHasIndexValues(r: MarketIndexRow): boolean {
  return [r.sale_eur_sqm, r.rent_eur_month, r.nightly_rate_eur, r.hotel_net_min_eur_month].some((v) => n(v) != null);
}

export function pctChange(oldV: number | null | undefined, newV: number | null | undefined): number | null {
  if (oldV == null || newV == null || oldV <= 0) return null;
  return Math.round(((newV - oldV) / oldV) * 1000) / 10;
}

export function buildMonthlyAlertPayload(input: {
  sub: AlertSubscriber;
  current: MarketIndexRow;
  previous: AlertValues | null;
  periodMonth: string;
}) {
  const { sub, current, previous, periodMonth } = input;
  const sd = sub.lead.simulation_data ?? {};
  const cur = indexValues(current);
  return {
    event: "monthly_market_alert",
    Luna_Alertei: periodMonth.slice(0, 7),
    Lead_ID: sub.lead.id,
    Nume: (sub.lead.name ?? "").trim() || null,
    Contact: {
      Telefon: sub.lead.phone,
      Email: (sub.lead.email ?? "").trim().toLowerCase() || null,
    },
    Cartier: { Nume: sub.zoneLabel, Cheie: sub.zoneKey },
    Tip_Proprietate: (sd.property_type_label as string) ?? sub.lead.property_type ?? null,
    Suprafata_mp: n(sd.surface_sqm),
    Prima_Alerta: previous == null,
    Valori_Vechi: previous,
    Valori_Curente_Luna_Asta: {
      ...cur,
      Sursa: current.source ?? null,
      Sursa_URL: current.source_url ?? null,
      Sursa_Hotelier: current.hotel_source ?? null,
    },
    Variatie_Procente: {
      Vanzare_EUR_mp: pctChange(previous?.Vanzare_EUR_mp, cur.Vanzare_EUR_mp),
      Chirie_Clasica_EUR_luna: pctChange(previous?.Chirie_Clasica_EUR_luna, cur.Chirie_Clasica_EUR_luna),
      Tarif_Hotelier_EUR_noapte: pctChange(previous?.Tarif_Hotelier_EUR_noapte, cur.Tarif_Hotelier_EUR_noapte),
      Venit_Net_Hotelier_EUR_luna_Min: pctChange(previous?.Venit_Net_Hotelier_EUR_luna_Min, cur.Venit_Net_Hotelier_EUR_luna_Min),
      Venit_Net_Hotelier_EUR_luna_Max: pctChange(previous?.Venit_Net_Hotelier_EUR_luna_Max, cur.Venit_Net_Hotelier_EUR_luna_Max),
    },
    Estimare_La_Abonare: {
      Data: (sd.market_alert_consent_at as string) ?? sub.lead.created_at,
      Vanzare_EUR_mp: n(sd.sale_eur_sqm),
      Valoare_Vanzare_EUR: n(sd.sale_value_mid),
      Chirie_Clasica_EUR_luna: n(sd.classic_rent),
      Tarif_Noapte_EUR: n(sd.nightly_rate),
      Venit_Net_Hotelier_EUR_luna: n(sd.realtrust_net),
    },
    Acord_Alerta_Din: (sd.market_alert_consent_at as string) ?? null,
  };
}

export type MonthlyAlertPayload = ReturnType<typeof buildMonthlyAlertPayload>;
