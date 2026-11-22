/** „Flux proprietari” → Urmărește: proprietarii care au deschis linkul scurt /e/<cod> și starea follow-up-ului unic. */
import { useQuery } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import EstimateFollowupBadges from "@/components/admin/EstimateFollowupBadges";

type OpenedRow = {
  id: string; title: string | null; zone: string | null; phone_normalized: string | null;
  estimate_opened_at: string | null; estimate_open_count: number | null;
  estimate_followup_status: string | null; estimate_followup_at: string | null; estimate_followup_note: string | null;
};

export const ESTIMATE_OPENS_QUERY_KEY = ["owner-flow", "estimate-opens"] as const;

export default function EstimateLinkOpensPanel() {
  const { data, error, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ESTIMATE_OPENS_QUERY_KEY, staleTime: 30_000, refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("prospect_listings")
        .select("id, title, zone, phone_normalized, estimate_opened_at, estimate_open_count, estimate_followup_status, estimate_followup_at, estimate_followup_note")
        .not("estimate_opened_at", "is", null)
        .order("estimate_opened_at", { ascending: false }).limit(30);
      if (error) throw error;
      return (data ?? []) as OpenedRow[];
    },
  });
  const scheduled = (data ?? []).filter((r) => r.estimate_followup_status === "scheduled").length;

  return (
    <section aria-labelledby="estimate-opens-title">
      <CardHeader className="px-0 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle id="estimate-opens-title" className="text-base">Linkuri de estimare deschise ({data?.length ?? 0})</CardTitle>
            <CardDescription>
              Un singur follow-up la 24h după prima deschidere, doar 09:00–19:30. Se anulează automat dacă proprietarul răspunde.
              {scheduled ? ` ${scheduled} programate.` : ""}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" className="min-h-12 min-w-12" onClick={() => refetch()} disabled={isRefetching} aria-label="Reîncarcă linkurile deschise">
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0 space-y-2">
        {isLoading ? (
          <p role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…</p>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">Lista nu a putut fi încărcată. Reîncearcă.</p>
        ) : !data?.length ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Niciun proprietar nu a deschis încă linkul estimării.</p>
        ) : data.map((r) => (
          <div key={r.id} className="rounded-lg border p-3 space-y-2">
            <div className="min-w-0">
              <p className="text-sm font-medium line-clamp-2">{r.title || "Anunț"}</p>
              <p className="text-xs text-muted-foreground">
                {[r.zone, r.phone_normalized, (r.estimate_open_count ?? 0) > 1 ? `${r.estimate_open_count} deschideri` : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            <EstimateFollowupBadges row={r} />
          </div>
        ))}
      </CardContent>
    </section>
  );
}
