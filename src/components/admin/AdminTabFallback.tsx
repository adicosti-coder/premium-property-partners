import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton uniform afișat cât timp se încarcă chunk-ul unui tab admin lazy.
 * Min-height previne salturi CLS atunci când Suspense schimbă rapid conținutul.
 */
export function AdminTabFallback() {
  return (
    <div className="space-y-4 animate-in fade-in-50" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Se încarcă secțiunea…</span>
      </div>
      <Skeleton className="h-8 w-1/3" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default AdminTabFallback;
