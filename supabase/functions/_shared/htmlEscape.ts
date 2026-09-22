// Shared HTML escaping helpers for outbound email bodies.
// Any value that originates from user input, scraped content, or database rows
// must pass through escapeHtml() before it is interpolated into email HTML.

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapes a URL for use inside an href attribute; blocks non-http(s) schemes. */
export function escapeUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!/^https?:\/\//i.test(raw)) return "";
  return escapeHtml(raw);
}

/** Neutralizes spreadsheet formula injection for CSV/Excel exports. */
export function csvSafe(value: unknown): string {
  const raw = String(value ?? "");
  return /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
}
