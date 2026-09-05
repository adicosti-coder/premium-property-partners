import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, Search, RefreshCw, AlertTriangle, CheckCircle2, Lightbulb,
  Copy, ExternalLink, Sparkles, Download, Layers, TrendingUp, TrendingDown, Minus, MapPin, Wand2, Undo2, Scissors,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import jsPDF from "jspdf";
import { SEOAutoFixPanel } from "./SEOAutoFixPanel";
import { SEOQuickWinsPanel } from "./SEOQuickWinsPanel";
import { SEOSchemaGeneratorPanel } from "./SEOSchemaGeneratorPanel";
import { SEORedeployPanel } from "./SEORedeployPanel";
import { SeoAlertsPanel } from "./SeoAlertsPanel";
import { SEOCannibalizationPanel } from "./SEOCannibalizationPanel";
import { SEOReauditSchedulerPanel } from "./SEOReauditSchedulerPanel";
import { SEOCompetitorGapPanel } from "./SEOCompetitorGapPanel";
import { SEOAutoLinkingPanel } from "./SEOAutoLinkingPanel";
import { SEOPremiumPlusPanel } from "./SEOPremiumPlusPanel";
import { SEOAutoPilot } from "./SEOAutoPilot";
import { SEOTrafficROIPanel } from "./SEOTrafficROIPanel";
import { GlobalCanonicalFixButton } from "./GlobalCanonicalFixButton";
import { RobotsCacheStatus } from "./RobotsCacheStatus";
import { LocalSEORecommendations } from "./LocalSEORecommendations";
import { SEOIssuesPanel } from "./SEOIssuesPanel";

const QUICK_URLS = [
  // Principal
  "https://realtrust.ro/",
  "https://realtrust.ro/despre-noi",
  "https://realtrust.ro/contact",
  // Proprietari
  "https://realtrust.ro/pentru-proprietari",
  "https://realtrust.ro/preturi",
  "https://realtrust.ro/hostscan-ai",
  "https://realtrust.ro/evaluare-gratuita",
  // Oaspeți
  "https://realtrust.ro/cazare",
  "https://realtrust.ro/oaspeti",
  "https://realtrust.ro/ansambluri-rezidentiale",
  // Investiții & Imobiliare
  "https://realtrust.ro/investitii",
  "https://realtrust.ro/catalog-investitii",
  "https://realtrust.ro/imobiliare",
  "https://realtrust.ro/cartiere",
  "https://realtrust.ro/calculator-roi",
  "https://realtrust.ro/analiza-roi-apartament",
  "https://realtrust.ro/piata-imobiliara-timisoara",
  // Cartiere prioritare (NeighborhoodDetail)
  "https://realtrust.ro/imobiliare-timisoara/isho",
  "https://realtrust.ro/imobiliare-timisoara/iosefin",
  "https://realtrust.ro/imobiliare-timisoara/dumbravita",
  "https://realtrust.ro/imobiliare-timisoara/giroc",
  "https://realtrust.ro/imobiliare-timisoara/complex-studentesc",
  // Informații
  "https://realtrust.ro/blog",
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
  const [url, setUrl] = useState("https://realtrust.ro/");
  const [language, setLanguage] = useState<"ro" | "en">("ro");
  const [selectedAudit, setSelectedAudit] = useState<AuditRow | null>(null);
  const [filter, setFilter] = useState("");
  const [filterLang, setFilterLang] = useState<"all" | "ro" | "en">("all");
  const [minScore, setMinScore] = useState<number>(0);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [dualRunning, setDualRunning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [revertConfirm, setRevertConfirm] = useState<string | null>(null);
  const [editedMeta, setEditedMeta] = useState<Record<string, string>>({});
  const [serpPreview, setSerpPreview] = useState<AuditRow | null>(null);

  // Trim a meta description to <=target chars (default 155) at the nearest
  // sentence boundary, falling back to the last word boundary. Never cuts
  // mid-word. Final length (incl. ellipsis) is guaranteed <= target.
  const shortenMeta = (text: string, target = 155): string => {
    const t = (text || "").replace(/\s+/g, " ").trim();
    if (t.length <= target) return t;
    // Reserve 1 char for the ellipsis so total length stays <= target
    const budget = target - 1;
    const slice = t.slice(0, budget + 1);
    // Prefer end-of-sentence punctuation if it lands in the last 40%
    const punct = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
    if (punct > target * 0.6 && punct + 1 <= target) {
      return slice.slice(0, punct + 1).trim();
    }
    // Cut at last space within budget — never split a word
    const lastSpace = t.slice(0, budget).lastIndexOf(" ");
    const cut = lastSpace > 0 ? t.slice(0, lastSpace) : t.slice(0, budget);
    return cut.trim().replace(/[,;:.!?\-–—]+$/, "") + "…";
  };

  const { data: history = [] } = useQuery({
    queryKey: ["seo-audits-history"],
    queryFn: async () => {
      const { data, error } = await supabase.from("seo_audits")
        .select("*").order("created_at", { ascending: false }).limit(500);
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

  const seoStats = useMemo(() => {
    const latest = new Map<string, AuditRow>();
    history.forEach((audit) => {
      const key = `${audit.url}::${audit.language}`;
      if (!latest.has(key)) latest.set(key, audit);
    });
    const audits = Array.from(latest.values());
    const avgScore = audits.length
      ? Math.round(audits.reduce((sum, a) => sum + (a.overall_score ?? 0), 0) / audits.length)
      : 0;
    const criticalIssues = audits.reduce(
      (sum, a) => sum + (a.issues || []).filter((issue: any) => issue.severity === "critical").length,
      0
    );
    const urgentAudits = audits
      .filter((a) => (a.overall_score ?? 0) < 70 || (a.issues || []).some((issue: any) => issue.severity === "critical"))
      .sort((a, b) => (a.overall_score ?? 0) - (b.overall_score ?? 0))
      .slice(0, 5);
    return { latestCount: audits.length, avgScore, criticalIssues, urgentAudits };
  }, [history]);

  const auditMutation = useMutation({
    mutationFn: async ({ targetUrl, force }: { targetUrl: string; force: boolean }) => {
      const { data, error } = await supabase.functions.invoke("seo-ai-optimizer", {
        body: { url: targetUrl, language, forceRefresh: force },
      });
      if (error) {
        // 503 = scraping indisponibil (credite Firecrawl epuizate / rate limit).
        // Afișăm un avertisment clar, fără să blocăm restul panoului.
        try {
          const res = (error as any)?.context as Response | undefined;
          if (res && typeof res.json === "function") {
            const body = await res.clone().json();
            if (body?.code === "scrape_unavailable" || res.status === 503) {
              const unavailable = new Error(
                body?.error || "Audit SEO indisponibil momentan: serviciul de scraping nu răspunde (credite epuizate sau limită atinsă). Reîncearcă mai târziu.",
              );
              (unavailable as any).code = "scrape_unavailable";
              throw unavailable;
            }
          }
        } catch (parseErr: any) {
          if (parseErr?.code === "scrape_unavailable") throw parseErr;
        }
        throw error;
      }
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(data.cached ? "Audit din cache" : "Audit nou generat");
      setSelectedAudit(data.audit);
      qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
    },
    onError: (e: any) => {
      if (e?.code === "scrape_unavailable") {
        toast.warning(e.message, { duration: 8000 });
        return;
      }
      toast.error(e.message || "Eroare audit");
    },
  });

  // Active overrides per URL path → shows badge "Aplicat" in UI
  const { data: overrides = [] } = useQuery({
    queryKey: ["seo-overrides"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_overrides")
        .select("url_path, title, meta_description, json_ld, applied_at, source_audit_id, is_active")
        .eq("is_active", true);
      return data || [];
    },
  });

  const overrideMap = useMemo(() => {
    const m = new Map<string, any>();
    overrides.forEach((o: any) => m.set(o.url_path, o));
    return m;
  }, [overrides]);

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

  const applyMutation = useMutation({
    mutationFn: async (a: AuditRow) => {
      const path = urlToPath(a.url);

      // Use edited meta if user adjusted it inline, else fall back to AI suggestion.
      const effectiveMeta = (editedMeta[a.id] ?? a.suggested_meta ?? "").trim();
      const metaLen = effectiveMeta.length;
      if (metaLen > 200) {
        throw new Error(
          `Meta description prea lungă (${metaLen} caractere). Maxim 200, optim ~160. Folosește butonul "Generează meta optim" sau editează manual.`
        );
      }
      if (metaLen > 160) {
        const ok = window.confirm(
          `Meta description are ${metaLen} caractere (optim ≤160). Google va trunchia la afișare. Continui?`
        );
        if (!ok) throw new Error("Aplicare anulată — meta peste limita optimă.");
      }

      const extra_keywords = [
        ...(Array.isArray(a.local_geo_keywords) ? a.local_geo_keywords : []),
        ...(Array.isArray(a.keyword_gaps) ? a.keyword_gaps : []),
      ]
        .map((k: any) => ({
          keyword: k.keyword || (typeof k === "string" ? k : ""),
          reason: k.reason || k.why || null,
          priority: k.priority || "medium",
        }))
        .filter((k) => k.keyword)
        .slice(0, 12);

      const structural_todos = (a.issues || [])
        .filter((i: any) => i.severity === "critical" || i.severity === "high")
        .map((i: any) => ({ issue: i.issue, fix: i.fix, severity: i.severity }))
        .slice(0, 10);

      const { data: userRes, error: authErr } = await supabase.auth.getUser();
      if (authErr) throw new Error(`Autentificare eșuată: ${authErr.message}`);

      const { error } = await supabase.from("seo_overrides").upsert(
        {
          url_path: path,
          title: a.suggested_title || null,
          meta_description: effectiveMeta || null,
          extra_keywords,
          structural_todos,
          source_audit_id: a.id,
          applied_by: userRes.user?.id || null,
          applied_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: "url_path" }
      );
      if (error) {
        // Distinguish DB connectivity vs RLS vs validation errors
        const msg = error.message || "";
        if (/jwt|permission|rls|policy/i.test(msg)) {
          throw new Error(`Acces refuzat de baza de date (RLS): ${msg}`);
        }
        if (/network|fetch|connection|timeout/i.test(msg)) {
          throw new Error(`Eșec la conectarea cu baza de date: ${msg}`);
        }
        throw new Error(`Salvare eșuată: ${msg}`);
      }
      return path;
    },
    onSuccess: (path) => {
      toast.success(`Implementat pe ${path}`, {
        description: "Title, meta și keywords se aplică automat la următoarea încărcare.",
      });
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
    },
    onError: (e: any) => {
      toast.error("Eroare la implementare", {
        description: e?.message || "Cauză necunoscută. Verifică consola pentru detalii.",
        duration: 6000,
      });
    },
  });

  const revertMutation = useMutation({
    mutationFn: async (urlFull: string) => {
      const path = urlToPath(urlFull);
      const { error } = await supabase.from("seo_overrides").update({ is_active: false }).eq("url_path", path);
      if (error) {
        const msg = error.message || "";
        if (/network|fetch|connection|timeout/i.test(msg)) {
          throw new Error(`Eșec la conectarea cu baza de date: ${msg}`);
        }
        if (/jwt|permission|rls|policy/i.test(msg)) {
          throw new Error(`Acces refuzat: ${msg}`);
        }
        throw new Error(`Revert eșuat: ${msg}`);
      }
      return path;
    },
    onSuccess: (path) => {
      toast.success(`Revenit la SEO original pe ${path}`, {
        description: "Pagina folosește acum metadatele implicite din cod.",
      });
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
    },
    onError: (e: any) => {
      toast.error("Eroare la revert", {
        description: e?.message || "Cauză necunoscută.",
        duration: 6000,
      });
    },
  });

  const runBulkAudit = async () => {
    setBulkRunning(true);
    setBulkProgress({ done: 0, total: QUICK_URLS.length });
    let success = 0;
    for (let i = 0; i < QUICK_URLS.length; i++) {
      try {
        await supabase.functions.invoke("seo-ai-optimizer", {
          body: { url: QUICK_URLS[i], language, forceRefresh: true },
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

  const runDualLanguageAudit = async () => {
    setDualRunning(true);
    let lastAudit: AuditRow | null = null;
    try {
      for (const lang of ["ro", "en"] as const) {
        const { data, error } = await supabase.functions.invoke("seo-ai-optimizer", {
          body: { url, language: lang, forceRefresh: true },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.audit) lastAudit = data.audit as AuditRow;
      }
      if (lastAudit) setSelectedAudit(lastAudit);
      qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
      toast.success("Audit RO + EN finalizat");
    } catch (e: any) {
      toast.error(e.message || "Eroare audit RO + EN");
    } finally {
      setDualRunning(false);
    }
  };

  const buildImplementationBrief = (a: AuditRow): string => {
    const topIssues = (a.issues || []).slice(0, 5).map((i: any) => `- [${i.severity}] ${i.issue}: ${i.fix}`).join("\n");
    const topKeywords = [...(a.keyword_gaps || []), ...(a.local_geo_keywords || [])]
      .slice(0, 8)
      .map((k: any) => `- ${k.keyword || k}: ${k.where_to_add || k.suggested_placement || "adaugă natural în conținut"}`)
      .join("\n");
    const links = (a.raw_analysis?.recommended_internal_links || []).slice(0, 6).map((l: string) => `- ${l}`).join("\n");
    return [
      `Brief implementare SEO — ${a.url}`,
      `Scor actual: ${a.overall_score ?? "—"}/100 · Local SEO: ${a.local_relevance_score ?? "—"}/100`,
      "",
      "1) Title / Meta",
      `Title propus: ${a.suggested_title || "—"}`,
      `Meta propusă: ${a.suggested_meta || "—"}`,
      "",
      "2) Probleme prioritare",
      topIssues || "- Nu sunt probleme critice detectate.",
      "",
      "3) Keyword-uri de integrat",
      topKeywords || "- Nu sunt keyword gaps majore.",
      "",
      "4) Link-uri interne recomandate",
      links || "- Nu sunt link-uri interne recomandate de AI.",
    ].join("\n");
  };

  const exportHistoryCSV = () => {
    const header = ["url", "language", "score", "local_score", "issues", "critical_issues", "word_count", "created_at"].join(",");
    const rows = filteredHistory.map((a) => [
      a.url,
      a.language,
      a.overall_score ?? "",
      a.local_relevance_score ?? "",
      a.issues?.length ?? 0,
      (a.issues || []).filter((issue: any) => issue.severity === "critical").length,
      a.word_count ?? "",
      a.created_at,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `realtrust-seo-audituri-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(href);
    toast.success("CSV exportat");
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
          <div className="flex flex-wrap gap-2 pt-2">
            <GlobalCanonicalFixButton />
          </div>
          <div className="pt-3">
            <RobotsCacheStatus />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://realtrust.ro/..."
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
            <Button
              variant="secondary"
              onClick={runDualLanguageAudit}
              disabled={dualRunning || auditMutation.isPending || !url}
              title="Analizează aceeași pagină în română și engleză"
            >
              {dualRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              RO+EN
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Scor mediu ultimele audituri</div>
              <div className={`text-2xl font-bold ${scoreColor(seoStats.avgScore)}`}>{seoStats.avgScore}<span className="text-sm text-muted-foreground">/100</span></div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Pagini urmărite</div>
              <div className="text-2xl font-bold">{seoStats.latestCount}</div>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <div className="text-xs text-muted-foreground">Probleme critice</div>
              <div className={`text-2xl font-bold ${seoStats.criticalIssues > 0 ? "text-red-600" : "text-green-600"}`}>{seoStats.criticalIssues}</div>
            </div>
          </div>

          {seoStats.urgentAudits.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <div className="mb-2 flex items-center gap-2 font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" /> Prioritate optimizare
              </div>
              <div className="space-y-1">
                {seoStats.urgentAudits.map((audit) => (
                  <button key={`${audit.id}-priority`} onClick={() => setSelectedAudit(audit)} className="block w-full truncate text-left text-xs hover:text-primary">
                    {audit.overall_score ?? "—"}/100 · {audit.url}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            {QUICK_URLS.map((u) => (
              <Button key={u} variant="outline" size="sm" onClick={() => setUrl(u)}>
                {u.replace("https://realtrust.ro", "") || "/"}
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

      <SEOPremiumPlusPanel history={history as any} overrides={overrides as any} />

      <SEOAutoPilot history={history as any} overrides={overrides as any} />


      <SEOQuickWinsPanel history={history} overrides={overrides as any} />

      <SEOSchemaGeneratorPanel history={history} overrides={overrides as any} />

      <SEORedeployPanel overrides={overrides as any} />

      <SeoAlertsPanel />

      <SEOCannibalizationPanel history={history as any} />

      <SEOReauditSchedulerPanel history={history as any} />

      <SEOCompetitorGapPanel />

      <SEOTrafficROIPanel />

      <SEOAutoLinkingPanel history={history as any} />

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
                  <Button size="sm" variant="secondary" onClick={() => copyText(buildImplementationBrief(selectedAudit), "Brief implementare")}>
                    <Lightbulb className="w-3 h-3 mr-2" />
                    Brief implementare
                  </Button>
                  {(() => {
                    const path = urlToPath(selectedAudit.url);
                    const existing = overrideMap.get(path);
                    const canApply = !!(selectedAudit.suggested_title || selectedAudit.suggested_meta);
                    const metaLen = (selectedAudit.suggested_meta || "").trim().length;
                    const metaTooLong = metaLen > 160;
                    return (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={!canApply || applyMutation.isPending}
                          onClick={() => {
                            toast.info("Se aplică sugestiile SEO…", {
                              description: `URL: ${urlToPath(selectedAudit.url)}`,
                              duration: 2500,
                            });
                            applyMutation.mutate(selectedAudit);
                          }}
                          title={canApply ? "Aplică title, meta description și keywords pe pagina live" : "Audit fără sugestii — generează unul nou"}
                        >
                          {applyMutation.isPending ? (
                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                          ) : (
                            <Wand2 className="w-3 h-3 mr-2" />
                          )}
                          {existing ? "Reaplică sugestiile" : "Implementează automat"}
                        </Button>
                        {existing && (
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={revertMutation.isPending}
                              onClick={() => setRevertConfirm(selectedAudit.url)}
                            >
                              {revertMutation.isPending ? (
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                              ) : (
                                <Undo2 className="w-3 h-3 mr-2" />
                              )}
                              Revert
                            </Button>
                            <span className="text-[10px] text-muted-foreground leading-tight">
                              Ultima aplicare:<br />
                              {new Date(existing.applied_at).toLocaleString("ro-RO", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        )}
                        {canApply && metaTooLong && (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 self-center">
                            ⚠ Meta: {metaLen}/160 caractere
                          </span>
                        )}
                      </>
                    );
                  })()}
                </div>
                {(() => {
                  const path = urlToPath(selectedAudit.url);
                  const existing = overrideMap.get(path);
                  if (!existing) return null;
                  return (
                    <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        Activ pe site din: {new Date(existing.applied_at).toLocaleString("ro-RO")}
                      </span>
                    </div>
                  );
                })()}
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
            <SEOAutoFixPanel audit={selectedAudit} />
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
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
              <div className="rounded-lg border p-3 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
                <div className="text-muted-foreground text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Local SEO Timișoara
                </div>
                <div className={`text-lg font-semibold ${scoreColor(selectedAudit.local_relevance_score ?? null)}`}>
                  {selectedAudit.local_relevance_score ?? "—"}<span className="text-xs text-muted-foreground">/100</span>
                </div>
                {selectedAudit.local_entities_found && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {selectedAudit.local_entities_found.length} entități găsite
                  </div>
                )}
              </div>
            </div>

            {selectedAudit.raw_analysis?._diagnostics && (
              <div className="rounded-lg border border-blue-300 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 p-4 text-xs space-y-2">
                <div className="font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  🔬 Diagnostic — ce a citit efectiv auditul
                </div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1">
                  <div><span className="text-muted-foreground">Sursă scrape:</span> <code className="font-semibold">{selectedAudit.raw_analysis._diagnostics.scrape_source || "—"}</code></div>
                  <div><span className="text-muted-foreground">Force refresh:</span> <code>{String(selectedAudit.raw_analysis._diagnostics.force_refresh)}</code></div>
                  <div><span className="text-muted-foreground">H1 detectat:</span> <code>{selectedAudit.raw_analysis._diagnostics.h1_count ?? "—"}</code></div>
                  <div><span className="text-muted-foreground">H2 detectat:</span> <code>{selectedAudit.raw_analysis._diagnostics.h2_count ?? "—"}</code></div>
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Title detectat:</span> <code className="break-all">{selectedAudit.raw_analysis._diagnostics.title_detected || "—"}</code></div>
                  <div className="sm:col-span-2"><span className="text-muted-foreground">Meta aleasă:</span> <code className="break-words">{selectedAudit.raw_analysis._diagnostics.meta_chosen || "—"}</code></div>
                </div>
                {Array.isArray(selectedAudit.raw_analysis._diagnostics.meta_candidates) && selectedAudit.raw_analysis._diagnostics.meta_candidates.length > 0 && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-blue-700 dark:text-blue-300 font-medium">
                      Toate candidații meta description găsiți ({selectedAudit.raw_analysis._diagnostics.meta_candidates.length})
                    </summary>
                    <ul className="mt-2 space-y-1 pl-4">
                      {selectedAudit.raw_analysis._diagnostics.meta_candidates.map((c: any, i: number) => (
                        <li key={i} className="break-words">
                          <span className="text-muted-foreground">[{c.source}]</span> <code>{c.value}</code> <span className="text-muted-foreground">({c.value?.length || 0} char)</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

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
                {(() => {
                  const currentMeta = editedMeta[selectedAudit.id] ?? selectedAudit.suggested_meta ?? "";
                  const len = currentMeta.length;
                  const isEdited = editedMeta[selectedAudit.id] !== undefined;
                  // Color spec: GREEN strict 140–160 (sweet spot), RED >160, AMBER <140
                  let counterColor = "text-amber-600 dark:text-amber-400";
                  if (len > 160) counterColor = "text-red-600 dark:text-red-400";
                  else if (len >= 140 && len <= 160) counterColor = "text-emerald-600 dark:text-emerald-400";
                  return (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center justify-between gap-2 flex-wrap">
                        <span className="flex items-center gap-2">
                          META DESCRIPTION SUGERATĂ
                          <span className={`font-mono ${counterColor}`}>{len}/160</span>
                          {len > 200 && <Badge variant="destructive" className="text-[10px]">peste limita absolută 200</Badge>}
                          {len > 160 && len <= 200 && <Badge variant="destructive" className="text-[10px]">va fi trunchiată</Badge>}
                          {len > 0 && len < 140 && <Badge variant="outline" className="text-[10px]">prea scurtă</Badge>}
                          {isEdited && <Badge variant="secondary" className="text-[10px]">editat</Badge>}
                        </span>
                        <span className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSerpPreview(selectedAudit)}
                            title="Vezi cum arată în Google"
                          >
                            <Search className="w-3 h-3 mr-1" />
                            Previzualizare Google
                          </Button>
                          {len > 155 && (
                            <Button
                              size="sm"
                              variant={len > 200 ? "destructive" : "outline"}
                              onClick={() => {
                                const next = shortenMeta(currentMeta, 155);
                                setEditedMeta((m) => ({ ...m, [selectedAudit.id]: next }));
                                toast.success("Meta scurtată automat la 155 caractere", {
                                  description: `${len} → ${next.length} caractere · fără tăiere de cuvinte`,
                                });
                              }}
                              title="Scurtează automat la 155 caractere, fără a tăia cuvintele"
                            >
                              <Scissors className="w-3 h-3 mr-1" />
                              Generează meta optim
                            </Button>
                          )}
                          {isEdited && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditedMeta((m) => {
                                const { [selectedAudit.id]: _, ...rest } = m;
                                return rest;
                              })}
                              title="Revino la sugestia AI originală"
                            >
                              <Undo2 className="w-3 h-3" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => copyText(currentMeta, "Meta")}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </span>
                      </div>
                      <textarea
                        className="w-full text-sm bg-background border rounded-md p-2 min-h-[64px] resize-y font-normal"
                        value={currentMeta}
                        onChange={(e) => setEditedMeta((m) => ({ ...m, [selectedAudit.id]: e.target.value }))}
                      />
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Optim: 110–160 caractere · Maxim absolut: 200
                      </div>
                      {selectedAudit.meta_description && (
                        <div className="text-xs text-muted-foreground mt-1">Actual: {selectedAudit.meta_description}</div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            <Accordion type="multiple" defaultValue={["local-seo", "issues", "keywords"]}>
              {(selectedAudit.local_relevance_score != null ||
                (selectedAudit.local_geo_keywords && selectedAudit.local_geo_keywords.length > 0) ||
                (selectedAudit.local_recommendations && selectedAudit.local_recommendations.length > 0)) && (
                <AccordionItem value="local-seo">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      Local SEO Audit — Timișoara
                      {selectedAudit.local_relevance_score != null && (
                        <Badge variant={selectedAudit.local_relevance_score >= 70 ? "default" : selectedAudit.local_relevance_score >= 50 ? "secondary" : "destructive"}>
                          {selectedAudit.local_relevance_score}/100
                        </Badge>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      {selectedAudit.local_entities_found && selectedAudit.local_entities_found.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-2 text-green-700 dark:text-green-400">
                            ✓ Entități locale găsite ({selectedAudit.local_entities_found.length})
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedAudit.local_entities_found.map((e: any, i: number) => (
                              <Badge key={i} variant="outline" className="border-green-300 text-green-700 dark:border-green-800 dark:text-green-400 text-xs">
                                {e.name} <span className="opacity-60 ml-1">· {e.category}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedAudit.local_entities_missing && selectedAudit.local_entities_missing.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-2 text-red-700 dark:text-red-400">
                            ✗ Entități importante lipsă ({selectedAudit.local_entities_missing.length}) — penalizează scorul
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedAudit.local_entities_missing.slice(0, 15).map((e: any, i: number) => (
                              <Badge key={i} variant="outline" className="border-red-300 text-red-700 dark:border-red-800 dark:text-red-400 text-xs">
                                {e.name} <span className="opacity-60 ml-1">· {e.category}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedAudit.local_geo_keywords && selectedAudit.local_geo_keywords.length > 0 && (
                        <div>
                          <div className="text-xs font-semibold mb-2 text-primary">
                            🔍 Keywords geografice sugerate de AI pentru Local Pack ({selectedAudit.local_geo_keywords.length})
                          </div>
                          <div className="space-y-2">
                            {selectedAudit.local_geo_keywords.map((k: any, i: number) => (
                              <div key={i} className="rounded border p-3 text-sm bg-amber-50/50 dark:bg-amber-950/10">
                                <div className="flex items-center justify-between gap-2">
                                  <code className="font-semibold">{k.keyword}</code>
                                  <div className="flex items-center gap-1">
                                    <Badge variant={k.priority === "high" ? "default" : "outline"} className="text-[10px]">{k.priority || "medium"}</Badge>
                                    <Button size="sm" variant="ghost" onClick={() => copyText(k.keyword, "Keyword")}>
                                      <Copy className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                {k.reason && <div className="text-muted-foreground text-xs mt-1">💡 {k.reason}</div>}
                                {k.suggested_placement && <div className="text-xs mt-1">📍 {k.suggested_placement}</div>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedAudit.local_recommendations && selectedAudit.local_recommendations.length > 0 && (
                        <LocalSEORecommendations
                          recommendations={selectedAudit.local_recommendations as any}
                          auditId={selectedAudit.id}
                          url={selectedAudit.url}
                        />
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {selectedAudit.issues?.length > 0 && (
                <AccordionItem value="issues">
                  <AccordionTrigger>
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Probleme ({selectedAudit.issues.length})
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <SEOIssuesPanel
                      auditId={selectedAudit.id}
                      url={selectedAudit.url}
                      issues={selectedAudit.issues}
                    />
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
            <Button variant="outline" onClick={exportHistoryCSV} disabled={filteredHistory.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {filteredHistory.map((a) => {
                const path = urlToPath(a.url);
                const existing = overrideMap.get(path);
                const canApply = !!(a.suggested_title || a.suggested_meta);
                const isPending = applyMutation.isPending && applyMutation.variables?.id === a.id;
                return (
                <div
                  key={a.id}
                  className="w-full rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => setSelectedAudit(a)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="font-medium text-sm truncate">{a.url}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString("ro-RO")} · {a.language.toUpperCase()} · {a.word_count} cuvinte
                        {existing && <span className="ml-2 text-emerald-600 font-medium">· Aplicat</span>}
                      </div>
                    </button>
                    <div className={`text-2xl font-bold shrink-0 ${scoreColor(a.overall_score)}`}>
                      {a.overall_score ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <Button
                      size="sm"
                      variant={existing ? "outline" : "default"}
                      disabled={!canApply || isPending}
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info("Se aplică sugestiile SEO…", {
                          description: `URL: ${path}`,
                          duration: 2500,
                        });
                        applyMutation.mutate(a);
                      }}
                      title={canApply ? (existing ? "Reaplică sugestiile pe pagina live" : "Implementează automat title, meta și keywords") : "Audit fără sugestii"}
                      className="min-h-[36px]"
                    >
                      {isPending ? (
                        <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                      ) : (
                        <Wand2 className="w-3 h-3 mr-1.5" />
                      )}
                      {existing ? "Reaplică" : "Aplică"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); exportPDF(a); }}
                      title="Descarcă PDF"
                    >
                      <Download className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                );
              })}
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

      <AlertDialog open={!!revertConfirm} onOpenChange={(o) => !o && setRevertConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulezi override-ul SEO?</AlertDialogTitle>
            <AlertDialogDescription>
              Pagina <code className="text-xs">{revertConfirm ? urlToPath(revertConfirm) : ""}</code> va reveni la title-ul, meta description și keywords-urile implicite din cod.
              <br /><br />
              Acțiunea este reversibilă — poți reaplica oricând sugestiile AI ulterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (revertConfirm) {
                  toast.info("Se revine la SEO original…", { duration: 2000 });
                  revertMutation.mutate(revertConfirm);
                }
                setRevertConfirm(null);
              }}
            >
              Da, anulează override-ul
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!serpPreview} onOpenChange={(o) => !o && setSerpPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Previzualizare Google SERP
            </DialogTitle>
            <DialogDescription>
              Așa va apărea pagina în rezultatele căutării Google (desktop).
            </DialogDescription>
          </DialogHeader>
          {serpPreview && (() => {
            const previewMeta = (editedMeta[serpPreview.id] ?? serpPreview.suggested_meta ?? "").trim();
            const previewTitle = (serpPreview.suggested_title || serpPreview.title || "").trim();
            // Google trunchiază title la ~60 char și meta la ~160 char (desktop)
            const displayTitle = previewTitle.length > 60 ? previewTitle.slice(0, 57).trimEnd() + "…" : previewTitle;
            const displayMeta = previewMeta.length > 160 ? previewMeta.slice(0, 157).trimEnd() + "…" : previewMeta;
            const path = urlToPath(serpPreview.url);
            const breadcrumb = `www.realtrust.ro${path === "/" ? "" : " › " + path.replace(/^\//, "").replace(/\//g, " › ")}`;
            const today = new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
            return (
              <div className="space-y-4">
                {/* Desktop SERP card */}
                <div className="rounded-lg border bg-white dark:bg-zinc-900 p-4 font-sans">
                  <div className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white text-[10px] font-bold">R</div>
                    <div className="flex flex-col leading-tight">
                      <span className="font-medium text-zinc-900 dark:text-zinc-100">RealTrust</span>
                      <span className="text-zinc-500 text-[11px]">{breadcrumb}</span>
                    </div>
                  </div>
                  <h3 className="mt-2 text-[20px] leading-[1.3] text-[#1a0dab] dark:text-[#8ab4f8] font-normal hover:underline cursor-pointer">
                    {displayTitle || <span className="italic text-zinc-400">(fără titlu)</span>}
                  </h3>
                  <p className="mt-1 text-[14px] leading-[1.58] text-zinc-700 dark:text-zinc-300">
                    <span className="text-zinc-500">{today} — </span>
                    {displayMeta || <span className="italic text-zinc-400">(fără meta description)</span>}
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground">Title</div>
                    <div className="font-mono">
                      <span className={previewTitle.length > 60 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}>
                        {previewTitle.length}
                      </span>
                      /60 caractere {previewTitle.length > 60 && "· va fi trunchiat"}
                    </div>
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground">Meta description</div>
                    <div className="font-mono">
                      <span className={
                        previewMeta.length > 160 ? "text-red-600 dark:text-red-400"
                        : previewMeta.length >= 140 ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                      }>
                        {previewMeta.length}
                      </span>
                      /160 caractere {previewMeta.length > 160 && "· va fi trunchiată"}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Notă: Google poate rescrie automat title/meta în funcție de query. Această previzualizare arată cazul implicit.
                </p>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SEOOptimizerManager;
