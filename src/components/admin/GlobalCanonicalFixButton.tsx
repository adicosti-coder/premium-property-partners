import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Zap, AlertTriangle, Globe, StopCircle } from "lucide-react";
import { toast } from "sonner";

interface ChunkResult {
  url_path: string;
  status: "ok" | "skipped" | "error";
  reason?: string;
  error?: string;
}

interface ChunkResponse {
  ok: boolean;
  total: number;
  offset: number;
  limit: number;
  next_offset: number | null;
  done: boolean;
  processed: number;
  applied: number;
  skipped: number;
  errors: number;
  results: ChunkResult[];
  error?: string;
}

const CHUNK_SIZE = 40;

export const GlobalCanonicalFixButton = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [overrideConflicts, setOverrideConflicts] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [includeSitemap, setIncludeSitemap] = useState(true);
  const [running, setRunning] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [totals, setTotals] = useState({ applied: 0, skipped: 0, errors: 0 });
  const [results, setResults] = useState<ChunkResult[]>([]);

  const reset = () => {
    setResults([]);
    setTotals({ applied: 0, skipped: 0, errors: 0 });
    setProgress({ done: 0, total: 0 });
    setCancelRequested(false);
  };

  const runBulk = async () => {
    reset();
    setRunning(true);
    let offset = 0;
    let total = 0;
    let firstChunk = true;
    const aggregated: ChunkResult[] = [];
    const running = { applied: 0, skipped: 0, errors: 0 };

    try {
      while (true) {
        if (cancelRequested) {
          toast.info("Rulare oprită de utilizator");
          break;
        }
        const { data, error } = await supabase.functions.invoke<ChunkResponse>("seo-auto-fix", {
          body: {
            action: "one_click_canonical_fix",
            scope: "bulk",
            override_conflicts: overrideConflicts,
            override_reason: overrideConflicts ? overrideReason || "Global one-click bulk" : undefined,
            include_sitemap: firstChunk ? includeSitemap : false,
            offset,
            limit: CHUNK_SIZE,
          },
        });
        if (error) throw error;
        if (!data || data.error) throw new Error(data?.error || "Răspuns invalid");

        total = data.total;
        running.applied += data.applied;
        running.skipped += data.skipped;
        running.errors += data.errors;
        aggregated.push(...data.results);

        setTotals({ ...running });
        setResults([...aggregated]);
        setProgress({ done: offset + data.processed, total });

        if (data.done || data.next_offset === null) break;
        offset = data.next_offset;
        firstChunk = false;
      }

      if (!cancelRequested) {
        if (running.errors === 0) {
          toast.success(
            `Canonical fix complet: ${running.applied} aplicate, ${running.skipped} ignorate`,
          );
        } else {
          toast.warning(
            `Terminat cu ${running.errors} erori (${running.applied} aplicate)`,
          );
        }
      }
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      qc.invalidateQueries({ queryKey: ["seo-audits"] });
    } catch (e: any) {
      console.error("[canonical-bulk] failed", e);
      toast.error(
        e?.message?.includes("Forbidden")
          ? "Acces refuzat: doar administratorii pot rula acest fix."
          : `Bulk canonical fix eșuat: ${e?.message || "eroare necunoscută"}`,
      );
    } finally {
      setRunning(false);
      setCancelRequested(false);
    }
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (running) return; // block close while running
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-1.5" aria-label="Rulează one-click canonical fix pe toate paginile">
          <Zap className="h-4 w-4" />
          <Globe className="h-4 w-4" />
          One-Click Canonical Fix (toate paginile)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" /> Bulk Canonical Fix — toate paginile
          </DialogTitle>
          <DialogDescription>
            Generează canonical-ul normalizat (https://realtrust.ro + path lowercase, fără query/hash/trailing slash) pentru toate paginile cunoscute (audituri + overrides existente + sitemap). Verifică automat conflictele cu robots.txt și meta robots.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Cum funcționează</AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              <p>• Procesare în bucăți de {CHUNK_SIZE} pagini, în paralel (fără timeout).</p>
              <p>• Paginile cu canonical deja corect sunt sărite automat.</p>
              <p>• Paginile blocate în robots.txt sau cu meta noindex sunt sărite (override explicit mai jos).</p>
              <p>• Toate aplicările sunt logate în <code>seo_canonical_fix_log</code>.</p>
            </AlertDescription>
          </Alert>

          <div className="flex items-start gap-2 p-2 rounded border bg-muted/30">
            <Checkbox
              id="include-sitemap"
              checked={includeSitemap}
              onCheckedChange={(c) => setIncludeSitemap(!!c)}
              disabled={running}
            />
            <div className="flex-1">
              <label htmlFor="include-sitemap" className="text-sm cursor-pointer font-medium">
                Include URL-uri din sitemap.xml
              </label>
              <p className="text-xs text-muted-foreground">
                Recomandat: acoperă pagini care nu au fost auditate încă.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2 p-2 rounded border bg-muted/30">
            <Checkbox
              id="global-override"
              checked={overrideConflicts}
              onCheckedChange={(c) => setOverrideConflicts(!!c)}
              disabled={running}
            />
            <div className="flex-1">
              <label htmlFor="global-override" className="text-sm cursor-pointer font-medium">
                Aplică în ciuda conflictelor (override explicit)
              </label>
              <p className="text-xs text-muted-foreground">
                Pentru cazuri în care vrei canonical pe pagini intenționat blocate (ex: dedup peste paginate noindex).
              </p>
            </div>
          </div>
          {overrideConflicts && (
            <Textarea
              placeholder="Motiv override (recomandat pentru audit trail)"
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={2}
              className="text-sm"
              disabled={running}
            />
          )}

          {(running || progress.total > 0) && (
            <div className="space-y-1" aria-live="polite">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{running ? "Procesare în curs…" : "Finalizat"}</span>
                <span>{progress.done} / {progress.total} ({pct}%)</span>
              </div>
              <Progress value={pct} />
            </div>
          )}

          {(results.length > 0 || totals.applied + totals.skipped + totals.errors > 0) && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded border p-2 bg-emerald-50 dark:bg-emerald-950/20">
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{totals.applied}</div>
                  <div className="text-muted-foreground">Aplicate</div>
                </div>
                <div className="rounded border p-2 bg-amber-50 dark:bg-amber-950/20">
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{totals.skipped}</div>
                  <div className="text-muted-foreground">Ignorate</div>
                </div>
                <div className="rounded border p-2 bg-destructive/10">
                  <div className="text-lg font-bold text-destructive">{totals.errors}</div>
                  <div className="text-muted-foreground">Erori</div>
                </div>
              </div>
              <ScrollArea className="max-h-72 border rounded p-2">
                <ul className="text-xs space-y-1">
                  {results.map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Badge
                        variant={r.status === "ok" ? "default" : r.status === "skipped" ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {r.status}
                      </Badge>
                      <span className="truncate font-mono">{r.url_path}</span>
                      {(r.reason || r.error) && (
                        <span className="text-muted-foreground truncate">({r.reason || r.error})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          {running ? (
            <Button
              variant="outline"
              onClick={() => setCancelRequested(true)}
              disabled={cancelRequested}
              className="gap-1"
            >
              <StopCircle className="h-4 w-4" />
              {cancelRequested ? "Se oprește…" : "Oprește"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setOpen(false)}>Închide</Button>
          )}
          <Button onClick={runBulk} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
            {running ? "În curs…" : "Pornește Bulk Fix"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalCanonicalFixButton;
