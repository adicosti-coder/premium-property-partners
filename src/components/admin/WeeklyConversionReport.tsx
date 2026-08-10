import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart3, Mail, RefreshCw, TrendingDown, TrendingUp, Users, MousePointerClick, Flame,
} from "lucide-react";

interface ChannelRow {
  channel: string;
  leads: number;
  hot_leads: number;
  avg_score: number | null;
  campaigns: string[] | null;
}

interface Report {
  period_days: number;
  from: string;
  to: string;
  total_leads: number;
  hot_leads: number;
  avg_score: number | null;
  previous_period_leads: number;
  cta_sessions: number;
  conversion_rate: number | null;
  by_channel: ChannelRow[];
  by_cta_variant: Array<{ variant: string; leads: number }>;
  by_landing_path: Array<{ landing_path: string; leads: number }>;
}

const PERIODS = [7, 30, 90] as const;

const Stat = ({
  icon: Icon, label, value, hint,
}: { icon: typeof Users; label: string; value: string; hint?: string }) => (
  <div className="rounded-lg border bg-muted/40 p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </div>
    <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const WeeklyConversionReport = () => {
  const [days, setDays] = useState<number>(7);
  const { toast } = useToast();

  const reportQuery = useQuery({
    queryKey: ["conversion-attribution-report", days],
    queryFn: async (): Promise<Report> => {
      const { data, error } = await supabase.rpc("get_conversion_attribution_report", { p_days: days });
      if (error) throw error;
      return data as unknown as Report;
    },
    staleTime: 60_000,
  });

  const emailMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("weekly-conversion-report", {
        body: { days, send_email: true },
      });
      if (error) throw error;
      return data as { emailed?: string };
    },
    onSuccess: (data) => {
      const status = data?.emailed;
      toast({
        title: status === "sent" ? "Raport trimis" : "Raport generat",
        description:
          status === "sent"
            ? "Digestul a plecat către contact@realtrust.ro."
            : status === "skipped_no_resend_key"
              ? "Emailul nu a putut fi trimis (serviciul de email nu este configurat)."
              : `Status email: ${status ?? "necunoscut"}`,
        variant: status === "sent" ? undefined : "destructive",
      });
    },
    onError: (err: unknown) => {
      toast({
        title: "Trimiterea a eșuat",
        description: err instanceof Error ? err.message : "Eroare necunoscută",
        variant: "destructive",
      });
    },
  });

  const report = reportQuery.data;
  const delta = report ? report.total_leads - report.previous_period_leads : 0;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            Raport conversii & atribuire lead-uri
          </CardTitle>
          <CardDescription>
            Lead-urile grupate după sursa de achiziție (UTM, Google Ads, Meta Ads, outreach) și rata de
            conversie a formularelor. Digestul se trimite automat pe email luni dimineață.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={days === p ? "default" : "outline"}
              onClick={() => setDays(p)}
              aria-pressed={days === p}
              aria-label={`Afișează raportul pentru ultimele ${p} zile`}
            >
              {p}z
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() => reportQuery.refetch()}
            disabled={reportQuery.isFetching}
            aria-label="Reîncarcă raportul"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${reportQuery.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          </Button>
          <Button
            size="sm"
            onClick={() => emailMutation.mutate()}
            disabled={emailMutation.isPending}
            aria-label="Trimite raportul pe email acum"
          >
            <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            {emailMutation.isPending ? "Se trimite…" : "Trimite pe email"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {reportQuery.isLoading ? (
          <div className="grid gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : reportQuery.isError ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Raportul nu a putut fi încărcat. Verifică dacă ai rol de administrator activ.
          </p>
        ) : report ? (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <Stat
                icon={Users}
                label="Lead-uri"
                value={String(report.total_leads)}
                hint={`${delta >= 0 ? "+" : ""}${delta} vs perioada anterioară`}
              />
              <Stat icon={Flame} label="Lead-uri fierbinți" value={String(report.hot_leads)} hint="scor ≥ 60" />
              <Stat
                icon={delta >= 0 ? TrendingUp : TrendingDown}
                label="Rata de conversie"
                value={report.conversion_rate !== null ? `${report.conversion_rate}%` : "—"}
                hint="lead-uri / sesiuni cu interacțiune CTA"
              />
              <Stat
                icon={MousePointerClick}
                label="Sesiuni CTA"
                value={String(report.cta_sessions)}
                hint={report.avg_score !== null ? `scor mediu ${report.avg_score}` : undefined}
              />
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium">Lead-uri după sursă</h3>
              {report.by_channel.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Nu există lead-uri în perioada selectată.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead className="text-right">Lead-uri</TableHead>
                      <TableHead className="text-right">Fierbinți</TableHead>
                      <TableHead className="text-right">Scor mediu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.by_channel.map((row) => (
                      <TableRow key={row.channel}>
                        <TableCell>
                          <span className="font-medium">{row.channel}</span>
                          {row.campaigns?.length ? (
                            <span className="block text-xs text-muted-foreground">
                              {row.campaigns.join(", ")}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{row.leads}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.hot_leads}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.avg_score ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-medium">Variante CTA (A/B)</h3>
                <div className="flex flex-wrap gap-2">
                  {report.by_cta_variant.length === 0 ? (
                    <span className="text-sm text-muted-foreground">Fără date.</span>
                  ) : (
                    report.by_cta_variant.map((v) => (
                      <Badge key={v.variant} variant="outline">
                        {v.variant}: {v.leads}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-medium">Pagini de intrare</h3>
                <ul className="space-y-1 text-sm">
                  {report.by_landing_path.length === 0 ? (
                    <li className="text-muted-foreground">Fără date.</li>
                  ) : (
                    report.by_landing_path.map((p) => (
                      <li key={p.landing_path} className="flex justify-between gap-3">
                        <span className="truncate text-muted-foreground">{p.landing_path}</span>
                        <span className="tabular-nums">{p.leads}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default WeeklyConversionReport;
