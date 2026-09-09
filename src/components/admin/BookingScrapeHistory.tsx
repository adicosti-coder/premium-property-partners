import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, Star } from "lucide-react";

/**
 * Istoricul preluărilor de note și recenzii din Booking.
 * Afișează fiecare rulare (progres, câte note s-au actualizat, erori) plus
 * detaliul pe apartament, ca să fie clar ce a eșuat și de ce.
 */

interface ScrapeRun {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  trigger_source: string;
  total_properties: number;
  processed_count: number;
  rating_updated_count: number;
  price_updated_count: number;
  error_count: number;
  last_error: string | null;
}

interface ScrapeItem {
  id: string;
  run_id: string;
  property_slug: string;
  rating: number | null;
  reviews_count: number | null;
  price_per_night: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const STATUS_META: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  success: {
    label: "Reușit",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  partial: {
    label: "Parțial",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
    icon: AlertTriangle,
  },
  failed: {
    label: "Eșuat",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    icon: AlertTriangle,
  },
  running: {
    label: "În curs",
    className: "bg-primary/10 text-primary border-primary/30",
    icon: Clock,
  },
};

const StatusBadge = ({ status }: { status: string }) => {
  const meta = STATUS_META[status] ?? STATUS_META.running;
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${meta.className}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </Badge>
  );
};

const BookingScrapeHistory = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [openRunId, setOpenRunId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const runsQuery = useQuery({
    queryKey: ["admin", "booking-scrape-runs"],
    queryFn: async (): Promise<ScrapeRun[]> => {
      const { data, error } = await supabase
        .from("booking_scrape_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as ScrapeRun[];
    },
    refetchInterval: 15_000,
  });

  const itemsQuery = useQuery({
    queryKey: ["admin", "booking-scrape-items", openRunId],
    enabled: !!openRunId,
    queryFn: async (): Promise<ScrapeItem[]> => {
      const { data, error } = await supabase
        .from("booking_scrape_items")
        .select("*")
        .eq("run_id", openRunId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScrapeItem[];
    },
  });

  const startRun = async () => {
    setIsStarting(true);
    try {
      const { error } = await supabase.functions.invoke("scrape-property-data", {
        body: { trigger_source: "admin-manual" },
      });
      if (error) throw error;
      toast({
        title: "Preluare pornită",
        description: "Notele și recenziile se actualizează. Progresul apare mai jos.",
      });
    } catch (err) {
      toast({
        title: "Nu am putut porni preluarea",
        description: err instanceof Error ? err.message : "Eroare necunoscută",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "booking-scrape-runs"] });
    }
  };

  const runs = runsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Note și recenzii Booking
            </CardTitle>
            <CardDescription>
              Ultimele preluări automate, cu progres, note actualizate și erori pe apartament.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => runsQuery.refetch()}
              disabled={runsQuery.isFetching}
              aria-label="Reîmprospătează lista preluărilor"
            >
              <RefreshCw className={`w-4 h-4 ${runsQuery.isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button size="sm" onClick={startRun} disabled={isStarting}>
              {isStarting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Preia acum
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {runsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : runsQuery.error ? (
            <p className="text-sm text-destructive">
              Nu am putut încărca istoricul preluărilor. Încearcă din nou.
            </p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nu există încă preluări înregistrate. Apasă „Preia acum” pentru prima rulare.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pornit</TableHead>
                    <TableHead>Stare</TableHead>
                    <TableHead>Progres</TableHead>
                    <TableHead>Note noi</TableHead>
                    <TableHead>Erori</TableHead>
                    <TableHead>Sursă</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => {
                    const total = run.total_properties || 1;
                    const pct = Math.min(100, Math.round((run.processed_count / total) * 100));
                    return (
                      <TableRow key={run.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {fmtDateTime(run.started_at)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={run.status} />
                        </TableCell>
                        <TableCell className="min-w-[140px]">
                          <Progress value={pct} className="h-2" />
                          <span className="text-xs text-muted-foreground">
                            {run.processed_count}/{run.total_properties}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{run.rating_updated_count}</TableCell>
                        <TableCell className="text-sm">
                          {run.error_count > 0 ? (
                            <span className="text-destructive">{run.error_count}</span>
                          ) : (
                            "0"
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {run.trigger_source}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setOpenRunId(openRunId === run.id ? null : run.id)}
                          >
                            {openRunId === run.id ? "Ascunde" : "Detalii"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {openRunId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detaliu pe apartament</CardTitle>
            <CardDescription>
              Nota și numărul de recenzii citite, plus mesajul erorii acolo unde citirea a eșuat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {itemsQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : itemsQuery.error ? (
              <p className="text-sm text-destructive">Nu am putut încărca detaliile.</p>
            ) : (itemsQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Rularea nu a înregistrat încă niciun apartament.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Apartament</TableHead>
                      <TableHead>Notă</TableHead>
                      <TableHead>Recenzii</TableHead>
                      <TableHead>Preț/noapte</TableHead>
                      <TableHead>Stare</TableHead>
                      <TableHead>Eroare</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(itemsQuery.data ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.property_slug}</TableCell>
                        <TableCell className="text-sm">
                          {item.rating != null ? `${item.rating}/10` : "—"}
                        </TableCell>
                        <TableCell className="text-sm">{item.reviews_count ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {item.price_per_night != null ? `${item.price_per_night} €` : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status === "ok" ? "success" : "failed"} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[320px] break-words">
                          {item.error_message ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BookingScrapeHistory;
