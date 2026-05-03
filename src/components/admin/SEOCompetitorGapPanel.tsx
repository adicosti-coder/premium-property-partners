import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Swords, ExternalLink, Calendar, Zap, Trash2, TrendingUp, History,
} from "lucide-react";
import { toast } from "sonner";

interface Snapshot {
  id: string;
  our_url_path: string;
  competitor_url: string;
  competitor_label: string | null;
  competitor_title: string | null;
  competitor_meta: string | null;
  competitor_word_count: number | null;
  competitor_schema_types: any;
  ai_gaps: any;
  ai_summary: string | null;
  fetched_at: string;
  created_at: string;
}

interface Schedule {
  id: string;
  our_url_path: string;
  competitor_urls: any;
  frequency: string;
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string;
  last_run_status: string | null;
}

export const SEOCompetitorGapPanel = () => {
  const [ourPath, setOurPath] = useState("/");
  const [competitors, setCompetitors] = useState("");
  const [scheduleFreq, setScheduleFreq] = useState<"daily" | "weekly" | "monthly">("weekly");

  const { data: snapshots = [], refetch: refetchSnaps } = useQuery({
    queryKey: ["seo-competitor-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_competitor_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as Snapshot[];
    },
  });

  const { data: schedules = [], refetch: refetchSched } = useQuery({
    queryKey: ["seo-competitor-schedules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_competitor_schedules")
        .select("*")
        .order("next_run_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Schedule[];
    },
  });

  /* ============ Group: combined overview by our_url_path ============ */
  const grouped = useMemo(() => {
    const map = new Map<string, { path: string; snaps: Snapshot[]; lastFetched: string }>();
    for (const s of snapshots) {
      const cur = map.get(s.our_url_path);
      if (cur) {
        cur.snaps.push(s);
        if (s.fetched_at > cur.lastFetched) cur.lastFetched = s.fetched_at;
      } else {
        map.set(s.our_url_path, { path: s.our_url_path, snaps: [s], lastFetched: s.fetched_at });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.lastFetched.localeCompare(a.lastFetched));
  }, [snapshots]);

  /* ============ Run analysis ============ */
  const run = useMutation({
    mutationFn: async () => {
      const urls = competitors.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);
      if (urls.length === 0) throw new Error("Adaugă cel puțin un URL competitor");
      const { data, error } = await supabase.functions.invoke("seo-competitor-snapshot", {
        body: { our_url_path: ourPath, competitor_urls: urls },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => { toast.success("Snapshot generat"); refetchSnaps(); },
    onError: (e: any) => toast.error(e.message),
  });

  /* ============ Apply gaps directly to seo_overrides ============ */
  const applyGaps = useMutation({
    mutationFn: async (path: string) => {
      const pathSnaps = snapshots.filter((s) => s.our_url_path === path);
      const allGaps = pathSnaps.flatMap((s) => Array.isArray(s.ai_gaps) ? s.ai_gaps : []);
      if (allGaps.length === 0) throw new Error("Niciun gap de aplicat");

      // Aggregate keywords from gaps
      const extra_keywords = allGaps
        .filter((g: any) => g.keyword || g.recommendation)
        .slice(0, 15)
        .map((g: any) => ({
          keyword: (g.keyword || g.area || "").slice(0, 80),
          reason: (g.recommendation || g.issue || "").slice(0, 200),
        }))
        .filter((k) => k.keyword);

      // Best title/meta suggestion from gaps
      const titleGap = allGaps.find((g: any) =>
        /title|titlu/i.test(g.area || "") && g.recommendation
      );
      const metaGap = allGaps.find((g: any) =>
        /meta|descrip/i.test(g.area || "") && g.recommendation
      );

      const { data: userRes } = await supabase.auth.getUser();
      const payload: any = {
        url_path: path,
        extra_keywords,
        applied_by: userRes.user?.id || null,
        applied_at: new Date().toISOString(),
        is_active: true,
      };
      if (titleGap?.recommendation) payload.title = titleGap.recommendation.slice(0, 70);
      if (metaGap?.recommendation) payload.meta_description = metaGap.recommendation.slice(0, 160);

      const { error } = await supabase
        .from("seo_overrides")
        .upsert(payload, { onConflict: "url_path" });
      if (error) throw error;
      return path;
    },
    onSuccess: (p) => toast.success(`Gap-uri aplicate pe ${p}`),
    onError: (e: any) => toast.error(e.message),
  });

  /* ============ Schedule create ============ */
  const createSchedule = useMutation({
    mutationFn: async () => {
      const urls = competitors.split(/[\s,;\n]+/).map((s) => s.trim()).filter(Boolean);
      if (urls.length === 0) throw new Error("Adaugă URL-uri competitori");
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("seo_competitor_schedules").insert({
        our_url_path: ourPath,
        competitor_urls: urls,
        frequency: scheduleFreq,
        next_run_at: new Date().toISOString(),
        created_by: userRes.user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Programare creată"); refetchSched(); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleSchedule = useMutation({
    mutationFn: async (s: Schedule) => {
      const { error } = await supabase
        .from("seo_competitor_schedules")
        .update({ is_active: !s.is_active })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => refetchSched(),
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("seo_competitor_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Programare ștearsă"); refetchSched(); },
  });

  return (
    <Card className="border-rose-200 dark:border-rose-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Swords className="w-5 h-5 text-rose-600" />
          Competitor Gap Analysis
          <Badge variant="outline" className="ml-2">{grouped.length} pagini</Badge>
          <Badge variant="secondary">{schedules.filter((s) => s.is_active).length} programări active</Badge>
        </CardTitle>
        <CardDescription>
          Compară title/meta/H1/schema cu competitorii. Vizualizare combinată, aplicare automată gap-uri și monitorizare programată.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Input row */}
        <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto_auto]">
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
          <div className="flex gap-1">
            <Select value={scheduleFreq} onValueChange={(v: any) => setScheduleFreq(v)}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Zilnic</SelectItem>
                <SelectItem value="weekly">Săptămânal</SelectItem>
                <SelectItem value="monthly">Lunar</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => createSchedule.mutate()}
              disabled={createSchedule.isPending}
              variant="outline"
              className="gap-1"
            >
              <Calendar className="w-4 h-4" />
              Programează
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview"><TrendingUp className="w-4 h-4 mr-1" /> Vedere combinată</TabsTrigger>
            <TabsTrigger value="history"><History className="w-4 h-4 mr-1" /> Istoric ({snapshots.length})</TabsTrigger>
            <TabsTrigger value="schedules"><Calendar className="w-4 h-4 mr-1" /> Programări ({schedules.length})</TabsTrigger>
          </TabsList>

          {/* OVERVIEW: grouped by our_url_path */}
          <TabsContent value="overview">
            <ScrollArea className="h-[420px] rounded-md border">
              <ul className="divide-y text-sm">
                {grouped.map((g) => {
                  const allGaps = g.snaps.flatMap((s) => Array.isArray(s.ai_gaps) ? s.ai_gaps : []);
                  const avgWords = Math.round(
                    g.snaps.reduce((a, s) => a + (s.competitor_word_count || 0), 0) / Math.max(g.snaps.length, 1)
                  );
                  return (
                    <li key={g.path} className="px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="default" className="font-mono text-xs">{g.path}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {g.snaps.length} competitori · ~{avgWords} cuvinte/medie
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="default"
                          disabled={applyGaps.isPending && applyGaps.variables === g.path}
                          onClick={() => applyGaps.mutate(g.path)}
                          className="gap-1"
                        >
                          {applyGaps.isPending && applyGaps.variables === g.path
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Zap className="w-3 h-3" />}
                          Aplică gap-urile
                        </Button>
                      </div>
                      <div className="grid gap-1 pl-1">
                        {g.snaps.slice(0, 3).map((s) => (
                          <a
                            key={s.id}
                            href={s.competitor_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs hover:underline truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{s.competitor_label || s.competitor_url}</span>
                          </a>
                        ))}
                      </div>
                      {allGaps.length > 0 && (
                        <ul className="text-xs space-y-0.5 pl-4 list-disc text-muted-foreground">
                          {allGaps.slice(0, 5).map((g: any, i: number) => (
                            <li key={i}><b className="text-foreground">{g.area}:</b> {g.recommendation || g.issue}</li>
                          ))}
                          {allGaps.length > 5 && <li className="italic">+{allGaps.length - 5} alte gap-uri…</li>}
                        </ul>
                      )}
                    </li>
                  );
                })}
                {grouped.length === 0 && (
                  <li className="px-3 py-6 text-muted-foreground text-center">Niciun snapshot încă.</li>
                )}
              </ul>
            </ScrollArea>
          </TabsContent>

          {/* HISTORY: raw timeline */}
          <TabsContent value="history">
            <ScrollArea className="h-[420px] rounded-md border">
              <ul className="divide-y text-sm">
                {snapshots.map((s) => (
                  <li key={s.id} className="px-3 py-2 space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <a href={s.competitor_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 truncate hover:underline">
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate">{s.competitor_label || s.competitor_url}</span>
                      </a>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">{s.our_url_path}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(s.fetched_at).toLocaleDateString("ro-RO")}
                        </span>
                      </div>
                    </div>
                    {s.ai_summary && <p className="text-xs text-muted-foreground">{s.ai_summary}</p>}
                  </li>
                ))}
                {snapshots.length === 0 && (
                  <li className="px-3 py-6 text-muted-foreground text-center">Istoric gol.</li>
                )}
              </ul>
            </ScrollArea>
          </TabsContent>

          {/* SCHEDULES */}
          <TabsContent value="schedules">
            <ScrollArea className="h-[420px] rounded-md border">
              <ul className="divide-y text-sm">
                {schedules.map((s) => {
                  const urls = Array.isArray(s.competitor_urls) ? s.competitor_urls : [];
                  return (
                    <li key={s.id} className="px-3 py-2 space-y-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant={s.is_active ? "default" : "outline"} className="text-[10px]">
                            {s.frequency}
                          </Badge>
                          <span className="font-mono text-xs truncate">{s.our_url_path}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {urls.length} competitori
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => toggleSchedule.mutate(s)}>
                            {s.is_active ? "Pauză" : "Activează"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteSchedule.mutate(s.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Următoarea: {new Date(s.next_run_at).toLocaleString("ro-RO")}
                        {s.last_run_at && ` · Ultima: ${new Date(s.last_run_at).toLocaleString("ro-RO")} (${s.last_run_status || "—"})`}
                      </div>
                    </li>
                  );
                })}
                {schedules.length === 0 && (
                  <li className="px-3 py-6 text-muted-foreground text-center">
                    Nicio programare. Completează URL-ul tău + competitorii și apasă „Programează".
                  </li>
                )}
              </ul>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
