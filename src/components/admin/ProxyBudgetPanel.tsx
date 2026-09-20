import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gauge, RefreshCw, AlertTriangle } from "lucide-react";

type Row = {
  created_at: string;
  provider: string;
  kind: string;
  domain: string | null;
  ok: boolean;
  budget_exhausted: boolean;
  cost_credits: number;
};

const MAX_SEARCH_PER_RUN = 4;
const MAX_DETAIL_PER_RUN = 12;

/**
 * Contor de apeluri prin proxy (OLX & co.) + costul estimat în credite.
 * Arată consumul de azi / 7 zile, defalcat pe tip de pagină și portal,
 * plus de câte ori bugetul pe rulare s-a epuizat.
 */
export default function ProxyBudgetPanel() {
  const { data: rows = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["proxy-call-log"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from("proxy_call_log")
        .select("created_at, provider, kind, domain, ok, budget_exhausted, cost_credits")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const stats = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const today = rows.filter((r) => new Date(r.created_at) >= startOfDay);

    const sum = (list: Row[]) => ({
      calls: list.filter((r) => !r.budget_exhausted).length,
      ok: list.filter((r) => r.ok).length,
      credits: list.reduce((a, r) => a + Number(r.cost_credits || 0), 0),
      exhausted: list.filter((r) => r.budget_exhausted).length,
      search: list.filter((r) => !r.budget_exhausted && r.kind === "search").length,
      detail: list.filter((r) => !r.budget_exhausted && r.kind === "detail").length,
    });

    const byDomain = new Map<string, { calls: number; credits: number; ok: number }>();
    for (const r of today) {
      if (r.budget_exhausted) continue;
      const key = r.domain || "necunoscut";
      const cur = byDomain.get(key) ?? { calls: 0, credits: 0, ok: 0 };
      cur.calls++;
      cur.credits += Number(r.cost_credits || 0);
      if (r.ok) cur.ok++;
      byDomain.set(key, cur);
    }

    const byProvider = new Map<string, number>();
    for (const r of today) {
      if (r.budget_exhausted) continue;
      byProvider.set(r.provider, (byProvider.get(r.provider) ?? 0) + 1);
    }

    return {
      today: sum(today),
      week: sum(rows),
      byDomain: [...byDomain.entries()].sort((a, b) => b[1].calls - a[1].calls),
      byProvider: [...byProvider.entries()].sort((a, b) => b[1] - a[1]),
      lastCall: rows[0]?.created_at ?? null,
    };
  }, [rows]);

  const pct = (v: number, max: number) => Math.min(100, Math.round((v / Math.max(max, 1)) * 100));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Gauge className="h-5 w-5 text-primary" />
          Apeluri OLX prin proxy & cost
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
          Reîmprospătează
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Se încarcă...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">Apeluri azi</div>
                <div className="text-2xl font-bold tabular-nums">{stats.today.calls}</div>
                <div className="text-[11px] text-muted-foreground">
                  {stats.today.ok} reușite
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">Cost estimat azi</div>
                <div className="text-2xl font-bold tabular-nums">{stats.today.credits}</div>
                <div className="text-[11px] text-muted-foreground">credite proxy</div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">Apeluri 7 zile</div>
                <div className="text-2xl font-bold tabular-nums">{stats.week.calls}</div>
                <div className="text-[11px] text-muted-foreground">
                  {stats.week.credits} credite
                </div>
              </div>
              <div
                className={`rounded-lg border p-3 ${
                  stats.today.exhausted > 0 ? "border-destructive/40 bg-destructive/5" : "border-border"
                }`}
              >
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {stats.today.exhausted > 0 && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                  Buget epuizat azi
                </div>
                <div
                  className={`text-2xl font-bold tabular-nums ${
                    stats.today.exhausted > 0 ? "text-destructive" : ""
                  }`}
                >
                  {stats.today.exhausted}
                </div>
                <div className="text-[11px] text-muted-foreground">apeluri refuzate</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    Pagini de căutare azi (plafon {MAX_SEARCH_PER_RUN}/rulare)
                  </span>
                  <span className="font-medium tabular-nums">{stats.today.search}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${pct(stats.today.search, MAX_SEARCH_PER_RUN * 6)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    Pagini de anunț azi (plafon {MAX_DETAIL_PER_RUN}/rulare)
                  </span>
                  <span className="font-medium tabular-nums">{stats.today.detail}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${pct(stats.today.detail, MAX_DETAIL_PER_RUN * 6)}%` }}
                  />
                </div>
              </div>
            </div>

            {stats.byProvider.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {stats.byProvider.map(([p, n]) => (
                  <Badge key={p} variant="secondary">
                    {p === "none" ? "fără furnizor" : p}: {n}
                  </Badge>
                ))}
              </div>
            )}

            <div>
              <div className="text-sm font-medium mb-2">Consum azi pe portal</div>
              {stats.byDomain.length === 0 ? (
                <p className="text-sm text-muted-foreground">Niciun apel prin proxy azi.</p>
              ) : (
                <div className="space-y-2">
                  {stats.byDomain.map(([domain, d]) => (
                    <div
                      key={domain}
                      className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm"
                    >
                      <span className="font-medium">{domain}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {d.calls} apeluri · {d.ok} reușite · {d.credits} credite
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Ultimul apel:{" "}
              {stats.lastCall
                ? new Date(stats.lastCall).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" })
                : "—"}
              . Costul este estimat (≈5 credite/apel) și include doar apelurile prin proxy, nu cele directe.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
