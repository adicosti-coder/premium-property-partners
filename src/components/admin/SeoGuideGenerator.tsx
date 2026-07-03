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
  Save, History, Trash2, RefreshCcw, Globe, Wand2, Pencil, Eye, GitBranch,
  GitCompareArrows, AlertTriangle, CheckCircle2, Link2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAiEngine, callAiEngine } from "@/hooks/useAiEngine";
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

const TARGET_WORDS = 900;

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
  parent_id: string | null;
  version: number;
}

interface GuideGroup {
  rootId: string;
  latest: SavedGuide;
  versions: SavedGuide[]; // sorted desc by version
}

// ---------- Helpers pentru parsare Markdown -> meta SEO ----------
function slugify(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    .slice(0, 80);
}

// Simple word-level LCS diff for the Diff View
type DiffOp = { type: "equal" | "add" | "del"; text: string };
function tokenize(s: string): string[] {
  // preserve whitespace tokens so we can rebuild readable text
  return s.split(/(\s+)/).filter(t => t.length > 0);
}
function diffWords(a: string, b: string): DiffOp[] {
  const A = tokenize(a);
  const B = tokenize(b);
  const n = A.length, m = B.length;
  // Guard: very large diffs -> fall back to line-level to avoid O(n*m) blowup
  if (n * m > 400_000) {
    return [{ type: "del", text: a }, { type: "add", text: b }];
  }
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0, j = 0;
  const push = (type: DiffOp["type"], text: string) => {
    const last = ops[ops.length - 1];
    if (last && last.type === type) last.text += text;
    else ops.push({ type, text });
  };
  while (i < n && j < m) {
    if (A[i] === B[j]) { push("equal", A[i]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { push("del", A[i]); i++; }
    else { push("add", B[j]); j++; }
  }
  while (i < n) { push("del", A[i++]); }
  while (j < m) { push("add", B[j++]); }
  return ops;
}

interface Validation {
  titleLen: number;
  metaLen: number;
  slug: string;
  hasKeyword: boolean;
  issues: string[];
}
function validateGuide(md: string, keyword: string, slug: string): Validation {
  const title = extractTitle(md);
  const meta = extractMetaDescription(md);
  const kwNorm = keyword.trim().toLowerCase();
  const bodyNorm = md.toLowerCase();
  const hasKeyword = kwNorm.length > 0 && bodyNorm.includes(kwNorm);
  const issues: string[] = [];
  if (!title) issues.push("Lipsește titlul (H1) — adaugă o linie `# Titlu...`.");
  else if (title.length > 60) issues.push(`Titlul are ${title.length} caractere (recomandat sub 60). Scurtează pentru un CTR mai bun în Google.`);
  if (!meta) issues.push("Lipsește meta descrierea — adaugă `> **Meta descriere:** ...` sub titlu.");
  else if (meta.length > 160) issues.push(`Meta descrierea are ${meta.length} caractere (max 160). Google o va trunchia.`);
  else if (meta.length < 120) issues.push(`Meta descrierea are doar ${meta.length} caractere (recomandat 120-160).`);
  if (kwNorm && !hasKeyword) issues.push(`Cuvântul cheie principal „${keyword}” nu apare în textul ghidului. Include-l în H1, introducere sau într-un H2.`);
  if (!slug) issues.push("Slug-ul URL este gol. Generează unul din titlu sau completează manual.");
  else if (slug.length > 70) issues.push(`Slug-ul are ${slug.length} caractere (recomandat sub 70).`);
  return { titleLen: title.length, metaLen: meta.length, slug, hasKeyword, issues };
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
  const m = md.match(/>\s*\*\*Meta descriere:\*\*\s*(.+?)(?:\n\n|\n>|$)/is);
  if (m) return m[1].replace(/\n>?\s*/g, " ").trim();
  const afterH1 = md.split(/^#\s+.+$/m)[1] || "";
  const firstPara = afterH1.split(/\n\s*\n/).map(s => s.trim()).find(Boolean) || "";
  return firstPara.replace(/[#*_>`]/g, "").slice(0, 160);
}

/** Replace or insert H1 and meta descriere block in existing Markdown. */
function replaceTitleAndMeta(md: string, newTitle: string, newMeta: string): string {
  let out = md;
  // Replace H1
  if (/^\s*#\s+.+$/m.test(out)) {
    out = out.replace(/^\s*#\s+.+$/m, `# ${newTitle}`);
  } else {
    out = `# ${newTitle}\n\n${out}`;
  }
  // Replace meta descriere block
  const metaBlock = `> **Meta descriere:** ${newMeta}`;
  if (/>\s*\*\*Meta descriere:\*\*[\s\S]+?(?:\n\n|\n(?!>)|$)/i.test(out)) {
    out = out.replace(/>\s*\*\*Meta descriere:\*\*[\s\S]+?(?=\n\n|\n(?!>)|$)/i, metaBlock);
  } else {
    // Insert right after H1
    out = out.replace(/^(#\s+.+)$/m, `$1\n\n${metaBlock}`);
  }
  return out;
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

  // Editable content — the single source of truth once anything is generated/loaded.
  const [editedMarkdown, setEditedMarkdown] = useState<string>("");
  const [editMode, setEditMode] = useState<"edit" | "preview">("edit");

  // Versionare: dacă am încărcat un ghid din istoric, ținem rădăcina și versiunea curentă
  const [loadedRootId, setLoadedRootId] = useState<string | null>(null);
  const [loadedVersion, setLoadedVersion] = useState<number | null>(null);

  const [history, setHistory] = useState<SavedGuide[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenMetaLoading, setRegenMetaLoading] = useState(false);
  const [regenSlugLoading, setRegenSlugLoading] = useState(false);

  // Slug URL (auto-derived from title, editable, optionally AI-optimized)
  const [slug, setSlug] = useState<string>("");
  const [slugTouched, setSlugTouched] = useState(false);

  // Comparație versiuni (Diff view)
  const [compareRootId, setCompareRootId] = useState<string | null>(null);
  const [compareA, setCompareA] = useState<string | null>(null); // guide id
  const [compareB, setCompareB] = useState<string | null>(null); // guide id

  // Validation dialog before saving
  const [pendingValidation, setPendingValidation] = useState<Validation | null>(null);

  const isBusy = loading || streaming;

  // Sync streaming text into the editable textarea while generating.
  useEffect(() => {
    if (streaming && streamingText) setEditedMarkdown(streamingText);
  }, [streaming, streamingText]);
  useEffect(() => {
    if (data?.text) setEditedMarkdown(data.text);
  }, [data]);

  const pois = useMemo(
    () => poiInput.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
    [poiInput],
  );

  const wordCount = useMemo(() => countWords(editedMarkdown), [editedMarkdown]);
  const progressPct = Math.min(100, Math.round((wordCount / TARGET_WORDS) * 100));

  const parsedTitle = useMemo(() => extractTitle(editedMarkdown), [editedMarkdown]);
  const parsedMeta = useMemo(() => extractMetaDescription(editedMarkdown), [editedMarkdown]);

  // Auto-derive slug from title unless user manually edited it
  useEffect(() => {
    if (slugTouched) return;
    const auto = slugify(parsedTitle || selected || "ghid-timisoara");
    setSlug(auto);
  }, [parsedTitle, selected, slugTouched]);

  const previewUrl = useMemo(() => {
    const base = "https://realtrust.ro/ghid/";
    return `${base}${slug || "ghid-timisoara"}`;
  }, [slug]);


  // ---------- History (grupat pe rădăcină + versiuni) ----------
  const grouped: GuideGroup[] = useMemo(() => {
    const map = new Map<string, SavedGuide[]>();
    for (const g of history) {
      const root = g.parent_id ?? g.id;
      const arr = map.get(root) ?? [];
      arr.push(g);
      map.set(root, arr);
    }
    const groups: GuideGroup[] = [];
    for (const [rootId, arr] of map.entries()) {
      arr.sort((a, b) => b.version - a.version);
      groups.push({ rootId, latest: arr[0], versions: arr });
    }
    groups.sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime());
    return groups;
  }, [history]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    const { data: rows, error: err } = await supabase
      .from("seo_guides")
      .select("id,title,neighborhood,primary_keyword,meta_description,markdown,word_count,created_at,parent_id,version")
      .order("created_at", { ascending: false })
      .limit(100);
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
    setEditedMarkdown("");
    setLoadedRootId(null);
    setLoadedVersion(null);
    setSlugTouched(false);


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
      toast.success("Ghid SEO generat. Poți edita textul înainte de salvare.");
    } catch (e) {
      console.error("[SeoGuideGenerator] generate error", e);
    }
  };

  const handleRegenerateMeta = async () => {
    if (!editedMarkdown) return;
    setRegenMetaLoading(true);
    try {
      const keyword = primaryKeyword.trim() || `apartamente ${selected} Timișoara`;
      const res = await callAiEngine<{ title: string; meta: string; slug: string }>({
        model: "z-ai/glm-5.2",
        jsonMode: true,
        temperature: 0.6,
        max_tokens: 500,
        systemPrompt:
          "Ești un expert SEO. Răspunzi STRICT cu JSON valid: {\"title\": string, \"meta\": string, \"slug\": string}. " +
          "Title <= 60 caractere, include cuvântul cheie și 'Timișoara'. " +
          "Meta între 140 și 160 caractere, atractivă, cu keyword-ul principal și un beneficiu clar. " +
          "Slug: doar litere mici a-z, cifre și cratime, fără diacritice, max 70 caractere, include keyword-ul principal (ex: 'ghid-investitii-isho-timisoara'). Limba română.",
        prompt: `Cuvânt cheie principal: "${keyword}"\nZonă/Complex: "${selected || "Timișoara"}"\n\nGenerează un NOU titlu SEO, o NOUĂ meta descriere și un slug URL optimizat pentru articolul de mai jos. Nu repeta varianta actuală.\n\n--- ARTICOL ACTUAL (extras) ---\n${editedMarkdown.slice(0, 1500)}\n--- SFÂRȘIT ---`,
      });
      const parsed = res.json as { title?: string; meta?: string; slug?: string } | null;
      const newTitle = (parsed?.title || "").trim();
      const newMeta = (parsed?.meta || "").trim();
      const newSlug = slugify((parsed?.slug || "").trim());
      if (!newTitle || !newMeta) {
        toast.error("AI-ul nu a returnat un titlu / meta valid. Reîncearcă.");
        return;
      }
      setEditedMarkdown(md => replaceTitleAndMeta(md, newTitle, newMeta));
      if (newSlug) {
        setSlug(newSlug);
        setSlugTouched(true);
      }
      toast.success("Titlu, meta descriere și slug regenerate.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Nu am putut regenera meta SEO.");
    } finally {
      setRegenMetaLoading(false);
    }
  };

  const handleRegenerateSlug = async () => {
    if (!editedMarkdown && !parsedTitle) return;
    setRegenSlugLoading(true);
    try {
      const keyword = primaryKeyword.trim() || `apartamente ${selected} Timișoara`;
      const res = await callAiEngine<{ slug: string }>({
        model: "z-ai/glm-5.2",
        jsonMode: true,
        temperature: 0.4,
        max_tokens: 120,
        systemPrompt:
          "Ești un expert SEO. Răspunzi STRICT cu JSON valid: {\"slug\": string}. " +
          "Slug: doar litere mici a-z, cifre și cratime, fără diacritice, între 30 și 70 caractere, " +
          "include cuvântul cheie principal și zona (ex: 'ghid-investitii-imobiliare-isho-timisoara').",
        prompt: `Titlu: "${parsedTitle}"\nCuvânt cheie: "${keyword}"\nZonă: "${selected || "Timișoara"}"\n\nGenerează un slug URL optim pentru acest ghid.`,
      });
      const parsed = res.json as { slug?: string } | null;
      const newSlug = slugify((parsed?.slug || "").trim());
      if (!newSlug) {
        toast.error("AI-ul nu a returnat un slug valid.");
        return;
      }
      setSlug(newSlug);
      setSlugTouched(true);
      toast.success("Slug URL optimizat de AI.");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Nu am putut genera slug-ul.");
    } finally {
      setRegenSlugLoading(false);
    }
  };


  const currentValidation = useMemo<Validation>(
    () => validateGuide(editedMarkdown, primaryKeyword.trim() || `apartamente ${selected} Timișoara`, slug),
    [editedMarkdown, primaryKeyword, selected, slug],
  );

  const persistGuide = async () => {
    if (!editedMarkdown || isBusy) return;
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) {
        toast.error("Trebuie să fii autentificat pentru a salva ghidul.");
        return;
      }
      const keyword = primaryKeyword.trim() || `apartamente ${selected} Timișoara`;

      // Versionare: dacă am încărcat un ghid existent, salvăm o versiune nouă cu parent_id = root
      let parentId: string | null = null;
      let nextVersion = 1;
      if (loadedRootId) {
        parentId = loadedRootId;
        const group = grouped.find(g => g.rootId === loadedRootId);
        const maxV = group ? Math.max(...group.versions.map(v => v.version)) : (loadedVersion ?? 1);
        nextVersion = maxV + 1;
      }

      const payload = {
        user_id: uid,
        title: extractTitle(editedMarkdown) || `Ghid ${selected}`,
        neighborhood: selected || "Timișoara",
        primary_keyword: keyword,
        meta_description: extractMetaDescription(editedMarkdown),
        markdown: editedMarkdown,
        word_count: countWords(editedMarkdown),
        parent_id: parentId,
        version: nextVersion,
      };
      const { data: inserted, error: err } = await supabase
        .from("seo_guides")
        .insert(payload)
        .select("id,parent_id,version")
        .single();
      if (err) throw err;

      // După salvare, ghidul curent devine ultima versiune a rădăcinii
      const newRoot = inserted.parent_id ?? inserted.id;
      setLoadedRootId(newRoot);
      setLoadedVersion(inserted.version);
      toast.success(parentId ? `Versiune v${nextVersion} salvată.` : "Ghid salvat în istoric.");
      loadHistory();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Nu am putut salva ghidul.");
    } finally {
      setSaving(false);
      setPendingValidation(null);
    }
  };

  const handleSave = () => {
    if (!editedMarkdown || isBusy) return;
    if (currentValidation.issues.length > 0) {
      setPendingValidation(currentValidation);
      return;
    }
    persistGuide();
  };

  const handleLoadVersion = (g: SavedGuide) => {
    reset();
    setEditedMarkdown(g.markdown);
    setSelected(g.neighborhood);
    setPrimaryKeyword(g.primary_keyword || "");
    setLoadedRootId(g.parent_id ?? g.id);
    setLoadedVersion(g.version);
    setEditMode("edit");
    setSlugTouched(false); // let slug re-derive from the loaded title
    toast.success(`Am încărcat "${g.title}" (v${g.version}).`);
  };


  const handleDeleteGroup = async (rootId: string, title: string) => {
    if (!confirm(`Ștergi definitiv "${title}" și toate versiunile sale?`)) return;
    // Ștergem întâi versiunile derivate (parent_id = root), apoi rădăcina
    const { error: e1 } = await supabase.from("seo_guides").delete().eq("parent_id", rootId);
    const { error: e2 } = await supabase.from("seo_guides").delete().eq("id", rootId);
    if (e1 || e2) {
      toast.error("Nu am putut șterge ghidul complet.");
    } else {
      toast.success("Ghid și versiuni șterse.");
      if (loadedRootId === rootId) {
        setLoadedRootId(null);
        setLoadedVersion(null);
      }
      loadHistory();
    }
  };

  const handleCopy = async () => {
    if (!editedMarkdown) return;
    try {
      await navigator.clipboard.writeText(editedMarkdown);
      toast.success("Markdown copiat în clipboard.");
    } catch {
      toast.error("Nu am putut copia în clipboard.");
    }
  };

  const handleDownload = () => {
    if (!editedMarkdown) return;
    try {
      const fileSlug = slug || slugify(selected || "timisoara");
      const blob = new Blob([editedMarkdown], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ghid-seo-${fileSlug}.md`;
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

  const hasContent = !!editedMarkdown;

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
            {hasContent && !isBusy && (
              <>
                <Button
                  variant="default"
                  onClick={handleSave}
                  disabled={saving}
                  aria-label={loadedRootId ? "Salvează versiune nouă" : "Salvează ghidul în baza de date"}
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden /> : <Save className="w-4 h-4 mr-2" aria-hidden />}
                  {loadedRootId ? "Salvează versiune nouă" : "Salvează în istoric"}
                </Button>
                <Button variant="outline" onClick={handleCopy} aria-label="Copiază Markdown">
                  <Copy className="w-4 h-4 mr-2" aria-hidden /> Copiază
                </Button>
                <Button variant="outline" onClick={handleDownload} aria-label="Descarcă fișierul Markdown">
                  <Download className="w-4 h-4 mr-2" aria-hidden /> Descarcă .md
                </Button>
                {loadedRootId && loadedVersion != null && (
                  <Badge variant="secondary" className="ml-1">
                    <GitBranch className="w-3 h-3 mr-1" aria-hidden /> Editez v{loadedVersion}
                  </Badge>
                )}
              </>
            )}
          </div>

          {(isBusy || hasContent) && (
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
      {(hasContent || isBusy) && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="w-4 h-4" aria-hidden />
                Previzualizare Google Snippet
              </CardTitle>
              <CardDescription>
                Așa va apărea ghidul tău în rezultatele Google Search.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerateMeta}
              disabled={regenMetaLoading || isBusy || !hasContent}
              aria-label="Regenerează doar titlul și meta descriere"
            >
              {regenMetaLoading
                ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" aria-hidden />
                : <Wand2 className="w-3.5 h-3.5 mr-2" aria-hidden />}
              Regenerează meta
            </Button>
          </CardHeader>
          <CardContent>
            <GoogleSnippetPreview title={parsedTitle} url={previewUrl} description={parsedMeta} />
          </CardContent>
        </Card>
      )}

      {/* Editor + Preview articol */}
      {(hasContent || isBusy) && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-4 h-4" aria-hidden />
              {editMode === "edit" ? "Editor Markdown" : "Previzualizare articol"}
              {streaming && <Badge variant="outline" className="ml-2 animate-pulse">streaming...</Badge>}
            </CardTitle>
            <div className="flex items-center gap-1" role="tablist" aria-label="Mod editor">
              <Button
                size="sm"
                variant={editMode === "edit" ? "default" : "outline"}
                onClick={() => setEditMode("edit")}
                role="tab"
                aria-selected={editMode === "edit"}
                aria-label="Mod editare"
              >
                <Pencil className="w-3.5 h-3.5 mr-1.5" aria-hidden /> Editează
              </Button>
              <Button
                size="sm"
                variant={editMode === "preview" ? "default" : "outline"}
                onClick={() => setEditMode("preview")}
                role="tab"
                aria-selected={editMode === "preview"}
                aria-label="Mod previzualizare"
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" aria-hidden /> Preview
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Separator className="mb-4" />
            {editMode === "edit" ? (
              <div className="space-y-2">
                <Label htmlFor="seo-editor" className="sr-only">Editor Markdown</Label>
                <Textarea
                  id="seo-editor"
                  value={editedMarkdown}
                  onChange={e => setEditedMarkdown(e.target.value)}
                  className="font-mono text-sm min-h-[480px] leading-relaxed"
                  spellCheck={false}
                  aria-label="Editor Markdown pentru ghid SEO"
                  placeholder="Conținutul ghidului va apărea aici odată generat..."
                />
                <p className="text-xs text-muted-foreground">
                  Editează liber textul Markdown. Modificările sunt reflectate instant în previzualizarea Google Snippet.
                </p>
              </div>
            ) : (
              <article
                className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-headings:scroll-mt-16"
                aria-live="polite"
                aria-busy={streaming}
              >
                {editedMarkdown ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{editedMarkdown}</ReactMarkdown>
                ) : (
                  <p className="text-muted-foreground text-sm">Se pregătește conținutul...</p>
                )}
              </article>
            )}
          </CardContent>
        </Card>
      )}

      {/* Istoric ghiduri + versiuni */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-4 h-4" aria-hidden />
              Istoric ghiduri salvate
            </CardTitle>
            <CardDescription>
              Comută între versiuni (v1, v2...) sau șterge un ghid împreună cu toate versiunile derivate.
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
          {historyLoading && grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">Se încarcă istoricul...</p>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nu ai salvat încă niciun ghid.</p>
          ) : (
            <ScrollArea className="h-96 pr-3">
              <ul className="space-y-3" role="list">
                {grouped.map(group => (
                  <li key={group.rootId} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{group.latest.title}</div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                          <span>{group.latest.neighborhood}</span>
                          {group.latest.primary_keyword && <span>· {group.latest.primary_keyword}</span>}
                          <span>· {group.versions.length} {group.versions.length === 1 ? "versiune" : "versiuni"}</span>
                          <span>· ultima {formatDistanceToNow(new Date(group.latest.created_at), { addSuffix: true, locale: ro })}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteGroup(group.rootId, group.latest.title)}
                        aria-label={`Șterge ghidul ${group.latest.title} și toate versiunile`}
                        className="text-destructive hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t">
                      {group.versions.map(v => {
                        const active = loadedRootId === group.rootId && loadedVersion === v.version;
                        return (
                          <Button
                            key={v.id}
                            size="sm"
                            variant={active ? "default" : "outline"}
                            onClick={() => handleLoadVersion(v)}
                            className="h-7 text-xs"
                            aria-label={`Încarcă versiunea ${v.version} din ${v.word_count} cuvinte`}
                            aria-pressed={active}
                          >
                            <GitBranch className="w-3 h-3 mr-1" aria-hidden />
                            v{v.version}
                            <span className="ml-1.5 opacity-70">· {v.word_count}w</span>
                          </Button>
                        );
                      })}
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
