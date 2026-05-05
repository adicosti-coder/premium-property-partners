import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, PhoneCall, Loader2, Mic, Sparkles, Clock, AlertTriangle, Bot, Zap, Volume2, Play as PlayIcon, Mail, MessageCircle } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import VoiceAgentScriptsEditor from "./VoiceAgentScriptsEditor";
import VoiceAgentMonitoring from "./VoiceAgentMonitoring";
import VoiceCallerProfilesManager from "./VoiceCallerProfilesManager";
import VoiceAgentKnowledgeBase from "./VoiceAgentKnowledgeBase";
import VoiceAgentFollowupQueue from "./VoiceAgentFollowupQueue";
import VoiceAgentSimSuccessRate from "./VoiceAgentSimSuccessRate";
import VoiceAgentBatchCalling from "./VoiceAgentBatchCalling";
import VoiceAgentTrainingLab from "./VoiceAgentTrainingLab";
import VoiceAgentGhostingQueue from "./VoiceAgentGhostingQueue";
import VoiceAgentAutopilot from "./VoiceAgentAutopilot";

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
  detected_language?: string | null;
  language_retry_count?: number | null;
  language_retry_of?: string | null;
  debug_log?: any[] | null;
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
  const [previewText, setPreviewText] = useState("Bună ziua, sunt Andrei de la RealTrust Timișoara. Am observat anunțul dumneavoastră și aș vrea să discutăm un minut despre o oportunitate.");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<string | null>(null);
  const [testNumber, setTestNumber] = useState<string>(() => localStorage.getItem("voice_test_number") || "+40");
  const [runningTest, setRunningTest] = useState(false);
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [reportPolling, setReportPolling] = useState(false);
  const [langTestRunning, setLangTestRunning] = useState(false);
  const [langTestResult, setLangTestResult] = useState<{
    summary: { total: number; passed: number; failed: number; pass_rate: number; verdict: string; duration_ms: number; tested_at: string };
    results: Array<{ scenario_id: string; user_message: string; ai_reply: string; passed: boolean; ai_error: string | null; english_words_detected: string[]; has_diacritics: boolean; duration_ms: number }>;
  } | null>(null);
  const [langTestOpen, setLangTestOpen] = useState(false);

  const runLanguageTest = async () => {
    setLangTestRunning(true);
    setLangTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-language-test", { body: {} });
      if (error || (data as any)?.error) {
        toast({
          title: "Test limbă eșuat",
          description: (data as any)?.error || error?.message || "Eroare necunoscută",
          variant: "destructive",
        });
        return;
      }
      setLangTestResult(data);
      setLangTestOpen(true);
      const verdict = data.summary.verdict;
      toast({
        title:
          verdict === "PASS"
            ? "✅ Test trecut — 100% română"
            : verdict === "WARN"
            ? "⚠️ Test cu avertismente"
            : "❌ Test eșuat — engleză detectată",
        description: `${data.summary.passed}/${data.summary.total} scenarii au păstrat exclusiv limba română.`,
        variant: verdict === "FAIL" ? "destructive" : "default",
      });
    } finally {
      setLangTestRunning(false);
    }
  };

  const VOICES = [
    { id: "S98OhkhaxeAKHEbhoLi7", name: "Andrei (masculin, RO — Digital Concierge, recomandat)" },
  ];

  const previewVoice = async () => {
    setPreviewLoading(true);
    setPreviewAudio(null);
    try {
      const { data, error } = await supabase.functions.invoke("voice-tts-elevenlabs", {
        body: {
          text: previewText,
          mode: "preview",
          voice: {
            voice_id: autoSettings?.elevenlabs_voice_id,
            model_id: autoSettings?.elevenlabs_model_id,
            stability: Number(autoSettings?.voice_stability),
            similarity_boost: Number(autoSettings?.voice_similarity_boost),
            style: Number(autoSettings?.voice_style),
            speed: Number(autoSettings?.voice_speed),
            use_speaker_boost: autoSettings?.voice_use_speaker_boost,
          },
        },
      });
      if (error || data?.error) {
        toast({ title: "Eroare preview", description: data?.error || error?.message, variant: "destructive" });
      } else if (data?.audioContent) {
        setPreviewAudio(`data:audio/mpeg;base64,${data.audioContent}`);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

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

  // Auto-open dialog when test call finishes
  useEffect(() => {
    if (!testSessionId) return;
    const found = calls.find((c) => c.id === testSessionId);
    const hasFinalReport = !!(found?.ai_summary || found?.recording_url || (found?.transcript || []).length);
    if (found && ["completed", "failed", "busy", "no-answer", "canceled", "unknown"].includes(found.status) && hasFinalReport) {
      setSelectedCall(found);
      setTestSessionId(null);
      setReportPolling(false);
      toast({
        title: found.status === "completed" ? "✅ Test finalizat" : `⚠️ Test ${found.status}`,
        description: `Durată: ${found.call_duration_seconds || 0}s. Verifică audio + transcript în dialog.`,
      });
    }
  }, [calls, testSessionId]);

  useEffect(() => {
    if (!testSessionId) return;
    setReportPolling(true);
    const interval = window.setInterval(() => {
      loadCalls();
    }, 2500);

    const timeout = window.setTimeout(() => {
      setReportPolling(false);
      window.clearInterval(interval);
    }, 90000);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [testSessionId]);

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

  const runFullTest = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(testNumber)) {
      toast({ title: "Număr invalid", description: "Introdu numărul tău în format E.164 (ex: +407...)", variant: "destructive" });
      return;
    }
    localStorage.setItem("voice_test_number", testNumber);
    setRunningTest(true);
    setTestSessionId(null);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-initiate", {
        body: {
          toNumber: testNumber,
          objective: "qualify",
          customPrompt: "TEST DIAGNOSTIC: Ești Andrei de la RealTrust Timișoara. Vorbești EXCLUSIV în limba română. Spune: 'Bună ziua! Acesta este un apel de test pentru sistemul vocal RealTrust. Vă aud bine. Testul este finalizat cu succes. La revedere!' Apoi închide politicos după ce primești orice răspuns.",
        },
      });
      if (error || data?.error) {
        toast({ title: "Test eșuat", description: data?.error || error?.message, variant: "destructive" });
      } else {
        setTestSessionId(data.sessionId);
        toast({
          title: "🧪 Test inițiat — răspunde la telefon",
          description: `Audio + transcript se salvează automat. Dialogul se va deschide când apelul se termină.`,
        });
        loadCalls();
      }
    } finally {
      setRunningTest(false);
    }
  };

  const replayTest = async (call: VoiceCall) => {
    setRunningTest(true);
    setTestSessionId(null);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-initiate", {
        body: {
          toNumber: call.to_number,
          objective: call.call_objective || "qualify",
          customPrompt: "TEST DIAGNOSTIC: Ești Andrei de la RealTrust Timișoara. Vorbești EXCLUSIV în limba română. Spune: 'Bună ziua! Acesta este un apel de test pentru sistemul vocal RealTrust. Vă aud bine. Testul este finalizat cu succes. La revedere!' Apoi închide politicos după ce primești orice răspuns.",
        },
      });
      if (error || data?.error) {
        toast({ title: "Replay eșuat", description: data?.error || error?.message, variant: "destructive" });
      } else {
        setTestSessionId(data.sessionId);
        toast({ title: "🔁 Replay inițiat", description: `Răspunde la ${call.to_number}. Pașii apar live mai jos.` });
        loadCalls();
      }
    } finally {
      setRunningTest(false);
    }
  };

  const computeSteps = (call: VoiceCall) => {
    const transcript = call.transcript || [];
    const debugLog = (call.debug_log || []) as any[];
    const lastTwiml = [...debugLog].reverse().find((e) => e.stage === "twiml_turn_end");
    const statusEntry = [...debugLog].reverse().find((e) => e.stage === "status_callback");

    const inProgress = ["queued", "initiating", "ringing", "in-progress", "completing"].includes(call.status);
    const lang = call.detected_language;
    const ttsUrl = lastTwiml?.audioUrl || null;
    const ttsErr = lastTwiml?.ttsError || null;
    const reportSkip = statusEntry?.reportSkipReason || null;

    return [
      { label: "Apel inițiat", state: call.twilio_call_sid ? "ok" : "pending", detail: call.twilio_call_sid || "—" },
      {
        label: "Limbă detectată",
        state: lang === "ro" ? "ok" : lang === "en" ? "err" : inProgress ? "pending" : "warn",
        detail: lang === "ro" ? "🇷🇴 Română" : lang === "en" ? "⚠️ Engleză" : "necunoscută",
      },
      {
        label: "TTS audio Twilio",
        state: ttsErr ? "err" : ttsUrl ? "ok" : inProgress ? "pending" : "warn",
        detail: ttsErr ? ttsErr : ttsUrl ? `ElevenLabs URL semnat (${ttsUrl.slice(0, 50)}…)` : "Twilio Say (fallback)",
      },
      {
        label: "Transcript",
        state: transcript.length >= 2 ? "ok" : transcript.length === 1 ? "warn" : inProgress ? "pending" : "err",
        detail: `${transcript.length} replici`,
      },
      {
        label: "Înregistrare audio",
        state: call.recording_url ? "ok" : inProgress ? "pending" : "warn",
        detail: call.recording_url ? "disponibilă" : "lipsă",
      },
      {
        label: "Raport AI",
        state: call.ai_summary ? "ok" : reportSkip ? "warn" : inProgress ? "pending" : "err",
        detail: call.ai_summary ? (call.ai_outcome || "creat") : reportSkip || "în curs",
      },
    ];
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
      <Card className="border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-amber-500/5 to-transparent">
        <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Andrei — Concierge Vocal RealTrust
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">High-Performance Management</Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                Mod activ: ton de concierge premium, cifre de piață în timp real, închidere conversațională cu cârlig de vizionare.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <VoiceAgentAutopilot />
      <VoiceAgentSimSuccessRate />
      <VoiceAgentBatchCalling />
      <VoiceAgentTrainingLab />
      <VoiceAgentMonitoring />
      <VoiceCallerProfilesManager />
      <VoiceAgentKnowledgeBase />
      <VoiceAgentFollowupQueue />
      <VoiceAgentGhostingQueue />
      {/* QUICK LINK to unified dashboard */}
      <Card className="border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold flex items-center gap-2"><Phone className="w-4 h-4 text-primary" /> Dashboard Apeluri Unificat</h3>
            <p className="text-sm text-muted-foreground">Toate apelurile (Voice Agent + Scraper + Prospecți) într-o singură vedere cu filtre și acțiuni rapide.</p>
          </div>
          <Button asChild variant="default">
            <a href="/admin/call-dashboard">Deschide Dashboard →</a>
          </Button>
        </CardContent>
      </Card>

      {/* SCRIPT EDITOR (system prompt AI) */}
      <VoiceAgentScriptsEditor />

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

      {/* ELEVENLABS VOICE TUNING */}
      <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-amber-600" />
            Voce Premium ElevenLabs — Tuning & Preview
            {autoSettings?.tts_provider === "elevenlabs" && <Badge className="bg-amber-500/15 text-amber-700 border border-amber-500/40">ACTIV</Badge>}
          </CardTitle>
          <CardDescription>
            Mod premium: toate apelurile folosesc Andrei, aceeași voce ElevenLabs ca Digital Concierge. Fără fallback pe voci feminine pentru apelurile normale.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
            <div>
              <div className="font-medium text-sm">Activează ElevenLabs (mod hibrid)</div>
              <div className="text-xs text-muted-foreground">Blocat pe modul premium pentru claritate maximă în română.</div>
            </div>
            <Switch
              checked={true}
              disabled
            />
          </div>

          <div className="p-3 rounded-lg border bg-amber-50/40 dark:bg-amber-950/10">
            <div className="flex justify-between text-xs mb-2">
              <span className="font-medium">Regim voce apeluri</span>
              <span className="font-mono text-amber-700">Premium Plus</span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Toate apelurile folosesc Andrei ElevenLabs, optimizat pentru telefon. Fallback-ul vocal intră doar dacă serviciul audio extern nu răspunde.
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Voce</label>
              <Select
                value={autoSettings?.elevenlabs_voice_id || "S98OhkhaxeAKHEbhoLi7"}
                onValueChange={(v) => saveSettings({ elevenlabs_voice_id: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VOICES.map(v => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Model</label>
              <Select
                value={autoSettings?.elevenlabs_model_id || "eleven_turbo_v2_5"}
                onValueChange={(v) => saveSettings({ elevenlabs_model_id: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eleven_multilingual_v2">Multilingual v2 (calitate maximă)</SelectItem>
                  <SelectItem value="eleven_turbo_v2_5">Turbo v2.5 (latență scăzută)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Stabilitate</span><span className="font-mono">{Number(autoSettings?.voice_stability ?? 0.6).toFixed(2)}</span></div>
              <Slider min={0} max={1} step={0.05} value={[Number(autoSettings?.voice_stability ?? 0.6)]} onValueChange={([v]) => setAutoSettings({ ...autoSettings, voice_stability: v })} onValueCommit={([v]) => saveSettings({ voice_stability: v })} />
              <div className="text-[10px] text-muted-foreground mt-1">Mai mic = mai expresiv, mai mare = mai constant</div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Similaritate</span><span className="font-mono">{Number(autoSettings?.voice_similarity_boost ?? 0.8).toFixed(2)}</span></div>
              <Slider min={0} max={1} step={0.05} value={[Number(autoSettings?.voice_similarity_boost ?? 0.8)]} onValueChange={([v]) => setAutoSettings({ ...autoSettings, voice_similarity_boost: v })} onValueCommit={([v]) => saveSettings({ voice_similarity_boost: v })} />
              <div className="text-[10px] text-muted-foreground mt-1">Cât de fidel păstrează caracteristicile vocii</div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Stil</span><span className="font-mono">{Number(autoSettings?.voice_style ?? 0.4).toFixed(2)}</span></div>
              <Slider min={0} max={1} step={0.05} value={[Number(autoSettings?.voice_style ?? 0.4)]} onValueChange={([v]) => setAutoSettings({ ...autoSettings, voice_style: v })} onValueCommit={([v]) => saveSettings({ voice_style: v })} />
              <div className="text-[10px] text-muted-foreground mt-1">Exagerare emoțională / inflexiuni</div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Viteză</span><span className="font-mono">{Number(autoSettings?.voice_speed ?? 1.0).toFixed(2)}x</span></div>
              <Slider min={0.7} max={1.2} step={0.05} value={[Number(autoSettings?.voice_speed ?? 1.0)]} onValueChange={([v]) => setAutoSettings({ ...autoSettings, voice_speed: v })} onValueCommit={([v]) => saveSettings({ voice_speed: v })} />
              <div className="text-[10px] text-muted-foreground mt-1">Ritmul vorbirii</div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg border bg-background">
            <div className="text-sm font-medium">Speaker Boost (claritate suplimentară)</div>
            <Switch checked={!!autoSettings?.voice_use_speaker_boost} onCheckedChange={(v) => saveSettings({ voice_use_speaker_boost: v })} />
          </div>

          <div className="space-y-2 p-3 rounded-lg border bg-background">
            <label className="text-xs font-medium text-muted-foreground">Text preview</label>
            <Textarea rows={2} value={previewText} onChange={(e) => setPreviewText(e.target.value)} />
            <div className="flex gap-2">
              <Button onClick={previewVoice} disabled={previewLoading} variant="outline" size="sm">
                {previewLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayIcon className="h-4 w-4 mr-2" />}
                Ascultă preview
              </Button>
              {previewAudio && <audio controls src={previewAudio} className="flex-1 h-9" autoPlay />}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NOTIFICATIONS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Notificări post-apel
          </CardTitle>
          <CardDescription>Primești sumarul AI + link înregistrare după fiecare apel finalizat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><div><div className="text-sm font-medium">Email cu transcript + recording</div><div className="text-xs text-muted-foreground">Către {autoSettings?.notify_email || "adicosti@gmail.com"}</div></div></div>
            <Switch checked={!!autoSettings?.notify_email_enabled} onCheckedChange={(v) => saveSettings({ notify_email_enabled: v })} />
          </div>
          <Input
            placeholder="adresa@email.com"
            value={autoSettings?.notify_email || ""}
            onChange={(e) => setAutoSettings({ ...autoSettings, notify_email: e.target.value })}
            onBlur={(e) => saveSettings({ notify_email: e.target.value })}
          />
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-green-600" /><div><div className="text-sm font-medium">WhatsApp cu rezumat scurt</div><div className="text-xs text-muted-foreground">Via webhook Make.com</div></div></div>
            <Switch checked={!!autoSettings?.notify_whatsapp_enabled} onCheckedChange={(v) => saveSettings({ notify_whatsapp_enabled: v })} />
          </div>
        </CardContent>
      </Card>

      {/* LANGUAGE TEST — fără telefon */}
      <Card className="border-2 border-amber-500/40 bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-amber-600" />
            🇷🇴 Test limbă română (fără apel telefonic)
            {langTestResult && (
              <Badge
                className={
                  langTestResult.summary.verdict === "PASS"
                    ? "bg-green-500/15 text-green-700 border border-green-500/40"
                    : langTestResult.summary.verdict === "WARN"
                    ? "bg-amber-500/15 text-amber-700 border border-amber-500/40"
                    : "bg-red-500/15 text-red-700 border border-red-500/40"
                }
              >
                {langTestResult.summary.verdict} — {langTestResult.summary.passed}/{langTestResult.summary.total}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Forțează agentul să răspundă la 6 scenarii (inclusiv provocări în engleză tip "Hello, please switch to English")
            și verifică automat că răspunsul rămâne EXCLUSIV în română. Orice cuvânt englezesc detectat = test eșuat.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            onClick={runLanguageTest}
            disabled={langTestRunning}
            size="lg"
            variant="outline"
            className="w-full border-amber-500/40 hover:bg-amber-500/10"
          >
            {langTestRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />}
            {langTestRunning ? "Rulez 6 scenarii..." : "🧪 Verifică limba română (fără să sune)"}
          </Button>
          {langTestResult && (
            <Button
              onClick={() => setLangTestOpen(true)}
              variant="ghost"
              size="sm"
              className="w-full"
            >
              Vezi detalii ({langTestResult.summary.pass_rate}% trecut, {langTestResult.summary.duration_ms} ms)
            </Button>
          )}
          <p className="text-xs text-muted-foreground">
            ✓ 6 scenarii (RO + capcane EN) &nbsp; ✓ Detector strict de engleză &nbsp; ✓ Violările se salvează în log
          </p>
        </CardContent>
      </Card>

      {/* FULL DIAGNOSTIC TEST */}
      <Card className="border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/40 to-transparent dark:from-emerald-950/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-emerald-600" />
            Test complet end-to-end
            {testSessionId && <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-500/40 animate-pulse">ÎN CURS</Badge>}
          </CardTitle>
          <CardDescription>
            Te sună ACUM cu un script scurt în română. Audio-ul, transcriptul și durata se salvează automat. Dialogul cu rezultatul se deschide singur la final.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Numărul tău (E.164)</label>
            <Input
              value={testNumber}
              onChange={(e) => setTestNumber(e.target.value)}
              placeholder="+40712345678"
              disabled={runningTest || !!testSessionId}
            />
          </div>
          <Button
            onClick={runFullTest}
            disabled={runningTest || !!testSessionId}
            size="lg"
            variant="premium"
            className="w-full"
          >
            {runningTest || testSessionId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            {testSessionId ? "Aștept finalizarea apelului..." : "🧪 Rulează Test Complet (mă sună acum)"}
          </Button>
          <p className="text-xs text-muted-foreground">
            ✓ Forțează ElevenLabs RO &nbsp; ✓ Recording activ &nbsp; ✓ Status callback &nbsp; ✓ Auto-deschide rezultat
          </p>
          {reportPolling && <p className="text-xs text-primary">Se așteaptă automat raportul complet, transcriptul și audio-ul…</p>}
        </CardContent>
      </Card>

      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" />
            AI Voice Agent — Outbound Call
          </CardTitle>
          <CardDescription>
            Sună automat un lead. Andrei (AI) califică interesul, programează vizionări și salvează transcript-ul.
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
              placeholder="Suprascrie prompt-ul implicit al asistentului Andrei..."
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
                        {c.detected_language === "en" && <Badge className="bg-red-100 text-red-800 border border-red-300">⚠️ EN detectat</Badge>}
                        {c.detected_language === "ro" && <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300">🇷🇴 RO ✓</Badge>}
                        {(c.language_retry_count || 0) > 0 && <Badge variant="outline" className="text-xs">↻ retry RO trimis</Badge>}
                        {c.language_retry_of && <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs">🔁 retry pentru apel anterior</Badge>}
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      disabled={runningTest}
                      onClick={(e) => { e.stopPropagation(); replayTest(c); }}
                    >
                      🔁 Reia test
                    </Button>
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
              <div className="flex items-center justify-between gap-2 pb-2 border-b">
                <div className="text-xs text-muted-foreground">Pași monitorizați live</div>
                <Button size="sm" variant="default" disabled={runningTest} onClick={() => replayTest(selectedCall)}>
                  🔁 Reia test pe acest număr
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {computeSteps(selectedCall).map((s, i) => {
                  const color =
                    s.state === "ok" ? "border-emerald-300 bg-emerald-50 text-emerald-900" :
                    s.state === "err" ? "border-red-300 bg-red-50 text-red-900" :
                    s.state === "warn" ? "border-amber-300 bg-amber-50 text-amber-900" :
                    "border-muted bg-muted/40 text-muted-foreground animate-pulse";
                  const icon =
                    s.state === "ok" ? "✅" : s.state === "err" ? "❌" : s.state === "warn" ? "⚠️" : "⏳";
                  return (
                    <div key={i} className={`rounded-lg border p-2 text-xs ${color}`}>
                      <div className="font-semibold flex items-center gap-1">{icon} {s.label}</div>
                      <div className="text-[11px] mt-0.5 break-words opacity-90">{s.detail}</div>
                    </div>
                  );
                })}
              </div>
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
                            <div className="text-xs opacity-70 mb-0.5">{t.role === "user" ? "Client" : "Andrei (AI)"}</div>
                            {t.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <details className="border rounded-lg" open>
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium bg-muted/40 rounded-lg">
                  🔬 Debug log detaliat ({(selectedCall.debug_log || []).length} evenimente)
                </summary>
                <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                  {(selectedCall.debug_log || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">Niciun log încă. Logurile apar pe măsură ce apelul se desfășoară (system prompt, răspuns AI brut, URL audio Twilio, motiv lipsă raport).</p>
                  ) : (
                    (selectedCall.debug_log || []).map((entry: any, i: number) => (
                      <div key={i} className="border rounded p-2 bg-card">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-mono font-semibold text-primary">{entry.stage || "log"}</span>
                          <span className="text-[10px] text-muted-foreground">{entry.at ? new Date(entry.at).toLocaleTimeString("ro-RO") : ""}</span>
                        </div>
                        {entry.aiReply && (
                          <div className="text-xs mb-1"><strong>AI reply:</strong> <span className="text-foreground">{entry.aiReply}</span></div>
                        )}
                        {entry.aiRawReply && entry.aiRawReply !== entry.aiReply && (
                          <div className="text-xs mb-1"><strong>AI raw:</strong> <span className="text-muted-foreground italic">{entry.aiRawReply}</span></div>
                        )}
                        {entry.userSpeech && (
                          <div className="text-xs mb-1"><strong>User a spus:</strong> {entry.userSpeech}</div>
                        )}
                        {entry.audioUrl && (
                          <div className="text-xs mb-1 break-all"><strong>Audio URL Twilio:</strong> <a href={entry.audioUrl} target="_blank" rel="noreferrer" className="text-primary underline">{entry.audioUrl.slice(0, 90)}…</a></div>
                        )}
                        {entry.ttsError && (
                          <div className="text-xs mb-1 text-destructive"><strong>TTS error:</strong> {entry.ttsError}</div>
                        )}
                        {entry.aiError && (
                          <div className="text-xs mb-1 text-destructive"><strong>AI error:</strong> {entry.aiError}</div>
                        )}
                        {entry.reportSkipReason && (
                          <div className="text-xs mb-1 text-amber-600"><strong>Raport sărit:</strong> {entry.reportSkipReason}</div>
                        )}
                        {entry.systemPromptPreview && (
                          <details className="mt-1">
                            <summary className="text-[11px] cursor-pointer text-muted-foreground">System prompt preview</summary>
                            <pre className="text-[10px] mt-1 whitespace-pre-wrap bg-muted/50 p-2 rounded">{entry.systemPromptPreview}</pre>
                          </details>
                        )}
                        <details className="mt-1">
                          <summary className="text-[11px] cursor-pointer text-muted-foreground">JSON complet</summary>
                          <pre className="text-[10px] mt-1 whitespace-pre-wrap bg-muted/50 p-2 rounded">{JSON.stringify(entry, null, 2)}</pre>
                        </details>
                      </div>
                    ))
                  )}
                </div>
              </details>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Language Test Result Dialog */}
      <Dialog open={langTestOpen} onOpenChange={setLangTestOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Rezultat Test Limbă Română
              {langTestResult && (
                <Badge
                  className={
                    langTestResult.summary.verdict === "PASS"
                      ? "bg-green-500/15 text-green-700 border border-green-500/40"
                      : langTestResult.summary.verdict === "WARN"
                      ? "bg-amber-500/15 text-amber-700 border border-amber-500/40"
                      : "bg-red-500/15 text-red-700 border border-red-500/40"
                  }
                >
                  {langTestResult.summary.verdict}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {langTestResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold text-green-600">{langTestResult.summary.passed}</div>
                  <div className="text-xs text-muted-foreground">Trecute</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold text-red-600">{langTestResult.summary.failed}</div>
                  <div className="text-xs text-muted-foreground">Eșuate</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-2xl font-bold">{langTestResult.summary.pass_rate}%</div>
                  <div className="text-xs text-muted-foreground">Rată succes</div>
                </div>
              </div>

              <div className="space-y-2">
                {langTestResult.results.map((r) => (
                  <div
                    key={r.scenario_id}
                    className={`rounded-lg border p-3 ${
                      r.passed ? "border-green-500/30 bg-green-500/5" : "border-red-500/40 bg-red-500/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{r.scenario_id}</Badge>
                        <span className={`text-sm font-semibold ${r.passed ? "text-green-700" : "text-red-700"}`}>
                          {r.passed ? "✅ RO păstrată" : "❌ ENGLEZĂ DETECTATĂ"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">{r.duration_ms} ms</span>
                    </div>
                    <div className="text-xs space-y-1.5">
                      <div>
                        <span className="font-semibold text-muted-foreground">Întrebare:</span>{" "}
                        <span className="italic">{r.user_message}</span>
                      </div>
                      <div>
                        <span className="font-semibold text-muted-foreground">Răspuns AI:</span>{" "}
                        <span>{r.ai_reply || <em className="text-red-600">— niciun răspuns ({r.ai_error})</em>}</span>
                      </div>
                      {r.english_words_detected.length > 0 && (
                        <div className="text-red-700">
                          <span className="font-semibold">Cuvinte engleză blocate:</span>{" "}
                          {r.english_words_detected.map((w) => (
                            <code key={w} className="mx-0.5 px-1 rounded bg-red-500/15">{w}</code>
                          ))}
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        Diacritice: {r.has_diacritics ? "✓" : "—"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground border-t pt-3">
                Testat la {new Date(langTestResult.summary.tested_at).toLocaleString("ro-RO")} •
                Durată totală {langTestResult.summary.duration_ms} ms •
                Violările eșuate sunt înregistrate automat în <code>voice_agent_language_violations</code>.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

