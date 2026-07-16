import { useEffect, useMemo, useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle, CheckCircle2, Pause, Play, Power, Shield,
  Sparkles, Phone, Activity, Inbox, History, Zap, Loader2,
  FlaskConical, Copy, XCircle, Newspaper, Brain, ListTree, Radio, BarChart3,
  Mail, Send, RotateCw, Wrench,
} from "lucide-react";

import { AutomationAnalytics } from "./AutomationAnalytics";
import SelfHealingSettings from "./SelfHealingSettings";
import AutomationLiveLogs from "./AutomationLiveLogs";
import JobSelfHealingOverride from "./JobSelfHealingOverride";
import { AutoPublishListingsPanel } from "./AutoPublishListingsPanel";
import { ListingImportHealthPanel } from "./ListingImportHealthPanel";
import { ReconciliationCard } from "./ReconciliationCard";
import { AutomationRunsTab } from "./automation/AutomationRunsTab";

type Settings = {
  enabled: boolean;
  paused_reason: string | null;
  updated_at: string;
};

type Job = {
  id: string;
  job_key: string;
  category: "lead" | "seo" | "system" | "blog" | "ai" | "listing";
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
  listing: "Listing Import",
};

const CATEGORY_ICON: Record<Job["category"], React.ComponentType<{ className?: string }>> = {
  lead: Phone,
  seo: Sparkles,
  system: Activity,
  blog: Newspaper,
  ai: Brain,
  listing: Inbox,
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
  const [testingHealing, setTestingHealing] = useState(false);
  const [healingTestMode, setHealingTestMode] = useState<"failures" | "timeouts" | "mixed">("mixed");
  // Mod test
  const [testTarget, setTestTarget] = useState<string>(TESTABLE_FUNCTIONS[0].key);
  const [testing, setTesting] = useState(false);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  // Istoric rulaje + realtime
  const [runs, setRuns] = useState<Run[]>([]);
  
  const [realtimeOn, setRealtimeOn] = useState(false);
  const [sendingReport, setSendingReport] = useState(false);
  const [lastReportAt, setLastReportAt] = useState<string | null>(null);
  const [reportEmail, setReportEmail] = useState<string>("adicosti@gmail.com");
  const [dismissedFailsBefore, setDismissedFailsBefore] = useState<number>(() => {
    const v = typeof window !== "undefined" ? window.localStorage.getItem("autom_fails_dismissed_until") : null;
    return v ? Number(v) : 0;
  });
  const [retryingFails, setRetryingFails] = useState(false);

  const [sendingDigestTest, setSendingDigestTest] = useState(false);
  const [digestTestBanner, setDigestTestBanner] = useState<{ type: "success" | "error"; message: string; details?: string } | null>(null);

  // Voice Agent queue snapshot (callable now vs în dedupe 7d) — pentru standby visibility
  const [queueStatus, setQueueStatus] = useState<{
    callable_now: number;
    in_dedupe_7d: number;
    structurally_eligible: number;
    autopilot_on: boolean;
    weekend_standby: boolean;
    min_score: number;
    next_eligible_at: string | null;
    loading: boolean;
  }>({ callable_now: 0, in_dedupe_7d: 0, structurally_eligible: 0, autopilot_on: false, weekend_standby: false, min_score: 50, next_eligible_at: null, loading: true });
  const [togglingStandby, setTogglingStandby] = useState(false);

  const loadQueueStatus = async () => {
    try {
      const nowIso = new Date().toISOString();
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      const [vs, prospectsRes, recentRes] = await Promise.all([
        supabase.from("voice_agent_settings").select("autopilot_enabled, min_lead_score, weekend_standby_enabled").eq("id", 1).maybeSingle(),
        supabase.from("prospect_listings")
          .select("phone_normalized")
          .gte("lead_score", 50)
          .in("lifecycle_status", ["new", "callback"])
          .not("phone_normalized", "is", null)
          .is("auto_call_triggered_at", null)
          .is("marked_invalid_at", null)
          .eq("do_not_call", false)
          .or(`next_callback_at.is.null,next_callback_at.lte.${nowIso}`),
        supabase.from("voice_call_sessions")
          .select("to_number, created_at")
          .gte("created_at", sevenDaysAgo)
          .eq("direction", "outbound"),
      ]);
      const minScore = Number((vs.data as any)?.min_lead_score ?? 50);
      const eligiblePhones = new Set<string>((prospectsRes.data ?? []).map((p: any) => p.phone_normalized).filter(Boolean));
      const recent = (recentRes.data ?? []) as Array<{ to_number: string | null; created_at: string }>;
      const recentPhoneFirstCall = new Map<string, string>();
      for (const r of recent) {
        if (!r.to_number) continue;
        const cur = recentPhoneFirstCall.get(r.to_number);
        if (!cur || r.created_at < cur) recentPhoneFirstCall.set(r.to_number, r.created_at);
      }
      let inDedupe = 0;
      let earliestRelease: number | null = null;
      for (const phone of eligiblePhones) {
        const firstCall = recentPhoneFirstCall.get(phone);
        if (firstCall) {
          inDedupe++;
          const release = new Date(firstCall).getTime() + 7 * 86400 * 1000;
          if (earliestRelease === null || release < earliestRelease) earliestRelease = release;
        }
      }
      setQueueStatus({
        callable_now: eligiblePhones.size - inDedupe,
        in_dedupe_7d: inDedupe,
        structurally_eligible: eligiblePhones.size,
        autopilot_on: !!(vs.data as any)?.autopilot_enabled,
        weekend_standby: !!(vs.data as any)?.weekend_standby_enabled,
        min_score: minScore,
        next_eligible_at: earliestRelease ? new Date(earliestRelease).toISOString() : null,
        loading: false,
      });
    } catch (e) {
      setQueueStatus((q) => ({ ...q, loading: false }));
    }
  };

  const toggleWeekendStandby = async (next: boolean) => {
    setTogglingStandby(true);
    const prev = queueStatus.weekend_standby;
    setQueueStatus((q) => ({ ...q, weekend_standby: next }));
    const { error } = await supabase
      .from("voice_agent_settings")
      .update({ weekend_standby_enabled: next })
      .eq("id", 1);
    setTogglingStandby(false);
    if (error) {
      setQueueStatus((q) => ({ ...q, weekend_standby: prev }));
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: next ? "Mod standby weekend ACTIVAT" : "Mod standby weekend DEZACTIVAT",
        description: next
          ? "Andrei nu va mai apela sâmbătă/duminică (Europe/Bucharest). Apelurile manuale rămân posibile."
          : "Autopilot rulează inclusiv în weekend, în fereastra orară configurată.",
      });
    }
  };


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
    loadQueueStatus();
    const t = setInterval(loadQueueStatus, 60_000);
    return () => clearInterval(t);
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

  const runHealingTest = async () => {
    if (testingHealing) return;
    const confirmed = window.confirm(
      `Vei lansa un job DUMMY care simulează ${healingTestMode === "failures" ? "eșuări consecutive" : healingTestMode === "timeouts" ? "timeout-uri repetate" : "eșuări + timeout-uri mixte"} și apoi va declanșa self-healing-ul. Reacția va apărea în tab-ul Live Logs. Continui?`,
    );
    if (!confirmed) return;
    setTestingHealing(true);
    try {
      const { data, error } = await supabase.functions.invoke("automation-self-healing-test", {
        body: { mode: healingTestMode, consecutive_failures: 7 },
      });
      if (error) throw error;
      const ok = (data as { ok?: boolean })?.ok;
      const ms = (data as { ms?: number })?.ms ?? 0;
      toast({
        title: ok ? `🧪 Test self-healing → OK (${ms}ms)` : "🧪 Test self-healing → eșec",
        description: "Deschide tab-ul Live Logs pentru a vedea reacția în timp real.",
        variant: ok ? "default" : "destructive",
      });
      setTimeout(load, 1500);
    } catch (e: any) {
      toast({
        title: "Eroare test self-healing",
        description: e?.message || JSON.stringify(e),
        variant: "destructive",
      });
    } finally {
      setTestingHealing(false);
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
          fromOverride: "RealTrust Sistem <noreply@notify.realtrust.ro>",
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

  const sendDigestTest = async () => {
    if (!reportEmail || !/.+@.+\..+/.test(reportEmail)) {
      toast({ title: "Email invalid", description: "Introdu o adresă validă.", variant: "destructive" });
      return;
    }
    setSendingDigestTest(true);
    setDigestTestBanner(null);
    try {
      console.log("[digest-test] invoking automation-daily-digest", { recipient: reportEmail });
      const { data, error } = await supabase.functions.invoke("automation-daily-digest", {
        body: { dry_run: false, recipient_override: reportEmail },
      });
      if (error) {
        console.error("[digest-test] invoke error", error);
        throw error;
      }
      console.log("[digest-test] response", data);
      const result = (data as { recipients?: Array<{ to: string; ok: boolean; status: number; error?: string }>; digest?: Record<string, unknown> }) || {};
      const first = result.recipients?.[0];
      if (!first || !first.ok) {
        const errMsg = first?.error || `HTTP ${first?.status ?? "?"}`;
        console.error("[digest-test] resend gateway rejected", { recipients: result.recipients, digest: result.digest });
        setDigestTestBanner({
          type: "error",
          message: "Resend a respins email-ul. Vezi consola pentru log complet.",
          details: errMsg,
        });
        toast({ title: "Eroare Resend", description: errMsg.slice(0, 180), variant: "destructive" });
        return;
      }
      setDigestTestBanner({
        type: "success",
        message: "Email trimis cu succes! Verifică inbox-ul.",
        details: `Livrat către ${first.to} • PM Leads: ${(result.digest?.pm_leads_24h as number) ?? 0} • Proprietăți noi: ${(result.digest?.properties_24h as number) ?? 0}`,
      });
      toast({ title: "Digest trimis", description: `Către ${first.to}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[digest-test] exception", e);
      setDigestTestBanner({ type: "error", message: "Eroare la trimitere", details: msg });
      toast({ title: "Eroare", description: msg, variant: "destructive" });
    } finally {
      setSendingDigestTest(false);
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
  const grouped: Record<Job["category"], Job[]> = { lead: [], seo: [], system: [], blog: [], ai: [], listing: [] };
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

          {/* TEST SELF-HEALING — buton vizibil pentru a valida regulile de autovindecare */}
          <div className="mt-3 flex flex-wrap items-center gap-3 p-4 rounded-lg border-2 border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
            <div className="flex-1 min-w-[200px]">
              <div className="font-semibold text-base flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-amber-600" />
                Test Self-Healing Config
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Lansează un job DUMMY (<code>system.self_healing_dummy</code>) cu rulaje simulate, apoi declanșează
                self-healing-ul. Reacția (auto-disable, adaptive timeout, retry tuning) apare în tab-ul <strong>Live Logs</strong>.
              </div>
            </div>
            <Select value={healingTestMode} onValueChange={(v) => setHealingTestMode(v as "failures" | "timeouts" | "mixed")}>
              <SelectTrigger className="w-[160px] h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="failures">Doar eșuări</SelectItem>
                <SelectItem value="timeouts">Doar timeout-uri</SelectItem>
                <SelectItem value="mixed">Mixt (default)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="lg"
              variant="outline"
              onClick={runHealingTest}
              disabled={testingHealing}
              aria-label="Testează self-healing"
              className="shrink-0 border-amber-500/60 text-amber-700 hover:bg-amber-500/10"
            >
              {testingHealing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Se simulează...
                </>
              ) : (
                <>
                  <FlaskConical className="w-4 h-4" /> Test Self-Healing
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
          value={jobs.filter((j) => j.job_key !== "system.self_healing_dummy").reduce((s, j) => s + j.consecutive_failures, 0)}
          warn={jobs.some((j) => j.job_key !== "system.self_healing_dummy" && j.consecutive_failures >= 3)}
        />
      </div>

      {/* VOICE AGENT QUEUE STATUS — vizibilitate clară standby/weekend */}
      <Card className={queueStatus.callable_now > 0 ? "border-primary/40" : "border-muted"}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="w-4 h-4" /> Coadă Voice Agent (Andrei)
                {queueStatus.loading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                ) : queueStatus.callable_now > 0 ? (
                  <Badge variant="default">Activ</Badge>
                ) : (
                  <Badge variant="secondary">Standby</Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Snapshot live: lead-uri eligibile structural vs. filtrate prin dedupe anti-spam (7 zile).
                Autopilot {queueStatus.autopilot_on ? "ACTIV" : "OPRIT"} · prag scor ≥ {queueStatus.min_score} · fereastră 10–18 Europe/Bucharest.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={loadQueueStatus} disabled={queueStatus.loading} className="shrink-0">
              {queueStatus.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Activity className="w-3 h-3" />}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Apelabile acum"
              value={queueStatus.callable_now}
              highlight={queueStatus.callable_now > 0}
            />
            <StatCard
              label="În dedupe (7z)"
              value={queueStatus.in_dedupe_7d}
              icon={<Shield className="w-3 h-3" />}
            />
            <StatCard
              label="Eligibile structural"
              value={queueStatus.structurally_eligible}
            />
            <StatCard
              label="Următorul eligibil"
              value={queueStatus.next_eligible_at
                ? new Date(queueStatus.next_eligible_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })
                : "—"}
            />
          </div>
          {queueStatus.callable_now === 0 && queueStatus.in_dedupe_7d > 0 && !queueStatus.loading && (
            <Alert className="mt-3">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Standby controlat — filtrele anti-spam își fac treaba</AlertTitle>
              <AlertDescription className="text-xs">
                Toate cele {queueStatus.in_dedupe_7d} lead-uri eligibile au fost deja contactate în ultimele 7 zile și sunt în carantină anti-spam.
                Coada se va re-popula automat la următorul scrape (luni dimineață) sau la expirarea ferestrei de dedupe
                {queueStatus.next_eligible_at ? ` (${new Date(queueStatus.next_eligible_at).toLocaleDateString("ro-RO", { day: "2-digit", month: "long" })})` : ""}.
              </AlertDescription>
            </Alert>
          )}

          {/* WEEKEND STANDBY TOGGLE — pauză autopilot sâmbătă/duminică */}
          <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-3">
            <div className="flex-1 min-w-0">
              <Label htmlFor="weekend-standby-switch" className="text-sm font-medium cursor-pointer">
                Mod standby weekend
                {queueStatus.weekend_standby && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">ACTIV</Badge>
                )}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Când e activ, Andrei nu apelează sâmbătă și duminică (Europe/Bucharest). Apelurile manuale rămân disponibile.
              </p>
            </div>
            <Switch
              id="weekend-standby-switch"
              checked={queueStatus.weekend_standby}
              onCheckedChange={toggleWeekendStandby}
              disabled={togglingStandby || queueStatus.loading}
            />
          </div>
        </CardContent>
      </Card>

      {/* AUTO-PUBLISH LISTINGS */}
      <AutoPublishListingsPanel />

      {/* SELF-HEALING & LEARNING */}
      <ListingImportHealthPanel />





      {/* REALTIME INDICATOR */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Radio className={`w-3 h-3 ${realtimeOn ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
        {realtimeOn ? "Live · actualizări realtime active · notificări la eșec ACTIVE" : "Conectare realtime..."}
      </div>

      {/* FAILURE BANNER (ultimele 24h) */}
      {(() => {
        const since = Date.now() - 24 * 3600_000;
        const fails = runs.filter(
          (r) => (r.status === "failed" || r.status === "timeout")
            && r.job_key !== "system.self_healing_dummy"
            && new Date(r.started_at).getTime() > since
            && new Date(r.started_at).getTime() > dismissedFailsBefore,
        );
        if (fails.length === 0) return null;
        const uniqueJobKeys = Array.from(new Set(fails.map((f) => f.job_key)));
        const clearAlert = () => {
          const now = Date.now();
          window.localStorage.setItem("autom_fails_dismissed_until", String(now));
          setDismissedFailsBefore(now);
          toast({ title: "Alertă ștearsă", description: "Se va reaprinde doar dacă apar eșuări noi." });
        };
        const retryFailed = async () => {
          setRetryingFails(true);
          try {
            await supabase.functions.invoke("automation-orchestrator", {
              body: { job_keys: uniqueJobKeys },
            });
            toast({ title: "Reîncercare declanșată", description: `${uniqueJobKeys.length} job(uri) repornite.` });
            setTimeout(load, 3000);
          } catch (e) {
            toast({ title: "Eroare retry", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
          } finally {
            setRetryingFails(false);
          }
        };
        return (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between gap-2">
              <span>{fails.length} eșuări în ultimele 24h</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={retryFailed} disabled={retryingFails}>
                  {retryingFails ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                  Reîncearcă acum
                </Button>
                <Button size="sm" variant="outline" onClick={clearAlert}>
                  Clear alert
                </Button>
              </div>
            </AlertTitle>
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

      {/* AUTO-PUBLISH FAN-OUT 24h STATS */}
      <FanOutStatsCard runs={runs} dismissedFailsBefore={dismissedFailsBefore} />

      {/* DATA INTEGRITY RECONCILIATION */}
      <ReconciliationCard />

      {/* AUTO-PUBLISH FALLBACK AUDIT — last 10 fallback responses caught by try/catch */}
      {(() => {
        const autoRuns = runs.filter((r) => r.job_key === "auto-publish-listings");
        const since = Date.now() - 24 * 3600_000;
        const recent24 = autoRuns.filter((r) => new Date(r.started_at).getTime() > since);
        const fallbacks = autoRuns
          .filter((r) => {
            const o = (r.output_summary || {}) as Record<string, unknown>;
            return r.status !== "success" || o.fallback === true || o.timeout === true;
          })
          .slice(0, 10);
        if (fallbacks.length === 0) return null;
        const classify = (o: Record<string, unknown>, status: string) => {
          if (o.timeout === true || status === "timeout" || /timeout|timed out|deadline|abort/i.test(String(o.error || ""))) {
            return { label: "Timeout rețea", tone: "amber" as const };
          }
          const m = String(o.error || "").match(/\b([45]\d{2})\b/);
          if (m) return { label: `Refuz HTTP ${m[1]}`, tone: "red" as const };
          if (/imobiliare|publi24|olx|storia/i.test(String(o.error || ""))) {
            return { label: "Refuz platformă terță", tone: "red" as const };
          }
          return { label: "Eroare aplicație", tone: "slate" as const };
        };
        return (
          <details className="border rounded-lg bg-card/30">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium flex items-center justify-between hover:bg-muted/30">
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                Audit auto-publish — ultimele {fallbacks.length} răspunsuri fallback prinse de try/catch
              </span>
              <span className="text-xs text-muted-foreground">
                {recent24.length} rulări cron self-heal (5 min) în ultimele 24h
              </span>
            </summary>
            <div className="px-4 pb-3 space-y-1.5">
              {fallbacks.map((r) => {
                const o = (r.output_summary || {}) as Record<string, unknown>;
                const c = classify(o, r.status);
                const toneClass = c.tone === "amber"
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                  : c.tone === "red"
                    ? "bg-destructive/15 text-destructive border-destructive/30"
                    : "bg-muted text-muted-foreground border-border";
                const err = String(o.error || r.error || "—");
                return (
                  <div key={r.id} className="text-xs flex items-start gap-2 border-b border-border/40 last:border-0 pb-1.5">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[10px] ${toneClass}`}>{c.label}</span>
                    <span className="font-mono opacity-70 shrink-0">
                      {new Date(r.started_at).toLocaleString("ro-RO", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </span>
                    <span className="font-mono opacity-90 truncate">{err.slice(0, 180)}</span>
                  </div>
                );
              })}
              <div className="text-[11px] text-muted-foreground pt-1">
                Self-heal rulează automat la fiecare 5 min · retry exponential pe `automation_runs`.
              </div>
            </div>
          </details>
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

      {/* DAILY DIGEST LIVE TEST (B2C + B2B in one email) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="w-4 h-4" /> Digest zilnic — test live (B2C + B2B)
          </CardTitle>
          <CardDescription>
            Rulează interogarea reală pe ultimele 24h (Proprietăți + PM Leads din Booking/Airbnb) și trimite email-ul prin Resend către adresa de mai sus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Button onClick={sendDigestTest} disabled={sendingDigestTest} className="gap-2">
              {sendingDigestTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendingDigestTest ? "Se trimite..." : "Trimite digest de test acum"}
            </Button>
            <span className="text-xs text-muted-foreground">
              Destinatar: <strong>{reportEmail}</strong> (editează în câmpul de mai sus)
            </span>
          </div>
          {digestTestBanner && (
            <div
              className={
                digestTestBanner.type === "success"
                  ? "rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900"
                  : "rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
              }
              role="status"
            >
              <div className="font-semibold">{digestTestBanner.message}</div>
              {digestTestBanner.details && (
                <div className="mt-1 text-xs opacity-80 font-mono break-all">{digestTestBanner.details}</div>
              )}
            </div>
          )}
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
                        <JobSelfHealingOverride
                          jobKey={job.job_key}
                          jobLabel={job.label}
                          config={job.config}
                          onChanged={load}
                        />
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
          <AutomationRunsTab jobKeys={jobs.map((j) => j.job_key)} />
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
  value: number | string;
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

function FanOutStatsCard({ runs, dismissedFailsBefore }: { runs: Run[]; dismissedFailsBefore: number }) {
  const [stats, setStats] = useState<{
    published24: number;
    pmsRuns24: number;
    dispatched24: number;
    workerFails24: number;
    updatedReservations24: number;
    pmsSuccess24: number;
    loading: boolean;
  }>({
    published24: 0, pmsRuns24: 0, dispatched24: 0,
    workerFails24: 0, updatedReservations24: 0, pmsSuccess24: 0, loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 24 * 3600_000).toISOString();
      const [
        { count: pubCount },
        { count: pmsCount },
        { count: failCount },
        { count: updatedResCount },
        pmsSuccessRes,
      ] = await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true })
          .gte("imported_at", since).not("import_source", "is", null),
        supabase.from("automation_runs").select("id", { count: "exact", head: true })
          .eq("job_key", "sync-ical-bookings").gte("started_at", since),
        supabase.from("admin_audit_log").select("id", { count: "exact", head: true })
          .eq("action", "auto_publish_worker_failed").gte("created_at", since),
        supabase.from("prospect_listings").select("id", { count: "exact", head: true })
          .eq("lifecycle_status", "updated_reservation" as any).gte("updated_at", since),
        supabase.from("automation_runs").select("id", { count: "exact", head: true })
          .eq("job_key", "sync-ical-bookings").eq("status", "success").gte("started_at", since),
      ]);
      const autoRuns24 = runs.filter(
        (r) => r.job_key === "auto-publish-listings" &&
          new Date(r.started_at).getTime() > Date.now() - 24 * 3600_000,
      );
      const dispatched24 = autoRuns24.reduce((acc, r) => {
        const o = (r.output_summary || {}) as Record<string, unknown>;
        return acc + (Number(o.dispatched) || 0);
      }, 0);
      if (!cancelled) setStats({
        published24: pubCount ?? 0,
        pmsRuns24: pmsCount ?? 0,
        dispatched24,
        workerFails24: failCount ?? 0,
        updatedReservations24: updatedResCount ?? 0,
        pmsSuccess24: pmsSuccessRes.count ?? 0,
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, [runs]);

  // Auto-dismiss CPU-limit alert when newer success exists after the failure.
  useEffect(() => {
    const cpuFails = runs.filter((r) =>
      r.job_key === "auto-publish-listings" &&
      (r.status === "failed" || r.status === "timeout") &&
      /cpu time|cpu_time|cpu limit/i.test(String((r.output_summary as any)?.error || r.error || "")),
    );
    if (cpuFails.length === 0) return;
    const lastFail = cpuFails[0];
    const successAfter = runs.find((r) =>
      r.job_key === "auto-publish-listings" && r.status === "success" &&
      new Date(r.started_at).getTime() > new Date(lastFail.started_at).getTime(),
    );
    if (successAfter) {
      const t = new Date(successAfter.started_at).getTime();
      if (t > dismissedFailsBefore) {
        window.localStorage.setItem("autom_fails_dismissed_until", String(t));
      }
    }
  }, [runs, dismissedFailsBefore]);

  const pmsMatch = stats.updatedReservations24 === 0
    ? "—"
    : stats.pmsSuccess24 >= stats.updatedReservations24
    ? "sincronizat"
    : "decalaj";

  return (
    <Card className="bg-card/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" /> Auto-publish fan-out · ultimele 24h
        </CardTitle>
        <CardDescription className="text-xs">
          Workerul izolat procesează o singură proprietate per invocare (sanitizer + AI rewrite + insert) — cu idempotency key per prospect, fără duplicate.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1 space-y-2">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold tabular-nums">{stats.loading ? "…" : stats.published24}</div>
            <div className="text-[11px] text-muted-foreground">publicate prin fan-out</div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{stats.loading ? "…" : stats.dispatched24}</div>
            <div className="text-[11px] text-muted-foreground">workeri dispatched</div>
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums">{stats.loading ? "…" : stats.pmsRuns24}</div>
            <div className="text-[11px] text-muted-foreground">sincronizări PMS</div>
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-2">
          <span className="flex items-center gap-1">
            Workeri eșuați (24h):{" "}
            <FanOutFailuresDialog
              count={stats.workerFails24}
              loading={stats.loading}
            />
          </span>
          <span>
            Audit PMS · updated_reservation: <span className="font-semibold tabular-nums text-foreground">{stats.updatedReservations24}</span>
            {" "}vs sync OK: <span className="font-semibold tabular-nums text-foreground">{stats.pmsSuccess24}</span>
            {" "}<span className={pmsMatch === "decalaj" ? "text-destructive" : "text-emerald-600"}>({pmsMatch})</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Fan-Out Failures Drilldown Dialog
// ============================================================================

type WorkerFailRow = {
  id: string;
  entity_id: string | null;
  created_at: string;
  details: { error?: string; kind?: string; idempotency_key?: string } | null;
};

const KIND_LABEL: Record<string, string> = {
  ai_gemini_error: "AI (Gemini)",
  scrape_error: "Scrape (Firecrawl)",
  html_corrupt: "HTML / Sanitizer",
  worker_error: "Generic worker",
};

const KIND_BADGE: Record<string, string> = {
  ai_gemini_error: "border-purple-400 text-purple-700 dark:text-purple-300",
  scrape_error: "border-amber-400 text-amber-700 dark:text-amber-300",
  html_corrupt: "border-orange-400 text-orange-700 dark:text-orange-300",
  worker_error: "border-destructive/60 text-destructive",
};

function FanOutFailuresDialog({ count, loading }: { count: number; loading: boolean }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WorkerFailRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [reprocessing, setReprocessing] = useState<Record<string, boolean>>({});

  const load = async () => {
    setBusy(true);
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data, error } = await supabase
      .from("admin_audit_log")
      .select("id, entity_id, created_at, details")
      .eq("action", "auto_publish_worker_failed")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      setRows((data || []) as unknown as WorkerFailRow[]);
    }
    setBusy(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const grouped = useMemo(() => {
    const m: Record<string, WorkerFailRow[]> = {};
    for (const r of rows) {
      const k = r.details?.kind || "worker_error";
      (m[k] = m[k] || []).push(r);
    }
    return m;
  }, [rows]);

  const forceReprocess = async (row: WorkerFailRow) => {
    if (!row.entity_id) return;
    setReprocessing((s) => ({ ...s, [row.id]: true }));
    try {
      const idempotency_key = `force:${row.entity_id}:${Date.now()}`;
      const { data, error } = await supabase.functions.invoke("auto-publish-listing-worker", {
        body: {
          prospect_id: row.entity_id,
          idempotency_key,
          force: true,
          triggered_by: "manual_reprocess",
        },
        headers: { "x-idempotency-key": idempotency_key },
      });
      if (error) throw error;
      const ok = (data as any)?.success && (data as any)?.published;
      toast({
        title: ok ? "Reprocesare reușită" : "Reprocesare trimisă",
        description: ok
          ? `Publicat ca ${(data as any).property_id?.slice(0, 8) || "—"}`
          : (data as any)?.reason || (data as any)?.error || "Worker invocat.",
      });
      load();
    } catch (e: any) {
      toast({ title: "Eșec reprocesare", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setReprocessing((s) => ({ ...s, [row.id]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={loading || count === 0}
        className={`font-semibold tabular-nums underline-offset-2 ${
          count > 0
            ? "text-destructive hover:underline cursor-pointer"
            : "text-foreground cursor-default"
        } disabled:no-underline disabled:cursor-default`}
        title={count > 0 ? "Vezi diagnostic eșecuri" : "Niciun eșec în ultimele 24h"}
      >
        {loading ? "…" : count}
      </button>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Diagnostic Eșecuri Fan-Out
          </DialogTitle>
          <DialogDescription>
            Prospecți cu tag <code className="text-[11px]">[worker-fail:…]</code> din ultimele 24h, grupați pe tip de eroare. Poți forța reprocesarea ignorând eroarea anterioară.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          {busy ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Niciun eșec în ultimele 24h. ✅
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([kind, items]) => (
                <div key={kind} className="border rounded-md overflow-hidden">
                  <div className="bg-muted/40 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[11px] ${KIND_BADGE[kind] || ""}`}>
                        {KIND_LABEL[kind] || kind}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{items.length} eșec(uri)</span>
                    </div>
                  </div>
                  <div className="divide-y">
                    {items.map((r) => (
                      <div key={r.id} className="px-3 py-2 text-xs flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-muted-foreground">
                            {new Date(r.created_at).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            {" · "}
                            <span className="font-mono">{r.entity_id?.slice(0, 8) || "—"}</span>
                          </div>
                          <div className="font-mono text-foreground/80 truncate" title={r.details?.error || ""}>
                            {r.details?.error || "—"}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] shrink-0"
                          disabled={!r.entity_id || !!reprocessing[r.id]}
                          onClick={() => forceReprocess(r)}
                        >
                          {reprocessing[r.id] ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCw className="w-3 h-3" />
                          )}
                          <span className="ml-1">Forțează</span>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ReconciliationCard extracted to ./ReconciliationCard.tsx

export default AutomationManager;
