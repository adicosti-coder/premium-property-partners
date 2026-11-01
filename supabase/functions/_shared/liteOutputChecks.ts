// Deterministic sanity checks for outputs produced by cheaper "lite" models.
// They never call AI; they only flag results that look wrong so a human reviews them.

const RO_DIACRITICS = /[ăâîșşțţ]/gi;
const RO_STOPWORDS = /\b(și|si|pentru|este|care|sunt|într|într-un|cu o|din|către|această|acest)\b/gi;

function numbersOf(text: string): string[] {
  return (text.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/[.,]/g, ""));
}
function countMatches(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}
function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function checkTranslationField(source: string, translated: string, field: string): string[] {
  const issues: string[] = [];
  const src = (source ?? "").trim();
  const out = (translated ?? "").trim();
  if (!src) return issues;
  if (!out) return [`${field}: traducere goală`];
  if (out === src) issues.push(`${field}: identic cu textul românesc`);

  const w = Math.max(words(out), 1);
  const roMarks = countMatches(out, RO_DIACRITICS) + countMatches(out, RO_STOPWORDS);
  if (roMarks / w > 0.08 && roMarks >= 3) issues.push(`${field}: pare să fi rămas în română`);

  const ratio = out.length / src.length;
  if (src.length >= 80 && (ratio < 0.5 || ratio > 2)) {
    issues.push(`${field}: lungime suspectă (${Math.round(ratio * 100)}% din original)`);
  }

  const outNums = new Set(numbersOf(out));
  const missing = [...new Set(numbersOf(src))].filter((n) => n.length >= 2 && !outNums.has(n));
  if (missing.length) issues.push(`${field}: lipsesc cifre (${missing.slice(0, 5).join(", ")})`);

  const structure: Array<[string, RegExp]> = [
    ["titluri", /^#{1,6}\s/gm],
    ["linkuri", /\]\([^)]+\)|href=/g],
    ["etichete HTML", /<(h[1-6]|p|ul|ol|li)\b/gi],
  ];
  for (const [label, re] of structure) {
    const a = countMatches(src, re);
    const b = countMatches(out, re);
    if (a !== b && Math.abs(a - b) > Math.max(1, a * 0.2)) issues.push(`${field}: ${label} ${a}→${b}`);
  }
  return issues;
}

export function checkTranslation(
  source: Record<string, string | null | undefined>,
  translated: Record<string, string | null | undefined>,
): string[] {
  return Object.keys(source).flatMap((k) =>
    checkTranslationField(source[k] ?? "", translated[k] ?? "", k)
  );
}

const AGENCY_SIGNALS = /\b(agen[țt]i[ae]|imobiliar[ae]?|real\s?estate|broker|comision|s\.?r\.?l\.?|consultant|portofoliu)\b/i;
const OWNER_SIGNALS = /\b(proprietar|f[aă]r[aă] comision|direct de la proprietar|persoan[aă] fizic[aă])\b/i;

export interface ClassificationInput { title?: string | null; description?: string | null; contact_name?: string | null }

export function checkAgencyClassification(
  listing: ClassificationInput | undefined,
  raw: { score?: unknown; reason?: unknown },
  highThreshold: number,
): string[] {
  if (!listing) return ["id necunoscut în lot"];
  const issues: string[] = [];
  const score = typeof raw.score === "number" ? raw.score : Number(raw.score);
  const reason = String(raw.reason ?? "").trim();
  if (!Number.isFinite(score) || score < 0 || score > 100) issues.push("scor invalid");
  if (reason.length < 5) issues.push("motiv lipsă");
  const text = `${listing.title ?? ""} ${listing.description ?? ""} ${listing.contact_name ?? ""}`;
  const hasAgency = AGENCY_SIGNALS.test(text) || AGENCY_SIGNALS.test(reason);
  const hasOwner = OWNER_SIGNALS.test(text);
  if (Number.isFinite(score)) {
    if (score >= highThreshold && !hasAgency) issues.push("scor mare de agenție fără niciun semnal de agenție");
    if (score >= highThreshold && hasOwner && !AGENCY_SIGNALS.test(text)) issues.push("anunțul spune proprietar direct, dar scorul indică agenție");
    if (score <= 20 && AGENCY_SIGNALS.test(text) && !hasOwner) issues.push("scor mic, deși textul are semnale de agenție");
  }
  return issues;
}
