import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle, CheckCircle2, Pause, Play, Power, Shield,
  Sparkles, Phone, Activity, Inbox, History, Zap, Loader2,
} from "lucide-react";

type Settings = {
  enabled: boolean;
  paused_reason: string | null;
  updated_at: string;
};

type Job = {
  id: string;
  job_key: string;
  category: "lead" | "seo" | "system";
  label: string;
  description: string | null;
  enabled: boolean;
  schedule: string | null;
  trigger_type: "cron" | "event" | "manual";
  last_run_at: string | null;
  last_status: "success" | "failed" | "disabled" | "running" | null;
  last_error: string | null;
  consecutive_failures: number;
  total_runs: number;
  total_successes: number;
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

const CATEGORY_LABEL: Record<Job["category"], string> = {
  lead: "Lead Pipeline",
  seo: "SEO & Indexare",
  system: "System & Digest",
};

const CATEGORY_ICON: Record<Job["category"], React.ComponentType<{ className?: string }>> = {
  lead: Phone,
  seo: Sparkles,
  system: Activity,
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

const AutomationManager = () => {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [s, j, a] = await Promise.all([
      supabase.from("automation_settings").select("*").eq("id", true).maybeSingle(),
      supabase.from("automation_jobs").select("*").order("category").order("label"),
      supabase
        .from("automation_approvals")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setSettings(s.data as Settings | null);
    setJobs((j.data ?? []) as Job[]);
    setApprovals((a.data ?? []) as Approval[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const globalOn = settings?.enabled ?? false;
  const grouped: Record<Job["category"], Job[]> = { lead: [], seo: [], system: [] };
  jobs.forEach((j) => grouped[j.category].push(j));

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

      {/* TABS */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">
            <Activity className="w-4 h-4 mr-2" /> Joburi ({jobs.length})
          </TabsTrigger>
          <TabsTrigger value="approvals">
            <Inbox className="w-4 h-4 mr-2" /> Aprobări ({approvals.length})
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="w-4 h-4 mr-2" /> Audit
          </TabsTrigger>
        </TabsList>

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

        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acțiuni propuse de AI care așteaptă aprobare</CardTitle>
              <CardDescription>
                Aici vor apărea propuneri precum auto-blacklist agenții (suspicion ≥ 85), aplicare meta SEO generată,
                sau alte acțiuni cu impact ce necesită confirmare. Iterația 1 setează doar coada — propunerile
                vor curge după activarea joburilor în iterațiile 2–4.
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
                  {approvals.map((a) => (
                    <div key={a.id} className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge>{a.action_type}</Badge>
                        <Badge variant="outline">{a.entity_type}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          expiră {new Date(a.expires_at).toLocaleDateString("ro-RO")}
                        </span>
                      </div>
                      <pre className="text-xs mt-2 bg-muted/50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(a.proposal, null, 2)}
                      </pre>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="default">
                          <Play className="w-3 h-3 mr-1" /> Aprobă
                        </Button>
                        <Button size="sm" variant="outline">
                          Respinge
                        </Button>
                      </div>
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
