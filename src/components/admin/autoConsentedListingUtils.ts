export function consentPhone(value: string): string {
  let digits = String(value || "").replace(/\D/g, "").replace(/^00/, "");
  if (/^0[237]\d{8}$/.test(digits)) digits = `40${digits.slice(1)}`;
  else if (/^[237]\d{8}$/.test(digits)) digits = `40${digits}`;
  return digits ? `+${digits}` : "";
}

export function consentPhoneVariants(value: string): string[] {
  const normalized = consentPhone(value);
  if (!normalized) return [];
  const digits = normalized.slice(1);
  return [...new Set([value, normalized, digits, `00${digits}`, ...(digits.startsWith("40") ? [`0${digits.slice(2)}`, digits.slice(2)] : [])])];
}

export function consentDate(value: string | null): string {
  if (!value || Number.isNaN(new Date(value).getTime())) return "—";
  const parts = new Intl.DateTimeFormat("ro-RO", {
    timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (key: string) => parts.find((p) => p.type === key)?.value ?? "";
  return `${part("day")}.${part("month")}.${part("year")} ${part("hour")}:${part("minute")}`;
}

export function originalListingUrl(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (["https:", "http:"].includes(url.protocol)) return url.href;
    } catch { /* Try the next stored source. */ }
  }
  return null;
}

export function listingSource(platform: string | null | undefined, url: string | null): string {
  const domain = url ? new URL(url).hostname.replace(/^www\./, "") : "";
  const key = `${platform || ""} ${domain}`.toLowerCase();
  if (key.includes("olx")) return "OLX";
  if (key.includes("publi24")) return "Publi24";
  if (key.includes("storia")) return "Storia";
  return platform?.trim() || domain || "Sursă necunoscută";
}

export function matchesConsentSearch(row: { ownerName: string | null; phone_normalized: string; details: string }, query: string): boolean {
  const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const text = normalize(query.trim());
  if (!text) return true;
  const phoneQuery = query.replace(/\D/g, "");
  const phoneOnly = /^[+\d\s().-]+$/.test(query.trim()) && phoneQuery.length > 0;
  return normalize(`${row.ownerName || ""} ${row.details}`).includes(text)
    || (phoneOnly && consentPhone(row.phone_normalized).replace(/\D/g, "").includes(phoneQuery.replace(/^00/, "").replace(/^0/, "")));
}