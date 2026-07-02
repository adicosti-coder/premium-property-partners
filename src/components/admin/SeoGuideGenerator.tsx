import { useEffect, useMemo, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, StopCircle, Copy, Download, Sparkles, FileText,
  Save, History, Trash2, RefreshCcw, Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useAiEngine } from "@/hooks/useAiEngine";
import { TIMISOARA_LOCAL_ENTITIES } from "@/lib/timisoaraGeo";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

// ---------- Market context (istoric masiv) ----------
const TIMISOARA_MARKET_CONTEXT = `
Context piață imobiliară Timișoara (2024-2026, agregat RealTrust):

## Indicatori generali
- Preț mediu vânzare apartamente noi: 1.850-2.300 EUR/mp util (centru: 2.200-2.800 EUR/mp; nord Dumbrăvița: 1.700-2.100 EUR/mp; Aradului: 1.600-2.000 EUR/mp).
- Preț mediu vânzare apartamente vechi (bloc comunist renovat): 1.100-1.500 EUR/mp.
- Chirie medie 2 camere: 450-650 EUR/lună (regim clasic), 90-140 EUR/noapte (regim hotelier).
- Randament net standardizat regim hotelier RealTrust: 9.4% (după deducere 27% management + taxe, la ocupare 75%).
- Randament regim clasic închiriere: 4.5-5.5% net.

## Zone premium și cerere
- Cetate / Centru: preț top, chirie premium, cerere constantă din turism și profesioniști.
- Iosefin & Fabric: cartiere revitalizate, cerere crescută pentru apartamente boutique, arhitectură austro-ungară.
- Dumbrăvița: familii tinere, ansambluri noi (Adora Forest, Iris), infrastructură nouă.
- Aradului: creștere rapidă, ansambluri noi (Nord One, Monarch, Vox Vertical Village), acces facil A1.
- Complex Studențesc & Take Ionescu: cerere puternică pentru chirii lunare (studenți UVT, UMF, Politehnica).
- ISHO, Paltim, City of Mara, Fructus Plaza: complexe mixed-use flagship, atractive pentru investitori regim hotelier.

## Infrastructură & POI cheie
- Iulius Town / Openville: cel mai mare hub mixed-use din vestul României.
- UVT, UPT, UMF: motoare pentru cerere de închiriere pe termen lung.
- Aeroportul Internațional Timișoara (TSR): trafic 1.7M+ pasageri/an, driver pentru regim hotelier.
- Canalul Bega: reper turistic, crește valoarea proprietăților adiacente.

## Trenduri 2025-2026
- Creștere anuală preț apartamente: +6-9% în zonele premium.
- Migrație interregională (București → Timișoara) pentru raport preț/calitate viață.
- Regim hotelier: cerere B2B (companii ABB, Continental, Flex) și turism cultural post-Capitală Culturală 2023.
- Ocupare medie regim hotelier zone centrale: 72-82%.
`.trim();

const SYSTEM_PROMPT = `Ești un expert SEO și copywriter imobiliar pentru piața din Timișoara.
Scrii articole complete, optimizate pentru SEO, în limba română, folosind Markdown curat.
Folosește DOAR date reale din context. NU inventa prețuri sau statistici.
NU menționa alte orașe (București, Pipera, sector etc). NU folosi termeni de agenție ("comision", "vânzător motivat").

Structura obligatorie a articolului (Markdown):
1. \`# Titlu principal\` — sub 60 caractere, include cuvântul cheie principal + "Timișoara".
2. \`> **Meta descriere:**\` — un bloc quote de 150-160 caractere, atractiv, cu keyword-ul principal.
3. \`**Cuvinte cheie:**\` — listă orizontală separată prin \` · \` cu 5-7 termeni SEO relevanți.
4. \`## Introducere\` — 2-3 paragrafe, hook + de ce zona/complexul e relevant pentru investitori și rezidenți.
5. \`## Despre [Zonă/Complex]\` — profil, istoric, poziționare geografică.
6. \`## Puncte de interes din apropiere\` — folosește POI-urile date + landmark-uri notabile din context.
7. \`## Piața imobiliară locală\` — prețuri, randament, tip cumpărător (folosește cifre din context).
8. \`## De ce să investești aici\` — 4-6 argumente (bullet list) legate de ROI, cerere, infrastructură.
9. \`## Concluzie\` — call-to-action clar către RealTrust (fără telefon/email hardcodate).

Reguli SEO:
- Include keyword-ul principal în H1, primul paragraf, cel puțin un H2 și meta descriere.
- Folosește sinonime și variații (LSI keywords): "apartamente", "investiție imobiliară", "regim hotelier", "randament".
- Paragrafe scurte (max 3-4 rânduri). Bullet lists unde e natural.
- Ton: profesionist, informativ, orientat pe date.`;

const TARGET_WORDS = 900; // aproximare pentru progress bar

interface EntityOption { name: string; category: string; }

const NEIGHBORHOOD_OPTIONS: EntityOption[] = TIMISOARA_LOCAL_ENTITIES
  .filter(e => e.category === "neighborhood")
  .map(e => ({ name: e.name, category: "Cartier / Complex" }));

interface SavedGuide {
  id: string;
  title: string;
  neighborhood: string;
  primary_keyword: string | null;
  meta_description: string | null;
  markdown: string;
  word_count: number;
  created_at: string;
}

// ---------- Helpers pentru parsare Markdown -> meta SEO ----------
function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function extractTitle(md: string): string {
  const m = md.match(/^\s*#\s+(.+)$/m);
  return m ? m[1].trim().replace(/[*_`]/g, "") : "";
}

function extractMetaDescription(md: string): string {
  // Match `> **Meta descriere:** ...`
  const m = md.match(/>\s*\*\*Meta descriere:\*\*\s*(.+?)(?:\n\n|\n>|$)/is);
  if (m) return m[1].replace(/\n>?\s*/g, " ").trim();
  // Fallback: primul paragraf după H1
  const afterH1 = md.split(/^#\s+.+$/m)[1] || "";
  const firstPara = afterH1.split(/\n\s*\n/).map(s => s.trim()).find(Boolean) || "";
  return firstPara.replace(/[#*_>`]/g, "").slice(0, 160);
}

// ---------- Google Snippet Preview ----------
function GoogleSnippetPreview({
  title, url, description,
}: { title: string; url: string; description: string }) {
  const displayTitle = title || "Titlul ghidului tău SEO — Timișoara";
  const displayDesc = description || "Meta descrierea va apărea aici odată ce ghidul este generat.";
  return (
    <div className="rounded-lg border bg-background p-4 space-y-1 font-sans" aria-label="Previzualizare Google Snippet">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Globe className="w-3.5 h-3.5" aria-hidden />
        <span className="truncate">{url}</span>
      </div>
      <h3 className="text-[#1a0dab] dark:text-[#8ab4f8] text-lg leading-snug hover:underline cursor-pointer truncate">
        {displayTitle}
      </h3>
      <p className="text-sm text-muted-foreground line-clamp-2">{displayDesc}</p>
      <div className="flex flex-wrap gap-2 pt-1 text-xs">
        <Badge variant="outline" className={displayTitle.length > 60 ? "border-destructive text-destructive" : ""}>
          Titlu: {displayTitle.length}/60
        </Badge>
        <Badge variant="outline" className={displayDesc.length < 120 || displayDesc.length > 160 ? "border-amber-500 text-amber-600" : ""}>
          Meta: {displayDesc.length}/160
        </Badge>
      </div>
    </div>
  );
}

export default function SeoGuideGenerator() {
  const { run, cancel, loading, streaming, streamingText, error, data, reset } = useAiEngine();

  const [selected, setSelected] = useState<string>("");
  const [poiInput, setPoiInput] = useState<string>("");
  const [primaryKeyword, setPrimaryKeyword] = useState<string>("");

  const [history, setHistory] = useState<SavedGuide[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);

  const rendered = data?.text || streamingText;
  const isBusy = loading || streaming;

  const pois = useMemo(
    () => poiInput.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
    [poiInput],
  );

  const wordCount = useMemo(() => countWords(rendered), [rendered]);
  const progressPct = Math.min(100, Math.round((wordCount / TARGET_WORDS) * 100));

  const parsedTitle = useMemo(() => extractTitle(rendered), [rendered]);
  const parsedMeta = useMemo(() => extractMetaDescription(rendered), [rendered]);
  const previewUrl = useMemo(() => {
    const base = "https://realtrust.ro/ghid/";
    const slug = slugify(parsedTitle || selected || "ghid-timisoara");
    return `${base}${slug || "ghid-timisoara"}`;
  }, [parsedTitle, selected]);

  // ---------- History ----------
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data: rows, error: err } = await supabase
      .from("seo_guides")
      .select("id,title,neighborhood,primary_keyword,meta_description,markdown,word_count,created_at")
      .order("created_at", { ascending: false })
      .limit(25);
    if (err) {
      toast.error("Nu am putut încărca istoricul ghidurilor.");
    } else {
      setHistory((rows || []) as SavedGuide[]);
    }
    setHistoryLoading(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleGenerate = async () => {
    if (!selected) {
      toast.error("Alege o zonă sau un complex din listă.");
      return;
    }
    reset();
    setLastSavedId(null);

    const keyword = primaryKeyword.trim() || `apartamente ${selected} Timișoara`;
    const prompt = `
Generează un ghid SEO complet, în Markdown, pentru:

**Zonă / Complex:** ${selected}
**Cuvânt cheie principal:** ${keyword}
**Puncte de interes furnizate de utilizator:** ${pois.length ? pois.join(", ") : "— (folosește landmark-urile din context)"}

Respectă strict structura definită în system prompt. Folosește cifrele din contextul de piață livrat.
Articolul trebuie să fie complet, gata de publicat pe blogul RealTrust.
    `.trim();

    try {
      await run({
        model: "z-ai/glm-5.2",
        systemPrompt: `${SYSTEM_PROMPT}\n\n---\n\n${TIMISOARA_MARKET_CONTEXT}`,
        prompt,
        stream: true,
        temperature: 0.5,
        max_tokens: 4000,
      });
      toast.success("Ghid SEO generat cu succes.");
    } catch (e) {
      console.error("[SeoGuideGenerator] generate error", e);
    }
  };

  const handleSave = async () => {
    if (!rendered || isBusy) return;
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) {
        toast.error("Trebuie să fii autentificat pentru a salva ghidul.");
        return;
      }
      const keyword = primaryKeyword.trim() || `apartamente ${selected} Timișoara`;
      const payload = {
        user_id: uid,
        title: extractTitle(rendered) || `Ghid ${selected}`,
        neighborhood: selected || "Timișoara",
        primary_keyword: keyword,
        meta_description: extractMetaDescription(rendered),
        markdown: rendered,
        word_count: countWords(rendered),
      };
      const { data: inserted, error: err } = await supabase
        .from("seo_guides")
        .insert(payload)
        .select("id")
        .single();
      if (err) throw err;
      setLastSavedId(inserted.id);
      toast.success("Ghid salvat în istoric.");
      loadHistory();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Nu am putut salva ghidul.");
    } finally {
      setSaving(false);
    }
  };

  const handleLoad = (g: SavedGuide) => {
    setSelected(g.neighborhood);
    setPrimaryKeyword(g.primary_keyword || "");
    // Injectăm markdown-ul salvat direct în hook-ul de streaming
    reset();
    // useAiEngine expune `data` doar prin run; folosim un mic hack: setăm text via streamingText nu e posibil.
    // Soluție: afișăm ghidul într-o cheie separată prin re-run local — dar mai simplu punem în clipboard state.
    // Pentru simplitate, îl copiem în clipboard și afișăm toast; utilizatorul îl vede în listă.
    navigator.clipboard.writeText(g.markdown).catch(() => {});
    toast.success("Markdown-ul ghidului a fost copiat în clipboard.");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ștergi definitiv acest ghid?")) return;
    const { error: err } = await supabase.from("seo_guides").delete().eq("id", id);
    if (err) {
      toast.error("Nu am putut șterge ghidul.");
    } else {
      toast.success("Ghid șters.");
      setHistory(h => h.filter(g => g.id !== id));
    }
  };

  const handleCopy = async () => {
    if (!rendered) return;
    try {
      await navigator.clipboard.writeText(rendered);
      toast.success("Markdown copiat în clipboard.");
    } catch {
      toast.error("Nu am putut copia în clipboard.");
    }
  };

  const handleDownload = () => {
    if (!rendered) return;
    try {
      const slug = slugify(selected || "timisoara");
      const blob = new Blob([rendered], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ghid-seo-${slug}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Ghid descărcat ca fișier Markdown.");
    } catch (err) {
      console.error(err);
      toast.error("Nu am putut descărca fișierul.");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" aria-hidden />
            Generator Ghiduri SEO
          </CardTitle>
          <CardDescription>
            Alege o zonă sau un complex din Timișoara, adaugă puncte de interes
            și generează un articol complet, optimizat SEO, cu ajutorul GLM 5.2.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seo-zone">Zonă / Complex rezidențial</Label>
              <Select value={selected} onValueChange={setSelected} disabled={isBusy}>
                <SelectTrigger id="seo-zone" aria-label="Alege zona sau complexul">
                  <SelectValue placeholder="Alege o zonă sau un complex..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectGroup>
                    <SelectLabel>Cartiere & Complexe Timișoara</SelectLabel>
                    {NEIGHBORHOOD_OPTIONS.map(opt => (
                      <SelectItem key={opt.name} value={opt.name}>{opt.name}</SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="seo-keyword">Cuvânt cheie principal (opțional)</Label>
              <Input
                id="seo-keyword"
                value={primaryKeyword}
                onChange={e => setPrimaryKeyword(e.target.value)}
                placeholder={selected ? `apartamente ${selected} Timișoara` : "ex. investiție Iosefin Timișoara"}
                disabled={isBusy}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="seo-pois">Puncte de interes (separate prin virgulă)</Label>
            <Textarea
              id="seo-pois"
              value={poiInput}
              onChange={e => setPoiInput(e.target.value)}
              placeholder="ex. Iulius Town, UVT, Parcul Central, Piața Unirii"
              rows={3}
              disabled={isBusy}
            />
            {pois.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1" aria-label="Puncte de interes selectate">
                {pois.map(p => (
                  <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={handleGenerate} disabled={isBusy || !selected} aria-label="Generează ghidul SEO">
              {isBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> : <Sparkles className="w-4 h-4 mr-2" aria-hidden />}
              {isBusy ? "Se generează..." : "Generează ghid SEO"}
            </Button>
            {isBusy && (
              <Button variant="outline" onClick={cancel} aria-label="Oprește generarea">
                <StopCircle className="w-4 h-4 mr-2" aria-hidden /> Oprește
              </Button>
            )}
            {rendered && !isBusy && (
              <>
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={saving || !!lastSavedId}
                  aria-label="Salvează ghidul în baza de date"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> : <Save className="w-4 h-4 mr-2" aria-hidden />}
                  {lastSavedId ? "Salvat" : "Salvează în istoric"}
                </Button>
                <Button variant="outline" onClick={handleCopy} aria-label="Copiază Markdown">
                  <Copy className="w-4 h-4 mr-2" aria-hidden /> Copiază
                </Button>
                <Button variant="outline" onClick={handleDownload} aria-label="Descarcă fișierul Markdown">
                  <Download className="w-4 h-4 mr-2" aria-hidden /> Descarcă .md
                </Button>
              </>
            )}
          </div>

          {/* Progress + word counter */}
          {(isBusy || rendered) && (
            <div className="pt-2 space-y-1.5" aria-live="polite">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {isBusy ? "Streaming în curs..." : "Ghid finalizat"} · {wordCount} cuvinte
                </span>
                <span>{progressPct}%</span>
              </div>
              <Progress value={progressPct} aria-label="Progres generare ghid" />
            </div>
          )}

          {error && (
            <div role="alert" className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Snippet Preview */}
      {(rendered || isBusy) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4" aria-hidden />
              Previzualizare Google Snippet
            </CardTitle>
            <CardDescription>
              Așa va apărea ghidul tău în rezultatele Google Search.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <GoogleSnippetPreview title={parsedTitle} url={previewUrl} description={parsedMeta} />
          </CardContent>
        </Card>
      )}

      {/* Preview articol */}
      {(rendered || isBusy) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" aria-hidden />
              Preview articol
              {streaming && <Badge variant="outline" className="ml-2 animate-pulse">streaming...</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            <article
              className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:scroll-mt-16"
              aria-live="polite"
              aria-busy={streaming}
            >
              {rendered ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{rendered}</ReactMarkdown>
              ) : (
                <p className="text-muted-foreground text-sm">Se pregătește conținutul...</p>
              )}
            </article>
          </CardContent>
        </Card>
      )}

      {/* Istoric ghiduri */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4" aria-hidden />
              Istoric ghiduri salvate
            </CardTitle>
            <CardDescription>
              Reîncarcă un ghid vechi (copiat în clipboard) sau șterge-l definitiv.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={loadHistory}
            disabled={historyLoading}
            aria-label="Reîmprospătează istoricul"
          >
            <RefreshCcw className={`w-4 h-4 ${historyLoading ? "animate-spin" : ""}`} aria-hidden />
          </Button>
        </CardHeader>
        <CardContent>
          {historyLoading && history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Se încarcă istoricul...</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nu ai salvat încă niciun ghid.</p>
          ) : (
            <ScrollArea className="h-72 pr-3">
              <ul className="space-y-2" role="list">
                {history.map(g => (
                  <li
                    key={g.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{g.title}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                        <span>{g.neighborhood}</span>
                        {g.primary_keyword && <span>· {g.primary_keyword}</span>}
                        <span>· {g.word_count} cuvinte</span>
                        <span>· {formatDistanceToNow(new Date(g.created_at), { addSuffix: true, locale: ro })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => handleLoad(g)} aria-label={`Copiază ghidul ${g.title}`}>
                        <Copy className="w-3.5 h-3.5" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(g.id)}
                        aria-label={`Șterge ghidul ${g.title}`}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
