import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Sparkles, RefreshCw, Pencil, Save, X, Loader2, ChevronDown, ChevronUp, Send, AlertTriangle, PhoneOutgoing } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

export interface PersonaSnapshot {
  summary?: string;
  seller_type?: string;
  motivation?: string;
  urgency_level?: number;
  urgency_signals?: string[];
  price_signal?: string;
  negotiation_room?: string;
  approach?: {
    tone?: string;
    opening_line?: string;
    key_questions?: string[];
    avoid?: string[];
  };
  objections_likely?: string[];
  best_call_window?: string;
  confidence?: number;
  _model?: string;
  _generated_at?: string;
  _error?: string | null;
  _edited_by_admin?: boolean;
}

interface Props {
  prospectId: string;
  persona: PersonaSnapshot | null;
  generatedAt: string | null;
  onChange?: (next: PersonaSnapshot, generatedAt: string) => void;
  compact?: boolean;
  /** ISO timestamp of the most recent call to this phone (any prospect) within the last 48h, if any. */
  recentCallAt?: string | null;
  /** Whether the recent call was on this same prospect row. */
  recentCallSameProspect?: boolean;
  /** Called after a successful "Trimite" dispatch so the parent can flip lifecycle_status. */
  onSent?: () => void;
}

const URGENCY_COLOR = (n: number | undefined) => {
  if (n == null) return "bg-muted text-muted-foreground";
  if (n >= 8) return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  if (n >= 5) return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
};

const MOTIVATION_LABEL: Record<string, string> = {
  mostenire: "Moștenire",
  mutare: "Mutare",
  upgrade: "Upgrade",
  "investitor exit": "Exit investitor",
  "nevoie cash": "Nevoie cash",
  unclear: "Necunoscut",
};

const TONE_LABEL: Record<string, string> = {
  empatic: "🤝 Empatic",
  direct: "🎯 Direct",
  "profesional-rece": "💼 Profesional",
  prietenos: "😊 Prietenos",
};

export function ProspectPersonaSnapshot({ prospectId, persona, generatedAt, onChange, compact = false, recentCallAt = null, recentCallSameProspect = false, onSent }: Props) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState<PersonaSnapshot>(persona || {});

  const recentCallHours = recentCallAt
    ? Math.max(0, Math.round((Date.now() - new Date(recentCallAt).getTime()) / 3_600_000))
    : null;
  const hasRecentCallWarning = recentCallAt != null;

  const handleSend = async () => {
    if (hasRecentCallWarning) {
      const who = recentCallSameProspect ? "acest prospect" : "același număr de telefon";
      const ok = window.confirm(
        `⚠ Atenție: ${who} a fost apelat acum ${recentCallHours}h (sub 48h). Continui cu re-apelul?`
      );
      if (!ok) return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-auto-dial", {
        body: { triggered_prospect_id: prospectId, source: "manual_admin_send" },
      });
      if (error) throw error;
      toast({ title: "Apel lansat", description: data?.message || "Twilio dispatch trimis." });
      onSent?.();
    } catch (e: any) {
      toast({ title: "Eroare la trimitere", description: e?.message || "Necunoscut", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("prospect-persona-snapshot", {
        body: { prospect_id: prospectId, force: true },
      });
      if (error) throw error;
      // Re-fetch the row to get fresh persona
      const { data: row } = await supabase
        .from("prospect_listings")
        .select("persona_snapshot, persona_generated_at")
        .eq("id", prospectId)
        .maybeSingle();
      if (row?.persona_snapshot) {
        const newPersona = row.persona_snapshot as PersonaSnapshot;
        setDraft(newPersona);
        onChange?.(newPersona, row.persona_generated_at as string);
        toast({ title: "Profil regenerat", description: data?.persona_summary?.slice(0, 80) || "Persona snapshot actualizat." });
      }
    } catch (e: any) {
      toast({ title: "Eroare regenerare", description: e?.message || "Necunoscut", variant: "destructive" });
    } finally {
      setRegenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const next: PersonaSnapshot = { ...draft, _edited_by_admin: true, _generated_at: new Date().toISOString() };
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("prospect_listings")
        .update({ persona_snapshot: next as any, persona_generated_at: nowIso })
        .eq("id", prospectId);
      if (error) throw error;
      onChange?.(next, nowIso);
      setEditing(false);
      toast({ title: "Persona actualizată", description: "Modificările sunt active pentru următorul apel." });
    } catch (e: any) {
      toast({ title: "Eroare salvare", description: e?.message || "Necunoscut", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Empty state
  if (!persona) {
    return (
      <div className="mt-1 flex items-center gap-2">
        <Badge variant="outline" className="text-[10px] gap-1 text-muted-foreground">
          <Sparkles className="h-3 w-3" /> Fără persona
        </Badge>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-[10px] px-2"
          onClick={handleRegenerate}
          disabled={regenerating}
        >
          {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Generează"}
        </Button>
      </div>
    );
  }

  const view = editing ? draft : persona;
  const opening = view.approach?.opening_line;
  const motivationLabel = view.motivation ? (MOTIVATION_LABEL[view.motivation] || view.motivation) : null;

  return (
    <div className="mt-1.5 rounded-md border border-primary/20 bg-primary/5 p-2 space-y-1.5">
      {/* Header — quick-read badges */}
      <div className="flex items-center gap-1 flex-wrap">
        <Badge variant="outline" className="text-[10px] gap-1 bg-background">
          <Sparkles className="h-3 w-3 text-primary" /> Persona
        </Badge>
        {motivationLabel && (
          <Badge variant="secondary" className="text-[10px]" title="Motivație">
            🎯 {motivationLabel}
          </Badge>
        )}
        {view.urgency_level != null && (
          <Badge className={`text-[10px] ${URGENCY_COLOR(view.urgency_level)}`} title="Urgență">
            ⚡ {view.urgency_level}/10
          </Badge>
        )}
        {view.seller_type && view.seller_type !== "unclear" && (
          <Badge variant="outline" className="text-[10px]" title="Tip vânzător">
            {view.seller_type === "owner" ? "👤 Proprietar" : view.seller_type === "agent" ? "🏢 Agent" : view.seller_type === "developer" ? "🏗️ Dezvoltator" : view.seller_type}
          </Badge>
        )}
        {view.best_call_window && view.best_call_window !== "unclear" && (
          <Badge variant="outline" className="text-[10px]" title="Cel mai bun moment">
            🕐 {view.best_call_window}
          </Badge>
        )}
        {view._edited_by_admin && (
          <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700">✏️ Editat manual</Badge>
        )}
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 w-6 p-0"
            onClick={() => setExpanded((e) => !e)}
            aria-label={expanded ? "Ascunde detalii" : "Arată detalii"}
          >
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
        </div>
      </div>

      {/* Summary */}
      {!editing && view.summary && (
        <div className="text-xs text-foreground/80 leading-snug">{view.summary}</div>
      )}

      {/* Opening line — always visible (recommended) */}
      {!editing && opening && (
        <div className="rounded bg-background/80 border border-primary/15 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-0.5 flex items-center gap-1">
            🎙️ Opening line recomandat {view.approach?.tone && <span className="ml-1">· {TONE_LABEL[view.approach.tone] || view.approach.tone}</span>}
          </div>
          <div className="text-xs italic text-foreground">"{opening}"</div>
        </div>
      )}

      {/* Editing mode */}
      {editing && (
        <div className="space-y-2 bg-background/80 rounded p-2 border border-primary/15">
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Sumar</label>
            <Textarea
              value={draft.summary || ""}
              onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              rows={2}
              className="text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Motivație</label>
              <Input
                value={draft.motivation || ""}
                onChange={(e) => setDraft({ ...draft, motivation: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-muted-foreground">Urgență (0-10)</label>
              <Input
                type="number"
                min={0}
                max={10}
                value={draft.urgency_level ?? ""}
                onChange={(e) => setDraft({ ...draft, urgency_level: e.target.value === "" ? undefined : Number(e.target.value) })}
                className="h-7 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Opening line</label>
            <Textarea
              value={draft.approach?.opening_line || ""}
              onChange={(e) => setDraft({ ...draft, approach: { ...(draft.approach || {}), opening_line: e.target.value } })}
              rows={2}
              className="text-xs italic"
              placeholder='ex: "Bună ziua, am văzut anunțul, mai e disponibil?"'
            />
          </div>
          <div>
            <label className="text-[10px] uppercase text-muted-foreground">Ton</label>
            <select
              value={draft.approach?.tone || ""}
              onChange={(e) => setDraft({ ...draft, approach: { ...(draft.approach || {}), tone: e.target.value } })}
              className="h-7 w-full text-xs border rounded px-1.5 bg-background"
            >
              <option value="">—</option>
              <option value="empatic">Empatic</option>
              <option value="direct">Direct</option>
              <option value="profesional-rece">Profesional</option>
              <option value="prietenos">Prietenos</option>
            </select>
          </div>
        </div>
      )}

      {/* Expanded details (read-only) */}
      {expanded && !editing && (
        <div className="space-y-1.5 pt-1 border-t border-primary/15">
          {view.urgency_signals && view.urgency_signals.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Semnale urgență</div>
              <div className="flex gap-1 flex-wrap mt-0.5">
                {view.urgency_signals.map((s, i) => <Badge key={i} variant="outline" className="text-[10px]">{s}</Badge>)}
              </div>
            </div>
          )}
          {view.approach?.key_questions && view.approach.key_questions.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Întrebări-cheie</div>
              <ul className="text-xs list-disc ml-4 space-y-0.5">
                {view.approach.key_questions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}
          {view.approach?.avoid && view.approach.avoid.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">De evitat</div>
              <div className="flex gap-1 flex-wrap mt-0.5">
                {view.approach.avoid.map((s, i) => <Badge key={i} variant="outline" className="text-[10px] border-red-300 text-red-700">⚠ {s}</Badge>)}
              </div>
            </div>
          )}
          {view.objections_likely && view.objections_likely.length > 0 && (
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Obiecții probabile</div>
              <ul className="text-xs list-disc ml-4 space-y-0.5 text-muted-foreground">
                {view.objections_likely.map((o, i) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
            {view.confidence != null && <span>Încredere AI: {view.confidence}%</span>}
            {generatedAt && <span>· {new Date(generatedAt).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}</span>}
            {view._error && <span className="text-red-600">· {view._error}</span>}
          </div>
        </div>
      )}

      {/* Recent-call warning (last 48h) */}
      {hasRecentCallWarning && !editing && (
        <div className="flex items-start gap-1.5 rounded border border-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-1.5 text-[11px] text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            <strong>Atenție re-apel:</strong>{" "}
            {recentCallSameProspect ? "acest prospect" : "același număr"} a fost apelat acum{" "}
            <strong>{recentCallHours}h</strong> (în ultimele 48h).
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 pt-0.5 flex-wrap">
        {!editing ? (
          <>
            <Button
              size="sm"
              className={`h-7 text-[11px] px-2.5 gap-1 font-semibold ${hasRecentCallWarning ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}`}
              onClick={handleSend}
              disabled={sending}
              title={hasRecentCallWarning ? "Re-apel sub 48h — confirmare necesară" : "Trimite către Twilio"}
            >
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : hasRecentCallWarning ? <PhoneOutgoing className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              {hasRecentCallWarning ? "Trimite oricum" : "Trimite"}
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" onClick={() => { setDraft(persona); setEditing(true); }}>
              <Pencil className="h-3 w-3" /> Editează
            </Button>
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 gap-1" onClick={handleRegenerate} disabled={regenerating}>
              {regenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Regenerează
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" className="h-6 text-[10px] px-2 gap-1" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Salvează
            </Button>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={() => { setDraft(persona); setEditing(false); }}>
              <X className="h-3 w-3" /> Anulează
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
