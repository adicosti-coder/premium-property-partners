import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Snowflake, ThermometerSun, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeadRow } from "../hooks/useLeads";

const GRADE_META: Record<
  string,
  { label: string; className: string; Icon: typeof Flame }
> = {
  hot: {
    label: "Fierbinte",
    className: "bg-red-500/15 text-red-600 border-red-500/30",
    Icon: Flame,
  },
  warm: {
    label: "Cald",
    className: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    Icon: Zap,
  },
  cool: {
    label: "Tepid",
    className: "bg-sky-500/15 text-sky-600 border-sky-500/30",
    Icon: ThermometerSun,
  },
  cold: {
    label: "Rece",
    className: "bg-muted text-muted-foreground border-border",
    Icon: Snowflake,
  },
};

const FACTOR_LABELS: Array<{ key: keyof NonNullable<LeadRow["score_breakdown"]>; label: string; max: number }> = [
  { key: "zone", label: "Zonă", max: 30 },
  { key: "rooms", label: "Camere / tip", max: 25 },
  { key: "income", label: "Estimare venit", max: 25 },
  { key: "area", label: "Suprafață", max: 10 },
  { key: "contact", label: "Contact", max: 10 },
];

/**
 * Automatic lead score badge (0-100) with a breakdown tooltip so the team can
 * see *why* a lead is prioritised, not just the number.
 */
export const LeadScoreBadge = ({ lead }: { lead: LeadRow }) => {
  const score = lead.lead_score ?? 0;
  const meta = GRADE_META[lead.lead_grade ?? "cold"] ?? GRADE_META.cold;
  const { Icon } = meta;
  const breakdown = lead.score_breakdown;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
            meta.className,
          )}
          aria-label={`Scor automat ${score} din 100 — ${meta.label}`}
        >
          <Icon className="w-3 h-3" aria-hidden="true" />
          {score}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-[220px]">
        <p className="font-semibold mb-1">
          Scor automat: {score}/100 · {meta.label}
        </p>
        {breakdown ? (
          <ul className="space-y-0.5 text-xs">
            {FACTOR_LABELS.map(({ key, label, max }) => (
              <li key={key} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{label}</span>
                <span>
                  {Number(breakdown[key] ?? 0)}/{max}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">Fără detaliere disponibilă</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
