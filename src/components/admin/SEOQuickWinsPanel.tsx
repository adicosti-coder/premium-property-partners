import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Zap,
  AlertTriangle,
  FileText,
  Type,
  ImageIcon,
  Layers,
  CheckCircle2,
  RefreshCw,
  Eye,
  Undo2,
  Download,
  Sparkles,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  url: string;
  language: string;
  overall_score: number | null;
  title: string | null;
  meta_description: string | null;
  suggested_title: string | null;
  suggested_meta: string | null;
  issues: any[];
  created_at: string;
}

interface OverrideRow {
  url_path: string;
  title: string | null;
  meta_description: string | null;
  is_active: boolean;
}

interface Props {
  history: AuditRow[];
  overrides: OverrideRow[];
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

const trimMeta = (m: string, max = 160): string => {
  if (m.length <= max) return m;
  const slice = m.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim() + "…";
};

const trimTitle = (t: string, max = 60): string => {
  if (t.length <= max) return t;
  const slice = t.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim() + "…";
};

type FixCategory =
  | "missing_meta"
  | "missing_title"
  | "long_title"
  | "long_meta"
  | "low_score"
  | "missing_schema"
  | "missing_alt";

interface CategoryDef {
  key: FixCategory;
  label: string;
  icon: any;
  color: string;
  matches: (a: AuditRow, ovr?: OverrideRow) => boolean;
  /** "preview": opens preview modal with editable text. "ai": runs per-audit AI generate_fix via seo-auto-fix. */
  fixMode: "preview" | "ai" | "none";
  fixType?: "title" | "meta" | "schema" | "alt_text";
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "missing_meta",
    label: "Fără meta description",
    icon: FileText,
    color: "text-orange-600",
    matches: (a, ovr) => !((ovr?.meta_description || a.meta_description || "").trim()),
    fixMode: "preview",
    fixType: "meta",
  },
  {
    key: "missing_title",
    label: "Fără title sau title scurt",
    icon: Type,
    color: "text-orange-600",
    matches: (a, ovr) => {
      const t = (ovr?.title || a.title || "").trim();
      return !t || t.length < 20;
    },
    fixMode: "preview",
    fixType: "title",
  },
  {
    key: "long_title",
    label: "Title >60 caractere",
    icon: Type,
    color: "text-amber-600",
    matches: (a, ovr) => (ovr?.title || a.title || "").trim().length > 60,
    fixMode: "preview",
    fixType: "title",
  },
  {
    key: "long_meta",
    label: "Meta >160 caractere",
    icon: FileText,
    color: "text-amber-600",
    matches: (a, ovr) => (ovr?.meta_description || a.meta_description || "").trim().length > 160,
    fixMode: "preview",
    fixType: "meta",
  },
  {
    key: "low_score",
    label: "Scor <70",
    icon: AlertTriangle,
    color: "text-red-600",
    matches: (a) => (a.overall_score ?? 100) < 70,
    fixMode: "ai",
    fixType: "title",
  },
  {
    key: "missing_schema",
    label: "Fără Schema.org",
    icon: Layers,
    color: "text-blue-600",
    matches: (a) =>
      (a.issues || []).some((i: any) => /schema|json-ld|structured/i.test(i.issue || "")),
    fixMode: "ai",
    fixType: "schema",
  },
  {
    key: "missing_alt",
    label: "Imagini fără alt-text",
    icon: ImageIcon,
    color: "text-purple-600",
    matches: (a) =>
      (a.issues || []).some((i: any) => /\balt\b|alt[-\s]?text/i.test(i.issue || "")),
    fixMode: "ai",
    fixType: "alt_text",
  },
];

interface PreviewRow {
  audit: AuditRow;
  path: string;
  selected: boolean;
  newTitle: string;
  newMeta: string;
  needsRegenerate: boolean;
}

export const SEOQuickWinsPanel = ({ history, overrides }: Props) => {
  const qc = useQueryClient();
  const [bulkRunning, setBulkRunning] = useState<FixCategory | null>(null);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [previewCat, setPreviewCat] = useState<FixCategory | null>(null);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [regenerating, setRegenerating] = useState(false);
  const [reauditing, setReauditing] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [lastBatch, setLastBatch] = useState<{ batchId: string; category: FixCategory; paths: string[]; ts: string } | null>(null);
  const [showStaleList, setShowStaleList] = useState(false);

  // Persisted last batch from seo_audit_log
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("seo_audit_log" as any)
        .select("batch_id,category,url_path,applied_at,reverted")
        .eq("reverted", false)
        .in("action", ["preview_apply", "ai_fix"])
        .order("applied_at", { ascending: false })
        .limit(50);
      if (!data?.length) return;
      const top: any = data[0];
      const sameBatch = data.filter((d: any) => d.batch_id === top.batch_id);
      setLastBatch({
        batchId: top.batch_id,
        category: top.category as FixCategory,
        paths: sameBatch.map((d: any) => d.url_path),
        ts: top.applied_at,
      });
    })();
  }, []);

  // GA4 metrics for export
  const { data: ga4Metrics } = useQuery({
    queryKey: ["seo-ga4-metrics-quickwins"],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_ga4_metrics" as any)
        .select("url_path,sessions,conversions")
        .order("period_start", { ascending: false })
        .limit(500);
      return (data || []) as any[];
    },
    staleTime: 5 * 60 * 1000,
  });


  const latestPerUrl = useMemo(() => {
    const m = new Map<string, AuditRow>();
    history.forEach((a) => {
      const key = `${a.url}::${a.language}`;
      if (!m.has(key)) m.set(key, a);
    });
    return Array.from(m.values());
  }, [history]);

  const overrideMap = useMemo(() => {
    const m = new Map<string, OverrideRow>();
    overrides.forEach((o) => m.set(o.url_path, o));
    return m;
  }, [overrides]);

  const stats = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const matched = latestPerUrl.filter((a) => cat.matches(a, overrideMap.get(urlToPath(a.url))));
      return { ...cat, count: matched.length, audits: matched };
    });
  }, [latestPerUrl, overrideMap]);

  const totalIssues = stats.reduce((s, c) => s + c.count, 0);
  const cleanPages = latestPerUrl.length - new Set(stats.flatMap((c) => c.audits.map((a) => a.id))).size;
  const oldestAuditDays = latestPerUrl.length
    ? Math.max(
        ...latestPerUrl.map((a) =>
          Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86400000)
        )
      )
    : 0;

  // ---- Open preview for a category ----
  const openPreview = (cat: FixCategory) => {
    const def = stats.find((c) => c.key === cat);
    if (!def || !def.audits.length) return;
    const rows: PreviewRow[] = def.audits.map((a) => {
      const path = urlToPath(a.url);
      const existing = overrideMap.get(path);
      const currentTitle = existing?.title || a.title || "";
      const currentMeta = existing?.meta_description || a.meta_description || "";

      let newTitle = currentTitle;
      let newMeta = currentMeta;

      if (cat === "missing_title") newTitle = a.suggested_title || currentTitle;
      if (cat === "missing_meta") newMeta = a.suggested_meta || currentMeta;
      if (cat === "long_title")
        newTitle = a.suggested_title && a.suggested_title.length <= 60
          ? a.suggested_title
          : trimTitle(currentTitle);
      if (cat === "long_meta")
        newMeta = a.suggested_meta && a.suggested_meta.length <= 160
          ? a.suggested_meta
          : trimMeta(currentMeta);

      const needsRegen =
        (cat === "missing_title" && !a.suggested_title) ||
        (cat === "missing_meta" && !a.suggested_meta);

      return {
        audit: a,
        path,
        selected: !needsRegen,
        newTitle: newTitle || "",
        newMeta: newMeta || "",
        needsRegenerate: needsRegen,
      };
    });
    setPreviewRows(rows);
    setPreviewCat(cat);
  };

  // ---- Regenerate AI suggestions for rows missing them ----
  const regenerateMissing = async () => {
    const targets = previewRows.filter((r) => r.needsRegenerate);
    if (!targets.length) {
      toast.info("Nu există rânduri care necesită regenerare");
      return;
    }
    setRegenerating(true);
    try {
      let done = 0;
      for (const r of targets) {
        try {
          const { data } = await supabase.functions.invoke("seo-ai-optimizer", {
            body: { url: r.audit.url, language: r.audit.language || "ro", forceRefresh: true },
          });
          const newAudit = data?.audit;
          if (newAudit) {
            setPreviewRows((prev) =>
              prev.map((p) =>
                p.audit.id === r.audit.id
                  ? {
                      ...p,
                      audit: { ...p.audit, ...newAudit },
                      newTitle: newAudit.suggested_title || p.newTitle,
                      newMeta: newAudit.suggested_meta || p.newMeta,
                      needsRegenerate: false,
                      selected: true,
                    }
                  : p
              )
            );
          }
        } catch (e) {
          console.warn("regen failed for", r.path, e);
        }
        done++;
      }
      toast.success(`Regenerat ${done}/${targets.length} sugestii AI`);
      qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
    } finally {
      setRegenerating(false);
    }
  };

  // ---- Apply preview rows ----
  const applyPreview = async () => {
    if (!previewCat) return;
    const cat = previewCat;
    const selected = previewRows.filter((r) => r.selected);
    if (!selected.length) {
      toast.error("Selectează cel puțin un rând");
      return;
    }
    setBulkRunning(cat);
    setBulkProgress({ done: 0, total: selected.length });

    const { data: userRes } = await supabase.auth.getUser();
    const userId = userRes.user?.id || null;

    let success = 0;
    const appliedPaths: string[] = [];

    for (let i = 0; i < selected.length; i++) {
      const r = selected[i];
      const existing = overrideMap.get(r.path);
      const finalTitle =
        cat === "missing_title" || cat === "long_title"
          ? trimTitle(r.newTitle.trim())
          : existing?.title || r.audit.title || null;
      const finalMeta =
        cat === "missing_meta" || cat === "long_meta"
          ? trimMeta(r.newMeta.trim())
          : existing?.meta_description || r.audit.meta_description || null;

      try {
        await supabase.from("seo_overrides").upsert(
          {
            url_path: r.path,
            title: finalTitle,
            meta_description: finalMeta,
            source_audit_id: r.audit.id,
            applied_by: userId,
            applied_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: "url_path" }
        );
        success++;
        appliedPaths.push(r.path);
      } catch (e) {
        console.error("Bulk fix failed for", r.path, e);
      }
      setBulkProgress({ done: i + 1, total: selected.length });
    }

    setBulkRunning(null);
    setPreviewCat(null);
    const batchId = crypto.randomUUID();
    if (appliedPaths.length) {
      try {
        await supabase.from("seo_audit_log" as any).insert(
          appliedPaths.map((p) => ({
            batch_id: batchId,
            action: "preview_apply",
            category: cat,
            url_path: p,
            source: "manual",
            applied_by: userId,
            payload: { category: cat },
          }))
        );
      } catch (e) {
        console.warn("audit_log insert failed", e);
      }
    }
    setLastBatch({ batchId, category: cat, paths: appliedPaths, ts: new Date().toISOString() });
    toast.success(`${success}/${selected.length} pagini actualizate. Re-audit recomandat.`);
    qc.invalidateQueries({ queryKey: ["seo-overrides"] });
    qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
  };

  // ---- AI fix (per-audit) for non-meta categories (schema, alt_text, low_score) ----
  const aiFixCategory = useMutation({
    mutationFn: async (cat: FixCategory) => {
      const def = stats.find((c) => c.key === cat);
      if (!def || !def.fixType) throw new Error("Categorie fără AI fix");
      const targets = def.audits.slice(0, 10); // safety cap per run
      if (!targets.length) throw new Error("Nimic de aplicat");

      setBulkRunning(cat);
      setBulkProgress({ done: 0, total: targets.length });

      let success = 0;
      const paths: string[] = [];

      for (let i = 0; i < targets.length; i++) {
        const a = targets[i];
        const path = urlToPath(a.url);
        try {
          const { data: gen } = await supabase.functions.invoke("seo-auto-fix", {
            body: { action: "generate_fix", audit_id: a.id, fix_type: def.fixType },
          });
          if (gen?.proposal) {
            const { error } = await supabase.functions.invoke("seo-auto-fix", {
              body: {
                action: "apply_fix",
                url_path: path,
                payload: gen.proposal,
                audit_id: a.id,
                variant: "A",
              },
            });
            if (!error) {
              success++;
              paths.push(path);
            }
          }
        } catch (e) {
          console.warn("AI fix failed for", path, e);
        }
        setBulkProgress({ done: i + 1, total: targets.length });
      }
      return { success, total: targets.length, paths, cat };
    },
    onSuccess: async ({ success, total, paths, cat }) => {
      const batchId = crypto.randomUUID();
      const { data: userRes } = await supabase.auth.getUser();
      if (paths.length) {
        try {
          await supabase.from("seo_audit_log" as any).insert(
            paths.map((p) => ({
              batch_id: batchId,
              action: "ai_fix",
              category: cat,
              url_path: p,
              source: "manual",
              applied_by: userRes.user?.id || null,
              payload: { category: cat },
            }))
          );
        } catch (e) {
          console.warn("audit_log insert failed", e);
        }
      }
      toast.success(`AI fix: ${success}/${total} aplicate`);
      setLastBatch({ batchId, category: cat, paths, ts: new Date().toISOString() });
      setBulkRunning(null);
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
    },
    onError: (e: any) => {
      setBulkRunning(null);
      toast.error(e?.message || "AI fix eșuat");
    },
  });

  // ---- Re-audit pages from last batch (or all stale) ----
  const reauditPaths = async (paths: string[]) => {
    if (!paths.length) {
      toast.info("Nimic de re-auditat");
      return;
    }
    setReauditing(true);
    let done = 0;
    for (const p of paths) {
      try {
        const url = `https://www.realtrust.ro${p}`;
        await supabase.functions.invoke("seo-ai-optimizer", {
          body: { url, language: "ro", forceRefresh: true },
        });
      } catch (e) {
        console.warn("re-audit failed for", p, e);
      }
      done++;
    }
    setReauditing(false);
    toast.success(`Re-auditate ${done} pagini`);
    qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
    qc.invalidateQueries({ queryKey: ["seo-overrides"] });
  };

  // ---- Undo last batch ----
  const undoLast = async () => {
    if (!lastBatch) return;
    setUndoing(true);
    let success = 0;
    for (const p of lastBatch.paths) {
      try {
        await supabase.functions.invoke("seo-auto-fix", {
          body: { action: "revert", url_path: p },
        });
        success++;
      } catch (e) {
        console.warn("revert failed", p, e);
      }
    }
    try {
      await supabase
        .from("seo_audit_log" as any)
        .update({ reverted: true, reverted_at: new Date().toISOString() })
        .eq("batch_id", lastBatch.batchId);
    } catch (e) {
      console.warn("audit_log revert update failed", e);
    }
    setUndoing(false);
    toast.success(`Anulat ${success}/${lastBatch.paths.length}`);
    setLastBatch(null);
    qc.invalidateQueries({ queryKey: ["seo-overrides"] });
  };

  // ---- Stale pages (>7 days) ----
  const stalePages = useMemo(
    () =>
      latestPerUrl
        .map((a) => ({
          audit: a,
          path: urlToPath(a.url),
          days: Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86400000),
        }))
        .filter((s) => s.days > 7)
        .sort((a, b) => b.days - a.days),
    [latestPerUrl]
  );

  // ---- Export CSV (URL, Score, Sessions, Conversions, unresolved AI suggestions) ----
  const exportCSV = () => {
    const ga4Map = new Map<string, { sessions: number; conversions: number }>();
    (ga4Metrics || []).forEach((m: any) => {
      const prev = ga4Map.get(m.url_path) || { sessions: 0, conversions: 0 };
      ga4Map.set(m.url_path, {
        sessions: prev.sessions + (m.sessions || 0),
        conversions: prev.conversions + (m.conversions || 0),
      });
    });

    const issueIndex = new Map<string, string[]>();
    for (const c of stats) {
      for (const a of c.audits) {
        const arr = issueIndex.get(a.id) || [];
        arr.push(c.label);
        issueIndex.set(a.id, arr);
      }
    }

    const rows: string[] = [
      "url,url_path,seo_score,age_days,ga4_sessions,ga4_conversions,unresolved_issues,suggested_title,suggested_meta",
    ];
    for (const a of latestPerUrl) {
      const path = urlToPath(a.url);
      const ga = ga4Map.get(path) || { sessions: 0, conversions: 0 };
      const days = Math.floor((Date.now() - new Date(a.created_at).getTime()) / 86400000);
      const issues = (issueIndex.get(a.id) || []).join(" | ").replace(/"/g, '""');
      const st = (a.suggested_title || "").replace(/"/g, '""');
      const sm = (a.suggested_meta || "").replace(/"/g, '""');
      rows.push(
        `"${a.url}","${path}",${a.overall_score ?? ""},${days},${ga.sessions},${ga.conversions},"${issues}","${st}","${sm}"`
      );
    }
    const blob = new Blob(["\uFEFF" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u;
    a.download = `seo-quick-wins-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(u);
  };

  if (!latestPerUrl.length) return null;

  const previewDef = previewCat ? CATEGORIES.find((c) => c.key === previewCat) : null;
  const showTitleField = previewCat === "missing_title" || previewCat === "long_title";
  const showMetaField = previewCat === "missing_meta" || previewCat === "long_meta";
  const selectedCount = previewRows.filter((r) => r.selected).length;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <Zap className="h-4 w-4 text-amber-600" />
          Quick Wins SEO
          <Badge variant="outline" className="ml-auto">
            {totalIssues > 0 ? `${totalIssues} probleme` : "Toate paginile sunt curate ✨"}
          </Badge>
          {oldestAuditDays > 7 && (
            <Badge variant="destructive" className="text-[10px]">
              Audit vechi: {oldestAuditDays}z
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Probleme grupate pe categorie. Pentru meta/title vezi & editezi sugestiile AI înainte de
          aplicare; pentru schema/alt-text/scor scăzut, AI generează & aplică automat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="rounded-md border bg-background p-2">
            <div className="text-xs text-muted-foreground">Pagini</div>
            <div className="text-xl font-bold">{latestPerUrl.length}</div>
          </div>
          <div className="rounded-md border bg-background p-2">
            <div className="text-xs text-muted-foreground">Curate</div>
            <div className="text-xl font-bold text-green-600">{cleanPages}</div>
          </div>
          <div className="rounded-md border bg-background p-2">
            <div className="text-xs text-muted-foreground">Probleme</div>
            <div className="text-xl font-bold text-amber-600">{latestPerUrl.length - cleanPages}</div>
          </div>
          <div className="rounded-md border bg-background p-2">
            <div className="text-xs text-muted-foreground">Total fix</div>
            <div className="text-xl font-bold">{totalIssues}</div>
          </div>
        </div>

        {/* Top action bar */}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => qc.invalidateQueries({ queryKey: ["seo-audits-history"] })}
            disabled={!!bulkRunning || reauditing}
          >
            <RefreshCw className="h-3 w-3 mr-1" /> Reîncarcă
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="h-3 w-3 mr-1" /> Export CSV
          </Button>
          {lastBatch && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => reauditPaths(lastBatch.paths)}
                disabled={reauditing}
              >
                {reauditing ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Re-audit ({lastBatch.paths.length})
              </Button>
              <Button size="sm" variant="ghost" onClick={undoLast} disabled={undoing}>
                {undoing ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Undo2 className="h-3 w-3 mr-1" />
                )}
                Anulează ultima rulare
              </Button>
            </>
          )}
        </div>

        {/* Categories */}
        <div className="grid gap-2 sm:grid-cols-2">
          {stats.map((c) => {
            const Icon = c.icon;
            const isActive = bulkRunning === c.key;
            const isAi = c.fixMode === "ai";
            return (
              <div
                key={c.key}
                className={`flex items-center gap-3 rounded-md border bg-background p-2.5 ${
                  c.count === 0 ? "opacity-50" : ""
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${c.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.count === 0 ? (
                      <span className="text-green-600 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> 0 pagini
                      </span>
                    ) : (
                      `${c.count} ${c.count === 1 ? "pagină" : "pagini"}`
                    )}
                  </div>
                </div>
                {c.count > 0 && c.fixMode === "preview" && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => openPreview(c.key)}
                    disabled={!!bulkRunning}
                  >
                    {isActive ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        {bulkProgress.done}/{bulkProgress.total}
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Preview & fix
                      </>
                    )}
                  </Button>
                )}
                {c.count > 0 && isAi && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => aiFixCategory.mutate(c.key)}
                    disabled={!!bulkRunning}
                    title="AI generează & aplică automat (max 10/run)"
                  >
                    {isActive ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        {bulkProgress.done}/{bulkProgress.total}
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3 w-3 mr-1" />
                        AI fix
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {bulkRunning && (
          <Progress value={(bulkProgress.done / Math.max(bulkProgress.total, 1)) * 100} className="h-1.5" />
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Preview & fix</strong>: vezi/editezi sugestiile AI per pagină înainte să le scrii în
          <code> seo_overrides</code>. <strong>AI fix</strong>: generează propunere via{" "}
          <code>seo-auto-fix</code> și o aplică (max 10/run, snapshot automat pentru revert).
        </p>
      </CardContent>

      {/* Preview Modal */}
      <Dialog open={!!previewCat} onOpenChange={(o) => !o && setPreviewCat(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview: {previewDef?.label}
            </DialogTitle>
            <DialogDescription>
              Bifează ce vrei să aplici. Editează liber title/meta — limitele 60/160 sunt aplicate
              automat la save.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2 py-2 border-y">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setPreviewRows((prev) => prev.map((r) => ({ ...r, selected: !r.needsRegenerate })))
              }
            >
              Selectează tot
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPreviewRows((prev) => prev.map((r) => ({ ...r, selected: false })))}
            >
              Deselectează
            </Button>
            {previewRows.some((r) => r.needsRegenerate) && (
              <Button size="sm" variant="secondary" onClick={regenerateMissing} disabled={regenerating}>
                {regenerating ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Regenerează AI ({previewRows.filter((r) => r.needsRegenerate).length})
              </Button>
            )}
            <div className="ml-auto text-xs text-muted-foreground self-center">
              {selectedCount}/{previewRows.length} selectate
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {previewRows.map((r, idx) => (
              <div
                key={r.audit.id}
                className={`rounded-md border p-2.5 space-y-2 ${
                  r.needsRegenerate ? "border-amber-500/40 bg-amber-500/5" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={r.selected}
                    disabled={r.needsRegenerate}
                    onCheckedChange={(v) =>
                      setPreviewRows((prev) =>
                        prev.map((p, i) => (i === idx ? { ...p, selected: !!v } : p))
                      )
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono truncate">{r.path}</div>
                    {r.needsRegenerate && (
                      <Badge variant="outline" className="text-[10px] mt-1">
                        Lipsă sugestie AI — apasă „Regenerează"
                      </Badge>
                    )}
                  </div>
                </div>

                {showTitleField && (
                  <div>
                    <label className="text-[11px] text-muted-foreground">
                      Title ({r.newTitle.length}/60)
                    </label>
                    <Input
                      value={r.newTitle}
                      onChange={(e) =>
                        setPreviewRows((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, newTitle: e.target.value } : p))
                        )
                      }
                      className={r.newTitle.length > 60 ? "border-amber-500" : ""}
                    />
                  </div>
                )}

                {showMetaField && (
                  <div>
                    <label className="text-[11px] text-muted-foreground">
                      Meta ({r.newMeta.length}/160)
                    </label>
                    <Textarea
                      value={r.newMeta}
                      rows={2}
                      onChange={(e) =>
                        setPreviewRows((prev) =>
                          prev.map((p, i) => (i === idx ? { ...p, newMeta: e.target.value } : p))
                        )
                      }
                      className={r.newMeta.length > 160 ? "border-amber-500" : ""}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreviewCat(null)} disabled={!!bulkRunning}>
              Renunță
            </Button>
            <Button onClick={applyPreview} disabled={!!bulkRunning || selectedCount === 0}>
              {bulkRunning ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  {bulkProgress.done}/{bulkProgress.total}
                </>
              ) : (
                <>
                  <Zap className="h-3 w-3 mr-1" />
                  Aplică {selectedCount} fix-uri
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
