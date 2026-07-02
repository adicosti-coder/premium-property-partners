import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  variant?: "skeleton" | "spinner";
  label?: string;
  className?: string;
  lines?: number;
}

/**
 * Discreet loading state for AI generations (GLM 5.2 / Gemini).
 * - `skeleton`: animated shimmer lines (best for long-form content)
 * - `spinner`:  compact inline spinner (best for buttons/inline UI)
 */
export function AiEngineLoader({
  variant = "skeleton",
  label = "AI pregătește răspunsul…",
  className,
  lines = 3,
}: Props) {
  if (variant === "spinner") {
    return (
      <div
        className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        <span>{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn("space-y-2", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3 rounded-md",
            i === lines - 1 ? "w-2/3" : i % 2 === 0 ? "w-full" : "w-11/12",
          )}
        />
      ))}
      <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/80">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default AiEngineLoader;
