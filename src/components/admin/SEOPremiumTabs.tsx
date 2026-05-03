import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Loader2, Link2, RefreshCw, Check, X, Pencil, Sparkles,
  AlertTriangle, CheckCircle2, FileWarning, Code2, ExternalLink, Target,
  ChevronDown, ChevronRight, Copy, Gauge, MapPin, Search as SearchIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Convertește erorile (inclusiv non-2xx de la Edge Functions) într-un mesaj prietenos. */
const friendlyEdgeError = (e: any, fallback = "Operațiunea nu a putut fi finalizată."): string => {
  if (!e) return fallback;
  // FunctionsHttpError de la supabase-js include status + context
  const status = e?.context?.status ?? e?.status;
  const raw = (e?.message || "").toString();
  if (status === 401 || /Missing auth|Invalid token/i.test(raw)) return "Sesiunea a expirat. Reautentifică-te ca admin și reîncearcă.";
  if (status === 403) return "Nu ai permisiuni de admin pentru această acțiune.";
  if (status === 400) return raw.replace(/^Edge Function returned a non-2xx status code/i, "").trim() || "Datele trimise nu sunt valide.";
  if (status === 429) return "Prea multe cereri. Așteaptă câteva secunde și reîncearcă.";
  if (status && status >= 500) return "Serviciul backend a întâmpinat o problemă temporară. Încearcă din nou într-un minut.";
  if (/Failed to fetch|NetworkError/i.test(raw)) return "Conexiune instabilă. Verifică internetul și reîncearcă.";
  if (/non-2xx/i.test(raw)) return "Funcția backend a returnat o eroare. Verifică datele introduse și reîncearcă.";
  return raw || fallback;
};

interface Props {
  audit: {
    id: string;
    url: string;
    title?: string | null;
    suggested_title?: string | null;
    suggested_meta?: string | null;
  } | null;
}

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

export const SEOPremiumTabs = ({ audit }: Props) => {
  if (!audit) return null;
  const path = urlToPath(audit.url);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          SEO Premium Tools
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="links">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="links" className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Internal Links
            </TabsTrigger>
            <TabsTrigger value="competitor" className="gap-1.5">
              <Target className="h-3.5 w-3.5" /> Competitor Diff
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-1.5">
              <Code2 className="h-3.5 w-3.5" /> Schema Validator
            </TabsTrigger>
            <TabsTrigger value="benchmark" className="gap-1.5">
              <Gauge className="h-3.5 w-3.5" /> Benchmark
            </TabsTrigger>
          </TabsList>

          <TabsContent value="links" className="mt-4">
            <InternalLinksTab path={path} title={audit.suggested_title || audit.title || path} />
          </TabsContent>

          <TabsContent value="competitor" className="mt-4">
            <CompetitorDiffTab path={path} />
          </TabsContent>

          <TabsContent value="schema" className="mt-4">
            <SchemaValidatorTab path={path} />
          </TabsContent>

          <TabsContent value="benchmark" className="mt-4">
            <BenchmarkTab defaultOurUrl={audit.url} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

/* =============================================================
 * TAB 1 — Internal Links Applier
 * =============================================================*/
const InternalLinksTab = ({ path, title }: { path: string; title: string }) => {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAnchor, setEditAnchor] = useState("");
  const [confirmApply, setConfirmApply] = useState<{ id: string; anchor: string; target: string } | null>(null);

  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ["seo-internal-links", path],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_internal_link_suggestions")
        .select("*")
        .eq("source_url_path", path)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-internal-links", {
        body: { action: "suggest", source_url_path: path, source_title: title },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success("Sugestii generate");
      qc.invalidateQueries({ queryKey: ["seo-internal-links", path] });
    },
    onError: (e: any) => toast.error(friendlyEdgeError(e)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, anchor }: { id: string; status: string; anchor?: string }) => {
      if (anchor !== undefined) {
        const { error } = await supabase
          .from("seo_internal_link_suggestions")
          .update({ anchor_text: anchor })
          .eq("id", id);
        if (error) throw error;
      }
      const { data, error } = await supabase.functions.invoke("seo-internal-links", {
        body: { action: "update_status", suggestion_id: id, status },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.status === "applied" ? "Link marcat ca aplicat" : "Status actualizat");
      setEditingId(null);
      qc.invalidateQueries({ queryKey: ["seo-internal-links", path] });
    },
    onError: (e: any) => toast.error(friendlyEdgeError(e)),
  });

  const grouped = useMemo(() => {
    const g = { proposed: [] as any[], applied: [] as any[], rejected: [] as any[] };
    for (const s of suggestions) {
      const k = (s.status || "proposed") as keyof typeof g;
      (g[k] || g.proposed).push(s);
    }
    return g;
  }, [suggestions]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Sugestii AI de linking intern pentru <code className="font-mono">{path}</code>.
          Editează ancora dacă vrei, apoi marchează ca aplicat după ce ai inserat linkul în pagină.
        </p>
        <Button
          size="sm"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generează sugestii
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nu există sugestii. Apasă <strong>Generează sugestii</strong> ca să rulezi AI-ul.
        </div>
      ) : (
        <ScrollArea className="max-h-[420px] pr-2">
          <div className="space-y-4">
            {(["proposed", "applied", "rejected"] as const).map((bucket) =>
              grouped[bucket].length ? (
                <div key={bucket} className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    {bucket === "proposed" ? "Propuse" : bucket === "applied" ? "Aplicate" : "Respinse"}{" "}
                    ({grouped[bucket].length})
                  </p>
                  {grouped[bucket].map((s) => (
                    <div
                      key={s.id}
                      className={cn(
                        "rounded border p-2.5 space-y-1.5 text-sm",
                        bucket === "applied" && "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-300/50",
                        bucket === "rejected" && "bg-muted/40 opacity-70",
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0 space-y-1">
                          {editingId === s.id ? (
                            <Input
                              value={editAnchor}
                              onChange={(e) => setEditAnchor(e.target.value)}
                              className="h-7 text-sm"
                            />
                          ) : (
                            <p className="font-medium leading-tight">"{s.anchor_text}"</p>
                          )}
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <code className="font-mono break-all">{s.target_url_path}</code>
                          </div>
                          {s.reason && (
                            <p className="text-xs text-muted-foreground italic">{s.reason}</p>
                          )}
                        </div>
                        {typeof s.relevance_score === "number" && (
                          <Badge
                            variant={s.relevance_score >= 70 ? "default" : "secondary"}
                            className="shrink-0"
                          >
                            {s.relevance_score}
                          </Badge>
                        )}
                      </div>

                      {bucket === "proposed" && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {editingId === s.id ? (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                disabled={updateMutation.isPending || !editAnchor.trim()}
                                onClick={() => setConfirmApply({ id: s.id, anchor: editAnchor.trim(), target: s.target_url_path })}
                              >
                                <Check className="h-3 w-3" /> Salvează & aplică
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs"
                                disabled={updateMutation.isPending}
                                onClick={() => setConfirmApply({ id: s.id, anchor: s.anchor_text, target: s.target_url_path })}
                              >
                                <Check className="h-3 w-3" /> Marchează aplicat
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setEditingId(s.id);
                                  setEditAnchor(s.anchor_text);
                                }}
                              >
                                <Pencil className="h-3 w-3" /> Edit ancora
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive"
                                onClick={() => updateMutation.mutate({ id: s.id, status: "rejected" })}
                              >
                                <X className="h-3 w-3" /> Respinge
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null,
            )}
          </div>
        </ScrollArea>
      )}

      <AlertDialog open={!!confirmApply} onOpenChange={(o) => !o && setConfirmApply(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmi aplicarea linkului intern?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Marchează ca <strong>aplicat</strong> doar după ce ai inserat efectiv linkul în pagină.</p>
                {confirmApply && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] uppercase font-semibold text-muted-foreground">Preview HTML care trebuie inserat</p>
                    <div className="rounded border bg-muted/40 p-2 font-mono text-xs break-all">
                      &lt;a href="{confirmApply.target}"&gt;{confirmApply.anchor}&lt;/a&gt;
                    </div>
                    <p className="text-[11px] uppercase font-semibold text-muted-foreground pt-1">Cum se va afișa în text</p>
                    <div className="rounded border bg-background p-2 text-sm leading-relaxed">
                      … <a href={confirmApply.target} className="text-primary underline underline-offset-2">{confirmApply.anchor}</a> …
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Sursă: <code className="font-mono">{path}</code> → Țintă: <code className="font-mono">{confirmApply.target}</code>
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Statusul se schimbă imediat în "applied" și sugestia va fi mutată în secțiunea Aplicate.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmApply) return;
                updateMutation.mutate({
                  id: confirmApply.id,
                  status: "applied",
                  anchor: confirmApply.anchor,
                });
                setConfirmApply(null);
              }}
            >
              <Check className="h-4 w-4 mr-1" /> Confirm & aplică
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

/* =============================================================
 * TAB 2 — Competitor Diff
 * =============================================================*/
const CompetitorDiffTab = ({ path }: { path: string }) => {
  const qc = useQueryClient();
  const [competitorUrl, setCompetitorUrl] = useState("");

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ["seo-competitor-snapshots", path],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_competitor_snapshots")
        .select("*")
        .eq("our_url_path", path)
        .order("fetched_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: ourPage } = useQuery({
    queryKey: ["seo-our-page", path],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_overrides")
        .select("title, meta_description, json_ld")
        .eq("url_path", path)
        .maybeSingle();
      return data;
    },
  });

  const ourSchemaTypes = useMemo<string[]>(() => {
    const json = (ourPage as any)?.json_ld;
    if (!json) return [];
    const out: string[] = [];
    const walk = (n: any) => {
      if (!n) return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (typeof n === "object") {
        const t = n["@type"];
        if (t) (Array.isArray(t) ? t : [t]).forEach((x) => out.push(String(x)));
        if (n["@graph"]) walk(n["@graph"]);
      }
    };
    walk(json);
    return [...new Set(out)];
  }, [ourPage]);

  const ourTitle = (ourPage as any)?.title || "";
  const ourMeta = (ourPage as any)?.meta_description || "";

  const snapshotMutation = useMutation({
    mutationFn: async () => {
      if (!competitorUrl.trim()) throw new Error("URL competitor obligatoriu");
      const { data, error } = await supabase.functions.invoke("seo-competitor-snapshot", {
        body: { our_url_path: path, competitor_url: competitorUrl.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: async () => {
      toast.success("Snapshot competitor salvat — date brute disponibile imediat");
      setCompetitorUrl("");
      // Refetch instant ca rândurile noi (cu competitor_schema_raw) să apară fără reload manual.
      await qc.invalidateQueries({ queryKey: ["seo-competitor-snapshots", path] });
      await qc.refetchQueries({ queryKey: ["seo-competitor-snapshots", path], type: "active" });
    },
    onError: (e: any) => toast.error(friendlyEdgeError(e)),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs text-muted-foreground">URL competitor (storia, imobiliare.ro etc.)</label>
          <Input
            value={competitorUrl}
            onChange={(e) => setCompetitorUrl(e.target.value)}
            placeholder="https://www.storia.ro/..."
            className="h-9 mt-0.5"
          />
        </div>
        <Button
          size="sm"
          onClick={() => snapshotMutation.mutate()}
          disabled={snapshotMutation.isPending || !competitorUrl.trim()}
        >
          {snapshotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          Snapshot & analizează
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…
        </div>
      ) : snapshots.length === 0 ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nu există snapshot-uri pentru această pagină. Adaugă un competitor și rulează analiza.
        </div>
      ) : (
        <ScrollArea className="max-h-[440px] pr-2">
          <div className="space-y-3">
            {snapshots.map((s: any) => {
              const compTypes: string[] = Array.isArray(s.competitor_schema_types)
                ? s.competitor_schema_types.map(String)
                : [];
              const missingFromUs = compTypes.filter((t) => !ourSchemaTypes.includes(t));
              const missingFromThem = ourSchemaTypes.filter((t) => !compTypes.includes(t));
              const compWords = s.competitor_word_count || 0;
              const ourWords = 0; // unknown; show competitor side
              const wcDiff = compWords - ourWords;

              return (
                <div key={s.id} className="rounded border p-3 space-y-2.5 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{s.competitor_label || "Competitor"}</p>
                      <a
                        href={s.competitor_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline break-all flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" /> {s.competitor_url}
                      </a>
                    </div>
                    <Badge variant="outline" className="shrink-0 text-[10px]">
                      {new Date(s.fetched_at).toLocaleDateString("ro-RO")}
                    </Badge>
                  </div>

                  {/* Title diff */}
                  <DiffRow
                    label="Title"
                    ours={ourTitle}
                    theirs={s.competitor_title || "—"}
                  />
                  <DiffRow
                    label="Meta"
                    ours={ourMeta}
                    theirs={s.competitor_meta || "—"}
                  />
                  <DiffRow
                    label="H1"
                    ours={"—"}
                    theirs={s.competitor_h1 || "—"}
                  />

                  {/* Word count */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border p-2">
                      <p className="text-[10px] uppercase text-muted-foreground">Word count competitor</p>
                      <p className="font-semibold">{compWords.toLocaleString("ro-RO")}</p>
                    </div>
                    <div
                      className={cn(
                        "rounded border p-2",
                        wcDiff > 200 && "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20",
                      )}
                    >
                      <p className="text-[10px] uppercase text-muted-foreground">Diferență vs noi (estim.)</p>
                      <p className="font-semibold">
                        {wcDiff > 200 ? `+${wcDiff} cuvinte (gap conținut)` : `~${wcDiff}`}
                      </p>
                    </div>
                  </div>

                  {/* Schema diff */}
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Schema.org</p>
                    <div className="flex flex-wrap gap-1">
                      {compTypes.length === 0 && (
                        <span className="text-xs text-muted-foreground">Competitorul nu are JSON-LD.</span>
                      )}
                      {compTypes.map((t) => (
                        <Badge
                          key={t}
                          variant={ourSchemaTypes.includes(t) ? "secondary" : "destructive"}
                          className="text-[10px]"
                          title={ourSchemaTypes.includes(t) ? "Avem și noi" : "Lipsește la noi"}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                    {missingFromUs.length > 0 && (
                      <p className="text-xs text-destructive flex items-start gap-1">
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        Lipsesc la noi: <strong>{missingFromUs.join(", ")}</strong>
                      </p>
                    )}
                    {missingFromThem.length > 0 && (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-1">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                        Avantaj noi: <strong>{missingFromThem.join(", ")}</strong>
                      </p>
                    )}
                  </div>

                  {s.ai_summary && (
                    <p className="text-xs italic text-muted-foreground border-l-2 border-primary pl-2">
                      {s.ai_summary}
                    </p>
                  )}

                  {Array.isArray(s.ai_gaps) && s.ai_gaps.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">Gap-uri AI</p>
                      <ul className="text-xs space-y-0.5 list-disc list-inside">
                        {s.ai_gaps.map((g: any, i: number) => (
                          <li key={i}>{typeof g === "string" ? g : g.description || JSON.stringify(g)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Auto schema diff: missing properties + recommended snippet */}
                  <SchemaAutoDiff
                    competitorBlocks={Array.isArray(s.competitor_schema_raw) ? s.competitor_schema_raw : []}
                    competitorLabel={s.competitor_label || "competitor"}
                    ourJsonLd={(ourPage as any)?.json_ld}
                    path={path}
                    ourTitle={ourTitle}
                    ourMeta={ourMeta}
                  />

                  {/* Raw JSON-LD blocks (expandable code blocks) */}
                  <CompetitorJsonLdBlocks
                    blocks={Array.isArray(s.competitor_schema_raw) ? s.competitor_schema_raw : []}
                    ourJsonLd={(ourPage as any)?.json_ld}
                  />
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

const DiffRow = ({ label, ours, theirs }: { label: string; ours: string; theirs: string }) => {
  const same = ours.trim() && ours.trim() === theirs.trim();
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase font-semibold text-muted-foreground">{label}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        <div className="rounded border-l-2 border-primary bg-primary/5 p-1.5 text-xs">
          <p className="text-[9px] uppercase text-primary mb-0.5">noi</p>
          <p className="break-words">{ours || "—"}</p>
        </div>
        <div
          className={cn(
            "rounded border-l-2 p-1.5 text-xs",
            same
              ? "border-muted bg-muted/30"
              : "border-amber-400 bg-amber-50/50 dark:bg-amber-950/20",
          )}
        >
          <p className="text-[9px] uppercase text-muted-foreground mb-0.5">competitor</p>
          <p className="break-words">{theirs || "—"}</p>
        </div>
      </div>
    </div>
  );
};

/* =============================================================
 * Competitor JSON-LD expandable code blocks + property diff
 * =============================================================*/
function collectTypeProps(node: any, target: Record<string, Set<string>>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n) => collectTypeProps(n, target)); return; }
  const t = node["@type"];
  const types = Array.isArray(t) ? t : (t ? [t] : []);
  for (const tt of types) {
    const ts = String(tt);
    if (!target[ts]) target[ts] = new Set();
    Object.keys(node).filter((k) => !k.startsWith("@")).forEach((k) => target[ts].add(k));
  }
  if (node["@graph"] && Array.isArray(node["@graph"])) node["@graph"].forEach((g: any) => collectTypeProps(g, target));
  for (const v of Object.values(node)) {
    if (v && typeof v === "object") collectTypeProps(v, target);
  }
}

// Collect properties WITH a sample value per type (first occurrence wins)
function collectTypePropsWithValues(node: any, target: Record<string, Record<string, any>>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { node.forEach((n) => collectTypePropsWithValues(n, target)); return; }
  const t = node["@type"];
  const types = Array.isArray(t) ? t : (t ? [t] : []);
  for (const tt of types) {
    const ts = String(tt);
    if (!target[ts]) target[ts] = {};
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith("@")) continue;
      if (target[ts][k] === undefined) target[ts][k] = v;
    }
  }
  if (node["@graph"] && Array.isArray(node["@graph"])) node["@graph"].forEach((g: any) => collectTypePropsWithValues(g, target));
  for (const v of Object.values(node)) {
    if (v && typeof v === "object") collectTypePropsWithValues(v, target);
  }
}

function previewValue(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v.length > 80 ? v.slice(0, 77) + "…" : v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    const s = JSON.stringify(v);
    return s.length > 100 ? s.slice(0, 97) + "…" : s;
  } catch { return String(v); }
}

// Deep merge: only fill keys that are missing/empty on the target.
function mergeMissing(target: any, source: any): any {
  if (source === undefined || source === null) return target;
  if (target === undefined || target === null || target === "") return source;
  if (Array.isArray(target) || Array.isArray(source)) return target;
  if (typeof target === "object" && typeof source === "object") {
    const out: any = { ...target };
    for (const [k, v] of Object.entries(source)) {
      if (k.startsWith("@") && out[k] !== undefined) continue;
      out[k] = mergeMissing(out[k], v);
    }
    return out;
  }
  return target;
}

function applyAdditionsToOurJsonLd(ourJson: any, additions: any[]): any {
  let base = ourJson ? JSON.parse(JSON.stringify(ourJson)) : { "@context": "https://schema.org", "@graph": [] };
  const ensureGraph = (n: any): any => {
    if (n && typeof n === "object" && !Array.isArray(n) && Array.isArray(n["@graph"])) return n;
    if (Array.isArray(n)) return { "@context": "https://schema.org", "@graph": n };
    return { "@context": "https://schema.org", "@graph": [n].filter(Boolean) };
  };
  base = ensureGraph(base);
  const graph: any[] = base["@graph"];

  for (const add of additions) {
    const type = add?.["@type"];
    const idx = graph.findIndex((n) => {
      const t = n?.["@type"];
      return Array.isArray(t) ? t.includes(type) : t === type;
    });
    if (idx >= 0) graph[idx] = mergeMissing(graph[idx], add);
    else graph.push(add);
  }
  return base;
}

const SchemaAutoDiff = ({
  competitorBlocks, competitorLabel, ourJsonLd, path, ourTitle, ourMeta,
}: {
  competitorBlocks: any[]; competitorLabel: string; ourJsonLd: any;
  path: string; ourTitle: string; ourMeta: string;
}) => {
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorValue, setEditorValue] = useState("");
  const [editorError, setEditorError] = useState<string | null>(null);

  const diff = useMemo(() => {
    const ours: Record<string, Record<string, any>> = {};
    if (ourJsonLd) collectTypePropsWithValues(ourJsonLd, ours);
    const theirs: Record<string, Record<string, any>> = {};
    for (const b of competitorBlocks) {
      if (b?.valid !== false && b?.json && typeof b.json === "object") {
        collectTypePropsWithValues(b.json, theirs);
      }
    }
    const rows: Array<{ type: string; missing: Array<{ key: string; sample: any }>; weHave: boolean }> = [];
    for (const [type, props] of Object.entries(theirs)) {
      const ourProps = ours[type] || {};
      const missing = Object.entries(props)
        .filter(([k]) => ourProps[k] === undefined || ourProps[k] === null || ourProps[k] === "")
        .map(([key, sample]) => ({ key, sample }));
      if (missing.length === 0 && ours[type]) continue;
      rows.push({ type, missing, weHave: !!ours[type] });
    }
    const recommended = rows
      .filter((r) => r.missing.length > 0)
      .map((r) => {
        const obj: Record<string, any> = { "@context": "https://schema.org", "@type": r.type };
        for (const m of r.missing) obj[m.key] = m.sample;
        return obj;
      });
    return { rows, recommended };
  }, [competitorBlocks, ourJsonLd]);

  const applyMutation = useMutation({
    mutationFn: async (additions: any[]) => {
      if (!Array.isArray(additions) || additions.length === 0) throw new Error("Nimic de aplicat");
      const merged = applyAdditionsToOurJsonLd(ourJsonLd, additions);
      const payload: any = { url_path: path, json_ld: merged, updated_at: new Date().toISOString() };
      if (ourTitle) payload.title = ourTitle;
      if (ourMeta) payload.meta_description = ourMeta;
      const { error } = await supabase.from("seo_overrides").upsert(payload, { onConflict: "url_path" });
      if (error) throw error;
      return merged;
    },
    onSuccess: () => {
      toast.success("JSON-LD aplicat în seo_overrides");
      qc.invalidateQueries({ queryKey: ["seo-our-page", path] });
      setEditorOpen(false);
    },
    onError: (e: any) => {
      const msg = friendlyEdgeError(e, "Eroare la aplicare");
      toast.error(msg);
      setEditorError(msg);
    },
  });

  const totalMissing = diff.rows.reduce((a, r) => a + r.missing.length, 0);
  const recommendedJson = JSON.stringify(diff.recommended, null, 2);

  const previewMerged = useMemo(() => {
    try {
      const parsed = JSON.parse(editorValue || "[]");
      const additions = Array.isArray(parsed) ? parsed : [parsed];
      const valid = additions.filter((a) => a && typeof a === "object" && a["@type"]);
      return JSON.stringify(applyAdditionsToOurJsonLd(ourJsonLd, valid), null, 2);
    } catch {
      return "// JSON invalid — corectează stânga";
    }
  }, [editorValue, ourJsonLd]);

  if (diff.rows.length === 0) {
    return (
      <div className="rounded border border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-2 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" /> Schema match: avem toate tipurile și proprietățile cheie ale competitorului.
      </div>
    );
  }

  const copyRec = () => {
    navigator.clipboard.writeText(recommendedJson).then(
      () => toast.success("Snippet recomandat copiat"),
      () => toast.error("Nu s-a putut copia"),
    );
  };

  const openEditor = () => {
    setEditorValue(recommendedJson);
    setEditorError(null);
    setEditorOpen(true);
  };

  const handleApply = () => {
    setEditorError(null);
    let parsed: any;
    try { parsed = JSON.parse(editorValue); }
    catch (e: any) { setEditorError("JSON invalid: " + e.message); return; }
    const additions = Array.isArray(parsed) ? parsed : [parsed];
    const valid = additions.filter((a) => a && typeof a === "object" && a["@type"]);
    if (valid.length === 0) { setEditorError("Niciun obiect valid cu @type"); return; }
    applyMutation.mutate(valid);
  };

  return (
    <div className="space-y-2 rounded border border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/20 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1">
          <AlertTriangle className="h-3.5 w-3.5" /> Schema diff vs {competitorLabel}
        </p>
        <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
          {totalMissing} props lipsă
        </Badge>
      </div>

      <div className="space-y-1.5">
        {diff.rows.map((r) => (
          <div key={r.type} className="rounded bg-background/60 border p-1.5 text-xs space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant={r.weHave ? "secondary" : "destructive"} className="text-[10px]">{r.type}</Badge>
              {!r.weHave && <span className="text-[10px] text-destructive">tip lipsă la noi</span>}
              {r.weHave && r.missing.length > 0 && (
                <span className="text-[10px] text-muted-foreground">avem tipul, lipsesc {r.missing.length} proprietăți</span>
              )}
            </div>
            {r.missing.length > 0 && (
              <table className="w-full text-[11px]">
                <tbody>
                  {r.missing.map((m) => (
                    <tr key={m.key} className="border-t border-border/40">
                      <td className="py-0.5 pr-2 font-mono text-destructive whitespace-nowrap align-top">{m.key}</td>
                      <td className="py-0.5 text-muted-foreground break-all">{previewValue(m.sample)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {diff.recommended.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[10px] uppercase text-muted-foreground">Recomandare JSON-LD (de adăugat la noi)</p>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-6 px-2" onClick={copyRec}>
                <Copy className="h-3 w-3 mr-1" /> Copiază
              </Button>
              <Button size="sm" variant="default" className="h-6 px-2" onClick={openEditor}>
                <Pencil className="h-3 w-3 mr-1" /> Editează și aplică
              </Button>
            </div>
          </div>
          <pre className="rounded bg-muted/60 p-2 text-[11px] font-mono overflow-x-auto max-h-56">
            <code>{recommendedJson}</code>
          </pre>
        </div>
      )}

      <SchemaApplyDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editorValue={editorValue}
        setEditorValue={setEditorValue}
        editorError={editorError}
        previewMerged={previewMerged}
        onApply={handleApply}
        isApplying={applyMutation.isPending}
      />
    </div>
  );
};

const SchemaApplyDialog = ({
  open, onOpenChange, editorValue, setEditorValue, editorError, previewMerged, onApply, isApplying,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editorValue: string;
  setEditorValue: (v: string) => void;
  editorError: string | null;
  previewMerged: string;
  onApply: () => void;
  isApplying: boolean;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editează JSON-LD recomandat</DialogTitle>
          <DialogDescription>
            Doar proprietățile lipsă (sau goale) vor fi adăugate la JSON-LD-ul nostru. Restul rămâne neatins.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground">Adăugiri (editabil)</p>
            <textarea
              className="w-full h-72 rounded border bg-background p-2 text-[11px] font-mono"
              value={editorValue}
              onChange={(e) => setEditorValue(e.target.value)}
              spellCheck={false}
            />
            {editorError && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {editorError}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase text-muted-foreground">Preview JSON-LD final (după merge)</p>
            <pre className="w-full h-72 rounded border bg-muted/40 p-2 text-[11px] font-mono overflow-auto">
              <code>{previewMerged}</code>
            </pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isApplying}>Anulează</Button>
          <Button onClick={onApply} disabled={isApplying}>
            {isApplying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
            Aplică doar proprietățile lipsă
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CompetitorJsonLdBlocks = ({ blocks, ourJsonLd }: { blocks: any[]; ourJsonLd: any }) => {
  if (!blocks.length) return null;

  const ourProps = useMemo(() => {
    const m: Record<string, Set<string>> = {};
    if (ourJsonLd) collectTypeProps(ourJsonLd, m);
    return m;
  }, [ourJsonLd]);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase text-muted-foreground">JSON-LD competitor ({blocks.length})</p>
      {blocks.map((b, i) => (
        <CompetitorJsonLdBlock key={i} block={b} ourProps={ourProps} />
      ))}
    </div>
  );
};

const CompetitorJsonLdBlock = ({ block, ourProps }: { block: any; ourProps: Record<string, Set<string>> }) => {
  const [open, setOpen] = useState(false);
  const json = block?.json;
  const valid = block?.valid !== false;
  const compTypes: string[] = Array.isArray(block?.types) ? block.types : [];
  const pretty = useMemo(() => {
    if (typeof json === "string") return json;
    try { return JSON.stringify(json, null, 2); } catch { return String(json); }
  }, [json]);

  // Per-type property diff (only for valid blocks).
  const propDiff = useMemo(() => {
    if (!valid || typeof json !== "object" || !json) return [] as Array<{ type: string; missingFromUs: string[]; sharedCount: number }>;
    const compMap: Record<string, Set<string>> = {};
    collectTypeProps(json, compMap);
    return Object.entries(compMap).map(([type, props]) => {
      const ours = ourProps[type] || new Set<string>();
      const missingFromUs = [...props].filter((p) => !ours.has(p));
      const sharedCount = [...props].filter((p) => ours.has(p)).length;
      return { type, missingFromUs, sharedCount };
    });
  }, [valid, json, ourProps]);

  const totalMissing = propDiff.reduce((acc, d) => acc + d.missingFromUs.length, 0);

  const copy = () => {
    navigator.clipboard.writeText(pretty).then(
      () => toast.success("JSON-LD copiat"),
      () => toast.error("Nu s-a putut copia"),
    );
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("rounded border", !valid && "border-destructive/50")}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-muted/40"
          >
            <div className="flex items-center gap-2 min-w-0">
              {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              <span className="text-xs font-mono">block#{(block?.index ?? 0) + 1}</span>
              {!valid && <Badge variant="destructive" className="text-[10px]">JSON invalid</Badge>}
              {valid && compTypes.slice(0, 3).map((t) => (
                <Badge key={t} variant={ourProps[t] ? "secondary" : "destructive"} className="text-[10px]" title={ourProps[t] ? "Avem și noi acest tip" : "Lipsește la noi"}>
                  {t}
                </Badge>
              ))}
              {compTypes.length > 3 && <span className="text-[10px] text-muted-foreground">+{compTypes.length - 3}</span>}
            </div>
            {totalMissing > 0 && (
              <Badge variant="outline" className="shrink-0 text-[10px] border-destructive/40 text-destructive">
                {totalMissing} props lipsă
              </Badge>
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-2 space-y-2">
            {!valid && block?.error && (
              <p className="text-xs text-destructive">Eroare parse: {block.error}</p>
            )}

            {propDiff.length > 0 && (
              <div className="space-y-1">
                {propDiff.map((d) => (
                  <div key={d.type} className="text-xs space-y-0.5">
                    <p>
                      <strong>{d.type}</strong>{" "}
                      <span className="text-muted-foreground">— {d.sharedCount} comune</span>
                    </p>
                    {d.missingFromUs.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {d.missingFromUs.map((p) => (
                          <Badge key={p} variant="destructive" className="text-[10px]" title="Proprietate Schema.org pe care competitorul o are, dar noi nu">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-emerald-600 dark:text-emerald-400 text-[11px]">✓ avem toate proprietățile</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <pre className="rounded bg-muted/60 p-2 text-[11px] font-mono overflow-x-auto max-h-72">
                <code>{pretty}</code>
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-1 right-1 h-6 px-1.5"
                onClick={copy}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};


const SchemaValidatorTab = ({ path }: { path: string }) => {
  const qc = useQueryClient();

  const { data: validations = [], isLoading } = useQuery({
    queryKey: ["seo-schema-validations", path],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_schema_validations")
        .select("*")
        .eq("url_path", path)
        .order("validated_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  const validateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-schema-validator", {
        body: { url_path: path },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (d: any) => {
      const status = d?.status || "—";
      toast.success(`Validare: ${status}`);
      qc.invalidateQueries({ queryKey: ["seo-schema-validations", path] });
    },
    onError: (e: any) => toast.error(friendlyEdgeError(e)),
  });

  const latest = validations[0] as any;

  const statusVisual = (status: string) => {
    switch (status) {
      case "valid":
        return { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/20", icon: CheckCircle2, label: "Valid" };
      case "warnings":
        return { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20", icon: FileWarning, label: "Avertismente" };
      case "invalid":
        return { color: "text-destructive", bg: "bg-destructive/10", icon: AlertTriangle, label: "Invalid" };
      default:
        return { color: "text-muted-foreground", bg: "bg-muted", icon: AlertTriangle, label: "Eroare" };
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Validează JSON-LD-ul live de pe <code className="font-mono">{path}</code> și extrage erorile critice.
        </p>
        <Button
          size="sm"
          onClick={() => validateMutation.mutate()}
          disabled={validateMutation.isPending}
        >
          {validateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Validează acum
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…
        </div>
      ) : !latest ? (
        <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nicio validare salvată. Apasă <strong>Validează acum</strong>.
        </div>
      ) : (
        <>
          {(() => {
            const v = statusVisual(latest.status);
            const Icon = v.icon;
            const errors: string[] = Array.isArray(latest.errors) ? latest.errors : [];
            const warnings: string[] = Array.isArray(latest.warnings) ? latest.warnings : [];
            const types: string[] = Array.isArray(latest.schema_types) ? latest.schema_types : [];
            return (
              <div className={cn("rounded-lg border p-3 space-y-3", v.bg)}>
                <div className="flex items-center justify-between">
                  <div className={cn("flex items-center gap-2 font-semibold", v.color)}>
                    <Icon className="h-5 w-5" />
                    {v.label}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(latest.validated_at).toLocaleString("ro-RO")}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <Stat n={types.length} label="Tipuri schema" />
                  <Stat n={errors.length} label="Erori critice" tone={errors.length > 0 ? "danger" : "ok"} />
                  <Stat n={warnings.length} label="Avertismente" tone={warnings.length > 0 ? "warn" : "ok"} />
                </div>

                {types.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground">Tipuri detectate</p>
                    <div className="flex flex-wrap gap-1">
                      {types.map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {errors.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-destructive">Erori critice</p>
                    <ul className="text-xs space-y-1">
                      {errors.map((e, i) => (
                        <li key={i} className="flex items-start gap-1.5 rounded bg-background/60 p-1.5 border border-destructive/30">
                          <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                          <span className="break-words">{e}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {warnings.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-semibold text-amber-600 dark:text-amber-400">Avertismente</p>
                    <ul className="text-xs space-y-1">
                      {warnings.map((w, i) => (
                        <li key={i} className="flex items-start gap-1.5 rounded bg-background/60 p-1.5 border border-amber-300/50">
                          <FileWarning className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                          <span className="break-words">{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Per-block annotated code with inline errors */}
                <SchemaCodeBlocks
                  rawBlocks={Array.isArray((latest as any).raw_blocks) ? (latest as any).raw_blocks : []}
                  errorLocations={Array.isArray((latest as any).error_locations) ? (latest as any).error_locations : []}
                />
              </div>
            );
          })()}

          {validations.length > 1 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Istoric validări</p>
              <div className="space-y-1">
                {validations.slice(1, 6).map((v: any) => {
                  const sv = statusVisual(v.status);
                  const Icon = sv.icon;
                  const errCount = Array.isArray(v.errors) ? v.errors.length : 0;
                  return (
                    <div key={v.id} className="flex items-center justify-between rounded border p-1.5 text-xs">
                      <div className={cn("flex items-center gap-1.5", sv.color)}>
                        <Icon className="h-3 w-3" />
                        <span>{sv.label}</span>
                        {errCount > 0 && <span className="text-muted-foreground">· {errCount} erori</span>}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(v.validated_at).toLocaleString("ro-RO")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Stat = ({ n, label, tone }: { n: number; label: string; tone?: "ok" | "warn" | "danger" }) => (
  <div
    className={cn(
      "rounded border p-2 bg-background/60",
      tone === "danger" && "border-destructive/40",
      tone === "warn" && "border-amber-400/50",
    )}
  >
    <p
      className={cn(
        "text-lg font-bold",
        tone === "danger" && "text-destructive",
        tone === "warn" && "text-amber-600 dark:text-amber-400",
      )}
    >
      {n}
    </p>
    <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
  </div>
);

/* =============================================================
 * Annotated JSON-LD code blocks with per-line errors
 * =============================================================*/
interface ErrorLoc {
  block_index: number;
  line: number;
  column?: number;
  snippet?: string;
  message: string;
  severity: "error" | "warning";
  field_path?: string;
}

const SchemaCodeBlocks = ({
  rawBlocks,
  errorLocations,
}: {
  rawBlocks: Array<{ index: number; source: string; parse_error?: string; types?: string[] }>;
  errorLocations: ErrorLoc[];
}) => {
  if (!rawBlocks.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase font-semibold text-muted-foreground">JSON-LD pe pagină ({rawBlocks.length})</p>
      {rawBlocks.map((b) => {
        const blockErrs = errorLocations.filter((e) => e.block_index === b.index);
        return <SchemaCodeBlock key={b.index} block={b} issues={blockErrs} />;
      })}
    </div>
  );
};

const SchemaCodeBlock = ({
  block,
  issues,
}: {
  block: { index: number; source: string; parse_error?: string; types?: string[] };
  issues: ErrorLoc[];
}) => {
  const [open, setOpen] = useState(issues.some((i) => i.severity === "error"));
  const lines = useMemo(() => (block.source || "").split("\n"), [block.source]);
  const issuesByLine = useMemo(() => {
    const m: Record<number, ErrorLoc[]> = {};
    for (const i of issues) {
      (m[i.line] = m[i.line] || []).push(i);
    }
    return m;
  }, [issues]);
  const errCount = issues.filter((i) => i.severity === "error").length;
  const warnCount = issues.filter((i) => i.severity === "warning").length;

  return (
    <TooltipProvider delayDuration={150}>
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn("rounded border", errCount > 0 && "border-destructive/50", errCount === 0 && warnCount > 0 && "border-amber-400/50")}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 hover:bg-muted/40">
            <div className="flex items-center gap-2 min-w-0">
              {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              <span className="text-xs font-mono">block#{block.index + 1}</span>
              {block.parse_error && (
                <Tooltip>
                  <TooltipTrigger asChild><Badge variant="destructive" className="text-[10px] cursor-help">JSON invalid</Badge></TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">{block.parse_error}</TooltipContent>
                </Tooltip>
              )}
              {(block.types || []).slice(0, 3).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
              ))}
            </div>
            <div className="flex items-center gap-1">
              {errCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild><Badge variant="destructive" className="text-[10px] cursor-help">{errCount} err</Badge></TooltipTrigger>
                  <TooltipContent className="max-w-sm text-xs">
                    <strong className="block mb-1">Erori critice (blochează validarea Schema.org):</strong>
                    {issues.filter(i => i.severity === "error").slice(0, 5).map((i, k) => (
                      <div key={k}>• L{i.line}: {i.message}</div>
                    ))}
                  </TooltipContent>
                </Tooltip>
              )}
              {warnCount > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild><Badge variant="outline" className="text-[10px] border-amber-400/60 cursor-help">{warnCount} warn</Badge></TooltipTrigger>
                  <TooltipContent className="max-w-sm text-xs">
                    <strong className="block mb-1">Avertismente (recomandate, dar nu blocante):</strong>
                    {issues.filter(i => i.severity === "warning").slice(0, 5).map((i, k) => (
                      <div key={k}>• L{i.line}: {i.message}</div>
                    ))}
                  </TooltipContent>
                </Tooltip>
              )}
              {errCount === 0 && warnCount === 0 && (
                <Tooltip>
                  <TooltipTrigger asChild><Badge variant="secondary" className="text-[10px] cursor-help">✓ OK</Badge></TooltipTrigger>
                  <TooltipContent className="text-xs">Block JSON-LD valid, fără probleme detectate.</TooltipContent>
                </Tooltip>
              )}
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t bg-muted/30">
            <pre className="text-[11px] font-mono overflow-x-auto max-h-96">
              <code className="block">
                {lines.map((ln, idx) => {
                  const lineNo = idx + 1;
                  const lineIssues = issuesByLine[lineNo] || [];
                  const hasErr = lineIssues.some((i) => i.severity === "error");
                  const hasWarn = lineIssues.some((i) => i.severity === "warning");
                  return (
                    <div key={lineNo}>
                      <div
                        className={cn(
                          "flex items-start gap-2 px-2 py-px",
                          hasErr && "bg-destructive/10",
                          !hasErr && hasWarn && "bg-amber-100/50 dark:bg-amber-950/20",
                        )}
                      >
                        <span className="select-none text-muted-foreground tabular-nums w-8 text-right shrink-0">
                          {lineNo}
                        </span>
                        <span className="whitespace-pre break-all">{ln || " "}</span>
                      </div>
                      {lineIssues.map((iss, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-start gap-1.5 px-2 py-1 border-l-2 ml-8 text-[11px]",
                            iss.severity === "error"
                              ? "border-destructive bg-destructive/5 text-destructive"
                              : "border-amber-400 bg-amber-50/40 dark:bg-amber-950/10 text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {iss.severity === "error"
                            ? <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                            : <FileWarning className="h-3 w-3 mt-0.5 shrink-0" />}
                          <span>
                            <strong>L{iss.line}{iss.column ? `:${iss.column}` : ""}</strong> — {iss.message}
                            {iss.field_path && <span className="opacity-70"> ({iss.field_path})</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
    </TooltipProvider>
  );
};

/* =============================================================
 * TAB 4 — Benchmark & Gap Analysis (RealTrust vs Competitor)
 * =============================================================*/
type ApplyMode = null | "schema" | "local_links" | "h2_briefs";

const BenchmarkTab = ({ defaultOurUrl }: { defaultOurUrl: string }) => {
  const [ourUrl, setOurUrl] = useState(defaultOurUrl || "https://www.realtrust.ro");
  const [compUrl, setCompUrl] = useState("");
  const [result, setResult] = useState<any>(null);
  const [applyMode, setApplyMode] = useState<ApplyMode>(null);

  const benchmark = useMutation({
    mutationFn: async () => {
      if (!ourUrl.trim() || !compUrl.trim()) throw new Error("Ambele URL-uri sunt obligatorii");
      const { data, error } = await supabase.functions.invoke("seo-benchmark", {
        body: { our_url: ourUrl.trim(), competitor_url: compUrl.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success("Benchmark complet");
    },
    onError: (e: any) => toast.error(friendlyEdgeError(e)),
  });

  // Compute H2 gaps (titluri pe care le au ei și noi nu, normalizate)
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
  const h2Gaps: string[] = useMemo(() => {
    if (!result) return [];
    const ours = new Set((result.ours?.h2 || []).map((x: string) => norm(x)));
    return (result.theirs?.h2 || []).filter((x: string) => x && !ours.has(norm(x))).slice(0, 8);
  }, [result]);

  const apply = useMutation({
    mutationFn: async (mode: Exclude<ApplyMode, null>) => {
      const body: any = { mode, our_url: ourUrl.trim(), competitor_url: compUrl.trim() };
      if (mode === "schema") body.best_schema = result.best_schema;
      if (mode === "local_links") body.missing_keywords = result.local_keywords?.only_theirs || [];
      if (mode === "h2_briefs") body.h2_titles = h2Gaps;
      const { data, error } = await supabase.functions.invoke("seo-benchmark-apply", { body });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      const m = data?.mode;
      if (m === "schema") toast.success("Schema aplicată — live pe site la următoarea reîncărcare");
      else if (m === "local_links") toast.success(`${data.inserted} linkuri interne adăugate (status pending)`);
      else if (m === "h2_briefs") toast.success(`${data.generated} drafturi H2 salvate`);
      setApplyMode(null);
    },
    onError: (e: any) => { toast.error(friendlyEdgeError(e)); setApplyMode(null); },
  });

  // ============= Pachet Complet (3-pillar review modal) =============
  const [fullOpen, setFullOpen] = useState(false);
  const [editSchema, setEditSchema] = useState<string>("");
  const [editSchemaError, setEditSchemaError] = useState<string | null>(null);
  const [editLinks, setEditLinks] = useState<Array<{ keyword: string; target_url_path: string; anchor_text: string; enabled: boolean }>>([]);
  const [editDrafts, setEditDrafts] = useState<Array<{ h2_title: string; draft_content: string; enabled: boolean }>>([]);

  const previewFull = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("seo-benchmark-apply", {
        body: {
          mode: "preview_full",
          our_url: ourUrl.trim(),
          competitor_url: compUrl.trim(),
          h2_titles: h2Gaps,
          missing_keywords: result?.local_keywords?.only_theirs || [],
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      setEditSchema(JSON.stringify(result?.best_schema || {}, null, 2));
      setEditSchemaError(null);
      setEditLinks((data.links || []).map((l: any) => ({ ...l, enabled: true })));
      setEditDrafts((data.drafts || []).map((d: any) => ({ ...d, enabled: !!d.draft_content })));
      setFullOpen(true);
    },
    onError: (e: any) => toast.error(friendlyEdgeError(e)),
  });

  const applyFull = useMutation({
    mutationFn: async () => {
      let parsedSchema: any = null;
      try { parsedSchema = JSON.parse(editSchema); setEditSchemaError(null); }
      catch (e: any) { setEditSchemaError(e.message); throw new Error("JSON Schema invalid: " + e.message); }
      const body = {
        mode: "apply_full",
        our_url: ourUrl.trim(),
        competitor_url: compUrl.trim(),
        best_schema: parsedSchema,
        links: editLinks.filter((l) => l.enabled && l.anchor_text && l.target_url_path),
        drafts: editDrafts.filter((d) => d.enabled && d.h2_title && d.draft_content),
      };
      const { data, error } = await supabase.functions.invoke("seo-benchmark-apply", { body });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (data: any) => {
      const s = data.summary || {};
      toast.success(`Pachet aplicat: ${s.schema ? "✓ Schema" : "—"} · ${s.links} linkuri · ${s.briefs} drafturi`);
      setFullOpen(false);
    },
    onError: (e: any) => toast.error(friendlyEdgeError(e)),
  });

  const copyBest = () => {
    if (!result?.best_schema) return;
    const txt = `<script type="application/ld+json">\n${JSON.stringify(result.best_schema, null, 2)}\n</script>`;
    navigator.clipboard.writeText(txt).then(
      () => toast.success("Schema „best-in-class” copiată"),
      () => toast.error("Copiere eșuată"),
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">URL RealTrust</label>
          <Input value={ourUrl} onChange={(e) => setOurUrl(e.target.value)} className="h-9 mt-0.5" placeholder="https://www.realtrust.ro/..." />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">URL competitor</label>
          <Input value={compUrl} onChange={(e) => setCompUrl(e.target.value)} className="h-9 mt-0.5" placeholder="https://www.apostu.ro/..." />
        </div>
      </div>
      <Button size="sm" onClick={() => benchmark.mutate()} disabled={benchmark.isPending || !compUrl.trim()}>
        {benchmark.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Gauge className="h-4 w-4 mr-1.5" />}
        Compară side-by-side
      </Button>

      {result && (
        <div className="space-y-4">
          {/* PageSpeed */}
          <BenchmarkSection title="Core Web Vitals (mobile)" icon={<Gauge className="h-4 w-4" />}>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <PsiCol label="RealTrust" data={result.pagespeed?.ours} />
              <PsiCol label="Competitor" data={result.pagespeed?.theirs} />
            </div>
          </BenchmarkSection>

          {/* SERP Preview */}
          <BenchmarkSection title="SERP Preview" icon={<SearchIcon className="h-4 w-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SerpPreview label="RealTrust" data={result.ours} richSnippet={result.rich_snippet_features?.ours} />
              <SerpPreview label="Competitor" data={result.theirs} richSnippet={result.rich_snippet_features?.theirs} />
            </div>
          </BenchmarkSection>

          {/* Headings & Meta */}
          <BenchmarkSection title="Title / Meta / Headings" icon={<Code2 className="h-4 w-4" />}>
            <DiffRow label="Title" ours={result.ours?.title || "—"} theirs={result.theirs?.title || "—"} />
            <div className="mt-2"><DiffRow label="Meta" ours={result.ours?.meta || "—"} theirs={result.theirs?.meta || "—"} /></div>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <HeadingsBox label="H1 noi" items={result.ours?.h1} accent="primary" />
              <HeadingsBox label="H1 competitor" items={result.theirs?.h1} accent="amber" />
              <HeadingsBox label={`H2 noi (${result.ours?.h2?.length || 0})`} items={result.ours?.h2} accent="primary" />
              <HeadingsBox label={`H2 competitor (${result.theirs?.h2?.length || 0})`} items={result.theirs?.h2} accent="amber" />
            </div>
          </BenchmarkSection>

          {/* Schema gaps */}
          <BenchmarkSection title="Schema.org gap" icon={<AlertTriangle className="h-4 w-4" />}>
            {(!result.schema_gaps || result.schema_gaps.length === 0) ? (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Avem toate tipurile competitorului.
              </p>
            ) : (
              <div className="space-y-1.5">
                {result.schema_gaps.map((g: any) => (
                  <div key={g.type} className="rounded border p-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={g.we_have_type ? "secondary" : "destructive"} className="text-[10px]">{g.type}</Badge>
                      {!g.we_have_type && <span className="text-[10px] text-destructive">tip lipsă</span>}
                      {g.missing_props?.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{g.missing_props.length} props lipsă</span>
                      )}
                    </div>
                    {g.missing_props?.length > 0 && (
                      <p className="mt-1 font-mono text-[11px] text-destructive break-all">
                        {g.missing_props.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </BenchmarkSection>

          {/* Best-in-class schema */}
          <BenchmarkSection title="Generator Schema „Best-in-Class”" icon={<Sparkles className="h-4 w-4" />}>
            <div className="flex flex-wrap justify-end gap-2 mb-1">
              <Button size="sm" variant="outline" className="h-7" onClick={copyBest}>
                <Copy className="h-3 w-3 mr-1" /> Copiază &lt;script&gt;
              </Button>
              <Button size="sm" className="h-7" onClick={() => setApplyMode("schema")} disabled={!result.best_schema}>
                <Sparkles className="h-3 w-3 mr-1" /> Aplică pe site (1-click)
              </Button>
            </div>
            <pre className="rounded bg-muted/60 p-2 text-[11px] font-mono overflow-x-auto max-h-72">
              <code>{JSON.stringify(result.best_schema, null, 2)}</code>
            </pre>
          </BenchmarkSection>

          {/* Local SEO */}
          <BenchmarkSection title="Local SEO — Cartiere Timișoara" icon={<MapPin className="h-4 w-4" />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <KwBox label="RealTrust găsește" items={result.local_keywords?.ours} accent="primary" />
              <KwBox label="Competitor găsește" items={result.local_keywords?.theirs} accent="amber" />
            </div>
            {result.local_keywords?.only_theirs?.length > 0 && (
              <>
                <p className="mt-2 text-xs text-destructive flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  Lipsesc la noi: <strong>{result.local_keywords.only_theirs.join(", ")}</strong>
                </p>
                <Button size="sm" variant="outline" className="h-7 mt-2" onClick={() => setApplyMode("local_links")}>
                  <Sparkles className="h-3 w-3 mr-1" /> Generează linkuri interne ({result.local_keywords.only_theirs.length})
                </Button>
              </>
            )}
            {result.local_keywords?.only_ours?.length > 0 && (
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400 flex items-start gap-1">
                <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" />
                Avantaj noi: <strong>{result.local_keywords.only_ours.join(", ")}</strong>
              </p>
            )}
          </BenchmarkSection>

          {/* H2 Content Briefs */}
          {h2Gaps.length > 0 && (
            <BenchmarkSection title={`H2 Content Briefs (${h2Gaps.length} lipsă)`} icon={<Code2 className="h-4 w-4" />}>
              <p className="text-xs text-muted-foreground">
                Competitorul are H2-uri pe care noi nu le acoperim. Generăm draft 80-120 cuvinte cu Gemini pentru fiecare.
              </p>
              <ul className="mt-1 space-y-0.5 text-xs list-disc list-inside max-h-32 overflow-auto">
                {h2Gaps.map((h, i) => <li key={i} className="truncate">{h}</li>)}
              </ul>
              <Button size="sm" className="h-7 mt-2" onClick={() => setApplyMode("h2_briefs")}>
                <Sparkles className="h-3 w-3 mr-1" /> Generează drafturi AI
              </Button>
            </BenchmarkSection>
          )}
        </div>
      )}

      {/* Confirm Apply Dialog with preview */}
      <AlertDialog open={!!applyMode} onOpenChange={(o) => !o && setApplyMode(null)}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {applyMode === "schema" && "Aplici Schema „Best-in-Class” pe site?"}
              {applyMode === "local_links" && "Generezi linkuri interne pentru cartiere lipsă?"}
              {applyMode === "h2_briefs" && "Generezi drafturi AI pentru H2-urile lipsă?"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-xs space-y-2">
                <p className="text-muted-foreground">
                  Pagina țintă: <code className="font-mono text-foreground">{(() => { try { return new URL(ourUrl).pathname; } catch { return ourUrl; } })()}</code>
                </p>
                {applyMode === "schema" && (
                  <>
                    <p>Salvăm JSON-LD în <code>seo_overrides.json_ld</code>. Devine activ imediat la următoarea reîncărcare.</p>
                    <pre className="rounded bg-muted p-2 max-h-40 overflow-auto text-[10px] font-mono">
                      <code>{JSON.stringify(result?.best_schema, null, 2).slice(0, 1200)}{JSON.stringify(result?.best_schema, null, 2).length > 1200 ? "\n..." : ""}</code>
                    </pre>
                  </>
                )}
                {applyMode === "local_links" && (
                  <>
                    <p>Adăugăm <strong>{result?.local_keywords?.only_theirs?.length || 0}</strong> sugestii (status pending) — necesită aprobare ulterioară din tab Internal Links.</p>
                    <ul className="list-disc list-inside max-h-32 overflow-auto bg-muted/40 rounded p-2">
                      {(result?.local_keywords?.only_theirs || []).map((k: string, i: number) => (
                        <li key={i}>apartamente {k} Timișoara → /cartiere/{k.toLowerCase()}</li>
                      ))}
                    </ul>
                  </>
                )}
                {applyMode === "h2_briefs" && (
                  <>
                    <p>Gemini va scrie <strong>{h2Gaps.length}</strong> drafturi (80-120 cuv. fiecare). Salvate ca <code>draft</code> — le poți copia în CMS ulterior.</p>
                    <ul className="list-disc list-inside max-h-32 overflow-auto bg-muted/40 rounded p-2">
                      {h2Gaps.map((h, i) => <li key={i} className="truncate">{h}</li>)}
                    </ul>
                    <p className="text-amber-700 dark:text-amber-400">⚠ Procesul durează ~{h2Gaps.length * 3}s.</p>
                  </>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={apply.isPending}>Anulează</AlertDialogCancel>
            <AlertDialogAction
              disabled={apply.isPending}
              onClick={(e) => { e.preventDefault(); if (applyMode) apply.mutate(applyMode); }}
            >
              {apply.isPending ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Se aplică...</> : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const BenchmarkSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded border p-3 space-y-2">
    <p className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1.5">{icon}{title}</p>
    {children}
  </div>
);

const PsiCol = ({ label, data }: { label: string; data: any }) => {
  if (!data) return <div className="rounded border p-2 text-muted-foreground">—</div>;
  if (data.error) return <div className="rounded border p-2 text-destructive">{label}: {data.error}</div>;
  const scoreColor = (n: number | null) => n == null ? "text-muted-foreground" : n >= 90 ? "text-emerald-600" : n >= 50 ? "text-amber-600" : "text-destructive";
  return (
    <div className="rounded border p-2 space-y-1">
      <p className="font-semibold">{label}</p>
      <div className="grid grid-cols-2 gap-1">
        <div>Performance: <span className={scoreColor(data.performance)}><strong>{data.performance ?? "—"}</strong></span></div>
        <div>SEO: <span className={scoreColor(data.seo)}><strong>{data.seo ?? "—"}</strong></span></div>
        <div>A11y: <span className={scoreColor(data.accessibility)}><strong>{data.accessibility ?? "—"}</strong></span></div>
        <div>Best Pr.: <span className={scoreColor(data.best_practices)}><strong>{data.best_practices ?? "—"}</strong></span></div>
      </div>
      <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t">
        <div>LCP: {data.lcp || "—"} · FCP: {data.fcp || "—"}</div>
        <div>CLS: {data.cls || "—"} · TBT: {data.tbt || "—"}</div>
      </div>
    </div>
  );
};

const SerpPreview = ({ label, data, richSnippet }: { label: string; data: any; richSnippet: any }) => {
  let domain = "";
  try { domain = new URL(data?.url || "").hostname.replace(/^www\./, ""); } catch {}
  return (
    <div className="rounded border p-3 bg-background">
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{label}</p>
      <div className="text-[11px] text-emerald-700 dark:text-emerald-400">{domain}</div>
      <a href={data?.url} target="_blank" rel="noopener noreferrer" className="text-blue-700 dark:text-blue-400 hover:underline text-base leading-snug block mt-0.5">
        {data?.title || "(fără title)"}
      </a>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data?.meta || "(fără meta description)"}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {richSnippet?.aggregateRating && <Badge variant="outline" className="text-[10px]">★ Rating</Badge>}
        {richSnippet?.price && <Badge variant="outline" className="text-[10px]">€ Preț</Badge>}
        {richSnippet?.geo && <Badge variant="outline" className="text-[10px]"><MapPin className="h-2.5 w-2.5 mr-0.5" />Geo</Badge>}
        {!richSnippet?.aggregateRating && !richSnippet?.price && !richSnippet?.geo && (
          <span className="text-[10px] text-muted-foreground italic">Fără rich snippets</span>
        )}
      </div>
    </div>
  );
};

const HeadingsBox = ({ label, items, accent }: { label: string; items?: string[]; accent: "primary" | "amber" }) => (
  <div className={cn("rounded border-l-2 p-1.5", accent === "primary" ? "border-primary bg-primary/5" : "border-amber-400 bg-amber-50/40 dark:bg-amber-950/20")}>
    <p className="text-[10px] uppercase text-muted-foreground mb-0.5">{label}</p>
    {(!items || items.length === 0) ? (
      <p className="text-muted-foreground italic">—</p>
    ) : (
      <ul className="space-y-0.5">
        {items.slice(0, 8).map((h, i) => <li key={i} className="break-words">• {h}</li>)}
        {items.length > 8 && <li className="text-muted-foreground">+{items.length - 8} mai multe</li>}
      </ul>
    )}
  </div>
);

const KwBox = ({ label, items, accent }: { label: string; items?: string[]; accent: "primary" | "amber" }) => (
  <div className={cn("rounded border p-1.5", accent === "primary" ? "border-primary/40" : "border-amber-400/60")}>
    <p className="text-[10px] uppercase text-muted-foreground mb-1">{label} ({items?.length || 0})</p>
    <div className="flex flex-wrap gap-1">
      {(!items || items.length === 0) && <span className="text-muted-foreground italic">Niciun cuvânt cheie local</span>}
      {items?.map((k) => <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>)}
    </div>
  </div>
);

export default SEOPremiumTabs;
