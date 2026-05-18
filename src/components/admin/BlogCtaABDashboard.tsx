import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FlaskConical, TrendingUp, MousePointerClick, Eye, Trophy } from "lucide-react";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { BLOG_CTA_VARIANTS, type BlogCtaTarget } from "@/lib/blogCtaUtm";

interface Row {
  id: string;
  metadata: Record<string, unknown> | null;
}

interface VariantStat {
  variantId: string;
  label: string;
  impressions: number;
  clicks: number;
  conversionRate: number; // 0..1
}

const TARGET_LABEL: Record<BlogCtaTarget, string> = {
  "evaluare-gratuita": "Evaluare Gratuită",
  contact: "Contact",
};

const ALL = "__all__";

// ---------------------------------------------------------------------------
// Statistical significance — two-proportion z-test vs control (95% confidence)
// Returns { z, pValue, significant } where significant === pValue < 0.05.
// ---------------------------------------------------------------------------
const normalCdf = (z: number): number => {
  // Abramowitz & Stegun 7.1.26 approximation of erf
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const a1 = 0.254829592,
    a2 = -0.284496736,
    a3 = 1.421413741,
    a4 = -1.453152027,
    a5 = 1.061405429,
    p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
};

const twoProportionZTest = (
  clicksA: number,
  nA: number,
  clicksB: number,
  nB: number
): { z: number; pValue: number; significant: boolean } => {
  if (nA < 1 || nB < 1) return { z: 0, pValue: 1, significant: false };
  const pA = clicksA / nA;
  const pB = clicksB / nB;
  const pPool = (clicksA + clicksB) / (nA + nB);
  const se = Math.sqrt(pPool * (1 - pPool) * (1 / nA + 1 / nB));
  if (se === 0) return { z: 0, pValue: 1, significant: false };
  const z = (pB - pA) / se;
  const pValue = 2 * (1 - normalCdf(Math.abs(z)));
  return { z, pValue, significant: pValue < 0.05 };
};

const BlogCtaABDashboard = () => {
  const [dateRange, setDateRange] = useState("30");
  const [articleFilter, setArticleFilter] = useState(ALL);
  const [categoryFilter, setCategoryFilter] = useState(ALL);

  const { data, isLoading } = useQuery({
    queryKey: ["blog-cta-ab", dateRange],
    queryFn: async () => {
      const startDate = startOfDay(subDays(new Date(), parseInt(dateRange)));
      const endDate = endOfDay(new Date());
      const { data, error } = await supabase
        .from("cta_analytics")
        .select("id, metadata")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .or("metadata->>source.eq.blog_cta_click,metadata->>source.eq.blog_cta_impression")
        .limit(10000);
      if (error) throw error;
      return (data as Row[]) || [];
    },
  });

  // Distinct articles/categories present in the dataset (for filter dropdowns)
  const { articles, categories } = useMemo(() => {
    const arts = new Map<string, string>(); // slug -> title
    const cats = new Set<string>();
    (data || []).forEach((row) => {
      const m = (row.metadata || {}) as Record<string, unknown>;
      const slug = m.article_slug ? String(m.article_slug) : "";
      const title = m.article_title ? String(m.article_title) : slug;
      const cat = m.article_category ? String(m.article_category) : "";
      if (slug) arts.set(slug, title);
      if (cat) cats.add(cat);
    });
    return {
      articles: Array.from(arts.entries())
        .map(([slug, title]) => ({ slug, title }))
        .sort((a, b) => a.title.localeCompare(b.title)),
      categories: Array.from(cats).sort(),
    };
  }, [data]);

  // Apply filters (article + category)
  const filteredData = useMemo(() => {
    return (data || []).filter((row) => {
      const m = (row.metadata || {}) as Record<string, unknown>;
      if (articleFilter !== ALL && String(m.article_slug || "") !== articleFilter) return false;
      if (categoryFilter !== ALL && String(m.article_category || "") !== categoryFilter) return false;
      return true;
    });
  }, [data, articleFilter, categoryFilter]);

  const statsByTarget = useMemo(() => {
    const result: Record<BlogCtaTarget, VariantStat[]> = {
      "evaluare-gratuita": [],
      contact: [],
    };

    (Object.keys(BLOG_CTA_VARIANTS) as BlogCtaTarget[]).forEach((target) => {
      const variants = BLOG_CTA_VARIANTS[target];
      const stats: Record<string, { impressions: number; clicks: number }> = {};
      variants.forEach((v) => {
        stats[v.id] = { impressions: 0, clicks: 0 };
      });

      filteredData.forEach((row) => {
        const m = (row.metadata || {}) as Record<string, unknown>;
        if (m.cta_target !== target) return;
        const vid = String(m.cta_variant_id || "unassigned");
        if (!stats[vid]) stats[vid] = { impressions: 0, clicks: 0 };
        if (m.source === "blog_cta_click") stats[vid].clicks += 1;
        else if (m.source === "blog_cta_impression") stats[vid].impressions += 1;
      });

      result[target] = Object.entries(stats).map(([variantId, s]) => {
        const variant = variants.find((v) => v.id === variantId);
        return {
          variantId,
          label: variant?.label || `(${variantId})`,
          impressions: s.impressions,
          clicks: s.clicks,
          conversionRate: s.impressions > 0 ? s.clicks / s.impressions : 0,
        };
      });
    });

    return result;
  }, [filteredData]);

  const totalClicks = useMemo(
    () => filteredData.filter((r) => (r.metadata as { source?: string } | null)?.source === "blog_cta_click").length,
    [filteredData]
  );
  const totalImpressions = useMemo(
    () => filteredData.filter((r) => (r.metadata as { source?: string } | null)?.source === "blog_cta_impression").length,
    [filteredData]
  );
  const overallRate = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary" />
            Blog CTA A/B Testing
          </h2>
          <p className="text-muted-foreground">
            Performanța variantelor de text pentru CTA-urile din articolele de blog
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Toate categoriile" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toate categoriile</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={articleFilter} onValueChange={setArticleFilter}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Toate articolele" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toate articolele</SelectItem>
              {articles.map((a) => (
                <SelectItem key={a.slug} value={a.slug}>
                  {a.title.length > 50 ? `${a.title.slice(0, 50)}…` : a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Ultimele 7 zile</SelectItem>
              <SelectItem value="14">Ultimele 14 zile</SelectItem>
              <SelectItem value="30">Ultimele 30 zile</SelectItem>
              <SelectItem value="90">Ultimele 90 zile</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(articleFilter !== ALL || categoryFilter !== ALL) && (
        <div className="flex items-center gap-2 text-xs">
          <Badge variant="outline">
            Filtru activ:{" "}
            {[
              categoryFilter !== ALL ? `categorie=${categoryFilter}` : null,
              articleFilter !== ALL ? `articol=${articleFilter}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </Badge>
          <button
            className="text-primary hover:underline"
            onClick={() => {
              setArticleFilter(ALL);
              setCategoryFilter(ALL);
            }}
          >
            Resetează filtrele
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total afișări</p>
                <p className="text-3xl font-bold">{totalImpressions}</p>
              </div>
              <Eye className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total click-uri</p>
                <p className="text-3xl font-bold">{totalClicks}</p>
              </div>
              <MousePointerClick className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rată conversie globală</p>
                <p className="text-3xl font-bold">{(overallRate * 100).toFixed(2)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-target tables */}
      {(Object.keys(statsByTarget) as BlogCtaTarget[]).map((target) => {
        const rows = [...statsByTarget[target]].sort((a, b) => b.conversionRate - a.conversionRate);
        const control = statsByTarget[target].find((r) => r.variantId === "control");

        // Compute significance per variant vs control
        const sigByVariant: Record<string, { pValue: number; significant: boolean; lift: number }> = {};
        if (control) {
          statsByTarget[target].forEach((r) => {
            if (r.variantId === "control") {
              sigByVariant[r.variantId] = { pValue: 1, significant: false, lift: 0 };
              return;
            }
            const t = twoProportionZTest(control.clicks, control.impressions, r.clicks, r.impressions);
            const lift = control.conversionRate > 0 ? (r.conversionRate - control.conversionRate) / control.conversionRate : 0;
            sigByVariant[r.variantId] = { pValue: t.pValue, significant: t.significant, lift };
          });
        }

        // Winner = best conversion rate among variants that are:
        //  - statistically significant vs control (p<0.05)
        //  - better than control
        //  - have a minimum sample size (>= 100 impressions per variant for stability)
        const MIN_N = 100;
        const winner = rows.find((r) => {
          if (r.variantId === "control") return false;
          const sig = sigByVariant[r.variantId];
          return (
            sig?.significant &&
            r.impressions >= MIN_N &&
            (control?.impressions || 0) >= MIN_N &&
            r.conversionRate > (control?.conversionRate || 0)
          );
        });

        return (
          <Card key={target}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>CTA → /{target}</span>
                <Badge variant="outline">{TARGET_LABEL[target]}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Variantă</TableHead>
                    <TableHead>Text afișat</TableHead>
                    <TableHead className="text-right">Afișări</TableHead>
                    <TableHead className="text-right">Click-uri</TableHead>
                    <TableHead className="text-right">Rată conversie</TableHead>
                    <TableHead className="text-right">Lift vs control</TableHead>
                    <TableHead className="text-right">p-value</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const isWinner = winner?.variantId === r.variantId;
                    const ratePct = (r.conversionRate * 100).toFixed(2);
                    const sig = sigByVariant[r.variantId];
                    const isControl = r.variantId === "control";
                    const liftPct = sig ? (sig.lift * 100).toFixed(1) : "—";
                    const pVal = sig ? sig.pValue.toFixed(3) : "—";
                    return (
                      <TableRow key={r.variantId} className={isWinner ? "bg-primary/5" : ""}>
                        <TableCell className="font-mono text-xs">
                          {r.variantId}
                          {isControl && <span className="ml-1 text-muted-foreground">(control)</span>}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{r.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.impressions}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{r.clicks}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={r.conversionRate > overallRate ? "text-green-600 font-semibold" : ""}>
                            {ratePct}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {isControl ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <span className={sig && sig.lift > 0 ? "text-green-600" : sig && sig.lift < 0 ? "text-red-600" : ""}>
                              {sig && sig.lift > 0 ? "+" : ""}
                              {liftPct}%
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs">
                          {isControl ? <span className="text-muted-foreground">—</span> : pVal}
                        </TableCell>
                        <TableCell className="text-right">
                          {isWinner ? (
                            <Badge className="gap-1">
                              <Trophy className="w-3 h-3" /> Winner (95%)
                            </Badge>
                          ) : isControl ? (
                            <Badge variant="outline" className="text-xs">Control</Badge>
                          ) : r.impressions < MIN_N || (control?.impressions || 0) < MIN_N ? (
                            <Badge variant="outline" className="text-xs">Date insuficiente</Badge>
                          ) : sig?.significant ? (
                            <Badge variant="secondary" className="text-xs">
                              Semnificativ {sig.lift < 0 ? "(mai slab)" : ""}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Nesemnificativ</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">
                * "Winner" se marchează doar când varianta are min. {MIN_N} afișări (la fel și controlul), rată mai bună decât controlul și semnificație statistică &lt; 0.05 (test z pentru două proporții, încredere 95%).
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BlogCtaABDashboard;
