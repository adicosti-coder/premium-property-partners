import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  AlertTriangle, PhoneCall, Lightbulb, Loader2, ShieldCheck, Play, RefreshCw,
  Radio, Zap, FileText, CheckCircle2, RotateCcw, Download, Send, BarChart3, Info,
  History, FileDown, Megaphone,
} from "lucide-react";
import VoiceAgentSmartClusters from "./VoiceAgentSmartClusters";

interface DraftEdit { at: string; before: string; after: string; }

type FeedFilter = "all" | "scheduled" | "failed";

const KNOWN_OBJECTIONS = [
  "preț prea mare", "comision", "deja contractat cu altcineva", "vrea să vândă",
  "nu vrea regim hotelier", "nu răspunde clar", "nu are timp", "nu este proprietar",
  "vrea doar long-term", "neîncredere", "vrea bani cash", "deja listat",
];

function extractSentimentScore(c: { ai_sentiment: string | null; ai_summary: string | null }): number | null {
  const blob = `${c.ai_sentiment || ""} ${c.ai_summary || ""}`;
  const m = blob.match(/(\d{1,2})\s*\/\s*10/);
  if (m) { const n = parseInt(m[1], 10); if (n >= 0 && n <= 10) return n; }
  const lower = blob.toLowerCase();
  if (/very\s+positive|foarte\s+pozitiv|entuziast/.test(lower)) return 9;
  if (/positive|pozitiv|interesat/.test(lower)) return 7;
  if (/neutral/.test(lower)) return 5;
  if (/negative|negativ|refuz|sceptic/.test(lower)) return 3;
  if (/very\s+negative|foarte\s+negativ|ostil/.test(lower)) return 1;
  return null;
}
function extractMainObjection(c: { ai_summary: string | null; ai_sentiment: string | null; transcript: any }): string | null {
  const blob = `${c.ai_summary || ""} ${c.ai_sentiment || ""} ${typeof c.transcript === "string" ? c.transcript : JSON.stringify(c.transcript || "")}`.toLowerCase();
  for (const k of KNOWN_OBJECTIONS) if (blob.includes(k)) return k;
  return null;
}
function draftToText(d: any): string {
  if (!d) return "";
  if (typeof d === "string") return d;
  return d.message || d.text || d.body || JSON.stringify(d, null, 2);
}

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
interface Lesson { id: string; lesson: string; is_active: boolean; severity: string; created_at: string; }
interface SafetyState { calls_paused: boolean; paused_reason: string | null; success_rate_pct: number | null; sample_size: number | null; last_check_at: string | null; }
interface LiveCall {
  id: string;
  to_number: string;
  status: string;
  ai_outcome: string | null;
  ai_sentiment: string | null;
  ai_summary: string | null;
  appointment_scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  call_duration_seconds: number | null;
  prospect_listing_id: string | null;
  error_message: string | null;
  followup_draft: any;
  followup_status: string | null;
  transcript: any;
  updated_at: string;
}
interface TestLog {
  id: string; status: string; outcome: string | null; fallback_reason: string | null;
  call_duration_seconds: number | null; transcript_turns: number | null;
  script_name: string | null; script_version: number | null; ab_variant: string | null;
  to_number: string | null; created_at: string; updated_at: string;
}
interface DetailSession extends LiveCall {
  created_at: string;
  twilio_call_sid: string | null;
  next_action: string | null;
  recording_url: string | null;
  detected_language: string | null;
  clarity_score: number | null;
  debug_log: any;
}

const TOP3_PHONES = ["+40729785285", "+40723321076", "+40743010969"];
const FINAL_STATUSES = ["completed", "failed", "busy", "no-answer", "canceled"];
const TECH_FAIL_STATUSES = ["failed", "busy", "no-answer", "canceled"];
const ACTIVE_STATUSES = ["queued", "initiating", "initiated", "ringing", "in-progress", "in_progress", "completing"];
const STALE_SESSION_MS = 5 * 60 * 1000;

function getCallReferenceTime(call: Pick<LiveCall, "updated_at" | "ended_at" | "started_at">): number {
  const ref = call.updated_at || call.ended_at || call.started_at;
  return ref ? new Date(ref).getTime() : 0;
}

function isStaleCall(call: Pick<LiveCall, "status" | "updated_at" | "ended_at" | "started_at">): boolean {
  return ACTIVE_STATUSES.includes(call.status) && Date.now() - getCallReferenceTime(call) > STALE_SESSION_MS;
}

function isCallEffectivelyDone(call: Pick<LiveCall, "status" | "updated_at" | "ended_at" | "started_at">): boolean {
  return FINAL_STATUSES.includes(call.status) || isStaleCall(call);
}

function isAutoResetFailure(call: Pick<LiveCall, "status" | "error_message">): boolean {
  return call.status === "failed" && /auto-reset|reset manual|status intermediar blocat/i.test(call.error_message || "");
}

const STATUS_LABEL: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" }> = {
  queued: { label: "În coadă", tone: "outline" },
  initiated: { label: "Sună…", tone: "secondary" },
  ringing: { label: "Sună…", tone: "secondary" },
  "in-progress": { label: "În conversație…", tone: "default" },
  in_progress: { label: "În conversație…", tone: "default" },
  completed: { label: "Analiză post-apel…", tone: "secondary" },
  failed: { label: "Eșuat", tone: "destructive" },
  busy: { label: "Ocupat", tone: "destructive" },
  "no-answer": { label: "Fără răspuns", tone: "destructive" },
  canceled: { label: "Anulat", tone: "outline" },
};

export default function VoiceAgentBatchCalling() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [safety, setSafety] = useState<SafetyState | null>(null);
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);
  const [detailLog, setDetailLog] = useState<TestLog | null>(null);
  const [detailSession, setDetailSession] = useState<DetailSession | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scheduledNotified, setScheduledNotified] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Batch report
  const [batchSessionIds, setBatchSessionIds] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportData, setReportData] = useState<{
    total: number; scheduled: number; conversion: number; objections: string[]; calls: LiveCall[];
  } | null>(null);
  const [approvingFollowup, setApprovingFollowup] = useState(false);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>("all");
  const [editedDrafts, setEditedDrafts] = useState<Record<string, string>>({});
  const [approvedDrafts, setApprovedDrafts] = useState<Set<string>>(new Set());
  const [draftHistory, setDraftHistory] = useState<Record<string, DraftEdit[]>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [persistHistory, setPersistHistory] = useState(true);
  const [confirmChecks, setConfirmChecks] = useState<{ preview: boolean; tone: boolean; history: boolean }>({
    preview: false, tone: false, history: false,
  });
  const editTimers = useRef<Record<string, any>>({});
  const reportShownRef = useRef(false);

  const loadAll = async () => {
    setLoading(true);
    await supabase.from("voice_call_sessions")
      .update({
        status: "failed",
        ended_at: new Date().toISOString(),
        error_message: "Auto-reset: status intermediar blocat peste 5 minute",
      })
      .in("status", ACTIVE_STATUSES)
      .lt("updated_at", new Date(Date.now() - STALE_SESSION_MS).toISOString());
    await supabase.from("prospect_listings")
      .update({
        lifecycle_status: "new",
        auto_call_triggered_at: null,
        voice_call_session_id: null,
        last_failure_reason: "auto_reset_stale_voice_session",
      })
      .eq("lifecycle_status", "calling")
      .lt("auto_call_triggered_at", new Date(Date.now() - STALE_SESSION_MS).toISOString());
    const [pRes, lRes, sRes, cRes] = await Promise.all([
      supabase.from("prospect_listings")
        .select("id, title, zone, phone_normalized, contact_phone, lead_score, lifecycle_status, category")
        .eq("is_active", true).eq("prospect_type", "proprietar").eq("lifecycle_status", "new")
        .not("phone_normalized", "is", null)
        .order("lead_score", { ascending: false, nullsFirst: false }).limit(30),
      supabase.from("voice_agent_playbook_addendum")
        .select("id, lesson, is_active, severity, created_at")
        .order("created_at", { ascending: false }).limit(20),
      supabase.from("voice_agent_safety_state")
        .select("calls_paused, paused_reason, success_rate_pct, sample_size, last_check_at")
        .eq("id", true).maybeSingle(),
      supabase.from("voice_call_sessions")
        .select("id, to_number, status, ai_outcome, ai_sentiment, ai_summary, appointment_scheduled_at, started_at, ended_at, call_duration_seconds, prospect_listing_id, error_message, followup_draft, followup_status, transcript, updated_at")
        .order("created_at", { ascending: false }).limit(15),
    ]);
    setProspects((pRes.data as Prospect[]) || []);
    setLessons((lRes.data as Lesson[]) || []);
    setSafety((sRes.data as SafetyState) || null);
    setLiveCalls((cRes.data as LiveCall[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("batch-live-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_call_sessions" }, (payload) => {
        const row = payload.new as LiveCall;
        if (!row?.id) return;
        setLiveCalls((prev) => {
          const idx = prev.findIndex((c) => c.id === row.id);
          const next = [...prev];
          if (idx >= 0) next[idx] = { ...next[idx], ...row };
          else next.unshift(row);
          return next.slice(0, 20);
        });
        const isScheduled = row.ai_outcome === "scheduled" || !!row.appointment_scheduled_at;
        if (isScheduled && !scheduledNotified.has(row.id)) {
          setScheduledNotified((s) => new Set(s).add(row.id));
          toast({
            title: "✅ Întâlnire programată!",
            description: `${row.to_number} — Gemini a marcat apelul ca SCHEDULED.`,
            className: "bg-emerald-600 text-white border-emerald-700",
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [scheduledNotified]);

  // Auto-open final batch report when all batch sessions reached final status
  useEffect(() => {
    if (batchSessionIds.length === 0 || reportShownRef.current) return;
    const tracked = liveCalls.filter((c) => batchSessionIds.includes(c.id));
    if (tracked.length < batchSessionIds.length) return;
    const allFinal = tracked.every((c) => FINAL_STATUSES.includes(c.status));
    if (!allFinal) return;
    reportShownRef.current = true;
    buildReport(tracked);
  }, [liveCalls, batchSessionIds]);

  const buildReport = (tracked: LiveCall[]) => {
    const total = tracked.length;
    const scheduled = tracked.filter((c) => c.ai_outcome === "scheduled" || !!c.appointment_scheduled_at).length;
    const conversion = total > 0 ? Math.round((scheduled / total) * 100) : 0;
    // Top 3 obiecții — extras din ai_summary / next_action / transcript
    const counter = new Map<string, number>();
    const KNOWN = [
      "preț prea mare", "comision", "deja contractat cu altcineva", "vrea să vândă",
      "nu vrea regim hotelier", "nu răspunde clar", "nu are timp", "nu este proprietar",
      "vrea doar long-term", "neîncredere", "vrea bani cash", "deja listat",
    ];
    tracked.forEach((c) => {
      const blob = `${c.ai_summary || ""} ${c.ai_sentiment || ""} ${JSON.stringify(c.transcript || "")}`.toLowerCase();
      KNOWN.forEach((k) => { if (blob.includes(k)) counter.set(k, (counter.get(k) || 0) + 1); });
    });
    const objections = Array.from(counter.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (×${v})`);
    // Pre-fill editable drafts
    const drafts: Record<string, string> = {};
    const auto: string[] = [];
    tracked.forEach((c) => {
      if (c.followup_draft) {
        drafts[c.id] = draftToText(c.followup_draft);
        auto.push(c.id);
      }
    });
    setEditedDrafts(drafts);
    setApprovedDrafts(new Set(auto));
    setReportData({ total, scheduled, conversion, objections, calls: tracked });
    setReportOpen(true);
  };

  const toggleApproved = (id: string) => {
    setApprovedDrafts((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const handleDraftEdit = (id: string, value: string) => {
    const before = editedDrafts[id] ?? "";
    setEditedDrafts((d) => ({ ...d, [id]: value }));
    if (!persistHistory) return;
    if (editTimers.current[id]) clearTimeout(editTimers.current[id]);
    editTimers.current[id] = setTimeout(() => {
      if (before === value) return;
      setDraftHistory((h) => ({
        ...h,
        [id]: [...(h[id] || []), { at: new Date().toISOString(), before, after: value }],
      }));
    }, 800);
  };

  // Force-flush any pending edit history before final send
  const flushPendingHistory = () => {
    Object.keys(editTimers.current).forEach((id) => {
      if (editTimers.current[id]) {
        clearTimeout(editTimers.current[id]);
        editTimers.current[id] = null;
      }
    });
  };

  // Tone analysis — Concierge Imobiliar (analytic & polite)
  function analyzeTone(text: string): { score: number; issues: string[]; positives: string[] } {
    const issues: string[] = [];
    const positives: string[] = [];
    const t = (text || "").trim();
    if (!t) return { score: 0, issues: ["Mesaj gol"], positives: [] };
    const lower = t.toLowerCase();
    // Politeness
    if (/\b(bună ziua|bună seara|salutare|stimate|stimată|mulțumesc|vă mulțumesc|cu respect)\b/i.test(t)) positives.push("Formulă politicoasă");
    else issues.push("Lipsă formulă de salut/politețe");
    // Analytical signals
    if (/\d/.test(t)) positives.push("Conține cifre / date concrete");
    else issues.push("Fără cifre sau date concrete");
    if (/\b(roi|randament|venit|ocupare|management|regim hotelier|estimare|proiecție)\b/i.test(t)) positives.push("Vocabular analitic");
    // Forbidden / pushy tone
    if (/(!{2,}|🔥|💸|🤑|gratis acum|ofertă limitată|grăbește-te)/i.test(t)) issues.push("Ton agresiv / clickbait");
    if (/\bCUMPĂRĂ\b|\bSUNĂ ACUM\b/.test(t)) issues.push("Capslock imperativ — evită");
    // Brand
    if (/\brealtrust\b/i.test(lower)) positives.push("Menționează RealTrust");
    // Length
    if (t.length < 60) issues.push("Prea scurt (<60 caractere)");
    if (t.length > 900) issues.push("Prea lung (>900 caractere)");
    // First-person plural ("noi") suggests concierge tone
    if (/\b(noi|echipa|vă putem|vă propunem|vă invităm)\b/i.test(t)) positives.push("Ton 'concierge' (noi/echipa)");
    const score = Math.max(0, Math.min(10, 6 + positives.length - issues.length * 1.5));
    return { score: Math.round(score * 10) / 10, issues, positives };
  }

  const openConfirm = () => {
    flushPendingHistory();
    setConfirmChecks({ preview: false, tone: false, history: persistHistory });
    setConfirmOpen(true);
  };

  const exportApprovedDrafts = () => {
    if (!reportData) return;
    const items = reportData.calls
      .filter((c) => approvedDrafts.has(c.id))
      .map((c) => ({
        session_id: c.id,
        to_number: c.to_number,
        outcome: c.ai_outcome,
        sentiment: c.ai_sentiment,
        message: editedDrafts[c.id] ?? draftToText(c.followup_draft),
        edited: (editedDrafts[c.id] ?? "") !== draftToText(c.followup_draft),
        wa_link: `https://wa.me/${(c.to_number || "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(editedDrafts[c.id] ?? draftToText(c.followup_draft))}`,
      }));
    if (items.length === 0) {
      toast({ variant: "destructive", title: "Niciun draft bifat" });
      return;
    }
    const json = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(json);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whatsapp-drafts-approved-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "📤 Exportat", description: `${items.length} draft-uri aprobate.` });
  };

  const toggleOne = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else if (n.size < 10) n.add(id);
    setSelected(n);
  };
  const selectTop10 = () => setSelected(new Set(prospects.slice(0, 10).map((p) => p.id)));

  const [top3Available, setTop3Available] = useState<Prospect[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("prospect_listings")
        .select("id, title, zone, phone_normalized, contact_phone, lead_score, lifecycle_status, category")
        .eq("is_active", true).in("phone_normalized", TOP3_PHONES)
        .order("lead_score", { ascending: false, nullsFirst: false });
      const byPhone = new Map<string, Prospect>();
      ((data as Prospect[]) || []).forEach((p) => {
        const phone = p.phone_normalized || p.contact_phone || p.id;
        if (!byPhone.has(phone)) byPhone.set(phone, p);
      });
      setTop3Available(TOP3_PHONES.map((phone) => byPhone.get(phone)).filter(Boolean) as Prospect[]);
    })();
  }, []);

  const startBatchWithIds = async (ids: string[]) => {
    if (ids.length === 0) {
      toast({ variant: "destructive", title: "Lead-uri lipsă", description: "Niciun prospect valid." });
      return;
    }
    setLaunching(true);
    reportShownRef.current = false;
    setBatchSessionIds([]);
    const { data, error } = await supabase.functions.invoke("voice-agent-bulk-campaign", {
      body: { prospect_ids: ids },
    });
    setLaunching(false);
    if (error || (data as any)?.error) {
      const reason = (data as any)?.reason || (data as any)?.error || error?.message || "Eroare necunoscută";
      toast({ variant: "destructive", title: "Batch oprit", description: reason });
      loadAll();
      return;
    }
    const payload = data as { session_ids?: string[]; sessions?: Array<{ id?: string; session_id?: string }>; results?: Array<{ id?: string; session_id?: string }> } | null;
    const sessionIds: string[] = [
      ...(payload?.session_ids || []),
      ...((payload?.sessions || []).map((s) => s.id || s.session_id).filter(Boolean) as string[]),
      ...((payload?.results || []).map((r) => r.session_id || r.id).filter(Boolean) as string[]),
    ];
    const skipped = (payload?.results || []).filter((r: any) => !r.session_id && !r.id).length;
    if (sessionIds.length > 0) setBatchSessionIds(sessionIds);
    toast({ title: "📞 Batch pornit", description: `${sessionIds.length || ids.length} apeluri în coadă${skipped ? ` · ${skipped} sărite` : ""}.` });
    setSelected(new Set());
    loadAll();
  };

  const startBatch = () => startBatchWithIds(Array.from(selected));
  const startTop3 = () => {
    if (top3Available.length === 0) {
      toast({ variant: "destructive", title: "Top 3 indisponibil", description: "Lead-urile validate nu apar în lista activă." });
      return;
    }
    startBatchWithIds(top3Available.map((p) => p.id));
  };

  const resumeCalls = async () => {
    await supabase.from("voice_agent_safety_state")
      .update({ calls_paused: false, paused_reason: null }).eq("id", true);
    toast({ title: "✅ Apeluri reluate" });
    loadAll();
  };

  const resetStaleBatch = async () => {
    const staleIds = liveCalls.filter(isStaleCall).map((c) => c.id);
    const staleProspectIds = liveCalls.filter(isStaleCall).map((c) => c.prospect_listing_id).filter(Boolean) as string[];
    if (staleIds.length > 0) {
      await supabase.from("voice_call_sessions").update({
        status: "failed",
        ended_at: new Date().toISOString(),
        error_message: "Reset manual: sesiune blocată în status intermediar",
      }).in("id", staleIds);
    }
    if (staleProspectIds.length > 0) {
      await supabase.from("prospect_listings").update({
        lifecycle_status: "new",
        auto_call_triggered_at: null,
        voice_call_session_id: null,
        last_failure_reason: "manual_reset_stale_voice_session",
      }).in("id", staleProspectIds);
    }
    setBatchSessionIds([]);
    reportShownRef.current = false;
    toast({ title: "🧹 Batch deblocat", description: `${staleIds.length} sesiuni blocate resetate. Poți porni din nou.` });
    loadAll();
  };

  const toggleLesson = async (l: Lesson) => {
    await supabase.from("voice_agent_playbook_addendum")
      .update({ is_active: !l.is_active }).eq("id", l.id);
    loadAll();
  };

  const openTechDetails = async (sessionId: string) => {
    setDetailLoading(true);
    setDetailLog(null);
    setDetailSession(null);
    const [logRes, sessionRes] = await Promise.all([
      supabase.from("voice_agent_script_test_logs")
      .select("id, status, outcome, fallback_reason, call_duration_seconds, transcript_turns, script_name, script_version, ab_variant, to_number, created_at, updated_at")
      .eq("session_id", sessionId).maybeSingle(),
      supabase.from("voice_call_sessions")
        .select("id, to_number, status, ai_outcome, ai_sentiment, ai_summary, next_action, appointment_scheduled_at, started_at, ended_at, call_duration_seconds, prospect_listing_id, error_message, followup_draft, followup_status, transcript, updated_at, created_at, twilio_call_sid, recording_url, detected_language, clarity_score, debug_log")
        .eq("id", sessionId).maybeSingle(),
    ]);
    setDetailLog((logRes.data as TestLog) || null);
    setDetailSession((sessionRes.data as DetailSession) || null);
    setDetailLoading(false);
  };

  const retryTechFail = async (call: LiveCall) => {
    if (!call.prospect_listing_id) {
      toast({ variant: "destructive", title: "Retry imposibil", description: "Lipsă prospect_listing_id." });
      return;
    }
    setRetrying(call.id);
    const { data, error } = await supabase.functions.invoke("voice-agent-bulk-campaign", {
      body: { prospect_ids: [call.prospect_listing_id], is_retry: true, retry_of_session_id: call.id },
    });
    setRetrying(null);
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Retry eșuat", description: (data as any)?.error || error?.message || "Eroare" });
      return;
    }
    toast({ title: "🔁 Re-apel pornit", description: `${call.to_number} — fără consum credit lead.` });
    loadAll();
  };

  const exportCSV = async () => {
    setExporting(true);
    const { data } = await supabase
      .from("voice_call_sessions")
      .select("id, to_number, status, ai_outcome, ai_sentiment, ai_summary, appointment_scheduled_at, call_duration_seconds, started_at, ended_at, error_message, transcript, followup_status, created_at")
      .order("created_at", { ascending: false }).limit(1000);
    const rows = (data as any[]) || [];
    const header = [
      "id","to_number","status","ai_outcome","ai_sentiment","scheduled_at",
      "duration_s","started_at","ended_at","error","followup_status","ai_summary","transcript_text","created_at",
    ];
    const esc = (v: any) => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "string" ? v : JSON.stringify(v);
      return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
    };
    const transcriptToText = (t: any) => {
      if (!t) return "";
      if (Array.isArray(t)) return t.map((turn: any) => `${turn.role || turn.speaker || "?"}: ${turn.text || turn.content || ""}`).join(" | ");
      return JSON.stringify(t);
    };
    const lines = [header.join(",")].concat(rows.map((r) => [
      r.id, r.to_number, r.status, r.ai_outcome, r.ai_sentiment, r.appointment_scheduled_at,
      r.call_duration_seconds, r.started_at, r.ended_at, r.error_message, r.followup_status,
      r.ai_summary, transcriptToText(r.transcript), r.created_at,
    ].map(esc).join(",")));
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `voice-calls-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
    toast({ title: "📥 CSV exportat", description: `${rows.length} apeluri.` });
  };

  const approveFollowups = async () => {
    if (!reportData) return;
    setApprovingFollowup(true);
    const drafts = reportData.calls
      .filter((c) => approvedDrafts.has(c.id))
      .map((c) => ({
        session_id: c.id,
        to_number: c.to_number,
        outcome: c.ai_outcome,
        draft: editedDrafts[c.id] ?? draftToText(c.followup_draft),
        original_draft: c.followup_draft,
        edited: (editedDrafts[c.id] ?? "") !== draftToText(c.followup_draft),
      }));
    if (drafts.length === 0) {
      setApprovingFollowup(false);
      toast({ variant: "destructive", title: "Bifează cel puțin un draft" });
      return;
    }
    const { error } = await supabase.functions.invoke("notify-new-lead-whatsapp", {
      body: { type: "batch_followup_review", drafts, batch_session_ids: batchSessionIds },
    });
    if (!error) {
      await supabase.from("voice_call_sessions")
        .update({ followup_status: "pending_review" })
        .in("id", drafts.map((d) => d.session_id));
    }
    setApprovingFollowup(false);
    if (error) {
      toast({ variant: "destructive", title: "Eroare follow-up", description: error.message });
    } else {
      toast({ title: "📲 Follow-up trimis spre review", description: `${drafts.length} draft-uri WhatsApp către admin.` });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PhoneCall className="h-5 w-5 text-primary" />
          Batch Calling — Lead-uri Reale
        </CardTitle>
        <CardDescription>
          Selectează până la 10 prospecte și pornește apelurile automate. Stop-Loss oprește campania sub 20% rată succes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <VoiceAgentSmartClusters onPickCluster={(ids, c) => {
          const next = new Set<string>();
          ids.slice(0, 10).forEach((id) => { if (prospects.find((p) => p.id === id)) next.add(id); });
          setSelected(next);
          toast({ title: `📌 Brief: ${c.label}`, description: c.brief, duration: 9000 });
        }} />
        {/* TOP 3 QUICK START */}
        <Alert className="border-primary/40 bg-primary/5">
          <Zap className="h-4 w-4 text-primary" />
          <AlertTitle>🚀 Pornire rapidă — Top 3 Timișoara (validate geo)</AlertTitle>
          <AlertDescription className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {TOP3_PHONES.join(" · ")} — {top3Available.length}/3 disponibili acum
            </div>
            {(() => {
              const tracked = batchSessionIds.length > 0 ? liveCalls.filter((c) => batchSessionIds.includes(c.id)) : [];
              const finished = tracked.filter(isCallEffectivelyDone).length;
              const total = batchSessionIds.length;
              const inFlight = total > 0 && finished < total;
              const pct = total > 0 ? Math.round((finished / total) * 100) : 0;
              return (
                <div className="flex gap-2 flex-wrap items-center">
                  {inFlight ? (
                    <>
                      <div className="flex-1 min-w-[220px] space-y-1">
                        <div className="flex justify-between text-[11px] font-medium">
                          <span className="text-primary">Batch în desfășurare…</span>
                          <span>{finished}/{total} Finalizate</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                      <Button size="sm" variant="ghost" onClick={resetStaleBatch}>
                        Resetează
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={startTop3} disabled={launching || safety?.calls_paused || top3Available.length === 0}>
                      {launching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                      Start Batch — Top 3 ({top3Available.length})
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={exportCSV} disabled={exporting}>
                    {exporting ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Download className="h-3 w-3 mr-1" />}
                    Export CSV audit
                  </Button>
                </div>
              );
            })()}
          </AlertDescription>
        </Alert>

        {/* SAFETY */}
        {safety?.calls_paused ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>⚠️ Apelurile sunt oprite</AlertTitle>
            <AlertDescription className="space-y-2">
              <div>{safety.paused_reason || "Rata de succes a scăzut sub 20%."}</div>
              <div className="text-xs text-muted-foreground">
                Rată: {safety.success_rate_pct ?? "—"}% / {safety.sample_size ?? 0} apeluri.
              </div>
              <Button size="sm" variant="outline" onClick={resumeCalls}>
                <ShieldCheck className="h-3 w-3 mr-1" /> Reluare manuală
              </Button>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <AlertTitle>Sistem activ</AlertTitle>
            <AlertDescription className="text-xs">
              Rată succes 24h: {safety?.success_rate_pct ?? "—"}% / {safety?.sample_size ?? 0} apeluri reale.
            </AlertDescription>
          </Alert>
        )}

        {/* LIVE FEED */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm flex items-center gap-1">
              <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
              Live Call Feed
              <Badge variant="secondary" className="ml-1">{liveCalls.length}</Badge>
              {batchSessionIds.length > 0 && (
                <Badge variant="outline" className="ml-1">Batch activ: {batchSessionIds.length}</Badge>
              )}
            </h4>
            <div className="flex gap-1 items-center">
              <ToggleGroup
                type="single"
                size="sm"
                value={feedFilter}
                onValueChange={(v) => v && setFeedFilter(v as FeedFilter)}
                className="h-7"
              >
                <ToggleGroupItem value="all" className="h-7 px-2 text-[10px]">Toate</ToggleGroupItem>
                <ToggleGroupItem value="scheduled" className="h-7 px-2 text-[10px]">Scheduled</ToggleGroupItem>
                <ToggleGroupItem value="failed" className="h-7 px-2 text-[10px]">Eșuate</ToggleGroupItem>
              </ToggleGroup>
              {batchSessionIds.length > 0 && reportData && (
                <Button size="sm" variant="ghost" onClick={() => setReportOpen(true)}>
                  <BarChart3 className="h-3 w-3 mr-1" /> Raport
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={loadAll}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="border rounded max-h-72 overflow-auto divide-y">
            {(() => {
              const filtered = liveCalls.filter((c) => {
                if (feedFilter === "scheduled") return c.ai_outcome === "scheduled" || !!c.appointment_scheduled_at;
                if (feedFilter === "failed") return TECH_FAIL_STATUSES.includes(c.status);
                return true;
              });
              if (filtered.length === 0) {
                return (
                  <div className="p-3 text-xs text-muted-foreground">
                    {liveCalls.length === 0 ? "Niciun apel încă. Lansează un batch." : "Niciun apel pentru filtrul curent."}
                  </div>
                );
              }
              return filtered.map((c) => {
                const meta = STATUS_LABEL[c.status] || { label: c.status, tone: "outline" as const };
                const isScheduled = c.ai_outcome === "scheduled" || !!c.appointment_scheduled_at;
                const isFinal = FINAL_STATUSES.includes(c.status);
                const isStale = isStaleCall(c);
                const resetFailure = isAutoResetFailure(c);
                const techFail = !resetFailure && (TECH_FAIL_STATUSES.includes(c.status) || isStale);
                const sentimentScore = extractSentimentScore(c);
                const mainObjection = extractMainObjection(c);
                const showVerdict = isFinal && (sentimentScore !== null || mainObjection);
                return (
                  <div key={c.id} className="p-2 flex items-center gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        📞 {c.to_number}
                        {isScheduled && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3 w-3" /> Scheduled
                          </span>
                        )}
                        {showVerdict && (
                          <HoverCard openDelay={120}>
                            <HoverCardTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center text-muted-foreground hover:text-primary"
                                aria-label="Mini-verdict AI"
                              >
                                <Info className="h-3 w-3" />
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent side="top" className="w-64 text-xs space-y-2">
                              <div className="font-semibold text-sm flex items-center gap-2">
                                Mini-Verdict AI
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Sentiment</span>
                                <span className={`font-bold ${
                                  sentimentScore === null ? "" :
                                  sentimentScore >= 7 ? "text-emerald-600" :
                                  sentimentScore >= 4 ? "text-amber-600" : "text-destructive"
                                }`}>
                                  {sentimentScore !== null ? `${sentimentScore}/10` : "—"}
                                </span>
                              </div>
                              <div>
                                <div className="text-muted-foreground mb-0.5">Obiecție principală</div>
                                <div className="font-medium">{mainObjection || "—"}</div>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        )}
                      </div>
                      <div className="text-muted-foreground truncate">
                        {c.ai_summary || c.error_message || c.ai_sentiment || (c.started_at ? `Început: ${new Date(c.started_at).toLocaleTimeString("ro-RO")}` : "—")}
                        {c.call_duration_seconds ? ` · ${c.call_duration_seconds}s` : ""}
                      </div>
                    </div>
                    <Badge variant={resetFailure ? "outline" : isStale ? "destructive" : meta.tone}>{resetFailure ? "Resetat" : isStale ? "Blocat" : meta.label}</Badge>
                    {(isFinal || isStale) && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px]"
                        onClick={() => openTechDetails(c.id)}>
                        <FileText className="h-3 w-3 mr-1" /> Detalii
                      </Button>
                    )}
                    {techFail && (
                      <Button size="sm" variant="secondary" className="h-7 text-[10px]"
                        onClick={() => retryTechFail(c)} disabled={retrying === c.id}>
                        {retrying === c.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                        Retry
                      </Button>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* LESSONS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold flex items-center gap-1 text-sm">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Lecții Învățate
              <Badge variant="secondary" className="ml-1">{lessons.filter((l) => l.is_active).length} active</Badge>
            </h4>
          </div>
          <div className="border rounded max-h-48 overflow-auto divide-y">
            {lessons.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground">Nicio lecție încă.</div>
            ) : (
              lessons.map((l) => (
                <div key={l.id} className="p-2 flex items-start gap-2 text-xs">
                  <Switch checked={l.is_active} onCheckedChange={() => toggleLesson(l)} />
                  <div className="flex-1">
                    <div className={l.is_active ? "" : "opacity-50 line-through"}>{l.lesson}</div>
                    <div className="text-muted-foreground mt-0.5">{new Date(l.created_at).toLocaleString("ro-RO")}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PROSPECTS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm">
              Prospecte ({prospects.length}) — <span className="text-primary ml-1">selectate {selected.size}/10</span>
            </h4>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={selectTop10} disabled={prospects.length === 0}>Top 10</Button>
              <Button size="sm" onClick={startBatch} disabled={selected.size === 0 || launching || safety?.calls_paused}>
                {launching ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                Start Batch
              </Button>
            </div>
          </div>
          <div className="border rounded max-h-80 overflow-auto divide-y">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Se încarcă...
              </div>
            ) : prospects.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Niciun prospect.</div>
            ) : (
              prospects.map((p) => (
                <label key={p.id}
                  className={`p-2 flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 ${selected.has(p.id) ? "bg-primary/5" : ""}`}>
                  <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)}
                    disabled={!selected.has(p.id) && selected.size >= 10} />
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

      {/* TECH DETAILS DIALOG */}
      <Dialog open={detailLoading || !!detailLog || !!detailSession}
        onOpenChange={(o) => { if (!o) { setDetailLog(null); setDetailSession(null); setDetailLoading(false); } }}>
      <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> Verdict AI Judge
            </DialogTitle>
            <DialogDescription>Audit tehnic din sesiunea de apel și logul AI Judge, când există.</DialogDescription>
          </DialogHeader>
          {detailLoading ? (
            <div className="text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Încărcare…
            </div>
          ) : detailSession ? (
            <div className="space-y-2 text-sm">
              <Row k="Telefon" v={detailSession.to_number} />
              <Row k="Status apel" v={detailSession.status} highlight={detailSession.status === "completed"} />
              <Row k="Eroare" v={detailSession.error_message || "—"} />
              <Row k="Outcome" v={detailSession.ai_outcome || detailLog?.outcome || "—"} highlight={(detailSession.ai_outcome || detailLog?.outcome) === "scheduled"} />
              <Row k="Sinteză" v={detailSession.ai_summary || "—"} />
              <Row k="Următorul pas" v={detailSession.next_action || "—"} />
              <Row k="Script" v={detailLog ? `${detailLog.script_name || "—"} v${detailLog.script_version ?? "?"}${detailLog.ab_variant ? ` (${detailLog.ab_variant})` : ""}` : "—"} />
              <Row k="Durată" v={detailSession.call_duration_seconds ? `${detailSession.call_duration_seconds}s` : "—"} />
              <Row k="Transcript" v={Array.isArray(detailSession.transcript) ? `${detailSession.transcript.length} turnuri` : "—"} />
              <Row k="Debug" v={Array.isArray(detailSession.debug_log) ? `${detailSession.debug_log.length} intrări` : "—"} />
              <Row k="SID Twilio" v={detailSession.twilio_call_sid || "—"} />
              <Row k="Creat" v={new Date(detailSession.created_at).toLocaleString("ro-RO")} />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Nu există log tehnic încă.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* BATCH REPORT DIALOG */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Raport Final Batch
            </DialogTitle>
            <DialogDescription>
              Toate apelurile din batch s-au finalizat. Iată sumarul.
            </DialogDescription>
          </DialogHeader>
          {reportData && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Total apeluri" value={reportData.total} />
                <StatBox label="Programate" value={reportData.scheduled} accent />
                <StatBox label="Conversie" value={`${reportData.conversion}%`} accent />
              </div>
              <div>
                <div className="text-xs font-semibold mb-1 text-muted-foreground">TOP 3 OBIECȚII</div>
                {reportData.objections.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Nicio obiecție majoră detectată.</div>
                ) : (
                  <ul className="text-sm space-y-1">
                    {reportData.objections.map((o, i) => (
                      <li key={i} className="flex gap-2"><span className="text-primary">•</span>{o}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    DRAFT-URI FOLLOW-UP WHATSAPP — bifează & editează
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]"
                      onClick={() => setApprovedDrafts(new Set(reportData.calls.filter((c) => c.followup_draft).map((c) => c.id)))}>
                      Bifează tot
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]"
                      onClick={() => setApprovedDrafts(new Set())}>
                      Debifează
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]"
                      onClick={() => setHistoryOpen(true)}>
                      <History className="h-3 w-3 mr-1" /> Istoric edits
                    </Button>
                    <label className="flex items-center gap-1 text-[10px] text-muted-foreground pl-1 border-l ml-1">
                      <Switch checked={persistHistory} onCheckedChange={setPersistHistory} />
                      Persistă istoricul
                    </label>
                  </div>
                </div>
                {reportData.calls.filter((c) => c.followup_draft || editedDrafts[c.id]).length === 0 ? (
                  <div className="text-xs text-muted-foreground">Niciun draft generat de Gemini.</div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-auto pr-1">
                    {reportData.calls
                      .filter((c) => c.followup_draft || editedDrafts[c.id])
                      .map((c) => {
                        const original = draftToText(c.followup_draft);
                        const current = editedDrafts[c.id] ?? original;
                        const edited = current !== original;
                        const isApproved = approvedDrafts.has(c.id);
                        return (
                          <div key={c.id} className={`border rounded p-2 space-y-1 ${isApproved ? "border-emerald-500/50 bg-emerald-500/5" : ""}`}>
                            <div className="flex items-center justify-between text-[11px]">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox checked={isApproved} onCheckedChange={() => toggleApproved(c.id)} />
                                <span className="font-medium">📞 {c.to_number}</span>
                              </label>
                              <span className="flex items-center gap-1">
                                {c.ai_outcome && <Badge variant="outline" className="text-[9px]">{c.ai_outcome}</Badge>}
                                {edited && <Badge className="text-[9px] bg-amber-500">editat</Badge>}
                                {(draftHistory[c.id]?.length ?? 0) > 0 && (
                                  <Badge variant="outline" className="text-[9px]">{draftHistory[c.id].length} edits</Badge>
                                )}
                              </span>
                            </div>
                            <Textarea
                              value={current}
                              onChange={(e) => handleDraftEdit(c.id, e.target.value)}
                              rows={3}
                              className="text-xs font-mono"
                            />
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setReportOpen(false)}>Închide</Button>
            <Button variant="outline" onClick={exportApprovedDrafts} disabled={approvedDrafts.size === 0}>
              <FileDown className="h-3 w-3 mr-1" /> Export aprobate ({approvedDrafts.size})
            </Button>
            <Button onClick={openConfirm} disabled={approvingFollowup || approvedDrafts.size === 0}>
              <ShieldCheck className="h-3 w-3 mr-1" />
              Confirmă înainte de trimitere ({approvedDrafts.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FINAL CONFIRMATION DIALOG */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Confirmă înainte de trimitere
            </DialogTitle>
            <DialogDescription>
              Verifică previzualizarea WhatsApp, tonul „Concierge Imobiliar" și istoricul editărilor înainte ca draft-urile să intre în coadă.
            </DialogDescription>
          </DialogHeader>

          {reportData && (() => {
            const approvedCalls = reportData.calls.filter((c) => approvedDrafts.has(c.id));
            return (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Checklist final</div>
                  {[
                    { k: "preview" as const, label: "Am verificat previzualizarea WhatsApp pentru fiecare destinatar" },
                    { k: "tone" as const, label: "Tonul respectă identitatea „Concierge Imobiliar” (analitic & politicos)" },
                    { k: "history" as const, label: `Istoricul modificărilor este ${persistHistory ? "activ" : "INACTIV — activează-l mai jos"}` },
                  ].map((item) => (
                    <label key={item.k} className="flex items-start gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={confirmChecks[item.k]}
                        onCheckedChange={(v) => setConfirmChecks((c) => ({ ...c, [item.k]: !!v }))}
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                  {!persistHistory && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 pl-6">
                      <Switch checked={persistHistory} onCheckedChange={(v) => { setPersistHistory(v); setConfirmChecks((c) => ({ ...c, history: v })); }} />
                      Activează „Persistă istoricul modificărilor"
                    </div>
                  )}
                </div>

                <div className="space-y-3 max-h-[400px] overflow-auto pr-1">
                  {approvedCalls.length === 0 && (
                    <div className="text-sm text-muted-foreground">Niciun draft bifat.</div>
                  )}
                  {approvedCalls.map((c) => {
                    const text = editedDrafts[c.id] ?? draftToText(c.followup_draft);
                    const tone = analyzeTone(text);
                    const editsCount = draftHistory[c.id]?.length ?? 0;
                    const toneTone = tone.score >= 7 ? "emerald" : tone.score >= 5 ? "amber" : "destructive";
                    return (
                      <div key={c.id} className="border rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-muted/40 flex items-center justify-between text-xs">
                          <span className="font-medium">📞 {c.to_number}</span>
                          <span className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className={
                                toneTone === "emerald" ? "border-emerald-500/50 text-emerald-700" :
                                toneTone === "amber" ? "border-amber-500/50 text-amber-700" :
                                "border-destructive/50 text-destructive"
                              }
                            >
                              Ton {tone.score}/10
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">{editsCount} edits</Badge>
                          </span>
                        </div>
                        <div className="bg-[#e5ddd5] dark:bg-muted/20 p-3">
                          <div className="ml-auto max-w-[85%] bg-[#dcf8c6] dark:bg-emerald-900/40 text-foreground rounded-lg rounded-tr-none px-3 py-2 shadow-sm whitespace-pre-wrap text-sm font-sans">
                            {text}
                            <div className="text-[9px] text-muted-foreground text-right mt-1">
                              {new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })} ✓✓
                            </div>
                          </div>
                        </div>
                        {(tone.issues.length > 0 || tone.positives.length > 0) && (
                          <div className="px-3 py-2 text-[11px] border-t grid grid-cols-2 gap-2">
                            <div>
                              <div className="font-semibold text-emerald-600 mb-0.5">✓ Concierge</div>
                              {tone.positives.length === 0 ? <span className="text-muted-foreground">—</span> :
                                <ul className="space-y-0.5">{tone.positives.map((p, i) => <li key={i}>· {p}</li>)}</ul>}
                            </div>
                            <div>
                              <div className="font-semibold text-amber-600 mb-0.5">⚠ De ajustat</div>
                              {tone.issues.length === 0 ? <span className="text-muted-foreground">—</span> :
                                <ul className="space-y-0.5">{tone.issues.map((p, i) => <li key={i}>· {p}</li>)}</ul>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Anulează</Button>
            <Button
              onClick={async () => {
                flushPendingHistory();
                await approveFollowups();
                setConfirmOpen(false);
              }}
              disabled={
                approvingFollowup ||
                approvedDrafts.size === 0 ||
                !confirmChecks.preview ||
                !confirmChecks.tone ||
                !confirmChecks.history ||
                !persistHistory
              }
            >
              {approvingFollowup ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
              Trimite final în coadă ({approvedDrafts.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DRAFT EDIT HISTORY DIALOG */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Istoric modificări draft-uri
            </DialogTitle>
            <DialogDescription>
              Edit-urile manuale făcute pe draft-urile WhatsApp — pentru consistența tonului RealTrust.
            </DialogDescription>
          </DialogHeader>
          {Object.keys(draftHistory).length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Nicio modificare încă.</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(draftHistory).map(([id, edits]) => {
                const call = reportData?.calls.find((c) => c.id === id);
                return (
                  <div key={id} className="border rounded p-3 space-y-2">
                    <div className="text-xs font-semibold flex items-center gap-2">
                      📞 {call?.to_number || id.slice(0, 8)}
                      <Badge variant="outline" className="text-[9px]">{edits.length} modificări</Badge>
                    </div>
                    <ol className="space-y-2 text-xs">
                      {edits.map((e, i) => (
                        <li key={i} className="border-l-2 border-primary/40 pl-2">
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(e.at).toLocaleString("ro-RO")}
                          </div>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase">Înainte</div>
                              <div className="font-mono whitespace-pre-wrap bg-destructive/5 p-1 rounded">{e.before || "—"}</div>
                            </div>
                            <div>
                              <div className="text-[10px] text-muted-foreground uppercase">După</div>
                              <div className="font-mono whitespace-pre-wrap bg-emerald-500/5 p-1 rounded">{e.after}</div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryOpen(false)}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Row({ k, v, highlight }: { k: string; v: any; highlight?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 border-b pb-1">
      <span className="text-muted-foreground shrink-0">{k}</span>
      <span className={`font-medium text-right break-words whitespace-pre-wrap min-w-0 ${highlight ? "text-emerald-600" : ""}`}>{String(v)}</span>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded border p-3 text-center ${accent ? "bg-primary/5 border-primary/30" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${accent ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
