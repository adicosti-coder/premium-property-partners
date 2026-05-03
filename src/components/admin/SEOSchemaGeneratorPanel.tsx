import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Layers, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  url: string;
  language: string;
  overall_score: number | null;
}

interface OverrideRow {
  url_path: string;
  json_ld: any;
  is_active: boolean;
}

interface Props {
  history: AuditRow[];
  overrides: OverrideRow[];
}

const urlToPath = (full: string): string => {
  try {
    const u = new URL(full);
    let p = u.pathname.replace(/\/{2,}/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch {
    return full.startsWith("/") ? full : "/";
  }
};

export const SEOSchemaGeneratorPanel = ({ history, overrides }: Props) => {
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const overrideMap = useMemo(() => {
    const m = new Map<string, OverrideRow>();
    overrides.forEach((o) => m.set(o.url_path, o));
    return m;
  }, [overrides]);

  // Latest audit per URL — pages without JSON-LD are candidates
  const candidates = useMemo(() => {
    const latest = new Map<string, AuditRow>();
    history.forEach((a) => {
      if (!latest.has(a.url)) latest.set(a.url, a);
    });
    return Array.from(latest.values()).filter((a) => {
      const ov = overrideMap.get(urlToPath(a.url));
      const has = ov?.json_ld && (Array.isArray(ov.json_ld) ? ov.json_ld.length > 0 : Object.keys(ov.json_ld).length > 0);
      return !has;
    });
  }, [history, overrideMap]);

  const totalAudited = useMemo(() => {
    const s = new Set(history.map((h) => h.url));
    return s.size;
  }, [history]);

  const withSchema = totalAudited - candidates.length;

  const generateOne = useMutation({
    mutationFn: async (audit: AuditRow) => {
      const { data, error } = await supabase.functions.invoke("seo-auto-fix", {
        body: { action: "generate_fix", audit_id: audit.id, fix_type: "schema" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const proposal = data.proposal || data;
      const jsonLd = proposal?.json_ld || proposal;
      if (!jsonLd) throw new Error("Schema generată invalidă");
      const { error: applyErr } = await supabase.functions.invoke("seo-auto-fix", {
        body: {
          action: "apply_fix",
          audit_id: audit.id,
          url_path: urlToPath(audit.url),
          fix_type: "schema",
          payload: { json_ld: jsonLd },
        },
      });
      if (applyErr) throw applyErr;
      return audit.url;
    },
    onSuccess: (url) => toast.success(`Schema aplicată: ${url}`),
    onError: (e: any) => toast.error(e.message || "Eroare schema"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["seo-overrides"] }),
  });

  const runBulk = async () => {
    setRunning(true);
    setProgress({ done: 0, total: candidates.length });
    let ok = 0;
    let fail = 0;
    for (let i = 0; i < candidates.length; i++) {
      try {
        await generateOne.mutateAsync(candidates[i]);
        ok++;
      } catch {
        fail++;
      }
      setProgress({ done: i + 1, total: candidates.length });
    }
    setRunning(false);
    toast.success(`Schema bulk: ${ok} aplicate, ${fail} eșuate`);
    qc.invalidateQueries({ queryKey: ["seo-overrides"] });
  };

  return (
    <Card className="border-purple-200 dark:border-purple-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-600" />
          Smart Schema Generator
          <Badge variant="outline" className="ml-2">{withSchema}/{totalAudited} cu schema</Badge>
        </CardTitle>
        <CardDescription>
          Detectează automat tipul paginii (Property / FAQ / LocalBusiness / Article) și generează JSON-LD prin AI, aplicând direct în <code>seo_overrides.json_ld</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={runBulk}
            disabled={running || candidates.length === 0}
            className="gap-2"
          >
            {running ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generez {progress.done}/{progress.total}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generează schema pentru {candidates.length} pagini lipsă
              </>
            )}
          </Button>
          {candidates.length === 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              Toate paginile auditate au schema aplicată
            </span>
          )}
        </div>

        {running && <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />}

        {candidates.length > 0 && (
          <ScrollArea className="h-48 rounded-md border">
            <ul className="divide-y text-sm">
              {candidates.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">{a.url}</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={running || generateOne.isPending}
                    onClick={() => generateOne.mutate(a)}
                  >
                    {generateOne.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Aplică"}
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
