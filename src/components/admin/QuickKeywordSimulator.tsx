import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Zap, Loader2, Globe, PhoneCall, Trash2, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Category = "vanzare" | "inchiriere" | "hotelier";
type Route = "site_realtrust" | "andrei_call_queue";

interface LogEntry {
  id: string;
  keyword: string;
  category: Category;
  route: Route;
  block_reason: string | null;
  signals: string[];
  ts: number;
}

const QUICK_PRESETS = [
  "apartament vanzare isho timisoara",
  "regim hotelier cetate",
  "inchiriere apartament dumbravita proprietar",
  "garsoniera de vanzare giroc",
  "cazare timisoara airbnb",
  "chirie 2 camere fabric",
];

export default function QuickKeywordSimulator() {
  const [keyword, setKeyword] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }, [logs]);

  const runTest = async (kw?: string) => {
    const term = (kw ?? keyword).trim();
    if (!term) {
      toast({ title: "Introdu un cuvânt-cheie", variant: "destructive" });
      return;
    }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-prospect-routing", {
        body: {
          samples: [{ label: term, title: term, description: term, query: term }],
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
        ts: Date.now(),
      };
      setLogs((prev) => [entry, ...prev].slice(0, 50));
      if (!kw) setKeyword("");
    } catch (e: any) {
      toast({ title: "Eroare simulare", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const catBadge = (c: Category) => {
    if (c === "hotelier") return <Badge className="bg-amber-600 text-white text-[10px]">hotelier</Badge>;
    if (c === "inchiriere") return <Badge className="bg-orange-600 text-white text-[10px]">inchiriere</Badge>;
    return <Badge className="bg-emerald-600 text-white text-[10px]">vanzare</Badge>;
  };

  const routeBadge = (r: Route) =>
    r === "site_realtrust" ? (
      <Badge className="bg-blue-600 text-white text-[10px] gap-1">
        <Globe className="h-3 w-3" /> realtrust.ro (Site Public)
      </Badge>
    ) : (
      <Badge className="bg-amber-700 text-white text-[10px] gap-1">
        <PhoneCall className="h-3 w-3" /> Call Dashboard Andrei
      </Badge>
    );

  return (
    <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Mod Simulare Keyword
        </CardTitle>
        <CardDescription>
          Introdu un cuvânt-cheie și vezi instant clasificarea + ruta finală aplicată de sistem.
          Fără scriere în baza de date.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <h4 className="text-sm font-semibold">📋 Live Feed — Istoric simulări</h4>
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
                    <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">
                      {new Date(log.ts).toLocaleTimeString("ro-RO")}
                    </span>
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
