import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

type Insp = {
  id: string;
  prospect_listing_id: string;
  clean_title: string | null;
  neighborhood: string | null;
  price: number | null;
  prospect_listings: { title: string | null; zone: string | null; price: number | null; category: string | null } | null;
};
type Q = { prospect_listing_id: string | null; status: string | null; sent_at: string | null; delivered_at: string | null; read_at: string | null; created_at: string; last_error: string | null };

const fmtDate = (s: string | null) =>
  s ? new Date(s).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

const RESULT_LABEL: Record<string, string> = {
  sent: "Trimis direct (fereastra 24h deschisă)",
  queued: "Pus în coadă cu mesajul aprobat Meta",
  already_queued: "Există deja un mesaj în coadă",
  invalid_phone: "Număr de telefon invalid",
  express_opt_out: "Proprietarul a cerut să nu mai fie contactat",
  send_failed: "Trimiterea a eșuat",
  queue_failed: "Nu s-a putut pune în coadă",
};

/** Anunțuri aprobate de admin care așteaptă „DA” de la proprietar. */
export default function AwaitingConsentTable() {
  const [busy, setBusy] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["awaiting-consent-table"],
    queryFn: async () => {
      const { data: insp, error } = await (supabase.from("listing_inspections") as any)
        .select("id, prospect_listing_id, clean_title, neighborhood, price, prospect_listings(title, zone, price, category)")
        .eq("status", "approved_waiting_consent")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const rows = (insp ?? []) as Insp[];
      const ids = rows.map((r) => r.prospect_listing_id).filter(Boolean);
      const [{ data: cons }, { data: queue }] = await Promise.all([
        (supabase.from("wa_publish_consents") as any).select("prospect_listing_id, requested_at").in("prospect_listing_id", ids),
        (supabase.from("wa_outbound_queue") as any)
          .select("prospect_listing_id, status, sent_at, delivered_at, read_at, created_at, last_error")
          .in("prospect_listing_id", ids)
          .order("created_at", { ascending: false }),
      ]);
      const reqMap = new Map<string, string>();
      (cons ?? []).forEach((c: any) => c.requested_at && reqMap.set(c.prospect_listing_id, c.requested_at));
      const qMap = new Map<string, Q>();
      ((queue ?? []) as Q[]).forEach((m) => m.prospect_listing_id && !qMap.has(m.prospect_listing_id) && qMap.set(m.prospect_listing_id, m));
      return rows.map((r) => {
        const m = qMap.get(r.prospect_listing_id);
        const delivered = !!(m?.delivered_at || m?.read_at);
        return {
          id: r.id,
          prospectId: r.prospect_listing_id,
          title: r.clean_title || r.prospect_listings?.title || "—",
          zone: r.neighborhood || r.prospect_listings?.zone || "—",
          price: r.price ?? r.prospect_listings?.price ?? null,
          rent: String(r.prospect_listings?.category || "").startsWith("inchiriere"),
          sentAt: m?.sent_at || reqMap.get(r.prospect_listing_id) || null,
          delivered,
          failed: m?.status === "failed",
          error: m?.status === "failed" ? m?.last_error : null,
        };
      });
    },
  });

  // Actualizare în timp real a stării mesajelor.
  useEffect(() => {
    const ch = supabase
      .channel("awaiting-consent-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "wa_outbound_queue" }, () => q.refetch())
      .subscribe();
    const t = setInterval(() => q.refetch(), 30000);
    return () => { supabase.removeChannel(ch); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resend = async (ids: string[]) => {
    const { data, error } = await supabase.functions.invoke("wa-request-publish-consent", { body: { prospect_ids: ids } });
    if (error || !data?.ok) throw new Error(error?.message || "Eroare la retrimitere");
    return (data.results ?? []) as { id: string; status: string }[];
  };

  const resendOne = async (prospectId: string) => {
    setBusy(prospectId);
    try {
      const [r] = await resend([prospectId]);
      const label = RESULT_LABEL[r?.status] || r?.status || "Fără răspuns";
      ["sent", "queued", "already_queued"].includes(r?.status) ? toast.success(label) : toast.error(label);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
      q.refetch();
    }
  };

  const rows = q.data ?? [];
  const pending = rows.filter((r) => !r.delivered);

  const resendAll = async () => {
    if (!pending.length) return;
    setBusy("__all__");
    try {
      const results: { id: string; status: string }[] = [];
      for (let i = 0; i < pending.length; i += 50) results.push(...(await resend(pending.slice(i, i + 50).map((r) => r.prospectId))));
      const ok = results.filter((r) => ["sent", "queued", "already_queued"].includes(r.status)).length;
      toast.success(`${ok} din ${results.length} mesaje retrimise sau în coadă`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
      q.refetch();
    }
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Așteaptă acordul „DA” ({rows.length})</h3>
        <Button size="sm" onClick={resendAll} disabled={!pending.length || busy !== null}>
          <Send className="h-4 w-4 mr-1" />
          {busy === "__all__" ? "Se retrimit…" : `Retrimite toate mesajele în așteptare (${pending.length})`}
        </Button>
      </div>
      {q.isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Se încarcă…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="p-3">Titlu</th><th className="p-3">Cartier</th><th className="p-3">Preț</th>
                <th className="p-3">Trimis pe WhatsApp</th><th className="p-3">Stare mesaj</th><th className="p-3">Acțiune</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 align-top">
                  <td className="p-3 max-w-xs truncate" title={r.title}>{r.title}</td>
                  <td className="p-3">{r.zone}</td>
                  <td className="p-3 whitespace-nowrap">{r.price ? `${Number(r.price).toLocaleString("ro-RO")} €${r.rent ? "/lună" : ""}` : "—"}</td>
                  <td className="p-3 whitespace-nowrap">{fmtDate(r.sentAt)}</td>
                  <td className="p-3">
                    {r.failed ? <Badge variant="destructive">Eșuat</Badge>
                      : r.delivered ? <Badge>Livrat</Badge>
                      : <Badge variant="secondary">În așteptare</Badge>}
                    {r.error && <p className="mt-1 max-w-xs text-xs text-destructive break-words">{r.error}</p>}
                  </td>
                  <td className="p-3">
                    {!r.delivered && (
                      <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => resendOne(r.prospectId)}>
                        <RefreshCw className={`h-4 w-4 mr-1 ${busy === r.prospectId ? "animate-spin" : ""}`} />
                        Retrimite mesaj
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
