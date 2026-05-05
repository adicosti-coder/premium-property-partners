import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, Users, RefreshCw, Megaphone } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Cluster {
  id: string; label: string; brief: string; approach_tone: string | null;
  lead_count: number; is_active: boolean; created_at: string;
}

export default function VoiceAgentSmartClusters({ onPickCluster }: { onPickCluster?: (prospectIds: string[], cluster: Cluster) => void }) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("voice_lead_clusters")
      .select("*").eq("is_active", true).order("lead_count", { ascending: false });
    setClusters((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("voice-agent-cluster-leads", { body: { limit: 80, min_score: 40 } });
    setGenerating(false);
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error || error?.message || "necunoscut";
      toast({ variant: "destructive", title: "Grupare eșuată", description: msg.includes("rate") ? "Rate limit AI. Reîncearcă în 1 minut." : msg.includes("credit") ? "Credit AI epuizat." : msg });
      return;
    }
    toast({ title: "🧠 Clustere generate", description: `${(data as any).clusters?.length || 0} grupuri din ${(data as any).total_leads || 0} lead-uri` });
    load();
  };

  const pick = async (c: Cluster) => {
    const { data } = await supabase.from("voice_lead_cluster_assignments")
      .select("prospect_id").eq("cluster_id", c.id);
    const ids = (data || []).map((r: any) => r.prospect_id);
    onPickCluster?.(ids, c);
    toast({ title: `📌 ${c.label}`, description: `${ids.length} lead-uri pre-selectate · brief afișat lui Andrei` });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Smart Clusters
              <Badge variant="secondary" className="text-[9px]">AI</Badge>
            </CardTitle>
            <CardDescription className="text-xs">Grupare automată a lead-urilor pe categorii de abordare. Andrei primește un brief diferit per grup.</CardDescription>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Grupare AI
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {clusters.length === 0 ? (
          <div className="text-xs text-muted-foreground italic">Nu există clustere active. Apasă "Grupare AI" pentru a genera.</div>
        ) : (
          <ScrollArea className="max-h-64">
            <div className="grid sm:grid-cols-2 gap-2">
              {clusters.map((c) => (
                <button key={c.id} onClick={() => pick(c)}
                  className="text-left border rounded-md p-2 hover:border-primary/60 hover:bg-primary/5 transition-colors">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold truncate">{c.label}</span>
                    <Badge variant="outline" className="text-[9px] shrink-0">{c.lead_count}</Badge>
                  </div>
                  <div className="text-[10px] text-muted-foreground line-clamp-3 italic">"{c.brief}"</div>
                  {c.approach_tone && (
                    <div className="mt-1 flex items-center gap-1 text-[9px] text-primary">
                      <Megaphone className="h-2.5 w-2.5" /> {c.approach_tone}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
