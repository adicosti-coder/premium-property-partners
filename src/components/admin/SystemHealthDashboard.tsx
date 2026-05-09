import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertTriangle, CheckCircle2, XCircle, Activity, Mail, KeyRound, ShieldAlert, RefreshCw, Download, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

type Threshold = {
  voice_latency_ms_threshold: number;
  voice_streak_required: number;
  seo_reaudit_interval_days: number;
  key_expiry_warn_days: number;
  cron_grace_minutes: number;
  daily_report_enabled: boolean;
  daily_report_email: string;
  e2e_seo_url: string;
};

const STATUS_COLORS: Record<string, string> = {
  success: "hsl(var(--primary))",
  failed: "hsl(0 84% 60%)",
  started: "hsl(var(--muted-foreground))",
  skipped: "hsl(45 93% 47%)",
};

export default function SystemHealthDashboard() {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<Threshold | null>(null);
  const [cronAgg, setCronAgg] = useState<any[]>([]);
  const [keyHealth, setKeyHealth] = useState<any[]>([]);
  const [latencyTrend, setLatencyTrend] = useState<any[]>([]);
  const [recentE2E, setRecentE2E] = useState<any[]>([]);
  const [recentLatencyAlerts, setRecentLatencyAlerts] = useState<any[]>([]);
  const [detailRow, setDetailRow] = useState<any | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmails = (raw: string): string | null => {
    const list = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    if (list.length === 0) return "Adaugă cel puțin un email.";
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const bad = list.filter((e) => !re.test(e));
    if (bad.length) return `Format invalid: ${bad.join(", ")}`;
    return null;
  };

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();
    const since24 = new Date(Date.now() - 24 * 3600_000).toISOString();

    const [{ data: th }, { data: cron }, { data: keys }, { data: latency }, { data: e2e }, { data: alerts }] = await Promise.all([
      supabase.from("system_health_thresholds").select("*").maybeSingle(),
      supabase.from("cron_run_log").select("job_name,status").gte("started_at", since).limit(2000),
      supabase.from("external_keys_health").select("provider,is_valid,checked_at,message").gte("checked_at", since).order("checked_at", { ascending: false }),
      supabase.from("voice_call_sessions").select("started_at,tts_latency_ms_avg").not("tts_latency_ms_avg", "is", null).gte("started_at", since24).order("started_at", { ascending: true }).limit(200),
      supabase.from("e2e_test_runs").select("*").order("run_at", { ascending: false }).limit(20),
      supabase.from("voice_latency_alerts").select("*").is("acknowledged_at", null).order("triggered_at", { ascending: false }).limit(5),
    ]);

    setThresholds(th as Threshold);

    // Aggregate cron by job_name
    const map = new Map<string, { name: string; success: number; failed: number; skipped: number }>();
    for (const r of cron || []) {
      if (!map.has(r.job_name)) map.set(r.job_name, { name: r.job_name, success: 0, failed: 0, skipped: 0 });
      const e = map.get(r.job_name)!;
      if (r.status === "success") e.success++;
      else if (r.status === "failed") e.failed++;
      else if (r.status === "skipped") e.skipped++;
    }
    setCronAgg(Array.from(map.values()));

    // Latest key per provider
    const byProvider = new Map<string, any>();
    for (const k of keys || []) {
      if (!byProvider.has(k.provider)) byProvider.set(k.provider, k);
    }
    setKeyHealth(Array.from(byProvider.values()));

    setLatencyTrend((latency || []).map((l: any) => ({
      time: new Date(l.started_at).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" }),
      ms: l.tts_latency_ms_avg,
    })));

    setRecentE2E(e2e || []);
    setRecentLatencyAlerts(alerts || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveThresholds = async () => {
    if (!thresholds) return;
    const emailErr = validateEmails(thresholds.daily_report_email || "");
    setEmailError(emailErr);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }
    const { error } = await supabase.from("system_health_thresholds").update(thresholds).eq("id", true);
    if (error) toast.error("Eroare la salvare: " + error.message);
    else toast.success("Praguri salvate");
  };

  const runFn = async (fn: string, label: string) => {
    setRunning(fn);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/${fn}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "" },
        body: "{}",
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      toast.success(`${label} rulat cu succes`);
      await load();
    } catch (e: any) {
      toast.error(`${label} a eșuat: ${e.message}`);
    } finally {
      setRunning(null);
    }
  };

  const exportE2E = async (format: "json" | "csv") => {
    // RLS-protected: only admins receive rows
    const { data, error } = await supabase.from("e2e_test_runs").select("*").order("run_at", { ascending: false }).limit(1000);
    if (error) { toast.error("Acces refuzat sau eroare: " + error.message); return; }
    const rows = data || [];
    if (rows.length === 0) { toast.warning("Nicio rulare de exportat."); return; }
    let blob: Blob;
    if (format === "json") {
      blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    } else {
      const cols = ["id", "test_type", "status", "duration_ms", "run_at", "retry_count", "parent_run_id", "error_message", "details"];
      const escape = (v: any) => {
        const s = typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
        return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
      };
      const csv = [cols.join(",")].concat(
        rows.map((r: any) => cols.map((c) => escape(r[c])).join(","))
      ).join("\n");
      blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `e2e-tests-${new Date().toISOString().slice(0,10)}.${format}`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading || !thresholds) {
    return <div className="flex items-center gap-2 p-8"><Loader2 className="h-5 w-5 animate-spin" /> Se încarcă...</div>;
  }

  const invalidKeys = keyHealth.filter((k) => !k.is_valid);
  const failedRecent = recentE2E.find((r) => r.status !== "passed");
  const allOk = invalidKeys.length === 0 && !failedRecent && recentLatencyAlerts.length === 0;

  // Pie data: total cron success vs failed last 7d
  const totalSuccess = cronAgg.reduce((s, x) => s + x.success, 0);
  const totalFailed = cronAgg.reduce((s, x) => s + x.failed, 0);
  const pieData = [
    { name: "Success", value: totalSuccess, color: STATUS_COLORS.success },
    { name: "Failed", value: totalFailed, color: STATUS_COLORS.failed },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" /> System Health Command Center
          </h2>
          <p className="text-sm text-muted-foreground">Monitorizare cron-uri, chei API, latență voce și teste E2E.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1.5" /> Refresh</Button>
      </div>

      {/* Top status banner */}
      <Card className={allOk ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-red-500/40 bg-red-50/50 dark:bg-red-950/20"}>
        <CardContent className="p-4 flex items-center gap-3">
          {allOk ? <CheckCircle2 className="h-8 w-8 text-emerald-600" /> : <ShieldAlert className="h-8 w-8 text-red-600" />}
          <div>
            <div className="font-semibold">{allOk ? "All systems operational" : "Atenție necesară"}</div>
            <div className="text-sm text-muted-foreground">
              {invalidKeys.length > 0 && `🔑 ${invalidKeys.length} chei invalide. `}
              {failedRecent && `🧪 Ultim test E2E ${failedRecent.test_type}: ${failedRecent.status}. `}
              {recentLatencyAlerts.length > 0 && `🐢 ${recentLatencyAlerts.length} alerte latență neconfirmate. `}
              {allOk && "Toate verificările au trecut în ultimele 24h."}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Status Cron-uri (7 zile)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cronAgg}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={70} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="success" stackId="a" fill={STATUS_COLORS.success} />
                  <Bar dataKey="failed" stackId="a" fill={STATUS_COLORS.failed} />
                  <Bar dataKey="skipped" stackId="a" fill={STATUS_COLORS.skipped} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribuție globală 7 zile</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Latența Voice Agent (24h)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={latencyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis label={{ value: "ms", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Line type="monotone" dataKey="ms" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Prag alertă: {thresholds.voice_latency_ms_threshold}ms × {thresholds.voice_streak_required} apeluri consecutive.
          </p>
        </CardContent>
      </Card>

      {/* Keys health */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4" /> Sănătate chei API</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {keyHealth.length === 0 && <div className="text-sm text-muted-foreground">Niciun rezultat încă. Rulează verificarea.</div>}
          {keyHealth.map((k) => (
            <div key={k.provider} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium">{k.provider}</div>
                <div className="text-xs text-muted-foreground">{new Date(k.checked_at).toLocaleString("ro-RO")} • {k.message?.slice(0, 80)}</div>
              </div>
              {k.is_valid
                ? <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Valid</Badge>
                : <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Invalid</Badge>}
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => runFn("external-keys-healthcheck", "Verificare chei")} disabled={running === "external-keys-healthcheck"}>
            {running === "external-keys-healthcheck" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Rulează verificarea acum
          </Button>
        </CardContent>
      </Card>

      {/* Recent E2E */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
            <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Ultimele teste E2E</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => exportE2E("json")}>
                <Download className="h-3 w-3 mr-1" /> JSON
              </Button>
              <Button size="sm" variant="ghost" onClick={() => exportE2E("csv")}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => runFn("system-e2e-tests", "Teste E2E")} disabled={running === "system-e2e-tests"}>
                {running === "system-e2e-tests" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                Rulează acum
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {recentE2E.length === 0 && <div className="text-sm text-muted-foreground">Nicio rulare încă.</div>}
            {recentE2E.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded-md p-2 text-sm">
                <div>
                  <span className="font-medium uppercase">{r.test_type}</span>
                  <span className="text-muted-foreground ml-2">{new Date(r.run_at).toLocaleString("ro-RO")}</span>
                  {r.error_message && <div className="text-xs text-red-600 mt-1">{r.error_message.slice(0, 120)}</div>}
                </div>
                <Badge variant={r.status === "passed" ? "secondary" : r.status === "critical" ? "destructive" : "outline"}>
                  {r.status === "passed" ? "✓ passed" : r.status === "critical" ? "✗ CRITICAL" : "⚠ failed"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Thresholds editor */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Configurare praguri & raport zilnic</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Prag latență voce (ms)</Label>
              <Input type="number" value={thresholds.voice_latency_ms_threshold}
                onChange={(e) => setThresholds({ ...thresholds, voice_latency_ms_threshold: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Apeluri consecutive pentru alertă</Label>
              <Input type="number" value={thresholds.voice_streak_required}
                onChange={(e) => setThresholds({ ...thresholds, voice_streak_required: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Interval re-audit SEO (zile)</Label>
              <Input type="number" value={thresholds.seo_reaudit_interval_days}
                onChange={(e) => setThresholds({ ...thresholds, seo_reaudit_interval_days: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Avertizare expirare chei (zile)</Label>
              <Input type="number" value={thresholds.key_expiry_warn_days}
                onChange={(e) => setThresholds({ ...thresholds, key_expiry_warn_days: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Cron grace (minute)</Label>
              <Input type="number" value={thresholds.cron_grace_minutes}
                onChange={(e) => setThresholds({ ...thresholds, cron_grace_minutes: Number(e.target.value) })} />
            </div>
            <div>
              <Label>URL pentru smoke-test SEO</Label>
              <Input value={thresholds.e2e_seo_url}
                onChange={(e) => setThresholds({ ...thresholds, e2e_seo_url: e.target.value })} />
            </div>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Raport zilnic email (09:00)</Label>
              <p className="text-xs text-muted-foreground">Trimite un email zilnic cu starea sistemului.</p>
            </div>
            <Switch checked={thresholds.daily_report_enabled}
              onCheckedChange={(v) => setThresholds({ ...thresholds, daily_report_enabled: v })} />
          </div>
          <div>
            <Label>Email destinatari raport</Label>
            <Input type="text" value={thresholds.daily_report_email}
              placeholder="email1@domain.com, email2@domain.com"
              onChange={(e) => setThresholds({ ...thresholds, daily_report_email: e.target.value })} />
            <p className="text-xs text-muted-foreground mt-1">Mai multe adrese separate prin virgulă.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveThresholds}>Salvează</Button>
            <Button variant="outline" onClick={() => runFn("system-health-report", "Raport email")} disabled={running === "system-health-report"}>
              {running === "system-health-report" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Mail className="h-3 w-3 mr-1" />}
              Trimite raport acum
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
