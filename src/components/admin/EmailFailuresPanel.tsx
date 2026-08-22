import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Check, Loader2, MailWarning, RefreshCw, Send } from "lucide-react";

interface EmailFailureRow {
  id: string;
  created_at: string;
  recipient: string;
  subject: string;
  error_message: string | null;
  http_status: number | null;
  source: string | null;
  retry_count: number | null;
  last_retry_at: string | null;
  last_retry_error: string | null;
  resent_at: string | null;
}

const COLUMNS =
  "id, created_at, recipient, subject, error_message, http_status, source, retry_count, last_retry_at, last_retry_error, resent_at";

const dt = (v: string | null) => (v ? new Date(v).toLocaleString("ro-RO") : "—");

export default function EmailFailuresPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const failures = useQuery({
    queryKey: ["admin", "email-failures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_email_failures")
        .select(COLUMNS)
        .is("acknowledged_at", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as EmailFailureRow[];
    },
  });

  const resend = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("admin-resend-email", {
        body: { failure_id: id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as { sent: boolean; to?: string };
    },
    onMutate: (id: string) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onSuccess: (data) => {
      toast({ title: "E-mail retrimis", description: `Livrat către ${data?.to ?? "destinatar"}.` });
      void qc.invalidateQueries({ queryKey: ["admin", "email-failures"] });
      void qc.invalidateQueries({ queryKey: ["admin", "admin_email_failures"] });
    },
    onError: (e: Error) => {
      toast({ title: "Retrimitere eșuată", description: e.message, variant: "destructive" });
      void qc.invalidateQueries({ queryKey: ["admin", "email-failures"] });
    },
  });

  const acknowledge = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_email_failures")
        .update({ acknowledged_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["admin", "email-failures"] }),
    onError: (e: Error) => toast({ title: "Eroare", description: e.message, variant: "destructive" }),
  });

  const rows = failures.data ?? [];

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MailWarning className="h-4 w-4 text-amber-600" aria-hidden="true" />
            E-mailuri nelivrate
          </CardTitle>
          <CardDescription>
            Notificări salvate când Resend a refuzat trimiterea. Poți relua trimiterea (fallback pe expeditorul
            verificat) sau marca eroarea ca rezolvată.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void failures.refetch()}
          aria-label="Reîmprospătează lista de e-mailuri nelivrate"
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Reîmprospătează
        </Button>
      </CardHeader>
      <CardContent>
        {failures.isLoading ? (
          <div className="space-y-2" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : failures.isError ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Nu am putut încărca erorile de e-mail.
          </p>
        ) : rows.length === 0 ? (
          <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Toate notificările au fost livrate — nicio eroare activă.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Destinatar</TableHead>
                  <TableHead>Subiect</TableHead>
                  <TableHead>Eroare</TableHead>
                  <TableHead>Reîncercări</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs">{dt(row.created_at)}</TableCell>
                    <TableCell className="text-xs">{row.recipient}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs" title={row.subject}>
                      {row.subject}
                    </TableCell>
                    <TableCell className="max-w-[220px] text-xs">
                      <Badge variant="outline" className="mr-2">
                        {row.http_status ?? "—"}
                      </Badge>
                      <span className="text-muted-foreground">
                        {row.last_retry_error || row.error_message || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {row.retry_count ?? 0}
                      {row.last_retry_at ? (
                        <span className="block text-muted-foreground">{dt(row.last_retry_at)}</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => resend.mutate(row.id)}
                          disabled={pendingId === row.id}
                          aria-label={`Re-trimite e-mailul către ${row.recipient}`}
                        >
                          {pendingId === row.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                          )}
                          Re-trimite
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => acknowledge.mutate(row.id)}
                          aria-label={`Marchează eroarea pentru ${row.recipient} ca rezolvată`}
                        >
                          Rezolvat
                        </Button>
                      </div>
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
