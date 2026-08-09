import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radar, Loader2, Plus, Trash2, Globe } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SourceRow {
  id: string;
  keyword: string;
  platform: string | null;
  is_active: boolean;
  created_at: string;
}

const PLATFORM_OPTIONS = [
  "Facebook Groups",
  "Facebook Marketplace",
  "OLX",
  "Storia.ro",
  "imobiliare.ro",
  "Publi24",
  "BursaImobiliara.ro",
  "Custom",
];

export default function KeywordRadarPanel() {
  const [running, setRunning] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newPlatform, setNewPlatform] = useState<string>("Custom");
  const [adding, setAdding] = useState(false);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSources = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scraper_search_keywords")
        .select("id,keyword,platform,is_active,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setSources((data || []) as SourceRow[]);
    } catch (e: any) {
      toast({ title: "Eroare", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSources(); }, [loadSources]);

  const runDiscover = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("keyword-radar-discover", {
        body: { source: "admin_manual" },
      });
      if (error) throw error;
      const added = (data as any)?.added ?? (data as any)?.new_keywords ?? (data as any)?.count ?? "—";
      toast({
        title: "Keyword Radar rulat",
        description: `Cuvinte cheie noi descoperite: ${added}`,
      });
      loadSources();
    } catch (e: any) {
      toast({ title: "Eroare Keyword Radar", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const addSource = async () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) {
      toast({ title: "Câmp gol", description: "Adaugă un URL sau o frază de căutare.", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("scraper_search_keywords").insert({
        keyword: trimmed,
        platform: newPlatform,
        is_active: true,
      });
      if (error) throw error;
      toast({ title: "Sursă adăugată", description: `${newPlatform}: ${trimmed.slice(0, 60)}` });
      setNewKeyword("");
      loadSources();
    } catch (e: any) {
      toast({ title: "Eroare adăugare", description: e.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const toggleSource = async (row: SourceRow) => {
    try {
      const { error } = await supabase
        .from("scraper_search_keywords")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);
      if (error) throw error;
      loadSources();
    } catch (e: any) {
      toast({ title: "Eroare", description: e.message, variant: "destructive" });
    }
  };

  const deleteSource = async (row: SourceRow) => {
    try {
      const { error } = await supabase.from("scraper_search_keywords").delete().eq("id", row.id);
      if (error) throw error;
      setSources(prev => prev.filter(s => s.id !== row.id));
      toast({ title: "Sursă ștearsă" });
    } catch (e: any) {
      toast({ title: "Eroare", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radar className="h-5 w-5 text-blue-600" />
          Extindere Radare & Cuvinte Cheie
        </CardTitle>
        <CardDescription>
          Generează unghiuri noi de căutare pentru zonele premium din Timișoara sau adaugă manual surse (grupuri Facebook, platforme locale).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Discover button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-background/50">
          <div className="flex-1">
            <div className="font-medium text-sm">Descoperire automată cuvinte cheie</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Analizează onsite + GSC + proprietăți + zone și generează unghiuri noi pentru OLX/Storia/imobiliare.
            </p>
          </div>
          <Button onClick={runDiscover} disabled={running} className="shrink-0">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Radar className="h-4 w-4 mr-2" />}
            Rulează Descoperire Cuvinte Cheie
          </Button>
        </div>

        {/* Add manual source */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Adaugă manual sursă / URL</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={newPlatform} onValueChange={setNewPlatform}>
              <SelectTrigger className="sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder='ex: site:facebook.com/groups/12345 "proprietar" OR https://...'
              value={newKeyword}
              onChange={e => setNewKeyword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addSource(); }}
              className="flex-1"
            />
            <Button onClick={addSource} disabled={adding} variant="default">
              {adding ? <Loader2 className="h-4 w-4" /> : <Plus className="h-4 w-4 mr-1" />}
              Adaugă
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Acceptă query Google (cu <code>site:</code>), URL direct la grup Facebook, sau frază de căutare. Devine activ imediat în următorul scan.
          </p>
        </div>

        {/* Sources list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4" /> Surse active recente
              <Badge variant="outline">{sources.length}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={loadSources} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "↻"}
            </Button>
          </div>
          <div className="border rounded-lg divide-y max-h-[320px] overflow-y-auto">
            {sources.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Nicio sursă încă.</div>
            ) : sources.map(s => (
              <div key={s.id} className="flex items-center gap-2 p-2 hover:bg-accent/30">
                <Badge variant={s.is_active ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {s.platform || "—"}
                </Badge>
                <code className="text-xs flex-1 truncate" title={s.keyword}>{s.keyword}</code>
                <Button size="sm" variant="ghost" onClick={() => toggleSource(s)} className="h-7 text-xs">
                  {s.is_active ? "Dezactivează" : "Activează"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteSource(s)} className="h-7 w-7 p-0 text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
