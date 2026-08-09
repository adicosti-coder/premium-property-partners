import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, Database, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface KbChunk {
  id: string;
  content: string;
  zone: string | null;
  listing_type: string | null;
  source: string;
  confidence: number;
  refreshed_at: string | null;
  created_at: string;
}

export default function VoiceAgentKnowledgeBase() {
  const [chunks, setChunks] = useState<KbChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; general: number; market: number; portfolio: number }>({
    total: 0, general: 0, market: 0, portfolio: 0,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("voice_agent_knowledge_chunks" as never)
      .select("id, content, zone, listing_type, source, confidence, refreshed_at, created_at")
      .order("refreshed_at", { ascending: false, nullsFirst: false })
      .limit(5);
    setChunks((data as any) || []);

    const { count: total } = await supabase
      .from("voice_agent_knowledge_chunks" as never)
      .select("*", { count: "exact", head: true });
    const { count: general } = await supabase
      .from("voice_agent_knowledge_chunks" as never)
      .select("*", { count: "exact", head: true })
      .eq("source", "general_market");
    const { count: market } = await supabase
      .from("voice_agent_knowledge_chunks" as never)
      .select("*", { count: "exact", head: true })
      .eq("source", "scraper_leads_aggregate");
    const { count: portfolio } = await supabase
      .from("voice_agent_knowledge_chunks" as never)
      .select("*", { count: "exact", head: true })
      .eq("source", "properties_aggregate");
    setStats({ total: total || 0, general: general || 0, market: market || 0, portfolio: portfolio || 0 });

    const { data: latest } = await supabase
      .from("voice_agent_knowledge_chunks" as never)
      .select("refreshed_at")
      .order("refreshed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    setLastSync((latest as any)?.refreshed_at || null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("voice-agent-sync-knowledge", { body: {} });
      if (error) throw error;
      toast({
        title: "Knowledge Base sincronizat",
        description: `${(data as any)?.inserted ?? 0} chunks inserate în ${(data as any)?.ms ?? 0}ms`,
      });
      await load();
    } catch (e: any) {
      toast({ title: "Eroare sync", description: e.message || String(e), variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="border-2 border-primary/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Knowledge Base — Andrei
            </CardTitle>
            <CardDescription>
              Date de piață injectate în prompt-ul lui Andrei la începutul fiecărui apel.
              Cron rulează zilnic la 03:30 — folosește butonul pentru sync imediat.
            </CardDescription>
          </div>
          <Button onClick={triggerSync} disabled={syncing} size="sm">
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync acum
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-muted-foreground text-xs">Total chunks</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-muted-foreground text-xs">Piață (scraper)</div>
            <div className="text-2xl font-bold">{stats.market}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-muted-foreground text-xs">Portofoliu</div>
            <div className="text-2xl font-bold">{stats.portfolio}</div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-muted-foreground text-xs">Fallback general</div>
            <div className="text-2xl font-bold">{stats.general}</div>
          </div>
        </div>

        {lastSync && (
          <p className="text-xs text-muted-foreground">
            Ultimul sync: {new Date(lastSync).toLocaleString("ro-RO")}
          </p>
        )}

        <div>
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Ultimele 5 chunks injectate
          </h4>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : chunks.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Nu există încă date. Apasă "Sync acum".</p>
          ) : (
            <ScrollArea className="h-[280px] pr-2">
              <ul className="space-y-2">
                {chunks.map((c) => (
                  <li key={c.id} className="rounded-md border bg-card p-3 text-sm">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">{c.source}</Badge>
                      {c.zone && <Badge variant="secondary" className="text-xs">{c.zone}</Badge>}
                      {c.listing_type && <Badge variant="secondary" className="text-xs">{c.listing_type}</Badge>}
                      <span className="text-xs text-muted-foreground ml-auto">conf {Math.round((c.confidence || 0) * 100)}%</span>
                    </div>
                    <p className="text-foreground/90 leading-relaxed">{c.content}</p>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
