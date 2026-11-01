import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, FlaskConical, BellRing, ListChecks } from "lucide-react";
import { toast } from "sonner";

type Step = { key: string; label: string; ok: boolean; detail: string; ms: number };
type JobRow = { key: string; label: string; group: string; lastAt: string | null; ok: boolean | null; error: string | null; fails: number };
type Anomaly = { id: string; metric: string; observed: number | null; context: any; created_at: string };

const GROUPS: [RegExp, string][] = [
  [/^social\.(autopost|make)/, "Auto-posting"],
  [/^(lead\.|wa\.|voice|andrei|prospect\.)/, "Calificare Andrei"],
  [/^seo|seo-|ga4/, "Rapoarte SEO"],
  [/^(blog\.|content\.|social)/, "Social Generator"],
];
const groupOf = (k: string) => GROUPS.find(([r]) => r.test(k))?.[1] ?? "Altele";
const fmt = (d: string | null) => d ? new Date(d).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

export default function AutomationHealthPanel() {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [alerts, setAlerts] = useState<Anomaly[]>([]);
  const [webhook, setWebhook] = useState("");
  const [savingHook, setSavingHook] = useState(false);
  const [filter, setFilter] = useState<string>("Toate");

  const load = useCallback(async () => {
    const [aj, cr, an, hook, lastE2E] = await Promise.all([
      supabase.from("automation_jobs").select("job_key,label,enabled,last_run_at,last_status,last_error,consecutive_failures").eq("enabled", true),
      supabase.from("cron_run_log").select("job_name,status,started_at,error_message").gte("started_at", new Date(Date.now() - 7 * 864e5).toISOString()).order("started_at", { ascending: false }).limit(2000),
      supabase.from("automation_anomalies").select("id,metric,observed,context,created_at").like("metric", "%consecutive_failures%").is("acknowledged_at", null).order("created_at", { ascending: false }).limit(30),
      supabase.from("app_settings").select("value").eq("key", "system_alert_webhook_url").maybeSingle(),
      supabase.from("e2e_test_runs").select("details").eq("test_type", "platform_e2e").order("run_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const rows: JobRow[] = (aj.data ?? []).map((j: any) => ({
      key: j.job_key, label: j.label || j.job_key, group: groupOf(j.job_key), lastAt: j.last_run_at,
      ok: j.last_status ? j.last_status === "success" : null, error: j.last_error, fails: j.consecutive_failures ?? 0,
    }));
    const seen = new Map<string, any[]>();
    for (const r of cr.data ?? []) { const l = seen.get(r.job_name) ?? []; l.push(r); seen.set(r.job_name, l); }
    for (const [name, runs] of seen) {
      const last = runs[0];
      const stuck = last.status === "started" && Date.now() - new Date(last.started_at).getTime() > 2 * 3600e3;
      let fails = 0;
      for (const r of runs) { const f = r.status !== "success" && !(r.status === "started" && Date.now() - new Date(r.started_at).getTime() < 2 * 3600e3); if (!f) break; fails++; }
      rows.push({ key: name, label: name, group: groupOf(name), lastAt: last.started_at,
        ok: last.status === "success" ? true : last.status === "started" && !stuck ? null : false,
        error: last.error_message ?? (stuck ? "Rulare blocată (nu s-a terminat în 2 ore)" : null), fails });
    }
    rows.sort((a, b) => (b.fails - a.fails) || a.group.localeCompare(b.group) || a.label.localeCompare(b.label));
    setJobs(rows);
    setAlerts((an.data as Anomaly[]) ?? []);
    setWebhook(String(hook.data?.value ?? ""));
    const prev = (lastE2E.data as any)?.details?.steps;
    if (Array.isArray(prev)) setSteps((s) => s ?? prev);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runE2E = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("platform-e2e-test", { body: {} });
      if (error) throw error;
      setSteps(data.steps);
      data.passed ? toast.success("Test E2E trecut: toți pașii sunt verzi") : toast.error("Test E2E: unii pași au eșuat");
    } catch (e) {
      toast.error(`Testul nu a putut rula: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setRunning(false); }
  };

  const saveHook = async () => {
    const v = webhook.trim();
    if (v && !/^https:\/\//.test(v)) { toast.error("Adresa trebuie să înceapă cu https://"); return; }
    setSavingHook(true);
    const { error } = await supabase.from("app_settings").upsert({ key: "system_alert_webhook_url", value: v }, { onConflict: "key" });
    setSavingHook(false);
    error ? toast.error(`Nu s-a salvat: ${error.message}`) : toast.success("Webhook de alertă salvat");
  };

  const ack = async (id: string) => {
    const { error } = await supabase.from("automation_anomalies").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
    if (error) toast.error(error.message); else setAlerts((a) => a.filter((x) => x.id !== id));
  };

  const groups = useMemo(() => ["Toate", ...Array.from(new Set(jobs.map((j) => j.group)))], [jobs]);
  const shown = filter === "Toate" ? jobs : jobs.filter((j) => j.group === filter);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2"><FlaskConical className="h-5 w-5" /> Test automat cap-coadă</CardTitle>
          <Button onClick={runE2E} disabled={running} className="min-h-[48px]">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <span className="mr-2" aria-hidden>🧪</span>}
            Rulează Test Automat E2E
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">Lead-ul de test din Calculator este anulat automat: nu se salvează și nu pleacă niciun mesaj WhatsApp real.</p>
          {!steps ? <p className="text-sm">Niciun test rulat încă.</p> : (
            <ul className="grid gap-2 md:grid-cols-2">
              {steps.map((s) => (
                <li key={s.key} className={`rounded-md border p-3 ${s.ok ? "border-primary/30 bg-primary/5" : "border-destructive/40 bg-destructive/5"}`}>
                  <div className="flex items-center gap-2 font-medium">
                    {s.ok ? <CheckCircle2 className="h-5 w-5 text-primary" aria-label="Trecut" /> : <XCircle className="h-5 w-5 text-destructive" aria-label="Eșuat" />}
                    {s.label}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 break-words">{s.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BellRing className="h-5 w-5" /> Alerte: eșecuri repetate (peste 2 la rând)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {alerts.length === 0 ? <p className="text-sm text-muted-foreground">Nicio alertă deschisă.</p> : (
            <ul className="space-y-2">
              {alerts.map((a) => (
                <li key={a.id} className="rounded-md border border-destructive/40 p-3 flex flex-wrap items-center gap-2">
                  <Badge variant="destructive">{a.observed}× la rând</Badge>
                  <span className="font-medium">{a.context?.job_key ?? a.context?.job_name ?? a.metric}</span>
                  <span className="text-xs text-muted-foreground">{fmt(a.created_at)}</span>
                  {a.context?.last_error && <span className="text-xs w-full break-words">{String(a.context.last_error).slice(0, 200)}</span>}
                  <Button size="sm" variant="outline" className="ml-auto min-h-[48px]" onClick={() => ack(a.id)}>Am văzut</Button>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-2">
            <Label htmlFor="alert-webhook">Webhook de alertă (ex. Make), opțional</Label>
            <div className="flex flex-wrap gap-2">
              <Input id="alert-webhook" value={webhook} onChange={(e) => setWebhook(e.target.value)} placeholder="https://hook.eu1.make.com/…" className="flex-1 min-w-[220px]" />
              <Button onClick={saveHook} disabled={savingHook} variant="secondary" className="min-h-[48px]">Salvează</Button>
            </div>
            <p className="text-xs text-muted-foreground">Alertele pleacă pe e-mail; dacă adaugi un webhook, primește și el aceleași alerte.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2"><ListChecks className="h-5 w-5" /> Funcții de fundal: ultima rulare</CardTitle>
          <div className="flex flex-wrap gap-1">
            {groups.map((g) => (
              <Button key={g} size="sm" variant={filter === g ? "default" : "outline"} onClick={() => setFilter(g)} className="min-h-[40px]">{g}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {shown.map((j) => (
              <li key={j.key} className="py-2 flex flex-wrap items-center gap-2 text-sm">
                {j.ok === null ? <Loader2 className="h-4 w-4 text-muted-foreground" aria-label="În curs" /> : j.ok ? <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Succes" /> : <XCircle className="h-4 w-4 text-destructive" aria-label="Eșec" />}
                <span className="font-medium">{j.label}</span>
                <Badge variant="secondary">{j.group}</Badge>
                {j.fails > 0 && <Badge variant={j.fails > 2 ? "destructive" : "outline"}>{j.fails} eșecuri la rând</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{fmt(j.lastAt)}</span>
                {j.error && !j.ok && <span className="w-full text-xs text-destructive break-words">{j.error.slice(0, 160)}</span>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
