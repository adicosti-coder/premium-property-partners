import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle, Activity, Sparkles, Phone, Inbox, Zap, Loader2,
  Newspaper, Brain,
} from "lucide-react";
import JobSelfHealingOverride from "../../JobSelfHealingOverride";
import type { Job } from "../types";

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
  if (!cfg) return <Badge variant="outline">{status}</Badge>;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
};

type Props = {
  jobs: Job[];
  globalOn: boolean;
  onChanged: () => void;
};

export function JobsTab({ jobs, globalOn, onChanged }: Props) {
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);
  const [runningJob, setRunningJob] = useState<string | null>(null);

  const grouped: Record<Job["category"], Job[]> = { lead: [], seo: [], system: [], blog: [], ai: [], listing: [] };
  jobs.forEach((j) => { (grouped[j.category] ??= []).push(j); });

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
    onChanged();
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
      setTimeout(onChanged, 2500);
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

  return (
    <div className="space-y-6">
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
                      onChanged={onChanged}
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
    </div>
  );
}
