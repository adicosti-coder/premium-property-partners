// Shared by the SEO auditor (edge function) and the admin SEO panels.
// Legacy paths that the app only redirects client-side: the static server
// answers them with the homepage shell, so auditing them measures the wrong
// page. Audits always target the canonical destination instead.
export const SEO_LEGACY_ALIASES: Readonly<Record<string, string>> = {
  "/calculator-roi": "/calculator-randament",
  "/pentru-oaspeti": "/cazare",
  "/guests": "/cazare",
  "/apartamente": "/anunturi",
  "/faq": "/intrebari-frecvente",
  "/proprietari": "/pentru-proprietari",
  "/complexe": "/ansambluri-rezidentiale",
  "/analiza-proprietate": "/hostscan-ai",
  "/imobiliare-timisoara": "/cartiere",
  "/servicii-imobiliare-timisoara": "/servicii-imobiliare",
  "/contact-locatie": "/contact",
  "/proprietati": "/imobiliare",
};

export const SEO_AUDIT_HOSTS = ["realtrust.ro", "www.realtrust.ro"] as const;

export function normalizeAuditPath(input: string): string {
  let path = input || "/";
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch { /* keep raw */ }
  path = path.split(/[?#]/)[0].replace(/\/{2,}/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

export function isLegacyAuditPath(input: string): boolean {
  return Object.prototype.hasOwnProperty.call(SEO_LEGACY_ALIASES, normalizeAuditPath(input));
}

export function canonicalAuditPath(input: string): string {
  const path = normalizeAuditPath(input);
  return SEO_LEGACY_ALIASES[path] ?? path;
}

/** Same host and query as the request, legacy path swapped for its canonical. */
export function canonicalAuditUrl(url: string): string {
  try {
    const u = new URL(url);
    const target = canonicalAuditPath(u.pathname);
    if (target === normalizeAuditPath(u.pathname)) return url;
    u.pathname = target;
    return u.toString();
  } catch {
    return url;
  }
}

/** Every stored URL form an audit for this path may have (apex/www, with/without slash). */
export function auditUrlVariants(input: string): string[] {
  const path = canonicalAuditPath(input);
  const out: string[] = [];
  for (const host of SEO_AUDIT_HOSTS) {
    out.push(`https://${host}${path}`);
    if (path === "/") out.push(`https://${host}`);
  }
  return out;
}
