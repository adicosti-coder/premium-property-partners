const EXCLUDED = ['/admin', '/portal-proprietar', '/blog/'];

export function isPhraseRouteExcluded(pathname: string): boolean {
  return EXCLUDED.some((p) => pathname === p.replace(/\/$/, '') || pathname.startsWith(p));
}

/** Returns the English phrase for an exact (whitespace-normalized) match, else null. */
export function translatePhrase(value: string, map: Record<string, string>): string | null {
  const key = value.replace(/\s+/g, ' ').trim();
  if (key.length < 2) return null;
  const hit = map[key];
  if (!hit || hit === key) return null;
  const lead = value.match(/^\s*/)?.[0] ?? '';
  const trail = value.match(/\s*$/)?.[0] ?? '';
  return lead + hit + trail;
}
