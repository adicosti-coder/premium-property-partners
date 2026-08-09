import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { AdminPageShell } from "@/components/admin/shared/AdminPageShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, CheckCircle2, XCircle, Loader2, RefreshCw, FlaskConical, ShieldCheck,
} from "lucide-react";
import { hasAdsConsent, hasAnalyticsConsent } from "@/lib/conversionTracking";

/**
 * Tracking QA — dry-run validation for the owner lead funnel.
 *
 * Simulates a submit on the owners form (`Lead_Submit` → Meta `Lead`) and
 * verifies, in one pass, that:
 *   • the GTM `dataLayer` receives the event,
 *   • GA4 (`gtag`) is loaded and accepts the event,
 *   • the Meta Conversions API accepts the SAME `event_id` server-side
 *     (PII hashed with SHA-256 inside the edge function — never sent raw here
 *     beyond the synthetic test values below).
 *
 * The run is flagged `dry_run`, so the edge function attaches Meta's
 * `test_event_code` and the event lands in Test Events instead of production
 * optimisation data. Results are persisted for the admin audit trail.
 */

/** Synthetic values — never a real visitor. */
const TEST_EMAIL = "qa+tracking@realtrust.ro";
const TEST_PHONE = "+40712345678";
const TEST_NAME = "QA Tracking";

interface TestRunRow {
  id: string;
  event_name: string;
  event_id: string;
  datalayer_fired: boolean;
  ga4_fired: boolean;
  capi_http_status: number | null;
  capi_event_id: string | null;
  event_id_matched: boolean;
  hashed_fields: string[] | null;
  capi_response: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

interface CapiResult {
  ok?: boolean;
  dry_run?: boolean;
  configured?: boolean;
  reason?: string;
  missing?: string[];
  status?: number;
  event_id?: string;
  hashed_fields?: string[];
  test_event_code?: string | null;
  error?: unknown;
  details?: string;
  meta?: unknown;
}

const newEventId = () => {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `qa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const StatusPill = ({ ok, label }: { ok: boolean; label: string }) => (
  <Badge variant={ok ? "default" : "destructive"} className="gap-1">
    {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {label}
  </Badge>
);

export default function TrackingQAPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<CapiResult | null>(null);

  const { data: runs = [], isLoading, refetch } = useQuery({
    queryKey: ["conversion-test-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversion_test_runs" as never)
        .select(
          "id, event_name, event_id, datalayer_fired, ga4_fired, capi_http_status, capi_event_id, event_id_matched, hashed_fields, capi_response, notes, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as unknown as TestRunRow[];
    },
    staleTime: 30_000,
  });

  const runTest = useCallback(async () => {
    setRunning(true);
    setLastResult(null);

    const eventId = newEventId();
    const eventName = "Lead_Submit";
    let dataLayerFired = false;
    let ga4Fired = false;

    // 1. GTM dataLayer (no PII)
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: eventName,
        event_id: eventId,
        source: "admin_tracking_qa",
        dry_run: true,
        page_path: "/pentru-proprietari",
        timestamp: new Date().toISOString(),
      });
      dataLayerFired = true;
    } catch {
      dataLayerFired = false;
    }

    // 2. GA4 direct
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", eventName, {
          event_category: "conversion",
          event_label: "admin_tracking_qa",
          event_id: eventId,
          debug_mode: true,
        });
        ga4Fired = true;
      }
    } catch {
      ga4Fired = false;
    }

    // 3. Meta Conversions API (server-side, hashed, test event)
    let capi: CapiResult = {};
    let httpStatus: number | null = null;
    try {
      const { data, error } = await supabase.functions.invoke("meta-conversions", {
        body: {
          event_name: "Lead",
          is_custom: false,
          event_id: eventId,
          event_source_url: `${window.location.origin}/pentru-proprietari`,
          action_source: "website",
          source: "admin_tracking_qa",
          email: TEST_EMAIL,
          phone: TEST_PHONE,
          name: TEST_NAME,
          dry_run: true,
        },
      });
      if (error) {
        capi = { ok: false, details: error.message };
      } else {
        capi = (data ?? {}) as CapiResult;
        httpStatus = capi.status ?? (capi.ok ? 200 : null);
      }
    } catch (err) {
      capi = { ok: false, details: err instanceof Error ? err.message : String(err) };
    }

    const matched = capi.event_id === eventId;
    setLastResult(capi);

    // 4. Persist to the admin audit trail
    try {
      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("conversion_test_runs" as never).insert({
        event_name: eventName,
        event_id: eventId,
        dry_run: true,
        datalayer_fired: dataLayerFired,
        ga4_fired: ga4Fired,
        capi_http_status: httpStatus,
        capi_event_id: capi.event_id ?? null,
        event_id_matched: matched,
        hashed_fields: capi.hashed_fields ?? [],
        capi_response: capi as unknown as Record<string, unknown>,
        notes: capi.reason ?? capi.details ?? null,
        created_by: auth?.user?.id ?? null,
      } as never);
      queryClient.invalidateQueries({ queryKey: ["conversion-test-runs"] });
    } catch {
      /* logging must never break the test */
    }

    const success = Boolean(capi.ok) && matched;
    toast({
      title: success ? "Test tracking reușit" : "Test tracking cu probleme",
      description: success
        ? `Evenimentul ${eventName} a fost livrat (GA4 + Meta CAPI), event_id potrivit.`
        : capi.reason === "meta_capi_not_configured"
          ? "Meta CAPI nu este configurat (lipsesc credențialele)."
          : "Verifică detaliile din jurnalul de mai jos.",
      variant: success ? "default" : "destructive",
    });

    setRunning(false);
  }, [queryClient, toast]);

  const capiOk = Boolean(lastResult?.ok);

  return (
    <AdminPageShell
      icon={FlaskConical}
      title="Validare Tracking Conversii"
      description="Simulează un submit pe formularul de proprietari și verifică livrarea simultană în GA4 și prin Meta Conversions API (hash SHA-256 pe telefon/email, server-side)."
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            aria-label="Reîmprospătează jurnalul de teste"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Reîmprospătează
          </Button>
          <Button onClick={runTest} disabled={running} aria-label="Rulează test dry-run de conversie">
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
            Rulează test dry-run
          </Button>
        </>
      }
      stats={
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Consimțământ analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusPill ok={hasAnalyticsConsent()} label={hasAnalyticsConsent() ? "Activ" : "Lipsă"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Consimțământ ads (Meta)</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusPill ok={hasAdsConsent()} label={hasAdsConsent() ? "Activ" : "Lipsă"} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">GA4 (gtag) încărcat</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusPill
                ok={typeof window !== "undefined" && typeof window.gtag === "function"}
                label={typeof window !== "undefined" && typeof window.gtag === "function" ? "Da" : "Nu"}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Ultimul CAPI</CardTitle>
            </CardHeader>
            <CardContent>
              {lastResult ? (
                <StatusPill ok={capiOk} label={capiOk ? `HTTP ${lastResult.status ?? 200}` : "Eșuat"} />
              ) : (
                <span className="text-sm text-muted-foreground">Niciun test în sesiune</span>
              )}
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="space-y-6">
        {lastResult && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Rezultat ultimul dry-run
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">Câmpuri hash-uite (SHA-256): </span>
                {lastResult.hashed_fields?.length ? lastResult.hashed_fields.join(", ") : "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Test event code Meta: </span>
                {lastResult.test_event_code || "neconfigurat"}
              </p>
              {(lastResult.reason || lastResult.details) && (
                <p className="text-destructive break-words">
                  {lastResult.reason ?? ""} {lastResult.details ?? ""}
                </p>
              )}
              {lastResult.missing?.length ? (
                <p className="text-destructive">Secrete lipsă: {lastResult.missing.join(", ")}</p>
              ) : null}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Jurnal de audit — livrare conversii</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Se încarcă jurnalul…
              </div>
            ) : runs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                Niciun test rulat încă. Apasă „Rulează test dry-run”.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Eveniment</TableHead>
                      <TableHead>dataLayer</TableHead>
                      <TableHead>GA4</TableHead>
                      <TableHead>CAPI</TableHead>
                      <TableHead>event_id match</TableHead>
                      <TableHead>Hash</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runs.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(run.created_at).toLocaleString("ro-RO")}
                        </TableCell>
                        <TableCell className="font-medium">{run.event_name}</TableCell>
                        <TableCell><StatusPill ok={run.datalayer_fired} label={run.datalayer_fired ? "OK" : "Nu"} /></TableCell>
                        <TableCell><StatusPill ok={run.ga4_fired} label={run.ga4_fired ? "OK" : "Nu"} /></TableCell>
                        <TableCell>
                          <StatusPill
                            ok={run.capi_http_status === 200}
                            label={run.capi_http_status ? `HTTP ${run.capi_http_status}` : "—"}
                          />
                        </TableCell>
                        <TableCell><StatusPill ok={run.event_id_matched} label={run.event_id_matched ? "Da" : "Nu"} /></TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {run.hashed_fields?.length ? run.hashed_fields.join(", ") : "—"}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground" title={run.notes ?? ""}>
                          {run.notes ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
