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
import { getTemplate, isWhatsappCapable, smsLink, whatsappLink } from "@/lib/ownerOutreachTemplates";

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
  listing?: {
    title: string | null;
    zone: string | null;
    rooms: number | null;
    price: number | null;
    contact_name: string | null;
    source_platform: string | null;
  } | null;
}

const dateRo = (v: string | null) =>
  v ? new Date(v).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const hoursAgo = (v: string | null) => (v ? Math.round((Date.now() - new Date(v).getTime()) / 3_600_000) : null);

export default function OwnerFollowUpPanel() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [showDrops, setShowDrops] = useState(true);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["owner-followup-reminders"],
    staleTime: 30_000,
    refetchInterval: 90_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("owner_outreach_messages")
        .select(
          "id, prospect_listing_id, phone_normalized, offer_price, currency, duration_months, reminder_stage, next_reminder_at, sent_at, channel",
        )
        .is("replied_at", null)
        .not("next_reminder_at", "is", null)
        .lt("reminder_stage", 2)
        .order("next_reminder_at", { ascending: true })
        .limit(100);
      if (error) throw error;

      const ids = Array.from(new Set((rows ?? []).map((r) => r.prospect_listing_id).filter(Boolean))) as string[];
      const listings: Record<string, Reminder["listing"]> = {};
      if (ids.length) {
        const { data: ls } = await supabase
          .from("prospect_listings")
          .select("id, title, zone, rooms, price, contact_name, source_platform")
          .in("id", ids);
        (ls ?? []).forEach((l) => {
          listings[l.id] = {
            title: l.title,
            zone: l.zone,
            rooms: l.rooms,
            price: l.price,
            contact_name: l.contact_name,
            source_platform: l.source_platform,
          };
        });
      }

      const now = Date.now();
      const all: Reminder[] = (rows ?? []).map((r) => ({
        ...r,
        reminder_stage: Number(r.reminder_stage ?? 0),
        listing: r.prospect_listing_id ? listings[r.prospect_listing_id] ?? null : null,
      }));
      return {
        due: all.filter((r) => r.next_reminder_at && new Date(r.next_reminder_at).getTime() <= now),
        upcoming: all.filter((r) => r.next_reminder_at && new Date(r.next_reminder_at).getTime() > now),
      };
    },
  });

  const due = data?.due ?? [];
  const upcoming = data?.upcoming ?? [];

  const messageFor = (r: Reminder) => {
    const tpl = getTemplate(r.reminder_stage === 0 ? "reminder_24h" : "reminder_72h");
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

  const sendReminder = async (r: Reminder, channel: "whatsapp" | "sms") => {
    const phone = r.phone_normalized;
    if (!phone) {
      toast.error("Nu avem numărul proprietarului pentru acest mesaj.");
      return;
    }
    if (channel === "whatsapp" && !isWhatsappCapable(phone)) {
      toast.error("Numărul nu este mobil — trimite SMS.");
      return;
    }
    const message = messageFor(r);
    setBusy(r.id);
    const link = channel === "whatsapp" ? whatsappLink(phone, message) : smsLink(phone, message);
    const win = window.open(link, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = link;

    try {
      const nextStage = r.reminder_stage + 1;
      // Etapa 1 = memento 24h → următorul la 72h de la primul mesaj (încă 48h).
      // Etapa 2 = memento 72h → nu mai insistăm.
      const nextAt = nextStage >= 2 ? null : new Date(Date.now() + 48 * 3_600_000).toISOString();
      const { error } = await supabase
        .from("owner_outreach_messages")
        .update({ reminder_stage: nextStage, next_reminder_at: nextAt, status: nextStage >= 2 ? "followed_up_final" : "followed_up" })
        .eq("id", r.id);
      if (error) throw error;
      toast.success(nextStage >= 2 ? "Memento final trimis." : "Memento trimis. Următorul la 72h.");
      refetch();
      queryClient.invalidateQueries({ queryKey: ["owner-flow-step-counts"] });
    } catch (err) {
      toast.error(`Mesajul s-a deschis, dar nu s-a salvat: ${(err as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const markReplied = async (r: Reminder) => {
    setBusy(r.id);
    try {
      const { error } = await supabase
        .from("owner_outreach_messages")
        .update({ replied_at: new Date().toISOString(), next_reminder_at: null, status: "replied" })
        .eq("id", r.id);
      if (error) throw error;
      if (r.prospect_listing_id) {
        await supabase.from("prospect_listings").update({ lifecycle_status: "interested" }).eq("id", r.prospect_listing_id);
      }
      toast.success("Marcat ca „a răspuns”. Nu mai primește mementouri.");
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
          <Button onClick={() => sendReminder(r, "whatsapp")} disabled={busy === r.id} className="min-h-[48px] flex-1 sm:flex-none">
            {busy === r.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
            Trimite mementoul
          </Button>
          <Button variant="outline" onClick={() => sendReminder(r, "sms")} disabled={busy === r.id} className="min-h-[48px]">
            <Smartphone className="mr-2 h-4 w-4" /> SMS
          </Button>
          <Button variant="ghost" onClick={() => markReplied(r)} disabled={busy === r.id} className="min-h-[48px]">
            <CheckCircle2 className="mr-2 h-4 w-4" /> A răspuns
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Mementouri de trimis ({due.length})</CardTitle>
              <CardDescription>
                Proprietarii care nu au răspuns primesc un memento la 24h și, dacă tot nu răspund, unul final la 72h.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} aria-label="Reîncarcă mementourile">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…
            </div>
          ) : due.length === 0 ? (
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
      </Card>

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
                <PriceDropAlertsPanel />
              </Suspense>
            </AdminErrorBoundary>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
