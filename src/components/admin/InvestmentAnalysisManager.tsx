import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AiEngineLoader } from "@/components/ai/AiEngineLoader";
import { useAiEngine, z } from "@/hooks/useAiEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  TrendingUp, Calendar, Euro, ShieldAlert, CheckCircle2,
  Sparkles, XCircle, Square, BarChart3, FileDown, History, RotateCcw,
  Trash2, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

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

interface HistoryRow {
  id: string;
  nume: string;
  pret: number;
  suprafata: number;
  chirie: number;
  amenajari: number;
  model: string;
  result: Analysis;
  created_at: string;
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
  "roi_procentual": number,
  "recuperare_investitie_ani": number,
  "pret_per_mp": number,
  "analiza_piata": string,
  "puncte_forte": string[],
  "riscuri_potentiale": string[]
}

Date proprietate:
- Nume: ${f.nume}
- Preț achiziție: ${f.pret} €
- Suprafață: ${f.suprafata} mp
- Chirie lunară estimată: ${f.chirie} €
- Costuri amenajare: ${f.amenajari} €

Aplică regula RealTrust: deducere 27% (management + taxe), ocupare 75% pentru regim hotelier.
`.trim();

/** Build 5-year cashflow projection from AI ROI + form data. */
function buildCashflow(analysis: Analysis, form: FormState) {
  const pret = Number(form.pret) || 0;
  const amenajari = Number(form.amenajari) || 0;
  const annualNet = pret * (analysis.roi_procentual / 100);
  const cumulativeInvest = pret + amenajari;
  const rows: Array<{ an: string; net: number; cumulativ: number }> = [];
  let cumul = -cumulativeInvest;
  for (let year = 1; year <= 5; year++) {
    const yearly = Math.round(annualNet * Math.pow(1.03, year - 1));
    cumul += yearly;
    rows.push({ an: `An ${year}`, net: yearly, cumulativ: Math.round(cumul) });
  }
  return rows;
}

const fmtEur = (v: number) =>
  `${Math.round(v).toLocaleString("ro-RO")} €`;

// ---------- Component ----------
export default function InvestmentAnalysisManager() {
  const [form, setForm] = useState<FormState>(DEFAULTS);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"date-desc" | "date-asc" | "roi-desc">("date-desc");
  const [pendingDelete, setPendingDelete] = useState<HistoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const savedIdsRef = useRef<Set<string>>(new Set());

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

  // ---- Load history (strict Zod parse of result JSON) ----
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data: rows, error: err } = await supabase
      .from("investment_analyses")
      .select("id, nume, pret, suprafata, chirie, amenajari, model, result, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    setLoadingHistory(false);
    if (err) {
      toast({ title: "Nu am putut încărca istoricul", description: err.message, variant: "destructive" });
      return;
    }
    const parsed: HistoryRow[] = [];
    for (const r of rows ?? []) {
      const check = analysisSchema.safeParse(r.result);
      if (!check.success) continue; // skip rows with malformed AI result
      parsed.push({
        id: r.id,
        nume: r.nume,
        pret: Number(r.pret),
        suprafata: Number(r.suprafata),
        chirie: Number(r.chirie),
        amenajari: Number(r.amenajari ?? 0),
        model: r.model ?? "z-ai/glm-5.2",
        result: check.data,
        created_at: r.created_at ?? new Date().toISOString(),
      });
    }
    setHistory(parsed);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ---- Persist analysis on completion ----
  useEffect(() => {
    if (!analysis || !data) return;
    const key = `${form.nume}|${form.pret}|${form.chirie}|${data.text.length}`;
    if (savedIdsRef.current.has(key)) return;
    savedIdsRef.current.add(key);

    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const payload = {
        created_by: userRes?.user?.id ?? null,
        nume: form.nume,
        pret: Number(form.pret),
        suprafata: Number(form.suprafata),
        chirie: Number(form.chirie),
        amenajari: Number(form.amenajari) || 0,
        model: data.model,
        result: analysis as unknown as Record<string, number | string | string[]>,
      };
      const { error: insertErr } = await supabase
        .from("investment_analyses")
        .insert([payload]);
      if (insertErr) {
        toast({
          title: "Nu am putut salva analiza",
          description: insertErr.message,
          variant: "destructive",
        });
        return;
      }
      loadHistory();
    })();
  }, [analysis, data, form, loadHistory]);

  // ---- Delete ----
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error: delErr } = await supabase
      .from("investment_analyses")
      .delete()
      .eq("id", pendingDelete.id);
    setDeleting(false);
    if (delErr) {
      toast({ title: "Ștergere eșuată", description: delErr.message, variant: "destructive" });
      return;
    }
    setHistory((h) => h.filter((r) => r.id !== pendingDelete.id));
    toast({ title: "Analiză ștearsă", description: pendingDelete.nume });
    setPendingDelete(null);
  };

  // ---- Filter + sort ----
  const visibleHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? history.filter((r) => r.nume.toLowerCase().includes(q))
      : history.slice();
    filtered.sort((a, b) => {
      if (sortMode === "roi-desc") return b.result.roi_procentual - a.result.roi_procentual;
      const at = new Date(a.created_at).getTime();
      const bt = new Date(b.created_at).getTime();
      return sortMode === "date-asc" ? at - bt : bt - at;
    });
    return filtered;
  }, [history, search, sortMode]);

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
    } catch { /* handled by hook */ }
  };

  const loadFromHistory = (row: HistoryRow) => {
    setForm({
      nume: row.nume,
      pret: String(row.pret),
      suprafata: String(row.suprafata),
      chirie: String(row.chirie),
      amenajari: String(row.amenajari),
    });
    toast({ title: "Analiză reîncărcată", description: row.nume });
  };

  // ---- PDF Export ----
  const exportPdf = async () => {
    if (!reportRef.current || !analysis) return;
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Header (branded)
      pdf.setFillColor(15, 42, 82); // deep blue
      pdf.rect(0, 0, pageW, 22, "F");
      pdf.setTextColor(212, 175, 55); // gold
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("RealTrust", 12, 14);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text("Analiză Investiție Imobiliară — Timișoara", 12, 19);
      pdf.setFontSize(9);
      const dateStr = new Date().toLocaleDateString("ro-RO", {
        year: "numeric", month: "long", day: "numeric",
      });
      pdf.text(dateStr, pageW - 12, 19, { align: "right" });

      // Body image
      const imgW = pageW - 20;
      const imgH = (canvas.height * imgW) / canvas.width;
      const imgData = canvas.toDataURL("image/png");
      let heightLeft = imgH;
      let position = 26;
      pdf.addImage(imgData, "PNG", 10, position, imgW, imgH);
      heightLeft -= pageH - position;

      while (heightLeft > 0) {
        pdf.addPage();
        position = 10 - (imgH - heightLeft);
        pdf.addImage(imgData, "PNG", 10, position, imgW, imgH);
        heightLeft -= pageH;
      }

      // Footer on last page
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        "RealTrust • Investiții imobiliare Timișoara • www.realtrust.ro",
        pageW / 2, pageH - 6, { align: "center" }
      );

      const safeName = form.nume.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
      pdf.save(`analiza-investitie-${safeName}-${Date.now()}.pdf`);
      toast({ title: "PDF generat", description: "Descărcarea a început." });
    } catch (e) {
      toast({
        title: "Eroare la export PDF",
        description: e instanceof Error ? e.message : "Necunoscută",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const cashflow = analysis ? buildCashflow(analysis, form) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Analiză Investiții AI</h2>
          <p className="text-sm text-muted-foreground">
            Estimare ROI, cashflow 5 ani, riscuri și puncte forte — generate de GLM 5.2.
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

            <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
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
              {analysis && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={exportPdf}
                  disabled={exporting}
                >
                  <FileDown className="w-4 h-4" />
                  {exporting ? "Se generează..." : "Exportă PDF"}
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

      {/* Results (wrapped in ref for PDF export) */}
      {analysis && (
        <div ref={reportRef} className="space-y-6 bg-background p-2">
          {/* Report header for PDF context */}
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Proprietate analizată
                </p>
                <h3 className="text-lg font-semibold text-foreground">{form.nume}</h3>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>{Number(form.pret).toLocaleString("ro-RO")} € • {form.suprafata} mp</div>
                <div>Chirie estimată: {Number(form.chirie).toLocaleString("ro-RO")} €/lună</div>
              </div>
            </div>
          </div>

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

          {/* Cashflow chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-primary" /> Cashflow estimat — 5 ani
              </CardTitle>
              <CardDescription>
                Net anual (bară) și cumulativ după investiție inițială (bară secundară).
                Presupune creștere chirie ~3%/an.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashflow} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="an" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(v: number) => fmtEur(v)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="net" name="Net anual" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cumulativ" name="Cumulativ (după investiție)" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

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

      {/* Recent analyses */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="w-5 h-5 text-primary" /> Analize recente
            </CardTitle>
            <CardDescription>
              Ultimele analize salvate. Caută, sortează sau reîncarcă rapid în formular.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={loadHistory} disabled={loadingHistory}>
            <RotateCcw className={cn("w-4 h-4", loadingHistory && "animate-spin")} />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + sort */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Caută după nume proprietate..."
                className="pl-9"
              />
            </div>
            <Select value={sortMode} onValueChange={(v) => setSortMode(v as typeof sortMode)}>
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Sortare" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Cele mai recente</SelectItem>
                <SelectItem value="date-asc">Cele mai vechi</SelectItem>
                <SelectItem value="roi-desc">ROI cel mai mare</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nicio analiză salvată încă.
            </p>
          ) : visibleHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Niciun rezultat pentru „{search}".
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proprietate</TableHead>
                    <TableHead className="text-right">Preț</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">Recuperare</TableHead>
                    <TableHead className="text-right">Data</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleHistory.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.nume}</TableCell>
                      <TableCell className="text-right">{fmtEur(row.pret)}</TableCell>
                      <TableCell className={cn("text-right font-semibold", roiTone(row.result.roi_procentual))}>
                        {row.result.roi_procentual.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {row.result.recuperare_investitie_ani.toFixed(1)} ani
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(row.created_at).toLocaleDateString("ro-RO")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => loadFromHistory(row)}>
                            Reîncarcă
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setPendingDelete(row)}
                            aria-label={`Șterge analiza pentru ${row.nume}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Șterge analiza?</AlertDialogTitle>
            <AlertDialogDescription>
              Analiza pentru <span className="font-medium text-foreground">{pendingDelete?.nume}</span> va fi ștearsă definitiv. Această acțiune nu poate fi anulată.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Se șterge..." : "Șterge"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
