import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle, CheckCircle2, Pause, Play, Power, Shield,
  Sparkles, Phone, Activity, Inbox, History, Zap, Loader2,
  FlaskConical, Copy, XCircle, Newspaper, Brain, ListTree, Radio, BarChart3,
  Mail, Send,
} from "lucide-react";

import { AutomationAnalytics } from "./AutomationAnalytics";
import SelfHealingSettings from "./SelfHealingSettings";
import AutomationLiveLogs from "./AutomationLiveLogs";
import JobSelfHealingOverride from "./JobSelfHealingOverride";

type Settings = {
  enabled: boolean;
  paused_reason: string | null;
  updated_at: string;
};

type Job = {
  id: string;
  job_key: string;
  category: "lead" | "seo" | "system" | "blog" | "ai";
  label: string;
  description: string | null;
  enabled: boolean;
  schedule: string | null;
  trigger_type: "cron" | "event" | "manual";
  last_run_at: string | null;
  last_status: "success" | "failed" | "disabled" | "running" | "timeout" | "skipped" | null;
  last_error: string | null;
  consecutive_failures: number;
  total_runs: number;
  total_successes: number;
  config: Record<string, unknown> | null;
};

type Approval = {
  id: string;
  job_key: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  proposal: Record<string, unknown>;
  evidence: Record<string, unknown>;
  severity: "info" | "warning" | "critical";
  status: string;
  created_at: string;
  expires_at: string;
};

type Run = {
  id: string;
  job_key: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  status: "success" | "failed" | "timeout" | "skipped" | "running";
  error: string | null;
  triggered_by: string | null;
  retry_count: number;
  output_summary: Record<string, unknown>;
};

const CATEGORY_LABEL: Record<Job["category"], string> = {
  lead: "Lead Pipeline",
  seo: "SEO & Indexare",
  system: "System & Digest",
  blog: "Blog & Analytics",
  ai: "AI & Intelligence",
};

const CATEGORY_ICON: Record<Job["category"], React.ComponentType<{ className?: string }>> = {
  lead: Phone,
  seo: Sparkles,
  system: Activity,
  blog: Newspaper,
  ai: Brain,
};

const StatusBadge = ({ status }: { status: Job["last_status"] }) => {
  if (!status) return <Badge variant="outline">Niciun rulaj</Badge>;
  const map: Record<string, { variant: "default" | "destructive" | "secondary"; label: string }> = {
    success: { variant: "default", label: "OK" },
    failed: { variant: "destructive", label: "Eșuat" },
    disabled: { variant: "secondary", label: "Dezactivat" },
    running: { variant: "secondary", label: "În curs" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

// Funcții testabile în „Mod test" (dry-run, fără side-effects).
const TESTABLE_FUNCTIONS: Array<{
  key: string; // job_key sau '__orchestrator__'
  fn: string;  // numele edge function invocat
  label: string;
  category: "lead" | "seo" | "system";
  description: string;
}> = [
  { key: "__orchestrator__", fn: "automation-orchestrator", label: "Orchestrator (full pass)", category: "system", description: "Rulează un ciclu complet — invocă toate joburile cron care ar fi due, în dry-run." },
  { key: "lead.auto_classify_agency", fn: "lead-auto-classify-agency", label: "Lead • Auto-clasificare agenții", category: "lead", description: "Citește pana la 25 prospecte neevaluate, rulează Gemini, NU scrie scoruri și NU creează aprobări." },
  { key: "lead.auto_dedup", fn: "lead-auto-dedup", label: "Lead • Auto-dedup", category: "lead", description: "Calculează dedup_key și grupuri duplicate; NU updatează rândurile." },
  { key: "seo.auto_fill_meta", fn: "seo-auto-fill-meta", label: "SEO • Auto-fill meta (drafturi)", category: "seo", description: "Generează drafturi title+meta cu Gemini; NU scrie în seo_overrides." },
  { key: "seo.anomaly_detector", fn: "seo-anomaly-detector", label: "SEO • Detector anomalii", category: "seo", description: "Calculează scăderi >15% săptămână peste săptămână; NU loghează alertele." },
  { key: "system.daily_digest", fn: "automation-daily-digest", label: "System • Digest zilnic", category: "system", description: "Agregează KPIs ultimele 24h; NU trimite email și NU notifică WhatsApp." },
];

type TestResult = {
  function_name: string;
  job_key: string;
  ok: boolean;
  status: number | null;
  duration_ms: number;
  output: unknown;
  error: string | null;
  ran_at: string;
};

const AutomationManager = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  // Mod test
  const [testTarget, setTestTarget] = useState<string>(TESTABLE_FUNCTIONS[0].key);
  const [testing, setTesting] = useState(false);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  // Istoric rulaje + realtime
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsFilter, setRunsFilter] = useState<string>("__all__");
  const [realtimeOn, setRealtimeOn] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [lastReportAt, setLastReportAt] = useState<string | null>(null);
  const [reportEmail, setReportEmail] = useState<string>("adicosti@gmail.com");

  const load = async () => {
    setLoading(true);
    const [s, j, a, r] = await Promise.all([
      supabase.from("automation_settings").select("*").eq("id", true).maybeSingle(),
      supabase.from("automation_jobs").select("*").order("category").order("label"),
      supabase
        .from("automation_approvals")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("automation_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100),
    ]);
    setSettings(s.data as Settings | null);
    setJobs((j.data ?? []) as Job[]);
    setApprovals((a.data ?? []) as Approval[]);
    setRuns((r.data ?? []) as Run[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Realtime: actualizează jobs + runs pe loc
  useEffect(() => {
    const channel = supabase
      .channel("automation-control-center")
      .on("postgres_changes", { event: "*", schema: "public", table: "automation_jobs" }, (payload) => {
        const next = payload.new as Job;
        if (!next?.id) return;
        setJobs((prev) => prev.map((j) => (j.id === next.id ? { ...j, ...next } : j)));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "automation_runs" }, (payload) => {
        const row = payload.new as Run;
        setRuns((prev) => [row, ...prev].slice(0, 100));
        if (row.status === "failed" || row.status === "timeout") {
          toast({
            title: `⚠️ ${row.job_key} → ${row.status}`,
            description: (row.error || "Eroare nedetaliată").slice(0, 240),
            variant: "destructive",
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "automation_runs" }, (payload) => {
        const row = payload.new as Run;
        const prevRow = payload.old as Run | null;
        setRuns((prev) => prev.map((r) => (r.id === row.id ? row : r)));
        if ((row.status === "failed" || row.status === "timeout") && prevRow?.status !== row.status) {
          toast({
            title: `⚠️ ${row.job_key} → ${row.status}`,
            description: (row.error || "Eroare nedetaliată").slice(0, 240),
            variant: "destructive",
          });
        }
      })
      .subscribe((status) => {
        setRealtimeOn(status === "SUBSCRIBED");
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleGlobal = async (next: boolean) => {
    setPendingToggle("__global__");
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("automation_settings")
      .update({
        enabled: next,
        paused_reason: next ? null : "Oprit manual din Admin",
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setPendingToggle(null);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: next ? "Automatizările au fost pornite" : "Toate automatizările sunt OPRITE",
      description: next
        ? "Joburile activate individual vor rula conform schedule-ului."
        : "Niciun job nu va mai rula până la repornire.",
    });
    load();
  };

  const toggleJob = async (job: Job, next: boolean) => {
    setPendingToggle(job.id);
    const { error } = await supabase
      .from("automation_jobs")
      .update({ enabled: next })
      .eq("id", job.id);
    setPendingToggle(null);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: `${job.label} → ${next ? "ACTIV" : "dezactivat"}`,
      description: next
        ? "Va rula la următorul trigger conform schedule-ului."
        : "Acest job nu va mai rula până nu îl reactivezi.",
    });
    load();
  };

  const runNow = async (job: Job) => {
    setRunningJob(job.id);
    try {
      const { data, error } = await supabase.functions.invoke("automation-orchestrator", {
        body: { job_key: job.job_key },
      });
      if (error) throw error;
      const result = (data as { results?: Array<{ ok: boolean; error?: string }> })?.results?.[0];
      if (result && !result.ok) {
        toast({
          title: `${job.label} → eșuat`,
          description: result.error?.slice(0, 200) ?? "Verifică logurile",
          variant: "destructive",
        });
      } else {
        toast({
          title: `${job.label} → declanșat`,
          description: "Rulează acum în background. Reîmprospătează în câteva secunde.",
        });
      }
      setTimeout(load, 2500);
    } catch (e) {
      toast({
        title: "Eroare la rulare",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setRunningJob(null);
    }
  };

  const runAllNow = async () => {
    if (runningAll) return;
    const enabledCount = jobs.filter((j) => j.enabled && j.trigger_type === "cron").length;
    if (enabledCount === 0) {
      toast({ title: "Niciun job activ", description: "Activează cel puțin un job cron înainte.", variant: "destructive" });
      return;
    }
    const confirmed = window.confirm(
      `Vei porni FORȚAT toate cele ${enabledCount} joburi cron active, ignorând schedule-ul. Continui?`,
    );
    if (!confirmed) return;
    setRunningAll(true);
    try {
      const { data, error } = await supabase.functions.invoke("automation-orchestrator", {
        body: { run_all: true },
      });
      if (error) throw error;
      const ran = (data as { ran?: number })?.ran ?? 0;
      const ok = (data as { ok?: number })?.ok ?? 0;
      const failed = (data as { failed?: number })?.failed ?? 0;
      toast({
        title: `Run All → ${ran} joburi pornite`,
        description: `${ok} OK · ${failed} eșuate. Verifică tab-ul Istoric rulaje.`,
        variant: failed > 0 ? "destructive" : "default",
      });
      setTimeout(load, 3000);
    } catch (e: any) {
      toast({
        title: "Eroare Run All",
        description: e?.message || e?.error_description || JSON.stringify(e),
        variant: "destructive",
      });
    } finally {
      setRunningAll(false);
    }
  };


  const sendReport = async () => {
    if (!reportEmail || !/.+@.+\..+/.test(reportEmail)) {
      toast({ title: "Email invalid", description: "Introdu o adresă validă.", variant: "destructive" });
      return;
    }
    setSendingReport(true);
    try {
      const recent = runs.slice(0, 30).map((r) => ({
        job_key: r.job_key,
        status: r.status,
        duration_ms: r.duration_ms ?? 0,
        error: r.error,
        started_at: r.started_at,
      }));
      const ok = recent.filter((r) => r.status === "success").length;
      const failed = recent.filter((r) => r.status === "failed" || r.status === "timeout").length;
      const { data, error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "automation-run-report",
          recipientEmail: reportEmail,
          idempotencyKey: `manual-report-${Date.now()}`,
          templateData: {
            summary: `Raport manual: ${ok} OK / ${failed} eșuate din ultimele ${recent.length}`,
            results: recent,
            generated_at: new Date().toISOString(),
          },
        },
      });
      if (error) throw error;
      const provider = (data as { provider?: string })?.provider ?? "queue";
      setLastReportAt(new Date().toISOString());
      toast({
        title: "Raport trimis",
        description: `Livrat prin ${provider} către ${reportEmail}.`,
      });
    } catch (e) {
      toast({
        title: "Eroare trimitere email",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSendingReport(false);
    }
  };


  const applyApproval = async (a: Approval) => {
    setRunningJob(`approval:${a.id}`);
    try {
      const proposal = a.proposal as Record<string, unknown>;
      const { data: { user } } = await supabase.auth.getUser();

      if (a.action_type === "auto_blacklist_agency" && a.entity_id) {
        const { error } = await supabase
          .from("prospect_listings")
          .update({
            do_not_call: true,
            do_not_call_at: new Date().toISOString(),
            do_not_call_reason: `Auto-blacklist agency (score ${proposal.score ?? "?"}): ${proposal.reason ?? ""}`.slice(0, 500),
            auto_blacklisted_at: new Date().toISOString(),
            auto_blacklist_reason: String(proposal.reason ?? "agency-suspect"),
          })
          .eq("id", a.entity_id);
        if (error) throw error;
      } else if (a.action_type === "apply_meta_draft" && typeof proposal.url_path === "string") {
        const { error } = await supabase
          .from("seo_overrides")
          .update({
            pending_review: false,
            is_active: true,
            applied_by: user?.id ?? null,
            applied_at: new Date().toISOString(),
          })
          .eq("url_path", proposal.url_path);
        if (error) throw error;
      }
      // investigate_seo_drop & others: just mark resolved (no auto-action)

      const { error: aErr } = await supabase
        .from("automation_approvals")
        .update({
          status: "approved",
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id ?? null,
        })
        .eq("id", a.id);
      if (aErr) throw aErr;

      toast({ title: "Aprobat", description: "Acțiunea a fost aplicată." });
      load();
    } catch (e: any) {
      console.error("Approval error:", e);
      const desc =
        e?.message ||
        e?.error_description ||
        e?.details ||
        e?.hint ||
        (typeof e === "object" ? JSON.stringify(e) : String(e));
      toast({
        title: "Eroare aprobare",
        description: desc,
        variant: "destructive",
      });
    } finally {
      setRunningJob(null);
    }
  };

  const rejectApproval = async (a: Approval) => {
    setRunningJob(`approval:${a.id}`);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("automation_approvals")
      .update({
        status: "rejected",
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id ?? null,
      })
      .eq("id", a.id);
    setRunningJob(null);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Respinsă", description: "Propunerea a fost respinsă." });
    load();
  };

  const runTest = async () => {
    const target = TESTABLE_FUNCTIONS.find((t) => t.key === testTarget);
    if (!target) return;
    setTesting(true);
    const startedAt = Date.now();
    try {
      const isOrchestrator = target.key === "__orchestrator__";
      const body: Record<string, unknown> = { dry_run: true, triggered_by: "manual_test" };
      if (!isOrchestrator) body.job_key = target.key;

      const { data, error } = await supabase.functions.invoke("automation-orchestrator", { body });
      const duration = Date.now() - startedAt;
      const ok = !error;
      const result: TestResult = {
        function_name: target.fn,
        job_key: target.key,
        ok,
        status: ok ? 200 : null,
        duration_ms: duration,
        output: data ?? null,
        error: error ? (error.message || String(error)) : null,
        ran_at: new Date().toISOString(),
      };
      setTestHistory((h) => [result, ...h].slice(0, 10));
      toast({
        title: ok ? `${target.label} → dry-run OK` : `${target.label} → eroare`,
        description: ok
          ? `Output disponibil mai jos. ${duration}ms.`
          : (error?.message || String(error)).slice(0, 200),
        variant: ok ? "default" : "destructive",
      });
    } catch (e) {
      const duration = Date.now() - startedAt;
      const msg = e instanceof Error ? e.message : String(e);
      setTestHistory((h) => [{
        function_name: target.fn,
        job_key: target.key,
        ok: false,
        status: null,
        duration_ms: duration,
        output: null,
        error: msg,
        ran_at: new Date().toISOString(),
      }, ...h].slice(0, 10));
      toast({ title: "Eroare execuție test", description: msg.slice(0, 200), variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const copyOutput = async (r: TestResult) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(r.output, null, 2));
      toast({ title: "Copiat", description: "Output JSON în clipboard." });
    } catch {
      /* noop */
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const globalOn = settings?.enabled ?? false;
  const grouped: Record<Job["category"], Job[]> = { lead: [], seo: [], system: [], blog: [], ai: [] };
  jobs.forEach((j) => { (grouped[j.category] ??= []).push(j); });

  return (
    <div className="space-y-6">
      {/* HEADER + KILL SWITCH */}
      <Card className={globalOn ? "border-primary/40" : "border-destructive/40"}>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Automation Control Center
              </CardTitle>
              <CardDescription className="mt-1">
                Centralizator pentru toate procesele automate din Admin. Kill switch-ul global oprește instant tot,
                iar fiecare job poate fi controlat individual.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Status global</div>
                <div className="font-semibold flex items-center gap-2">
                  {globalOn ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-primary" /> Pornit
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 text-destructive" /> Oprit
                    </>
                  )}
                </div>
              </div>
              <Switch
                checked={globalOn}
                disabled={pendingToggle === "__global__"}
                onCheckedChange={toggleGlobal}
                aria-label="Kill switch global automatizări"
              />
            </div>
          </div>

          {/* RUN ALL — buton mare, foarte vizibil */}
          <div className="mt-4 flex flex-wrap items-center gap-3 p-4 rounded-lg border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <div className="flex-1 min-w-[200px]">
              <div className="font-semibold text-base flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Pornește toate automatizările acum
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Forțează rularea imediată a tuturor joburilor cron active, ignorând schedule-ul.
                Self-healing-ul rămâne activ și ajustează automat timeout-uri/retry-uri pe baza performanței.
              </div>
            </div>
            <Button
              size="xl"
              variant="premium"
              onClick={runAllNow}
              disabled={runningAll || !globalOn}
              aria-label="Pornește toate automatizările"
              className="shrink-0"
            >
              {runningAll ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Se pornesc...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" /> Run All Automations
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {!globalOn && (
          <CardContent>
            <Alert variant="destructive">
              <Power className="h-4 w-4" />
              <AlertTitle>Toate automatizările sunt oprite</AlertTitle>
              <AlertDescription>
                Niciun job nu va rula. Activează kill switch-ul ca să permiți job-urilor individuale activate
                să se execute conform schedule-ului.
                {settings?.paused_reason && (
                  <span className="block mt-1 text-xs opacity-80">Motiv: {settings.paused_reason}</span>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* QUICK STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Joburi totale" value={jobs.length} />
        <StatCard label="Active" value={jobs.filter((j) => j.enabled).length} highlight={globalOn} />
        <StatCard
          label="În aprobare"
          value={approvals.length}
          warn={approvals.length > 0}
          icon={<Inbox className="w-3 h-3" />}
        />
        <StatCard
          label="Eșuări consecutive"
          value={jobs.reduce((s, j) => s + j.consecutive_failures, 0)}
          warn={jobs.some((j) => j.consecutive_failures >= 3)}
        />
      </div>

      {/* REALTIME INDICATOR */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Radio className={`w-3 h-3 ${realtimeOn ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
        {realtimeOn ? "Live · actualizări realtime active · notificări la eșec ACTIVE" : "Conectare realtime..."}
      </div>

      {/* FAILURE BANNER (ultimele 24h) */}
      {(() => {
        const since = Date.now() - 24 * 3600_000;
        const fails = runs.filter(
          (r) => (r.status === "failed" || r.status === "timeout") && new Date(r.started_at).getTime() > since,
        );
        if (fails.length === 0) return null;
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{fails.length} eșuări în ultimele 24h</AlertTitle>
            <AlertDescription className="space-y-1 text-xs">
              {fails.slice(0, 5).map((f) => (
                <div key={f.id} className="font-mono">
                  <span className="font-semibold">{f.job_key}</span> · {f.status} · {(f.error || "—").slice(0, 140)}
                </div>
              ))}
              {fails.length > 5 && <div className="opacity-70">+{fails.length - 5} altele în tab-ul Istoric rulaje</div>}
            </AlertDescription>
          </Alert>
        );
      })()}

      {/* EMAIL REPORT PANEL */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4" /> Raport email manual
          </CardTitle>
          <CardDescription>
            Forțează trimiterea unui raport cu ultimele 30 de rulaje. Folosit ca fallback când digest-ul zilnic nu sosește.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="report-email" className="text-xs">Email destinatar</Label>
              <input
                id="report-email"
                type="email"
                value={reportEmail}
                onChange={(e) => setReportEmail(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background"
                placeholder="email@exemplu.ro"
              />
            </div>
            <Button onClick={sendReport} disabled={sendingReport} className="gap-2">
              {sendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendingReport ? "Se trimite..." : "Re-trimite raport acum"}
            </Button>
            {lastReportAt && (
              <span className="text-xs text-muted-foreground">
                Ultimul trimis: {new Date(lastReportAt).toLocaleTimeString("ro-RO")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>


      {/* TABS */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="jobs">
            <Activity className="w-4 h-4 mr-2" /> Joburi ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="runs">
            <ListTree className="w-4 h-4 mr-2" /> Istoric rulaje ({runs.length})
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <Inbox className="w-4 h-4 mr-2" /> Aprobări ({approvals.length})
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-4 h-4 mr-2" /> Analytics
          </TabsTrigger>
          <TabsTrigger value="test">
            <FlaskConical className="w-4 h-4 mr-2" /> Mod test
          </TabsTrigger>
          <TabsTrigger value="live">
            <Radio className="w-4 h-4 mr-2" /> Live Logs
          </TabsTrigger>
          <TabsTrigger value="healing">
            <Shield className="w-4 h-4 mr-2" /> Self-Healing
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="w-4 h-4 mr-2" /> Audit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <AutomationLiveLogs />
        </TabsContent>

        <TabsContent value="healing">
          <SelfHealingSettings />
        </TabsContent>

        <TabsContent value="analytics">
          <AutomationAnalytics />
        </TabsContent>


        <TabsContent value="jobs" className="space-y-6">
          {(Object.keys(grouped) as Job["category"][]).map((cat) => {
            const items = grouped[cat];
            if (items.length === 0) return null;
            const Icon = CATEGORY_ICON[cat];
            return (
              <Card key={cat}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className="w-4 h-4" /> {CATEGORY_LABEL[cat]}
                    <Badge variant="outline" className="ml-auto">
                      {items.filter((j) => j.enabled).length}/{items.length} active
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-start justify-between gap-4 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{job.label}</span>
                          <StatusBadge status={job.last_status} />
                          {job.consecutive_failures >= 3 && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="w-3 h-3" /> {job.consecutive_failures} eșuări
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {job.trigger_type === "cron" ? job.schedule : job.trigger_type}
                          </Badge>
                        </div>
                        {job.description && (
                          <p className="text-xs text-muted-foreground mt-1">{job.description}</p>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                          {job.job_key} · {job.total_successes}/{job.total_runs} succes
                          {job.last_run_at && ` · ultim: ${new Date(job.last_run_at).toLocaleString("ro-RO")}`}
                        </div>
                        {job.last_error && (
                          <p className="text-xs text-destructive mt-1 truncate">⚠ {job.last_error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!globalOn || runningJob === job.id}
                          onClick={() => runNow(job)}
                          aria-label={`Rulează acum ${job.label}`}
                          title="Declanșează manual acum"
                        >
                          {runningJob === job.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          <span className="hidden md:inline ml-1">Run</span>
                        </Button>
                        <Switch
                          checked={job.enabled && globalOn}
                          disabled={!globalOn || pendingToggle === job.id}
                          onCheckedChange={(v) => toggleJob(job, v)}
                          aria-label={`Toggle ${job.label}`}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="runs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListTree className="w-4 h-4" /> Istoric rulaje (ultimele 100)
                  </CardTitle>
                  <CardDescription>
                    Toate execuțiile orchestratorului — succese, eșecuri, timeout-uri, retry-uri. Se actualizează în timp real.
                  </CardDescription>
                </div>
                <Select value={runsFilter} onValueChange={setRunsFilter}>
                  <SelectTrigger className="w-[260px]">
                    <SelectValue placeholder="Filtru job" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Toate joburile</SelectItem>
                    {Array.from(new Set(runs.map((r) => r.job_key))).sort().map((k) => (
                      <SelectItem key={k} value={k}>{k}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ListTree className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nicio rulare înregistrată încă.</p>
                  <p className="text-xs mt-1">Apare aici la primul tick orchestrator sau Run manual.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
                  {runs
                    .filter((r) => runsFilter === "__all__" || r.job_key === runsFilter)
                    .map((r) => {
                      const statusColor =
                        r.status === "success" ? "bg-primary/5 border-primary/30" :
                        r.status === "timeout" ? "bg-amber-500/10 border-amber-500/40" :
                        r.status === "failed" ? "bg-destructive/5 border-destructive/30" :
                        "bg-muted/30";
                      const StatusIcon =
                        r.status === "success" ? CheckCircle2 :
                        r.status === "timeout" ? AlertTriangle :
                        r.status === "failed" ? XCircle : Activity;
                      const iconColor =
                        r.status === "success" ? "text-primary" :
                        r.status === "timeout" ? "text-amber-600" :
                        r.status === "failed" ? "text-destructive" : "text-muted-foreground";
                      return (
                        <div key={r.id} className={`p-2.5 border rounded-md ${statusColor}`}>
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <StatusIcon className={`w-3.5 h-3.5 ${iconColor}`} />
                            <span className="font-mono font-medium">{r.job_key}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">{r.status}</Badge>
                            {r.duration_ms != null && (
                              <Badge variant="secondary" className="text-[10px]">{r.duration_ms}ms</Badge>
                            )}
                            {r.retry_count > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                ↻ {r.retry_count} retry
                              </Badge>
                            )}
                            {r.triggered_by && (
                              <Badge variant="outline" className="text-[10px]">{r.triggered_by}</Badge>
                            )}
                            <span className="ml-auto text-[10px] text-muted-foreground">
                              {new Date(r.started_at).toLocaleString("ro-RO")}
                            </span>
                          </div>
                          {r.error && (
                            <p className="text-[11px] text-destructive font-mono mt-1.5 break-all">⚠ {r.error}</p>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acțiuni propuse de AI care așteaptă aprobare</CardTitle>
              <CardDescription>
                Propuneri AI cu impact (auto-blacklist agenții, aplicare meta SEO, investigare scor în scădere).
                Aprobă pentru a aplica acțiunea, sau respinge pentru a o ignora. Toate acțiunile sunt logate în audit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nicio acțiune în așteptare.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {approvals.map((a) => {
                    const busy = runningJob === `approval:${a.id}`;
                    const sev =
                      a.severity === "critical" ? "destructive" :
                      a.severity === "warning" ? "secondary" : "outline";
                    return (
                      <div key={a.id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge>{a.action_type}</Badge>
                          <Badge variant="outline">{a.entity_type}</Badge>
                          <Badge variant={sev as "destructive" | "secondary" | "outline"}>
                            {a.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            expiră {new Date(a.expires_at).toLocaleDateString("ro-RO")}
                          </span>
                        </div>
                        <pre className="text-xs mt-2 bg-muted/50 p-2 rounded overflow-x-auto max-h-48">
                          {JSON.stringify(a.proposal, null, 2)}
                        </pre>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" variant="default" disabled={busy} onClick={() => applyApproval(a)}>
                            {busy ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Play className="w-3 h-3 mr-1" />}
                            Aprobă
                          </Button>
                          <Button size="sm" variant="outline" disabled={busy} onClick={() => rejectApproval(a)}>
                            Respinge
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <Card className="border-amber-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="w-4 h-4 text-amber-500" />
                Mod de test manual (dry-run)
              </CardTitle>
              <CardDescription>
                Selectează una dintre cele {TESTABLE_FUNCTIONS.length} edge functions și rulează-o în <strong>dry-run</strong>.
                Nu se scrie în baza de date, nu se trimit emailuri sau WhatsApp, nu se actualizează metricele jobului.
                Poți testa indiferent dacă <em>Kill Switch</em>-ul global este pornit sau oprit.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-[1fr,auto] gap-3 items-end">
                <div className="space-y-1.5">
                  <Label htmlFor="test-target">Funcție de testat</Label>
                  <Select value={testTarget} onValueChange={setTestTarget}>
                    <SelectTrigger id="test-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TESTABLE_FUNCTIONS.map((t) => (
                        <SelectItem key={t.key} value={t.key}>
                          <span className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase">{t.category}</Badge>
                            {t.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {TESTABLE_FUNCTIONS.find((t) => t.key === testTarget)?.description}
                  </p>
                </div>
                <Button onClick={runTest} disabled={testing} className="gap-2">
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                  Rulează dry-run
                </Button>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle className="text-xs">Sigur de rulat</AlertTitle>
                <AlertDescription className="text-xs">
                  Funcțiile primesc <code>{`{ dry_run: true }`}</code>. Citirile + apelurile Gemini rulează normal,
                  dar toate <code>insert</code>/<code>update</code>/<code>upsert</code>, emailurile și webhook-urile
                  WhatsApp sunt sărite. Output-ul include contoare <code>would_*</code> care arată câte modificări <em>ar fi</em> aplicat.
                </AlertDescription>
              </Alert>

              {testHistory.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border rounded-lg border-dashed">
                  <FlaskConical className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Niciun test rulat încă în această sesiune.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-medium text-muted-foreground">
                    Ultimele {testHistory.length} rulări (sesiune curentă)
                  </div>
                  {testHistory.map((r, idx) => (
                    <div key={`${r.ran_at}-${idx}`} className="border rounded-lg overflow-hidden">
                      <div className={`flex items-center gap-2 p-2.5 flex-wrap ${
                        r.ok ? "bg-primary/5" : "bg-destructive/10"
                      }`}>
                        {r.ok ? (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                        <span className="font-medium text-sm">{r.function_name}</span>
                        <Badge variant="outline" className="text-[10px]">{r.duration_ms}ms</Badge>
                        <Badge variant="secondary" className="text-[10px]">DRY-RUN</Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {new Date(r.ran_at).toLocaleTimeString("ro-RO")}
                        </span>
                        {r.output != null && (
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copyOutput(r)}>
                            <Copy className="w-3 h-3 mr-1" /> Copiază JSON
                          </Button>
                        )}
                      </div>
                      {r.error && (
                        <div className="px-3 py-2 border-t bg-destructive/5 text-xs text-destructive font-mono break-all">
                          ⚠ {r.error}
                        </div>
                      )}
                      {r.output != null && (
                        <pre className="text-[11px] bg-muted/40 p-3 overflow-x-auto max-h-96 font-mono">
                          {JSON.stringify(r.output, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit log automatizări</CardTitle>
              <CardDescription>
                Toate modificările pe `automation_settings` și `automation_jobs` sunt logate automat în
                <code className="mx-1 text-xs">admin_audit_log</code>. Accesează tab-ul <strong>Securitate → Audit Log</strong>
                pentru vizualizarea completă (filtre, export).
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  highlight,
  warn,
  icon,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  warn?: boolean;
  icon?: React.ReactNode;
}) => (
  <Card className={warn ? "border-destructive/40" : highlight ? "border-primary/40" : ""}>
    <CardContent className="pt-4">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      <div
        className={`text-2xl font-bold ${
          warn ? "text-destructive" : highlight ? "text-primary" : ""
        }`}
      >
        {value}
      </div>
    </CardContent>
  </Card>
);

export default AutomationManager;
