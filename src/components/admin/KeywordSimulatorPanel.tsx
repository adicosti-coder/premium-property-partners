import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, Loader2, Plus, Trash2, ArrowRight, Globe, PhoneCall, ShieldAlert, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SampleInput {
  id: string;
  label: string;
  title: string;
  description: string;
  query: string;
  price: string;
  size: string;
  category_override: string; // "auto" | "vanzare" | "inchiriere" | "hotelier"
}

interface SimulationResult {
  index: number;
  label: string;
  decision: {
    category: "vanzare" | "inchiriere" | "hotelier";
    detection_signals: string[];
    route: "site_realtrust" | "andrei_call_queue";
    blocked_from_publish: boolean;
    block_reason: string | null;
    computed_tags: string[];
    admin_notes: string;
    recruitment_pitch: string | null;
    monthly_extra_est: number | null;
    extra_profit_3y_est: number | null;
  };
}

const PRESETS: Array<Omit<SampleInput, "id">> = [
  {
    label: "Vânzare proprietar — ISHO",
    title: "Apartament 3 camere ISHO, vanzare direct proprietar",
    description: "Vand apartament 3 camere ISHO, etaj 4, 78mp, mobilat lux, fara comision.",
    query: "apartament vanzare isho timisoara",
    price: "145000",
    size: "78",
    category_override: "auto",
  },
  {
    label: "Închiriere clasică — Dumbrăvița",
    title: "Inchiriere apartament 2 camere Dumbravita, direct proprietar",
    description: "Inchiriez apartament 2 camere, 55mp, mobilat, 450 euro/luna.",
    query: "inchiriere apartament dumbravita timisoara",
    price: "450",
    size: "55",
    category_override: "auto",
  },
  {
    label: "Regim hotelier — Centru",
    title: "Apartament regim hotelier Cetate Timisoara, pe noapte",
    description: "Cazare regim hotelier in Cetate, listat Airbnb si Booking.com, 65 euro pe noapte.",
    query: "regim hotelier cetate timisoara airbnb",
    price: "65",
    size: "45",
    category_override: "auto",
  },
];

function makeSample(preset?: Omit<SampleInput, "id">): SampleInput {
  return {
    id: crypto.randomUUID(),
    label: preset?.label || "Sample nou",
    title: preset?.title || "",
    description: preset?.description || "",
    query: preset?.query || "",
    price: preset?.price || "",
    size: preset?.size || "",
    category_override: preset?.category_override || "auto",
  };
}

export default function KeywordSimulatorPanel() {
  const [samples, setSamples] = useState<SampleInput[]>(PRESETS.map((p) => makeSample(p)));
  const [results, setResults] = useState<SimulationResult[] | null>(null);
  const [summary, setSummary] = useState<{ total: number; to_site: number; to_andrei: number } | null>(null);
  const [running, setRunning] = useState(false);

  const updateSample = (id: string, patch: Partial<SampleInput>) => {
    setSamples((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const removeSample = (id: string) => setSamples((prev) => prev.filter((s) => s.id !== id));
  const addSample = () => setSamples((prev) => [...prev, makeSample()]);
  const loadPresets = () => setSamples(PRESETS.map((p) => makeSample(p)));

  const runSimulation = async () => {
    if (samples.length === 0) {
      toast({ title: "Nimic de simulat", description: "Adaugă cel puțin un sample.", variant: "destructive" });
      return;
    }
    setRunning(true);
    try {
      const payload = {
        samples: samples.map((s) => ({
          label: s.label,
          title: s.title,
          description: s.description,
          query: s.query,
          price: s.price ? Number(s.price) : null,
          size: s.size ? Number(s.size) : null,
          category_override: s.category_override === "auto" ? undefined : s.category_override,
        })),
      };
      const { data, error } = await supabase.functions.invoke("simulate-prospect-routing", { body: payload });
      if (error) throw error;
      if (!(data as any)?.success) throw new Error((data as any)?.error || "Simulation failed");
      setResults((data as any).results);
      setSummary((data as any).summary);
      toast({
        title: "Simulare completă",
        description: `${(data as any).summary.to_site} → site • ${(data as any).summary.to_andrei} → Andrei`,
      });
    } catch (e: any) {
      toast({ title: "Eroare simulare", description: e.message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-600" />
          Mod Simulare — Rutare Lead-uri (dry-run)
        </CardTitle>
        <CardDescription>
          Testează fără să scrii în baza de date: introdu cuvinte cheie sau proprietăți demo și vezi în timp real
          unde le-ar trimite sistemul — pe <strong>realtrust.ro</strong> (vânzare) sau în <strong>coada lui Andrei</strong>
          (închiriere / regim hotelier).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={runSimulation} disabled={running} size="sm">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
            Rulează simularea
          </Button>
          <Button onClick={addSample} variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" /> Adaugă sample
          </Button>
          <Button onClick={loadPresets} variant="ghost" size="sm">Reîncarcă preset-uri</Button>
        </div>

        {summary && (
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-2xl font-bold">{summary.total}</div>
              <div className="text-xs text-muted-foreground">Total testate</div>
            </div>
            <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.to_site}</div>
              <div className="text-xs text-muted-foreground">→ realtrust.ro</div>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-center">
              <div className="text-2xl font-bold text-amber-600">{summary.to_andrei}</div>
              <div className="text-xs text-muted-foreground">→ Andrei call queue</div>
            </div>
          </div>
        )}

        {/* Samples editor */}
        <div className="space-y-3">
          {samples.map((s, idx) => {
            const result = results?.find((r) => r.index === idx);
            const routeBlue = result?.decision.route === "site_realtrust";
            return (
              <div key={s.id} className="rounded-lg border bg-background/60 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    value={s.label}
                    onChange={(e) => updateSample(s.id, { label: e.target.value })}
                    className="h-7 text-xs font-semibold flex-1"
                    placeholder="Etichetă sample"
                  />
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                    onClick={() => removeSample(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <Input
                    placeholder="Titlu anunț"
                    value={s.title}
                    onChange={(e) => updateSample(s.id, { title: e.target.value })}
                    className="text-xs"
                  />
                  <Input
                    placeholder="Query origine (ex: regim hotelier cetate)"
                    value={s.query}
                    onChange={(e) => updateSample(s.id, { query: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <Textarea
                  placeholder="Descriere anunț…"
                  value={s.description}
                  onChange={(e) => updateSample(s.id, { description: e.target.value })}
                  rows={2}
                  className="text-xs"
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Preț (EUR)" inputMode="numeric" value={s.price}
                    onChange={(e) => updateSample(s.id, { price: e.target.value.replace(/[^\d.]/g, "") })}
                    className="text-xs" />
                  <Input placeholder="Suprafață (m²)" inputMode="numeric" value={s.size}
                    onChange={(e) => updateSample(s.id, { size: e.target.value.replace(/[^\d.]/g, "") })}
                    className="text-xs" />
                  <Select value={s.category_override} onValueChange={(v) => updateSample(s.id, { category_override: v })}>
                    <SelectTrigger className="text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      <SelectItem value="vanzare">Forțează: vânzare</SelectItem>
                      <SelectItem value="inchiriere">Forțează: închiriere</SelectItem>
                      <SelectItem value="hotelier">Forțează: regim hotelier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {result && (
                  <div className={`rounded-md border-2 p-3 mt-2 ${
                    routeBlue ? "border-blue-500/40 bg-blue-500/5" : "border-amber-500/40 bg-amber-500/5"
                  }`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">
                        Categorie: <span className="ml-1 font-bold">{result.decision.category}</span>
                      </Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      {routeBlue ? (
                        <Badge className="bg-blue-600 text-white text-[10px] gap-1">
                          <Globe className="h-3 w-3" /> realtrust.ro
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-600 text-white text-[10px] gap-1">
                          <PhoneCall className="h-3 w-3" /> Andrei call queue
                        </Badge>
                      )}
                      {result.decision.blocked_from_publish && (
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <ShieldAlert className="h-3 w-3" /> Blocat publicare
                        </Badge>
                      )}
                      {!result.decision.blocked_from_publish && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-green-600/40 text-green-700">
                          <CheckCircle2 className="h-3 w-3" /> Eligibil publicare
                        </Badge>
                      )}
                    </div>

                    <div className="mt-2 space-y-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">Semnale detectate: </span>
                        {result.decision.detection_signals.map((sig, i) => (
                          <code key={i} className="mr-1 px-1 py-0.5 rounded bg-background/80 text-[10px]">{sig}</code>
                        ))}
                      </div>
                      {result.decision.block_reason && (
                        <div className="text-amber-800 dark:text-amber-300">
                          <strong>Motiv blocare:</strong> {result.decision.block_reason}
                        </div>
                      )}
                      {result.decision.recruitment_pitch && (
                        <div className="text-foreground/80">
                          <strong>Pitch Andrei:</strong> {result.decision.recruitment_pitch}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {result.decision.computed_tags.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>
                        ))}
                      </div>
                      {(result.decision.monthly_extra_est || result.decision.extra_profit_3y_est) && (
                        <div className="text-muted-foreground pt-1">
                          Estimare: +{result.decision.monthly_extra_est ?? "—"} €/lună
                          {" • "}+{result.decision.extra_profit_3y_est ?? "—"} € / 3 ani
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground border-t pt-2">
          🛡️ <strong>Defense in depth:</strong> chiar dacă vreun sample „închiriere" sau „regim hotelier" ar trece
          de filtrul SQL, există un al doilea strat de protecție în <code>auto-publish-listings</code> care îl blochează
          definitiv și îl rutează către coada lui Andrei.
        </p>
      </CardContent>
    </Card>
  );
}
