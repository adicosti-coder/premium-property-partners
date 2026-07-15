/**
 * PII masking helpers for the admin UI.
 * Never mutate the original value; return a display-safe string.
 */

export function maskPhone(raw: string | null | undefined): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 4) return "•".repeat(digits.length);
  const prefix = raw.startsWith("+") ? "+" + digits.slice(0, digits.length - 4).slice(0, 3) : digits.slice(0, 2);
  const last4 = digits.slice(-4);
  return `${prefix}${"•".repeat(Math.max(3, digits.length - prefix.replace(/\D/g, "").length - 4))}${last4}`;
}

export function maskEmail(raw: string | null | undefined): string {
  if (!raw) return "—";
  const [user, domain] = raw.split("@");
  if (!domain) return "•".repeat(Math.min(8, raw.length));
  const u = user.length <= 2 ? user[0] + "•" : user[0] + "•".repeat(Math.min(6, user.length - 2)) + user.slice(-1);
  const [dName, ...dRest] = domain.split(".");
  const d = dName.length <= 2 ? "•".repeat(dName.length) : dName[0] + "•".repeat(dName.length - 1);
  return `${u}@${d}${dRest.length ? "." + dRest.join(".") : ""}`;
}

export function maskIP(raw: string | null | undefined): string {
  if (!raw) return "—";
  if (raw.includes(":")) {
    // IPv6
    const parts = raw.split(":");
    return parts.slice(0, 2).join(":") + ":•••:•••";
  }
  const parts = raw.split(".");
  if (parts.length !== 4) return "•••";
  return `${parts[0]}.${parts[1]}.•••.•••`;
}
