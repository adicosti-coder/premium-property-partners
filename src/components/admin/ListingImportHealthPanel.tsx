import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Activity, Beaker, Brain, FlaskConical, Loader2, RefreshCw, ShieldAlert, Sparkles, TrendingUp, Wand2, Zap } from "lucide-react";

type Metric = {
  id: string;
  run_at: string;
  triggered_by: string | null;
  candidates: number;
  published: number;
  avg_quality_score: number | null;
  rejected_refusal: number;
  rejected_low_quality: number;
  rejected_no_content: number;
  rejected_duplicate: number;
  rejected_error: number;
};

type Learning = {
  id: string;
  pattern_type: string;
  pattern: string;
  evidence_count: number;
  confidence: number;
  is_active: boolean;
  first_seen: string;
  metadata?: any;
};

type SourceHealth = {
  source_platform: string;
  total_approved: number;
  total_edited: number;
  total_user_rejected: number;
  approval_rate: number;
  consecutive_failures: number;
  auto_disabled_until: string | null;
};

type HealLogRow = {
  id: string;
  decided_at: string;
  decision: string;
  rationale: string | null;
};

type CompiledPromptRow = {
  id: string;
  created_at: string;
  compiled_prompt: string;
  hints_count: number;
  forbidden_count: number;
  semantic_count: number;
  is_active: boolean;
};

type SandboxResult = {
  quality_score: number;
  would_publish: boolean;
  would_reject_reason: string | null;
  refusal: { detected: boolean; match: string | null };
  sanitization: {
    removed_phones: string[];
    removed_emails: string[];
    removed_addresses: string[];
    removed_phrases: string[];
  };
  learnings_applied: {
    forbidden_count: number;
    hints_count: number;
    semantic_concepts: { concept: string; variants: number }[];
  };
  compiled_prompt_used: boolean;
  ai_rewritten: boolean;
  preview: { title: string; short_description: string; long_description: string };
};

export function ListingImportHealthPanel() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [learnings, setLearnings] = useState<Learning[]>([]);
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [logs, setLogs] = useState<HealLogRow[]>([]);
  const [activePrompt, setActivePrompt] = useState<CompiledPromptRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [healing, setHealing] = useState(false);

  // Sandbox state
  const [sbText, setSbText] = useState("");
  const [sbTitle, setSbTitle] = useState("");
  const [sbType, setSbType] = useState<"vanzare" | "inchiriere" | "cazare">("vanzare");
  const [sbUseAi, setSbUseAi] = useState(true);
  const [sbRunning, setSbRunning] = useState(false);
  const [sbResult, setSbResult] = useState<SandboxResult | null>(null);

  // Compile prompt state
  const [compiling, setCompiling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, l, s, lg, cp] = await Promise.all([
        supabase.from("listing_import_metrics").select("*").order("run_at", { ascending: false }).limit(10),
        supabase.from("listing_import_learnings").select("*").order("evidence_count", { ascending: false }).limit(40),
        supabase.from("listing_import_source_health").select("*").order("approval_rate", { ascending: true }),
        supabase.from("listing_import_heal_log").select("id, decided_at, decision, rationale").order("decided_at", { ascending: false }).limit(15),
        supabase.from("listing_import_system_prompts").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setMetrics((m.data || []) as Metric[]);
      setLearnings((l.data || []) as Learning[]);
      setSources((s.data || []) as SourceHealth[]);
      setLogs((lg.data || []) as HealLogRow[]);
      setActivePrompt((cp.data || null) as CompiledPromptRow | null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runSelfHeal = async () => {
    setHealing(true);
    try {
      const { data, error } = await supabase.functions.invoke("listing-import-self-heal", { body: {} });
      if (error) throw error;
      toast({
        title: "Self-heal rulat",
        description: `${data?.decisions_count ?? 0} decizii · ${data?.kpi?.published_24h ?? 0}/${data?.kpi?.candidates_24h ?? 0} publicate ultima zi.`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Eroare self-heal", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setHealing(false);
    }
  };

  const toggleLearning = async (id: string, current: boolean) => {
    await supabase.from("listing_import_learnings")
      .update({ is_active: !current, promoted_at: !current ? new Date().toISOString() : null })
      .eq("id", id);
    setLearnings((p) => p.map((l) => l.id === id ? { ...l, is_active: !current } : l));
  };

  const releaseSource = async (platform: string) => {
    await supabase.from("listing_import_source_health")
      .update({ auto_disabled_until: null, consecutive_failures: 0, notes: "Manual: re-enable din admin" })
      .eq("source_platform", platform);
    toast({ title: "Sursă re-activată", description: platform });
    await load();
  };

  const runSandbox = async () => {
    if (sbText.trim().length < 30) {
      toast({ title: "Text prea scurt", description: "Lipește minim 30 caractere din anunțul original.", variant: "destructive" });
      return;
    }
    setSbRunning(true);
    setSbResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("listing-import-sandbox", {
        body: {
          raw_text: sbText,
          raw_title: sbTitle || undefined,
          listing_type: sbType,
          use_ai_rewrite: sbUseAi,
        },
      });
      if (error) throw error;
      setSbResult(data as SandboxResult);
      toast({
        title: data?.would_publish ? "Ar fi publicat ✓" : "Ar fi respins",
        description: `Quality score: ${data?.quality_score}/100${data?.would_reject_reason ? ` · motiv: ${data.would_reject_reason}` : ""}`,
        variant: data?.would_publish ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: "Eroare sandbox", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setSbRunning(false);
    }
  };

  const compilePrompt = async () => {
    setCompiling(true);
    try {
      const { data, error } = await supabase.functions.invoke("listing-import-compile-prompt", { body: {} });
      if (error) throw error;
      toast({
        title: "Prompt sincronizat ✓",
        description: `${data?.stats?.phrases ?? 0} fraze + ${data?.stats?.semantic ?? 0} concepte semantice + ${data?.stats?.hints ?? 0} hints · ${data?.stats?.length ?? 0} char`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Eroare compile", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setCompiling(false);
    }
  };

  const totals = metrics.reduce((acc, m) => {
    acc.cand += m.candidates || 0;
    acc.pub += m.published || 0;
    acc.lowQ += m.rejected_low_quality || 0;
    acc.qSum += Number(m.avg_quality_score || 0);
    acc.qN += m.avg_quality_score ? 1 : 0;
    return acc;
  }, { cand: 0, pub: 0, lowQ: 0, qSum: 0, qN: 0 });
  const pubRate = totals.cand > 0 ? Math.round((totals.pub / totals.cand) * 100) : 0;
  const avgQ = totals.qN > 0 ? Math.round(totals.qSum / totals.qN) : 0;
  const semanticLearnings = learnings.filter((l) => l.pattern_type === "semantic_concept");

  return (
    <Card className="border-emerald-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="w-4 h-4 text-emerald-600" /> Self-Healing · Învățare Semantică · Sandbox
              <Badge variant="secondary" className="text-[10px]">{learnings.filter((l) => l.is_active).length} learnings active</Badge>
              {semanticLearnings.length > 0 && (
                <Badge variant="default" className="text-[10px] bg-purple-600">{semanticLearnings.length} concepte AI</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Pipeline-ul învață semantic din corecțiile admin (Gemini generalizează fraza într-un concept), simulează rulări fără DB writes, și menține un prompt de sistem compilat.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Reîmprospătează"}
            </Button>
            <Button size="sm" variant="default" onClick={runSelfHeal} disabled={healing} className="gap-1">
              {healing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              Self-heal
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="overview" className="gap-1"><Activity className="w-3 h-3" /> Overview</TabsTrigger>
            <TabsTrigger value="sandbox" className="gap-1"><FlaskConical className="w-3 h-3" /> Sandbox Simulare</TabsTrigger>
            <TabsTrigger value="prompt" className="gap-1"><Wand2 className="w-3 h-3" /> Prompt Compilat</TabsTrigger>
          </TabsList>

          {/* ============ OVERVIEW ============ */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="border rounded-lg p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Rată publicare</div>
                <div className="text-xl font-bold">{pubRate}%</div>
                <div className="text-[10px] text-muted-foreground">{totals.pub}/{totals.cand} ultimele {metrics.length} rulări</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Calitate medie</div>
                <div className="text-xl font-bold">{avgQ}</div>
                <div className="text-[10px] text-muted-foreground">/100 (heuristic)</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Filtrate calitate</div>
                <div className="text-xl font-bold">{totals.lowQ}</div>
                <div className="text-[10px] text-muted-foreground">respinse automat sub prag</div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Brain className="w-3 h-3" /> Concepte semantice</div>
                <div className="text-xl font-bold">{semanticLearnings.length}</div>
                <div className="text-[10px] text-muted-foreground">{semanticLearnings.filter((l) => l.is_active).length} active (Gemini)</div>
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Activity className="w-3 h-3" /> Sănătate surse
              </div>
              {sources.length === 0 ? (
                <div className="text-xs text-muted-foreground">Încă nu există date de revizuire.</div>
              ) : (
                <div className="space-y-1">
                  {sources.map((s) => {
                    const disabled = s.auto_disabled_until && new Date(s.auto_disabled_until).getTime() > Date.now();
                    const samples = s.total_approved + s.total_edited + s.total_user_rejected;
                    return (
                      <div key={s.source_platform} className="flex items-center justify-between gap-3 py-1 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{s.source_platform}</span>
                          {disabled && <Badge variant="destructive" className="text-[10px]">Auto-disabled</Badge>}
                          <span className="text-muted-foreground">{samples} mostre · {s.consecutive_failures} fail consec.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={s.approval_rate >= 60 ? "default" : s.approval_rate >= 35 ? "secondary" : "destructive"}>
                            {s.approval_rate}%
                          </Badge>
                          {disabled && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => releaseSource(s.source_platform)}>
                              Re-activează
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Semantic concepts highlight */}
            {semanticLearnings.length > 0 && (
              <div className="border rounded-lg p-3 space-y-2 bg-purple-500/5 border-purple-500/30">
                <div className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Concepte semantice (generalizate de Gemini)
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {semanticLearnings.map((l) => (
                    <div key={l.id} className="flex items-start justify-between gap-3 text-xs border-l-2 border-purple-500/50 pl-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Switch checked={l.is_active} onCheckedChange={() => toggleLearning(l.id, l.is_active)} />
                          <span className="font-medium">{l.metadata?.concept || l.pattern}</span>
                          <Badge variant="outline" className="text-[10px]">conf {Math.round(l.confidence * 100)}%</Badge>
                        </div>
                        {Array.isArray(l.metadata?.variants) && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 pl-10">
                            Variante: {l.metadata.variants.slice(0, 6).join(" · ")}
                            {l.metadata.variants.length > 6 && ` +${l.metadata.variants.length - 6}`}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> Pattern-uri text brut (top {Math.min(learnings.filter((l) => l.pattern_type === "phrase").length, 20)})</span>
                <span className="text-[10px] text-muted-foreground normal-case">≥3 dovezi → activare automată</span>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                {learnings.filter((l) => l.pattern_type === "phrase").slice(0, 20).map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Switch checked={l.is_active} onCheckedChange={() => toggleLearning(l.id, l.is_active)} />
                      <span className="font-mono truncate">{l.pattern}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{l.evidence_count} dovezi</span>
                      <span>·</span>
                      <span>conf {Math.round(l.confidence * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" /> Ultimele decizii self-heal
              </div>
              {logs.length === 0 ? (
                <div className="text-xs text-muted-foreground">Niciun istoric încă.</div>
              ) : (
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {logs.map((l) => (
                    <div key={l.id} className="text-[11px] flex items-start gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0">{l.decision}</Badge>
                      <div className="min-w-0">
                        <div className="truncate">{l.rationale}</div>
                        <div className="text-muted-foreground text-[10px]">{new Date(l.decided_at).toLocaleString("ro-RO")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ============ SANDBOX ============ */}
          <TabsContent value="sandbox" className="space-y-4 mt-4">
            <Alert className="border-blue-500/30 bg-blue-500/5">
              <Beaker className="h-4 w-4" />
              <AlertTitle className="text-sm">Dry-run · zero DB writes</AlertTitle>
              <AlertDescription className="text-xs">
                Lipește textul brut copiat de pe OLX / Storia / OLX-Imobiliare etc. Sistemul rulează EXACT același pipeline (sanitizare + refusal detection + quality score + rescriere Gemini cu promptul compilat activ) și îți arată ce s-ar întâmpla. Nimic nu se salvează în DB.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs">Text brut anunț (paste din sursă)</Label>
                <Textarea
                  rows={10}
                  placeholder="Lipește aici descrierea anunțului așa cum apare pe OLX / Storia..."
                  value={sbText}
                  onChange={(e) => setSbText(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Titlu original (opțional)</Label>
                  <Input value={sbTitle} onChange={(e) => setSbTitle(e.target.value)} placeholder="auto-detect din primul rând" />
                </div>
                <div>
                  <Label className="text-xs">Tip anunț</Label>
                  <Select value={sbType} onValueChange={(v) => setSbType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vanzare">Vânzare</SelectItem>
                      <SelectItem value="inchiriere">Închiriere</SelectItem>
                      <SelectItem value="cazare">Cazare</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={sbUseAi} onCheckedChange={setSbUseAi} id="sb-ai" />
                  <Label htmlFor="sb-ai" className="text-xs cursor-pointer">Rescrie cu Gemini</Label>
                </div>
                <Button onClick={runSandbox} disabled={sbRunning} className="w-full gap-1">
                  {sbRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <FlaskConical className="w-3 h-3" />}
                  Simulează pipeline
                </Button>
              </div>
            </div>

            {sbResult && (
              <div className="space-y-3 border rounded-lg p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={sbResult.would_publish ? "default" : "destructive"}>
                      {sbResult.would_publish ? "Ar fi publicat" : `Respins · ${sbResult.would_reject_reason}`}
                    </Badge>
                    <Badge variant="outline">Quality: {sbResult.quality_score}/100</Badge>
                    {sbResult.refusal.detected && <Badge variant="destructive">Refusal: {sbResult.refusal.match}</Badge>}
                    {sbResult.compiled_prompt_used && <Badge variant="secondary">Prompt compilat folosit ✓</Badge>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-destructive">Sanitizate / eliminate</div>
                    <div className="text-xs space-y-1 border rounded p-2 bg-destructive/5">
                      {sbResult.sanitization.removed_phones.length > 0 && (
                        <div>📱 Telefoane: <span className="font-mono">{sbResult.sanitization.removed_phones.join(", ")}</span></div>
                      )}
                      {sbResult.sanitization.removed_emails.length > 0 && (
                        <div>✉️ Emailuri: <span className="font-mono">{sbResult.sanitization.removed_emails.join(", ")}</span></div>
                      )}
                      {sbResult.sanitization.removed_addresses.length > 0 && (
                        <div>📍 Adrese: <span className="font-mono">{sbResult.sanitization.removed_addresses.join(", ")}</span></div>
                      )}
                      {sbResult.sanitization.removed_phrases.length > 0 && (
                        <div>🚫 Fraze: <span className="font-mono">{sbResult.sanitization.removed_phrases.join(" · ")}</span></div>
                      )}
                      {sbResult.sanitization.removed_phones.length + sbResult.sanitization.removed_emails.length + sbResult.sanitization.removed_addresses.length + sbResult.sanitization.removed_phrases.length === 0 && (
                        <div className="text-muted-foreground">Nimic de filtrat.</div>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Reguli aplicate: {sbResult.learnings_applied.forbidden_count} fraze · {sbResult.learnings_applied.hints_count} hints · {sbResult.learnings_applied.semantic_concepts.length} concepte semantice
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-emerald-600">Output final (preview)</div>
                    <div className="border rounded p-2 bg-emerald-500/5 space-y-2">
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">Titlu</div>
                        <div className="text-sm font-semibold">{sbResult.preview.title}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">Short</div>
                        <div className="text-xs">{sbResult.preview.short_description}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-muted-foreground">Long</div>
                        <div className="text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">{sbResult.preview.long_description}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ============ COMPILE PROMPT ============ */}
          <TabsContent value="prompt" className="space-y-4 mt-4">
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <Wand2 className="h-4 w-4" />
              <AlertTitle className="text-sm">Force Re-Sync Prompt</AlertTitle>
              <AlertDescription className="text-xs">
                Recompilează cele mai bune reguli active (fraze interzise + concepte semantice + hints) într-un singur prompt de sistem optimizat, pe care Gemini îl folosește la rescrierea fiecărui anunț. Click pentru sincronizare manuală.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs space-y-0.5">
                {activePrompt ? (
                  <>
                    <div>
                      <Badge variant="default" className="mr-2">Activ</Badge>
                      <span className="text-muted-foreground">
                        compilat {new Date(activePrompt.created_at).toLocaleString("ro-RO")}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {activePrompt.forbidden_count} fraze · {activePrompt.semantic_count} concepte · {activePrompt.hints_count} hints · {activePrompt.compiled_prompt.length} char
                    </div>
                  </>
                ) : (
                  <Badge variant="outline">Niciun prompt compilat încă · pipeline folosește fallback hard-coded</Badge>
                )}
              </div>
              <Button onClick={compilePrompt} disabled={compiling} className="gap-1">
                {compiling ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Force Re-Sync Prompt
              </Button>
            </div>

            {activePrompt && (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prompt de sistem activ</div>
                <pre className="text-[11px] whitespace-pre-wrap font-mono bg-muted/50 p-3 rounded max-h-96 overflow-y-auto">
                  {activePrompt.compiled_prompt}
                </pre>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Suppress unused import warning for Label (kept for future tuning UI)
void Label;
