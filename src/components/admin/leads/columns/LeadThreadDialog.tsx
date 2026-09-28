import { useEffect, useState } from "react";
import { MessagesSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Channel = "chat" | "email" | "note";
interface Item { id: string; who: string; text: string; at: string }

export const LeadThreadDialog = ({ lead }: { lead: { id: string; name: string; email?: string | null } }) => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [hasChat, setHasChat] = useState(false);
  const [channel, setChannel] = useState<Channel>("chat");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data: convs } = await supabase.from("chat_conversations").select("id").eq("lead_id", lead.id);
    const ids = (convs ?? []).map((c) => c.id);
    setHasChat(ids.length > 0);
    const [{ data: msgs }, { data: notes }] = await Promise.all([
      ids.length
        ? supabase.from("chat_messages").select("id, role, content, created_at").in("conversation_id", ids).in("role", ["user", "assistant", "agent"]).order("created_at").limit(200)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("lead_notes").select("id, content, created_at").eq("lead_id", lead.id).order("created_at"),
    ]);
    const list: Item[] = [
      ...(msgs ?? []).filter((m: any) => m.role !== "agent").map((m: any) => ({ id: m.id, who: m.role === "user" ? "Vizitator" : "Andrei (AI)", text: m.content, at: m.created_at })),
      ...(notes ?? []).map((n) => ({ id: n.id, who: "Admin", text: n.content, at: n.created_at })),
    ].sort((a, b) => a.at.localeCompare(b.at));
    setItems(list);
  };

  useEffect(() => { if (open) load(); }, [open]);
  useEffect(() => { if (open && !hasChat && channel === "chat") setChannel(lead.email ? "email" : "note"); }, [hasChat, open]);

  const send = async () => {
    if (!content.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-lead-message", { body: { leadId: lead.id, channel, content } });
    setBusy(false);
    if (error || data?.error) {
      toast.error(data?.message || "Mesajul nu a putut fi trimis");
      return;
    }
    toast.success(channel === "chat" ? "Trimis în chatul vizitatorului" : channel === "email" ? "E-mail trimis" : "Notă salvată");
    setContent("");
    load();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-1 h-8 gap-1 text-xs" aria-label={`Discuție cu ${lead.name}`}>
          <MessagesSquare className="h-3.5 w-3.5" /> Discuție
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Discuție · {lead.name}</DialogTitle></DialogHeader>
        <div className="max-h-80 space-y-2 overflow-y-auto rounded-md border bg-muted/30 p-3">
          {items.length === 0 && <p className="text-xs text-muted-foreground">Nu există încă mesaje.</p>}
          {items.map((i) => (
            <div key={i.id} className="text-xs">
              <span className="font-semibold text-foreground">{i.who}</span>{" "}
              <span className="text-muted-foreground">{new Date(i.at).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}</span>
              <p className="whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">{i.text}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Select value={channel} onValueChange={(v) => setChannel(v as Channel)}>
            <SelectTrigger aria-label="Canal"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="chat" disabled={!hasChat}>Chat vizitator{!hasChat ? " (fără conversație)" : ""}</SelectItem>
              <SelectItem value="email" disabled={!lead.email}>E-mail lead{!lead.email ? " (fără e-mail)" : ""}</SelectItem>
              <SelectItem value="note">Notă internă</SelectItem>
            </SelectContent>
          </Select>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} maxLength={2000} rows={3} placeholder="Scrie mesajul ca Andrei…" />
          <Button onClick={send} disabled={busy || !content.trim()} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Trimite"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
