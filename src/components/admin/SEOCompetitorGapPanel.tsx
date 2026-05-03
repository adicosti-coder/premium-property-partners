import { useEffect, useMemo, useState } from "react";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Loader2, Swords, ExternalLink, Calendar, Zap, Trash2, TrendingUp, History, LineChart as LineIcon, Eye, X, Plus, Download, Flag,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Scatter, ReferenceLine,
} from "recharts";

/* ============ CSV helpers ============ */
const csvEscape = (v: any): string => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};
const downloadCSV = (filename: string, rows: Record<string, any>[]) => {
  if (rows.length === 0) { toast.error("Nimic de exportat"); return; }
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => { Object.keys(r).forEach((k) => set.add(k)); return set; }, new Set<string>())
  );
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

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

interface OurSnapshot {
  url: string;
  overall_score: number;
  created_at: string;
}

interface EditableKeyword { keyword: string; reason: string; }
interface PreviewState {
  path: string;
  title: string;
  meta_description: string;
  keywords: EditableKeyword[];
}

/** Derive a 0–100 "completeness" score for a competitor snapshot. */
const competitorScore = (s: Snapshot): number => {
  let score = 0;
  if (s.competitor_title && s.competitor_title.length >= 20) score += 25;
  if (s.competitor_meta && s.competitor_meta.length >= 60) score += 25;
  if ((s.competitor_word_count || 0) >= 400) score += 25;
  const schemas = Array.isArray(s.competitor_schema_types) ? s.competitor_schema_types : [];
  if (schemas.length > 0) score += 25;
  return score;
};

export const SEOCompetitorGapPanel = () => {
  const [ourPath, setOurPath] = useState("/");
  const [competitors, setCompetitors] = useState("");
  const [scheduleFreq, setScheduleFreq] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [trendPath, setTrendPath] = useState<string>("");

  const { data: snapshots = [], refetch: refetchSnaps } = useQuery({
    queryKey: ["seo-competitor-snapshots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_competitor_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
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

  const { data: ourSnaps = [] } = useQuery({
    queryKey: ["seo-audit-snapshots-trend"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_audit_snapshots")
        .select("url,overall_score,created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data || []) as OurSnapshot[];
    },
  });

  const { data: overrideEvents = [] } = useQuery({
    queryKey: ["seo-override-history-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_override_history")
        .select("url_path,applied_at,version_number,change_type,score_before,score_after,notes")
        .order("applied_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as Array<{
        url_path: string; applied_at: string; version_number: number;
        change_type: string; score_before: number | null; score_after: number | null; notes: string | null;
      }>;
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

  // Default trend selection to first available path
  useEffect(() => {
    if (!trendPath && grouped.length > 0) setTrendPath(grouped[0].path);
  }, [grouped, trendPath]);

  /* ============ Trend dataset for selected path ============ */
  const trendData = useMemo(() => {
    if (!trendPath) return [];
    // Aggregate competitor score per day
    const byDay = new Map<string, { day: string; competitorScores: number[]; ourScores: number[] }>();
    const ensure = (day: string) => {
      let row = byDay.get(day);
      if (!row) { row = { day, competitorScores: [], ourScores: [] }; byDay.set(day, row); }
      return row;
    };

    for (const s of snapshots) {
      if (s.our_url_path !== trendPath) continue;
      const day = new Date(s.fetched_at).toISOString().slice(0, 10);
      ensure(day).competitorScores.push(competitorScore(s));
    }
    // Match our audits by url path suffix
    for (const o of ourSnaps) {
      try {
        const u = new URL(o.url);
        if (u.pathname !== trendPath) continue;
      } catch {
        if (!o.url.endsWith(trendPath)) continue;
      }
      const day = new Date(o.created_at).toISOString().slice(0, 10);
      ensure(day).ourScores.push(o.overall_score || 0);
    }

    return Array.from(byDay.values())
      .sort((a, b) => a.day.localeCompare(b.day))
      .map((r) => {
        const ourAvg = r.ourScores.length
          ? Math.round(r.ourScores.reduce((a, b) => a + b, 0) / r.ourScores.length)
          : null;
        const compAvg = r.competitorScores.length
          ? Math.round(r.competitorScores.reduce((a, b) => a + b, 0) / r.competitorScores.length)
          : null;
        const evs = overrideEvents.filter(
          (e) => e.url_path === trendPath && e.applied_at.slice(0, 10) === r.day
        );
        return {
          day: r.day,
          Noi: ourAvg,
          Competitori: compAvg,
          Eveniment: evs.length > 0 ? (ourAvg ?? compAvg ?? 50) : null,
          eventCount: evs.length,
          eventNotes: evs.map((e) => `v${e.version_number} (${e.change_type})${e.notes ? ": " + e.notes : ""}`).join(" · "),
        };
      });
  }, [snapshots, ourSnaps, overrideEvents, trendPath]);

  const pathEvents = useMemo(
    () => overrideEvents.filter((e) => e.url_path === trendPath),
    [overrideEvents, trendPath]
  );

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

  /* ============ Build preview from gaps (no DB write) ============ */
  const openPreview = (path: string) => {
    const pathSnaps = snapshots.filter((s) => s.our_url_path === path);
    const allGaps = pathSnaps.flatMap((s) => Array.isArray(s.ai_gaps) ? s.ai_gaps : []);
    if (allGaps.length === 0) { toast.error("Niciun gap de aplicat"); return; }

    const titleGap = allGaps.find((g: any) => /title|titlu/i.test(g.area || "") && g.recommendation);
    const metaGap = allGaps.find((g: any) => /meta|descrip/i.test(g.area || "") && g.recommendation);

    const seen = new Set<string>();
    const keywords: EditableKeyword[] = [];
    for (const g of allGaps) {
      const kw = ((g.keyword || g.area || "") as string).trim().slice(0, 80);
      if (!kw) continue;
      const key = kw.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      keywords.push({ keyword: kw, reason: ((g.recommendation || g.issue || "") as string).slice(0, 200) });
      if (keywords.length >= 15) break;
    }

    setPreview({
      path,
      title: (titleGap?.recommendation || "").slice(0, 70),
      meta_description: (metaGap?.recommendation || "").slice(0, 160),
      keywords,
    });
  };

  /* ============ Apply edited preview to seo_overrides ============ */
  const applyPreview = useMutation({
    mutationFn: async (p: PreviewState) => {
      const { data: userRes } = await supabase.auth.getUser();
      const payload: any = {
        url_path: p.path,
        extra_keywords: p.keywords.filter((k) => k.keyword.trim()),
        applied_by: userRes.user?.id || null,
        applied_at: new Date().toISOString(),
        is_active: true,
      };
      if (p.title.trim()) payload.title = p.title.trim().slice(0, 70);
      if (p.meta_description.trim()) payload.meta_description = p.meta_description.trim().slice(0, 160);

      const { error } = await supabase
        .from("seo_overrides")
        .upsert(payload, { onConflict: "url_path" });
      if (error) throw error;
      return p.path;
    },
    onSuccess: (p) => { toast.success(`Override aplicat pe ${p}`); setPreview(null); },
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
          Compară cu competitorii, previzualizează &amp; editează gap-urile înainte de aplicare, monitorizează evoluția în timp.
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
            <TabsTrigger value="trends"><LineIcon className="w-4 h-4 mr-1" /> Trends</TabsTrigger>
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
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { setTrendPath(g.path); }}
                            className="gap-1"
                          >
                            <LineIcon className="w-3 h-3" />
                            Trend
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => openPreview(g.path)}
                            className="gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Previzualizează &amp; aplică
                          </Button>
                        </div>
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

          {/* TRENDS */}
          <TabsContent value="trends">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Pagina:</Label>
                <Select value={trendPath} onValueChange={setTrendPath}>
                  <SelectTrigger className="w-[280px]"><SelectValue placeholder="Alege pagina" /></SelectTrigger>
                  <SelectContent>
                    {grouped.map((g) => (
                      <SelectItem key={g.path} value={g.path}>{g.path}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  Scor competitor = title + meta + word_count + schema (0–100). Scorul nostru vine din auditele SEO.
                </span>
              </div>
              <div className="h-[360px] rounded-md border p-3">
                {trendData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Nicio dată pentru această pagină. Rulează cel puțin o programare sau un audit.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 20, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Noi" stroke="hsl(var(--primary))" strokeWidth={2} connectNulls dot />
                      <Line type="monotone" dataKey="Competitori" stroke="hsl(0 70% 55%)" strokeWidth={2} connectNulls dot />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
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

      {/* Preview & Edit Dialog */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" /> Previzualizare gap-uri pentru <code className="text-xs">{preview?.path}</code>
            </DialogTitle>
            <DialogDescription>
              Editează textul înainte de a fi salvat în <code>seo_overrides</code>.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs flex justify-between">
                  <span>Title</span>
                  <span className="text-muted-foreground">{preview.title.length}/70</span>
                </Label>
                <Input
                  value={preview.title}
                  maxLength={70}
                  onChange={(e) => setPreview({ ...preview, title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex justify-between">
                  <span>Meta description</span>
                  <span className="text-muted-foreground">{preview.meta_description.length}/160</span>
                </Label>
                <Textarea
                  value={preview.meta_description}
                  rows={3}
                  maxLength={160}
                  onChange={(e) => setPreview({ ...preview, meta_description: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex justify-between">
                  <span>Keywords ({preview.keywords.length})</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 gap-1"
                    onClick={() => setPreview({
                      ...preview,
                      keywords: [...preview.keywords, { keyword: "", reason: "" }],
                    })}
                  >
                    <Plus className="w-3 h-3" /> Adaugă
                  </Button>
                </Label>
                <ScrollArea className="h-[220px] rounded border">
                  <ul className="divide-y">
                    {preview.keywords.map((k, i) => (
                      <li key={i} className="p-2 grid gap-1 sm:grid-cols-[1fr_2fr_auto] items-start">
                        <Input
                          placeholder="keyword"
                          value={k.keyword}
                          onChange={(e) => {
                            const kws = [...preview.keywords];
                            kws[i] = { ...k, keyword: e.target.value.slice(0, 80) };
                            setPreview({ ...preview, keywords: kws });
                          }}
                        />
                        <Input
                          placeholder="motivație / context"
                          value={k.reason}
                          onChange={(e) => {
                            const kws = [...preview.keywords];
                            kws[i] = { ...k, reason: e.target.value.slice(0, 200) };
                            setPreview({ ...preview, keywords: kws });
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setPreview({
                            ...preview,
                            keywords: preview.keywords.filter((_, idx) => idx !== i),
                          })}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </li>
                    ))}
                    {preview.keywords.length === 0 && (
                      <li className="p-3 text-xs text-muted-foreground text-center">Niciun keyword.</li>
                    )}
                  </ul>
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreview(null)}>Anulează</Button>
            <Button
              onClick={() => preview && applyPreview.mutate(preview)}
              disabled={applyPreview.isPending}
              className="gap-1"
            >
              {applyPreview.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              Aplică în seo_overrides
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
