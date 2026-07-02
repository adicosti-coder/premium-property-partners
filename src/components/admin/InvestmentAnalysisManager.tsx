import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AiEngineLoader } from "@/components/ai/AiEngineLoader";
import { useAiEngine, z } from "@/hooks/useAiEngine";
import {
  TrendingUp, Calendar, Euro, ShieldAlert, CheckCircle2,
  Sparkles, XCircle, Square, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------- Zod schema ----------
const analysisSchema = z.object({
  roi_procentual: z.number(),
  recuperare_investitie_ani: z.number(),
  pret_per_mp: z.number(),
  analiza_piata: z.string(),
  puncte_forte: z.array(z.string()),
  riscuri_potentiale: z.array(z.string()),
});
type Analysis = z.infer<typeof analysisSchema>;

interface FormState {
  nume: string;
  pret: string;
  suprafata: string;
  chirie: string;
  amenajari: string;
}

const DEFAULTS: FormState = {
  nume: "Apartament ISHO",
  pret: "95000",
  suprafata: "52",
  chirie: "550",
  amenajari: "8000",
};

// ---------- Helpers ----------
const roiTone = (roi: number) => {
  if (roi >= 8) return "text-emerald-600 dark:text-emerald-400";
  if (roi >= 5) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
};
const roiBadgeVariant = (roi: number): "default" | "secondary" | "destructive" =>
  roi >= 8 ? "default" : roi >= 5 ? "secondary" : "destructive";

const SYSTEM_PROMPT =
  "Ești un analist imobiliar senior din Timișoara. Răspunzi EXCLUSIV cu JSON valid conform schemei cerute. " +
  "Fără text în afara JSON-ului, fără markdown, fără ```. Toate valorile numerice sunt numere pure (nu string-uri). " +
  "Analiza piață trebuie să fie scurtă (max 3 fraze), specifică zonei Timișoara.";

const buildPrompt = (f: FormState) => `
Analizează următoarea oportunitate de investiție imobiliară în Timișoara și returnează JSON cu structura:
{
  "roi_procentual": number,               // ROI anual net estimat (%)
  "recuperare_investitie_ani": number,    // Ani până la recuperare investiție
  "pret_per_mp": number,                  // €/mp
  "analiza_piata": string,                // 2-3 fraze despre randament în Timișoara
  "puncte_forte": string[],               // 3-5 puncte forte
  "riscuri_potentiale": string[]          // 3-5 riscuri
}

Date proprietate:
- Nume: ${f.nume}
- Preț achiziție: ${f.pret} €
- Suprafață: ${f.suprafata} mp
- Chirie lunară estimată: ${f.chirie} €
- Costuri amenajare: ${f.amenajari} €

Aplică regula RealTrust: deducere 27% (management + taxe), ocupare 75% pentru regim hotelier dacă e cazul.
`.trim();

export default function InvestmentAnalysisManager() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const { run, cancel, loading, streaming, streamingText, error, data } =
    useAiEngine<Analysis>();

  const analysis = data?.json ?? null;

  const setField = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((s) => ({ ...s, [k]: e.target.value }));

  const canSubmit =
    form.nume.trim().length > 0 &&
    Number(form.pret) > 0 &&
    Number(form.suprafata) > 0 &&
    Number(form.chirie) > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await run({
        model: "z-ai/glm-5.2",
        jsonMode: true,
        stream: true,
        schema: analysisSchema,
        systemPrompt: SYSTEM_PROMPT,
        prompt: buildPrompt(form),
        temperature: 0.3,
      });
    } catch {
      /* error state handled by hook */
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Analiză Investiții AI</h2>
          <p className="text-sm text-muted-foreground">
            Estimare ROI, riscuri și puncte forte generate de GLM 5.2, cu date din Timișoara.
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date proprietate</CardTitle>
          <CardDescription>
            Completează parametrii — analiza AI se generează în ~5-15 secunde.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="nume">Nume proprietate</Label>
              <Input id="nume" value={form.nume} onChange={setField("nume")}
                placeholder="Apartament ISHO / Paltim" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pret">Preț achiziție (€)</Label>
              <Input id="pret" type="number" min={0} value={form.pret} onChange={setField("pret")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="suprafata">Suprafață (mp)</Label>
              <Input id="suprafata" type="number" min={0} value={form.suprafata} onChange={setField("suprafata")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chirie">Estimare chirie lunară (€)</Label>
              <Input id="chirie" type="number" min={0} value={form.chirie} onChange={setField("chirie")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amenajari">Costuri amenajare (€)</Label>
              <Input id="amenajari" type="number" min={0} value={form.amenajari} onChange={setField("amenajari")} />
            </div>

            <div className="md:col-span-2 flex items-center gap-3 pt-2">
              <Button type="submit" disabled={!canSubmit || loading} variant="premium">
                <Sparkles className="w-4 h-4" />
                Generează Analiză
              </Button>
              {loading && (
                <Button type="button" variant="outline" onClick={cancel}>
                  <Square className="w-4 h-4" />
                  Oprește
                </Button>
              )}
              {streaming && (
                <span className="text-xs text-muted-foreground">
                  Streaming în curs...
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Eroare la generare</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loader */}
      {loading && !analysis && (
        <Card>
          <CardContent className="pt-6">
            <AiEngineLoader variant="skeleton" label="GLM 5.2 pregătește analiza..." />
            {streamingText && (
              <pre className="mt-4 max-h-40 overflow-auto rounded-md bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                {streamingText}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {analysis && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> ROI anual
                </CardDescription>
                <CardTitle className={cn("text-3xl", roiTone(analysis.roi_procentual))}>
                  {analysis.roi_procentual.toFixed(1)}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress
                  value={Math.min(100, Math.max(0, analysis.roi_procentual * 8))}
                  className="h-2"
                />
                <Badge variant={roiBadgeVariant(analysis.roi_procentual)} className="mt-3">
                  {analysis.roi_procentual >= 8
                    ? "Randament excelent"
                    : analysis.roi_procentual >= 5
                    ? "Randament decent"
                    : "Randament slab"}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Recuperare investiție
                </CardDescription>
                <CardTitle className="text-3xl text-foreground">
                  {analysis.recuperare_investitie_ani.toFixed(1)} ani
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Progress
                  value={Math.min(100, Math.max(0, 100 - analysis.recuperare_investitie_ani * 5))}
                  className="h-2"
                />
                <p className="mt-3 text-xs text-muted-foreground">
                  Ținta RealTrust: 8-12 ani
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Euro className="w-4 h-4" /> Preț / mp
                </CardDescription>
                <CardTitle className="text-3xl text-foreground">
                  {Math.round(analysis.pret_per_mp).toLocaleString("ro-RO")} €
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Piața Timișoara: ~1.500-2.400 €/mp în zonele centrale
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Market analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-primary" /> Analiză piață Timișoara
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">
                {analysis.analiza_piata}
              </p>
            </CardContent>
          </Card>

          {/* Puncte forte + Riscuri */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" /> Puncte forte
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.puncte_forte.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-orange-500/30 bg-orange-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-orange-700 dark:text-orange-400">
                  <ShieldAlert className="w-5 h-5" /> Riscuri potențiale
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.riscuri_potentiale.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-orange-600 dark:text-orange-400" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
