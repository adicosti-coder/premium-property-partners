import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Zap, AlertTriangle, FileText, Type, Link2, ImageIcon, Layers, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AuditRow {
  id: string;
  url: string;
  language: string;
  overall_score: number | null;
  title: string | null;
  meta_description: string | null;
  suggested_title: string | null;
  suggested_meta: string | null;
  issues: any[];
  created_at: string;
}

interface OverrideRow {
  url_path: string;
  title: string | null;
  meta_description: string | null;
  is_active: boolean;
}

interface Props {
  history: AuditRow[];
  overrides: OverrideRow[];
}

const urlToPath = (full: string): string => {
  try {
    const u = new URL(full);
    let p = u.pathname.replace(/\/{2,}/g, "/");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p || "/";
  } catch {
    return full.startsWith("/") ? full : "/";
  }
};

type FixCategory = "missing_meta" | "missing_title" | "long_title" | "long_meta" | "low_score" | "missing_schema" | "missing_alt";

interface CategoryDef {
  key: FixCategory;
  label: string;
  icon: any;
  color: string;
  matches: (a: AuditRow, ovr?: OverrideRow) => boolean;
  canBulkFix: boolean;
}

const CATEGORIES: CategoryDef[] = [
  {
    key: "missing_meta",
    label: "Fără meta description",
    icon: FileText,
    color: "text-orange-600",
    matches: (a, ovr) => !((ovr?.meta_description || a.meta_description || "").trim()) && !!a.suggested_meta,
    canBulkFix: true,
  },
  {
    key: "missing_title",
    label: "Fără title sau title scurt",
    icon: Type,
    color: "text-orange-600",
    matches: (a, ovr) => {
      const t = (ovr?.title || a.title || "").trim();
      return (!t || t.length < 20) && !!a.suggested_title;
    },
    canBulkFix: true,
  },
  {
    key: "long_title",
    label: "Title >60 caractere",
    icon: Type,
    color: "text-amber-600",
    matches: (a, ovr) => {
      const t = (ovr?.title || a.title || "").trim();
      return t.length > 60;
    },
    canBulkFix: false,
  },
  {
    key: "long_meta",
    label: "Meta >160 caractere",
    icon: FileText,
    color: "text-amber-600",
    matches: (a, ovr) => {
      const m = (ovr?.meta_description || a.meta_description || "").trim();
      return m.length > 160;
    },
    canBulkFix: false,
  },
  {
    key: "low_score",
    label: "Scor <70",
    icon: AlertTriangle,
    color: "text-red-600",
    matches: (a) => (a.overall_score ?? 100) < 70,
    canBulkFix: false,
  },
  {
    key: "missing_schema",
    label: "Fără Schema.org",
    icon: Layers,
    color: "text-blue-600",
    matches: (a) => (a.issues || []).some((i: any) => /schema|json-ld|structured/i.test(i.issue || "")),
    canBulkFix: false,
  },
  {
    key: "missing_alt",
    label: "Imagini fără alt-text",
    icon: ImageIcon,
    color: "text-purple-600",
    matches: (a) => (a.issues || []).some((i: any) => /\balt\b|alt[-\s]?text/i.test(i.issue || "")),
    canBulkFix: false,
  },
];

export const SEOQuickWinsPanel = ({ history, overrides }: Props) => {
  const qc = useQueryClient();
  const [bulkRunning, setBulkRunning] = useState<FixCategory | null>(null);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });

  // Latest audit per URL
  const latestPerUrl = useMemo(() => {
    const m = new Map<string, AuditRow>();
    history.forEach((a) => {
      const key = `${a.url}::${a.language}`;
      if (!m.has(key)) m.set(key, a);
    });
    return Array.from(m.values());
  }, [history]);

  const overrideMap = useMemo(() => {
    const m = new Map<string, OverrideRow>();
    overrides.forEach((o) => m.set(o.url_path, o));
    return m;
  }, [overrides]);

  const stats = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const matched = latestPerUrl.filter((a) => cat.matches(a, overrideMap.get(urlToPath(a.url))));
      return { ...cat, count: matched.length, audits: matched };
    });
  }, [latestPerUrl, overrideMap]);

  const totalIssues = stats.reduce((s, c) => s + c.count, 0);
  const cleanPages = latestPerUrl.length - new Set(stats.flatMap((c) => c.audits.map((a) => a.id))).size;

  // Bulk apply: for missing_meta + missing_title categories, write directly to seo_overrides
  const bulkFixMutation = useMutation({
    mutationFn: async (cat: FixCategory) => {
      const def = stats.find((c) => c.key === cat);
      if (!def || !def.canBulkFix) throw new Error("Categorie fără bulk-fix");
      const targets = def.audits;
      if (!targets.length) throw new Error("Nimic de aplicat");

      setBulkRunning(cat);
      setBulkProgress({ done: 0, total: targets.length });

      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes.user?.id || null;

      let success = 0;
      for (let i = 0; i < targets.length; i++) {
        const a = targets[i];
        const path = urlToPath(a.url);
        const existing = overrideMap.get(path);

        const newTitle = cat === "missing_title"
          ? (a.suggested_title || existing?.title || a.title || null)
          : (existing?.title || a.title || null);

        let newMeta = cat === "missing_meta"
          ? (a.suggested_meta || existing?.meta_description || a.meta_description || null)
          : (existing?.meta_description || a.meta_description || null);

        // Trim meta to 160 chars max for bulk operations
        if (newMeta && newMeta.length > 160) {
          const slice = newMeta.slice(0, 159);
          const lastSpace = slice.lastIndexOf(" ");
          newMeta = (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trim() + "…";
        }

        try {
          await supabase.from("seo_overrides").upsert(
            {
              url_path: path,
              title: newTitle,
              meta_description: newMeta,
              source_audit_id: a.id,
              applied_by: userId,
              applied_at: new Date().toISOString(),
              is_active: true,
            },
            { onConflict: "url_path" },
          );
          success++;
        } catch (e) {
          console.error("Bulk fix failed for", path, e);
        }
        setBulkProgress({ done: i + 1, total: targets.length });
      }
      return { success, total: targets.length };
    },
    onSuccess: ({ success, total }) => {
      toast.success(`Bulk fix: ${success}/${total} pagini actualizate`);
      qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      qc.invalidateQueries({ queryKey: ["seo-audits-history"] });
      setBulkRunning(null);
    },
    onError: (e: any) => {
      toast.error(e?.message || "Bulk fix eșuat");
      setBulkRunning(null);
    },
  });

  if (!latestPerUrl.length) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-600" />
          Quick Wins SEO
          <Badge variant="outline" className="ml-auto">
            {totalIssues > 0 ? `${totalIssues} probleme detectate` : "Toate paginile sunt curate ✨"}
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Probleme prioritare grupate pe categorie. Pentru meta/title lipsă, aplici sugestiile AI deja generate cu un singur click.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          <div className="rounded-md border bg-background p-2">
            <div className="text-xs text-muted-foreground">Pagini analizate</div>
            <div className="text-xl font-bold">{latestPerUrl.length}</div>
          </div>
          <div className="rounded-md border bg-background p-2">
            <div className="text-xs text-muted-foreground">Pagini curate</div>
            <div className="text-xl font-bold text-green-600">{cleanPages}</div>
          </div>
          <div className="rounded-md border bg-background p-2">
            <div className="text-xs text-muted-foreground">Cu probleme</div>
            <div className="text-xl font-bold text-amber-600">{latestPerUrl.length - cleanPages}</div>
          </div>
          <div className="rounded-md border bg-background p-2">
            <div className="text-xs text-muted-foreground">Total fix-uri</div>
            <div className="text-xl font-bold">{totalIssues}</div>
          </div>
        </div>

        {/* Categories */}
        <div className="grid gap-2 sm:grid-cols-2">
          {stats.map((c) => {
            const Icon = c.icon;
            const isActive = bulkRunning === c.key;
            return (
              <div
                key={c.key}
                className={`flex items-center gap-3 rounded-md border bg-background p-2.5 ${
                  c.count === 0 ? "opacity-50" : ""
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${c.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.count === 0 ? (
                      <span className="text-green-600 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> 0 pagini
                      </span>
                    ) : (
                      `${c.count} ${c.count === 1 ? "pagină" : "pagini"}`
                    )}
                  </div>
                </div>
                {c.canBulkFix && c.count > 0 && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => bulkFixMutation.mutate(c.key)}
                    disabled={!!bulkRunning}
                    title={`Aplică sugestiile AI pe toate cele ${c.count} pagini`}
                  >
                    {isActive ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        {bulkProgress.done}/{bulkProgress.total}
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3 mr-1" />
                        Fix bulk
                      </>
                    )}
                  </Button>
                )}
                {!c.canBulkFix && c.count > 0 && (
                  <Badge variant="outline" className="text-[10px]">manual</Badge>
                )}
              </div>
            );
          })}
        </div>

        {bulkRunning && (
          <Progress value={(bulkProgress.done / Math.max(bulkProgress.total, 1)) * 100} className="h-1.5" />
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong>Bulk-fix</strong> folosește sugestiile AI generate la audit (suggested_title, suggested_meta) și le scrie direct în <code>seo_overrides</code>.
          Pentru fix-uri care necesită analiză contextuală (Schema, alt-text, scor scăzut), folosește panoul Auto-Fix de pe auditul individual.
        </p>
      </CardContent>
    </Card>
  );
};
