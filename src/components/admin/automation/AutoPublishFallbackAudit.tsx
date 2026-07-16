import { History } from "lucide-react";
import type { Run } from "./types";

export function AutoPublishFallbackAudit({ runs }: { runs: Run[] }) {
  const autoRuns = runs.filter((r) => r.job_key === "auto-publish-listings");
  const since = Date.now() - 24 * 3600_000;
  const recent24 = autoRuns.filter((r) => new Date(r.started_at).getTime() > since);
  const fallbacks = autoRuns
    .filter((r) => {
      const o = (r.output_summary || {}) as Record<string, unknown>;
      return r.status !== "success" || o.fallback === true || o.timeout === true;
    })
    .slice(0, 10);
  if (fallbacks.length === 0) return null;

  const classify = (o: Record<string, unknown>, status: string) => {
    if (o.timeout === true || status === "timeout" || /timeout|timed out|deadline|abort/i.test(String(o.error || ""))) {
      return { label: "Timeout rețea", tone: "amber" as const };
    }
    const m = String(o.error || "").match(/\b([45]\d{2})\b/);
    if (m) return { label: `Refuz HTTP ${m[1]}`, tone: "red" as const };
    if (/imobiliare|publi24|olx|storia/i.test(String(o.error || ""))) {
      return { label: "Refuz platformă terță", tone: "red" as const };
    }
    return { label: "Eroare aplicație", tone: "slate" as const };
  };

  return (
    <details className="border rounded-lg bg-card/30">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium flex items-center justify-between hover:bg-muted/30">
        <span className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          Audit auto-publish — ultimele {fallbacks.length} răspunsuri fallback prinse de try/catch
        </span>
        <span className="text-xs text-muted-foreground">
          {recent24.length} rulări cron self-heal (5 min) în ultimele 24h
        </span>
      </summary>
      <div className="px-4 pb-3 space-y-1.5">
        {fallbacks.map((r) => {
          const o = (r.output_summary || {}) as Record<string, unknown>;
          const c = classify(o, r.status);
          const toneClass = c.tone === "amber"
            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
            : c.tone === "red"
              ? "bg-destructive/15 text-destructive border-destructive/30"
              : "bg-muted text-muted-foreground border-border";
          const err = String(o.error || r.error || "—");
          return (
            <div key={r.id} className="text-xs flex items-start gap-2 border-b border-border/40 last:border-0 pb-1.5">
              <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] ${toneClass}`}>{c.label}</span>
              <span className="font-mono opacity-70 shrink-0">
                {new Date(r.started_at).toLocaleString("ro-RO", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
              </span>
              <span className="font-mono opacity-90 truncate">{err.slice(0, 180)}</span>
            </div>
          );
        })}
        <div className="text-[11px] text-muted-foreground pt-1">
          Self-heal rulează automat la fiecare 5 min · retry exponential pe `automation_runs`.
        </div>
      </div>
    </details>
  );
}
