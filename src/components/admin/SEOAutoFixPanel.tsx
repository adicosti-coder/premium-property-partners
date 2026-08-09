import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Loader2, Wand2, History, GitCompare, FlaskConical, Layers, ShieldAlert, RotateCcw,
  Link2, Pencil, Zap, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { SerpPreview } from "./SerpPreview";
import { SEOPremiumTabs } from "./SEOPremiumTabs";

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

type FixType = "title" | "meta" | "schema" | "alt_text" | "canonical" | "all";

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
  canonical: { label: "Canonical URL", icon: Link2 },
  all: { label: "Pachet complet (Title + Meta + Canonical + Schema + Keywords)", icon: Wand2 },
};

const CANONICAL_HOST = "www.realtrust.ro";

// Live validation for manual canonical input
function validateCanonical(input: string): { valid: boolean; error?: string; normalized?: string } {
  if (!input || !input.trim()) return { valid: false, error: "URL obligatoriu" };
  try {
    const u = new URL(input.trim());
    if (u.protocol !== "https:") return { valid: false, error: "Doar HTTPS este permis" };
    if (u.hostname !== CANONICAL_HOST && u.hostname !== "realtrust.ro")
      return { valid: false, error: `Host trebuie să fie ${CANONICAL_HOST}` };
    if (u.search) return { valid: false, error: "Fără parametri (?...)" };
    if (u.hash) return { valid: false, error: "Fără hash (#...)" };
    let path = u.pathname.replace(/\/{2,}/g, "/").toLowerCase();
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return { valid: true, normalized: `https://${CANONICAL_HOST}${path}` };
  } catch {
    return { valid: false, error: "URL invalid" };
  }
}

export const SEOAutoFixPanel = ({ audit }: Props) => {
  const qc = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [activeFix, setActiveFix] = useState<FixType>("all");
  const [proposal, setProposal] = useState<any>(null);
  const [variantB, setVariantB] = useState(false);

  // Inline canonical override (in Diff Viewer)
  const [editedCanonical, setEditedCanonical] = useState<string>("");
  const [editingCanonical, setEditingCanonical] = useState(false);

  // Conflict handling
  const [consistency, setConsistency] = useState<any>(null);
  const [overrideConflicts, setOverrideConflicts] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  // Manual modal state
  const [manualCanonical, setManualCanonical] = useState("");
  const [manualOverride, setManualOverride] = useState(false);
  const [manualReason, setManualReason] = useState("");
  const [manualConsistency, setManualConsistency] = useState<any>(null);

  const path = audit ? urlToPath(audit.url) : "";

  // Reset proposal-bound state when proposal changes
  useEffect(() => {
    if (proposal?.canonical_url) {
      setEditedCanonical(proposal.canonical_url);
    } else {
      setEditedCanonical("");
    }
    setEditingCanonical(false);
    setOverrideConflicts(false);
    setOverrideReason("");
    setConsistency(null);
  }, [proposal]);

  const editedValidation = useMemo(() => validateCanonical(editedCanonical), [editedCanonical]);
  const manualValidation = useMemo(() => validateCanonical(manualCanonical), [manualCanonical]);

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

  // ---- Consistency check (auto-runs when canonical changes in diff)
  const checkConsistencyMutation = useMutation({
    mutationFn: async (canonical: string) => {
      if (!path) throw new Error("No path");
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: {
          action: "check_canonical_consistency",
          url_path: path,
          canonical_url: canonical,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => setConsistency(data),
    onError: (e: any) => toast.error(e.message || "Eroare verificare"),
  });

  // Auto-check consistency when diff opens with a canonical
  useEffect(() => {
    if (diffOpen && proposal?.canonical_url && path) {
      checkConsistencyMutation.mutate(proposal.canonical_url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diffOpen, proposal?.canonical_url, path]);

  // ---- Apply (proposal-based)
  const applyMutation = useMutation({
    mutationFn: async ({ asVariantB }: { asVariantB: boolean }) => {
      if (!audit || !proposal) throw new Error("No proposal");
      const finalProposal = { ...proposal };
      // If admin edited canonical inline, use the validated normalized value
      if (editedCanonical && editedValidation.valid) {
        finalProposal.canonical_url = editedValidation.normalized;
      }
      const hasCritical = !!consistency?.has_critical;
      if (hasCritical && !overrideConflicts && finalProposal.canonical_url) {
        throw new Error("Conflicte critice detectate. Bifează 'Aplic în ciuda conflictului' pentru a continua.");
      }
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: {
          action: "apply_fix",
          url_path: path,
          payload: finalProposal,
          audit_id: audit.id,
          variant: asVariantB ? "B" : "A",
          ab_enabled: asVariantB ? true : undefined,
          notes: hasCritical && overrideConflicts ? `Override conflict: ${overrideReason || "no reason"}` : undefined,
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

  // ---- One-Click Canonical Fix (current page)
  const oneClickSingleMutation = useMutation({
    mutationFn: async (force: boolean) => {
      if (!audit) throw new Error("No audit");
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: {
          action: "one_click_canonical_fix",
          scope: "single",
          audit_id: audit.id,
          url_path: path,
          override_conflicts: force,
          override_reason: force ? "Admin one-click override" : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.applied) {
        toast.success(`Canonical aplicat: ${data.proposed_canonical}`);
        qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      } else if (data.reason === "conflicts_detected") {
        toast.error(`Conflicte detectate (${data.conflicts.length}). Folosește butonul "Force fix" pentru a aplica oricum.`);
        setConsistency(data);
      }
    },
    onError: (e: any) => toast.error(e.message || "Eroare one-click"),
  });

  // ---- One-Click Bulk
  const [bulkScope, setBulkScope] = useState<"single" | "bulk">("bulk");
  const [bulkOverride, setBulkOverride] = useState(false);
  const [bulkReason, setBulkReason] = useState("");
  const [bulkResults, setBulkResults] = useState<any>(null);
  const oneClickBulkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: {
          action: "one_click_canonical_fix",
          scope: "bulk",
          override_conflicts: bulkOverride,
          override_reason: bulkOverride ? bulkReason || "Bulk override" : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      setBulkResults(data);
      toast.success(`Bulk: ${data.applied} aplicate, ${data.skipped} skipped, ${data.errors} erori`);
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
    },
    onError: (e: any) => toast.error(e.message || "Bulk eșuat"),
  });

  // ---- Manual canonical apply
  const manualApplyMutation = useMutation({
    mutationFn: async () => {
      if (!manualValidation.valid) throw new Error(manualValidation.error || "URL invalid");
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: {
          action: "apply_manual_canonical",
          url_path: path,
          canonical_url: manualValidation.normalized,
          audit_id: audit?.id,
          override_conflicts: manualOverride,
          override_reason: manualOverride ? manualReason || "Manual admin override" : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.applied) {
        toast.success(`Canonical manual aplicat: ${data.proposed_canonical}`);
        setManualOpen(false);
        setManualCanonical("");
        setManualOverride(false);
        setManualReason("");
        setManualConsistency(null);
        qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      } else if (data.reason === "conflicts_detected") {
        setManualConsistency(data);
        toast.error("Conflicte detectate. Confirmă explicit pentru a aplica.");
      }
    },
    onError: (e: any) => toast.error(e.message || "Apply manual eșuat"),
  });

  // Manual: live consistency preview
  useEffect(() => {
    if (!manualOpen || !manualValidation.valid) {
      setManualConsistency(null);
      return;
    }
    const t = setTimeout(() => {
      checkConsistencyMutation.mutate(manualValidation.normalized!, {
        onSuccess: (data) => setManualConsistency(data),
      });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualOpen, manualCanonical]);

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

  // (Bulk full-SEO fix retained as edge action 'bulk_fix' — exposed via canonical bulk dialog if needed in future.)


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
  const hasCriticalConflict = !!consistency?.has_critical;

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
          {/* ===== One-Click Canonical Fix (highlight) ===== */}
          <div className="rounded-lg border border-primary/40 bg-background p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">One-Click Canonical Fix</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Generează automat canonical-ul corect (https://{CANONICAL_HOST} + path normalizat) și verifică consistența cu robots.txt + meta robots.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => oneClickSingleMutation.mutate(false)}
                disabled={oneClickSingleMutation.isPending}
              >
                {oneClickSingleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Fix pagina curentă
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setBulkOpen(true)}
              >
                <Layers className="h-4 w-4" /> Fix bulk (toate paginile)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setManualCanonical(`https://${CANONICAL_HOST}${path}`);
                  setManualOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" /> Edit manual
              </Button>
            </div>
          </div>

          {/* Per-issue Auto-Fix buttons */}
          {criticalIssues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Probleme critice detectate</p>
              <div className="space-y-1.5">
                {criticalIssues.map((issue: any, idx: number) => {
                  const txt = (issue.issue || "").toLowerCase();
                  let fix: FixType = "all";
                  if (txt.includes("canonical")) fix = "canonical";
                  else if (txt.includes("schema") || txt.includes("json-ld") || txt.includes("structured")) fix = "schema";
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

          {/* Generate full bundle + others */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => genMutation.mutate("all")} disabled={genMutation.isPending}>
              {genMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Generează pachet complet
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => genMutation.mutate("canonical")}
              disabled={genMutation.isPending}
            >
              {genMutation.isPending && genMutation.variables === "canonical"
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Link2 className="h-4 w-4" />}
              Generează canonical (AI)
            </Button>
            <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
              <History className="h-4 w-4" /> Istoric versiuni
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

      {/* ===================== Premium SEO Tabs (Internal Links / Competitor Diff / Schema Validator) ===================== */}
      <SEOPremiumTabs audit={audit} />


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

              {(proposal?.canonical_url || activeFix === "canonical" || activeFix === "all") && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> Canonical URL
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => setEditingCanonical((v) => !v)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      {editingCanonical ? "Cancel edit" : "Edit manual"}
                    </Button>
                  </div>
                  <div className="rounded-md border bg-muted/40 p-2 space-y-2">
                    <div className="text-xs">
                      <span className="text-muted-foreground">URL pagină:</span>{" "}
                      <code className="font-mono break-all">{audit.url}</code>
                    </div>
                    {editingCanonical ? (
                      <div className="space-y-1">
                        <Input
                          value={editedCanonical}
                          onChange={(e) => setEditedCanonical(e.target.value)}
                          placeholder={`https://${CANONICAL_HOST}/...`}
                          className="font-mono text-xs h-8"
                        />
                        {!editedValidation.valid && editedCanonical && (
                          <p className="text-xs text-destructive">⚠ {editedValidation.error}</p>
                        )}
                        {editedValidation.valid && editedValidation.normalized !== editedCanonical && (
                          <p className="text-xs text-amber-600">
                            Va fi normalizat la: <code>{editedValidation.normalized}</code>
                          </p>
                        )}
                        {editedValidation.valid && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => checkConsistencyMutation.mutate(editedValidation.normalized!)}
                            disabled={checkConsistencyMutation.isPending}
                          >
                            {checkConsistencyMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                            Re-verifică conflicte
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs">
                        <span className="text-muted-foreground">Canonical sugerat:</span>{" "}
                        <code className="font-mono break-all text-foreground">
                          {editedValidation.valid ? editedValidation.normalized : proposal?.canonical_url}
                        </code>
                      </div>
                    )}
                    {proposal?.canonical_reason && (
                      <p className="text-xs italic text-muted-foreground">{proposal.canonical_reason}</p>
                    )}
                  </div>

                  {/* Conflict display */}
                  {checkConsistencyMutation.isPending && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Verificare consistență robots.txt & meta robots…
                    </div>
                  )}
                  {consistency && (
                    <ConsistencyReport
                      consistency={consistency}
                      overrideConflicts={overrideConflicts}
                      setOverrideConflicts={setOverrideConflicts}
                      overrideReason={overrideReason}
                      setOverrideReason={setOverrideReason}
                    />
                  )}
                </div>
              )}

              {(proposal?.title || proposal?.meta_description || proposal?.canonical_url) && (
                <SerpPreview
                  title={proposal?.title || audit.suggested_title || ""}
                  description={proposal?.meta_description || audit.suggested_meta || ""}
                  url={audit.url}
                  canonical={editedValidation.valid ? editedValidation.normalized : (proposal?.canonical_url || proposal?.canonical)}
                  robots={proposal?.robots || (audit as any)?.robots || (audit as any)?.meta_robots || consistency?.meta_robots}
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
              disabled={
                applyMutation.isPending ||
                (editingCanonical && editedCanonical && !editedValidation.valid) ||
                (hasCriticalConflict && !overrideConflicts)
              }
            >
              {applyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {variantB ? "Aplică ca varianta B" : "Aplică direct"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== Manual Canonical Override Dialog ===================== */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" /> Manual Canonical Override
            </DialogTitle>
            <DialogDescription>
              Setează manual canonical-ul pentru această pagină. Sistemul verifică automat conflictele cu robots.txt și meta robots.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Pagină</label>
              <code className="block text-xs font-mono mt-1 break-all">{path}</code>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Canonical URL</label>
              <Input
                value={manualCanonical}
                onChange={(e) => setManualCanonical(e.target.value)}
                placeholder={`https://${CANONICAL_HOST}/path`}
                className="font-mono text-sm mt-1"
              />
              {!manualValidation.valid && manualCanonical && (
                <p className="text-xs text-destructive mt-1">⚠ {manualValidation.error}</p>
              )}
              {manualValidation.valid && manualValidation.normalized !== manualCanonical && (
                <p className="text-xs text-amber-600 mt-1">
                  Va fi normalizat la: <code>{manualValidation.normalized}</code>
                </p>
              )}
            </div>

            {manualValidation.valid && (
              <SerpPreview
                title={audit.suggested_title || ""}
                description={audit.suggested_meta || ""}
                url={audit.url}
                canonical={manualValidation.normalized}
                robots={manualConsistency?.meta_robots}
              />
            )}

            {manualConsistency && (
              <ConsistencyReport
                consistency={manualConsistency}
                overrideConflicts={manualOverride}
                setOverrideConflicts={setManualOverride}
                overrideReason={manualReason}
                setOverrideReason={setManualReason}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>Renunță</Button>
            <Button
              onClick={() => manualApplyMutation.mutate()}
              disabled={
                !manualValidation.valid ||
                manualApplyMutation.isPending ||
                (manualConsistency?.has_critical && !manualOverride)
              }
            >
              {manualApplyMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Aplică manual
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== One-Click Bulk Canonical Dialog ===================== */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" /> Bulk Canonical Fix
            </DialogTitle>
            <DialogDescription>
              Aplică canonical-ul corect pentru toate paginile auditate. Paginile deja corecte sunt sărite. Conflictele cu robots.txt sunt detectate automat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Atenție</AlertTitle>
              <AlertDescription className="text-xs">
                Va aplica canonical pe maximum 200 pagini. Paginile cu conflicte (Disallow / noindex) sunt sărite implicit.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-override"
                checked={bulkOverride}
                onCheckedChange={(c) => setBulkOverride(!!c)}
              />
              <label htmlFor="bulk-override" className="text-sm cursor-pointer">
                Aplică în ciuda conflictelor (override explicit)
              </label>
            </div>
            {bulkOverride && (
              <Textarea
                placeholder="Motiv override (audit-friendly, obligatoriu recomandat)"
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                rows={2}
                className="text-sm"
              />
            )}

            <Button onClick={() => oneClickBulkMutation.mutate()} disabled={oneClickBulkMutation.isPending}>
              {oneClickBulkMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Pornește Bulk Canonical Fix
            </Button>

            {bulkResults && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded border p-2 bg-emerald-50 dark:bg-emerald-950/20">
                    <div className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{bulkResults.applied}</div>
                    <div className="text-muted-foreground">Aplicate</div>
                  </div>
                  <div className="rounded border p-2 bg-amber-50 dark:bg-amber-950/20">
                    <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{bulkResults.skipped}</div>
                    <div className="text-muted-foreground">Skipped</div>
                  </div>
                  <div className="rounded border p-2 bg-destructive/10">
                    <div className="text-lg font-bold text-destructive">{bulkResults.errors}</div>
                    <div className="text-muted-foreground">Erori</div>
                  </div>
                </div>
                <ScrollArea className="max-h-60 border rounded p-2">
                  <ul className="text-xs space-y-1">
                    {(bulkResults.results || []).map((r: any, i: number) => (
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
                    {v.canonical_url && (
                      <p className="text-xs"><strong>Canonical:</strong> <code className="font-mono">{v.canonical_url}</code></p>
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
    </>
  );
};

// ============================================================================
// Conflict Report Component
// ============================================================================

const ConsistencyReport = ({
  consistency,
  overrideConflicts,
  setOverrideConflicts,
  overrideReason,
  setOverrideReason,
}: {
  consistency: any;
  overrideConflicts: boolean;
  setOverrideConflicts: (v: boolean) => void;
  overrideReason: string;
  setOverrideReason: (v: string) => void;
}) => {
  const conflicts = consistency?.conflicts || [];
  const hasCritical = !!consistency?.has_critical;

  if (conflicts.length === 0) {
    return (
      <Alert className="border-emerald-500/40 bg-emerald-500/5">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertTitle className="text-sm text-emerald-700 dark:text-emerald-400">Niciun conflict detectat</AlertTitle>
        <AlertDescription className="text-xs">
          Canonical-ul propus este consistent cu robots.txt
          {consistency?.robots?.cached ? " (din cache 24h)" : " (live fetch)"} și meta robots.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant={hasCritical ? "destructive" : "default"}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="text-sm">
        {hasCritical ? "Conflicte critice detectate" : "Avertismente"} ({conflicts.length})
      </AlertTitle>
      <AlertDescription className="text-xs space-y-2">
        <ul className="space-y-1.5 mt-2">
          {conflicts.map((c: any, i: number) => (
            <li key={i} className="flex gap-2">
              <Badge
                variant={c.severity === "critical" ? "destructive" : "secondary"}
                className="text-[10px] shrink-0"
              >
                {c.type}
              </Badge>
              <span>{c.message}</span>
            </li>
          ))}
        </ul>
        {hasCritical && (
          <div className="mt-3 p-2 rounded border bg-background space-y-2">
            <div className="flex items-start gap-2">
              <Checkbox
                id="override-conflicts"
                checked={overrideConflicts}
                onCheckedChange={(c) => setOverrideConflicts(!!c)}
              />
              <label htmlFor="override-conflicts" className="text-xs cursor-pointer">
                <strong>Aplic în ciuda conflictului</strong> (override explicit, va fi logat în audit trail)
              </label>
            </div>
            {overrideConflicts && (
              <Textarea
                placeholder="Motiv override (ex: pagina e blocată intenționat dar vrem canonical pentru dedup)"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={2}
                className="text-xs"
              />
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
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
