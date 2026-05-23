/**
 * Listing sanitizer — premium agency-grade content cleaner.
 *
 * Strips from any scraped listing text:
 *   • phone numbers (Romanian + international)
 *   • email addresses
 *   • exact street addresses (Str./Strada/Bd./Calea + name + number)
 *   • forbidden phrases (proprietar, persoană fizică, fără comision, etc.)
 *
 * Also detects "no-agency" refusal language and tells caller to reject the
 * listing entirely (we never re-publish an ad whose author refuses to work
 * with real-estate agencies).
 *
 * All forbidden/refusal phrases live in DB table `listing_import_config`
 * so admins can tune them without code changes.
 */

export interface ImportConfigRow {
  kind: 'forbidden_phrase' | 'refusal_phrase' | 'replacement_phrase';
  pattern: string;
  replacement: string | null;
  is_regex: boolean;
  enabled: boolean;
}

export interface SanitizeResult {
  sanitized: string;
  removed: {
    phones: string[];
    emails: string[];
    addresses: string[];
    phrases: string[];
  };
  refusalDetected: boolean;
  refusalMatch: string | null;
}

const ROMANIAN_PHONE = /(?:\+?40[\s.\-]?|0)(?:7\d{2}|2\d{2}|3\d{2})[\s.\-]?\d{3}[\s.\-]?\d{3}/g;
const INTL_PHONE = /\+\d{1,3}[\s.\-]?\d{2,4}[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}/g;
const EMAIL = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const STREET_ADDRESS =
  /\b(?:Str\.?|Strada|Bd\.?|Bdul\.?|Bulevardul|Calea|Aleea|Splaiul|Piața|Piata|Intrarea|Șos\.?|Soseaua|Drumul)\s+[A-ZȘȚĂÂÎ][\wșțăâîȘȚĂÂÎ.\-]+(?:\s+[A-ZȘȚĂÂÎa-zșțăâî.\-]+){0,4}(?:\s*(?:nr\.?|no\.?)?\s*\d+[A-Za-z]?(?:\s*[-/]\s*\d+)?)?/gi;

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Detect a refusal phrase in the raw text. Diacritic-insensitive.
 * Returns the FIRST matching phrase or null.
 */
export function detectAgencyRefusal(
  text: string,
  config: ImportConfigRow[],
): { detected: boolean; match: string | null } {
  if (!text) return { detected: false, match: null };
  const haystack = normalize(text);
  const phrases = config.filter((r) => r.kind === 'refusal_phrase' && r.enabled);

  for (const row of phrases) {
    if (row.is_regex) {
      try {
        if (new RegExp(row.pattern, 'i').test(haystack)) {
          return { detected: true, match: row.pattern };
        }
      } catch {
        /* skip bad regex */
      }
    } else {
      const needle = normalize(row.pattern);
      if (needle && haystack.includes(needle)) {
        return { detected: true, match: row.pattern };
      }
    }
  }
  return { detected: false, match: null };
}

/**
 * Sanitize a description / title. Removes PII + forbidden language.
 */
export function sanitizeListingText(
  text: string,
  config: ImportConfigRow[],
): SanitizeResult {
  const removed: SanitizeResult['removed'] = {
    phones: [], emails: [], addresses: [], phrases: [],
  };
  if (!text) {
    return { sanitized: '', removed, refusalDetected: false, refusalMatch: null };
  }

  // 1. Refusal check (read-only — caller decides what to do)
  const refusal = detectAgencyRefusal(text, config);

  let out = text;

  // 2. Phones
  out = out.replace(ROMANIAN_PHONE, (m) => { removed.phones.push(m.trim()); return '[contact prin RealTrust]'; });
  out = out.replace(INTL_PHONE,     (m) => { removed.phones.push(m.trim()); return '[contact prin RealTrust]'; });
  // Strip any naked 9-12 digit sequences left behind
  out = out.replace(/\b\d[\d\s.\-]{7,14}\d\b/g, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length >= 9 && digits.length <= 12) {
      removed.phones.push(m.trim());
      return '[contact prin RealTrust]';
    }
    return m;
  });

  // 3. Emails
  out = out.replace(EMAIL, (m) => { removed.emails.push(m); return '[contact prin RealTrust]'; });

  // 4. Exact addresses
  out = out.replace(STREET_ADDRESS, (m) => {
    // Keep generic "Calea Aradului zona X" type references → only strip when there's a number
    if (/\d/.test(m)) {
      removed.addresses.push(m.trim());
      return 'zonă centrală';
    }
    return m;
  });

  // 5. Forbidden phrases (Unicode-aware word boundary, diacritic-insensitive).
  //    Process longest first so "direct proprietar" matches before "proprietar".
  const forbidden = config
    .filter((r) => r.kind === 'forbidden_phrase' && r.enabled)
    .sort((a, b) => b.pattern.length - a.pattern.length);

  // Work on a parallel diacritic-stripped buffer for matching, but apply
  // replacements on the original string by index.
  for (const row of forbidden) {
    const needle = normalize(row.pattern);
    if (!needle) continue;
    // Allow flexible whitespace between tokens.
    const tokenRegex = needle.split(/\s+/).map(escapeRegex).join('\\s+');
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${tokenRegex}(?![\\p{L}\\p{N}])`, 'giu');

    // Scan diacritic-stripped form for match positions, then translate to
    // the original string. Since NFD-strip preserves index alignment for
    // most Latin chars but combining marks add length, we do a simpler
    // approach: build a NFD-flat lowercase version with index map.
    const flatChars: string[] = [];
    const indexMap: number[] = [];
    const decomposed = out.toLowerCase().normalize('NFD');
    let origIdx = 0;
    let outIdx = 0;
    // Build map from decomposed-index → original index (approx)
    while (origIdx < out.length) {
      const ch = out[origIdx];
      const decomp = ch.toLowerCase().normalize('NFD');
      for (let k = 0; k < decomp.length; k++) {
        if (!/[\u0300-\u036f]/.test(decomp[k])) {
          flatChars.push(decomp[k]);
          indexMap.push(origIdx);
        }
      }
      origIdx++;
      outIdx++;
    }
    const flat = flatChars.join('');

    const matches: { start: number; end: number }[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(flat)) !== null) {
      const startOrig = indexMap[m.index];
      const endOrig = (indexMap[m.index + m[0].length - 1] ?? indexMap[indexMap.length - 1]) + 1;
      matches.push({ start: startOrig, end: endOrig });
      removed.phrases.push(row.pattern);
    }
    // Apply replacements right-to-left
    matches.sort((a, b) => b.start - a.start);
    for (const mt of matches) {
      out = out.slice(0, mt.start) + (row.replacement || '') + out.slice(mt.end);
    }
  }

  // 6. Explicit replacement phrases ("contactați-mă" → "contactați RealTrust")
  const replacements = config.filter((r) => r.kind === 'replacement_phrase' && r.enabled);
  for (const row of replacements) {
    try {
      const re = row.is_regex
        ? new RegExp(row.pattern, 'gi')
        : new RegExp(escapeRegex(row.pattern), 'gi');
      out = out.replace(re, row.replacement || '');
    } catch { /* skip bad */ }
  }

  // 7. Collapse whitespace / empty parens left behind
  out = out
    .replace(/\(\s*\)/g, '')
    .replace(/\[\s*\]/g, '')
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    sanitized: out,
    removed,
    refusalDetected: refusal.detected,
    refusalMatch: refusal.match,
  };
}

/**
 * Load active config rows. Returns a frozen array.
 */
export async function loadImportConfig(supabase: any): Promise<ImportConfigRow[]> {
  const { data, error } = await supabase
    .from('listing_import_config')
    .select('kind, pattern, replacement, is_regex, enabled')
    .eq('enabled', true);
  if (error || !data) return [];
  return data as ImportConfigRow[];
}
