import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type Log = {
  id: string; post_title: string | null; platform: string | null; trigger: string | null;
  success: boolean; http_status: number | null; response_body: string | null; error: string | null;
  image_count: number | null; created_at: string;
};

const TRIGGER: Record<string, string> = { admin_manual: "Manual", cron_job: "Programat (cron)" };

export default function SocialEngineLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("social_engine_logs").select("*").order("created_at", { ascending: false }).limit(200);
    setLogs((data as Log[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Ultimele 200 de trimiteri către Make.com, cu răspunsul primit.</p>
        <Button variant="outline" size="sm" onClick={load} aria-label="Reîncarcă istoricul"><RefreshCw className="h-4 w-4" /></Button>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Se încarcă…</p> : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nicio trimitere către Make.com încă.</p>
      ) : logs.map((l) => (
        <div key={l.id} className="rounded-lg border border-border bg-card p-3 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant={l.success ? "default" : "destructive"}>{l.success ? "Acceptat de Make.com" : "Eroare"}</Badge>
            <span className="font-medium">{l.post_title ?? "—"}</span>
            <span className="text-muted-foreground">· {l.platform} · {TRIGGER[l.trigger ?? ""] ?? l.trigger} · {l.image_count ?? 0} poze</span>
            <span className="ml-auto text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })}</span>
          </div>
          {l.http_status != null && <p className="text-xs text-muted-foreground">HTTP {l.http_status}</p>}
          {l.error && <p className="text-xs text-destructive break-words">{l.error}</p>}
          {l.response_body && <pre className="text-xs bg-muted rounded p-2 whitespace-pre-wrap break-words max-h-32 overflow-auto">{l.response_body}</pre>}
        </div>
      ))}
    </div>
  );
}
