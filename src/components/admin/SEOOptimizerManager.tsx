import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, RefreshCw, AlertTriangle, CheckCircle2, Lightbulb, Copy, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

const QUICK_URLS = [
  "https://www.realtrust.ro/",
  "https://www.realtrust.ro/oaspeti",
  "https://www.realtrust.ro/imobiliare-timisoara",
  "https://www.realtrust.ro/blog",
  "https://www.realtrust.ro/calculator-roi",
  "https://www.realtrust.ro/pentru-proprietari",
];

interface AuditRow {
  id: string;
  url: string;
  language: string;
  overall_score: number | null;
  title: string | null;
  meta_description: string | null;
  h1_count: number | null;
  word_count: number | null;
  suggested_title: string | null;
  suggested_meta: string | null;
  keyword_gaps: any[];
  strengths: any[];
  issues: any[];
  opportunities: any[];
  raw_analysis: any;
  created_at: string;
}

const SEOOptimizerManager = () => {
  const qc = useQueryClient();
  const [url, setUrl] = useState("https://www.realtrust.ro/");
  const [language, setLanguage] = useState<"ro" | "en">("ro");
  const [selectedAudit, setSelectedAudit] = useState<AuditRow | null>(null);

  const { data: history = [] } = useQuery({
    queryKey: ["seo-audits-history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seo_audits")
        .select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });

  const auditMutation = useMutation({
    mutationFn: async ({ targetUrl, force }: { targetUrl: string; force: boolean }) => {
      const { data, error } = await supabase.functions.invoke("seo-ai-optimizer", {
        body: { url: targetUrl, language, forceRefresh: force },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.cached ? "Audit din cache" : "Audit nou generat");
      setSelectedAudit(data.audit);
      qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
    },
    onError: (e: any) => toast.error(e.message || "Eroare audit"),
  });

  const copyText = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copiat`);
  };

  const scoreColor = (s: number | null) => {
    if (s === null) return "text-muted-foreground";
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const severityColor = (sev: string) => {
    if (sev === "critical") return "destructive";
    if (sev === "warning") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            SEO AI Optimizer
          </CardTitle>
          <CardDescription>
            Scanează orice pagină din site și primește scor SEO, sugestii de keyword-uri, meta description și oportunități de optimizare generate de AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.realtrust.ro/..."
              className="flex-1"
            />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as "ro" | "en")}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="ro">RO</option>
              <option value="en">EN</option>
            </select>
            <Button
              onClick={() => auditMutation.mutate({ targetUrl: url, force: false })}
              disabled={auditMutation.isPending || !url}
            >
              {auditMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              Analizează
            </Button>
            <Button
              variant="outline"
              onClick={() => auditMutation.mutate({ targetUrl: url, force: true })}
              disabled={auditMutation.isPending || !url}
              title="Forțează re-analiză"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_URLS.map((u) => (
              <Button key={u} variant="outline" size="sm" onClick={() => setUrl(u)}>
                {u.replace("https://www.realtrust.ro", "") || "/"}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedAudit && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Rezultat audit
                  <a href={selectedAudit.url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    {selectedAudit.url}
                  </a>
                </CardTitle>
                <CardDescription className="mt-1">
                  {new Date(selectedAudit.created_at).toLocaleString("ro-RO")} · {selectedAudit.language.toUpperCase()}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${scoreColor(selectedAudit.overall_score)}`}>
                  {selectedAudit.overall_score ?? "—"}
                  <span className="text-base text-muted-foreground">/100</span>
                </div>
                <Progress value={selectedAudit.overall_score ?? 0} className="w-32 mt-2" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground text-xs">Cuvinte</div>
                <div className="text-lg font-semibold">{selectedAudit.word_count ?? "—"}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground text-xs">H1 tags</div>
                <div className="text-lg font-semibold">{selectedAudit.h1_count ?? "—"}</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-muted-foreground text-xs">Risc duplicat</div>
                <div className="text-lg font-semibold capitalize">{selectedAudit.raw_analysis?.duplicate_content_risk || "—"}</div>
              </div>
            </div>

            {selectedAudit.suggested_title && (
              <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center justify-between">
                    <span>TITLU SUGERAT ({selectedAudit.suggested_title.length} char)</span>
                    <Button size="sm" variant="ghost" onClick={() => copyText(selectedAudit.suggested_title!, "Titlu")}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="font-semibold">{selectedAudit.suggested_title}</div>
                  {selectedAudit.title && (
                    <div className="text-xs text-muted-foreground mt-1">Actual: {selectedAudit.title}</div>
                  )}
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center justify-between">
                    <span>META DESCRIPTION SUGERATĂ ({selectedAudit.suggested_meta?.length || 0} char)</span>
                    <Button size="sm" variant="ghost" onClick={() => copyText(selectedAudit.suggested_meta!, "Meta")}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="text-sm">{selectedAudit.suggested_meta}</div>
                  {selectedAudit.meta_description && (
                    <div className="text-xs text-muted-foreground mt-1">Actual: {selectedAudit.meta_description}</div>
                  )}
                </div>
              </div>
            )}

            <Accordion type="multiple" defaultValue={["issues", "keywords"]}>
              {selectedAudit.issues?.length > 0 && (
                <AccordionItem value="issues">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Probleme ({selectedAudit.issues.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {selectedAudit.issues.map((iss: any, i: number) => (
                        <div key={i} className="rounded border p-3">
                          <div className="flex items-start gap-2">
                            <Badge variant={severityColor(iss.severity) as any}>{iss.severity}</Badge>
                            <div className="flex-1 text-sm">
                              <div className="font-medium">{iss.issue}</div>
                              <div className="text-muted-foreground mt-1">→ {iss.fix}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {selectedAudit.keyword_gaps?.length > 0 && (
                <AccordionItem value="keywords">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-primary" />
                      Keyword-uri lipsă ({selectedAudit.keyword_gaps.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {selectedAudit.keyword_gaps.map((kw: any, i: number) => (
                        <div key={i} className="rounded border p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <code className="font-semibold">{kw.keyword}</code>
                            <Badge variant={kw.priority === "high" ? "default" : "outline"}>{kw.priority}</Badge>
                          </div>
                          <div className="text-muted-foreground text-xs mt-1">Intent: {kw.search_intent}</div>
                          <div className="text-xs mt-1">📍 {kw.where_to_add}</div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {selectedAudit.opportunities?.length > 0 && (
                <AccordionItem value="opportunities">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-500" />
                      Oportunități ({selectedAudit.opportunities.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {selectedAudit.opportunities.map((op: any, i: number) => (
                        <div key={i} className="rounded border p-3 text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{op.type}</Badge>
                            <Badge variant={op.impact === "high" ? "default" : "secondary"}>impact {op.impact}</Badge>
                          </div>
                          <div>{op.description}</div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {selectedAudit.strengths?.length > 0 && (
                <AccordionItem value="strengths">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      Puncte forte ({selectedAudit.strengths.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      {selectedAudit.strengths.map((s: any, i: number) => (
                        <li key={i}>{typeof s === "string" ? s : s.text || JSON.stringify(s)}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}

              {selectedAudit.raw_analysis?.recommended_internal_links?.length > 0 && (
                <AccordionItem value="links">
                  <AccordionTrigger>Link-uri interne recomandate</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-1 text-sm">
                      {selectedAudit.raw_analysis.recommended_internal_links.map((l: string, i: number) => (
                        <li key={i}>
                          <a href={l} target="_blank" rel="noreferrer" className="text-primary hover:underline">{l}</a>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Istoric audituri ({history.length})</CardTitle>
          <CardDescription>Ultimele 30 de audituri generate</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {history.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAudit(a)}
                  className="w-full text-left rounded-lg border p-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{a.url}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("ro-RO")} · {a.language.toUpperCase()} · {a.word_count} cuvinte
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${scoreColor(a.overall_score)}`}>
                    {a.overall_score ?? "—"}
                  </div>
                </button>
              ))}
              {history.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  Nu există audituri încă. Analizează prima pagină pentru a începe.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default SEOOptimizerManager;
