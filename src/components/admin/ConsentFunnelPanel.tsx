import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ConsentRow {
  status: string;
  requested_at: string | null;
  consented_at: string | null;
  revoked_at: string | null;
  published_at: string | null;
}

interface FunnelStats {
  requested: number;
  granted: number;
  published: number;
  revoked: number;
  conversionPct: number;
  avgResponseHours: number | null;
}

const computeStats = (rows: ConsentRow[], sinceIso: string): FunnelStats => {
  const inWindow = rows.filter((r) => (r.requested_at ?? "") >= sinceIso);
  const requested = inWindow.length;
  const granted = inWindow.filter((r) => r.consented_at).length;
  const published = inWindow.filter((r) => r.published_at).length;
  const revoked = inWindow.filter((r) => r.revoked_at).length;
  const responseHours = inWindow
    .filter((r) => r.requested_at && r.consented_at)
    .map((r) => (new Date(r.consented_at!).getTime() - new Date(r.requested_at!).getTime()) / 3_600_000)
    .filter((h) => h >= 0 && h < 24 * 30);
  const avgResponseHours = responseHours.length
    ? Math.round((responseHours.reduce((s, h) => s + h, 0) / responseHours.length) * 10) / 10
    : null;
  return {
    requested,
    granted,
    published,
    revoked,
    conversionPct: requested ? Math.round((granted / requested) * 100) : 0,
    avgResponseHours,
  };
};

const StatCard = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <Card>
    <CardContent className="p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </CardContent>
  </Card>
);

const FunnelBlock = ({ title, stats }: { title: string; stats: FunnelStats }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <p className="text-sm font-medium">{title}</p>
      <Badge variant={stats.conversionPct >= 30 ? "default" : "secondary"} className="text-[10px]">
        Conversie {stats.conversionPct}%
      </Badge>
    </div>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <StatCard label="Cereri trimise" value={String(stats.requested)} />
      <StatCard label="Acorduri „DA"" value={String(stats.granted)} />
      <StatCard label="Publicate" value={String(stats.published)} />
      <StatCard label="Retrase / STOP" value={String(stats.revoked)} />
      <StatCard
        label="Timp mediu de răspuns"
        value={stats.avgResponseHours === null ? "—" : stats.avgResponseHours < 1 ? `${Math.round(stats.avgResponseHours * 60)} min` : `${stats.avgResponseHours} h`}
      />
    </div>
  </div>
);

export default function ConsentFunnelPanel() {
  const q = useQuery({
    queryKey: ["consent-funnel"],
    refetchInterval: 300_000,
    queryFn: async (): Promise<{ week: FunnelStats; month: FunnelStats }> => {
      const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
      const { data, error } = await supabase
        .from("wa_publish_consents")
        .select("status, requested_at, consented_at, revoked_at, published_at")
        .gte("requested_at", since30)
        .limit(2000);
      if (error) throw error;
      const rows = (data ?? []) as ConsentRow[];
      return {
        week: computeStats(rows, new Date(Date.now() - 7 * 864e5).toISOString()),
        month: computeStats(rows, since30),
      };
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Conversia cererilor de acord (WhatsApp)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {q.isLoading && <p className="text-sm text-muted-foreground">Se încarcă…</p>}
        {q.data && (
          <>
            <FunnelBlock title="Ultimele 7 zile" stats={q.data.week} />
            <FunnelBlock title="Ultimele 30 de zile" stats={q.data.month} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
