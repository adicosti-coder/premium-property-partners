import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, Search, RefreshCw, AlertTriangle, CheckCircle2, Lightbulb,
  Copy, ExternalLink, Sparkles, Download, Layers, TrendingUp, TrendingDown, Minus, MapPin,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

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
  local_relevance_score?: number | null;
  local_entities_found?: any[];
  local_entities_missing?: any[];
  local_geo_keywords?: any[];
  local_recommendations?: any[];
}

const SEOOptimizerManager = () => {
  const qc = useQueryClient();
  const [url, setUrl] = useState("https://www.realtrust.ro/");
  const [language, setLanguage] = useState<"ro" | "en">("ro");
  const [selectedAudit, setSelectedAudit] = useState<AuditRow | null>(null);
  const [filter, setFilter] = useState("");
  const [filterLang, setFilterLang] = useState<"all" | "ro" | "en">("all");
  const [minScore, setMinScore] = useState<number>(0);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  const { data: history = [] } = useQuery({
    queryKey: ["seo-audits-history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seo_audits")
        .select("*").order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
  });

  // Find previous audit for the same URL (for comparison)
  const previousAudit = useMemo(() => {
    if (!selectedAudit) return null;
    return history.find(
      (a) => a.url === selectedAudit.url && a.id !== selectedAudit.id && new Date(a.created_at) < new Date(selectedAudit.created_at)
    ) || null;
  }, [selectedAudit, history]);

  const filteredHistory = useMemo(() => {
    return history.filter((a) => {
      if (filterLang !== "all" && a.language !== filterLang) return false;
      if ((a.overall_score ?? 0) < minScore) return false;
      if (filter && !a.url.toLowerCase().includes(filter.toLowerCase())) return false;
      return true;
    });
  }, [history, filter, filterLang, minScore]);

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

  const runBulkAudit = async () => {
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: QUICK_URLS.length });
    let success = 0;
    for (let i = 0; i < QUICK_URLS.length; i++) {
      try {
        await supabase.functions.invoke("seo-ai-optimizer", {
          body: { url: QUICK_URLS[i], language, forceRefresh: false },
        });
        success++;
      } catch (e) {
        console.error("Bulk audit fail for", QUICK_URLS[i], e);
      }
      setBulkProgress({ done: i + 1, total: QUICK_URLS.length });
    }
    qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
    setBulkRunning(false);
    toast.success(`Bulk audit: ${success}/${QUICK_URLS.length} URL-uri analizate`);
  };

  const buildSummaryText = (a: AuditRow): string => {
    const lines: string[] = [];
    lines.push(`SEO Audit — ${a.url}`);
    lines.push(`Data: ${new Date(a.created_at).toLocaleString("ro-RO")} | Limbă: ${a.language.toUpperCase()}`);
    lines.push(`Scor general: ${a.overall_score ?? "—"}/100`);
    if (a.local_relevance_score != null) {
      lines.push(`Scor Local SEO Timișoara: ${a.local_relevance_score}/100`);
    }
    lines.push(`Cuvinte: ${a.word_count ?? "—"} | H1: ${a.h1_count ?? "—"} | Risc duplicat: ${a.raw_analysis?.duplicate_content_risk || "—"}`);
    lines.push("");
    if (a.suggested_title) {
      lines.push(`TITLU SUGERAT (${a.suggested_title.length} char):`);
      lines.push(a.suggested_title);
      if (a.title) lines.push(`Actual: ${a.title}`);
      lines.push("");
    }
    if (a.suggested_meta) {
      lines.push(`META DESCRIPTION SUGERATĂ (${a.suggested_meta.length} char):`);
      lines.push(a.suggested_meta);
      if (a.meta_description) lines.push(`Actual: ${a.meta_description}`);
      lines.push("");
    }
    if (a.issues?.length) {
      lines.push(`PROBLEME (${a.issues.length}):`);
      a.issues.forEach((i: any) => lines.push(`• [${i.severity}] ${i.issue} → ${i.fix}`));
      lines.push("");
    }
    if (a.keyword_gaps?.length) {
      lines.push(`KEYWORD-URI LIPSĂ (${a.keyword_gaps.length}):`);
      a.keyword_gaps.forEach((k: any) => lines.push(`• [${k.priority}] ${k.keyword} — ${k.where_to_add}`));
      lines.push("");
    }
    if (a.opportunities?.length) {
      lines.push(`OPORTUNITĂȚI (${a.opportunities.length}):`);
      a.opportunities.forEach((o: any) => lines.push(`• [${o.type}/${o.impact}] ${o.description}`));
      lines.push("");
    }
    if (a.strengths?.length) {
      lines.push(`PUNCTE FORTE (${a.strengths.length}):`);
      a.strengths.forEach((s: any) => lines.push(`• ${typeof s === "string" ? s : (s.text || JSON.stringify(s))}`));
      lines.push("");
    }
    if (a.local_geo_keywords?.length) {
      lines.push(`LOCAL SEO — KEYWORDS GEO LIPSĂ (${a.local_geo_keywords.length}):`);
      a.local_geo_keywords.forEach((k: any) => lines.push(`• [${k.priority || "medium"}] ${k.keyword} — ${k.reason || ""} (${k.suggested_placement || ""})`));
      lines.push("");
    }
    if (a.local_recommendations?.length) {
      lines.push(`LOCAL SEO — RECOMANDĂRI (${a.local_recommendations.length}):`);
      a.local_recommendations.forEach((r: any) => lines.push(`• ${typeof r === "string" ? r : JSON.stringify(r)}`));
      lines.push("");
    }
    if (a.local_entities_missing?.length) {
      const top = a.local_entities_missing.slice(0, 8).map((e: any) => e.name).join(", ");
      lines.push(`LOCAL SEO — ENTITĂȚI LIPSĂ DE MENȚIONAT: ${top}`);
    }
    return lines.join("\n");
  };

  const copySummary = (a: AuditRow) => {
    navigator.clipboard.writeText(buildSummaryText(a));
    toast.success("Rezumat copiat în clipboard");
  };

  const exportPDF = (a: AuditRow) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    const writeWrapped = (text: string, fontSize: number, opts?: { bold?: boolean; color?: [number, number, number] }) => {
      doc.setFontSize(fontSize);
      doc.setFont("helvetica", opts?.bold ? "bold" : "normal");
      if (opts?.color) doc.setTextColor(...opts.color);
      else doc.setTextColor(20, 20, 20);
      const lines = doc.splitTextToSize(text, pageW - margin * 2);
      lines.forEach((line: string) => {
        ensureSpace(fontSize + 4);
        doc.text(line, margin, y);
        y += fontSize + 4;
      });
    };

    // Header
    writeWrapped("SEO Audit Report — RealTrust", 18, { bold: true, color: [10, 60, 120] });
    writeWrapped(a.url, 11, { color: [80, 80, 80] });
    writeWrapped(`${new Date(a.created_at).toLocaleString("ro-RO")} · ${a.language.toUpperCase()}`, 10, { color: [120, 120, 120] });
    y += 10;

    // Score
    writeWrapped(`Scor general: ${a.overall_score ?? "—"}/100`, 16, { bold: true });
    if (a.local_relevance_score != null) {
      const localColor: [number, number, number] = a.local_relevance_score >= 70 ? [20, 120, 50] : a.local_relevance_score >= 50 ? [180, 120, 20] : [180, 40, 40];
      writeWrapped(`Scor Local SEO Timișoara: ${a.local_relevance_score}/100`, 13, { bold: true, color: localColor });
    }
    writeWrapped(`Cuvinte: ${a.word_count ?? "—"}  |  H1: ${a.h1_count ?? "—"}  |  Risc duplicat: ${a.raw_analysis?.duplicate_content_risk || "—"}`, 10);
    y += 10;

    if (a.suggested_title) {
      writeWrapped(`Titlu sugerat (${a.suggested_title.length} char)`, 12, { bold: true });
      writeWrapped(a.suggested_title, 11);
      if (a.title) writeWrapped(`Actual: ${a.title}`, 9, { color: [120, 120, 120] });
      y += 6;
    }
    if (a.suggested_meta) {
      writeWrapped(`Meta description sugerată (${a.suggested_meta.length} char)`, 12, { bold: true });
      writeWrapped(a.suggested_meta, 11);
      if (a.meta_description) writeWrapped(`Actual: ${a.meta_description}`, 9, { color: [120, 120, 120] });
      y += 6;
    }

    const sectionList = (title: string, items: any[], render: (it: any) => string) => {
      if (!items?.length) return;
      y += 6;
      writeWrapped(`${title} (${items.length})`, 13, { bold: true, color: [10, 60, 120] });
      items.forEach((it) => writeWrapped("• " + render(it), 10));
    };

    sectionList("Probleme", a.issues || [], (i) => `[${i.severity}] ${i.issue} → ${i.fix}`);
    sectionList("Keyword-uri lipsă", a.keyword_gaps || [], (k) => `[${k.priority}] ${k.keyword} — ${k.where_to_add}`);
    sectionList("Oportunități", a.opportunities || [], (o) => `[${o.type}/${o.impact}] ${o.description}`);
    sectionList("Puncte forte", a.strengths || [], (s) => typeof s === "string" ? s : (s.text || JSON.stringify(s)));

    if (a.raw_analysis?.recommended_internal_links?.length) {
      y += 6;
      writeWrapped(`Link-uri interne recomandate`, 13, { bold: true, color: [10, 60, 120] });
      a.raw_analysis.recommended_internal_links.forEach((l: string) => writeWrapped("→ " + l, 9, { color: [10, 60, 120] }));
    }

    // === LOCAL SEO RECOMMENDATIONS SECTION ===
    const hasLocalContent =
      (a.local_geo_keywords && a.local_geo_keywords.length > 0) ||
      (a.local_recommendations && a.local_recommendations.length > 0) ||
      (a.local_entities_found && a.local_entities_found.length > 0) ||
      (a.local_entities_missing && a.local_entities_missing.length > 0);

    if (hasLocalContent) {
      y += 14;
      ensureSpace(40);
      writeWrapped("📍 Local SEO Recommendations — Timișoara", 15, { bold: true, color: [180, 100, 20] });
      writeWrapped("Optimizări dedicate pentru Google Local Pack și căutări geografice locale.", 9, { color: [120, 120, 120] });
      y += 4;

      if (a.local_relevance_score != null) {
        writeWrapped(`Scor Local Relevance: ${a.local_relevance_score}/100`, 11, { bold: true });
        y += 2;
      }

      if (a.local_entities_found && a.local_entities_found.length > 0) {
        writeWrapped(`Entități locale GĂSITE în text (${a.local_entities_found.length})`, 11, { bold: true, color: [20, 120, 50] });
        a.local_entities_found.forEach((e: any) =>
          writeWrapped(`✓ ${e.name} (${e.category})`, 9, { color: [20, 120, 50] })
        );
        y += 4;
      }

      if (a.local_entities_missing && a.local_entities_missing.length > 0) {
        writeWrapped(`Entități locale LIPSĂ — sugerate pentru menționare (${a.local_entities_missing.length})`, 11, { bold: true, color: [180, 60, 60] });
        a.local_entities_missing.slice(0, 12).forEach((e: any) =>
          writeWrapped(`✗ ${e.name} (${e.category})`, 9, { color: [180, 60, 60] })
        );
        y += 4;
      }

      if (a.local_geo_keywords && a.local_geo_keywords.length > 0) {
        writeWrapped(`Keyword-uri geografice sugerate de AI pentru Local Pack (${a.local_geo_keywords.length})`, 11, { bold: true, color: [10, 60, 120] });
        a.local_geo_keywords.forEach((k: any) => {
          writeWrapped(`• [${k.priority || "medium"}] "${k.keyword}"`, 10, { bold: true });
          if (k.reason) writeWrapped(`   De ce: ${k.reason}`, 9, { color: [80, 80, 80] });
          if (k.suggested_placement) writeWrapped(`   Unde: ${k.suggested_placement}`, 9, { color: [80, 80, 80] });
        });
        y += 4;
      }

      if (a.local_recommendations && a.local_recommendations.length > 0) {
        writeWrapped(`Recomandări concrete pentru Local SEO (${a.local_recommendations.length})`, 11, { bold: true, color: [10, 60, 120] });
        a.local_recommendations.forEach((r: any) =>
          writeWrapped("→ " + (typeof r === "string" ? r : JSON.stringify(r)), 10)
        );
      }
    }

    // Footer page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Pagina ${i} / ${pageCount} · Generat de RealTrust SEO AI Optimizer`, margin, pageH - 20);
    }

    const safeName = a.url.replace(/https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 50);
    doc.save(`seo-audit-${safeName}-${new Date(a.created_at).toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF descărcat");
  };

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

  const scoreDelta = previousAudit && selectedAudit
    ? (selectedAudit.overall_score ?? 0) - (previousAudit.overall_score ?? 0)
    : null;

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

          <div className="flex flex-wrap gap-2 items-center">
            {QUICK_URLS.map((u) => (
              <Button key={u} variant="outline" size="sm" onClick={() => setUrl(u)}>
                {u.replace("https://www.realtrust.ro", "") || "/"}
              </Button>
            ))}
            <Button
              size="sm"
              variant="secondary"
              onClick={runBulkAudit}
              disabled={bulkRunning}
              className="ml-auto"
            >
              {bulkRunning ? (
                <>
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                  Bulk {bulkProgress.done}/{bulkProgress.total}
                </>
              ) : (
                <>
                  <Layers className="w-3 h-3 mr-2" />
                  Analizează toate ({QUICK_URLS.length})
                </>
              )}
            </Button>
          </div>
          {bulkRunning && (
            <Progress value={(bulkProgress.done / Math.max(bulkProgress.total, 1)) * 100} />
          )}
        </CardContent>
      </Card>

      {selectedAudit && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <CardTitle className="flex items-center gap-2 flex-wrap">
                  Rezultat audit
                  <a href={selectedAudit.url} target="_blank" rel="noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1 break-all">
                    <ExternalLink className="w-3 h-3" />
                    {selectedAudit.url}
                  </a>
                </CardTitle>
                <CardDescription className="mt-1">
                  {new Date(selectedAudit.created_at).toLocaleString("ro-RO")} · {selectedAudit.language.toUpperCase()}
                </CardDescription>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button size="sm" variant="outline" onClick={() => exportPDF(selectedAudit)}>
                    <Download className="w-3 h-3 mr-2" />
                    Descarcă PDF
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copySummary(selectedAudit)}>
                    <Copy className="w-3 h-3 mr-2" />
                    Copiază rezumat
                  </Button>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${scoreColor(selectedAudit.overall_score)}`}>
                  {selectedAudit.overall_score ?? "—"}
                  <span className="text-base text-muted-foreground">/100</span>
                </div>
                <Progress value={selectedAudit.overall_score ?? 0} className="w-32 mt-2" />
                {scoreDelta !== null && previousAudit && (
                  <div className="mt-2 text-xs flex items-center gap-1 justify-end">
                    {scoreDelta > 0 && <TrendingUp className="w-3 h-3 text-green-600" />}
                    {scoreDelta < 0 && <TrendingDown className="w-3 h-3 text-red-600" />}
                    {scoreDelta === 0 && <Minus className="w-3 h-3 text-muted-foreground" />}
                    <span className={scoreDelta > 0 ? "text-green-600" : scoreDelta < 0 ? "text-red-600" : "text-muted-foreground"}>
                      {scoreDelta > 0 ? "+" : ""}{scoreDelta} vs {new Date(previousAudit.created_at).toLocaleDateString("ro-RO")}
                    </span>
                  </div>
                )}
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

            {previousAudit && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-1">
                <div className="font-semibold text-primary flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Comparație vs audit anterior ({new Date(previousAudit.created_at).toLocaleString("ro-RO")})
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>Scor: <span className="font-semibold">{previousAudit.overall_score ?? "—"}</span> → <span className="font-semibold">{selectedAudit.overall_score ?? "—"}</span></div>
                  <div>Probleme: <span className="font-semibold">{previousAudit.issues?.length ?? 0}</span> → <span className="font-semibold">{selectedAudit.issues?.length ?? 0}</span></div>
                  <div>Cuvinte: <span className="font-semibold">{previousAudit.word_count ?? "—"}</span> → <span className="font-semibold">{selectedAudit.word_count ?? "—"}</span></div>
                </div>
              </div>
            )}

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
          <CardTitle>Istoric audituri ({filteredHistory.length}/{history.length})</CardTitle>
          <CardDescription>Ultimele 30 de audituri generate</CardDescription>
          <div className="flex flex-wrap gap-2 pt-3">
            <Input
              placeholder="Caută URL..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />
            <select
              value={filterLang}
              onChange={(e) => setFilterLang(e.target.value as any)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="all">Toate limbile</option>
              <option value="ro">RO</option>
              <option value="en">EN</option>
            </select>
            <select
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value={0}>Orice scor</option>
              <option value={60}>Scor ≥ 60</option>
              <option value={80}>Scor ≥ 80</option>
              <option value={90}>Scor ≥ 90</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredHistory.map((a) => (
                <div
                  key={a.id}
                  className="w-full rounded-lg border p-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3"
                >
                  <button
                    onClick={() => setSelectedAudit(a)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="font-medium text-sm truncate">{a.url}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("ro-RO")} · {a.language.toUpperCase()} · {a.word_count} cuvinte
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); exportPDF(a); }}
                      title="Descarcă PDF"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                    <div className={`text-2xl font-bold ${scoreColor(a.overall_score)}`}>
                      {a.overall_score ?? "—"}
                    </div>
                  </div>
                </div>
              ))}
              {filteredHistory.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">
                  {history.length === 0
                    ? "Nu există audituri încă. Analizează prima pagină pentru a începe."
                    : "Niciun audit nu corespunde filtrelor."}
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
