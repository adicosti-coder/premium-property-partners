import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Bell, Loader2, Save, Send } from "lucide-react";

type Settings = {
  production_webhook_url: string;
  alert_hot_deals_enabled: boolean;
  alert_worker_errors_enabled: boolean;
  hot_deal_min_score: number;
  worker_failed_threshold: number;
};

const DEFAULTS: Settings = {
  production_webhook_url: "",
  alert_hot_deals_enabled: false,
  alert_worker_errors_enabled: false,
  hot_deal_min_score: 85,
  worker_failed_threshold: 5,
};

export function ProductionAlertsConfig() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("voice_agent_settings")
        .select("production_webhook_url, alert_hot_deals_enabled, alert_worker_errors_enabled, hot_deal_min_score, worker_failed_threshold")
        .eq("id", 1)
        .maybeSingle();
      if (data) setS({ ...DEFAULTS, ...(data as any), production_webhook_url: (data as any).production_webhook_url ?? "" });
      setLoading(false);
    })();
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  const save = async () => {
    const url = s.production_webhook_url.trim();
    if ((s.alert_hot_deals_enabled || s.alert_worker_errors_enabled) && url && !/^https:\/\/hook(s)?\.(eu1\.)?make\.com\//.test(url) && !/^https:\/\//.test(url)) {
      toast({ title: "URL invalid", description: "Folosește un URL HTTPS valid (ex: Make.com).", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("voice_agent_settings")
      .update({
        production_webhook_url: url || null,
        alert_hot_deals_enabled: s.alert_hot_deals_enabled,
        alert_worker_errors_enabled: s.alert_worker_errors_enabled,
        hot_deal_min_score: Math.max(50, Math.min(100, s.hot_deal_min_score | 0)),
        worker_failed_threshold: Math.max(1, Math.min(50, s.worker_failed_threshold | 0)),
      })
      .eq("id", 1);
    setSaving(false);
    if (error) toast({ title: "Salvare eșuată", description: error.message, variant: "destructive" });
    else toast({ title: "Setări alerte salvate" });
  };

  const sendTest = async () => {
    const url = s.production_webhook_url.trim();
    if (!url) {
      toast({ title: "Lipsește URL-ul webhook", variant: "destructive" });
      return;
    }
    setTesting(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "test_ping",
          severity: "info",
          message: "Test ping de la RealTrust Admin",
          sent_at: new Date().toISOString(),
        }),
      });
      toast({
        title: res.ok ? "Ping trimis" : `Webhook HTTP ${res.status}`,
        description: res.ok ? "Verifică scenariul Make.com." : "Verifică URL-ul.",
        variant: res.ok ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: "Eroare rețea", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-4 h-4 text-amber-600" /> 🔔 Configurare Alerte de Producție
          <Badge variant="secondary" className="text-[10px]">Make.com</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-xs text-muted-foreground"><Loader2 className="w-3 h-3 inline animate-spin mr-1" /> Se încarcă...</div>
        ) : (
          <>
            <div className="space-y-1">
              <Label htmlFor="prod-hook" className="text-xs">URL Webhook Make.com</Label>
              <div className="flex gap-2">
                <Input
                  id="prod-hook"
                  type="url"
                  placeholder="https://hook.eu1.make.com/xxxxxxxxxxxxxxxx"
                  value={s.production_webhook_url}
                  onChange={(e) => set("production_webhook_url", e.target.value)}
                />
                <Button type="button" variant="outline" size="sm" onClick={sendTest} disabled={testing} className="shrink-0">
                  {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span className="ml-1 hidden sm:inline">Test</span>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="hot-deals" className="text-sm font-medium cursor-pointer">🔥 Alerte Prospecți Top</Label>
                  <Switch id="hot-deals" checked={s.alert_hot_deals_enabled} onCheckedChange={(v) => set("alert_hot_deals_enabled", v)} />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Notifică webhook-ul când un prospect cu scor ≥ pragul setat trece de enrichment și e publicat ca draft.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="hot-score" className="text-[11px]">Scor minim</Label>
                  <Input
                    id="hot-score"
                    type="number" min={50} max={100}
                    value={s.hot_deal_min_score}
                    onChange={(e) => set("hot_deal_min_score", parseInt(e.target.value) || 85)}
                    className="h-8"
                  />
                </div>
              </div>

              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="worker-err" className="text-sm font-medium cursor-pointer">⚠️ Alerte Erori Worker</Label>
                  <Switch id="worker-err" checked={s.alert_worker_errors_enabled} onCheckedChange={(v) => set("alert_worker_errors_enabled", v)} />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Trimite „System Warning” dacă numărul de anunțuri epuizate (3/3) crește peste prag într-o oră (cron */15 min).
                </p>
                <div className="space-y-1">
                  <Label htmlFor="err-th" className="text-[11px]">Prag eșuări / oră</Label>
                  <Input
                    id="err-th"
                    type="number" min={1} max={50}
                    value={s.worker_failed_threshold}
                    onChange={(e) => set("worker_failed_threshold", parseInt(e.target.value) || 5)}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                Salvează alertele
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
