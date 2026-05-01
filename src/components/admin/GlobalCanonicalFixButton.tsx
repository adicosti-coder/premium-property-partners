import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Zap, AlertTriangle, Globe } from "lucide-react";
import { toast } from "sonner";

/**
 * Global "One-Click Canonical Fix" button — applies normalized canonical URLs
 * across ALL audited pages. Lives in the SEO dashboard header.
 */
export const GlobalCanonicalFixButton = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [overrideConflicts, setOverrideConflicts] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [results, setResults] = useState<any>(null);

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: {
          action: "one_click_canonical_fix",
          scope: "bulk",
          override_conflicts: overrideConflicts,
          override_reason: overrideConflicts ? overrideReason || "Global one-click bulk" : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setResults(data);
      toast.success(
        `Bulk: ${data.applied} aplicate, ${data.skipped} skipped, ${data.errors} erori`,
      );
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      qc.invalidateQueries({ queryKey: ["seo-audits"] });
    },
    onError: (e: any) => toast.error(e.message || "Bulk eșuat"),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setResults(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-1.5">
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
            Generează canonical-ul normalizat (https://www.realtrust.ro + path lowercase, fără query/hash/trailing slash) pentru toate paginile auditate. Verifică automat conflictele cu robots.txt (cache 24h) și meta robots.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="text-sm">Cum funcționează</AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              <p>• Maxim 200 pagini per rulare (cele mai recente audituri).</p>
              <p>• Paginile cu canonical deja corect sunt sărite.</p>
              <p>• Paginile cu Disallow în robots.txt sau meta noindex sunt sărite implicit (override explicit mai jos).</p>
              <p>• Toate aplicările sunt logate în <code>seo_canonical_fix_log</code> pentru audit.</p>
            </AlertDescription>
          </Alert>

          <div className="flex items-start gap-2 p-2 rounded border bg-muted/30">
            <Checkbox
              id="global-override"
              checked={overrideConflicts}
              onCheckedChange={(c) => setOverrideConflicts(!!c)}
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
            />
          )}

          {results && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded border p-2 bg-emerald-50 dark:bg-emerald-950/20">
                  <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{results.applied}</div>
                  <div className="text-muted-foreground">Aplicate</div>
                </div>
                <div className="rounded border p-2 bg-amber-50 dark:bg-amber-950/20">
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{results.skipped}</div>
                  <div className="text-muted-foreground">Skipped</div>
                </div>
                <div className="rounded border p-2 bg-destructive/10">
                  <div className="text-lg font-bold text-destructive">{results.errors}</div>
                  <div className="text-muted-foreground">Erori</div>
                </div>
              </div>
              <ScrollArea className="max-h-72 border rounded p-2">
                <ul className="text-xs space-y-1">
                  {(results.results || []).map((r: any, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <Badge
                        variant={r.status === "ok" ? "default" : r.status === "skipped" ? "secondary" : "destructive"}
                        className="text-[10px]"
                      >
                        {r.status}
                      </Badge>
                      <span className="truncate font-mono">{r.url_path}</span>
                      {r.reason && <span className="text-muted-foreground">({r.reason})</span>}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Închide</Button>
          <Button
            onClick={() => bulkMutation.mutate()}
            disabled={bulkMutation.isPending}
          >
            {bulkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
            Pornește Bulk Fix
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalCanonicalFixButton;
