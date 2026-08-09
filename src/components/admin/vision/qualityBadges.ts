// Synthetic, human-readable summary badges derived from the photo analysis.
// Shared between the prospect card, the triage list and the quality panel.
import type { PropertyQualityAnalysis } from "./types";

export type BadgeTone = "success" | "warning" | "danger" | "neutral";

export interface QualityBadge {
  label: string;
  tone: BadgeTone;
}

const FINISH_LABELS: Record<string, QualityBadge> = {
  premium: { label: "Finisaje Premium", tone: "success" },
  standard: { label: "Finisaje Standard", tone: "neutral" },
  economic: { label: "Finisaje Economice", tone: "warning" },
  neterminat: { label: "Nefinalizat", tone: "danger" },
};

const CONDITION_LABELS: Record<string, QualityBadge> = {
  nou: { label: "Nou", tone: "success" },
  renovat_recent: { label: "Renovat Recent", tone: "success" },
  bun: { label: "Stare Bună", tone: "neutral" },
  invechit: { label: "Învechit", tone: "warning" },
  necesita_renovare: { label: "Necesită Renovare", tone: "danger" },
};

const KEYWORD_BADGES: Array<{ re: RegExp; badge: QualityBadge }> = [
  { re: /lumin|natural[ăa] abundent|însorit|insorit/i, badge: { label: "Luminos", tone: "success" } },
  { re: /teras|balcon/i, badge: { label: "Terasă / Balcon", tone: "success" } },
  { re: /vedere panoramic|panoram/i, badge: { label: "Vedere Panoramică", tone: "success" } },
  { re: /igrasie|mucegai|infiltra/i, badge: { label: "Umezeală", tone: "danger" } },
  { re: /uzur|deteriorat|zgâriat|zgariat/i, badge: { label: "Uzură Vizibilă", tone: "warning" } },
  { re: /poze slabe|calitate (foarte )?slab[ăa] (a )?(pozelor|fotografiilor)|neclare/i, badge: { label: "Poze Slabe", tone: "warning" } },
];

/** Builds up to `limit` summary badges out of the structured analysis. */
export function buildQualityBadges(
  analysis: PropertyQualityAnalysis | null | undefined,
  limit = 5,
): QualityBadge[] {
  if (!analysis) return [];
  const out: QualityBadge[] = [];
  const seen = new Set<string>();

  const push = (b?: QualityBadge) => {
    if (!b || seen.has(b.label) || out.length >= limit) return;
    seen.add(b.label);
    out.push(b);
  };

  if (analysis.condition) push(CONDITION_LABELS[analysis.condition]);
  if (analysis.finishes) push(FINISH_LABELS[analysis.finishes]);

  if ((analysis.hotel_readiness ?? 0) >= 80) {
    push({ label: "Gata Regim Hotelier", tone: "success" });
  }
  if (analysis.furnishing === "complet_mobilat") {
    push({ label: "Complet Mobilat", tone: "success" });
  }

  const text = [...(analysis.highlights || []), ...(analysis.red_flags || [])].join(" • ");
  for (const { re, badge } of KEYWORD_BADGES) {
    if (re.test(text)) push(badge);
  }

  if (analysis.renovation_needed) push({ label: "Necesită Renovare", tone: "danger" });

  return out;
}

export const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-500",
  danger: "border-destructive/40 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
};
