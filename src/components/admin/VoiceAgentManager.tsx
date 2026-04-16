import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, PhoneCall, Loader2, Mic, Sparkles, Clock, AlertTriangle, Bot, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

interface VoiceCall {
  id: string;
  twilio_call_sid: string | null;
  to_number: string;
  status: string;
  call_duration_seconds: number | null;
  ai_summary: string | null;
  ai_outcome: string | null;
  ai_sentiment: string | null;
  next_action: string | null;
  transcript: any[] | null;
  recording_url: string | null;
  cost_estimate_usd: number | null;
  call_objective: string;
  created_at: string;
  ended_at: string | null;
  error_message: string | null;
}

const statusColor = (s: string) => {
  if (["completed"].includes(s)) return "bg-green-100 text-green-800";
  if (["in-progress", "ringing", "queued", "initiating"].includes(s)) return "bg-blue-100 text-blue-800 animate-pulse";
  if (["failed", "busy", "no-answer", "canceled"].includes(s)) return "bg-red-100 text-red-800";
  return "bg-muted text-muted-foreground";
};

const sentimentEmoji: Record<string, string> = {
  pozitiv: "😊", neutru: "😐", negativ: "😞",
};

export default function VoiceAgentManager() {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialing, setDialing] = useState(false);
  const [toNumber, setToNumber] = useState("+40");
  const [objective, setObjective] = useState("qualify");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);
  const [autoSettings, setAutoSettings] = useState<any>(null);
  const [testingAuto, setTestingAuto] = useState(false);

  const loadSettings = async () => {
    const { data } = await supabase.from("voice_agent_settings" as any).select("*").eq("id", 1).maybeSingle();
    if (data) setAutoSettings(data);
  };

  const saveSettings = async (patch: any) => {
    const next = { ...autoSettings, ...patch };
    setAutoSettings(next);
    const { error } = await supabase.from("voice_agent_settings" as any).update(patch).eq("id", 1);
    if (error) toast({ title: "Eroare", description: error.message, variant: "destructive" });
    else toast({ title: "Setări salvate ✓" });
  };

  const triggerAutoDialNow = async () => {
    setTestingAuto(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-auto-dial", { body: {} });
      if (error) toast({ title: "Eroare", description: error.message, variant: "destructive" });
      else toast({
        title: "Auto-dial rulat",
        description: data?.success ? `Sunat lead ${data.called_lead_id} (scor ${data.lead_score})` : (data?.skipped || data?.error || "OK"),
      });
      loadCalls();
    } finally { setTestingAuto(false); }
  };

  const loadCalls = async () => {
    const { data } = await supabase
      .from("voice_call_sessions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    setCalls((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    loadCalls();
    loadSettings();
    const channel = supabase
      .channel("voice-calls-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_call_sessions" }, () => loadCalls())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const initiateCall = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(toNumber)) {
      toast({ title: "Număr invalid", description: "Format E.164 (ex: +407...)", variant: "destructive" });
      return;
    }
    setDialing(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-initiate", {
        body: { toNumber, objective, customPrompt: customPrompt || undefined },
      });
      if (error || data?.error) {
        toast({
          title: "Apel eșuat",
          description: data?.error || error?.message || "Eroare necunoscută",
          variant: "destructive",
        });
      } else {
        toast({ title: "Apel inițiat 📞", description: `Call SID: ${data.callSid}` });
        setCustomPrompt("");
        loadCalls();
      }
    } finally {
      setDialing(false);
    }
  };

  const stats = {
    total: calls.length,
    completed: calls.filter(c => c.status === "completed").length,
    interested: calls.filter(c => c.ai_outcome === "interesat" || c.ai_outcome === "programare").length,
    avgDuration: Math.round(calls.filter(c => c.call_duration_seconds).reduce((a, c) => a + (c.call_duration_seconds || 0), 0) / Math.max(calls.filter(c => c.call_duration_seconds).length, 1)),
    totalCost: calls.reduce((a, c) => a + (Number(c.cost_estimate_usd) || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* AUTO-DIAL SETTINGS */}
      <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Auto-Dial Inteligent
            {autoSettings?.auto_dial_enabled && <Badge className="bg-primary/15 text-primary border border-primary/30 animate-pulse">ACTIV</Badge>}
          </CardTitle>
          <CardDescription>
            Sună automat lead-urile cu scor ≥ {autoSettings?.min_lead_score ?? 90} în intervalul orar permis. Cron rulează la 15 min, max 1 apel/rulare.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
            <div>
              <div className="font-medium text-sm">Activează auto-dial pentru lead-urile cu scor maxim</div>
              <div className="text-xs text-muted-foreground">Când e activ, nu mai trebuie să apeși manual butonul.</div>
            </div>
            <Switch
              checked={!!autoSettings?.auto_dial_enabled}
              onCheckedChange={(v) => saveSettings({ auto_dial_enabled: v })}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Scor minim lead</label>
              <Input
                type="number" min={50} max={100}
                value={autoSettings?.min_lead_score ?? 90}
                onChange={(e) => setAutoSettings({ ...autoSettings, min_lead_score: parseInt(e.target.value) || 90 })}
                onBlur={(e) => saveSettings({ min_lead_score: parseInt(e.target.value) || 90 })}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Ora start (RO)</label>
              <Input
                type="number" min={0} max={23}
                value={autoSettings?.allowed_hours_start ?? 10}
                onChange={(e) => setAutoSettings({ ...autoSettings, allowed_hours_start: parseInt(e.target.value) || 10 })}
                onBlur={(e) => saveSettings({ allowed_hours_start: parseInt(e.target.value) || 10 })}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Ora stop (RO)</label>
              <Input
                type="number" min={0} max={23}
                value={autoSettings?.allowed_hours_end ?? 18}
                onChange={(e) => setAutoSettings({ ...autoSettings, allowed_hours_end: parseInt(e.target.value) || 18 })}
                onBlur={(e) => saveSettings({ allowed_hours_end: parseInt(e.target.value) || 18 })}
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Max apeluri / zi</label>
              <Input
                type="number" min={1} max={500}
                value={autoSettings?.max_calls_per_day ?? 20}
                onChange={(e) => setAutoSettings({ ...autoSettings, max_calls_per_day: parseInt(e.target.value) || 20 })}
                onBlur={(e) => saveSettings({ max_calls_per_day: parseInt(e.target.value) || 20 })}
              />
            </div>
          </div>

          <Button onClick={triggerAutoDialNow} disabled={testingAuto} variant="outline" className="w-full">
            {testingAuto ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Rulează Auto-Dial Acum (test)
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" />
            AI Voice Agent — Outbound Call
          </CardTitle>
          <CardDescription>
            Sună automat un lead. Ana (AI) calificează interesul, programează vizionări și salvează transcript-ul.
            Necesită conectorul Twilio + secret <code>TWILIO_FROM_NUMBER</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Număr destinație (E.164)</label>
              <Input value={toNumber} onChange={(e) => setToNumber(e.target.value)} placeholder="+40712345678" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Obiectiv apel</label>
              <Select value={objective} onValueChange={setObjective}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="qualify">Calificare interes</SelectItem>
                  <SelectItem value="schedule">Programare vizionare</SelectItem>
                  <SelectItem value="followup">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Prompt personalizat (opțional)</label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Suprascrie prompt-ul implicit al asistentei Ana..."
              rows={3}
            />
          </div>
          <Button onClick={initiateCall} disabled={dialing} size="lg" className="w-full">
            {dialing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
            Inițiază Apelul AI
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-5">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total apeluri</div><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Finalizate</div><div className="text-2xl font-bold">{stats.completed}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Interesați</div><div className="text-2xl font-bold text-primary">{stats.interested}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Durata medie</div><div className="text-2xl font-bold">{stats.avgDuration}s</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Cost total</div><div className="text-2xl font-bold">${stats.totalCost.toFixed(2)}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mic className="h-5 w-5" /> Istoric apeluri</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : calls.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Niciun apel încă. Inițiază primul de mai sus.</p>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {calls.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition"
                    onClick={() => setSelectedCall(c)}
                  >
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{c.to_number}</span>
                        <Badge className={statusColor(c.status)}>{c.status}</Badge>
                        {c.ai_outcome && <Badge variant="outline">{c.ai_outcome}</Badge>}
                        {c.ai_sentiment && <span>{sentimentEmoji[c.ai_sentiment] || "•"}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {c.ai_summary || c.error_message || "Nicio sinteză încă"}
                      </div>
                    </div>
                    <div className="text-xs text-right shrink-0">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />{c.call_duration_seconds || 0}s
                      </div>
                      <div className="text-muted-foreground">{new Date(c.created_at).toLocaleString("ro-RO", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedCall} onOpenChange={(o) => !o && setSelectedCall(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="h-5 w-5" />
              Apel către {selectedCall?.to_number}
              {selectedCall && <Badge className={statusColor(selectedCall.status)}>{selectedCall.status}</Badge>}
            </DialogTitle>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-4">
              {selectedCall.error_message && (
                <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <div>{selectedCall.error_message}</div>
                </div>
              )}
              {selectedCall.ai_summary && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Sinteză AI</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>{selectedCall.ai_summary}</p>
                    {selectedCall.next_action && (
                      <p className="text-muted-foreground"><strong>Următoarea acțiune:</strong> {selectedCall.next_action}</p>
                    )}
                  </CardContent>
                </Card>
              )}
              {selectedCall.recording_url && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Înregistrare</label>
                  <audio controls src={selectedCall.recording_url} className="w-full" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-2 block">Transcript live</label>
                <ScrollArea className="h-[300px] border rounded-lg p-3">
                  {(selectedCall.transcript || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Niciun transcript încă.</p>
                  ) : (
                    <div className="space-y-3">
                      {(selectedCall.transcript || []).map((t: any, i: number) => (
                        <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${t.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            <div className="text-xs opacity-70 mb-0.5">{t.role === "user" ? "Client" : "Ana (AI)"}</div>
                            {t.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
