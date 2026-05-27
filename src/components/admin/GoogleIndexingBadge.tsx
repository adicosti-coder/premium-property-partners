import * as React from "react";
import { Search, CheckCircle2, AlertCircle, CircleDashed } from "lucide-react";
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

type StatusMeta = {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortLabel: string;
  cls: string;
  pulse: boolean;
};

const STATUS_MAP: Record<string, StatusMeta> = {
  INDEXED: {
    Icon: CheckCircle2,
    label: "Indexat pe Google",
    shortLabel: "Indexat",
    // soft muted green
    cls: "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60",
    pulse: false,
  },
  CRAWLED_NOT_INDEXED: {
    Icon: AlertCircle,
    label: "Descoperit / Neindexat",
    shortLabel: "Neindexat",
    // soft muted amber
    cls: "bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60",
    pulse: true,
  },
  NEUTRAL: {
    Icon: AlertCircle,
    label: "Descoperit / Neindexat",
    shortLabel: "Neindexat",
    cls: "bg-amber-50 text-amber-900 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60",
    pulse: true,
  },
  URL_NOT_ON_GOOGLE: {
    Icon: Search,
    label: "Lipsă din Index Google",
    shortLabel: "Negăsit",
    // soft neutral charcoal
    cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    pulse: false,
  },
  pending_check: {
    Icon: CircleDashed,
    label: "Verificare în așteptare",
    shortLabel: "În așteptare",
    cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-700",
    pulse: true,
  },
};

function formatChecked(ts?: string | null) {
  if (!ts) return "Niciodată";
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
  compact = false,
}: {
  status: IndexingStatus;
  lastCheckedAt?: string | null;
  className?: string;
  size?: "xs" | "sm";
  /** Show short label (better for narrow mobile rows) */
  compact?: boolean;
}) {
  const key = status ?? "pending_check";
  const meta = STATUS_MAP[key] ?? STATUS_MAP.pending_check;
  const { Icon } = meta;

  // Mobile-friendly: controlled tooltip that toggles on tap, closes on outside tap.
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (triggerRef.current && t && !triggerRef.current.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointer, true);
    return () => document.removeEventListener("pointerdown", onDocPointer, true);
  }, [open]);

  // Smooth color/opacity transition when status updates in realtime.
  // Re-mount inner content via key to trigger fade-in animation cleanly.
  const fadeKey = `${key}-${lastCheckedAt ?? "na"}`;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            onBlur={() => setOpen(false)}
            aria-label={`Status Google: ${meta.label}. Verificat la ${formatChecked(lastCheckedAt)}`}
            className={cn(
              "inline-flex max-w-full shrink-0 align-middle rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              className,
            )}
          >
            <Badge
              variant="outline"
              key={fadeKey}
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap font-medium border transition-colors duration-500 animate-fade-in",
                size === "xs" ? "px-1.5 py-0 text-[10px] leading-4" : "px-2 py-0.5 text-[11px] leading-5",
                meta.cls,
                meta.pulse && "animate-pulse",
              )}
            >
              <Icon className={cn(size === "xs" ? "w-2.5 h-2.5" : "w-3 h-3", "shrink-0")} aria-hidden />
              <span className="truncate">{compact ? meta.shortLabel : meta.label}</span>
            </Badge>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Verificat la data de: {formatChecked(lastCheckedAt)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default GoogleIndexingBadge;
