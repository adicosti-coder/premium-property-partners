import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle, PhoneCall, Lightbulb, Loader2, ShieldCheck, Play, RefreshCw } from "lucide-react";

interface Prospect {
  id: string;
  title: string | null;
  zone: string | null;
  phone_normalized: string | null;
  contact_phone: string | null;
  lead_score: number | null;
  lifecycle_status: string | null;
  category: string | null;
}

interface Lesson {
  id: string;
  lesson: string;
  is_active: boolean;
  severity: string;
  created_at: string;
}

interface SafetyState {
  calls_paused: boolean;
  paused_reason: string | null;
  success_rate_pct: number | null;
  sample_size: number | null;
  last_check_at: string | null;
}

export default function VoiceAgentBatchCalling() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [safety, setSafety] = useState<SafetyState | null>(null);
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [pRes, lRes, sRes] = await Promise.all([
      supabase
        .from("prospect_listings")
        .select("id, title, zone, phone_normalized, contact_phone, lead_score, lifecycle_status, category")
        .eq("is_active", true)
        .eq("prospect_type", "proprietar")
        .eq("lifecycle_status", "new")
        .not("phone_normalized", "is", null)
        .order("lead_score", { ascending: false, nullsFirst: false })
        .limit(30),
      supabase
        .from("voice_agent_playbook_addendum")
        .select("id, lesson, is_active, severity, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("voice_agent_safety_state")
        .select("calls_paused, paused_reason, success_rate_pct, sample_size, last_check_at")
        .eq("id", true)
        .maybeSingle(),
    ]);
    setProspects((pRes.data as Prospect[]) || []);
    setLessons((lRes.data as Lesson[]) || []);
    setSafety((sRes.data as SafetyState) || null);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const toggleOne = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else if (n.size < 10) n.add(id);
    setSelected(n);
  };

  const selectTop10 = () => {
    setSelected(new Set(prospects.slice(0, 10).map((p) => p.id)));
  };

  const startBatch = async () => {
    if (selected.size === 0) {
      toast({ variant: "destructive", title: "Selectează lead-uri", description: "Alege până la 10 prospecte." });
      return;
    }
    setLaunching(true);
    const { data, error } = await supabase.functions.invoke("voice-agent-bulk-campaign", {
      body: { prospect_ids: Array.from(selected) },
    });
    setLaunching(false);
    if (error || (data as any)?.error) {
      const reason = (data as any)?.reason || (data as any)?.error || error?.message || "Eroare necunoscută";
      toast({ variant: "destructive", title: "Batch oprit", description: reason });
      loadAll();
      return;
    }
    toast({ title: "📞 Batch pornit", description: `${selected.size} apeluri în coadă.` });
    setSelected(new Set());
    loadAll();
  };

  const resumeCalls = async () => {
    await supabase
      .from("voice_agent_safety_state")
      .update({ calls_paused: false, paused_reason: null })
      .eq("id", true);
    toast({ title: "✅ Apeluri reluate", description: "Sistemul a fost deblocat manual." });
    loadAll();
  };

  const toggleLesson = async (l: Lesson) => {
    await supabase
      .from("voice_agent_playbook_addendum")
      .update({ is_active: !l.is_active })
      .eq("id", l.id);
    loadAll();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneCall className="h-5 w-5 text-primary" />
          Batch Calling — Lead-uri Reale
        </CardTitle>
        <CardDescription>
          Selectează până la 10 prospecte și pornește apelurile automate. Sistemul Stop-Loss oprește
          automat campania dacă rata de succes scade sub 20%.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SAFETY BANNER */}
        {safety?.calls_paused ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>⚠️ Review Required — Apelurile sunt oprite</AlertTitle>
            <AlertDescription className="space-y-2">
              <div>{safety.paused_reason || "Rata de succes a scăzut sub pragul de 20%."}</div>
              <div className="text-xs text-muted-foreground">
                Rată: {safety.success_rate_pct ?? "—"}% pe {safety.sample_size ?? 0} apeluri.
                Ultimul check: {safety.last_check_at ? new Date(safety.last_check_at).toLocaleString("ro-RO") : "—"}
              </div>
              <Button size="sm" variant="outline" onClick={resumeCalls}>
                <ShieldCheck className="h-3 w-3 mr-1" /> Reluare manuală apeluri
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <AlertTitle>Sistem activ</AlertTitle>
            <AlertDescription className="text-xs">
              Rată succes 24h: {safety?.success_rate_pct ?? "—"}% / {safety?.sample_size ?? 0} apeluri reale.
              Pragul de oprire: &lt;20% (min. 5 apeluri).
            </AlertDescription>
          </Alert>
        )}

        {/* LESSONS LEARNED */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center gap-1 text-sm">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Lecții Învățate (auto-injectate în prompt)
              <Badge variant="secondary" className="ml-1">{lessons.filter((l) => l.is_active).length} active</Badge>
            </h4>
            <Button size="sm" variant="ghost" onClick={loadAll}><RefreshCw className="h-3 w-3" /></Button>
          </div>
          <div className="border rounded max-h-48 overflow-auto divide-y">
            {lessons.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">
                Nicio lecție încă. Vor fi generate automat după apeluri respinse.
              </div>
            ) : (
              lessons.map((l) => (
                <div key={l.id} className="p-2 flex items-start gap-2 text-xs">
                  <Switch checked={l.is_active} onCheckedChange={() => toggleLesson(l)} />
                  <div className="flex-1">
                    <div className={l.is_active ? "" : "opacity-50 line-through"}>{l.lesson}</div>
                    <div className="text-muted-foreground mt-0.5">
                      {new Date(l.created_at).toLocaleString("ro-RO")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PROSPECT PICKER */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">
              Prospecte disponibile ({prospects.length}) —
              <span className="text-primary ml-1">selectate {selected.size}/10</span>
            </h4>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectTop10} disabled={prospects.length === 0}>
                Top 10 după scor
              </Button>
              <Button
                size="sm"
                onClick={startBatch}
                disabled={selected.size === 0 || launching || safety?.calls_paused}
              >
                {launching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                Start Batch Calling
              </Button>
            </div>
          </div>
          <div className="border rounded max-h-80 overflow-auto divide-y">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Se încarcă...
              </div>
            ) : prospects.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                Niciun prospect cu telefon validat și status "new".
              </div>
            ) : (
              prospects.map((p) => (
                <label
                  key={p.id}
                  className={`p-2 flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 ${
                    selected.has(p.id) ? "bg-primary/5" : ""
                  }`}
                >
                  <Checkbox
                    checked={selected.has(p.id)}
                    onCheckedChange={() => toggleOne(p.id)}
                    disabled={!selected.has(p.id) && selected.size >= 10}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{p.title || "(fără titlu)"}</div>
                    <div className="text-muted-foreground flex gap-2 flex-wrap">
                      {p.zone && <span>📍 {p.zone}</span>}
                      {p.category && <Badge variant="outline" className="text-[10px]">{p.category}</Badge>}
                      <span>📞 {p.phone_normalized || p.contact_phone}</span>
                    </div>
                  </div>
                  {p.lead_score !== null && (
                    <Badge variant={p.lead_score >= 80 ? "default" : "secondary"}>{p.lead_score}</Badge>
                  )}
                </label>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
