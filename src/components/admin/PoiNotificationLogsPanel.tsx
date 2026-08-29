import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, RefreshCw, Mail, MessageCircle, AlertTriangle } from "lucide-react";

interface NotificationLogRow {
  id: string;
  review_id: string | null;
  poi_name: string | null;
  rating: number | null;
  guest_name: string | null;
  email_to: string | null;
  email_sent: boolean;
  email_fallback: boolean;
  whatsapp_configured: boolean;
  whatsapp_status: number | null;
  error_message: string | null;
  created_at: string;
}

const COLUMNS =
  "id, review_id, poi_name, rating, guest_name, email_to, email_sent, email_fallback, whatsapp_configured, whatsapp_status, error_message, created_at";

const dt = (v: string | null) => (v ? new Date(v).toLocaleString("ro-RO") : "—");

export default function PoiNotificationLogsPanel() {
  const qc = useQueryClient();

  const logs = useQuery({
    queryKey: ["admin", "poi-review-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("poi_review_notifications")
        .select(COLUMNS)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as NotificationLogRow[];
    },
  });

  const rows = logs.data ?? [];

  const stats = useMemo(() => {
    const emailOk = rows.filter((r) => r.email_sent).length;
    const waOk = rows.filter((r) => r.whatsapp_status !== null && r.whatsapp_status < 300).length;
    const failed = rows.filter((r) => r.error_message || (!r.email_sent && !r.email_fallback)).length;
    return { emailOk, waOk, failed };
  }, [rows]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" aria-hidden="true" />
            Jurnal notificări moderare
          </CardTitle>
          <CardDescription>
            Istoricul alertelor trimise administratorului (e-mail + WhatsApp) pentru recenziile noi
            de la oaspeți.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={handleExportCsv}
            aria-label="Exportă jurnalul de notificări în format CSV"
          >
            <Download className="w-4 h-4 mr-2" aria-hidden="true" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void qc.invalidateQueries({ queryKey: ["admin", "poi-review-notifications"] })}
            aria-label="Reîncarcă jurnalul de notificări"
          >
            <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
            Reîncarcă
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" aria-hidden="true" /> E-mailuri trimise
            </p>
            <p className="text-2xl font-bold">{stats.emailOk}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" /> Webhook-uri OK
            </p>
            <p className="text-2xl font-bold">{stats.waOk}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" /> Cu probleme
            </p>
            <p className="text-2xl font-bold">{stats.failed}</p>
          </div>
        </div>

        {logs.isLoading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : logs.isError ? (
          <p className="text-sm text-destructive">
            Nu am putut încărca jurnalul: {(logs.error as Error).message}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nicio notificare trimisă până acum.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Locație</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>Eroare</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{dt(r.created_at)}</TableCell>
                    <TableCell className="font-medium">
                      {r.poi_name ?? "—"}
                      {r.guest_name ? (
                        <span className="block text-xs text-muted-foreground">{r.guest_name}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>{r.rating ? `${r.rating}/5` : "—"}</TableCell>
                    <TableCell>
                      {r.email_sent ? (
                        <Badge variant="secondary">Trimis</Badge>
                      ) : r.email_fallback ? (
                        <Badge variant="outline">Salvat fallback</Badge>
                      ) : (
                        <Badge variant="destructive">Eșuat</Badge>
                      )}
                      {r.email_to ? (
                        <span className="block text-xs text-muted-foreground">{r.email_to}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {!r.whatsapp_configured ? (
                        <span className="text-xs text-muted-foreground">Neconfigurat</span>
                      ) : r.whatsapp_status !== null && r.whatsapp_status < 300 ? (
                        <Badge variant="secondary">{r.whatsapp_status}</Badge>
                      ) : (
                        <Badge variant="destructive">{r.whatsapp_status ?? "eroare"}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-xs text-muted-foreground truncate">
                      {r.error_message ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
