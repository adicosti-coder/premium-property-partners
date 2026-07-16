import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import {
  Inbox, Activity, History, Shield, FlaskConical, ListTree, Radio, BarChart3,
} from "lucide-react";

import { AutomationAnalytics } from "./AutomationAnalytics";
import SelfHealingSettings from "./SelfHealingSettings";
import AutomationLiveLogs from "./AutomationLiveLogs";
import { AutoPublishListingsPanel } from "./AutoPublishListingsPanel";
import { ListingImportHealthPanel } from "./ListingImportHealthPanel";
import { ReconciliationCard } from "./ReconciliationCard";
import { AutomationRunsTab } from "./automation/AutomationRunsTab";

import type { Settings, Job, Approval, Run } from "./automation/types";
import { StatCard } from "./automation/StatCard";
import { AutomationKillSwitch } from "./automation/AutomationKillSwitch";
import { VoiceQueueStatusCard } from "./automation/VoiceQueueStatusCard";
import { Failure24hBanner } from "./automation/Failure24hBanner";
import { FanOutStatsCard } from "./automation/FanOutStatsCard";
import { AutoPublishFallbackAudit } from "./automation/AutoPublishFallbackAudit";
import { EmailToolsCard } from "./automation/EmailToolsCard";
import { JobsTab } from "./automation/tabs/JobsTab";
import { ApprovalsTab } from "./automation/tabs/ApprovalsTab";
import { TestModeTab } from "./automation/tabs/TestModeTab";

const AutomationManager = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [realtimeOn, setRealtimeOn] = useState(false);
  const [dismissedFailsBefore, setDismissedFailsBefore] = useState<number>(() => {
    const v = typeof window !== "undefined" ? window.localStorage.getItem("autom_fails_dismissed_until") : null;
    return v ? Number(v) : 0;
  });

  const load = async () => {
    setLoading(true);
    const [s, j, a, r] = await Promise.all([
      supabase.from("automation_settings").select("*").eq("id", true).maybeSingle(),
      supabase.from("automation_jobs").select("*").order("category").order("label"),
      supabase.from("automation_approvals").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(50),
      supabase.from("automation_runs").select("*").order("started_at", { ascending: false }).limit(100),
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

  // Realtime: actualizează jobs + runs pe loc (rămâne la parent — shared între tab-uri)
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const globalOn = settings?.enabled ?? false;

  return (
    <div className="space-y-6">
      <AutomationKillSwitch settings={settings} jobs={jobs} onChanged={load} />

      {/* QUICK STATS (inline — rămâne la parent, conform decizie sprint) */}
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

      <VoiceQueueStatusCard />

      <AutoPublishListingsPanel />
      <ListingImportHealthPanel />

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Radio className={`w-3 h-3 ${realtimeOn ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
        {realtimeOn ? "Live · actualizări realtime active · notificări la eșec ACTIVE" : "Conectare realtime..."}
      </div>

      <Failure24hBanner
        runs={runs}
        dismissedFailsBefore={dismissedFailsBefore}
        setDismissedFailsBefore={setDismissedFailsBefore}
        onRetryTriggered={load}
      />

      <FanOutStatsCard runs={runs} dismissedFailsBefore={dismissedFailsBefore} />

      <ReconciliationCard />

      <AutoPublishFallbackAudit runs={runs} />

      <EmailToolsCard runs={runs} />

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

        <TabsContent value="jobs">
          <JobsTab jobs={jobs} globalOn={globalOn} onChanged={load} />
        </TabsContent>

        <TabsContent value="runs" className="space-y-4">
          <AutomationRunsTab jobKeys={jobs.map((j) => j.job_key)} />
        </TabsContent>

        <TabsContent value="approvals">
          <ApprovalsTab approvals={approvals} onChanged={load} />
        </TabsContent>

        <TabsContent value="analytics">
          <AutomationAnalytics />
        </TabsContent>

        <TabsContent value="test" className="space-y-4">
          <TestModeTab />
        </TabsContent>

        <TabsContent value="live">
          <AutomationLiveLogs />
        </TabsContent>

        <TabsContent value="healing">
          <SelfHealingSettings />
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

export default AutomationManager;
