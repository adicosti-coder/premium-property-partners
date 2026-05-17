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

const BlogCtaABDashboard = () => {
  const [dateRange, setDateRange] = useState("30");

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

      (data || []).forEach((row) => {
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
  }, [data]);

  const totalClicks = useMemo(
    () => (data || []).filter((r) => (r.metadata as { source?: string } | null)?.source === "blog_cta_click").length,
    [data]
  );
  const totalImpressions = useMemo(
    () => (data || []).filter((r) => (r.metadata as { source?: string } | null)?.source === "blog_cta_impression").length,
    [data]
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-primary" />
            Blog CTA A/B Testing
          </h2>
          <p className="text-muted-foreground">
            Performanța variantelor de text pentru CTA-urile din articolele de blog
          </p>
        </div>
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
        const winner = rows.find((r) => r.impressions >= 20 && r.clicks > 0);
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
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const isWinner = winner?.variantId === r.variantId;
                    const ratePct = (r.conversionRate * 100).toFixed(2);
                    return (
                      <TableRow key={r.variantId} className={isWinner ? "bg-primary/5" : ""}>
                        <TableCell className="font-mono text-xs">{r.variantId}</TableCell>
                        <TableCell className="max-w-xs truncate">{r.label}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.impressions}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{r.clicks}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={r.conversionRate > overallRate ? "text-green-600 font-semibold" : ""}>
                            {ratePct}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {isWinner ? (
                            <Badge className="gap-1">
                              <Trophy className="w-3 h-3" /> Winner
                            </Badge>
                          ) : r.impressions < 20 ? (
                            <Badge variant="outline" className="text-xs">Date insuficiente</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Activ</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-3">
                * "Winner" este marcat doar pentru variante cu min. 20 afișări și click-uri &gt; 0. Conversia se calculează ca click-uri / afișări unice per sesiune.
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default BlogCtaABDashboard;
