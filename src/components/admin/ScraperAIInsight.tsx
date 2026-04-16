import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Loader2, Copy, RefreshCw, Phone, Target, AlertTriangle, MessageSquare, Sunrise, Flame, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Insight {
  priority?: "hot" | "warm" | "cold";
  priorityReason?: string;
  strengths?: string[];
  concerns?: string[];
  approach?: string;
  personalizedMessage?: string;
  nextAction?: string;
  raw?: string;
}

interface BriefingData {
  summary?: string;
  topPicks?: { index: number; reason: string }[];
  dailyFocus?: string;
  warnings?: string[];
}

const priorityColor: Record<string, string> = {
  hot: "bg-red-500/15 text-red-600 border-red-500/30",
  warm: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  cold: "bg-slate-500/15 text-slate-600 border-slate-500/30",
};

const priorityLabel: Record<string, string> = {
  hot: "🔥 PRIORITATE MAXIMĂ",
  warm: "⚡ MEDIU",
  cold: "❄️ SCĂZUT",
};

interface AIInsightButtonProps {
  leadId: string;
  leadTitle: string;
  leadPhone?: string | null;
  cachedInsight?: Insight | null;
  onMessageSelected?: (msg: string) => void;
}

export const AIInsightButton = ({ leadId, leadTitle, leadPhone, cachedInsight, onMessageSelected }: AIInsightButtonProps) => {
  const [open, setOpen] = useState(false);
  const [insight, setInsight] = useState<Insight | null>(cachedInsight || null);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async (forceRefresh: boolean) => {
      const { data, error } = await supabase.functions.invoke("scraper-lead-ai-insight", {
        body: { mode: "single", leadId, forceRefresh },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { insight: Insight; cached: boolean };
    },
    onSuccess: (data) => {
      setInsight(data.insight);
      queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
      if (!data.cached) toast.success("Analiză AI generată");
    },
    onError: (err: any) => {
      toast.error("Eroare AI: " + (err?.message || "necunoscut"));
    },
  });

  const handleOpen = () => {
    setOpen(true);
    if (!insight) generateMutation.mutate(false);
  };

  const copyMsg = () => {
    if (insight?.personalizedMessage) {
      navigator.clipboard.writeText(insight.personalizedMessage);
      toast.success("Mesaj copiat!");
    }
  };

  const sendWA = () => {
    if (insight?.personalizedMessage) {
      const url = leadPhone
        ? `https://wa.me/${leadPhone.replace(/\D/g, "")}?text=${encodeURIComponent(insight.personalizedMessage)}`
        : `https://wa.me/?text=${encodeURIComponent(insight.personalizedMessage)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400"
        onClick={handleOpen}
      >
        <Sparkles className="w-3.5 h-3.5" />
        AI Insight
        {insight && <span className="text-[10px] opacity-70">✓</span>}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              Analiză strategică AI
            </DialogTitle>
            <DialogDescription className="line-clamp-1">{leadTitle}</DialogDescription>
          </DialogHeader>

          {generateMutation.isPending && !insight && (
            <div className="space-y-3 py-2">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {insight && (
            <div className="space-y-4">
              {insight.priority && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={cn("text-xs px-2.5 py-1", priorityColor[insight.priority])}>
                    {priorityLabel[insight.priority] || insight.priority}
                  </Badge>
                  {insight.priorityReason && (
                    <span className="text-sm text-muted-foreground">{insight.priorityReason}</span>
                  )}
                </div>
              )}

              {insight.strengths && insight.strengths.length > 0 && (
                <Card className="border-emerald-500/20 bg-emerald-500/5">
                  <CardContent className="p-3 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Puncte forte
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside marker:text-emerald-500">
                      {insight.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {insight.concerns && insight.concerns.length > 0 && (
                <Card className="border-amber-500/20 bg-amber-500/5">
                  <CardContent className="p-3 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Riscuri / De clarificat
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside marker:text-amber-500">
                      {insight.concerns.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {insight.approach && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Abordare recomandată
                  </p>
                  <p className="text-sm leading-relaxed">{insight.approach}</p>
                </div>
              )}

              {insight.personalizedMessage && (
                <Card className="border-violet-500/30 bg-violet-500/5">
                  <CardContent className="p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" /> Mesaj WhatsApp personalizat
                    </p>
                    <div className="text-sm whitespace-pre-line leading-relaxed">
                      {insight.personalizedMessage}
                    </div>
                    <div className="flex gap-2 pt-1 flex-wrap">
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={copyMsg}>
                        <Copy className="w-3.5 h-3.5" /> Copiază
                      </Button>
                      <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={sendWA}>
                        <Phone className="w-3.5 h-3.5" /> Trimite pe WhatsApp
                      </Button>
                      {onMessageSelected && (
                        <Button size="sm" variant="secondary" onClick={() => { onMessageSelected(insight.personalizedMessage!); setOpen(false); }}>
                          Folosește în panou
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {insight.nextAction && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">
                    👉 Următoarea acțiune
                  </p>
                  <p className="text-sm">{insight.nextAction}</p>
                </div>
              )}

              {insight.raw && (
                <pre className="text-xs whitespace-pre-wrap p-2 rounded bg-muted">{insight.raw}</pre>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t">
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() => generateMutation.mutate(true)}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Regenerează analiza
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface DailyBriefingButtonProps {
  className?: string;
}

export const DailyBriefingButton = ({ className }: DailyBriefingButtonProps) => {
  const [open, setOpen] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["scraper-daily-briefing"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("scraper-lead-ai-insight", {
        body: { mode: "briefing" },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { briefing: BriefingData; leads: any[] };
    },
    enabled: open,
    staleTime: 30 * 60 * 1000, // 30 min
  });

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={cn("gap-1.5 border-amber-500/40 hover:bg-amber-500/10", className)}
        onClick={() => setOpen(true)}
      >
        <Sunrise className="w-4 h-4 text-amber-500" />
        Briefing zilnic
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sunrise className="w-5 h-5 text-amber-500" />
              Briefing zilnic — Top oportunități
            </DialogTitle>
            <DialogDescription>
              Strategie zilnică generată de AI pe baza top 5 lead-uri active
            </DialogDescription>
          </DialogHeader>

          {(isLoading || isFetching) && (
            <div className="space-y-3 py-2">
              <Skeleton className="h-16" /><Skeleton className="h-32" /><Skeleton className="h-20" />
            </div>
          )}

          {data && !isLoading && (
            <div className="space-y-4">
              {data.briefing.summary && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1.5">
                      📊 Rezumat strategic
                    </p>
                    <p className="text-sm leading-relaxed">{data.briefing.summary}</p>
                  </CardContent>
                </Card>
              )}

              {data.briefing.dailyFocus && (
                <Card className="border-amber-500/30 bg-amber-500/10">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5" /> Obiectivul zilei
                    </p>
                    <p className="text-base font-medium">{data.briefing.dailyFocus}</p>
                  </CardContent>
                </Card>
              )}

              {data.briefing.topPicks && data.briefing.topPicks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5" /> Lead-uri prioritare
                  </p>
                  {data.briefing.topPicks.map((pick) => {
                    const lead = data.leads[pick.index - 1];
                    if (!lead) return null;
                    return (
                      <div key={pick.index} className="p-3 rounded-lg border bg-card flex items-start gap-3">
                        <Badge variant="secondary" className="shrink-0">{pick.index}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{lead.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{pick.reason}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                            <span className="font-mono">{Number(lead.original_price).toLocaleString("ro-RO")} €</span>
                            <span>· Scor {lead.lead_score}</span>
                            <span>· {lead.source}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {data.briefing.warnings && data.briefing.warnings.length > 0 && (
                <Card className="border-red-500/20 bg-red-500/5">
                  <CardContent className="p-3 space-y-1.5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Atenție
                    </p>
                    <ul className="text-sm space-y-1 list-disc list-inside marker:text-red-500">
                      {data.briefing.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t">
            <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Regenerează briefing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
