import { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Zap,
  Loader2,
  Globe,
  PhoneCall,
  Trash2,
  ArrowRight,
  Settings2,
  CheckCircle2,
  Check,
  PlayCircle,
  AlertTriangle,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Category = "vanzare" | "inchiriere" | "hotelier";
type Route = "site_realtrust" | "andrei_call_queue";
type Sensitivity = "strict" | "normal" | "loose";

interface LogEntry {
  id: string;
  keyword: string;
  category: Category;
  route: Route;
  block_reason: string | null;
  signals: string[];
  tags: string[];
  admin_notes: string;
  confirmed: boolean;
  confirming: boolean;
  duplicate?: boolean;
}

const QUICK_PRESETS: { label: string; query: string; expect: Category }[] = [
  { label: "Vânzare ISHO", query: "apartament vanzare isho timisoara", expect: "vanzare" },
  { label: "Garsonieră Giroc", query: "garsoniera de vanzare giroc", expect: "vanzare" },
  { label: "Bloc vechi Fabric", query: "apartament 3 camere fabric bloc vechi vanzare", expect: "vanzare" },
  { label: "Regim hotelier Cetate", query: "regim hotelier cetate", expect: "hotelier" },
  { label: "Airbnb Timișoara", query: "cazare timisoara airbnb pe noapte", expect: "hotelier" },
  { label: "Închiriere Dumbrăvița", query: "inchiriere apartament dumbravita proprietar", expect: "inchiriere" },
  { label: "Chirie 2 cam Fabric", query: "chirie 2 camere fabric /luna", expect: "inchiriere" },
  { label: "Short-term Iosefin", query: "short-term iosefin nightly", expect: "hotelier" },
];

const HOTELIER_RE: Record<Sensitivity, RegExp> = {
  strict: /(regim\s*hotelier|airbnb|booking\.com)/i,
  normal: /(regim\s*hotelier|short[-\s]?term|nightly|pe\s*noapte|airbnb|booking\.com|cazare\s*timi[șs]oara)/i,
  loose: /(regim\s*hotelier|short[-\s]?term|nightly|pe\s*noapte|airbnb|booking|cazare|noapte)/i,
};
const RENTAL_RE: Record<Sensitivity, RegExp> = {
  strict: /(de\s*inchiriat|de\s*închiriat|\/lun[ăa])/i,
  normal: /(inchiriere|închiriere|chirie|de\s*inchiriat|de\s*închiriat|\/lun[ăa])/i,
  loose: /(inchiriere|închiriere|chirie|chir|rent|lun[ăa])/i,
};

export default function QuickKeywordSimulator() {
  const [keyword, setKeyword] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [detectHotelier, setDetectHotelier] = useState(true);
  const [detectRental, setDetectRental] = useState(true);
  const [sensitivity, setSensitivity] = useState<Sensitivity>("normal");

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [logs]);

  const previewOverride = (term: string): Category | undefined => {
    const blob = term.toLowerCase();
    const hot = HOTELIER_RE[sensitivity].test(blob);
    const ren = RENTAL_RE[sensitivity].test(blob);
    if ((hot && !detectHotelier) || (ren && !detectRental)) return "vanzare";
    return undefined;
  };

  // Live regex preview across all 3 sensitivity levels for the current input
  const sensitivityPreview = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    if (!term) return null;
    return (["strict", "normal", "loose"] as Sensitivity[]).map((lvl) => {
      const hot = term.match(HOTELIER_RE[lvl]);
      const ren = term.match(RENTAL_RE[lvl]);
      let category: Category = "vanzare";
      if (hot) category = "hotelier";
      else if (ren) category = "inchiriere";
      return {
        level: lvl,
        category,
        hotelierMatch: hot?.[0] || null,
        rentalMatch: ren?.[0] || null,
      };
    });
  }, [keyword]);

  const runTest = async (kw?: string) => {
    const term = (kw ?? keyword).trim();
    if (!term) {
      toast({ title: "Introdu un cuvânt-cheie", variant: "destructive" });
      return;
    }
    setRunning(true);
    try {
      const override = previewOverride(term);
      const { data, error } = await supabase.functions.invoke("simulate-prospect-routing", {
        body: {
          samples: [{
            label: term,
            title: term,
            description: term,
            query: term,
            ...(override ? { category_override: override } : {}),
          }],
        },
      });
      if (error) throw error;
      const r = (data as any)?.results?.[0];
      if (!r) throw new Error("Răspuns gol de la simulator");
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        keyword: term,
        category: r.decision.category,
        route: r.decision.route,
        block_reason: r.decision.block_reason,
        signals: r.decision.detection_signals || [],
        tags: r.decision.computed_tags || [],
        admin_notes: r.decision.admin_notes || "",
        confirmed: false,
        confirming: false,
      };
      setLogs((prev) => [entry, ...prev].slice(0, 50));
      if (!kw) setKeyword("");
    } catch (e: any) {
      toast({ title: "Eroare simulare", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const confirmRouting = async (entry: LogEntry) => {
    setLogs((prev) => prev.map((l) => (l.id === entry.id ? { ...l, confirming: true } : l)));
    try {
      // Duplicate check: same keyword + same category already saved via simulator?
      const simTitle = `[SIM] ${entry.keyword}`;
      const { data: existing, error: dupErr } = await supabase
        .from("prospect_listings")
        .select("id")
        .eq("source_platform", "manual-simulator")
        .eq("title", simTitle)
        .eq("category", entry.category)
        .limit(1);
      if (dupErr) throw dupErr;
      if (existing && existing.length > 0) {
        setLogs((prev) =>
          prev.map((l) => (l.id === entry.id ? { ...l, confirming: false, duplicate: true } : l)),
        );
        toast({
          title: "Duplicat detectat",
          description: "Acest keyword + categorie există deja în prospect_listings.",
          variant: "destructive",
        });
        return;
      }

      const fakeUrl = `manual-sim://${entry.id}`;
      const { error } = await supabase.from("prospect_listings").insert({
        source_platform: "manual-simulator",
        source_url: fakeUrl,
        title: simTitle,
        description: `Rutare confirmată manual din Mod Simulare Keyword. Sensibilitate=${sensitivity}, hotelier=${detectHotelier}, inchiriere=${detectRental}.`,
        zone: null,
        category: entry.category,
        status: entry.route === "andrei_call_queue" ? "to_call" : "new",
        admin_notes: `[manual-confirm] ${entry.admin_notes}`,
        tags: [...entry.tags, "manual-simulator-confirm"],
        prospect_type: "proprietar",
      });
      if (error) throw error;
      setLogs((prev) =>
        prev.map((l) => (l.id === entry.id ? { ...l, confirmed: true, confirming: false } : l)),
      );
      toast({
        title: "Rutare confirmată",
        description:
          entry.route === "andrei_call_queue"
            ? "Lead salvat în coada lui Andrei."
            : "Prospect salvat pentru publicare pe realtrust.ro.",
      });
    } catch (e: any) {
      setLogs((prev) => prev.map((l) => (l.id === entry.id ? { ...l, confirming: false } : l)));
      toast({ title: "Eroare la salvare", description: e.message, variant: "destructive" });
    }
  };

  const catBadge = (c: Category) => {
    if (c === "hotelier") return <Badge className="bg-amber-600 text-white hover:bg-amber-600 text-[10px]">hotelier</Badge>;
    if (c === "inchiriere") return <Badge className="bg-orange-600 text-white hover:bg-orange-600 text-[10px]">inchiriere</Badge>;
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[10px]">vanzare</Badge>;
  };

  const routeBadge = (r: Route) =>
    r === "site_realtrust" ? (
      <Badge className="bg-blue-600 text-white hover:bg-blue-600 text-[10px] gap-1">
        <Globe className="h-3 w-3" /> realtrust.ro
      </Badge>
    ) : (
      <Badge className="bg-amber-700 text-white hover:bg-amber-700 text-[10px] gap-1">
        <PhoneCall className="h-3 w-3" /> Call Dashboard Andrei
      </Badge>
    );

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Mod Simulare Keyword
            </CardTitle>
            <CardDescription>
              Testează clasificarea + ruta în mod read-only. Confirmă manual rutarea pentru a o salva în DB (cu protecție anti-duplicat).
            </CardDescription>
          </div>
          <Button
            variant={showSettings ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowSettings((s) => !s)}
          >
            <Settings2 className="h-4 w-4 mr-1" /> Praguri regex
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSettings && (
          <div className="rounded-md border border-dashed border-primary/40 bg-background/60 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="sim-hotelier" className="text-xs cursor-pointer">
                Detectează „regim hotelier"
              </Label>
              <Switch id="sim-hotelier" checked={detectHotelier} onCheckedChange={setDetectHotelier} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sim-rental" className="text-xs cursor-pointer">
                Detectează „închiriere / chirie"
              </Label>
              <Switch id="sim-rental" checked={detectRental} onCheckedChange={setDetectRental} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sensibilitate regex activă</Label>
              <div className="flex gap-1.5">
                {(["strict", "normal", "loose"] as Sensitivity[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSensitivity(s)}
                    className={`flex-1 text-[10px] px-2 py-1 rounded-md border transition ${
                      sensitivity === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Când o categorie e dezactivată dar termenul o sugerează, sistemul forțează „vanzare" via category_override.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !running && runTest()}
            placeholder='ex: "regim hotelier cetate" sau "apartament vanzare isho"'
            className="flex-1"
            disabled={running}
          />
          <Button onClick={() => runTest()} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Rulează Test
          </Button>
        </div>

        {/* Live regex sensitivity preview */}
        {sensitivityPreview && (
          <div className="rounded-md border bg-background/60 p-2.5 space-y-1.5">
            <div className="text-[11px] font-semibold text-muted-foreground">
              🔬 Preview regex pe 3 niveluri (live, fără apel la backend)
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {sensitivityPreview.map((p) => (
                <div
                  key={p.level}
                  className={`rounded border p-1.5 text-[10px] space-y-1 ${
                    p.level === sensitivity ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono uppercase">{p.level}</span>
                    {catBadge(p.category)}
                  </div>
                  {p.hotelierMatch && (
                    <div className="font-mono text-amber-700 dark:text-amber-400 truncate">
                      hotelier: "{p.hotelierMatch}"
                    </div>
                  )}
                  {p.rentalMatch && (
                    <div className="font-mono text-orange-700 dark:text-orange-400 truncate">
                      rental: "{p.rentalMatch}"
                    </div>
                  )}
                  {!p.hotelierMatch && !p.rentalMatch && (
                    <div className="text-muted-foreground">no match → vanzare</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Presets with explicit Test buttons */}
        <div className="space-y-1.5">
          <div className="text-[11px] text-muted-foreground">⚡ Preset-uri rapide (click pe „Test" pentru rulare):</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {QUICK_PRESETS.map((p) => (
              <div
                key={p.query}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background/60 p-1.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium truncate">{p.label}</div>
                  <div className="text-[9px] text-muted-foreground font-mono truncate">{p.query}</div>
                </div>
                {catBadge(p.expect)}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] px-2 shrink-0"
                  onClick={() => runTest(p.query)}
                  disabled={running}
                >
                  <PlayCircle className="h-3 w-3 mr-1" /> Test
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">📋 Live Feed — Istoric simulări (max 50)</h4>
            {logs.length > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setLogs([])} className="h-7 text-xs">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Șterge
              </Button>
            )}
          </div>
          <div
            ref={feedRef}
            className="max-h-[420px] overflow-y-auto space-y-2 rounded-md bg-muted/30 p-2"
          >
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Nu există încă simulări. Rulează un test pentru a vedea rezultatele aici.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-md border bg-background p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted">
                      {log.keyword}
                    </code>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    {catBadge(log.category)}
                    {routeBadge(log.route)}
                    <div className="ml-auto flex items-center gap-1">
                      {log.confirmed ? (
                        <Badge variant="outline" className="text-[10px] gap-1 border-emerald-500 text-emerald-700 dark:text-emerald-400">
                          <Check className="h-3 w-3" /> Salvat în DB
                        </Badge>
                      ) : log.duplicate ? (
                        <Badge variant="outline" className="text-[10px] gap-1 border-amber-500 text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" /> Duplicat
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-[10px] px-2"
                          onClick={() => confirmRouting(log)}
                          disabled={log.confirming}
                        >
                          {log.confirming ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          Confirmă rutare
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    <strong>Decizie:</strong>{" "}
                    {log.block_reason ||
                      "Eligibil pentru publicare automată pe realtrust.ro (categorie vânzare)."}
                  </div>
                  {log.signals.length > 0 && (
                    <div className="text-[10px] flex flex-wrap gap-1">
                      {log.signals.map((s, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-muted/60 font-mono">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
