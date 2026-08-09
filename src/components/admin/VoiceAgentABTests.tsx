import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, Loader2, Play, Square, Trophy, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ABTest {
  id: string; name: string; hypothesis: string | null; status: string; winner: string | null;
  variant_a_script_id: string | null; variant_b_script_id: string | null;
  metrics: any; started_at: string; ended_at: string | null;
}
interface Script { id: string; name: string; }

export default function VoiceAgentABTests({ scripts }: { scripts: Script[] }) {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [name, setName] = useState("Randament vs No-hassle");
  const [hyp, setHyp] = useState("Variant A axat pe randament; B pe lipsa bătăilor de cap.");
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("voice_script_ab_tests")
      .select("*").order("started_at", { ascending: false }).limit(20);
    setTests((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!aId || !bId || aId === bId) {
      toast({ variant: "destructive", title: "Selectează 2 variante diferite" }); return;
    }
    const { error } = await supabase.from("voice_script_ab_tests").insert({
      name, hypothesis: hyp, variant_a_script_id: aId, variant_b_script_id: bId, status: "running",
    });
    if (error) { toast({ variant: "destructive", title: "Eroare", description: error.message }); return; }
    toast({ title: "🧪 Test A/B pornit" });
    load();
  };

  const refreshMetrics = async (id: string, action?: string) => {
    setRefreshing(id);
    const { data, error } = await supabase.functions.invoke("voice-agent-ab-script", { body: { test_id: id, action } });
    setRefreshing(null);
    if (error) { toast({ variant: "destructive", title: "Eroare", description: error.message }); return; }
    toast({ title: action === "stop" ? "Test oprit" : "Metrici actualizate", description: `Câștigător: ${(data as any).winner || "—"}` });
    load();
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" /> A/B Test scripturi (live)
            </CardTitle>
            <CardDescription className="text-xs">Compară 2 variante prompt — Scheduled, sentiment, durată, success rate ponderat.</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-2 p-2 border rounded-md bg-muted/20">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nume test" className="h-8 text-xs" />
          <Input value={hyp} onChange={(e) => setHyp(e.target.value)} placeholder="Ipoteză" className="h-8 text-xs" />
          <Select value={aId} onValueChange={setAId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Variant A" /></SelectTrigger>
            <SelectContent>{scripts.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={bId} onValueChange={setBId}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Variant B" /></SelectTrigger>
            <SelectContent>{scripts.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" onClick={create} className="sm:col-span-2">
            <Play className="h-3 w-3 mr-1" /> Pornește test A/B
          </Button>
        </div>

        {tests.length === 0 && <div className="text-xs text-muted-foreground italic">Niciun test rulat încă.</div>}
        {tests.map((t) => {
          const m = t.metrics || {};
          const a = m.variant_a || {}; const b = m.variant_b || {};
          const aName = scripts.find((s) => s.id === t.variant_a_script_id)?.name || "A";
          const bName = scripts.find((s) => s.id === t.variant_b_script_id)?.name || "B";
          return (
            <div key={t.id} className="border rounded-md p-2 text-xs space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t.name}</span>
                  <Badge className={`text-[9px] ${t.status === "running" ? "bg-emerald-600" : "bg-muted text-muted-foreground"}`}>{t.status}</Badge>
                  {t.winner && <Badge className="text-[9px] bg-amber-600"><Trophy className="h-2.5 w-2.5 mr-0.5" />{t.winner}</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => refreshMetrics(t.id)} disabled={refreshing === t.id}>
                    {refreshing === t.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  </Button>
                  {t.status === "running" && (
                    <Button size="sm" variant="outline" onClick={() => refreshMetrics(t.id, "stop")}>
                      <Square className="h-3 w-3 mr-1" /> Oprește
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: aName, d: a, key: "A", win: t.winner === "A" || m.winner === "A" },
                  { name: bName, d: b, key: "B", win: t.winner === "B" || m.winner === "B" },
                ].map((v) => (
                  <div key={v.key} className={`border rounded p-2 ${v.win ? "border-amber-500 bg-amber-500/5" : ""}`}>
                    <div className="font-semibold text-[11px] mb-1 truncate">{v.key}: {v.name}</div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <span className="text-muted-foreground">Apeluri</span><span className="text-right font-mono">{v.d.calls ?? 0}</span>
                      <span className="text-muted-foreground">Scheduled</span><span className="text-right font-mono">{v.d.scheduled ?? 0}</span>
                      <span className="text-muted-foreground">Success %</span><span className="text-right font-mono">{v.d.success_rate ?? 0}%</span>
                      <span className="text-muted-foreground">Sentiment</span><span className="text-right font-mono">{v.d.sentiment_avg ?? 0}/10</span>
                      <span className="text-muted-foreground">Durată med.</span><span className="text-right font-mono">{v.d.avg_duration ?? 0}s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
