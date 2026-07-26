import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare, Send, PhoneCall, PauseCircle, RefreshCw, Bot, Settings, FileText, User2, ExternalLink,
} from "lucide-react";

type Conv = {
  id: string;
  phone_normalized: string;
  status: "active" | "awaiting_human" | "escalated_to_call" | "closed";
  assigned_channel: "whatsapp" | "voice";
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  window_expires_at: string | null;
  qualification_score: number | null;
  handoff_reason: string | null;
  wa_profile_name: string | null;
  prospect_id: string | null;
};

type Msg = {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  ai_model: string | null;
  ai_tokens_in: number | null;
  ai_tokens_out: number | null;
  template_name: string | null;
  error: string | null;
  created_at: string;
};

type Settings = {
  id: number;
  enabled: boolean;
  system_prompt: string;
  escalation_threshold: number;
  office_hours_only: boolean;
  paused_reason: string | null;
};

type WaTemplate = {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  body_preview: string;
  variables_help: string | null;
  variable_count: number;
};

type Prospect = {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  phone_normalized: string | null;
  prospect_type: string | null;
  zone: string | null;
  source_url: string | null;
  status: string | null;
  predictive_score: number | null;
};

const STATUS_LABEL: Record<Conv["status"], string> = {
  active: "Activ",
  awaiting_human: "Așteaptă operator",
  escalated_to_call: "Escaladat la apel",
  closed: "Închis",
};

function statusColor(s: Conv["status"]): string {
  switch (s) {
    case "active": return "bg-emerald-600";
    case "awaiting_human": return "bg-amber-600";
    case "escalated_to_call": return "bg-blue-600";
    case "closed": return "bg-muted text-muted-foreground";
  }
}

export default function WhatsappAgentInbox() {
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [templates, setTemplates] = useState<WaTemplate[]>([]);
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [sendingTemplate, setSendingTemplate] = useState(false);

  const loadConversations = async () => {
    setLoading(true);
    const { data } = await supabase.from("wa_conversations")
      .select("*").order("last_inbound_at", { ascending: false, nullsFirst: false })
      .limit(100);
    setConversations((data as Conv[]) || []);
    setLoading(false);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase.from("wa_messages")
      .select("*").eq("conversation_id", convId)
      .order("created_at", { ascending: true }).limit(200);
    setMessages((data as Msg[]) || []);
  };

  const loadSettings = async () => {
    const { data } = await supabase.from("wa_agent_settings").select("*").eq("id", 1).maybeSingle();
    if (data) setSettings(data as Settings);
  };

  const loadTemplates = async () => {
    const { data } = await supabase.from("wa_templates")
      .select("*").eq("status", "active").order("name", { ascending: true });
    setTemplates((data as WaTemplate[]) || []);
  };

  const loadProspect = async (conv: Conv | null) => {
    if (!conv) { setProspect(null); return; }
    const cols = "id, contact_name, contact_phone, phone_normalized, prospect_type, zone, source_url, status, predictive_score";
    const { data } = conv.prospect_id
      ? await supabase.from("prospect_listings").select(cols).eq("id", conv.prospect_id).maybeSingle()
      : await supabase.from("prospect_listings").select(cols).eq("phone_normalized", conv.phone_normalized).limit(1).maybeSingle();
    setProspect((data as unknown as Prospect | null) ?? null);
  };

  useEffect(() => {
    loadConversations();
    loadSettings();
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId]);

  useEffect(() => {
    const conv = conversations.find((c) => c.id === selectedId) || null;
    loadProspect(conv);
    setSelectedTemplateId("");
    setTemplateParams([]);
  }, [selectedId, conversations]);

  // Realtime: new inbound messages & conversation updates
  useEffect(() => {
    const ch = supabase.channel("wa-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_conversations" }, () => loadConversations())
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_messages" }, (payload) => {
        const row = payload.new as Msg | undefined;
        if (row && selectedId && row.conversation_id === selectedId) {
          loadMessages(selectedId);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [selectedId]);

  const selected = useMemo(() => conversations.find((c) => c.id === selectedId) || null, [conversations, selectedId]);

  const sendManualReply = async () => {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    // Pause AI first
    await supabase.from("wa_conversations")
      .update({ status: "awaiting_human", handoff_reason: "manual_reply_from_admin" })
      .eq("id", selectedId);

    const { data, error } = await supabase.functions.invoke("wa-andrei-send", {
      body: { conversation_id: selectedId, text: reply.trim() },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Trimitere eșuată", description: (data as any)?.error || error?.message });
      return;
    }
    setReply("");
    toast({ title: "Mesaj trimis" });
    loadMessages(selectedId);
    loadConversations();
  };

  const escalateToCall = async () => {
    if (!selectedId || !selected) return;
    await supabase.from("wa_conversations")
      .update({ status: "escalated_to_call", assigned_channel: "voice", handoff_reason: "admin_escalated" })
      .eq("id", selectedId);
    // Best-effort: kick voice initiate
    await supabase.functions.invoke("voice-agent-initiate", {
      body: { phone: selected.phone_normalized, source: "wa_admin_escalation" },
    }).catch(() => {});
    toast({ title: "Escaladat", description: "Andrei va suna proprietarul." });
    loadConversations();
  };

  const closeConversation = async () => {
    if (!selectedId) return;
    await supabase.from("wa_conversations").update({ status: "closed" }).eq("id", selectedId);
    toast({ title: "Conversație închisă" });
    loadConversations();
  };

  const resumeAi = async () => {
    if (!selectedId) return;
    await supabase.from("wa_conversations").update({ status: "active", handoff_reason: null }).eq("id", selectedId);
    toast({ title: "AI reactivat" });
    loadConversations();
  };

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId) || null;

  const sendTemplate = async () => {
    if (!selectedId || !selectedTemplate) return;
    if (selectedTemplate.variable_count > 0 && templateParams.some((p) => !p?.trim())) {
      toast({ variant: "destructive", title: "Completează toate variabilele" });
      return;
    }
    setSendingTemplate(true);
    const { data, error } = await supabase.functions.invoke("wa-andrei-send", {
      body: {
        conversation_id: selectedId,
        template_name: selectedTemplate.name,
        template_language: selectedTemplate.language,
        template_params: templateParams.slice(0, selectedTemplate.variable_count),
      },
    });
    setSendingTemplate(false);
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Șablon eșuat", description: (data as any)?.error || error?.message });
      return;
    }
    await supabase.from("wa_conversations")
      .update({ opened_by_template: selectedTemplate.name })
      .eq("id", selectedId);
    toast({ title: "Șablon trimis", description: selectedTemplate.name });
    setTemplateParams([]);
    loadMessages(selectedId);
    loadConversations();
  };

  const saveSettings = async () => {
    if (!settings) return;
    setSavingSettings(true);
    const { error } = await supabase.from("wa_agent_settings").update({
      enabled: settings.enabled,
      system_prompt: settings.system_prompt,
      escalation_threshold: settings.escalation_threshold,
      office_hours_only: settings.office_hours_only,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    setSavingSettings(false);
    if (error) toast({ variant: "destructive", title: "Eroare salvare", description: error.message });
    else toast({ title: "Setări salvate" });
  };

  return (
    <AdminPageShell
      icon={MessageSquare}
      title="Andrei WhatsApp — Inbox"
      description="Agent AI (GPT-5.4-mini) care conversează cu proprietarii pe WhatsApp. Voce doar la escaladare."
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadConversations} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} /> Reîncarcă
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings((v) => !v)}>
            <Settings className="h-3.5 w-3.5 mr-1" /> Setări
          </Button>
        </div>
      }
    >
      {showSettings && settings && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bot className="h-4 w-4" /> Setări Andrei WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Agent activ</Label>
                <p className="text-xs text-muted-foreground">Kill-switch global. Off = webhook primește mesaje dar nu răspunde.</p>
              </div>
              <Switch checked={settings.enabled} onCheckedChange={(v) => setSettings({ ...settings, enabled: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Doar în program (L-V, 10-18)</Label>
                <p className="text-xs text-muted-foreground">Off = răspunde 24/7. On = în afara programului lasă awaiting_human.</p>
              </div>
              <Switch checked={settings.office_hours_only} onCheckedChange={(v) => setSettings({ ...settings, office_hours_only: v })} />
            </div>
            <div>
              <Label className="text-sm font-medium">Prag escaladare la apel (0-100)</Label>
              <Input
                type="number" min={0} max={100}
                value={settings.escalation_threshold}
                onChange={(e) => setSettings({ ...settings, escalation_threshold: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                className="mt-1 w-32"
              />
            </div>
            <div>
              <Label className="text-sm font-medium">Prompt personalitate</Label>
              <Textarea
                value={settings.system_prompt}
                onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                className="mt-1 font-mono text-xs min-h-[200px]"
              />
            </div>
            <Button onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? "Se salvează…" : "Salvează setările"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 min-h-[600px]">
        {/* Left: conversation list */}
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            Conversații ({conversations.length})
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-320px)]">
            {conversations.length === 0 && (
              <div className="p-4 text-xs text-muted-foreground italic">Nicio conversație încă.</div>
            )}
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left px-3 py-2.5 border-b border-border/50 hover:bg-muted/40 transition ${
                  selectedId === c.id ? "bg-muted/60" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium truncate">
                    {c.wa_profile_name || c.phone_normalized}
                  </span>
                  <Badge className={`text-[9px] shrink-0 ${statusColor(c.status)}`}>
                    {STATUS_LABEL[c.status]}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <span className="font-mono truncate">{c.phone_normalized}</span>
                  {c.qualification_score != null && (
                    <span className="shrink-0">⭐ {c.qualification_score}</span>
                  )}
                </div>
                {c.last_inbound_at && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(c.last_inbound_at).toLocaleString("ro-RO")}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: thread */}
        <div className="border border-border rounded-lg bg-card flex flex-col">
          {!selected && (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              Selectează o conversație
            </div>
          )}
          {selected && (
            <>
              <div className="border-b border-border px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">
                    {selected.wa_profile_name || selected.phone_normalized}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{selected.phone_normalized}</div>
                  {selected.handoff_reason && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 italic">
                      {selected.handoff_reason}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {selected.status === "awaiting_human" && (
                    <Button size="sm" variant="outline" onClick={resumeAi}>
                      <Bot className="h-3 w-3 mr-1" /> Reactivează AI
                    </Button>
                  )}
                  {selected.status === "active" && (
                    <Button size="sm" variant="outline" onClick={() => supabase.from("wa_conversations").update({ status: "awaiting_human", handoff_reason: "admin_paused" }).eq("id", selected.id).then(() => loadConversations())}>
                      <PauseCircle className="h-3 w-3 mr-1" /> Pauză AI
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={escalateToCall} disabled={selected.status === "escalated_to_call"}>
                    <PhoneCall className="h-3 w-3 mr-1" /> Escaladează la apel
                  </Button>
                  <Button size="sm" variant="ghost" onClick={closeConversation}>Închide</Button>
                </div>
              </div>

              {prospect && (
                <div className="border-b border-border px-4 py-2 bg-muted/30 text-xs flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="flex items-center gap-1 font-medium">
                    <User2 className="h-3 w-3" />
                    {prospect.contact_name || "Prospect fără nume"}
                  </span>
                  {prospect.prospect_type && <span className="text-muted-foreground">{prospect.prospect_type}</span>}
                  {prospect.zone && <span className="text-muted-foreground">· {prospect.zone}</span>}
                  {prospect.predictive_score != null && (
                    <span className="text-muted-foreground">· scor {Math.round(prospect.predictive_score)}</span>
                  )}
                  {prospect.status && <span className="text-muted-foreground">· {prospect.status}</span>}
                  {prospect.source_url && (
                    <a href={prospect.source_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-primary hover:underline">
                      Anunț <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}


              <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[calc(100vh-450px)]">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        m.direction === "outbound"
                          ? "bg-emerald-600 text-white"
                          : "bg-muted"
                      } ${m.error ? "border border-destructive" : ""}`}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      <div className={`text-[10px] mt-1 ${m.direction === "outbound" ? "text-emerald-50/70" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString("ro-RO")}
                        {m.ai_model && ` · ${m.ai_model}`}
                        {m.ai_tokens_out != null && ` · ${m.ai_tokens_in ?? 0}/${m.ai_tokens_out} tok`}
                        {m.template_name && ` · tpl:${m.template_name}`}
                        {m.error && ` · ⚠ ${m.error}`}
                      </div>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="text-xs text-muted-foreground italic">Fără mesaje.</div>
                )}
              </div>
              <div className="border-t border-border p-3 space-y-2 bg-muted/20">
                <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                  <FileText className="h-3 w-3" /> Șablon aprobat Meta
                  {selected.window_expires_at && new Date(selected.window_expires_at).getTime() < Date.now() && (
                    <span className="ml-2 text-amber-600">Fereastra 24h e închisă — folosește un șablon</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={selectedTemplateId}
                    onValueChange={(v) => {
                      setSelectedTemplateId(v);
                      const t = templates.find((x) => x.id === v);
                      setTemplateParams(t ? Array(t.variable_count).fill("") : []);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[240px] text-xs">
                      <SelectValue placeholder="Alege șablon…" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.name} ({t.language})
                        </SelectItem>
                      ))}
                      {templates.length === 0 && (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">Niciun șablon activ</div>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedTemplate && Array.from({ length: selectedTemplate.variable_count }).map((_, i) => (
                    <input
                      key={i}
                      value={templateParams[i] || ""}
                      onChange={(e) => {
                        const next = [...templateParams];
                        next[i] = e.target.value;
                        setTemplateParams(next);
                      }}
                      placeholder={`{{${i + 1}}}`}
                      className="h-8 rounded-md border border-input bg-background px-2 text-xs w-32"
                    />
                  ))}
                  <Button size="sm" variant="outline" onClick={sendTemplate} disabled={!selectedTemplate || sendingTemplate}>
                    <Send className="h-3 w-3 mr-1" />
                    {sendingTemplate ? "Se trimite…" : "Trimite șablon"}
                  </Button>
                </div>
                {selectedTemplate && (
                  <div className="text-[10px] text-muted-foreground italic border-l-2 border-border pl-2">
                    {selectedTemplate.body_preview}
                    {selectedTemplate.variables_help && <> — <span className="not-italic">{selectedTemplate.variables_help}</span></>}
                  </div>
                )}
              </div>


              <div className="border-t border-border p-3 space-y-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Răspuns manual (pauzează AI-ul pe această conversație)…"
                  className="text-sm min-h-[70px]"
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">
                    Fereastră 24h: {selected.window_expires_at ? new Date(selected.window_expires_at).toLocaleString("ro-RO") : "—"}
                  </span>
                  <Button size="sm" onClick={sendManualReply} disabled={sending || !reply.trim()}>
                    <Send className="h-3 w-3 mr-1" />
                    {sending ? "Se trimite…" : "Trimite"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminPageShell>
  );
}
