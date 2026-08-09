import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2, MinusCircle, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type LogRow = {
  id: string;
  ran_at: string;
  articles_published: number;
  published_slugs: string[] | null;
  indexnow_request_id: number | null;
  indexnow_status: "sent" | "skipped" | "error" | string | null;
  error_message: string | null;
};

type Filter = "all" | "sent" | "skipped" | "error";

const STATUS_META: Record<string, { icon: typeof CheckCircle2; variant: "default" | "secondary" | "destructive"; label: string }> = {
  sent: { icon: CheckCircle2, variant: "default", label: "Trimis" },
  skipped: { icon: MinusCircle, variant: "secondary", label: "Ignorat" },
  error: { icon: AlertTriangle, variant: "destructive", label: "Eroare" },
};

export default function AutoPublishLogsDashboard() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["auto-publish-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auto_publish_logs" as never)
        .select("*")
        .order("ran_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as unknown as LogRow[]) ?? [];
    },
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    return data.filter((r) => (r.indexnow_status ?? "").toLowerCase() === filter);
  }, [data, filter]);

  const counters = useMemo(() => {
    const c = { all: data?.length ?? 0, sent: 0, skipped: 0, error: 0 };
    for (const r of data ?? []) {
      const s = (r.indexnow_status ?? "").toLowerCase();
      if (s in c) (c as any)[s]++;
    }
    return c;
  }, [data]);

  async function retry(row: LogRow) {
    const slugs = row.published_slugs ?? [];
    if (!slugs.length) {
      toast({ title: "Nimic de retrimis", description: "Rularea nu are slug-uri publicate.", variant: "destructive" });
      return;
    }
    setRetryingId(row.id);
    try {
      const urls = slugs.map((s) => `/blog/${s}`);
      const { data: resp, error } = await supabase.functions.invoke("indexnow-notify", {
        body: { urls, triggered_by: `retry:auto_publish_log:${row.id}` },
      });
      if (error) throw error;
      const ok = (resp as any)?.ok !== false;
      toast({
        title: ok ? "Retrimis către IndexNow" : "IndexNow a răspuns cu eroare",
        description: `${urls.length} URL-uri • status ${(resp as any)?.status ?? "?"}`,
        variant: ok ? "default" : "destructive",
      });
      qc.invalidateQueries({ queryKey: ["auto-publish-logs"] });
    } catch (e: any) {
      toast({ title: "Retry eșuat", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setRetryingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-serif">Auto-Publish Logs</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Istoricul rulărilor cronului <code className="text-xs">auto_publish_scheduled_articles()</code> + notificări IndexNow.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "sent", "skipped", "error"] as Filter[]).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f === "all" ? "Toate" : STATUS_META[f]?.label ?? f}
                <Badge variant="secondary" className="ml-2">{counters[f]}</Badge>
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              Nu s-au putut încărca logurile: {(error as Error).message}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Nicio rulare înregistrată pentru filtrul curent.
            </div>
          ) : (
            <div className="space-y-2">
              {rows.map((row) => {
                const status = (row.indexnow_status ?? "unknown").toLowerCase();
                const meta = STATUS_META[status];
                const Icon = meta?.icon ?? MinusCircle;
                const isError = status === "error";
                return (
                  <div
                    key={row.id}
                    className={`rounded-lg border p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3 ${
                      isError ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${
                        status === "sent" ? "text-green-600" :
                        status === "error" ? "text-destructive" :
                        "text-muted-foreground"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={meta?.variant ?? "outline"}>{meta?.label ?? status}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(row.ran_at).toLocaleString("ro-RO")}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            • {row.articles_published} articol{row.articles_published === 1 ? "" : "e"}
                          </span>
                          {row.indexnow_request_id != null && (
                            <span className="text-xs text-muted-foreground font-mono">
                              req#{row.indexnow_request_id}
                            </span>
                          )}
                        </div>
                        {row.published_slugs && row.published_slugs.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {row.published_slugs.map((s) => (
                              <code
                                key={s}
                                className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground truncate max-w-full"
                              >
                                /blog/{s}
                              </code>
                            ))}
                          </div>
                        )}
                        {row.error_message && (
                          <p className="mt-2 text-sm text-destructive break-words">
                            {row.error_message}
                          </p>
                        )}
                      </div>
                    </div>
                    {isError && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={retryingId === row.id || !(row.published_slugs?.length)}
                        onClick={() => retry(row)}
                        className="shrink-0"
                      >
                        {retryingId === row.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Reîncearcă acum
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
