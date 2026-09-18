import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Save, Settings2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const PLATFORMS = ["OLX", "Storia.ro", "imobiliare.ro", "Publi24", "BursaImobiliara.ro"];

const ZONES = [
  "Aradului", "Girocului", "Complex Studențesc", "Iosefin", "Cetate / Centru",
  "Fabric", "Dumbrăvița", "Circumvalațiunii", "Calea Lipovei", "Șagului",
];

interface Config {
  platform: string;
  is_enabled: boolean;
  owner_only: boolean;
  min_price: number | null;
  max_price: number | null;
  min_rooms: number | null;
  max_rooms: number | null;
  zones: string[];
  max_results: number;
  notes: string | null;
}

interface KeywordRow {
  id: string;
  keyword: string;
  is_active: boolean;
}

const emptyConfig = (platform: string): Config => ({
  platform,
  is_enabled: true,
  owner_only: true,
  min_price: null,
  max_price: null,
  min_rooms: null,
  max_rooms: null,
  zones: [],
  max_results: 5,
  notes: null,
});

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

export default function PlatformConfigPanel() {
  const [active, setActive] = useState(PLATFORMS[0]);
  const [configs, setConfigs] = useState<Record<string, Config>>({});
  const [keywords, setKeywords] = useState<KeywordRow[]>([]);
  const [newKeywords, setNewKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);

  const loadConfigs = useCallback(async () => {
    const { data, error } = await supabase
      .from("platform_scan_config")
      .select("platform,is_enabled,owner_only,min_price,max_price,min_rooms,max_rooms,zones,max_results,notes");
    if (error) {
      toast({ title: "Eroare configurări", description: error.message, variant: "destructive" });
      return;
    }
    const map: Record<string, Config> = {};
    for (const p of PLATFORMS) map[p] = emptyConfig(p);
    for (const row of (data || []) as unknown as Config[]) {
      map[row.platform] = { ...emptyConfig(row.platform), ...row, zones: row.zones || [] };
    }
    setConfigs(map);
  }, []);

  const loadKeywords = useCallback(async (platform: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("scraper_search_keywords")
        .select("id,keyword,is_active")
        .eq("platform", platform)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setKeywords((data || []) as KeywordRow[]);
    } catch (e: unknown) {
      toast({
        title: "Eroare cuvinte cheie",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);
  useEffect(() => { loadKeywords(active); }, [active, loadKeywords]);

  const cfg = useMemo(() => configs[active] || emptyConfig(active), [configs, active]);

  const patch = (changes: Partial<Config>) =>
    setConfigs((prev) => ({ ...prev, [active]: { ...(prev[active] || emptyConfig(active)), ...changes } }));

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("platform_scan_config")
        .upsert({ ...cfg, updated_at: new Date().toISOString() }, { onConflict: "platform" });
      if (error) throw error;
      toast({ title: `Setări salvate pentru ${active}` });
    } catch (e: unknown) {
      toast({
        title: "Eroare salvare",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addKeywords = async () => {
    const parts = newKeywords.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
    if (!parts.length) {
      toast({ title: "Câmp gol", description: "Scrie cel puțin un cuvânt cheie.", variant: "destructive" });
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase.from("scraper_search_keywords").insert(
        parts.map((keyword) => ({
          keyword,
          platform: active,
          is_active: true,
          owner_filters: { owner_only: cfg.owner_only, zones: cfg.zones } as never,
        })),
      );
      if (error) throw error;
      toast({ title: `${parts.length} cuvinte cheie adăugate pe ${active}` });
      setNewKeywords("");
      loadKeywords(active);
    } catch (e: unknown) {
      toast({
        title: "Eroare adăugare",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const toggleKeyword = async (row: KeywordRow) => {
    const { error } = await supabase
      .from("scraper_search_keywords")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
      return;
    }
    setKeywords((prev) => prev.map((k) => (k.id === row.id ? { ...k, is_active: !k.is_active } : k)));
  };

  const deleteKeyword = async (row: KeywordRow) => {
    const { error } = await supabase.from("scraper_search_keywords").delete().eq("id", row.id);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
      return;
    }
    setKeywords((prev) => prev.filter((k) => k.id !== row.id));
  };

  const toggleZone = (zone: string) =>
    patch({ zones: cfg.zones.includes(zone) ? cfg.zones.filter((z) => z !== zone) : [...cfg.zones, zone] });

  return (
    <Card className="border-2 border-sky-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-4 w-4 text-sky-600" />
          Configurare pe platformă
        </CardTitle>
        <CardDescription className="text-xs">
          Fiecare platformă are cuvintele ei cheie și filtrele ei (preț, camere, zone, câte anunțuri pe căutare).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={active} onValueChange={setActive} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto justify-start gap-1">
            {PLATFORMS.map((p) => (
              <TabsTrigger key={p} value={p} className="text-xs">
                {p}
                {configs[p] && !configs[p].is_enabled && (
                  <Badge variant="outline" className="ml-1.5 text-[9px]">oprită</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={active} className="mt-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Sursă activă</p>
                  <p className="text-xs text-muted-foreground">Când e oprită, platforma nu mai este scanată.</p>
                </div>
                <Switch
                  checked={cfg.is_enabled}
                  onCheckedChange={(v) => patch({ is_enabled: v })}
                  aria-label={`Activează scanarea pe ${active}`}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Doar proprietari</p>
                  <p className="text-xs text-muted-foreground">Exclude automat anunțurile de agenții.</p>
                </div>
                <Switch
                  checked={cfg.owner_only}
                  onCheckedChange={(v) => patch({ owner_only: v })}
                  aria-label={`Doar proprietari pe ${active}`}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor={`minp-${active}`}>Preț minim (€)</label>
                <Input id={`minp-${active}`} type="number" inputMode="numeric" value={cfg.min_price ?? ""} onChange={(e) => patch({ min_price: numOrNull(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor={`maxp-${active}`}>Preț maxim (€)</label>
                <Input id={`maxp-${active}`} type="number" inputMode="numeric" value={cfg.max_price ?? ""} onChange={(e) => patch({ max_price: numOrNull(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor={`minr-${active}`}>Camere minim</label>
                <Input id={`minr-${active}`} type="number" inputMode="numeric" value={cfg.min_rooms ?? ""} onChange={(e) => patch({ min_rooms: numOrNull(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor={`maxr-${active}`}>Camere maxim</label>
                <Input id={`maxr-${active}`} type="number" inputMode="numeric" value={cfg.max_rooms ?? ""} onChange={(e) => patch({ max_rooms: numOrNull(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground" htmlFor={`maxres-${active}`}>Anunțuri pe căutare</label>
                <Input id={`maxres-${active}`} type="number" inputMode="numeric" value={cfg.max_results} onChange={(e) => patch({ max_results: Math.max(1, Math.min(20, Number(e.target.value) || 5)) })} />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Zone urmărite pe această platformă (gol = toate zonele)</p>
              <div className="flex flex-wrap gap-1.5">
                {ZONES.map((z) => (
                  <Button
                    key={z}
                    type="button"
                    size="sm"
                    variant={cfg.zones.includes(z) ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => toggleZone(z)}
                  >
                    {z}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground" htmlFor={`notes-${active}`}>Observații interne</label>
              <Input id={`notes-${active}`} value={cfg.notes ?? ""} onChange={(e) => patch({ notes: e.target.value })} placeholder="ex: sursă lentă dimineața" />
            </div>

            <Button onClick={saveConfig} disabled={saving} className="min-h-[44px]">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvează setările pentru {active}
            </Button>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Cuvinte cheie pentru {active}</p>
              <Textarea
                value={newKeywords}
                onChange={(e) => setNewKeywords(e.target.value)}
                placeholder={"apartament 2 camere Aradului proprietar\ngarsonieră Iosefin proprietar"}
                rows={3}
                aria-label={`Cuvinte cheie noi pentru ${active}`}
              />
              <Button onClick={addKeywords} disabled={adding} size="sm" className="min-h-[40px]">
                {adding ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Adaugă cuvinte cheie
              </Button>

              {loading ? (
                <p className="text-xs text-muted-foreground">Se încarcă…</p>
              ) : keywords.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nicio căutare salvată pe {active}.</p>
              ) : (
                <div className="divide-y border rounded-md">
                  {keywords.map((k) => (
                    <div key={k.id} className="flex items-center gap-2 p-2 text-xs">
                      <Badge variant={k.is_active ? "secondary" : "outline"} className="text-[10px]">
                        {k.is_active ? "activ" : "oprit"}
                      </Badge>
                      <span className="flex-1 break-all">{k.keyword}</span>
                      <Button variant="ghost" size="sm" onClick={() => toggleKeyword(k)} className="h-8">
                        {k.is_active ? "Oprește" : "Pornește"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteKeyword(k)} aria-label="Șterge cuvântul cheie" className="h-8">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
