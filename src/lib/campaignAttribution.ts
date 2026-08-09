/**
 * Campaign & Outreach Attribution (first-touch)
 * ---------------------------------------------
 * Captures where an owner lead came from so every form submission can be
 * attributed back to a campaign, a WhatsApp outreach link sent by Andrei,
 * or an organic visit.
 *
 * Captured ONCE per session (first touch wins) and stored in sessionStorage.
 * No personal data is stored here — only marketing parameters that were
 * already present in the URL the visitor opened.
 */

const STORAGE_KEY = "campaign_attribution_v1";

export interface CampaignAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  /** Google Ads / Meta Ads click identifiers */
  gclid?: string;
  fbclid?: string;
  /** Short outreach tag we use in WhatsApp/SMS links: ?src=andrei_wa */
  src?: string;
  /** Prospect id when the link was generated from the scraper pipeline */
  prospect_id?: string;
  /** First page the visitor landed on + external referrer */
  landing_path?: string;
  referrer?: string;
  captured_at?: string;
  /** Active A/B variant of the owners-page hero CTA ("A" | "B"). */
  cta_variant?: string;
}


const PARAM_KEYS: Array<keyof CampaignAttribution> = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "gclid",
  "fbclid",
  "src",
  "prospect_id",
];

const clean = (value: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim().slice(0, 120);
  return trimmed.length ? trimmed : undefined;
};

const read = (): CampaignAttribution | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CampaignAttribution) : null;
  } catch {
    return null;
  }
};

/**
 * Capture attribution from the current URL. Safe to call on every route
 * change — the first capture of a session is never overwritten.
 */
export function captureCampaignAttribution(): CampaignAttribution | null {
  if (typeof window === "undefined") return null;

  const existing = read();
  if (existing) return existing;

  try {
    const params = new URLSearchParams(window.location.search);
    const attribution: CampaignAttribution = {};

    for (const key of PARAM_KEYS) {
      const value = clean(params.get(key));
      if (value) attribution[key] = value;
    }

    const referrer = clean(document.referrer);
    const isExternalReferrer =
      referrer && !referrer.includes(window.location.hostname);

    // Nothing worth storing (organic direct visit with no referrer)
    if (!Object.keys(attribution).length && !isExternalReferrer) return null;

    attribution.landing_path = window.location.pathname.slice(0, 200);
    if (isExternalReferrer) attribution.referrer = referrer;
    attribution.captured_at = new Date().toISOString();

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    return null;
  }
}

/** Current session attribution, if any. */
export function getCampaignAttribution(): CampaignAttribution | null {
  return read();
}

/**
 * Merge attribution into a lead's `simulation_data` payload.
 * No-op when the visitor has no campaign/outreach context.
 */
export function withCampaignTracking<
  T extends Record<string, unknown> | null | undefined,
>(simulationData: T): Record<string, unknown> | T {
  const attribution = read() ?? captureCampaignAttribution();
  if (!attribution) return simulationData;
  return {
    ...(simulationData ?? {}),
    attribution,
  };
}

/**
 * Human-readable suffix appended to the lead `source` column so the admin
 * inbox shows the channel at a glance (e.g. `quick_form:google_cpc`).
 */
export function campaignSourceSuffix(): string {
  const a = read();
  if (!a) return "";
  const label = a.src || [a.utm_source, a.utm_medium].filter(Boolean).join("_");
  if (!label) return a.gclid ? "google_ads" : a.fbclid ? "meta_ads" : "";
  return label.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
}
