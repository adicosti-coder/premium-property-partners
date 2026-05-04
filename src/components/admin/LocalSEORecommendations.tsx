import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MapPin, FileText, Link2, Image as ImageIcon, Star, Building2,
  Megaphone, Code2, Users, Phone, Calendar, Copy, Sparkles,
  Download, CheckCircle2, Circle, Filter, ListChecks, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RecInput = string | { text?: string; recommendation?: string; description?: string; priority?: string; category?: string };

type Category = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match: RegExp;
  promptHint: string;
};

const CATEGORIES: Category[] = [
  { key: "content", label: "Conținut", icon: FileText, match: /(conținut|continut|articol|paragraf|secțiune|sectiune|text|descrier|copy|titlu|h[12345])/i, promptHint: "Scrie/optimizează conținut pe pagină" },
  { key: "gmb", label: "Google Business", icon: Building2, match: /(google business|gmb|profil|google maps|listare|nap)/i, promptHint: "Optimizare Google Business Profile" },
  { key: "reviews", label: "Recenzii", icon: Star, match: /(recenzi|review|testimonial|rating|stele)/i, promptHint: "Strategie & solicitare recenzii" },
  { key: "links", label: "Link-uri", icon: Link2, match: /(link|backlink|citation|directoare|director|partener|interconect)/i, promptHint: "Plan link-building local" },
  { key: "schema", label: "Schema/JSON-LD", icon: Code2, match: /(schema|json-?ld|structured|markup|microdata|rich snippet)/i, promptHint: "Generează JSON-LD pentru pagină" },
  { key: "media", label: "Media", icon: ImageIcon, match: /(imagini|imagine|foto|video|alt text|geotag)/i, promptHint: "Optimizare media (alt text, geotag, compresie)" },
  { key: "local", label: "Local Pack", icon: MapPin, match: /(local pack|cartier|zonă|zona|hartă|harta|geo|locație|locatie|proximit|landmark)/i, promptHint: "Conținut & semnale Local Pack" },
  { key: "social", label: "Social/PR", icon: Megaphone, match: /(social|facebook|instagram|tiktok|pr|presă|comunicat)/i, promptHint: "Distribuție socială & PR local" },
  { key: "audience", label: "Audiență", icon: Users, match: /(client|audien|public|persona|familie|investit|cumpărător|cumparator)/i, promptHint: "Segmentare audiență & mesaj" },
  { key: "contact", label: "Contact/CTA", icon: Phone, match: /(contact|cta|formular|telefon|whatsapp|email|programare)/i, promptHint: "Optimizare CTA & contact" },
  { key: "report", label: "Rapoarte", icon: Calendar, match: /(raport|trimestrial|lunar|analiza|analiză|piață|piata|trend)/i, promptHint: "Plan publicare rapoarte recurente" },
];

const DEFAULT_CATEGORY: Category = { key: "other", label: "General", icon: ListChecks, match: /.*/, promptHint: "Recomandare generală SEO local" };

function detectCategory(text: string): Category {
  return CATEGORIES.find((c) => c.match.test(text)) || DEFAULT_CATEGORY;
}

function detectPriority(text: string, given?: string): "high" | "medium" | "low" {
  if (given && /high|critic|urgent|prior/i.test(given)) return "high";
  if (given && /low|opt/i.test(given)) return "low";
  if (/imediat|urgent|critic|obligator|trebuie|essential|must/i.test(text)) return "high";
  if (/recomand|ar fi bine|consider|nice|opțional|optional/i.test(text)) return "low";
  return "medium";
}

function detectEffort(text: string): "S" | "M" | "L" {
  const len = text.length;
  if (/raport|trimestrial|video|campanie|strategie|complet|reface|rescrie/i.test(text) || len > 220) return "L";
  if (/secțiune|sectiune|adaugă|adauga|integrează|integreaza|publică|publica/i.test(text) || len > 110) return "M";
  return "S";
}

const priorityVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  high: "destructive",
  medium: "default",
  low: "secondary",
};

const effortLabel: Record<string, string> = { S: "Quick", M: "Mediu", L: "Heavy" };

export interface LocalSEORecommendationsProps {
  recommendations: RecInput[];
  auditId: string;
  url?: string;
}

type Status = "open" | "doing" | "done";

const STATUS_KEY = (auditId: string) => `seo-local-recs-status:${auditId}`;

export function LocalSEORecommendations({ recommendations, auditId, url }: LocalSEORecommendationsProps) {
  const items = useMemo(() => {
    return (recommendations || []).map((r, i) => {
      const text = typeof r === "string" ? r : r.text || r.recommendation || r.description || JSON.stringify(r);
      const givenPriority = typeof r === "object" ? r.priority : undefined;
      const cat = detectCategory(text);
      const priority = detectPriority(text, givenPriority);
      const effort = detectEffort(text);
      return { id: `${auditId}:${i}`, index: i, text, category: cat, priority, effort };
    });
  }, [recommendations, auditId]);

  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [collapsedAll, setCollapsedAll] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STATUS_KEY(auditId));
      if (raw) setStatuses(JSON.parse(raw));
    } catch {}
  }, [auditId]);

  const persist = (next: Record<string, Status>) => {
    setStatuses(next);
    try { localStorage.setItem(STATUS_KEY(auditId), JSON.stringify(next)); } catch {}
  };

  const toggleStatus = (id: string) => {
    const cur = statuses[id] || "open";
    const next = cur === "done" ? "open" : "done";
    persist({ ...statuses, [id]: next });
  };

  const setStatus = (id: string, s: Status) => persist({ ...statuses, [id]: s });

  const filtered = items.filter((it) => {
    const st = statuses[it.id] || "open";
    if (filter === "open" && st === "done") return false;
    if (filter === "done" && st !== "done") return false;
    if (catFilter !== "all" && it.category.key !== catFilter) return false;
    return true;
  });

  const doneCount = items.filter((it) => (statuses[it.id] || "open") === "done").length;
  const progress = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  const usedCats = useMemo(() => {
    const set = new Set(items.map((i) => i.category.key));
    return CATEGORIES.filter((c) => set.has(c.key)).concat(set.has("other") ? [DEFAULT_CATEGORY] : []);
  }, [items]);

  const copyText = async (text: string, label = "Text") => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copiat`); }
    catch { toast.error("Nu am putut copia"); }
  };

  const buildPrompt = (it: typeof items[number]) => {
    return [
      `Acționează ca SEO local expert pentru ${url || "site-ul nostru"}.`,
      `Categorie: ${it.category.label} (${it.category.promptHint}).`,
      `Prioritate: ${it.priority}. Efort estimat: ${effortLabel[it.effort]}.`,
      "",
      "Recomandare:",
      it.text,
      "",
      "Output cerut: pași concreți (max 6 bullets), exemple de copy gata de publicat în limba română, eventual JSON-LD dacă e cazul, și KPI de monitorizat.",
    ].join("\n");
  };

  const copyAllAsTaskList = () => {
    const open = items.filter((it) => (statuses[it.id] || "open") !== "done");
    const md = [
      `# Plan Local SEO — ${url || ""}`.trim(),
      `Total: ${items.length} · Deschise: ${open.length} · Finalizate: ${doneCount}`,
      "",
      ...open.map((it, i) => `- [ ] **[${it.priority.toUpperCase()} · ${it.category.label}]** ${it.text}`),
    ].join("\n");
    copyText(md, "Plan acțiune");
  };

  const exportCSV = () => {
    const header = ["#", "Categorie", "Prioritate", "Efort", "Status", "Recomandare"];
    const rows = items.map((it, i) => [
      String(i + 1),
      it.category.label,
      it.priority,
      effortLabel[it.effort],
      statuses[it.id] || "open",
      `"${(it.text || "").replace(/"/g, '""')}"`,
    ]);
    const csv = "\uFEFF" + [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `local-seo-recommendations-${auditId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("CSV exportat");
  };

  if (!items.length) return null;

  return (
    <div className="rounded-lg border bg-gradient-to-br from-amber-50/40 to-background dark:from-amber-950/10 p-3 md:p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            Recomandări concrete Local SEO
            <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Categorisite, cu prioritate, efort estimat și prompt AI gata de folosit.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={copyAllAsTaskList}>
            <Copy className="w-3 h-3 mr-1.5" /> Plan acțiune
          </Button>
          <Button size="sm" variant="outline" onClick={exportCSV}>
            <Download className="w-3 h-3 mr-1.5" /> CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCollapsedAll((v) => !v)}>
            {collapsedAll ? <ChevronDown className="w-3 h-3 mr-1.5" /> : <ChevronUp className="w-3 h-3 mr-1.5" />}
            {collapsedAll ? "Extinde tot" : "Restrânge tot"}
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progres implementare</span>
          <span className="font-semibold">{doneCount}/{items.length} · {progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Filter className="w-3 h-3 text-muted-foreground" />
        {(["all", "open", "done"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className="h-7 text-[11px] px-2"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Toate" : f === "open" ? "Deschise" : "Finalizate"}
          </Button>
        ))}
        <span className="mx-1 text-muted-foreground/50">·</span>
        <Button
          size="sm"
          variant={catFilter === "all" ? "default" : "outline"}
          className="h-7 text-[11px] px-2"
          onClick={() => setCatFilter("all")}
        >
          Toate categoriile
        </Button>
        {usedCats.map((c) => {
          const Icon = c.icon;
          const count = items.filter((it) => it.category.key === c.key).length;
          return (
            <Button
              key={c.key}
              size="sm"
              variant={catFilter === c.key ? "default" : "outline"}
              className="h-7 text-[11px] px-2 gap-1"
              onClick={() => setCatFilter(c.key)}
            >
              <Icon className="w-3 h-3" /> {c.label} <span className="opacity-60">({count})</span>
            </Button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((it) => {
          const st: Status = statuses[it.id] || "open";
          const Icon = it.category.icon;
          const isDone = st === "done";
          const isExpanded = collapsedAll ? false : (expanded[it.id] ?? true);
          return (
            <div
              key={it.id}
              className={cn(
                "rounded-md border p-2.5 transition-colors",
                isDone ? "bg-muted/40 border-muted" : "bg-card",
                it.priority === "high" && !isDone && "border-l-4 border-l-destructive"
              )}
            >
              <div className="flex items-start gap-2.5">
                <Checkbox
                  checked={isDone}
                  onCheckedChange={() => toggleStatus(it.id)}
                  className="mt-0.5"
                  aria-label="Marchează finalizat"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <Badge variant="outline" className="text-[10px] gap-1 px-1.5">
                      <Icon className="w-2.5 h-2.5" /> {it.category.label}
                    </Badge>
                    <Badge variant={priorityVariant[it.priority]} className="text-[10px] px-1.5">
                      {it.priority}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      Efort: {effortLabel[it.effort]}
                    </Badge>
                    {isDone && (
                      <Badge variant="outline" className="text-[10px] px-1.5 border-green-500 text-green-700 dark:text-green-400 gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Finalizat
                      </Badge>
                    )}
                  </div>
                  <div
                    className={cn(
                      "text-sm leading-snug break-words",
                      isDone && "line-through text-muted-foreground",
                      !isExpanded && "line-clamp-2"
                    )}
                  >
                    {it.text}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => copyText(it.text, "Recomandare")}>
                      <Copy className="w-3 h-3 mr-1" /> Copiază
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => copyText(buildPrompt(it), "Prompt AI")}>
                      <Sparkles className="w-3 h-3 mr-1" /> Prompt AI
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px]"
                      onClick={() => setExpanded((e) => ({ ...e, [it.id]: !isExpanded }))}
                    >
                      {isExpanded ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
                      {isExpanded ? "Restrânge" : "Detalii"}
                    </Button>
                    {!isDone && st !== "doing" && (
                      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setStatus(it.id, "doing")}>
                        <Circle className="w-3 h-3 mr-1" /> În lucru
                      </Button>
                    )}
                    {st === "doing" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 border-blue-500 text-blue-600">În lucru</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length && (
          <div className="text-center text-xs text-muted-foreground py-6">
            Nicio recomandare în acest filtru.
          </div>
        )}
      </div>
    </div>
  );
}
