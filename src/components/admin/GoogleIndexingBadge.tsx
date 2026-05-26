import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type IndexingStatus =
  | "INDEXED"
  | "CRAWLED_NOT_INDEXED"
  | "NEUTRAL"
  | "URL_NOT_ON_GOOGLE"
  | "pending_check"
  | null
  | undefined;

const STATUS_MAP: Record<string, { dot: string; label: string; cls: string }> = {
  INDEXED: {
    dot: "🟢",
    label: "Indexat pe Google",
    cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20",
  },
  CRAWLED_NOT_INDEXED: {
    dot: "🟡",
    label: "Descoperit / Neindexat",
    cls: "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/20",
  },
  NEUTRAL: {
    dot: "🟡",
    label: "Descoperit / Neindexat",
    cls: "bg-amber-500/15 text-amber-700 border-amber-500/30 hover:bg-amber-500/20",
  },
  URL_NOT_ON_GOOGLE: {
    dot: "⚪️",
    label: "Lipsă din Index Google",
    cls: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
  },
  pending_check: {
    dot: "⚪️",
    label: "Verificare în așteptare",
    cls: "bg-muted text-muted-foreground border-border hover:bg-muted/80",
  },
};

function formatChecked(ts?: string | null) {
  if (!ts) return "Niciodată verificat";
  try {
    return new Date(ts).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

export function GoogleIndexingBadge({
  status,
  lastCheckedAt,
  className,
  size = "sm",
}: {
  status: IndexingStatus;
  lastCheckedAt?: string | null;
  className?: string;
  size?: "xs" | "sm";
}) {
  const key = status ?? "pending_check";
  const meta = STATUS_MAP[key] ?? STATUS_MAP.pending_check;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 font-medium border",
              size === "xs" ? "px-1.5 py-0 text-[10px]" : "px-2 py-0.5 text-[11px]",
              meta.cls,
              className,
            )}
            aria-label={`Status Google: ${meta.label}`}
          >
            <span aria-hidden>{meta.dot}</span>
            <span>{meta.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Ultima verificare Google: {formatChecked(lastCheckedAt)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default GoogleIndexingBadge;
