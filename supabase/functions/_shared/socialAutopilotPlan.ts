// Social autopilot: pure planning rules (tested). Decides which drafts fill which
// free feed slots; never touches Stories/Reels, failed drafts or inactive content.
export const TZ = "Europe/Bucharest";

export interface AutopilotConfig {
  days_ahead: number;
  slots: string[]; // "HH:MM", ora României
  min_caption: number;
}
export const DEFAULT_AUTOPILOT: AutopilotConfig = { days_ahead: 7, slots: ["10:00", "18:00"], min_caption: 80 };

export function autopilotConfig(raw: Record<string, unknown> | null | undefined): AutopilotConfig {
  const days = Number(raw?.days_ahead);
  const slots = Array.isArray(raw?.slots)
    ? (raw!.slots as unknown[]).filter((s): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s))
      .filter((s) => { const h = Number(s.slice(0, 2)); return h >= 9 && h < 21; })
    : [];
  return {
    days_ahead: Number.isFinite(days) && days >= 1 ? Math.min(14, Math.floor(days)) : DEFAULT_AUTOPILOT.days_ahead,
    slots: slots.length ? [...new Set(slots)].sort().slice(0, 6) : DEFAULT_AUTOPILOT.slots,
    min_caption: DEFAULT_AUTOPILOT.min_caption,
  };
}

function tzOffsetMs(at: number): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(new Date(at)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - at;
}

/** UTC instant for a Bucharest wall-clock time (DST-safe). */
export function bucharestTime(y: number, m: number, d: number, hh: number, mm: number): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let at = guess - tzOffsetMs(guess);
  at = guess - tzOffsetMs(at);
  return new Date(at);
}

/** Feed slots from now (+30 min lead) until `days_ahead` local days ahead. */
export function upcomingSlots(now: Date, cfg: AutopilotConfig): Date[] {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now).map((x) => [x.type, x.value]));
  const out: Date[] = [];
  for (let i = 0; i < cfg.days_ahead; i++) {
    const day = new Date(Date.UTC(+p.year, +p.month - 1, +p.day + i));
    for (const s of cfg.slots) {
      const at = bucharestTime(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), +s.slice(0, 2), +s.slice(3));
      if (at.getTime() > now.getTime() + 30 * 60_000) out.push(at);
    }
  }
  return out;
}

export interface DraftRow {
  id: string;
  type: string;
  title: string | null;
  caption: string | null;
  media_type: string | null;
  video_url?: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  property_id: string | null;
  source_url: string | null;
  last_error: string | null;
  created_at: string;
}

export interface EligibilityContext { activePropertyIds: Set<string>; publishedBlogSlugs: Set<string>; minCaption: number }

// ── „Necesită corectare manuală” ─────────────────────────────────────────────
// Ciornele care nu pot pleca automat primesc acest marcaj în `last_error`, rămân
// în afara programării automate și apar în Social Engine cu motivul exact.
export const MANUAL_FIX_PREFIX = "Necesită corectare manuală: ";
const PRIOR_FAILURE = "eroare anterioară";

/** Image URLs a feed draft needs (cover first, then carousel), deduplicated. */
export function draftMediaUrls(d: Pick<DraftRow, "image_url" | "image_urls">): string[] {
  return [...new Set([d.image_url, ...(d.image_urls ?? [])].filter((u): u is string => typeof u === "string" && /^https:\/\//.test(u.trim())).map((u) => u.trim()))];
}

/** Content problems that only a person can fix; null = media and format are fine. */
export function manualFixReason(d: DraftRow): string | null {
  if (d.media_type === "STORY" || d.media_type === "REELS" || d.video_url) {
    return "format Story/Reel nesuportat de autopilot — se programează manual după verificare";
  }
  if (!d.title?.trim()) return "lipsește titlul";
  const media = draftMediaUrls(d);
  if (!media.length) return "lipsesc imaginile obligatorii";
  if (d.media_type === "CAROUSEL" && media.length < 2) return "caruselul are nevoie de cel puțin 2 imagini";
  return null;
}

export const isManualFixFlag = (err: string | null | undefined): err is string => !!err && err.startsWith(MANUAL_FIX_PREFIX);

/**
 * New `last_error` for a draft, or `undefined` when nothing changes.
 * Drafts that already carried another error stay flagged until a person fixes and republishes;
 * content-only flags clear themselves once the draft is fixed.
 */
export function manualFixUpdate(d: DraftRow, mediaProblem?: string | null): string | null | undefined {
  const reason = mediaProblem ?? manualFixReason(d);
  const err = d.last_error?.trim() || null;
  if (!err) return reason ? `${MANUAL_FIX_PREFIX}${reason}` : undefined;
  if (isManualFixFlag(err)) {
    if (err.includes(PRIOR_FAILURE)) return undefined;
    const next = reason ? `${MANUAL_FIX_PREFIX}${reason}` : null;
    return next === err ? undefined : next;
  }
  const prior = `${PRIOR_FAILURE}: ${err}`.slice(0, 400);
  return `${MANUAL_FIX_PREFIX}${reason ? `${reason} (${prior})` : prior}`;
}

/** Only clean feed photo drafts with real images and still-live content go out automatically. */
export function isAutopilotEligible(d: DraftRow, ctx: EligibilityContext): boolean {
  if (d.last_error) return false;
  if (manualFixReason(d)) return false;
  if ((d.caption ?? "").trim().length < ctx.minCaption) return false;
  if (d.type === "property") return !!d.property_id && ctx.activePropertyIds.has(d.property_id);
  if (d.type === "blog") {
    const slug = (d.source_url ?? "").match(/\/blog\/([^/?#]+)/)?.[1];
    return !!slug && ctx.publishedBlogSlugs.has(slug);
  }
  return false;
}

/** Oldest first, alternating properties and articles; `after` = type of the last post already in the calendar. */
export function orderDrafts(drafts: DraftRow[], after?: string | null): DraftRow[] {
  const byAge = (a: DraftRow, b: DraftRow) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
  const props = drafts.filter((d) => d.type === "property").sort(byAge);
  const blogs = drafts.filter((d) => d.type !== "property").sort(byAge);
  const out: DraftRow[] = [];
  let wantProperty = after !== "property";
  while (props.length || blogs.length) {
    const from = (wantProperty && props.length) || !blogs.length ? props : blogs;
    out.push(from.shift()!);
    wantProperty = from !== props;
  }
  return out;
}

/** A slot is taken when any feed post is already scheduled within 60 minutes of it. */
export function freeSlots(slots: Date[], scheduled: Date[]): Date[] {
  return slots.filter((s) => !scheduled.some((t) => Math.abs(t.getTime() - s.getTime()) < 60 * 60_000));
}

/**
 * Walks every slot in time order and keeps the property/article rotation across posts
 * already in the calendar: each free slot gets the opposite type of the previous post
 * (oldest draft first), falling back to the other type only when one runs out.
 */
export function planSchedule(
  slots: Date[], scheduled: Array<Date | { at: Date; type?: string | null }>, drafts: DraftRow[], after?: string | null,
): { id: string; at: Date }[] {
  const taken = scheduled.map((s) => (s instanceof Date ? { at: s, type: null } : { at: s.at, type: s.type ?? null }));
  const byAge = (a: DraftRow, b: DraftRow) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
  const props = drafts.filter((d) => d.type === "property").sort(byAge);
  const blogs = drafts.filter((d) => d.type !== "property").sort(byAge);
  const kind = (t: string | null | undefined) => (t == null ? null : t === "property" ? "property" : "blog");
  let prev = kind(after);
  const out: { id: string; at: Date }[] = [];
  for (const slot of [...slots].sort((a, b) => a.getTime() - b.getTime())) {
    const occupant = taken.find((t) => Math.abs(t.at.getTime() - slot.getTime()) < 60 * 60_000);
    if (occupant) { prev = kind(occupant.type) ?? prev; continue; }
    const pick = prev === "property" ? (blogs.shift() ?? props.shift()) : (props.shift() ?? blogs.shift());
    if (!pick) break;
    out.push({ id: pick.id, at: slot });
    prev = kind(pick.type);
  }
  return out;
}

/** How many property and article drafts the free slots need to keep a strict rotation. */
export function rotationNeeds(
  slots: Date[], scheduled: Array<{ at: Date; type?: string | null }>, after?: string | null,
): { property: number; blog: number } {
  const need = { property: 0, blog: 0 };
  let prev: string | null = after == null ? null : after === "property" ? "property" : "blog";
  for (const slot of [...slots].sort((a, b) => a.getTime() - b.getTime())) {
    const occupant = scheduled.find((t) => Math.abs(t.at.getTime() - slot.getTime()) < 60 * 60_000);
    if (occupant) { prev = occupant.type == null ? prev : occupant.type === "property" ? "property" : "blog"; continue; }
    prev = prev === "property" ? "blog" : "property";
    need[prev as "property" | "blog"]++;
  }
  return need;
}

/** Auto-extracted drafts open with their real title so the caption headline is meaningful. */
export function withTitleLine(title: string, caption: string): string {
  const t = title.trim();
  const c = caption.trim();
  if (!t || c.toLocaleLowerCase("ro").startsWith(t.toLocaleLowerCase("ro"))) return c;
  return `${t}\n\n${c}`;
}
