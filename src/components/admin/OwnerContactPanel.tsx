/**
 * Pasul 3 din „Flux proprietari" — Contactează.
 * Proprietarii verificați apar cu mesajul deja scris (date din anunț),
 * iar administratorul trimite dintr-o apăsare pe WhatsApp sau SMS.
 * Fiecare trimitere se salvează și programează mementourile la 24h și 72h.
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageCircle, Smartphone, Copy, RefreshCw, ExternalLink, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import AdminErrorBoundary from "@/components/admin/AdminErrorBoundary";
import { hasAgencyEvidence, isIndividualOwnerListing, isResidentialRealEstate } from "@/lib/ownerListingRules";
import {
  getTemplate,
  isWhatsappCapable,
  normalizeRoPhone,
  smsLink,
  templatesForKind,
  whatsappLink,
  type OutreachContext,
} from "@/lib/ownerOutreachTemplates";

const WhatsappOutboundQueue = lazy(() => import("@/components/admin/WhatsappOutboundQueue"));

interface Prospect {
  id: string;
  title: string | null;
  zone: string | null;
  rooms: number | null;
  price: number | null;
  currency: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  phone_normalized: string | null;
  source_platform: string | null;
  lead_score: number | null;
  lifecycle_status: string | null;
  source_url: string | null;
  description: string | null;
  prospect_type: string | null;
  created_at: string | null;
}

interface Draft {
  templateKey: string;
  offerPrice: string;
  duration: string;
  message: string;
  dirty: boolean;
}

const FIRST_TEMPLATES = templatesForKind("first");

const eur = (v: number | null, currency?: string | null) =>
  v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} ${(currency || "EUR").toUpperCase() === "RON" ? "lei" : "€"}`;

const contextOf = (p: Prospect, draft?: Draft): OutreachContext => ({
  ownerName: p.contact_name,
  title: p.title,
  zone: p.zone,
  rooms: p.rooms,
  price: p.price,
  currency: p.currency,
  offerPrice: draft?.offerPrice ? Number(draft.offerPrice) : null,
  durationMonths: draft?.duration ? Number(draft.duration) : 12,
  platform: p.source_platform,
});

export default function OwnerContactPanel() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [showQueue, setShowQueue] = useState(false);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["owner-contact-ready"],
    staleTime: 30_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("prospect_listings")
        .select(
          "id, title, description, zone, rooms, price, currency, contact_name, contact_phone, phone_normalized, prospect_type, source_platform, lead_score, lifecycle_status, source_url, created_at",
        )
        .eq("is_active", true)
        .eq("do_not_call", false)
        .in("lifecycle_status", ["new", "interested", "callback", "to_review"])
        // Doar cei cu telefon — altfel primele 60 după scor pot fi toate fără număr.
        .or("phone_normalized.not.is.null,contact_phone.not.is.null")
        .order("lead_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(150);
      if (error) throw error;

      // Aceleași reguli ca în „Caută anunțuri de la proprietari": fără agenții,
      // fără pagini de căutare/categorie și doar imobiliare rezidențiale.
      const eligible = (rows ?? []).filter((r) => {
        if (!normalizeRoPhone(r.phone_normalized || r.contact_phone)) return false;
        const candidate = {
          title: r.title,
          description: r.description,
          url: r.source_url,
          phone: r.phone_normalized || r.contact_phone,
          prospect_type: r.prospect_type,
        };
        if (hasAgencyEvidence(candidate)) return false;
        if (!isResidentialRealEstate(candidate)) return false;
        if (r.source_url && !isIndividualOwnerListing(candidate)) return false;
        return true;
      }) as Prospect[];

      const ids = eligible.map((r) => r.id);
      const contacted = new Set<string>();
      if (ids.length) {
        const { data: msgs } = await supabase
          .from("owner_outreach_messages")
          .select("prospect_listing_id")
          .in("prospect_listing_id", ids);
        (msgs ?? []).forEach((m) => m.prospect_listing_id && contacted.add(m.prospect_listing_id));
      }
      return { prospects: eligible.slice(0, 40), contacted };
    },
  });

  const prospects = data?.prospects ?? [];
  const contacted = useMemo(() => data?.contacted ?? new Set<string>(), [data]);

  const draftOf = (p: Prospect): Draft => {
    const existing = drafts[p.id];
    if (existing) return existing;
    const base: Draft = { templateKey: FIRST_TEMPLATES[0].key, offerPrice: "", duration: "12", message: "", dirty: false };
    base.message = getTemplate(base.templateKey).build(contextOf(p, base));
    return base;
  };

  const updateDraft = (p: Prospect, patch: Partial<Draft>) => {
    setDrafts((prev) => {
      const current = prev[p.id] ?? draftOf(p);
      const next: Draft = { ...current, ...patch };
      // Mesajul se rescrie automat cât timp administratorul nu l-a editat manual.
      if (!patch.message && !next.dirty) {
        next.message = getTemplate(next.templateKey).build(contextOf(p, next));
      }
      if (patch.message !== undefined) next.dirty = true;
      return { ...prev, [p.id]: next };
    });
  };

  const logAndOpen = async (p: Prospect, channel: "whatsapp" | "sms") => {
    const phone = normalizeRoPhone(p.phone_normalized || p.contact_phone);
    if (!phone) {
      toast.error("Numărul proprietarului nu este valid.");
      return;
    }
    const draft = draftOf(p);
    const message = draft.message.trim();
    if (!message) {
      toast.error("Mesajul este gol.");
      return;
    }
    if (channel === "whatsapp" && !isWhatsappCapable(phone)) {
      toast.error("Numărul nu este mobil — trimite SMS sau sună.");
      return;
    }

    setSending(p.id);
    // Deschidem fereastra înainte de await, altfel telefonul blochează redirectul.
    const link = channel === "whatsapp" ? whatsappLink(phone, message) : smsLink(phone, message);
    const win = window.open(link, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = link;

    try {
      const { data: auth } = await supabase.auth.getUser();
      const now = new Date();
      const { error } = await supabase.from("owner_outreach_messages").insert({
        prospect_listing_id: p.id,
        phone_normalized: phone,
        offer_price: draft.offerPrice ? Number(draft.offerPrice) : null,
        currency: (p.currency || "EUR").toUpperCase(),
        duration_months: draft.duration ? Number(draft.duration) : 12,
        message,
        channel,
        status: "sent",
        template_key: draft.templateKey,
        sent_at: now.toISOString(),
        reminder_stage: 0,
        // Primul memento la 24h; al doilea se programează automat la 72h de la primul mesaj.
        next_reminder_at: new Date(now.getTime() + 24 * 3_600_000).toISOString(),
        created_by: auth?.user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Mesaj trimis și salvat. Memento programat la 24h.");
      queryClient.invalidateQueries({ queryKey: ["owner-followup-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["owner-flow-step-counts"] });
      refetch();
    } catch (err) {
      toast.error(`Mesajul s-a deschis, dar nu a fost salvat: ${(err as Error).message}`);
    } finally {
      setSending(null);
    }
  };

  const copyMessage = async (p: Prospect) => {
    try {
      await navigator.clipboard.writeText(draftOf(p).message);
      toast.success("Mesaj copiat.");
    } catch {
      toast.error("Nu am putut copia mesajul.");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Trimite mesajul proprietarului</CardTitle>
              <CardDescription>
                Mesajul e deja scris cu datele anunțului. Alege șablonul, completează oferta și trimite pe WhatsApp sau SMS.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} aria-label="Reîncarcă lista">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă proprietarii…
            </div>
          ) : prospects.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Niciun proprietar cu telefon valid, gata de contactat. Rulează pașii „Caută" și „Verifică".
            </p>
          ) : (
            prospects.map((p) => {
              const draft = draftOf(p);
              const phone = normalizeRoPhone(p.phone_normalized || p.contact_phone);
              const already = contacted.has(p.id);
              return (
                <div key={p.id} className="rounded-lg border p-3 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{p.title || "Anunț fără titlu"}</p>
                      <p className="text-xs text-muted-foreground">
                        {[p.zone, p.rooms ? `${p.rooms} camere` : null, eur(p.price, p.currency)].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-xs font-medium tabular-nums">{phone}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.source_platform && <Badge variant="outline" className="text-[10px]">{p.source_platform}</Badge>}
                      {p.lead_score != null && <Badge variant="secondary" className="text-[10px]">scor {p.lead_score}</Badge>}
                      {already && (
                        <Badge className="text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> contactat
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`tpl-${p.id}`}>Șablon</Label>
                      <Select value={draft.templateKey} onValueChange={(v) => updateDraft(p, { templateKey: v, dirty: false })}>
                        <SelectTrigger id={`tpl-${p.id}`} className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIRST_TEMPLATES.map((t) => (
                            <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`offer-${p.id}`}>Ofertă lunară</Label>
                      <Input
                        id={`offer-${p.id}`}
                        inputMode="numeric"
                        placeholder="ex. 550"
                        value={draft.offerPrice}
                        onChange={(e) => updateDraft(p, { offerPrice: e.target.value.replace(/[^\d]/g, ""), dirty: false })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`dur-${p.id}`}>Durată (luni)</Label>
                      <Input
                        id={`dur-${p.id}`}
                        inputMode="numeric"
                        value={draft.duration}
                        onChange={(e) => updateDraft(p, { duration: e.target.value.replace(/[^\d]/g, ""), dirty: false })}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`msg-${p.id}`}>Mesaj</Label>
                    <Textarea
                      id={`msg-${p.id}`}
                      value={draft.message}
                      onChange={(e) => updateDraft(p, { message: e.target.value })}
                      rows={7}
                      className="text-sm"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => logAndOpen(p, "whatsapp")}
                      disabled={sending === p.id}
                      className="min-h-[48px] flex-1 sm:flex-none"
                      aria-label="Trimite mesajul pe WhatsApp"
                    >
                      {sending === p.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => logAndOpen(p, "sms")}
                      disabled={sending === p.id}
                      className="min-h-[48px] flex-1 sm:flex-none"
                      aria-label="Trimite mesajul prin SMS"
                    >
                      <Smartphone className="mr-2 h-4 w-4" /> SMS
                    </Button>
                    <Button variant="outline" onClick={() => copyMessage(p)} className="min-h-[48px]" aria-label="Copiază mesajul">
                      <Copy className="mr-2 h-4 w-4" /> Copiază
                    </Button>
                    {p.source_url && (
                      <Button variant="ghost" asChild className="min-h-[48px]">
                        <a href={p.source_url} target="_blank" rel="noopener noreferrer" aria-label="Deschide anunțul">
                          <ExternalLink className="mr-2 h-4 w-4" /> Anunțul
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <button
            type="button"
            onClick={() => setShowQueue((v) => !v)}
            className="flex w-full items-center justify-between gap-2 text-left"
            aria-expanded={showQueue}
          >
            <div>
              <CardTitle className="text-base">Coadă automată WhatsApp (Andrei)</CardTitle>
              <CardDescription>Mesajele template trimise automat, cu livrare confirmată de Meta.</CardDescription>
            </div>
            {showQueue ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          </button>
        </CardHeader>
        {showQueue && (
          <CardContent>
            <AdminErrorBoundary resetKey="wa-queue">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă coada…
                  </div>
                }
              >
                <WhatsappOutboundQueue />
              </Suspense>
            </AdminErrorBoundary>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
