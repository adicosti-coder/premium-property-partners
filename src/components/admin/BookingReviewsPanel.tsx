import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, ExternalLink, RefreshCw, Star } from "lucide-react";

/**
 * Recenzii & note Booking — imaginea curentă pe fiecare apartament:
 * nota, numărul de recenzii, când a fost actualizată ultima dată și linkul Booking.
 * Marchează rândurile care necesită atenție (fără notă, notă neverosimilă,
 * link nepotrivit cu apartamentul sau eroare la preluare).
 */

interface LiveRow {
  property_slug: string;
  rating: number | null;
  reviews_count: number | null;
  last_rating_update: string | null;
  booking_com_url: string | null;
  booking_url: string | null;
  scrape_error: string | null;
}

interface PropertyRow {
  slug: string;
  name: string | null;
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

const RatingBadge = ({ rating, reviews }: { rating: number | null; reviews: number | null }) => {
  if (rating === null || reviews === null || reviews <= 0) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Fără recenzii
      </Badge>
    );
  }
  const low = rating < 7;
  return (
    <Badge
      variant="outline"
      className={
        low
          ? "gap-1 bg-destructive/10 text-destructive border-destructive/30"
          : "gap-1 bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400"
      }
    >
      <Star className="w-3 h-3" />
      {rating.toFixed(1)}/10
    </Badge>
  );
};

const BookingReviewsPanel = () => {
  const queryClient = useQueryClient();

  const liveQuery = useQuery({
    queryKey: ["admin", "booking-reviews", "live"],
    queryFn: async (): Promise<LiveRow[]> => {
      const { data, error } = await supabase
        .from("property_live_data")
        .select("property_slug, rating, reviews_count, last_rating_update, booking_com_url, booking_url, scrape_error")
        .order("rating", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as LiveRow[];
    },
  });

  const propsQuery = useQuery({
    queryKey: ["admin", "booking-reviews", "properties"],
    queryFn: async (): Promise<PropertyRow[]> => {
      const { data, error } = await supabase.from("properties").select("slug, name");
      if (error) throw error;
      return (data ?? []) as PropertyRow[];
    },
  });

  const nameBySlug = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of propsQuery.data ?? []) map.set(p.slug, p.name ?? p.slug);
    return map;
  }, [propsQuery.data]);

  const rows = liveQuery.data ?? [];

  const stats = useMemo(() => {
    const withReviews = rows.filter((r) => (r.reviews_count ?? 0) > 0 && r.rating !== null);
    const totalReviews = withReviews.reduce((s, r) => s + (r.reviews_count ?? 0), 0);
    const avg =
      withReviews.length > 0
        ? withReviews.reduce((s, r) => s + (r.rating ?? 0), 0) / withReviews.length
        : null;
    const needsAttention = rows.filter(
      (r) =>
        !!r.scrape_error ||
        r.rating === null ||
        (r.reviews_count ?? 0) === 0 ||
        (r.rating ?? 10) < 7 ||
        !nameBySlug.has(r.property_slug),
    ).length;
    return { count: rows.length, totalReviews, avg, needsAttention };
  }, [rows, nameBySlug]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "booking-reviews"] });
  };

  if (liveQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recenzii Booking</CardTitle>
          <CardDescription>Datele nu au putut fi încărcate.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refresh} variant="outline" className="gap-2">
            <RefreshCw className="w-4 h-4" /> Încearcă din nou
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Recenzii & note Booking</CardTitle>
          <CardDescription>
            {liveQuery.isLoading
              ? "Se încarcă…"
              : `${stats.count} apartamente · ${stats.totalReviews} recenzii · nota medie ${
                  stats.avg !== null ? stats.avg.toFixed(1) : "—"
                }/10 · ${stats.needsAttention} de verificat`}
          </CardDescription>
        </div>
        <Button
          onClick={refresh}
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label="Reîmprospătează lista de recenzii"
        >
          <RefreshCw className="w-4 h-4" /> Reîmprospătează
        </Button>
      </CardHeader>
      <CardContent>
        {liveQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nu există încă date de recenzii preluate din Booking.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Apartament</TableHead>
                  <TableHead>Notă</TableHead>
                  <TableHead>Recenzii</TableHead>
                  <TableHead>Actualizat</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Observații</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const name = nameBySlug.get(r.property_slug);
                  const url = r.booking_com_url ?? r.booking_url;
                  const notes: string[] = [];
                  if (!name) notes.push("Slug fără apartament în bază");
                  if (r.scrape_error) notes.push(r.scrape_error);
                  if ((r.reviews_count ?? 0) === 0 || r.rating === null) notes.push("Nicio recenzie preluată");
                  else if ((r.rating ?? 10) < 7) notes.push("Notă neobișnuit de mică — verifică linkul");
                  return (
                    <TableRow key={r.property_slug}>
                      <TableCell className="font-medium">
                        {name ?? r.property_slug}
                        {name && (
                          <span className="block text-xs text-muted-foreground">{r.property_slug}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <RatingBadge rating={r.rating} reviews={r.reviews_count} />
                      </TableCell>
                      <TableCell>{r.reviews_count ?? 0}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {fmtDateTime(r.last_rating_update)}
                      </TableCell>
                      <TableCell>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                            aria-label={`Deschide pagina Booking pentru ${name ?? r.property_slug}`}
                          >
                            Deschide <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        {notes.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          <span className="inline-flex items-start gap-1 text-sm text-destructive">
                            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{notes.join(" · ")}</span>
                          </span>
                        )}
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
  );
};

export default BookingReviewsPanel;
