import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Link2Off, RefreshCw, Trash2 } from "lucide-react";

interface NotFoundLogRow {
  id: string;
  path: string;
  referrer: string | null;
  user_agent: string | null;
  hits: number;
  first_seen_at: string;
  last_seen_at: string;
}

const COLUMNS = "id, path, referrer, user_agent, hits, first_seen_at, last_seen_at";

const dt = (v: string | null) => (v ? new Date(v).toLocaleString("ro-RO") : "—");

export default function NotFoundLogsPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const logs = useQuery({
    queryKey: ["admin", "404-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_404_logs")
        .select(COLUMNS)
        .order("last_seen_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as NotFoundLogRow[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_404_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: (id: string) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin", "404-logs"] });
      toast({ title: "Intrare ștearsă" });
    },
    onError: (e: Error) =>
      toast({ title: "Eroare la ștergere", description: e.message, variant: "destructive" }),
  });

  const rows = logs.data ?? [];
  const totalHits = rows.reduce((acc, r) => acc + r.hits, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Link2Off className="h-5 w-5" aria-hidden="true" />
            Monitorizare 404
          </CardTitle>
          <CardDescription>
            URL-uri inexistente accesate pe site — utile pentru a depista linkuri rupte din exterior.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void logs.refetch()}
          disabled={logs.isFetching}
          aria-label="Reîmprospătează lista de erori 404"
        >
          <RefreshCw className={`h-4 w-4 ${logs.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{rows.length} URL-uri unice</Badge>
            <Badge variant="secondary">{totalHits} accesări totale</Badge>
          </div>
        )}

        {logs.isLoading ? (
          <div className="space-y-2" aria-busy="true" aria-label="Se încarcă erorile 404">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : logs.isError ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Nu s-au putut încărca log-urile 404. Verifică permisiunile de admin.
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nicio eroare 404 înregistrată. Totul arată bine.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL accesat</TableHead>
                  <TableHead>Referrer</TableHead>
                  <TableHead className="text-center">Accesări</TableHead>
                  <TableHead>Prima dată</TableHead>
                  <TableHead>Ultima dată</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-64 truncate font-mono text-xs" title={row.path}>
                      {row.path}
                    </TableCell>
                    <TableCell className="max-w-48 truncate text-xs text-muted-foreground" title={row.referrer ?? ""}>
                      {row.referrer ?? "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={row.hits > 5 ? "destructive" : "outline"}>{row.hits}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{dt(row.first_seen_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{dt(row.last_seen_at)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove.mutate(row.id)}
                        disabled={pendingId === row.id}
                        aria-label={`Șterge intrarea 404 pentru ${row.path}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </Button>
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
