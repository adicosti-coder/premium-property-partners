import { useState, useRef, useEffect } from "react";
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
}

const QUICK_PRESETS = [
  "apartament vanzare isho timisoara",
  "regim hotelier cetate",
  "inchiriere apartament dumbravita proprietar",
  "garsoniera de vanzare giroc",
  "cazare timisoara airbnb",
  "chirie 2 camere fabric",
];

// Client-side preview regexes — used to pre-classify before calling the edge function.
// When a category detection is disabled via the settings toggles, we forward
// `category_override: "vanzare"` to the edge function so it reflects the user's setting.
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

  // Settings
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
    // If detection for a matched category is disabled, force vanzare
    if ((hot && !detectHotelier) || (ren && !detectRental)) {
      return "vanzare";
    }
    return undefined;
  };

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
      const fakeUrl = `manual-sim://${entry.id}`;
      const { error } = await supabase.from("prospect_listings").insert({
        source_platform: "manual-simulator",
        source_url: fakeUrl,
        title: `[SIM] ${entry.keyword}`,
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
              Testează clasificarea + ruta în mod read-only. Opțional, confirmă manual rutarea pentru a o salva în DB.
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
              <Label className="text-xs">Sensibilitate regex</Label>
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

        <div className="flex flex-wrap gap-1.5">
          <span className="text-[11px] text-muted-foreground self-center mr-1">Preset-uri:</span>
          {QUICK_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => runTest(p)}
              disabled={running}
              className="text-[10px] px-2 py-1 rounded-md border border-border bg-background/60 hover:bg-accent hover:text-accent-foreground transition disabled:opacity-50"
            >
              {p}
            </button>
          ))}
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
