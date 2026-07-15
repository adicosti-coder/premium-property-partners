import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeChannel } from "@/hooks/admin/useRealtimeChannel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Activity, AlertCircle, BookOpen, CheckCircle2, Loader2, PhoneCall, Plus, Trash2, Zap } from "lucide-react";

interface TtsError {
  id: string;
  source: string;
  error_type: string;
  http_status: number | null;
  message: string | null;
  text_snippet: string | null;
  voice_id: string | null;
  latency_ms: number | null;
  created_at: string;
}

interface ClarityLog {
  id: string;
  session_id: string | null;
  clarity_score: number;
  tts_latency_ms_avg: number | null;
  tts_errors_count: number;
  twilio_call_status: string | null;
  fallback_used: boolean;
  created_at: string;
}

interface LexiconRow {
  id: string;
  original: string;
  phonetic: string;
  case_sensitive: boolean;
  is_active: boolean;
  notes: string | null;
}

interface E2EResult {
  summary?: { mode: string; verdict: string; checks_total: number; checks_passed: number; tts_latency_ms: number; tested_at: string };
  checks?: Array<{ name: string; passed: boolean; details?: any }>;
  error?: string;
  success?: boolean;
  sessionId?: string;
  callSid?: string;
}

export default function VoiceAgentMonitoring() {
  const [tab, setTab] = useState("debug");

  // Debug live
  const [errors, setErrors] = useState<TtsError[]>([]);
  const [clarity, setClarity] = useState<ClarityLog[]>([]);

  // Lexicon
  const [lexicon, setLexicon] = useState<LexiconRow[]>([]);
  const [newOriginal, setNewOriginal] = useState("");
  const [newPhonetic, setNewPhonetic] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newCaseSensitive, setNewCaseSensitive] = useState(false);
  const [savingLex, setSavingLex] = useState(false);

  // E2E
  const [e2eRunning, setE2eRunning] = useState(false);
  const [e2eResult, setE2eResult] = useState<E2EResult | null>(null);
  const [e2eText, setE2eText] = useState("Bună ziua, sunt Andrei de la RealTrust Timișoara. Am un apartament în Iosefin, în Cetate, și unul în Dumbrăvița — la ApArt Hotel.");
  const [realCallNumber, setRealCallNumber] = useState(() => localStorage.getItem("voice_e2e_number") || "+40");
  const [realCallRunning, setRealCallRunning] = useState(false);

  const loadLexicon = useCallback(async () => {
    const { data } = await supabase
      .from("voice_pronunciation_lexicon")
      .select("id, original, phonetic, case_sensitive, is_active, notes")
      .order("original", { ascending: true });
    setLexicon((data as LexiconRow[]) || []);
  }, []);

  const loadInitial = useCallback(async () => {
    const [errRes, clarityRes] = await Promise.all([
      supabase.from("voice_agent_tts_errors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("voice_agent_clarity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setErrors((errRes.data as TtsError[]) || []);
    setClarity((clarityRes.data as ClarityLog[]) || []);
  }, []);

  useEffect(() => {
    loadInitial();
    loadLexicon();

    // Realtime subscriptions
    const errChannel = supabase
      .channel("rt-tts-errors")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "voice_agent_tts_errors" }, (payload) => {
        setErrors((prev) => [payload.new as TtsError, ...prev].slice(0, 50));
        toast({
          variant: "destructive",
          title: "🔴 Eroare TTS premium",
          description: `${(payload.new as TtsError).error_type} — ${(payload.new as TtsError).message?.slice(0, 80) || "fără detalii"}`,
        });
      })
      .subscribe();

    const clarityChannel = supabase
      .channel("rt-clarity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "voice_agent_clarity_logs" }, (payload) => {
        setClarity((prev) => [payload.new as ClarityLog, ...prev].slice(0, 30));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(errChannel);
      supabase.removeChannel(clarityChannel);
    };
  }, [loadInitial, loadLexicon]);

  const addLexiconEntry = async () => {
    if (!newOriginal.trim() || !newPhonetic.trim()) {
      toast({ variant: "destructive", title: "Câmpuri lipsă", description: "Cuvântul și pronunția sunt obligatorii." });
      return;
    }
    setSavingLex(true);
    const { error } = await supabase.from("voice_pronunciation_lexicon").insert({
      original: newOriginal.trim(),
      phonetic: newPhonetic.trim(),
      case_sensitive: newCaseSensitive,
      notes: newNotes.trim() || null,
      is_active: true,
    });
    setSavingLex(false);
    if (error) {
      toast({ variant: "destructive", title: "Eroare", description: error.message });
      return;
    }
    setNewOriginal(""); setNewPhonetic(""); setNewNotes(""); setNewCaseSensitive(false);
    toast({ title: "Adăugat", description: "Intrare nouă în lexicon." });
    loadLexicon();
  };

  const toggleLexicon = async (row: LexiconRow) => {
    await supabase.from("voice_pronunciation_lexicon").update({ is_active: !row.is_active }).eq("id", row.id);
    loadLexicon();
  };

  const deleteLexicon = async (id: string) => {
    if (!confirm("Ștergi această intrare din lexicon?")) return;
    await supabase.from("voice_pronunciation_lexicon").delete().eq("id", id);
    loadLexicon();
  };

  const runE2ESimulate = async () => {
    setE2eRunning(true);
    setE2eResult(null);
    const { data, error } = await supabase.functions.invoke("voice-agent-e2e-test", {
      body: { mode: "simulate", text: e2eText },
    });
    setE2eRunning(false);
    if (error) {
      toast({ variant: "destructive", title: "Eroare E2E", description: error.message });
      return;
    }
    setE2eResult(data as E2EResult);
    const verdict = (data as E2EResult)?.summary?.verdict;
    toast({
      title: verdict === "PASS" ? "✅ E2E PASS" : "❌ E2E FAIL",
      description: `Latency: ${(data as E2EResult)?.summary?.tts_latency_ms || "?"}ms`,
      variant: verdict === "PASS" ? "default" : "destructive",
    });
  };

  const runE2ERealCall = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(realCallNumber)) {
      toast({ variant: "destructive", title: "Număr invalid", description: "Format E.164 (ex: +40712345678)" });
      return;
    }
    localStorage.setItem("voice_e2e_number", realCallNumber);
    setRealCallRunning(true);
    setE2eResult(null);
    const { data, error } = await supabase.functions.invoke("voice-agent-e2e-test", {
      body: { mode: "real_call", toNumber: realCallNumber },
    });
    setRealCallRunning(false);
    if (error) {
      toast({ variant: "destructive", title: "Apel eșuat", description: error.message });
      return;
    }
    setE2eResult(data as E2EResult);
    toast({ title: "📞 Apel inițiat", description: `Session: ${(data as E2EResult)?.sessionId?.slice(0, 8) || "?"}` });
  };

  const avgClarity = clarity.length
    ? Math.round(clarity.reduce((a, c) => a + c.clarity_score, 0) / clarity.length)
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Monitorizare Voice Agent (Andrei)
        </CardTitle>
        <CardDescription>
          Debug live (realtime), testare E2E și dicționar de pronunție românească.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="debug">
              <Zap className="h-4 w-4 mr-1" />
              Debug Live
              {errors.length > 0 && <Badge variant="destructive" className="ml-2">{errors.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="e2e">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Test E2E
            </TabsTrigger>
            <TabsTrigger value="lexicon">
              <BookOpen className="h-4 w-4 mr-1" />
              Pronunție RO
              <Badge variant="secondary" className="ml-2">{lexicon.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* DEBUG LIVE */}
          <TabsContent value="debug" className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-3">
              <Card><CardContent className="pt-4">
                <div className="text-xs text-muted-foreground">Erori TTS (ult. 50)</div>
                <div className="text-2xl font-bold">{errors.length}</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <div className="text-xs text-muted-foreground">Apeluri loggate</div>
                <div className="text-2xl font-bold">{clarity.length}</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4">
                <div className="text-xs text-muted-foreground">Claritate medie</div>
                <div className="text-2xl font-bold">{avgClarity !== null ? `${avgClarity}/100` : "—"}</div>
              </CardContent></Card>
            </div>

            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-destructive" /> Stream erori TTS (realtime)
              </h4>
              <div className="border rounded max-h-72 overflow-auto divide-y">
                {errors.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Nicio eroare TTS recentă. ✅</div>
                ) : (
                  errors.map((e) => (
                    <div key={e.id} className="p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">{e.error_type}</Badge>
                        {e.http_status && <Badge variant="outline">HTTP {e.http_status}</Badge>}
                        {e.latency_ms !== null && <span className="text-muted-foreground">{e.latency_ms}ms</span>}
                        <span className="ml-auto text-muted-foreground">{new Date(e.created_at).toLocaleTimeString("ro-RO")}</span>
                      </div>
                      {e.message && <div className="mt-1 text-foreground/80 line-clamp-2">{e.message}</div>}
                      {e.text_snippet && <div className="mt-1 text-muted-foreground italic">„{e.text_snippet.slice(0, 120)}…"</div>}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Scor claritate per apel</h4>
              <div className="border rounded max-h-60 overflow-auto divide-y">
                {clarity.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">Niciun log de claritate încă.</div>
                ) : (
                  clarity.map((c) => (
                    <div key={c.id} className="p-2 text-xs flex items-center gap-2">
                      <Badge variant={c.clarity_score >= 80 ? "default" : c.clarity_score >= 50 ? "secondary" : "destructive"}>
                        {c.clarity_score}/100
                      </Badge>
                      {c.twilio_call_status && <span className="text-muted-foreground">{c.twilio_call_status}</span>}
                      {c.tts_latency_ms_avg !== null && <span className="text-muted-foreground">avg {c.tts_latency_ms_avg}ms</span>}
                      {c.tts_errors_count > 0 && <Badge variant="destructive">{c.tts_errors_count} err TTS</Badge>}
                      {c.fallback_used && <Badge variant="outline">fallback Polly</Badge>}
                      <span className="ml-auto text-muted-foreground">{new Date(c.created_at).toLocaleTimeString("ro-RO")}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* E2E */}
          <TabsContent value="e2e" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Simulare internă (gratis, fără apel)</CardTitle>
                <CardDescription>Validează TwiML, latency ElevenLabs &lt;2s, lexicon, &lt;Play&gt;.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea value={e2eText} onChange={(e) => setE2eText(e.target.value)} rows={2} />
                <Button onClick={runE2ESimulate} disabled={e2eRunning} className="w-full">
                  {e2eRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Rulează test E2E (simulare)
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Apel real Twilio (consumă credit)</CardTitle>
                <CardDescription>Sună un număr de test pentru validare end-to-end completă.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input value={realCallNumber} onChange={(e) => setRealCallNumber(e.target.value)} placeholder="+40712345678" />
                <Button onClick={runE2ERealCall} disabled={realCallRunning} variant="secondary" className="w-full">
                  {realCallRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PhoneCall className="h-4 w-4 mr-2" />}
                  Sună acum (test real)
                </Button>
              </CardContent>
            </Card>

            {e2eResult && (
              <div className="border rounded p-3 space-y-2">
                {e2eResult.summary && (
                  <div className="flex items-center gap-2">
                    <Badge variant={e2eResult.summary.verdict === "PASS" ? "default" : "destructive"}>
                      {e2eResult.summary.verdict}
                    </Badge>
                    <span className="text-sm">
                      {e2eResult.summary.checks_passed}/{e2eResult.summary.checks_total} checks
                    </span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      TTS latency: {e2eResult.summary.tts_latency_ms}ms
                    </span>
                  </div>
                )}
                {e2eResult.checks?.map((c) => (
                  <div key={c.name} className="text-xs flex items-start gap-2">
                    {c.passed ? <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5" /> : <AlertCircle className="h-3 w-3 text-destructive mt-0.5" />}
                    <div>
                      <div className="font-medium">{c.name}</div>
                      {c.details && <pre className="text-muted-foreground whitespace-pre-wrap break-all">{JSON.stringify(c.details, null, 2).slice(0, 400)}</pre>}
                    </div>
                  </div>
                ))}
                {e2eResult.sessionId && (
                  <div className="text-xs text-muted-foreground">Session ID: {e2eResult.sessionId}</div>
                )}
              </div>
            )}
          </TabsContent>

          {/* LEXICON */}
          <TabsContent value="lexicon" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Adaugă intrare nouă</CardTitle>
                <CardDescription>Cuvântul original → înlocuirea fonetică aplicată automat înainte de TTS.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Input value={newOriginal} onChange={(e) => setNewOriginal(e.target.value)} placeholder="Original (ex: Iosefin)" />
                <Input value={newPhonetic} onChange={(e) => setNewPhonetic(e.target.value)} placeholder="Fonetic (ex: Yosefin)" />
                <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Notițe (opțional)" className="md:col-span-2" />
                <div className="flex items-center gap-2">
                  <Switch checked={newCaseSensitive} onCheckedChange={setNewCaseSensitive} />
                  <span className="text-xs">Case sensitive (ex: ApArt)</span>
                </div>
                <Button onClick={addLexiconEntry} disabled={savingLex}>
                  {savingLex ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Adaugă
                </Button>
              </CardContent>
            </Card>

            <div className="border rounded divide-y">
              {lexicon.map((row) => (
                <div key={row.id} className="p-2 flex items-center gap-2 text-sm">
                  <Switch checked={row.is_active} onCheckedChange={() => toggleLexicon(row)} />
                  <span className="font-mono font-medium">{row.original}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono">{row.phonetic}</span>
                  {row.case_sensitive && <Badge variant="outline" className="text-xs">CS</Badge>}
                  {row.notes && <span className="text-xs text-muted-foreground italic ml-2 truncate">{row.notes}</span>}
                  <Button size="sm" variant="ghost" onClick={() => deleteLexicon(row.id)} className="ml-auto">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
