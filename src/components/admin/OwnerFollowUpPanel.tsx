/**
 * Pasul 4 din „Flux proprietari" — Urmărește.
 * Mementourile la 24h și 72h pentru proprietarii care nu au răspuns la primul mesaj,
 * plus scăderile de preț (momentul bun de renegociere).
 */
import { lazy, Suspense, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Smartphone, RefreshCw, CheckCircle2, BellRing, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import AdminErrorBoundary from "@/components/admin/AdminErrorBoundary";
import { fetchOwnerReminders, OWNER_FLOW_QUERY_KEY } from "@/lib/ownerFlowData";
import { getTemplate, isWhatsappCapable, detectListingTransaction, whatsappLink } from "@/lib/ownerOutreachTemplates";

const PriceDropAlertsPanel = lazy(() => import("@/components/admin/PriceDropAlertsPanel"));

interface Reminder {
  id: string;
  prospect_listing_id: string | null;
  phone_normalized: string | null;
  offer_price: number | null;
  currency: string | null;
  duration_months: number | null;
  reminder_stage: number;
  next_reminder_at: string | null;
  sent_at: string | null;
  channel: string | null;
  template_key: string | null;
  listing?: {
    title: string | null;
    zone: string | null;
    rooms: number | null;
    price: number | null;
    contact_name: string | null;
    source_platform: string | null;
    description: string | null;
    source_url: string | null;
    category: string | null;
  } | null;
}

const dateRo = (v: string | null) =>
  v ? new Date(v).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const hoursAgo = (v: string | null) => (v ? Math.round((Date.now() - new Date(v).getTime()) / 3_600_000) : null);

export default function OwnerFollowUpPanel() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, setPending] = useState<Reminder | null>(null);
  const [showDrops, setShowDrops] = useState(true);

  const { data, error, isLoading, refetch, isRefetching } = useQuery({
    queryKey: [...OWNER_FLOW_QUERY_KEY, "follow"], staleTime: 30_000,
    refetchInterval: 60_000, queryFn: fetchOwnerReminders,
  });

  const due = data?.due ?? [];
  const upcoming = data?.upcoming ?? [];

  const messageFor = (r: Reminder) => {
    const sale = r.template_key === "first_sale" || (!r.template_key && r.listing && detectListingTransaction(r.listing) === "vanzare");
    const tpl = getTemplate(sale ? (r.reminder_stage === 0 ? "reminder_sale_24h" : "reminder_sale_72h") : (r.reminder_stage === 0 ? "reminder_24h" : "reminder_72h"));
    return tpl.build({
      ownerName: r.listing?.contact_name,
      title: r.listing?.title,
      zone: r.listing?.zone,
      rooms: r.listing?.rooms,
      price: r.listing?.price,
      currency: r.currency,
      offerPrice: r.offer_price,
      durationMonths: r.duration_months,
      platform: r.listing?.source_platform,
    });
  };

  const sendReminder = async (r: Reminder) => {
    if (busy || pending) return;
    try {
      const current = await fetchOwnerReminders();
      if (!current.due.some((item) => item.id === r.id)) {
        toast.error("Mementoul nu mai este eligibil. Reîncarcă lista."); refetch(); return;
      }
      setPending(r);
    } catch { toast.error("Nu am putut verifica istoricul. Mementoul nu s-a deschis."); }
  };

  const confirmReminderSent = async () => {
    if (!pending || busy) return;
    const r = pending;
    setBusy(r.id);
    try {
      const nextStage = r.reminder_stage + 1;
      const nextAt = nextStage >= 2 ? null : new Date(new Date(r.sent_at || new Date().toISOString()).getTime() + 72 * 3_600_000).toISOString();
      const { data, error } = await supabase.from("owner_outreach_messages")
        .update({ reminder_stage: nextStage, next_reminder_at: nextAt, status: nextStage >= 2 ? "followed_up_final" : "followed_up" })
        .eq("id", r.id).eq("reminder_stage", r.reminder_stage).is("replied_at", null).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error("Mementoul a fost deja actualizat. Reîncarcă lista.");
      toast.success(nextStage >= 2 ? "Memento final confirmat." : "Memento confirmat. Următorul la 72h de la primul mesaj.");
      setPending(null);
      queryClient.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
    } catch (err) { toast.error((err as Error).message); }
    finally { setBusy(null); }
  };

  const markReplied = async (r: Reminder) => {
    setBusy(r.id);
    try {
      const { error } = await supabase
        .from("owner_outreach_messages")
        .update({ replied_at: new Date().toISOString(), next_reminder_at: null, status: "replied" })
        .eq("id", r.id);
      if (error) throw error;

      toast.success("Marcat ca „a răspuns”. Nu mai primește mementouri.");
      queryClient.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
      refetch();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const row = (r: Reminder, isDue: boolean) => (
    <div key={r.id} className="rounded-lg border p-3 space-y-2">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium line-clamp-2">{r.listing?.title || "Anunț"}</p>
          <p className="text-xs text-muted-foreground">
            {[r.listing?.zone, r.listing?.rooms ? `${r.listing.rooms} camere` : null, r.phone_normalized].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Primul mesaj: {dateRo(r.sent_at)}
            {hoursAgo(r.sent_at) != null ? ` (acum ${hoursAgo(r.sent_at)}h)` : ""}
          </p>
        </div>
        <Badge variant={isDue ? "default" : "outline"} className="text-[10px] gap-1">
          {isDue ? <BellRing className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
          {r.reminder_stage === 0 ? "memento 24h" : "memento 72h"}
          {!isDue && r.next_reminder_at ? ` · ${dateRo(r.next_reminder_at)}` : ""}
        </Badge>
      </div>
      {isDue && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => sendReminder(r)} disabled={busy !== null || pending !== null} className="min-h-[48px] flex-1 sm:flex-none">
            {busy === r.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
            Pregătește mementoul
          </Button>
          <Button variant="ghost" onClick={() => markReplied(r)} disabled={busy !== null || pending !== null} className="min-h-[48px]">
            <CheckCircle2 className="mr-2 h-4 w-4" /> A răspuns
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <section>
        <CardHeader className="px-0 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Mementouri de trimis ({due.length})</CardTitle>
              <CardDescription>
                Recontactare manuală · 24h / 72h
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} aria-label="Reîncarcă mementourile">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…
            </div>
          ) : error ? (<p role="alert" className="text-sm text-destructive">Mementourile nu au putut fi încărcate. Reîncearcă.</p>) : due.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nimic de reamintit acum. Mementourile apar automat la 24h și 72h după primul mesaj.
            </p>
          ) : (
            due.map((r) => row(r, true))
          )}

          {upcoming.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium text-muted-foreground">Programate ({upcoming.length})</p>
              {upcoming.slice(0, 10).map((r) => row(r, false))}
            </div>
          )}
        </CardContent>
      </section>

      {pending && pending.phone_normalized && (
        <section aria-label="Confirmă mementoul" className="border border-primary rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Confirmă trimiterea mementoului</h2>
          <p className="text-sm whitespace-pre-wrap">{messageFor(pending)}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild><a href={whatsappLink(pending.phone_normalized, messageFor(pending))} target="_blank" rel="noopener noreferrer">Deschide WhatsApp</a></Button>
            <Button onClick={confirmReminderSent} disabled={busy !== null}>Am trimis mementoul</Button>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={busy !== null}>Anulează</Button>
          </div>
        </section>
      )}

      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            onClick={() => setShowDrops((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={showDrops}
          >
            <div>
              <CardTitle className="text-base">Scăderi de preț</CardTitle>
              <CardDescription>Momentul bun de renegociere cu proprietarul.</CardDescription>
            </div>
            {showDrops ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          </button>
        </CardHeader>
        {showDrops && (
          <CardContent>
            <AdminErrorBoundary resetKey="price-drops">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…
                  </div>
                }
              >
                <PriceDropAlertsPanel embedded />
              </Suspense>
            </AdminErrorBoundary>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
