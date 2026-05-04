// Shared phonetic lexicon helper for Voice Agent (Andrei).
// Loads active entries from `voice_pronunciation_lexicon` and applies
// case-aware whole-word replacements BEFORE TTS so RO names sound natural.

let cache: { rows: LexiconRow[]; loadedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 1 min — fast enough for live edits

interface LexiconRow {
  original: string;
  phonetic: string;
  case_sensitive: boolean;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function loadLexicon(supabase: any): Promise<LexiconRow[]> {
  const now = Date.now();
  if (cache && now - cache.loadedAt < CACHE_TTL_MS) return cache.rows;
  try {
    const { data } = await supabase
      .from("voice_pronunciation_lexicon")
      .select("original, phonetic, case_sensitive")
      .eq("is_active", true);
    cache = { rows: (data as LexiconRow[]) || [], loadedAt: now };
    return cache.rows;
  } catch {
    return cache?.rows ?? [];
  }
}

export function applyLexicon(text: string, rows: LexiconRow[]): string {
  if (!text || rows.length === 0) return text;
  let out = text;
  for (const r of rows) {
    if (!r.original || !r.phonetic) continue;
    const flags = r.case_sensitive ? "g" : "gi";
    // Whole-word match (Unicode aware, allows diacritics around word boundary).
    const re = new RegExp(`(^|[^\\p{L}\\p{N}_])(${escapeRegex(r.original)})(?=$|[^\\p{L}\\p{N}_])`, flags + "u");
    out = out.replace(re, (_m, pre) => `${pre}${r.phonetic}`);
  }
  return out;
}

export async function applyLexiconToText(supabase: any, text: string): Promise<string> {
  const rows = await loadLexicon(supabase);
  return applyLexicon(text, rows);
}

export function clearLexiconCache() {
  cache = null;
}
