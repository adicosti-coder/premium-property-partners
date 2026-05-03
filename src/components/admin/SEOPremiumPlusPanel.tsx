import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Zap, RefreshCw, Globe2, Loader2, AlertTriangle, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface AuditRow {
  id: string;
  url: string;
  overall_score: number | null;
  suggested_title: string | null;
  suggested_meta: string | null;
  keyword_gaps?: any;
  local_geo_keywords?: any;
  issues?: any;
  language: string;
  created_at: string;
}

interface OverrideRow {
  url_path: string;
  applied_at: string;
  is_active: boolean;
}

interface Props {
  history: AuditRow[];
  overrides: OverrideRow[];
}

const CANONICAL_HOST = "www.realtrust.ro";
const urlToPath = (full: string) => {
  try { const u = new URL(full); let p = u.pathname.replace(/\/{2,}/g, "/"); if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1); return p || "/"; } catch { return full; }
};

export const SEOPremiumPlusPanel = ({ history, overrides }: Props) => {
  /* ============ 1. MASTER ONE-CLICK (apply all <80 site-wide) ============ */
  const [masterOpen, setMasterOpen] = useState(false);
  const [masterRunning, setMasterRunning] = useState(false);
  const [masterProgress, setMasterProgress] = useState({ done: 0, total: 0, ok: 0, err: 0 });
  const [masterLog, setMasterLog] = useState<{ url: string; status: string; reason?: string }[]>([]);

  const targetsBelow = useMemo(() => {
    const seen = new Set<string>();
    return history
      .filter((a) => (a.overall_score ?? 100) < 80 && (a.suggested_title || a.suggested_meta))
      .filter((a) => {
        const k = urlToPath(a.url);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, 200);
  }, [history]);

  const runMaster = async () => {
    setMasterRunning(true);
    setMasterProgress({ done: 0, total: targetsBelow.length, ok: 0, err: 0 });
    setMasterLog([]);
    let ok = 0, err = 0;
    for (let i = 0; i < targetsBelow.length; i++) {
      const a = targetsBelow[i];
      const path = urlToPath(a.url);
      try {
        const extra_keywords = [
          ...(Array.isArray(a.local_geo_keywords) ? a.local_geo_keywords : []),
          ...(Array.isArray(a.keyword_gaps) ? a.keyword_gaps : []),
        ]
          .map((k: any) => ({ keyword: k.keyword || (typeof k === "string" ? k : ""), reason: k.reason || null }))
          .filter((k) => k.keyword)
          .slice(0, 12);

        const { data: userRes } = await supabase.auth.getUser();
        const { error } = await supabase.from("seo_overrides").upsert({
          url_path: path,
          title: a.suggested_title || null,
          meta_description: (a.suggested_meta || "").slice(0, 160) || null,
          extra_keywords,
          source_audit_id: a.id,
          applied_by: userRes.user?.id || null,
          applied_at: new Date().toISOString(),
          is_active: true,
        }, { onConflict: "url_path" });
        if (error) throw error;
        ok++;
        setMasterLog((l) => [...l, { url: path, status: "ok" }]);
      } catch (e: any) {
        err++;
        setMasterLog((l) => [...l, { url: path, status: "error", reason: e.message }]);
      }
      setMasterProgress({ done: i + 1, total: targetsBelow.length, ok, err });
      await new Promise((r) => setTimeout(r, 250));
    }
    setMasterRunning(false);
    toast.success(`Master One-Click finalizat: ${ok} aplicate, ${err} erori`);
  };

  /* ============ 2. AI CONTENT REFRESH DETECTOR ============ */
  const refreshTargets = useMemo(() => {
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const seen = new Set<string>();
    return history
      .filter((a) => {
        const k = urlToPath(a.url);
        if (seen.has(k)) return false;
        seen.add(k);
        const old = new Date(a.created_at).getTime() < sixtyDaysAgo;
        const lowScore = (a.overall_score ?? 100) < 75;
        return old || lowScore;
      })
      .slice(0, 30);
  }, [history]);

  const refreshMutation = useMutation({
    mutationFn: async (a: AuditRow) => {
      const { data, error } = await supabase.functions.invoke("seo-ai-optimizer", {
        body: { url: a.url, language: a.language || "ro", forceRefresh: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (_d, a) => toast.success(`Re-analizat: ${urlToPath(a.url)}`),
    onError: (e: any) => toast.error(e.message || "Eșec re-analiză"),
  });

  /* ============ 3. BULK INDEXNOW + SITEMAP for today's overrides ============ */
  const todayOverrides = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return overrides.filter((o) => o.is_active && new Date(o.applied_at).getTime() >= since);
  }, [overrides]);

  const indexnowMutation = useMutation({
    mutationFn: async () => {
      const urls = todayOverrides.map((o) => `https://${CANONICAL_HOST}${o.url_path}`);
      if (urls.length === 0) throw new Error("Niciun override aplicat în ultimele 24h");
      // 1) Ping IndexNow
      const { data, error } = await supabase.functions.invoke("indexnow-notify", { body: { urls } });
      if (error) throw error;
      // 2) Trigger sitemap regenerate (call edge function GET to bust cache)
      try {
        await fetch(`https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/generate-sitemap?t=${Date.now()}`);
      } catch {}
      return { count: urls.length, indexnow: data };
    },
    onSuccess: (d) => toast.success(`${d.count} URL-uri trimise la IndexNow + sitemap regenerat`),
    onError: (e: any) => toast.error(e.message || "Eșec ping"),
  });

  /* ============ 4. PRIORITATE OPTIMIZARE (lowest scoring pages) ============ */
  const priorityTargets = useMemo(() => {
    const seen = new Set<string>();
    return history
      .filter((a) => {
        const k = urlToPath(a.url);
        if (seen.has(k)) return false;
        seen.add(k);
        return (a.overall_score ?? 100) < 95 && (a.suggested_title || a.suggested_meta);
      })
      .sort((a, b) => (a.overall_score ?? 100) - (b.overall_score ?? 100))
      .slice(0, 10);
  }, [history]);

  const applySingleMutation = useMutation({
    mutationFn: async (a: AuditRow) => {
      const path = urlToPath(a.url);
      const extra_keywords = [
        ...(Array.isArray(a.local_geo_keywords) ? a.local_geo_keywords : []),
        ...(Array.isArray(a.keyword_gaps) ? a.keyword_gaps : []),
      ]
        .map((k: any) => ({ keyword: k.keyword || (typeof k === "string" ? k : ""), reason: k.reason || null }))
        .filter((k) => k.keyword)
        .slice(0, 12);
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("seo_overrides").upsert({
        url_path: path,
        title: a.suggested_title || null,
        meta_description: (a.suggested_meta || "").slice(0, 160) || null,
        extra_keywords,
        source_audit_id: a.id,
        applied_by: userRes.user?.id || null,
        applied_at: new Date().toISOString(),
        is_active: true,
      }, { onConflict: "url_path" });
      if (error) throw error;
      return path;
    },
    onSuccess: (path) => toast.success(`Aplicat: ${path}`),
    onError: (e: any) => toast.error(e.message || "Eșec aplicare"),
  });

  const [priorityRunning, setPriorityRunning] = useState(false);
  const [priorityProgress, setPriorityProgress] = useState({ done: 0, total: 0, ok: 0, err: 0 });

  const runPriorityAll = async () => {
    setPriorityRunning(true);
    setPriorityProgress({ done: 0, total: priorityTargets.length, ok: 0, err: 0 });
    let ok = 0, err = 0;
    for (let i = 0; i < priorityTargets.length; i++) {
      try {
        await applySingleMutation.mutateAsync(priorityTargets[i]);
        ok++;
      } catch {
        err++;
      }
      setPriorityProgress({ done: i + 1, total: priorityTargets.length, ok, err });
      await new Promise((r) => setTimeout(r, 200));
    }
    setPriorityRunning(false);
    toast.success(`Prioritate optimizare: ${ok} aplicate, ${err} erori`);
  };

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          SEO Premium Plus
          <Badge variant="default" className="ml-2">NEW</Badge>
        </CardTitle>
        <CardDescription>
          Operațiuni site-wide cu un singur click: aplicare în masă, refresh AI și submit la motoarele de căutare.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* PRIORITATE OPTIMIZARE */}
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                Prioritate optimizare — top {priorityTargets.length} pagini cu scor mic
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Aplică individual sugestiile AI pentru paginile cu cel mai mic scor (sub 95).
              </p>
            </div>
          </div>
          {priorityTargets.length > 0 ? (
            <ScrollArea className="h-56 rounded border bg-background">
              <ul className="divide-y text-sm">
                {priorityTargets.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={(a.overall_score ?? 0) < 80 ? "destructive" : "secondary"}
                          className="font-mono text-[10px]"
                        >
                          {a.overall_score ?? "—"}/100
                        </Badge>
                        <span className="truncate text-xs font-mono">{urlToPath(a.url)}</span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={applySingleMutation.isPending && applySingleMutation.variables?.id === a.id}
                      onClick={() => applySingleMutation.mutate(a)}
                    >
                      {applySingleMutation.isPending && applySingleMutation.variables?.id === a.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <CheckCircle2 className="w-3 h-3" />}
                      <span className="ml-1">Aplică</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-xs text-muted-foreground italic">Toate paginile au scor ≥ 95. 🎉</p>
          )}
        </div>


        <div className="rounded-lg border bg-background p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Master One-Click — aplică TOATE sugestiile (&lt;80 score)
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Iterează prin {targetsBelow.length} pagini cu scor sub 80 și aplică title + meta + keywords pentru fiecare.
              </p>
            </div>
            <Button
              onClick={() => setMasterOpen(true)}
              disabled={masterRunning || targetsBelow.length === 0}
              className="gap-2"
            >
              {masterRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {masterRunning ? `Rulează ${masterProgress.done}/${masterProgress.total}` : `Aplică toate (${targetsBelow.length})`}
            </Button>
          </div>
          {masterRunning && (
            <Progress value={(masterProgress.done / Math.max(masterProgress.total, 1)) * 100} />
          )}
          {masterLog.length > 0 && !masterRunning && (
            <div className="text-xs text-muted-foreground">
              ✅ {masterProgress.ok} aplicate · ❌ {masterProgress.err} erori
            </div>
          )}
        </div>

        {/* AI CONTENT REFRESH */}
        <div className="rounded-lg border bg-background p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-500" />
                AI Content Refresh Detector
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Pagini cu audit &gt; 60 zile sau scor &lt; 75 — re-rulează audit AI pentru a regenera title/meta/keywords actuale.
              </p>
            </div>
            <Badge variant="secondary">{refreshTargets.length} pagini</Badge>
          </div>
          {refreshTargets.length > 0 ? (
            <ScrollArea className="h-48 rounded border">
              <ul className="divide-y text-sm">
                {refreshTargets.map((a) => {
                  const ageDays = Math.floor((Date.now() - new Date(a.created_at).getTime()) / (24 * 3600 * 1000));
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-mono">{urlToPath(a.url)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Scor {a.overall_score ?? "—"} · acum {ageDays} zile
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={refreshMutation.isPending && refreshMutation.variables?.id === a.id}
                        onClick={() => refreshMutation.mutate(a)}
                      >
                        {refreshMutation.isPending && refreshMutation.variables?.id === a.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Sparkles className="w-3 h-3" />}
                        <span className="ml-1">Re-analizează AI</span>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          ) : (
            <p className="text-xs text-muted-foreground italic">Toate auditurile sunt actuale și au scor bun.</p>
          )}
        </div>

        {/* BULK INDEXNOW + SITEMAP */}
        <div className="rounded-lg border bg-background p-4 space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-emerald-600" />
                Bulk IndexNow + Sitemap (ultimele 24h)
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Trimite la Bing/Yandex/IndexNow toate URL-urile cu override aplicat în ultimele 24h și regenerează sitemap-ul.
              </p>
            </div>
            <Button
              onClick={() => indexnowMutation.mutate()}
              disabled={indexnowMutation.isPending || todayOverrides.length === 0}
              className="gap-2"
              variant={todayOverrides.length === 0 ? "outline" : "default"}
            >
              {indexnowMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe2 className="w-4 h-4" />}
              Submit {todayOverrides.length} URL-uri
            </Button>
          </div>
          {todayOverrides.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Niciun override aplicat în ultimele 24h.</p>
          )}
        </div>
      </CardContent>

      {/* CONFIRM DIALOG MASTER */}
      <AlertDialog open={masterOpen} onOpenChange={setMasterOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmi aplicarea în masă?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vei aplica title, meta și keywords AI pentru <strong>{targetsBelow.length} pagini</strong> cu scor sub 80.
              Operațiunea va dura ~{Math.ceil(targetsBelow.length * 0.3)}s. Toate suprascrierile precedente vor fi înlocuite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setMasterOpen(false); runMaster(); }}>
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Confirm & rulează
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default SEOPremiumPlusPanel;
