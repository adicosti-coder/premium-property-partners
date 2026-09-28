import { useEffect, useRef, useState } from "react";
import { Loader2, MessagesSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Conv { id: string; lead_id: string | null; page_title: string | null; page_url: string | null; last_activity_at: string; lead?: { name: string; crm_status: string; email: string | null } | null }
interface Msg { id: string; role: string; content: string; created_at: string }

const STAGE: Record<string, string> = { nou_necontactat: "Nou", contactat: "Contactat", ofertat: "Ofertat", contractat: "Contractat", pierdut: "Pierdut" };

const ChatInboxPanel = () => {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    const { data } = await supabase.from("chat_conversations")
      .select("id, lead_id, page_title, page_url, last_activity_at")
      .order("last_activity_at", { ascending: false }).limit(60);
    const list = (data ?? []) as Conv[];
    const leadIds = list.map((c) => c.lead_id).filter(Boolean) as string[];
    if (leadIds.length) {
      const { data: leads } = await supabase.from("leads").select("id, name, crm_status, email").in("id", leadIds);
      const map = new Map((leads ?? []).map((l) => [l.id, l]));
      list.forEach((c) => { c.lead = c.lead_id ? (map.get(c.lead_id) as any) : null; });
    }
    setConvs(list);
    setLoading(false);
  };

  const loadMsgs = async (id: string) => {
    const { data } = await supabase.from("chat_messages").select("id, role, content, created_at")
      .eq("conversation_id", id).in("role", ["user", "assistant", "agent"]).order("created_at").limit(300);
    setMsgs((data ?? []) as Msg[]);
  };

  useEffect(() => { loadConvs(); const t = setInterval(loadConvs, 15000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!active) return;
    loadMsgs(active);
    const t = setInterval(() => loadMsgs(active), 8000);
    return () => clearInterval(t);
  }, [active]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs.length]);

  const send = async () => {
    if (!active || !reply.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-lead-message", { body: { conversationId: active, channel: "chat", content: reply } });
    setBusy(false);
    if (error || data?.error) { toast.error("Mesajul nu a putut fi trimis"); return; }
    setReply("");
    loadMsgs(active);
    loadConvs();
  };

  const current = convs.find((c) => c.id === active);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessagesSquare className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Discuții chat premium</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-[300px_1fr]">
        <Card className="max-h-[70vh] overflow-y-auto p-2">
          {loading && <Loader2 className="m-4 h-5 w-5 animate-spin" />}
          {!loading && convs.length === 0 && <p className="p-3 text-sm text-muted-foreground">Nu există discuții.</p>}
          {convs.map((c) => (
            <button key={c.id} onClick={() => setActive(c.id)}
              className={`mb-1 w-full min-h-12 rounded-md p-2 text-left text-sm transition-colors ${active === c.id ? "bg-primary/10" : "hover:bg-muted"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{c.lead?.name || "Vizitator anonim"}</span>
                {c.lead && <Badge variant="secondary" className="shrink-0 text-[10px]">{STAGE[c.lead.crm_status] ?? c.lead.crm_status}</Badge>}
              </div>
              {c.page_title && <p className="truncate text-xs text-muted-foreground">{c.page_title}</p>}
              <p className="text-[11px] text-muted-foreground">{new Date(c.last_activity_at).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}</p>
            </button>
          ))}
        </Card>
        <Card className="flex max-h-[70vh] flex-col p-3">
          {!current ? (
            <p className="m-auto text-sm text-muted-foreground">Alege o discuție din stânga.</p>
          ) : (
            <>
              <div className="border-b pb-2 text-sm">
                <p className="font-medium">{current.lead?.name || "Vizitator anonim"}{current.lead?.email ? ` · ${current.lead.email}` : ""}</p>
                {current.page_title && (
                  <a href={current.page_url || "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">{current.page_title}</a>
                )}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto py-3">
                {msgs.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap ${m.role === "user" ? "bg-muted text-foreground" : m.role === "agent" ? "bg-primary text-primary-foreground" : "bg-accent/15 text-foreground"}`}>
                      <p className="mb-0.5 text-[10px] font-semibold opacity-70">{m.role === "user" ? "Vizitator" : m.role === "agent" ? "Tu (Andrei)" : "Andrei AI"}</p>
                      {m.content}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="flex gap-2 border-t pt-2">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} maxLength={2000} placeholder="Răspunde vizitatorului ca Andrei…"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
                <Button onClick={send} disabled={busy || !reply.trim()} className="h-12 w-12 shrink-0" aria-label="Trimite răspunsul">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ChatInboxPanel;
