import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Wand2, History, GitCompare, FlaskConical, Layers, ShieldAlert, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { SerpPreview } from "./SerpPreview";

interface Props {
  audit: {
    id: string;
    url: string;
    overall_score?: number | null;
    suggested_title?: string | null;
    suggested_meta?: string | null;
    issues?: any[];
  } | null;
}

type FixType = "title" | "meta" | "schema" | "alt_text" | "all";

const urlToPath = (full: string): string => {
  try {
    const u = new URL(full);
    let p = u.pathname.replace(/\/{2,}/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch {
    return full.startsWith("/") ? full : "/";
  }
};

const FIX_LABEL: Record<FixType, { label: string; icon: any }> = {
  title: { label: "Title", icon: Wand2 },
  meta: { label: "Meta Description", icon: Wand2 },
  schema: { label: "Schema.org JSON-LD", icon: Layers },
  alt_text: { label: "Alt-Text imagini", icon: Wand2 },
  all: { label: "Pachet complet (Title + Meta + Schema + Keywords)", icon: Wand2 },
};

export const SEOAutoFixPanel = ({ audit }: Props) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [activeFix, setActiveFix] = useState<FixType>("all");
  const [proposal, setProposal] = useState<any>(null);
  const [variantB, setVariantB] = useState(false);

  const path = audit ? urlToPath(audit.url) : "";

  // ---- Generate
  const genMutation = useMutation({
    mutationFn: async (fix_type: FixType) => {
      if (!audit) throw new Error("No audit");
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: { action: "generate_fix", audit_id: audit.id, fix_type },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setProposal(data.proposal);
      setActiveFix(data.fix_type);
      setDiffOpen(true);
    },
    onError: (e: any) => toast.error(e.message || "Eroare AI"),
  });

  // ---- Apply
  const applyMutation = useMutation({
    mutationFn: async ({ asVariantB }: { asVariantB: boolean }) => {
      if (!audit || !proposal) throw new Error("No proposal");
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: {
          action: "apply_fix",
          url_path: path,
          payload: proposal,
          audit_id: audit.id,
          variant: asVariantB ? "B" : "A",
          ab_enabled: asVariantB ? true : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Aplicat ca varianta ${data.variant}${data.version > 1 ? ` (snapshot v${data.version} salvat)` : ""}`);
      setDiffOpen(false);
      setProposal(null);
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      qc.invalidateQueries({ queryKey: ["seo-history", path] });
    },
    onError: (e: any) => toast.error(e.message || "Eroare aplicare"),
  });

  // ---- History
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ["seo-history", path],
    queryFn: async () => {
      if (!path) return { history: [] };
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: { action: "list_history", url_path: path },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!path && historyOpen,
  });

  const revertMutation = useMutation({
    mutationFn: async (version_id: string) => {
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: { action: "revert", version_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Revert la versiunea ${data.reverted_to_version}`);
      refetchHistory();
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
    },
    onError: (e: any) => toast.error(e.message || "Revert eșuat"),
  });

  // ---- Bulk Fix
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [bulkThreshold, setBulkThreshold] = useState(85);

  const runBulkFix = async () => {
    setBulkRunning(true);
    setBulkResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: { action: "bulk_fix", threshold: bulkThreshold },
      });
      if (error) throw error;
      setBulkResults(data?.results || []);
      const ok = (data?.results || []).filter((r: any) => r.status === "ok").length;
      toast.success(`Bulk Fix: ${ok}/${data?.results?.length || 0} aplicate`);
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
    } catch (e: any) {
      toast.error(e.message || "Bulk eșuat");
    } finally {
      setBulkRunning(false);
    }
  };

  // ---- Regression check
  const regressionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: { action: "check_regression", regression_delta: 5 },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const n = (data?.reverts || []).length;
      toast.success(n > 0 ? `Auto-revert pe ${n} pagini cu regresie` : "Nicio regresie detectată");
    },
    onError: (e: any) => toast.error(e.message || "Verificare eșuată"),
  });

  if (!audit) return null;

  const criticalIssues = (audit.issues || []).filter((i: any) => i.severity === "critical" || i.severity === "high");

  return (
    <>
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" />
            Auto-Fix AI & Version Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Per-issue Auto-Fix buttons */}
          {criticalIssues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Probleme critice detectate</p>
              <div className="space-y-1.5">
                {criticalIssues.map((issue: any, idx: number) => {
                  const txt = (issue.issue || "").toLowerCase();
                  let fix: FixType = "all";
                  if (txt.includes("schema") || txt.includes("json-ld") || txt.includes("structured")) fix = "schema";
                  else if (txt.includes("alt") || txt.includes("imagine")) fix = "alt_text";
                  else if (txt.includes("title")) fix = "title";
                  else if (txt.includes("meta") || txt.includes("descri")) fix = "meta";
                  return (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-background rounded-md border">
                      <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">{issue.issue}</p>
                        {issue.fix && <p className="text-xs text-muted-foreground mt-0.5">{issue.fix}</p>}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => genMutation.mutate(fix)}
                        disabled={genMutation.isPending}
                        className="shrink-0"
                      >
                        {genMutation.isPending && genMutation.variables === fix ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        Auto-Fix
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generate full bundle */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => genMutation.mutate("all")} disabled={genMutation.isPending}>
              {genMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Generează pachet complet
            </Button>
            <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4" /> Istoric versiuni
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              <Layers className="h-4 w-4" /> Bulk Auto-Fix
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => regressionMutation.mutate()}
              disabled={regressionMutation.isPending}
            >
              {regressionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Check regresie & auto-revert
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===================== Diff Viewer Dialog ===================== */}
      <Dialog open={diffOpen} onOpenChange={setDiffOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" /> Comparație: {FIX_LABEL[activeFix].label}
            </DialogTitle>
            <DialogDescription>
              Verifică modificările înainte de aplicare. Poți aplica direct (varianta A) sau ca test A/B (varianta B).
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[55vh] pr-3">
            <div className="space-y-4">
              {proposal?.title && (
                <DiffBlock label="Title" before={audit.suggested_title || "—"} after={proposal.title} />
              )}
              {proposal?.meta_description && (
                <DiffBlock label="Meta Description" before={audit.suggested_meta || "—"} after={proposal.meta_description} />
              )}

              {(proposal?.title || proposal?.meta_description) && (
                <SerpPreview
                  title={proposal?.title || audit.suggested_title || ""}
                  description={proposal?.meta_description || audit.suggested_meta || ""}
                  url={audit.url}
                  canonical={proposal?.canonical_url || proposal?.canonical}
                />
              )}
              {proposal?.json_ld && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Schema.org JSON-LD (nou)</p>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-60">
                    {JSON.stringify(proposal.json_ld, null, 2)}
                  </pre>
                </div>
              )}
              {Array.isArray(proposal?.extra_keywords) && proposal.extra_keywords.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Keywords sugerate</p>
                  <div className="flex flex-wrap gap-1.5">
                    {proposal.extra_keywords.map((k: any, i: number) => (
                      <Badge key={i} variant="secondary">{k.keyword || k}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(proposal?.alt_text_suggestions) && proposal.alt_text_suggestions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Alt-text sugerat</p>
                  <ul className="text-sm space-y-1">
                    {proposal.alt_text_suggestions.map((s: any, i: number) => (
                      <li key={i} className="border-l-2 border-primary pl-2">
                        <span className="text-muted-foreground">{s.image_hint}:</span> {s.alt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex items-center gap-2 mr-auto">
              <Switch id="ab" checked={variantB} onCheckedChange={setVariantB} />
              <label htmlFor="ab" className="text-sm cursor-pointer flex items-center gap-1">
                <FlaskConical className="h-3.5 w-3.5" /> Aplică ca A/B test (varianta B)
              </label>
            </div>
            <Button variant="outline" onClick={() => setDiffOpen(false)}>Renunță</Button>
            <Button
              onClick={() => applyMutation.mutate({ asVariantB: variantB })}
              disabled={applyMutation.isPending}
            >
              {applyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {variantB ? "Aplică ca varianta B" : "Aplică direct"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== History Dialog ===================== */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Istoric versiuni — {path}</DialogTitle>
            <DialogDescription>Fiecare aplicare creează o versiune. Poți reveni oricând.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            {historyLoading ? (
              <div className="flex justify-center p-6"><Loader2 className="animate-spin h-5 w-5" /></div>
            ) : (historyData?.history || []).length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Nu există versiuni anterioare.</p>
            ) : (
              <div className="space-y-2">
                {(historyData?.history || []).map((v: any) => (
                  <div key={v.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{v.version_number}</Badge>
                        <Badge variant="secondary" className="text-xs">{v.change_type}</Badge>
                        {v.reverted_at && <Badge className="text-xs bg-destructive/20 text-destructive">revertit</Badge>}
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(v.applied_at).toLocaleString("ro-RO")}</span>
                    </div>
                    {v.title && <p className="text-sm"><strong>Title:</strong> {v.title}</p>}
                    {v.meta_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{v.meta_description}</p>
                    )}
                    {v.notes && <p className="text-xs italic text-muted-foreground">{v.notes}</p>}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revertMutation.mutate(v.id)}
                      disabled={revertMutation.isPending || !!v.reverted_at}
                    >
                      <RotateCcw className="h-3 w-3" /> Revert la această versiune
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ===================== Bulk Fix Dialog ===================== */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5" /> Bulk Auto-Fix</DialogTitle>
            <DialogDescription>
              Aplicăm auto-fix pe toate paginile cu scor sub pragul ales. Poate dura câteva minute.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm">Prag scor minim:</label>
              <input
                type="number"
                value={bulkThreshold}
                min={50}
                max={99}
                onChange={(e) => setBulkThreshold(Number(e.target.value))}
                className="w-20 border rounded px-2 py-1 text-sm"
              />
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
            <Button onClick={runBulkFix} disabled={bulkRunning}>
              {bulkRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Pornește Bulk Fix
            </Button>
            {bulkResults.length > 0 && (
              <ScrollArea className="max-h-60 border rounded p-2">
                <ul className="text-xs space-y-1">
                  {bulkResults.map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Badge variant={r.status === "ok" ? "default" : "destructive"} className="text-[10px]">
                        {r.status}
                      </Badge>
                      <span className="truncate">{r.url}</span>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const DiffBlock = ({ label, before, after }: { label: string; before: string; after: string }) => (
  <div className="space-y-1">
    <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      <div className="border-l-4 border-muted bg-muted/30 p-2 rounded">
        <p className="text-[10px] uppercase text-muted-foreground mb-0.5">înainte</p>
        <p className="text-sm">{before}</p>
      </div>
      <div className="border-l-4 border-primary bg-primary/5 p-2 rounded">
        <p className="text-[10px] uppercase text-primary mb-0.5">după (AI)</p>
        <p className="text-sm">{after}</p>
      </div>
    </div>
  </div>
);

export default SEOAutoFixPanel;
