import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, Check, X, RefreshCw, ExternalLink, Ghost } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface QueueItem {
  id: string; phone_normalized: string | null; no_answer_count: number;
  context_summary: string | null; draft_message: string; status: string;
  created_at: string; sent_at: string | null;
}

export default function VoiceAgentGhostingQueue() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("voice_ghosting_queue")
      .select("*").order("created_at", { ascending: false }).limit(50);
    setItems((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const scan = async () => {
    setScanning(true);
    const { data, error } = await supabase.functions.invoke("voice-agent-ghosting-detect", { body: {} });
    setScanning(false);
    if (error || (data as any)?.error) {
      toast({ variant: "destructive", title: "Scanare eșuată", description: (data as any)?.error || error?.message });
      return;
    }
    const d = data as any;
    toast({ title: "👻 Scanare ghosting", description: `${d.flagged} numere flagged · ${d.queued} mesaje în coadă` });
    load();
  };

  const approveSend = async (it: QueueItem) => {
    const msg = edits[it.id] ?? it.draft_message;
    const phone = (it.phone_normalized || "").replace(/[^\d]/g, "");
    if (!phone) { toast({ variant: "destructive", title: "Telefon invalid" }); return; }
    await supabase.from("voice_ghosting_queue").update({
      status: "sent", sent_at: new Date().toISOString(), draft_message: msg,
    }).eq("id", it.id);
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
    toast({ title: "✅ WhatsApp deschis", description: "Mesajul a fost marcat ca trimis" });
    load();
  };

  const reject = async (id: string) => {
    await supabase.from("voice_ghosting_queue").update({ status: "rejected", rejected_reason: "manual_admin" }).eq("id", id);
    toast({ title: "Respins" });
    load();
  };

  const pending = items.filter((i) => i.status === "pending");

  return (
    <div className="space-y-3">
      <Card className="border-amber-500/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-sm flex items-center gap-2">
                <Ghost className="h-4 w-4 text-amber-600" /> Last Chance — Coadă Ghosting
                {pending.length > 0 && <Badge variant="destructive" className="text-[9px]">{pending.length}</Badge>}
              </CardTitle>
              <CardDescription className="text-xs">Lead-uri care nu au răspuns la 3 apeluri consecutive. Mesaj WhatsApp generat AI · necesită aprobare.</CardDescription>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={load} disabled={loading}>
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button size="sm" onClick={scan} disabled={scanning}>
                {scanning ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <MessageCircle className="h-3 w-3 mr-1" />}
                Scanează ghosting
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 && <div className="text-xs text-muted-foreground italic">Nimic în coadă. Apasă "Scanează" pentru a verifica apelurile recente.</div>}
          {items.map((it) => (
            <div key={it.id} className={`border rounded-md p-2 text-xs space-y-2 ${it.status === "pending" ? "bg-amber-500/5 border-amber-500/30" : "opacity-70"}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[9px]">{it.phone_normalized}</Badge>
                  <Badge variant="secondary" className="text-[9px]">{it.no_answer_count}× no-answer</Badge>
                  <Badge className={`text-[9px] ${
                    it.status === "pending" ? "bg-amber-600" :
                    it.status === "sent" ? "bg-emerald-600" :
                    "bg-muted text-muted-foreground"
                  }`}>{it.status}</Badge>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(it.created_at).toLocaleString("ro-RO")}</span>
              </div>
              {it.context_summary && <div className="text-[10px] text-muted-foreground italic line-clamp-2">{it.context_summary}</div>}
              {it.status === "pending" ? (
                <>
                  <Textarea value={edits[it.id] ?? it.draft_message}
                    onChange={(e) => setEdits({ ...edits, [it.id]: e.target.value })}
                    className="text-xs min-h-[80px]" />
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => approveSend(it)}>
                      <Check className="h-3 w-3 mr-1" /> Aprobă & Trimite WhatsApp <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => reject(it.id)}>
                      <X className="h-3 w-3 mr-1" /> Respinge
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-[11px] whitespace-pre-wrap p-2 bg-muted/30 rounded">{it.draft_message}</div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
