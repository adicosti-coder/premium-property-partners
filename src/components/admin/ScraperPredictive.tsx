import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Sparkles, Loader2, Target, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────
   Inline button on lead row — shows conversion %
   and undervaluation badge.
──────────────────────────────────────────────── */
export function PredictiveBadge({ lead, onUpdate }: { lead: any; onUpdate?: () => void }) {
  const [loading, setLoading] = useState(false);

  const run = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("scraper-lead-predictive", {
        body: { mode: "single", leadId: lead.id, forceRefresh },
      });
      if (error) throw error;
      if (!data?.cached) toast.success("Predicție generată");
      onUpdate?.();
    } catch (e: any) {
      toast.error(e.message || "Eroare predicție");
    } finally {
      setLoading(false);
    }
  };

  const prob = lead.conversion_probability;
  const under = lead.undervaluation_percent;
  const hasData = prob != null;

  if (!hasData) {
    return (
      <Button size="sm" variant="outline" onClick={() => run(false)} disabled={loading} className="gap-1.5 h-7 text-xs">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Target className="h-3 w-3" />}
        Predict
      </Button>
    );
  }

  const probColor = prob >= 75 ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
    : prob >= 50 ? "bg-amber-500/15 text-amber-700 border-amber-500/30"
    : "bg-slate-500/15 text-slate-700 border-slate-500/30";

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Badge variant="outline" className={cn("gap-1 font-semibold", probColor)}>
        <Target className="h-3 w-3" />
        {prob}%
      </Badge>
      {under != null && Math.abs(under) >= 5 && (
        <Badge
          variant="outline"
          className={cn(
            "gap-1 font-semibold",
            under > 0
              ? "bg-blue-500/15 text-blue-700 border-blue-500/30"
              : "bg-red-500/15 text-red-700 border-red-500/30"
          )}
        >
          {under > 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
          {under > 0 ? `-${under}%` : `+${Math.abs(under)}%`}
        </Badge>
      )}
      <button onClick={() => run(true)} disabled={loading} className="text-muted-foreground hover:text-foreground" title="Re-evaluează">
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Detail panel — full reasoning inside lead drawer.
──────────────────────────────────────────────── */
export function PredictiveDetailCard({ lead, onUpdate }: { lead: any; onUpdate?: () => void }) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("scraper-lead-predictive", {
        body: { mode: "single", leadId: lead.id, forceRefresh: true },
      });
      if (error) throw error;
      toast.success("Predicție actualizată");
      onUpdate?.();
    } catch (e: any) {
      toast.error(e.message || "Eroare predicție");
    } finally {
      setLoading(false);
    }
  };

  const prob = lead.conversion_probability;
  const predicted = lead.predicted_market_value;
  const under = lead.undervaluation_percent;
  const reasoning = lead.prediction_reasoning;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Predictive Analytics
          </span>
          <Button size="sm" variant="ghost" onClick={run} disabled={loading} className="h-7 text-xs gap-1">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {prob != null ? "Re-rulează" : "Generează"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {prob == null ? (
          <p className="text-muted-foreground text-xs">Apasă "Generează" pentru scor de conversie + analiză preț.</p>
        ) : (
          <>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">Probabilitate conversie 30 zile</span>
                <span className="text-xs font-bold">{prob}%</span>
              </div>
              <Progress value={prob} className="h-2" />
            </div>

            {predicted > 0 && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-md bg-muted/50 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Preț cerut</div>
                  <div className="text-sm font-semibold">{lead.original_price?.toLocaleString()} €</div>
                </div>
                <div className="rounded-md bg-primary/5 border border-primary/20 p-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Valoare estimată</div>
                  <div className="text-sm font-semibold">{predicted.toLocaleString()} €</div>
                </div>
              </div>
            )}

            {under != null && Math.abs(under) >= 5 && (
              <div className={cn(
                "rounded-md p-2 text-xs flex items-start gap-2",
                under > 0
                  ? "bg-blue-500/10 text-blue-900 border border-blue-500/20"
                  : "bg-red-500/10 text-red-900 border border-red-500/20"
              )}>
                {under > 0 ? <TrendingDown className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                <span>
                  <strong>{under > 0 ? `Subevaluat cu ${under}%` : `Supraevaluat cu ${Math.abs(under)}%`}</strong>
                  {under > 0 && " — oportunitate de negociere."}
                </span>
              </div>
            )}

            {reasoning && (
              <div className="rounded-md bg-muted/30 p-2 text-xs leading-relaxed">
                {reasoning}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ────────────────────────────────────────────────
   Batch processor — runs predictions on top leads.
──────────────────────────────────────────────── */
export function PredictiveBatchButton() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("scraper-lead-predictive", {
        body: { mode: "batch", limit: 10 },
      });
      if (error) throw error;
      toast.success(`Procesate ${data?.processed || 0}/${data?.total || 0} lead-uri`);
      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
    } catch (e: any) {
      toast.error(e.message || "Eroare batch");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={run} disabled={loading} variant="outline" size="sm" className="gap-1.5">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      Predict Top 10
    </Button>
  );
}

/* ────────────────────────────────────────────────
   Undervalued opportunities widget — shows top
   subevaluated leads sorted by opportunity.
──────────────────────────────────────────────── */
export function UndervaluedLeadsWidget({ onSelect }: { onSelect?: (lead: any) => void }) {
  const { data: leads, isLoading } = useQuery({
    queryKey: ["undervalued-leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("scraper_leads")
        .select("id, title, original_price, predicted_market_value, undervaluation_percent, conversion_probability, neighborhood_slug, listing_type")
        .neq("status", "archived")
        .neq("status", "rejected")
        .neq("status", "converted")
        .gte("undervaluation_percent", 10)
        .order("undervaluation_percent", { ascending: false })
        .limit(5);
      return data || [];
    },
    refetchInterval: 60000,
  });

  if (isLoading || !leads || leads.length === 0) return null;

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-blue-600" />
          Top oportunități subevaluate
          <Badge variant="secondary" className="ml-auto">{leads.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {leads.map((l: any) => (
          <button
            key={l.id}
            onClick={() => onSelect?.(l)}
            className="w-full text-left rounded-md p-2 bg-background hover:bg-muted/50 transition-colors border border-border/50"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="text-xs font-medium line-clamp-1 flex-1">{l.title}</div>
              <Badge variant="outline" className="bg-blue-500/15 text-blue-700 border-blue-500/30 text-[10px] shrink-0">
                -{l.undervaluation_percent}%
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span>{l.original_price?.toLocaleString()} € → <strong>{l.predicted_market_value?.toLocaleString()} €</strong></span>
              {l.conversion_probability != null && <span className="ml-auto">🎯 {l.conversion_probability}%</span>}
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
