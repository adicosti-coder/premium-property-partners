import { useMemo, useState } from "react";
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
import { Loader2, StopCircle, Copy, Download, Sparkles, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAiEngine } from "@/hooks/useAiEngine";
import { TIMISOARA_LOCAL_ENTITIES } from "@/lib/timisoaraGeo";

// ---------- Market context (istoric masiv) ----------
// Trimis ca system prompt către GLM 5.2. Concentrat, structurat pe zone
// și indicatori pe care GLM îi poate cita direct în articolul generat.
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

interface EntityOption {
  name: string;
  category: string;
}

const NEIGHBORHOOD_OPTIONS: EntityOption[] = TIMISOARA_LOCAL_ENTITIES
  .filter(e => e.category === "neighborhood")
  .map(e => ({ name: e.name, category: "Cartier / Complex" }));

export default function SeoGuideGenerator() {
  const { run, cancel, loading, streaming, streamingText, error, data, reset } = useAiEngine();

  const [selected, setSelected] = useState<string>("");
  const [poiInput, setPoiInput] = useState<string>("");
  const [primaryKeyword, setPrimaryKeyword] = useState<string>("");

  const rendered = data?.text || streamingText;
  const isBusy = loading || streaming;

  const pois = useMemo(
    () => poiInput.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
    [poiInput],
  );

  const handleGenerate = async () => {
    if (!selected) {
      toast.error("Alege o zonă sau un complex din listă.");
      return;
    }
    reset();

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
      // Hook already surfaces friendly error into `error` state
      console.error("[SeoGuideGenerator] generate error", e);
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
      const slug = selected.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const blob = new Blob([rendered], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ghid-seo-${slug || "timisoara"}.md`;
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
                      <SelectItem key={opt.name} value={opt.name}>
                        {opt.name}
                      </SelectItem>
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
            <Button
              onClick={handleGenerate}
              disabled={isBusy || !selected}
              aria-label="Generează ghidul SEO"
            >
              {isBusy ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" aria-hidden />
              )}
              {isBusy ? "Se generează..." : "Generează ghid SEO"}
            </Button>
            {isBusy && (
              <Button variant="outline" onClick={cancel} aria-label="Oprește generarea">
                <StopCircle className="w-4 h-4 mr-2" aria-hidden />
                Oprește
              </Button>
            )}
            {rendered && !isBusy && (
              <>
                <Button variant="outline" onClick={handleCopy} aria-label="Copiază Markdown">
                  <Copy className="w-4 h-4 mr-2" aria-hidden />
                  Copiază
                </Button>
                <Button variant="outline" onClick={handleDownload} aria-label="Descarcă fișierul Markdown">
                  <Download className="w-4 h-4 mr-2" aria-hidden />
                  Descarcă .md
                </Button>
              </>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {(rendered || isBusy) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" aria-hidden />
              Preview articol
              {streaming && (
                <Badge variant="outline" className="ml-2 animate-pulse">
                  streaming...
                </Badge>
              )}
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
    </div>
  );
}
