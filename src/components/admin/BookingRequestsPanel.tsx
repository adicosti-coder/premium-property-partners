import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Inbox, MailWarning, MailCheck, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookingRequestRow {
  id: string;
  reference: string;
  property_name: string;
  property_slug: string | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guests: number | null;
  check_in: string;
  check_out: string;
  nights: number | null;
  message: string | null;
  estimated_total: number | null;
  status: string | null;
  source: string | null;
  admin_email_sent: boolean | null;
  guest_email_sent: boolean | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  new: "Nouă",
  contacted: "Contactat",
  confirmed: "Confirmată",
  declined: "Refuzată",
};

const fmtDate = (value: string) =>
  new Date(value).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" });

export default function BookingRequestsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["admin-booking-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_requests")
        .select(
          "id, reference, property_name, property_slug, guest_name, guest_email, guest_phone, guests, check_in, check_out, nights, message, estimated_total, status, source, admin_email_sent, guest_email_sent, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as BookingRequestRow[];
    },
    staleTime: 30_000,
  });

  const setStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from("booking_requests").update({ status }).eq("id", id);
    setUpdatingId(null);
    if (error) {
      toast({ title: "Nu am putut actualiza statusul", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Status actualizat: ${STATUS_LABEL[status] || status}` });
    queryClient.invalidateQueries({ queryKey: ["admin-booking-requests"] });
  };

  return (
    <Card id="cereri-rezervare" className="scroll-mt-24">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Inbox className="w-5 h-5" aria-hidden="true" />
          Cereri de rezervare din site
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          aria-label="Reîncarcă cererile de rezervare"
        >
          {isRefetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 py-10 justify-center text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Se încarcă cererile…
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-destructive">
            Nu am putut încărca cererile de rezervare.
          </p>
        ) : !data?.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nicio cerere de rezervare încă. Cererile trimise din paginile de cazare apar aici imediat.
          </p>
        ) : (
          <ul className="space-y-3">
            {data.map((r) => (
              <li key={r.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="font-semibold">
                    {r.reference} · {r.property_name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "new" ? "default" : "secondary"}>
                      {STATUS_LABEL[r.status || "new"] || r.status}
                    </Badge>
                    {r.admin_email_sent ? (
                      <Badge variant="outline" className="gap-1">
                        <MailCheck className="w-3 h-3" aria-hidden="true" /> e-mail trimis
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <MailWarning className="w-3 h-3" aria-hidden="true" /> e-mail neconfirmat
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-2 grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  <span>
                    {r.guest_name} · {r.guest_email} · {r.guest_phone}
                  </span>
                  <span>
                    {fmtDate(r.check_in)} → {fmtDate(r.check_out)} · {r.nights ?? "?"} nopți · {r.guests ?? 1} oaspeți
                  </span>
                  {r.estimated_total ? <span>Total estimat: €{Number(r.estimated_total).toLocaleString("ro-RO")}</span> : null}
                  <span>Primită: {fmtDate(r.created_at)}</span>
                </div>
                {r.message && <p className="mt-2 text-sm">{r.message}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["contacted", "confirmed", "declined"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant="outline"
                      disabled={updatingId === r.id || r.status === s}
                      onClick={() => setStatus(r.id, s)}
                    >
                      {STATUS_LABEL[s]}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
