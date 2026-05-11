// Shared objection detector for Andrei voice-agent calls.
// Used across: dashboard widgets, prospect timeline, CSV exports.
// Operates on ai_summary + transcript text, with optional sentiment hint.

export type ObjectionKey =
  | "comision"
  | "fara_agentii"
  | "pret_nerealist"
  | "deja_contractat"
  | "fara_regim_hotelier"
  | "fara_timp"
  | "ora_nepotrivita"
  | "neincredere";

export interface ObjectionDef {
  key: ObjectionKey;
  label: string;
  patterns: RegExp[];
}

export const OBJECTIONS: ObjectionDef[] = [
  {
    key: "comision",
    label: "Comisioane prea mari",
    patterns: [
      /comision/i,
      /procent\s+prea\s+mare/i,
      /prea\s+mult\s+(luați|luati|cere)/i,
    ],
  },
  {
    key: "fara_agentii",
    label: "Nu colaborez cu agenții",
    patterns: [
      /nu\s+(colabor|lucrez|vreau)\s+cu\s+(agen[țt]ii?|agen[țt]ie|agen[țt]i)/i,
      /f[ăa]r[ăa]\s+agen[țt]ii?/i,
      /nu\s+vreau\s+intermediar/i,
    ],
  },
  {
    key: "pret_nerealist",
    label: "Preț nerealist / sub piață",
    patterns: [
      /pre[țt]\s+(prea\s+)?(mic|nerealist|sub\s+pia[țt][ăa])/i,
      /sub\s+pia[țt][ăa]/i,
      /nu\s+merit[ăa]\s+at[ăa]t/i,
    ],
  },
  {
    key: "deja_contractat",
    label: "Deja contractat / are administrator",
    patterns: [
      /deja\s+(contractat|am\s+administrator|am\s+pe\s+cineva|am\s+colab)/i,
      /lucrez\s+deja\s+cu/i,
      /am\s+(deja\s+)?(o\s+)?agen[țt]ie/i,
    ],
  },
  {
    key: "fara_regim_hotelier",
    label: "Nu vrea regim hotelier",
    patterns: [
      /nu\s+vreau\s+regim\s+hotelier/i,
      /doar\s+(long[\s-]?term|chirie\s+lung|pe\s+termen\s+lung)/i,
      /nu\s+m[ăa]\s+intereseaz[ăa]\s+(airbnb|booking|regim)/i,
    ],
  },
  {
    key: "fara_timp",
    label: "Nu are timp acum",
    patterns: [
      /nu\s+am\s+timp/i,
      /sunt\s+ocupat/i,
      /suna[țt]i?\s+(mai\s+t[âa]rziu|alt[ăa]\s+dat[ăa])/i,
    ],
  },
  {
    key: "ora_nepotrivita",
    label: "Oră nepotrivită",
    patterns: [
      /e\s+(prea\s+)?(t[âa]rziu|devreme)/i,
      /la\s+ora\s+asta/i,
      /nu\s+(este|e)\s+momentul/i,
    ],
  },
  {
    key: "neincredere",
    label: "Neîncredere / scepticism",
    patterns: [
      /nu\s+am\s+[îi]ncredere/i,
      /sun[ăa]\s+(suspect|ciudat|prea\s+frumos)/i,
      /[țt]eap[ăa]/i,
      /escrocherie|escroc/i,
    ],
  },
];

export const OBJECTION_LABEL: Record<ObjectionKey, string> = OBJECTIONS.reduce(
  (acc, o) => ({ ...acc, [o.key]: o.label }),
  {} as Record<ObjectionKey, string>,
);

function transcriptToText(t: any): string {
  if (!t) return "";
  if (typeof t === "string") return t;
  if (Array.isArray(t)) return t.map((x: any) => String(x?.text || "")).join(" ");
  return "";
}

/**
 * Detect the primary objection in a session.
 * Returns the first matching objection (priority = OBJECTIONS order).
 */
export function detectObjection(
  summary?: string | null,
  transcript?: any,
  sentiment?: string | null,
): ObjectionKey | null {
  const blob = `${summary || ""} ${transcriptToText(transcript)} ${sentiment || ""}`.toLowerCase();
  if (!blob.trim()) return null;
  for (const o of OBJECTIONS) {
    if (o.patterns.some((re) => re.test(blob))) return o.key;
  }
  return null;
}

export function detectAllObjections(
  summary?: string | null,
  transcript?: any,
  sentiment?: string | null,
): ObjectionKey[] {
  const blob = `${summary || ""} ${transcriptToText(transcript)} ${sentiment || ""}`.toLowerCase();
  if (!blob.trim()) return [];
  return OBJECTIONS.filter((o) => o.patterns.some((re) => re.test(blob))).map((o) => o.key);
}
