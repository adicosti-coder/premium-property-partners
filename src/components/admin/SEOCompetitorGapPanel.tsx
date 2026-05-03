import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Swords, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const SEOCompetitorGapPanel = () => {
  const [ourPath, setOurPath] = useState("/");
  const [competitors, setCompetitors] = useState("");

  const { data: snapshots = [], refetch } = useQuery({
    queryKey: ["seo-competitor-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_competitor_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const run = useMutation({
    mutationFn: async () => {
      const urls = competitors.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);
      if (urls.length === 0) throw new Error("Adaugă cel puțin un URL competitor");
      const { data, error } = await supabase.functions.invoke("seo-competitor-snapshot", {
        body: { our_url_path: ourPath, competitor_urls: urls },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Snapshot competitori generat");
      refetch();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card className="border-rose-200 dark:border-rose-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-rose-600" />
          Competitor Gap Analysis
          <Badge variant="outline" className="ml-2">{snapshots.length} snapshot-uri</Badge>
        </CardTitle>
        <CardDescription>
          Compară title/meta/H1/schema cu competitorii pentru un URL al nostru. AI extrage gap-urile concrete.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <Input
            placeholder="/path-pagina-noastra"
            value={ourPath}
            onChange={(e) => setOurPath(e.target.value)}
          />
          <Textarea
            placeholder="URL-uri competitori (separate prin virgulă sau enter)"
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
            rows={2}
          />
          <Button onClick={() => run.mutate()} disabled={run.isPending} className="gap-2">
            {run.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
            Analizează
          </Button>
        </div>

        <ScrollArea className="h-64 rounded-md border">
          <ul className="divide-y text-sm">
            {snapshots.map((s: any) => (
              <li key={s.id} className="px-3 py-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <a href={s.competitor_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate hover:underline">
                    <ExternalLink className="w-3 h-3" />
                    <span className="truncate">{s.competitor_label || s.competitor_url}</span>
                  </a>
                  <Badge variant="outline">{s.our_url_path}</Badge>
                </div>
                {s.ai_summary && <p className="text-xs text-muted-foreground">{s.ai_summary}</p>}
                {Array.isArray(s.ai_gaps) && s.ai_gaps.length > 0 && (
                  <ul className="text-xs space-y-0.5 pl-4 list-disc">
                    {s.ai_gaps.slice(0, 4).map((g: any, i: number) => (
                      <li key={i}><b>{g.area}:</b> {g.recommendation || g.issue}</li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {snapshots.length === 0 && (
              <li className="px-3 py-4 text-muted-foreground text-center">Niciun snapshot încă.</li>
            )}
          </ul>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
