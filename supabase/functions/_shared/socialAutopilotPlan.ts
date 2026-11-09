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

/** Only clean feed photo drafts with real images and still-live content go out automatically. */
export function isAutopilotEligible(d: DraftRow, ctx: EligibilityContext): boolean {
  if (!d.title?.trim()) return false;
  if (d.last_error) return false;
  if (d.media_type === "STORY" || d.media_type === "REELS" || d.video_url) return false;
  if ((d.caption ?? "").trim().length < ctx.minCaption) return false;
  if (!d.image_url && !(d.image_urls?.length)) return false;
  if (d.type === "property") return !!d.property_id && ctx.activePropertyIds.has(d.property_id);
  if (d.type === "blog") {
    const slug = (d.source_url ?? "").match(/\/blog\/([^/?#]+)/)?.[1];
    return !!slug && ctx.publishedBlogSlugs.has(slug);
  }
  return false;
}

/** Oldest first, alternating properties and articles for variety. */
export function orderDrafts(drafts: DraftRow[]): DraftRow[] {
  const byAge = (a: DraftRow, b: DraftRow) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id);
  const props = drafts.filter((d) => d.type === "property").sort(byAge);
  const blogs = drafts.filter((d) => d.type !== "property").sort(byAge);
  const out: DraftRow[] = [];
  while (props.length || blogs.length) {
    if (props.length) out.push(props.shift()!);
    if (blogs.length) out.push(blogs.shift()!);
  }
  return out;
}

/** A slot is taken when any feed post is already scheduled within 60 minutes of it. */
export function freeSlots(slots: Date[], scheduled: Date[]): Date[] {
  return slots.filter((s) => !scheduled.some((t) => Math.abs(t.getTime() - s.getTime()) < 60 * 60_000));
}

export function planSchedule(slots: Date[], scheduled: Date[], drafts: DraftRow[]): { id: string; at: Date }[] {
  const free = freeSlots(slots, scheduled);
  return orderDrafts(drafts).slice(0, free.length).map((d, i) => ({ id: d.id, at: free[i] }));
}

/** Auto-extracted drafts open with their real title so the caption headline is meaningful. */
export function withTitleLine(title: string, caption: string): string {
  const t = title.trim();
  const c = caption.trim();
  if (!t || c.toLocaleLowerCase("ro").startsWith(t.toLocaleLowerCase("ro"))) return c;
  return `${t}\n\n${c}`;
}
