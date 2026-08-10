import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle, CheckCircle2, KeyRound, Loader2, RefreshCw, ShieldCheck, Radio,
} from "lucide-react";


/**
 * Meta Conversions API status monitor.
 *
 * Shows whether the server-side relay is configured (secrets present) and the
 * last 5 delivery attempts with their HTTP status. Secrets are never returned
 * to the browser — the edge function answers with booleans only.
 */

interface CapiStatus {
  configured: boolean;
  has_pixel_id: boolean;
  has_access_token: boolean;
  has_test_event_code: boolean;
  missing: string[];
  graph_version?: string;
}

interface DeliveryRow {
  id: string;
  event_name: string;
  event_id: string;
  dry_run: boolean;
  ok: boolean;
  http_status: number | null;
  outcome: string;
  error_detail: string | null;
  created_at: string;
}

const OUTCOME_LABEL: Record<string, string> = {
  sent: "Trimis",
  skipped_not_configured: "Ignorat (secrete lipsă)",
  meta_rejected: "Respins de Meta",
  network_error: "Eroare de rețea",
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" });

export const CapiStatusWidget = () => {
  const statusQuery = useQuery<CapiStatus>({
    queryKey: ["capi-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("meta-conversions", { method: "GET" });
      if (error) throw error;
      return data as CapiStatus;
    },
    staleTime: 60_000,
  });

  const eventsQuery = useQuery<DeliveryRow[]>({
    queryKey: ["capi-delivery-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capi_delivery_log")
        .select("id, event_name, event_id, dry_run, ok, http_status, outcome, error_detail, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data ?? []) as DeliveryRow[];
    },
    staleTime: 30_000,
  });

  const status = statusQuery.data;
  const isConfigured = Boolean(status?.configured);
  const lastOk = eventsQuery.data?.find((e) => e.outcome !== "skipped_not_configured")?.ok;

  const refresh = () => {
    statusQuery.refetch();
    eventsQuery.refetch();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Radio className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            Status Meta Conversions API
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Transmisie server-side a conversiilor (ocolește AdBlockers)
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={statusQuery.isFetching || eventsQuery.isFetching}
          aria-label="Reîmprospătează statusul CAPI"
        >
          {statusQuery.isFetching || eventsQuery.isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          )}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {statusQuery.isLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : statusQuery.isError ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            Nu am putut verifica statusul conexiunii.
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {isConfigured ? (
              <Badge className="gap-1">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                {lastOk === false ? "Activ / Verifică erorile" : "Activ / Test OK"}
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                Inactiv (Fallback activ – necesită chei Meta)
              </Badge>
            )}
            <Badge variant="outline" className="gap-1">
              <KeyRound className="w-3 h-3" aria-hidden="true" />
              Pixel ID: {status?.has_pixel_id ? "setat" : "neconfigurat"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <KeyRound className="w-3 h-3" aria-hidden="true" />
              Access Token: {status?.has_access_token ? "setat" : "neconfigurat"}
            </Badge>
            <Badge variant="outline">
              Test Event Code: {status?.has_test_event_code ? "setat" : "opțional"}
            </Badge>
          </div>
        )}

        {!isConfigured && !statusQuery.isLoading && !statusQuery.isError && (
          <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            Fallback activ: transmisia server-side este în pauză, iar conversiile sunt raportate
            client-side prin GA4 și Meta Pixel. Nu apar erori pentru vizitatori — evenimentele sunt
            doar marcate „Ignorat” în jurnal. CAPI pornește automat imediat ce salvezi cheile Meta.
          </p>
        )}


        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Ultimele 5 evenimente</p>
          {eventsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : eventsQuery.isError ? (
            <p className="text-sm text-destructive">Nu am putut încărca jurnalul de livrări.</p>
          ) : (eventsQuery.data?.length ?? 0) === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Niciun eveniment înregistrat încă. Rulează un test din panoul de validare mai jos.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {eventsQuery.data!.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 p-2.5 text-sm">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{row.event_name}</span>
                      {row.dry_run && (
                        <Badge variant="secondary" className="text-[10px]">test</Badge>
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatTime(row.created_at)} · {OUTCOME_LABEL[row.outcome] ?? row.outcome}
                      {/* Missing keys are an expected fallback state, not an error to surface. */}
                      {row.error_detail && row.outcome !== "skipped_not_configured"
                        ? ` · ${row.error_detail}`
                        : ""}
                    </p>
                  </div>
                  <Badge
                    variant={
                      row.ok ? "default" : row.outcome === "skipped_not_configured" ? "secondary" : "destructive"
                    }
                    className="shrink-0"
                  >
                    {row.http_status ?? (row.outcome === "skipped_not_configured" ? "fallback" : "—")}
                  </Badge>

                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CapiStatusWidget;
