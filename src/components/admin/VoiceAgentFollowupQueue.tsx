import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageCircle, Mail, Sparkles, Copy, Check, RefreshCw, X, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface FollowupDraft {
  whatsapp_message: string;
  email_subject: string;
  email_body: string;
  next_actions: string[];
  priority: "high" | "medium" | "low";
  recommended_callback_window: string;
  generated_at?: string;
}

interface SessionRow {
  id: string;
  to_number: string | null;
  ai_outcome: string | null;
  ai_summary: string | null;
  ai_sentiment: string | null;
  followup_draft: FollowupDraft | null;
  followup_status: string | null;
  created_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-500/15 text-red-700 border-red-500/40",
  medium: "bg-amber-500/15 text-amber-700 border-amber-500/40",
  low: "bg-muted text-muted-foreground border-border",
};

export default function VoiceAgentFollowupQueue() {
  const [rows, setRows] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, FollowupDraft>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("voice_call_sessions" as never)
      .select("id, to_number, ai_outcome, ai_summary, ai_sentiment, followup_draft, followup_status, created_at")
      .not("followup_draft", "is", null)
      .eq("followup_status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(20);
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getDraft = (r: SessionRow): FollowupDraft => edits[r.id] || (r.followup_draft as FollowupDraft);

  const updateDraft = (id: string, patch: Partial<FollowupDraft>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...(prev[id] || rows.find((r) => r.id === id)?.followup_draft as FollowupDraft), ...patch } }));
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copiat`, description: "Lipește în WhatsApp / email." });
    } catch {
      toast({ title: "Eroare copiere", variant: "destructive" });
    }
  };

  const setStatus = async (id: string, status: "approved" | "dismissed" | "sent") => {
    setBusyId(id);
    const draftToSave = edits[id];
    const update: any = { followup_status: status };
    if (draftToSave) update.followup_draft = draftToSave;
    const { error } = await supabase
      .from("voice_call_sessions" as never)
      .update(update)
      .eq("id", id);
    setBusyId(null);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "approved" ? "Marcat aprobat" : status === "sent" ? "Marcat trimis" : "Respins" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const regenerate = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await supabase.functions.invoke("voice-agent-postcall-intel", {
        body: { sessionId: id, force: true },
      });
      if (error) throw error;
      toast({ title: "Re-generat" });
      await load();
    } catch (e: any) {
      toast({ title: "Eroare regenerare", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const waLink = (phone: string | null, msg: string) => {
    if (!phone) return null;
    const clean = phone.replace(/[^0-9]/g, "");
    return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Post-Call Intelligence — Follow-up draft-uri
            </CardTitle>
            <CardDescription>
              Andrei pregătește draft de WhatsApp + email + next-best-actions după fiecare apel. Aprobă sau editează cu un click.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">
            Nu există draft-uri în așteptare. Andrei le pregătește automat după fiecare apel.
          </p>
        ) : (
          <ScrollArea className="max-h-[700px] pr-2">
            <ul className="space-y-4">
              {rows.map((r) => {
                const d = getDraft(r);
                if (!d) return null;
                return (
                  <li key={r.id} className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={PRIORITY_COLORS[d.priority] || ""}>{d.priority?.toUpperCase()}</Badge>
                          {r.ai_outcome && <Badge variant="secondary">{r.ai_outcome}</Badge>}
                          {r.ai_sentiment && <Badge variant="outline">{r.ai_sentiment}</Badge>}
                          {r.to_number && (
                            <span className="text-sm font-mono text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {r.to_number}
                            </span>
                          )}
                        </div>
                        {r.ai_summary && <p className="text-sm text-foreground/80">{r.ai_summary}</p>}
                        <p className="text-xs text-muted-foreground">
                          Re-contact recomandat: <strong>{d.recommended_callback_window}</strong>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => regenerate(r.id)} disabled={busyId === r.id}>
                          {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "dismissed")} disabled={busyId === r.id}>
                          <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" onClick={() => setStatus(r.id, "approved")} disabled={busyId === r.id}>
                          <Check className="w-3.5 h-3.5 mr-1" /> Aprobă
                        </Button>
                      </div>
                    </div>

                    {/* Next actions */}
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-1">Next-best-actions</h4>
                      <ol className="list-decimal pl-5 space-y-1 text-sm">
                        {(d.next_actions || []).map((a, i) => <li key={i}>{a}</li>)}
                      </ol>
                    </div>

                    {/* WhatsApp */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </h4>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => copy(d.whatsapp_message, "WhatsApp")}>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copiază
                          </Button>
                          {r.to_number && (
                            <Button size="sm" variant="outline" asChild>
                              <a href={waLink(r.to_number, d.whatsapp_message) || "#"} target="_blank" rel="noopener noreferrer">
                                Trimite în WhatsApp →
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                      <Textarea
                        value={d.whatsapp_message}
                        onChange={(e) => updateDraft(r.id, { whatsapp_message: e.target.value })}
                        rows={3}
                        className="text-sm"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> Email
                        </h4>
                        <Button size="sm" variant="ghost" onClick={() => copy(`${d.email_subject}\n\n${d.email_body}`, "Email")}>
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copiază
                        </Button>
                      </div>
                      <Input
                        value={d.email_subject}
                        onChange={(e) => updateDraft(r.id, { email_subject: e.target.value })}
                        placeholder="Subiect"
                        className="mb-2 text-sm"
                      />
                      <Textarea
                        value={d.email_body}
                        onChange={(e) => updateDraft(r.id, { email_body: e.target.value })}
                        rows={5}
                        className="text-sm"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
