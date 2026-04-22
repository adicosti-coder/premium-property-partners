import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Users, Mail, FileDown, ArrowRight, RefreshCw } from "lucide-react";
import { format } from "date-fns";

type Range = "24h" | "7d" | "30d" | "all";

interface SourceStat {
  source: string;
  total: number;
  unread: number;
  with_email: number;
}

interface FunnelStat {
  step: string;
  count: number;
  unique_sessions: number;
}

const RANGE_HOURS: Record<Range, number | null> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  all: null,
};

const STEP_ORDER: Array<{ step: string; label: string; icon: typeof Users }> = [
  { step: "lead_submitted", label: "Lead trimis (PDF deblocat)", icon: Mail },
  { step: "pdf_downloaded", label: "PDF descărcat", icon: FileDown },
  { step: "thankyou_view", label: "Pagina de mulțumire vizualizată", icon: Users },
  { step: "cta_properties", label: "Click → Vezi apartamente", icon: ArrowRight },
  { step: "cta_guide", label: "Click → Citește Ghidul", icon: ArrowRight },
  { step: "cta_evaluation", label: "Click → Evaluare gratuită", icon: TrendingUp },
];

const LeadsAnalyticsDashboard = () => {
  const [range, setRange] = useState<Range>("7d");
  const [loading, setLoading] = useState(true);
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);
  const [funnelStats, setFunnelStats] = useState<FunnelStat[]>([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [unreadLeads, setUnreadLeads] = useState(0);

  const sinceISO = useMemo(() => {
    const hours = RANGE_HOURS[range];
    if (hours === null) return null;
    return new Date(Date.now() - hours * 3_600_000).toISOString();
  }, [range]);

  const load = async () => {
    setLoading(true);
    try {
      // ---- Leads aggregation (uses idx_leads_created_at + idx_leads_source) ----
      let leadsQuery = supabase.from("leads").select("source, is_read, email", { count: "exact" });
      if (sinceISO) leadsQuery = leadsQuery.gte("created_at", sinceISO);
      const { data: leadsData, count } = await leadsQuery.limit(5000);

      const bySource = new Map<string, SourceStat>();
      let unread = 0;
      (leadsData ?? []).forEach((row) => {
        const src = (row.source || "unknown") as string;
        const stat = bySource.get(src) ?? { source: src, total: 0, unread: 0, with_email: 0 };
        stat.total += 1;
        if (!row.is_read) {
          stat.unread += 1;
          unread += 1;
        }
        if (row.email) stat.with_email += 1;
        bySource.set(src, stat);
      });

      setTotalLeads(count ?? leadsData?.length ?? 0);
      setUnreadLeads(unread);
      setSourceStats(
        Array.from(bySource.values()).sort((a, b) => b.total - a.total),
      );

      // ---- PDF Funnel aggregation ----
      let funnelQuery = supabase
        .from("pdf_funnel_events")
        .select("step, session_id");
      if (sinceISO) funnelQuery = funnelQuery.gte("created_at", sinceISO);
      const { data: funnelData } = await funnelQuery.limit(10000);

      const byStep = new Map<string, { count: number; sessions: Set<string> }>();
      (funnelData ?? []).forEach((row) => {
        const entry = byStep.get(row.step) ?? { count: 0, sessions: new Set() };
        entry.count += 1;
        entry.sessions.add(row.session_id);
        byStep.set(row.step, entry);
      });

      setFunnelStats(
        STEP_ORDER.map(({ step }) => ({
          step,
          count: byStep.get(step)?.count ?? 0,
          unique_sessions: byStep.get(step)?.sessions.size ?? 0,
        })),
      );
    } catch (err) {
      console.error("[LeadsAnalyticsDashboard] load error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const baseSessions = funnelStats.find((s) => s.step === "lead_submitted")?.unique_sessions ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold">Analytics & Funnel Lead-uri</h2>
          <p className="text-sm text-muted-foreground">
            Date din indecșii optimizați (<code className="text-xs">created_at</code>,{" "}
            <code className="text-xs">source</code>, <code className="text-xs">is_read</code>) + funnel
            post-PDF.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as Range)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Ultimele 24h</SelectItem>
              <SelectItem value="7d">Ultimele 7 zile</SelectItem>
              <SelectItem value="30d">Ultimele 30 zile</SelectItem>
              <SelectItem value="all">Tot intervalul</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Se încarcă datele…
        </div>
      )}

      {!loading && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Total lead-uri</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{totalLeads}</p>
                <p className="text-xs text-muted-foreground mt-1">Interval: {range}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Necitite</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-amber-600">{unreadLeads}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Folosește <code>idx_leads_unread_recent</code>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Surse active</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-600">{sourceStats.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Canale de conversie distincte</p>
              </CardContent>
            </Card>
          </div>

          {/* Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Lead-uri pe sursă</CardTitle>
            </CardHeader>
            <CardContent>
              {sourceStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">Niciun lead în intervalul selectat.</p>
              ) : (
                <div className="space-y-2">
                  {sourceStats.map((s) => {
                    const pct = totalLeads > 0 ? Math.round((s.total / totalLeads) * 100) : 0;
                    return (
                      <div key={s.source} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{s.source}</p>
                          <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-600"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold">{s.total}</p>
                          <div className="flex gap-1 justify-end">
                            {s.unread > 0 && (
                              <Badge variant="secondary" className="text-xs">{s.unread} noi</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{s.with_email} email</Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Funnel post-PDF (Ghid Investitor 2026)</CardTitle>
              <p className="text-xs text-muted-foreground">
                Bază: {baseSessions} sesiuni cu lead trimis. Procentele se calculează din baza de lead-uri trimise.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {STEP_ORDER.map(({ step, label, icon: Icon }, idx) => {
                  const stat = funnelStats.find((s) => s.step === step);
                  const sessions = stat?.unique_sessions ?? 0;
                  const pct = baseSessions > 0 ? Math.round((sessions / baseSessions) * 100) : 0;
                  return (
                    <div
                      key={step}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                    >
                      <div className="shrink-0 w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                        {idx + 1}
                      </div>
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{label}</p>
                        <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0 min-w-[72px]">
                        <p className="text-lg font-bold">{sessions}</p>
                        <p className="text-xs text-muted-foreground">{pct}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-right">
            Ultima actualizare: {format(new Date(), "dd MMM yyyy HH:mm")}
          </p>
        </>
      )}
    </div>
  );
};

export default LeadsAnalyticsDashboard;
