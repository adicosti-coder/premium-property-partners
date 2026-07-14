import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Bot, Zap, RotateCcw, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

type FeedItem = {
  id: string;
  source: "auto_publish" | "indexnow" | "ai_snapshot";
  title: string;
  detail: string;
  status: "success" | "warning" | "error" | "info";
  at: string;
};

const MAX = 50;

export const BlogLiveActivity = () => {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Seed with recent history
    (async () => {
      const [logs, pings, snaps] = await Promise.all([
        supabase.from("auto_publish_logs" as any).select("*").order("ran_at", { ascending: false }).limit(15),
        supabase.from("indexnow_pings" as any).select("*").order("pinged_at", { ascending: false }).limit(15),
        supabase.from("blog_ai_snapshots" as any).select("*").order("created_at", { ascending: false }).limit(15),
      ]);
      const seed: FeedItem[] = [];
      (logs.data as any[] | null)?.forEach((r) => seed.push({
        id: `apl-${r.id}`, source: "auto_publish",
        title: `Auto-publish · ${r.articles_published ?? 0} articole`,
        detail: r.error_message ?? `IndexNow: ${r.indexnow_status}`,
        status: r.error_message ? "error" : (r.articles_published > 0 ? "success" : "info"),
        at: r.ran_at ?? r.created_at,
      }));
      (pings.data as any[] | null)?.forEach((r) => seed.push({
        id: `pin-${r.id}`, source: "indexnow",
        title: `IndexNow · ${r.url_count ?? r.urls?.length ?? 0} URL`,
        detail: `${r.triggered_by ?? "manual"} → ${r.status_code ?? "?"}`,
        status: r.status_code && r.status_code >= 200 && r.status_code < 300 ? "success" : "warning",
        at: r.pinged_at ?? r.created_at,
      }));
      (snaps.data as any[] | null)?.forEach((r) => seed.push({
        id: `snp-${r.id}`, source: "ai_snapshot",
        title: `AI Auto-Pilot · ${(r.confidence_score * 100).toFixed(0)}% încredere`,
        detail: r.rolled_back_at ? "Rollback aplicat" : (r.rationale ?? "Optimizare aplicată"),
        status: r.rolled_back_at ? "warning" : "success",
        at: r.created_at,
      }));
      seed.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      setItems(seed.slice(0, MAX));
    })();

    const channel = supabase
      .channel("blog-live-activity")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "auto_publish_logs" }, (p: any) => {
        const r = p.new;
        setItems((prev) => [{
          id: `apl-${r.id}`, source: "auto_publish",
          title: `Auto-publish · ${r.articles_published ?? 0} articole`,
          detail: r.error_message ?? `IndexNow: ${r.indexnow_status}`,
          status: r.error_message ? "error" : (r.articles_published > 0 ? "success" : "info"),
          at: r.ran_at ?? r.created_at,
        }, ...prev].slice(0, MAX));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "indexnow_pings" }, (p: any) => {
        const r = p.new;
        setItems((prev) => [{
          id: `pin-${r.id}`, source: "indexnow",
          title: `IndexNow · ${r.url_count ?? r.urls?.length ?? 0} URL`,
          detail: `${r.triggered_by ?? "manual"} → ${r.status_code ?? "?"}`,
          status: r.status_code && r.status_code >= 200 && r.status_code < 300 ? "success" : "warning",
          at: r.pinged_at ?? r.created_at,
        }, ...prev].slice(0, MAX));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "blog_ai_snapshots" }, (p: any) => {
        const r = p.new;
        setItems((prev) => [{
          id: `snp-${r.id}-${p.eventType}`, source: "ai_snapshot",
          title: `AI Auto-Pilot · ${(Number(r.confidence_score) * 100).toFixed(0)}% încredere`,
          detail: r.rolled_back_at ? "Rollback aplicat" : (r.rationale ?? "Optimizare aplicată"),
          status: r.rolled_back_at ? "warning" : "success",
          at: r.rolled_back_at ?? r.created_at,
        }, ...prev].slice(0, MAX));
      })
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => { supabase.removeChannel(channel); };
  }, []);

  const iconFor = (s: FeedItem["source"]) => {
    if (s === "auto_publish") return <Zap className="h-4 w-4" />;
    if (s === "indexnow") return <Activity className="h-4 w-4" />;
    return <Bot className="h-4 w-4" />;
  };

  const colorFor = (s: FeedItem["status"]) => {
    if (s === "success") return "text-green-600 bg-green-500/10 border-green-500/30";
    if (s === "warning") return "text-amber-600 bg-amber-500/10 border-amber-500/30";
    if (s === "error") return "text-destructive bg-destructive/10 border-destructive/30";
    return "text-muted-foreground bg-muted border-border";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" />
              Live Activity
            </CardTitle>
            <CardDescription className="text-xs">Auto-Pilot, IndexNow, snapshots — în timp real</CardDescription>
          </div>
          <Badge variant="outline" className="gap-1.5 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-muted-foreground"}`} />
            {connected ? "LIVE" : "OFFLINE"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[520px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="text-center text-xs text-muted-foreground py-8">
              Nicio activitate încă. Feed-ul se actualizează în timp real.
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((it) => (
                <li key={it.id} className="flex gap-3 px-4 py-2.5 text-xs">
                  <div className={`shrink-0 rounded-md border p-1.5 ${colorFor(it.status)}`}>
                    {it.status === "error" ? <AlertCircle className="h-4 w-4" /> : it.source === "ai_snapshot" && it.detail.includes("Rollback") ? <RotateCcw className="h-4 w-4" /> : iconFor(it.source)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{it.title}</div>
                    <div className="text-muted-foreground line-clamp-2">{it.detail}</div>
                    <div className="text-muted-foreground/70 mt-0.5">
                      {formatDistanceToNow(new Date(it.at), { addSuffix: true, locale: ro })}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BlogLiveActivity;
