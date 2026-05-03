import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Link2, ArrowRight, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  url: string;
  title: string | null;
  suggested_meta?: string | null;
}

interface Props {
  history: AuditRow[];
}

const urlToPath = (full: string): string => {
  try {
    const u = new URL(full);
    let p = u.pathname.replace(/\/{2,}/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch { return "/"; }
};

export const SEOAutoLinkingPanel = ({ history }: Props) => {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const sources = useMemo(() => {
    const m = new Map<string, AuditRow>();
    history.forEach((a) => { if (!m.has(a.url)) m.set(a.url, a); });
    return Array.from(m.values());
  }, [history]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["seo-internal-link-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_internal_link_suggestions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.functions.invoke("seo-internal-links", {
        body: { action: "update_status", suggestion_id: id, status },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seo-internal-link-suggestions"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const runBulk = async () => {
    setRunning(true);
    const targets = sources.slice(0, 15);
    setProgress({ done: 0, total: targets.length });
    let ok = 0, fail = 0;
    for (let i = 0; i < targets.length; i++) {
      try {
        const a = targets[i];
        const { error } = await supabase.functions.invoke("seo-internal-links", {
          body: {
            action: "suggest",
            source_url_path: urlToPath(a.url),
            source_title: a.title || a.url,
            source_context: a.suggested_meta || "",
          },
        });
        if (error) throw error;
        ok++;
      } catch { fail++; }
      setProgress({ done: i + 1, total: targets.length });
    }
    setRunning(false);
    toast.success(`Auto-linking: ${ok} OK, ${fail} eșuate`);
    qc.invalidateQueries({ queryKey: ["seo-internal-link-suggestions"] });
  };

  return (
    <Card className="border-cyan-200 dark:border-cyan-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-cyan-600" />
          Auto-Internal-Linking AI
          <Badge variant="outline" className="ml-2">{suggestions.length} sugestii</Badge>
        </CardTitle>
        <CardDescription>
          AI propune anchor + țintă pentru linkuri interne contextuale între paginile auditate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runBulk} disabled={running} className="gap-2">
          {running ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Generez {progress.done}/{progress.total}</>
          ) : (
            <><Link2 className="w-4 h-4" /> Generează sugestii ({Math.min(sources.length, 15)} pagini)</>
          )}
        </Button>
        {running && <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />}

        <ScrollArea className="h-64 rounded-md border">
          <ul className="divide-y text-sm">
            {suggestions.map((s: any) => (
              <li key={s.id} className="px-3 py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Badge variant="outline" className="font-normal">{s.source_url_path}</Badge>
                    <ArrowRight className="w-3 h-3" />
                    <Badge variant="outline" className="font-normal">{s.target_url_path}</Badge>
                    {s.relevance_score && <span className="text-muted-foreground">· {s.relevance_score}</span>}
                  </div>
                  <p className="text-sm mt-0.5 truncate">"{s.anchor_text}"</p>
                  {s.reason && <p className="text-xs text-muted-foreground truncate">{s.reason}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  {s.status === "applied" ? (
                    <Badge variant="default" className="gap-1"><CheckCircle2 className="w-3 h-3" /> aplicat</Badge>
                  ) : s.status === "rejected" ? (
                    <Badge variant="secondary">respins</Badge>
                  ) : (
                    <>
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: s.id, status: "applied" })}>
                        <CheckCircle2 className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: s.id, status: "rejected" })}>
                        <X className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
            {suggestions.length === 0 && (
              <li className="px-3 py-4 text-muted-foreground text-center">Nicio sugestie încă.</li>
            )}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
