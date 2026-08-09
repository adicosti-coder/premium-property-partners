import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MapPin, FileText, Link2, Image as ImageIcon, Star, Building2,
  Megaphone, Code2, Users, Phone, Calendar, Copy, Sparkles,
  Download, CheckCircle2, Circle, Filter, ListChecks, ChevronDown, ChevronUp,
  Trash2, RotateCcw, PlayCircle, UserCircle2,
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

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "acum";
  if (m < 60) return `acum ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `acum ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `acum ${d}z`;
  const mo = Math.floor(d / 30);
  return `acum ${mo}lu`;
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

type StatusRow = {
  id: string;
  audit_id: string;
  rec_index: number;
  rec_hash: string | null;
  status: Status;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
};

export function LocalSEORecommendations({ recommendations, auditId, url }: LocalSEORecommendationsProps) {
  const qc = useQueryClient();

  const items = useMemo(() => {
    return (recommendations || []).map((r, i) => {
      const text = typeof r === "string" ? r : r.text || r.recommendation || r.description || JSON.stringify(r);
      const givenPriority = typeof r === "object" ? r.priority : undefined;
      const cat = detectCategory(text);
      const priority = detectPriority(text, givenPriority);
      const effort = detectEffort(text);
      return { id: `${auditId}:${i}`, index: i, text, hash: simpleHash(text), category: cat, priority, effort };
    });
  }, [recommendations, auditId]);

  // Fetch persisted statuses
  const { data: statusRows = [] } = useQuery({
    queryKey: ["seo-local-rec-status", auditId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_local_rec_status")
        .select("*")
        .eq("audit_id", auditId);
      if (error) throw error;
      return (data || []) as StatusRow[];
    },
  });

  // Fetch profile emails for updated_by users
  const userIds = useMemo(
    () => Array.from(new Set(statusRows.map((r) => r.updated_by).filter(Boolean) as string[])),
    [statusRows]
  );

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-by-ids", userIds.sort().join(",")],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,email,full_name")
        .in("id", userIds);
      if (error) throw error;
      return data || [];
    },
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, { email?: string; full_name?: string }>();
    profiles.forEach((p: any) => m.set(p.id, { email: p.email, full_name: p.full_name }));
    return m;
  }, [profiles]);

  const statusByIndex = useMemo(() => {
    const m = new Map<number, StatusRow>();
    statusRows.forEach((r) => m.set(r.rec_index, r));
    return m;
  }, [statusRows]);

  // Optimistic upsert mutation
  const upsertMutation = useMutation({
    mutationFn: async (vars: { rec_index: number; rec_hash: string; status: Status }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("seo_local_rec_status")
        .upsert(
          {
            audit_id: auditId,
            rec_index: vars.rec_index,
            rec_hash: vars.rec_hash,
            status: vars.status,
            updated_by: userData.user?.id ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "audit_id,rec_index" }
        );
      if (error) throw error;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["seo-local-rec-status", auditId] });
      const prev = qc.getQueryData<StatusRow[]>(["seo-local-rec-status", auditId]) || [];
      const next = [...prev];
      const i = next.findIndex((r) => r.rec_index === vars.rec_index);
      const optimistic: StatusRow = {
        id: i >= 0 ? next[i].id : `tmp-${vars.rec_index}`,
        audit_id: auditId,
        rec_index: vars.rec_index,
        rec_hash: vars.rec_hash,
        status: vars.status,
        note: i >= 0 ? next[i].note : null,
        updated_by: i >= 0 ? next[i].updated_by : null,
        updated_at: new Date().toISOString(),
      };
      if (i >= 0) next[i] = optimistic; else next.push(optimistic);
      qc.setQueryData(["seo-local-rec-status", auditId], next);
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["seo-local-rec-status", auditId], ctx.prev);
      toast.error("Eroare la salvarea statusului", { description: e?.message });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["seo-local-rec-status", auditId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (indices: number[]) => {
      const { error } = await supabase
        .from("seo_local_rec_status")
        .delete()
        .eq("audit_id", auditId)
        .in("rec_index", indices);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["seo-local-rec-status", auditId] }),
    onError: (e: any) => toast.error("Eroare la ștergere", { description: e?.message }),
  });

  // UI state
  const [filter, setFilter] = useState<"all" | "open" | "done">("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [collapsedAll, setCollapsedAll] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const getStatus = (idx: number): Status => statusByIndex.get(idx)?.status || "open";

  const toggleStatus = (it: typeof items[number]) => {
    const cur = getStatus(it.index);
    const next: Status = cur === "done" ? "open" : "done";
    upsertMutation.mutate({ rec_index: it.index, rec_hash: it.hash, status: next });
  };

  const setStatus = (it: typeof items[number], s: Status) => {
    upsertMutation.mutate({ rec_index: it.index, rec_hash: it.hash, status: s });
  };

  const filtered = items.filter((it) => {
    const st = getStatus(it.index);
    if (filter === "open" && st === "done") return false;
    if (filter === "done" && st !== "done") return false;
    if (catFilter !== "all" && it.category.key !== catFilter) return false;
    return true;
  });

  const doneCount = items.filter((it) => getStatus(it.index) === "done").length;
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
    const open = items.filter((it) => getStatus(it.index) !== "done");
    const md = [
      `# Plan Local SEO — ${url || ""}`.trim(),
      `Total: ${items.length} · Deschise: ${open.length} · Finalizate: ${doneCount}`,
      "",
      ...open.map((it) => `- [ ] **[${it.priority.toUpperCase()} · ${it.category.label}]** ${it.text}`),
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
      getStatus(it.index),
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

  // Selection helpers
  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };
  const allFilteredSelected = filtered.length > 0 && filtered.every((it) => selected.has(it.index));
  const toggleSelectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((it) => next.delete(it.index));
      else filtered.forEach((it) => next.add(it.index));
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const bulkSetStatus = async (s: Status) => {
    const targets = items.filter((it) => selected.has(it.index));
    if (!targets.length) return;
    await Promise.all(
      targets.map((it) =>
        upsertMutation.mutateAsync({ rec_index: it.index, rec_hash: it.hash, status: s })
      )
    );
    toast.success(`${targets.length} recomandări actualizate`);
  };

  const bulkCopyPrompt = () => {
    const targets = items.filter((it) => selected.has(it.index));
    if (!targets.length) return;
    const combined = [
      `Acționează ca SEO local expert pentru ${url || "site-ul nostru"}.`,
      `Procesează ${targets.length} recomandări grupate. Pentru fiecare, livrează: pași concreți (max 5 bullets), exemple de copy în limba română, JSON-LD dacă e cazul, și KPI de monitorizat.`,
      "",
      ...targets.map((it, i) => [
        `--- Recomandare ${i + 1} [${it.priority.toUpperCase()} · ${it.category.label} · efort ${effortLabel[it.effort]}] ---`,
        it.text,
      ].join("\n")),
    ].join("\n\n");
    copyText(combined, `Prompt AI combinat (${targets.length})`);
  };

  const bulkDelete = async () => {
    const indices = Array.from(selected);
    if (!indices.length) return;
    await deleteMutation.mutateAsync(indices);
    clearSelection();
    toast.success(`${indices.length} statusuri resetate la implicit`);
  };

  if (!items.length) return null;

  const selectionCount = selected.size;

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
            Categorisite, cu prioritate, efort, status colaborativ și prompt AI.
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

      {/* Select-all + bulk bar */}
      <div className="flex flex-wrap items-center gap-2 border rounded-md p-2 bg-card">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox
            checked={allFilteredSelected}
            onCheckedChange={toggleSelectAllFiltered}
            aria-label="Selectează toate filtrate"
          />
          <span>Selectează toate filtrate ({filtered.length})</span>
        </label>
        {selectionCount > 0 && (
          <>
            <span className="text-xs text-muted-foreground ml-auto">{selectionCount} selectate</span>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="default" className="h-7 text-[11px]" onClick={() => bulkSetStatus("done")}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Finalizate
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => bulkSetStatus("doing")}>
                <PlayCircle className="w-3 h-3 mr-1" /> În lucru
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => bulkSetStatus("open")}>
                <RotateCcw className="w-3 h-3 mr-1" /> Deschise
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={bulkCopyPrompt}>
                <Sparkles className="w-3 h-3 mr-1" /> Prompt AI combinat
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px] text-destructive" onClick={bulkDelete}>
                <Trash2 className="w-3 h-3 mr-1" /> Șterge selecția
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={clearSelection}>
                Anulează
              </Button>
            </div>
          </>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((it) => {
          const row = statusByIndex.get(it.index);
          const st: Status = row?.status || "open";
          const Icon = it.category.icon;
          const isDone = st === "done";
          const isExpanded = collapsedAll ? false : (expanded[it.id] ?? true);
          const isSelected = selected.has(it.index);
          const author = row?.updated_by ? profileMap.get(row.updated_by) : undefined;
          return (
            <div
              key={it.id}
              className={cn(
                "rounded-md border p-2.5 transition-colors",
                isDone ? "bg-muted/40 border-muted" : "bg-card",
                isSelected && "ring-2 ring-primary/40",
                it.priority === "high" && !isDone && "border-l-4 border-l-destructive"
              )}
            >
              <div className="flex items-start gap-2.5">
                <div className="flex flex-col gap-2 pt-0.5">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleSelect(it.index)}
                    aria-label="Selectează pentru acțiuni în masă"
                  />
                  <Checkbox
                    checked={isDone}
                    onCheckedChange={() => toggleStatus(it)}
                    aria-label="Marchează finalizat"
                    className="border-green-500 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                  />
                </div>
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
                    {st === "doing" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 border-blue-500 text-blue-600 gap-1">
                        <PlayCircle className="w-2.5 h-2.5" /> În lucru
                      </Badge>
                    )}
                    {isDone && (
                      <Badge variant="outline" className="text-[10px] px-1.5 border-green-500 text-green-700 dark:text-green-400 gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Finalizat
                      </Badge>
                    )}
                    {row?.updated_by && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                        <UserCircle2 className="w-3 h-3" />
                        {author?.full_name || author?.email || "admin"}
                        <span className="opacity-70">· {relativeTime(row.updated_at)}</span>
                      </span>
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
                    {st !== "doing" && !isDone && (
                      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => setStatus(it, "doing")}>
                        <Circle className="w-3 h-3 mr-1" /> În lucru
                      </Button>
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
