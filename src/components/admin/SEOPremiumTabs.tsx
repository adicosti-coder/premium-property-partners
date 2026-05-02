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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, Link2, RefreshCw, Check, X, Pencil, Sparkles,
  AlertTriangle, CheckCircle2, FileWarning, Code2, ExternalLink, Target,
  ChevronDown, ChevronRight, Copy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="links" className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Internal Links
            </TabsTrigger>
            <TabsTrigger value="competitor" className="gap-1.5">
              <Target className="h-3.5 w-3.5" /> Competitor Diff
            </TabsTrigger>
            <TabsTrigger value="schema" className="gap-1.5">
              <Code2 className="h-3.5 w-3.5" /> Schema Validator
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
    onError: (e: any) => toast.error(e.message || "Eroare"),
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
    onError: (e: any) => toast.error(e.message || "Eroare"),
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
                  <div className="rounded border bg-muted/40 p-2 font-mono text-xs break-all">
                    &lt;a href="{confirmApply.target}"&gt;{confirmApply.anchor}&lt;/a&gt;
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
    onSuccess: () => {
      toast.success("Snapshot competitor salvat");
      setCompetitorUrl("");
      qc.invalidateQueries({ queryKey: ["seo-competitor-snapshots", path] });
    },
    onError: (e: any) => toast.error(e.message || "Eroare"),
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
 * TAB 3 — Schema Validator Dashboard
 * =============================================================*/
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
    onError: (e: any) => toast.error(e.message || "Eroare"),
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

export default SEOPremiumTabs;
