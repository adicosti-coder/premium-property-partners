import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, FileChartColumn, Info, Loader2, Pencil, PhoneCall } from "lucide-react";
import MarkAsAgencyButton from "./MarkAsAgencyButton";
import { consentDate, consentPhone, consentPhoneVariants, originalListingUrl } from "./autoConsentedListingUtils";

export interface VoiceProspectSummary {
  id: string;
  title: string | null;
  zone: string | null;
  price: number | null;
  lead_score: number | null;
  phone_normalized: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  source_url: string | null;
  source_platform: string | null;
  predictive_score: number | null;
  conversion_probability: number | null;
  last_call_at: string | null;
  call_attempts: number;
}

export default function VoiceProspectCard({ prospect: p, rank, calling, onCall, onMarked, onPhoneSaved }: {
  prospect: VoiceProspectSummary;
  rank: number;
  calling: boolean;
  onCall: () => void;
  onMarked: () => void;
  onPhoneSaved: (phone: string) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const source = originalListingUrl(p.source_url);
  const displayPhone = p.phone_normalized || p.contact_phone;
  const { data, isLoading, error } = useQuery({
    queryKey: ["voice-prospect-details", p.id, p.phone_normalized],
    enabled: detailsOpen,
    queryFn: async () => {
      const listing = await supabase.from("prospect_listings").select("*").eq("id", p.id).maybeSingle();
      if (listing.error) throw listing.error;
      if (!listing.data) throw new Error("Prospectul nu mai există.");
      const variants = [...new Set([listing.data.phone_normalized, listing.data.contact_phone].flatMap(value => consentPhoneVariants(value || "")))];
      const [byId, byPhone, queue] = await Promise.all([
        supabase.from("wa_conversations").select("id, wa_profile_name").eq("prospect_id", p.id),
        variants.length ? supabase.from("wa_conversations").select("id, wa_profile_name").in("phone_normalized", variants) : Promise.resolve({ data: [], error: null }),
        supabase.from("wa_outbound_queue").select("id, template_name, status, last_error, created_at, sent_at").eq("prospect_listing_id", p.id).order("created_at", { ascending: false }),
      ]);
      const historyError = byId.error || byPhone.error || queue.error;
      const conversations = [...(byId.data || []), ...(byPhone.data || [])];
      const ids = [...new Set(conversations.map(c => c.id))];
      const messages = ids.length ? await supabase.from("wa_messages")
        .select("id, content, direction, delivery_status, error, created_at")
        .in("conversation_id", ids).order("created_at", { ascending: true })
        : { data: [], error: null };
      return { listing: listing.data, messages: messages.data || [], queue: queue.data || [],
        ownerName: listing.data.contact_name || conversations.find(c => c.wa_profile_name)?.wa_profile_name,
        historyError: historyError || messages.error };
    },
  });

  const savePhone = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = consentPhone(phone);
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      setSaveError("Introdu un număr valid, de exemplu 07xx xxx xxx sau cu prefix internațional.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      let update = supabase.from("prospect_listings")
        .update({ phone_normalized: normalized, contact_phone: normalized }).eq("id", p.id);
      update = p.phone_normalized ? update.eq("phone_normalized", p.phone_normalized) : update.is("phone_normalized", null);
      const result = await update.select("id");
      if (result.error) throw result.error;
      if (!result.data?.length) throw new Error("Numărul nu a fost salvat. Reîncarcă lista și încearcă din nou.");
      onPhoneSaved(normalized);
      setEditOpen(false);
      toast({ title: "Număr salvat", description: "Următorul apel va folosi numărul actualizat." });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Numărul nu a putut fi salvat.");
    } finally { setSaving(false); }
  };

  return <>
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Badge variant="secondary" className="shrink-0 mt-2">{rank}</Badge>
        <Button variant="link" className="h-auto min-h-12 flex-1 min-w-0 justify-start px-0 py-2 text-left whitespace-normal [overflow-wrap:anywhere]" onClick={() => setDetailsOpen(true)} aria-label={`Detalii: ${p.title || "prospect"}`}>
          {p.title || "Fără titlu"}
        </Button>
        <MarkAsAgencyButton id={p.id} phone={p.phone_normalized} variant="icon" onMarked={onMarked} />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {p.zone && <span>{p.zone}</span>}
        {p.price != null && <span>{p.price.toLocaleString("ro-RO")} €</span>}
        <span>Scor {p.lead_score ?? "—"}</span>
        {p.predictive_score != null && <span>AI {p.predictive_score}</span>}
        {p.call_attempts > 0 && <span>{p.call_attempts}× încercări</span>}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 text-sm [overflow-wrap:anywhere]">
        {p.contact_name && <span className="font-medium">{p.contact_name}</span>}
        {displayPhone ? <a href={`tel:${consentPhone(displayPhone)}`} className="inline-flex min-h-12 items-center text-primary underline" aria-label={`Sună proprietarul la ${displayPhone}`}>{displayPhone}</a> : <span className="text-muted-foreground">Fără telefon</span>}
      </div>
      <div className="flex flex-wrap gap-2">
        {source && <>
          <Button asChild variant="outline" size="sm" className="min-h-12"><a href={source} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-1.5" />Vezi Anunțul Original</a></Button>
          <Button asChild variant="outline" size="sm" className="min-h-12"><a href={`https://realtrust.ro/analiza-anunt?url=${encodeURIComponent(source)}`} target="_blank" rel="noopener noreferrer"><FileChartColumn className="h-4 w-4 mr-1.5" />Vezi Evaluarea</a></Button>
        </>}
        {!source && <Badge variant="outline">{p.source_platform || "Fără link original"}</Badge>}
        <Button variant="outline" size="sm" className="min-h-12" disabled={calling} onClick={() => { setPhone(displayPhone || ""); setSaveError(""); setEditOpen(true); }}><Pencil className="h-4 w-4 mr-1.5" />Editează Număr</Button>
        <Button variant="ghost" size="sm" className="min-h-12" onClick={() => setDetailsOpen(true)}><Info className="h-4 w-4 mr-1.5" />Detalii</Button>
        <Button size="sm" className="min-h-12" disabled={calling || editOpen || saving || !displayPhone} onClick={onCall} aria-label={`Andrei sună ${p.contact_name || p.title || "prospectul"}`}>
          {calling ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <PhoneCall className="h-4 w-4 mr-1.5" />}Sună
        </Button>
      </div>
    </div>
    <Dialog open={editOpen} onOpenChange={open => { if (!saving) setEditOpen(open); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Editează numărul</DialogTitle><DialogDescription className="[overflow-wrap:anywhere]">{p.title || "Prospect"}</DialogDescription></DialogHeader>
        <form onSubmit={savePhone} className="space-y-4">
          <Label htmlFor={`voice-phone-${p.id}`}>Telefon</Label>
          <Input id={`voice-phone-${p.id}`} type="tel" value={phone} onChange={e => setPhone(e.target.value)} disabled={saving} autoComplete="tel" required className="min-h-12" />
          {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" className="min-h-12" disabled={saving} onClick={() => setEditOpen(false)}>Anulează</Button><Button type="submit" className="min-h-12" disabled={saving}>{saving ? "Se salvează…" : "Salvează"}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
      <DialogContent className="max-w-2xl max-h-[85dvh] overflow-y-auto [overflow-wrap:anywhere]">
        <DialogHeader><DialogTitle className="pr-6">{p.title || "Detalii prospect"}</DialogTitle><DialogDescription>{p.source_platform || "Anunț"} · {p.zone || "Zonă nesalvată"}</DialogDescription></DialogHeader>
        {isLoading ? <p role="status">Se încarcă detaliile…</p> : error ? <p role="alert" className="text-destructive">{error instanceof Error ? error.message : "Detaliile nu au putut fi încărcate."}</p> : data && <div className="space-y-5 text-sm">
          <dl className="grid grid-cols-2 gap-3">
            {Object.entries({ Proprietar: data.ownerName || "Nume nesalvat", Telefon: data.listing.phone_normalized || data.listing.contact_phone, "E-mail": data.listing.contact_email, Zonă: data.listing.zone || data.listing.location, Preț: data.listing.price != null ? `${data.listing.price.toLocaleString("ro-RO")} ${data.listing.currency || "EUR"}` : null, Camere: data.listing.rooms, Suprafață: data.listing.size != null ? `${data.listing.size} m²` : null, Etaj: data.listing.floor, "An construcție": data.listing.year_built, Status: data.listing.lifecycle_status, "Data preluării": consentDate(data.listing.created_at), "Ultimul apel": consentDate(data.listing.last_retry_at) }).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">{value ?? "—"}</dd></div>)}
          </dl>
          <section><h4 className="font-semibold mb-2">Descriere</h4><p className="whitespace-pre-wrap">{data.listing.description || data.listing.enriched_description || "Fără descriere salvată."}</p>{data.listing.features?.length ? <p className="mt-2 text-muted-foreground">{data.listing.features.join(" · ")}</p> : null}</section>
          <section><h4 className="font-semibold mb-2">Notițe anterioare</h4><p className="whitespace-pre-wrap">{data.listing.admin_notes || "Nicio notiță salvată."}</p>{data.listing.call_summary && <p className="whitespace-pre-wrap mt-2">Rezumat apel: {data.listing.call_summary}</p>}</section>
          <section><h4 className="font-semibold mb-2">Istoric WhatsApp</h4>
            {data.historyError && <p role="alert" className="text-destructive">Istoricul nu a putut fi încărcat complet.</p>}
            {!data.messages.length && !data.queue.length && !data.historyError && <p className="text-muted-foreground">Nu există mesaje WhatsApp înregistrate.</p>}
            <ol className="divide-y divide-border">{data.messages.map(m => <li key={m.id} className="py-3"><div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground"><span>{m.direction === "inbound" ? "Proprietar" : "RealTrust / Andrei"} · {m.delivery_status || "—"}</span><time>{consentDate(m.created_at)}</time></div><p className="mt-1 whitespace-pre-wrap">{m.content}</p>{m.error && <p className="text-destructive">{m.error}</p>}</li>)}</ol>
            {!!data.queue.length && <><h5 className="font-medium mt-3">Trimiteri programate / rezultate</h5><ul className="divide-y divide-border">{data.queue.map(q => <li key={q.id} className="py-2"><p>{q.template_name} · {q.status}</p><p className="text-xs text-muted-foreground">{consentDate(q.sent_at || q.created_at)}</p>{q.last_error && <p className="text-destructive">{q.last_error}</p>}</li>)}</ul></>}
          </section>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}