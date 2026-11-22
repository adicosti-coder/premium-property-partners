// Follow-up unic după prima deschidere reală a linkului scurt https://realtrust.ro/e/<cod>.
// Fișier pur (fără Deno/rețea): folosit de `estimate-link-open`, de worker-ul cozii WhatsApp,
// de panoul admin și de teste.
//
// Reguli (22 nov 2026):
// - boții de previzualizare (WhatsApp/Facebook/crawlere) nu contează ca deschidere;
// - doar proprietar particular confirmat, fără agenție, scor > 60, fără opt-out și
//   fără niciun răspuns după primul mesaj; primul mesaj trebuie să fi plecat;
// - un singur follow-up per anunț, la 24h după prima deschidere, trimis doar 09:00–19:30
//   (Europe/Bucharest) — altfel la 09:00 dimineața următoare;
// - orice mesaj primit de la proprietar înainte de trimitere anulează follow-up-ul.
import { autoOutreachBlockReason, type OutreachProspect } from "./ownerOutreachEligibility.ts";
import { outreachWindow } from "./ownerOutreachPolicy.ts";
import { estimateShortUrl } from "./estimateShortLink.ts";

export const ESTIMATE_FOLLOWUP_SOURCE = "estimate_followup";
export const ESTIMATE_FOLLOWUP_TEMPLATE = "estimare_deschisa_followup_v1";
export const ESTIMATE_FOLLOWUP_LANGUAGE = "ro";
export const ESTIMATE_FOLLOWUP_DELAY_MS = 24 * 3_600_000;
export const TEAM_PHONE = "0799 069 256";

/** Textul aprobat de Adrian; {{1}} = zona, {{2}} = linkul scurt. Corpul nu se termină în variabilă (cerință Meta). */
export const ESTIMATE_FOLLOWUP_BODY =
  "Bună ziua! Am văzut că ați deschis estimarea pentru proprietatea din {{1}} ({{2}}). " +
  "Cum vi se par cifrele comparativ cu ce obțineți acum? Dacă vreți să vedem rapid cum am ajuns la ele, " +
  `îmi puteți scrie aici sau suna la ${TEAM_PHONE}.`;

export const ESTIMATE_FOLLOWUP_COMPONENTS = [
  {
    type: "BODY",
    text: ESTIMATE_FOLLOWUP_BODY,
    example: { body_text: [["Iosefin", "https://realtrust.ro/e/k7m2qx9a"]] },
  },
];

/** Textul exact al mesajului, așa cum îl vede proprietarul. */
export function estimateFollowupText(zone: string, link: string): string {
  return ESTIMATE_FOLLOWUP_BODY.replace("{{1}}", zone).replace("{{2}}", link);
}

export function estimateFollowupZone(p?: { zone?: string | null; location?: string | null } | null): string {
  const z = String(p?.zone || p?.location || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
  return (z || "Timișoara").slice(0, 60);
}

/** Parametrii șablonului Meta: [zona, link scurt] sau null dacă anunțul nu are cod scurt. */
export function estimateFollowupParams(p: { zone?: string | null; location?: string | null; short_code?: string | null }): [string, string] | null {
  const link = estimateShortUrl(p);
  return link ? [estimateFollowupZone(p), link] : null;
}

// ── Boți de previzualizare / crawlere ─────────────────────────────────────────
const BOT_UA_RE = new RegExp([
  "whatsapp", "facebookexternalhit", "facebookcatalog", "facebot", "meta-externalagent", "meta-externalfetcher",
  "twitterbot", "telegrambot", "slackbot", "slack-imgproxy", "discordbot", "linkedinbot", "skypeuripreview",
  "pinterest", "vkshare", "embedly", "iframely", "redditbot", "applebot", "googlebot", "google-inspectiontool",
  "googleother", "adsbot", "mediapartners-google", "bingbot", "bingpreview", "yandex", "baiduspider",
  "duckduckbot", "petalbot", "semrush", "ahrefs", "mj12bot", "dotbot", "bytespider", "gptbot", "chatgpt-user",
  "oai-searchbot", "claudebot", "perplexitybot", "ccbot", "headlesschrome", "phantomjs", "puppeteer", "playwright",
  "lighthouse", "pagespeed", "gtmetrix", "pingdom", "uptimerobot", "curl/", "wget/", "python-requests",
  "python-urllib", "aiohttp", "node-fetch", "undici", "axios/", "go-http-client", "okhttp", "java/", "libwww",
  "httpclient", "preview", "crawler", "spider", "scraper", "\\bbot\\b", "bot/",
].join("|"), "i");

/** true pentru boții de previzualizare (cardul Open Graph din WhatsApp etc.) și crawlere. */
export function isPreviewBot(userAgent: string | null | undefined): boolean {
  const ua = String(userAgent ?? "").trim();
  if (ua.length < 20) return true; // fără user-agent real = nu e un browser
  if (!/mozilla\/|opera\//i.test(ua)) return true;
  return BOT_UA_RE.test(ua);
}

// ── Programare ───────────────────────────────────────────────────────────────
/** Ora trimiterii: 24h după prima deschidere; în afara 09:00–19:30 → următorul 09:00. */
export function estimateFollowupDueAt(openedAt: Date): Date {
  const target = new Date(openedAt.getTime() + ESTIMATE_FOLLOWUP_DELAY_MS);
  const win = outreachWindow(target);
  if (win.open) return target;
  // outreachWindow dă următorul 09:05; follow-up-ul pleacă de la 09:00.
  return new Date(win.nextSendAt.getTime() - 5 * 60_000);
}

export type EstimateFollowupContext = {
  prospect: (OutreachProspect & {
    do_not_call?: boolean | null;
    is_active?: boolean | null;
    outreach_status?: string | null;
    estimate_followup_status?: string | null;
    short_code?: string | null;
  }) | null;
  /** Numărul a scris vreodată (după primul mesaj) — orice mesaj, inclusiv „DA”. */
  hasInbound: boolean;
  /** STOP / Nu doresc / RETRAG: în lista de excludere sau conversație dezabonată. */
  optedOut: boolean;
};

/** Stările outreach în care primul mesaj a plecat și proprietarul n-a răspuns încă. */
export const FIRST_MESSAGE_SENT = new Set(["outreach_pending", "whatsapp_sent", "whatsapp_delivered", "whatsapp_read"]);

export type EstimateFollowupBlock =
  | "blocked_agency" | "not_private" | "low_score" | "opted_out" | "replied"
  | "no_first_message" | "already_handled" | "inactive" | "no_short_code";

/** De ce nu se programează follow-up-ul, sau null dacă se poate programa. */
export function estimateFollowupBlockReason(ctx: EstimateFollowupContext): EstimateFollowupBlock | null {
  const p = ctx.prospect;
  if (!p) return "inactive";
  const base = autoOutreachBlockReason(p);
  if (base) return base;
  if (ctx.optedOut || p.do_not_call || p.outreach_status === "unsubscribed") return "opted_out";
  if (ctx.hasInbound || p.outreach_status === "replied") return "replied";
  if (p.estimate_followup_status) return "already_handled";
  if (!FIRST_MESSAGE_SENT.has(String(p.outreach_status ?? ""))) return "no_first_message";
  if (p.is_active === false) return "inactive";
  if (!estimateShortUrl(p)) return "no_short_code";
  return null;
}

// ── Afișare în admin ─────────────────────────────────────────────────────────
export type EstimateFollowupRow = {
  estimate_opened_at?: string | null;
  estimate_followup_status?: string | null;
  estimate_followup_at?: string | null;
  estimate_followup_note?: string | null;
};

export type EstimateFollowupBadge = { key: string; label: string; at: string | null; tone: "neutral" | "info" | "success" | "muted" | "warning" };

const fmt = (iso: string | null | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
};

/** Etichetele din „Flux proprietari”: Link deschis, Follow-up programat / trimis / Anulat – a răspuns. */
export function estimateFollowupBadges(r: EstimateFollowupRow): EstimateFollowupBadge[] {
  const out: EstimateFollowupBadge[] = [];
  if (!r.estimate_opened_at) return out;
  out.push({ key: "opened", label: "Link deschis", at: fmt(r.estimate_opened_at), tone: "info" });
  const s = r.estimate_followup_status ?? "";
  if (s === "scheduled") {
    out.push({ key: "scheduled", label: "Follow-up programat", at: fmt(r.estimate_followup_at), tone: "neutral" });
    if (r.estimate_followup_note) out.push({ key: "note", label: r.estimate_followup_note, at: null, tone: "warning" });
  } else if (s === "sent") out.push({ key: "sent", label: "Follow-up trimis", at: fmt(r.estimate_followup_at), tone: "success" });
  else if (s === "cancelled_replied") out.push({ key: "cancelled", label: "Anulat – a răspuns", at: fmt(r.estimate_followup_at), tone: "muted" });
  else if (s === "cancelled") out.push({ key: "cancelled", label: `Anulat${r.estimate_followup_note ? ` – ${r.estimate_followup_note}` : ""}`, at: fmt(r.estimate_followup_at), tone: "muted" });
  else if (s.startsWith("skipped")) out.push({ key: "skipped", label: `Fără follow-up${r.estimate_followup_note ? ` – ${r.estimate_followup_note}` : ""}`, at: null, tone: "muted" });
  return out;
}

export const ESTIMATE_FOLLOWUP_BLOCK_LABELS: Record<EstimateFollowupBlock, string> = {
  blocked_agency: "agenție blocată",
  not_private: "proprietar neconfirmat",
  low_score: "scor ≤ 60",
  opted_out: "a cerut să nu fie contactat",
  replied: "a răspuns deja",
  no_first_message: "primul mesaj nu a plecat",
  already_handled: "deja programat",
  inactive: "anunț inactiv",
  no_short_code: "fără link scurt",
};
