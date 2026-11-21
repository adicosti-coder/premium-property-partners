/**
 * Guest guide access window — decides which access secrets a guest link may reveal.
 *
 * Rules (dates are compared in Europe/Bucharest, where the apartments are):
 *  - Keybox PIN and Wi-Fi password: only from the check-in day to the check-out day.
 *  - Access instructions, access video and parking instructions: from the day before
 *    check-in (so guests can plan the arrival) to the check-out day.
 *  - Before that window, after check-out, or when stay dates are missing: no secrets.
 *  - Administrators previewing a guide always see everything.
 */

export type GuestGuideAccessState = "upcoming" | "arrival_soon" | "active" | "ended" | "unknown";

export interface GuestGuideAccess {
  state: GuestGuideAccessState;
  pin: boolean;
  wifiPassword: boolean;
  instructions: boolean;
}

export const SECRET_FIELDS = [
  "pin_code",
  "wifi_password",
  "access_instructions",
  "access_video_url",
  "parking_instructions",
] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Calendar date (YYYY-MM-DD) in Bucharest for the given instant. */
export function bucharestDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function guestGuideAccess(
  guide: { check_in_date?: string | null; check_out_date?: string | null },
  now: Date,
  isAdmin = false,
): GuestGuideAccess {
  const checkIn = guide.check_in_date ?? "";
  const checkOut = guide.check_out_date ?? "";
  const today = bucharestDate(now);

  let state: GuestGuideAccessState;
  if (!DATE_RE.test(checkIn) || !DATE_RE.test(checkOut) || checkOut < checkIn) state = "unknown";
  else if (today > checkOut) state = "ended";
  else if (today >= checkIn) state = "active";
  else if (today >= shiftDate(checkIn, -1)) state = "arrival_soon";
  else state = "upcoming";

  if (isAdmin) return { state, pin: true, wifiPassword: true, instructions: true };
  return {
    state,
    pin: state === "active",
    wifiPassword: state === "active",
    instructions: state === "active" || state === "arrival_soon",
  };
}

/** Removes every secret the access window does not allow and reports which ones exist. */
export function redactGuestGuide<T extends Record<string, unknown>>(guide: T, access: GuestGuideAccess) {
  const has = (k: string) => typeof guide[k] === "string" && (guide[k] as string).trim() !== "";
  return {
    ...guide,
    pin_code: access.pin ? guide.pin_code ?? null : null,
    wifi_password: access.wifiPassword ? guide.wifi_password ?? null : null,
    access_instructions: access.instructions ? guide.access_instructions ?? null : null,
    access_video_url: access.instructions ? guide.access_video_url ?? null : null,
    parking_instructions: access.instructions ? guide.parking_instructions ?? null : null,
    access: {
      state: access.state,
      has_pin: has("pin_code"),
      has_wifi_password: has("wifi_password"),
      has_instructions: has("access_instructions") || has("access_video_url") || has("parking_instructions"),
    },
  };
}
