import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Settings, Mail, Phone, X } from "lucide-react";

type Severity = "info" | "warning" | "critical";

type Settings = {
  recipient_emails: string[];
  recipient_phones: string[];
  dominance_warning_ratio: number;
  dominance_critical_ratio: number;
  dominance_min_total: number;
  spike_warning_ratio: number;
  spike_critical_ratio: number;
  spike_min_count: number;
  surge_threshold: number;
  sms_min_severity: Exclude<Severity, "info">;
  email_min_severity: Severity;
  notifications_enabled: boolean;
};

const DEFAULTS: Settings = {
  recipient_emails: [],
  recipient_phones: [],
  dominance_warning_ratio: 0.7,
  dominance_critical_ratio: 0.85,
  dominance_min_total: 10,
  spike_warning_ratio: 1.5,
  spike_critical_ratio: 3.0,
  spike_min_count: 5,
  surge_threshold: 50,
  sms_min_severity: "critical",
  email_min_severity: "warning",
  notifications_enabled: true,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+[1-9]\d{6,14}$/;

export default function ProspectAlertSettings() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("prospect_alert_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) {
        toast({ title: "Eroare la încărcare", description: error.message, variant: "destructive" });
      } else if (data) {
        setS({ ...DEFAULTS, ...(data as any) });
      }
      setLoading(false);
    })();
  }, []);

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  const addEmail = () => {
    const v = emailInput.trim().toLowerCase();
    if (!EMAIL_RE.test(v)) {
      toast({ title: "Email invalid", variant: "destructive" });
      return;
    }
    if (s.recipient_emails.includes(v)) return;
    update("recipient_emails", [...s.recipient_emails, v]);
    setEmailInput("");
  };
  const addPhone = () => {
    const v = phoneInput.trim().replace(/\s+/g, "");
    if (!PHONE_RE.test(v)) {
      toast({ title: "Telefon invalid", description: "Format E.164, ex: +407xxxxxxxx", variant: "destructive" });
      return;
    }
    if (s.recipient_phones.includes(v)) return;
    update("recipient_phones", [...s.recipient_phones, v]);
    setPhoneInput("");
  };

  const save = async () => {
    if (s.dominance_critical_ratio < s.dominance_warning_ratio) {
      toast({ title: "Praguri invalide", description: "Critical ≥ Warning (dominanță)", variant: "destructive" });
      return;
    }
    if (s.spike_critical_ratio < s.spike_warning_ratio) {
      toast({ title: "Praguri invalide", description: "Critical ≥ Warning (spike)", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("prospect_alert_settings")
      .upsert({ id: 1, ...s, updated_by: user?.id ?? null }, { onConflict: "id" });
    setSaving(false);
    if (error) toast({ title: "Salvare eșuată", description: error.message, variant: "destructive" });
    else toast({ title: "Setări salvate", description: "Aplicate la următoarea scanare." });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> Se încarcă setările...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" /> Setări alerte respingeri
        </CardTitle>
        <CardDescription>
          Configurează destinatari (email/SMS) și pragurile de severitate folosite de detectorul de anomalii.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle global */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label className="text-sm font-medium">Notificări active</Label>
            <p className="text-xs text-muted-foreground">Dezactivează ca să oprești emailurile/SMS-urile fără să oprești detectorul.</p>
          </div>
          <Switch checked={s.notifications_enabled} onCheckedChange={(v) => update("notifications_enabled", v)} />
        </div>

        {/* Destinatari */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Mail className="w-4 h-4" /> Emailuri destinatare</Label>
            <div className="flex gap-2">
              <Input
                placeholder="alert@firma.ro"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
              />
              <Button type="button" variant="secondary" onClick={addEmail}>Adaugă</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {s.recipient_emails.length === 0 && <span className="text-xs text-muted-foreground">Niciun email configurat.</span>}
              {s.recipient_emails.map((e) => (
                <Badge key={e} variant="secondary" className="gap-1">
                  {e}
                  <button onClick={() => update("recipient_emails", s.recipient_emails.filter((x) => x !== e))} aria-label={`Șterge ${e}`}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Phone className="w-4 h-4" /> Telefoane SMS (E.164)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="+40712345678"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhone(); } }}
              />
              <Button type="button" variant="secondary" onClick={addPhone}>Adaugă</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {s.recipient_phones.length === 0 && <span className="text-xs text-muted-foreground">Niciun telefon configurat.</span>}
              {s.recipient_phones.map((p) => (
                <Badge key={p} variant="secondary" className="gap-1">
                  {p}
                  <button onClick={() => update("recipient_phones", s.recipient_phones.filter((x) => x !== p))} aria-label={`Șterge ${p}`}>
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Severitate minimă canal */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Severitate minimă pentru EMAIL</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={s.email_min_severity}
              onChange={(e) => update("email_min_severity", e.target.value as Severity)}
            >
              <option value="info">info (toate)</option>
              <option value="warning">warning</option>
              <option value="critical">critical</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Severitate minimă pentru SMS</Label>
            <select
              className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              value={s.sms_min_severity}
              onChange={(e) => update("sms_min_severity", e.target.value as "warning" | "critical")}
            >
              <option value="warning">warning</option>
              <option value="critical">critical (recomandat)</option>
            </select>
          </div>
        </div>

        {/* Praguri */}
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Dominanță sursă (per motiv)</h4>
            <p className="text-xs text-muted-foreground">O platformă produce X% din respingeri pentru un motiv.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <NumField label="Prag warning (0–1)" value={s.dominance_warning_ratio} step={0.05} min={0} max={1}
              onChange={(v) => update("dominance_warning_ratio", v)} />
            <NumField label="Prag critical (0–1)" value={s.dominance_critical_ratio} step={0.05} min={0} max={1}
              onChange={(v) => update("dominance_critical_ratio", v)} />
            <NumField label="Total minim respingeri" value={s.dominance_min_total} step={1} min={1}
              onChange={(v) => update("dominance_min_total", Math.round(v))} />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Spike (a doua jumătate vs prima)</h4>
            <p className="text-xs text-muted-foreground">Multiplicator B/A din care se declanșează alertă.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <NumField label="Multiplicator warning" value={s.spike_warning_ratio} step={0.1} min={1}
              onChange={(v) => update("spike_warning_ratio", v)} />
            <NumField label="Multiplicator critical" value={s.spike_critical_ratio} step={0.1} min={1}
              onChange={(v) => update("spike_critical_ratio", v)} />
            <NumField label="Volum minim (jum. 2)" value={s.spike_min_count} step={1} min={1}
              onChange={(v) => update("spike_min_count", Math.round(v))} />
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold">Surge volum total</h4>
            <p className="text-xs text-muted-foreground">Alertă warning dacă totalul respingerilor depășește 2× pragul setat.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <NumField label="Prag (declanșează la 2×)" value={s.surge_threshold} step={5} min={5}
              onChange={(v) => update("surge_threshold", Math.round(v))} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Salvează setările
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NumField({
  label, value, step, min, max, onChange,
}: { label: string; value: number; step: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(n);
        }}
      />
    </div>
  );
}
