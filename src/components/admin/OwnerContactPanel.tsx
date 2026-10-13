/**
 * Pasul 3 din „Flux proprietari" — Contactează.
 * Proprietarii verificați apar cu mesajul deja scris (date din anunț),
 * iar administratorul trimite dintr-o apăsare pe WhatsApp sau SMS.
 * Fiecare trimitere se salvează și programează mementourile la 24h și 72h.
 */
import { lazy, Suspense, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, MessageCircle, Smartphone, Copy, RefreshCw, ExternalLink, ChevronDown, ChevronUp, CheckCircle2, Mail } from "lucide-react";
import { toast } from "sonner";
import AdminErrorBoundary from "@/components/admin/AdminErrorBoundary";
import { fetchOwnerContactReady, OWNER_FLOW_QUERY_KEY } from "@/lib/ownerFlowData";
import {
  getTemplate,
  isWhatsappCapable,
  normalizeRoPhone,
  smsLink,
  templatesForKind,
  detectListingTransaction,
  defaultFirstTemplateKey,
  saleMessageViolations,
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
  contact_email: string | null;
  created_at: string | null;
  category: string | null;
}

interface Draft {
  templateKey: string;
  offerPrice: string;
  duration: string;
  message: string;
  dirty: boolean;
  /** Administratorul a ales manual șablonul. */
  manualTemplate?: boolean;
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
  const [pending, setPending] = useState<{ prospect: Prospect; draft: Draft; phone: string } | null>(null);
  const [showQueue, setShowQueue] = useState(false);

  const { data, error, isLoading, refetch, isRefetching } = useQuery({
    queryKey: [...OWNER_FLOW_QUERY_KEY, "contact"],
    staleTime: 30_000, refetchInterval: 120_000, queryFn: fetchOwnerContactReady,
  });
  const prospects = data ?? [];

  const draftOf = (p: Prospect): Draft => {
    const existing = drafts[p.id];
    if (existing) return existing;
    const base: Draft = { templateKey: defaultFirstTemplateKey(detectListingTransaction(p)), offerPrice: "", duration: "12", message: "", dirty: false };
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

  /** Anunț de vânzare: fără chirie/administrare pe luni, cu excepția unui șablon ales manual. */
  const saleGuardOk = (p: Prospect, draft: Draft) => {
    if (draft.manualTemplate || detectListingTransaction(p) !== "vanzare") return true;
    const issues = saleMessageViolations(draft.message);
    if (!issues.length) return true;
    toast.error(`Anunț de vânzare: mesajul menționează ${issues.join(", ")}. Folosește șablonul „Primul mesaj — vânzare” sau alege manual alt șablon.`);
    return false;
  };

  const logAndOpen = async (p: Prospect) => {
    if (pending || sending) return;
    const phone = normalizeRoPhone(p.phone_normalized || p.contact_phone);
    const draft = draftOf(p);
    if (!phone || !isWhatsappCapable(phone) || !saleGuardOk(p, draft) || !draft.message.trim()) {
      toast.error("Verifică numărul mobil și mesajul înainte de contactare.");
      return;
    }
    try {
      const eligible = await fetchOwnerContactReady();
      if (!eligible.some((r) => r.id === p.id)) {
        toast.error("Proprietarul nu mai este eligibil pentru primul mesaj. Reîncarcă lista.");
        refetch();
        return;
      }
      setPending({ prospect: p, draft: { ...draft }, phone });
    } catch {
      toast.error("Nu am putut verifica istoricul proprietarului. Mesajul nu s-a deschis.");
    }
  };

  const confirmSent = async () => {
    if (!pending || sending) return;
    const { prospect: p, draft, phone } = pending;
    setSending(p.id);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Autentificarea a expirat.");
      const now = new Date();
      const monthly = draft.templateKey !== "first_sale";
      const { error } = await supabase.from("owner_outreach_messages").insert({
        prospect_listing_id: p.id, phone_normalized: phone,
        offer_price: monthly && draft.offerPrice ? Number(draft.offerPrice) : null,
        currency: (p.currency || "EUR").toUpperCase(),
        duration_months: monthly ? Number(draft.duration) || 12 : null,
        message: draft.message.trim(), channel: "whatsapp", status: "sent", template_key: draft.templateKey,
        sent_at: now.toISOString(), reminder_stage: 0,
        next_reminder_at: new Date(now.getTime() + 24 * 3_600_000).toISOString(), created_by: auth.user.id,
      });
      if (error) throw error;
      const { error: updateError } = await supabase.from("prospect_listings").update({ lifecycle_status: "contacted" }).eq("id", p.id).in("lifecycle_status", ["new", "callback"]);
      if (updateError) toast.error("Mesajul a fost salvat, dar statusul anunțului nu s-a actualizat.");
      toast.success("Trimitere confirmată. Memento programat la 24h.");
      setPending(null);
      queryClient.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
    } catch (err) {
      toast.error(`Confirmarea nu a fost salvată: ${(err as Error).message}`);
    } finally { setSending(null); }
  };

  /** Canal alternativ: trimite același mesaj pe e-mail, prin info@realtrust.ro. */
  const sendEmail = async (p: Prospect) => {
    const email = (p.contact_email || "").trim();
    if (!email) {
      toast.error("Anunțul nu are adresă de e-mail.");
      return;
    }
    const draft = draftOf(p);
    if (!saleGuardOk(p, draft)) return;
    setSending(p.id);
    try {
      const { data, error } = await supabase.functions.invoke("owner-outreach-email", {
        body: {
          prospect_listing_id: p.id,
          email,
          message: draft.message.trim(),
          offer_price: draft.offerPrice ? Number(draft.offerPrice) : null,
          duration_months: draft.duration ? Number(draft.duration) : 12,
          template_key: draft.templateKey,
        },
      });
      if (error) throw error;
      if ((data as { ok?: boolean })?.ok !== true) {
        throw new Error((data as { error?: string })?.error || "Trimiterea a eșuat");
      }
      toast.success(`E-mail trimis către ${email}. Memento programat la 24h.`);
      queryClient.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
      refetch();
    } catch (err) {
      toast.error(`E-mailul nu a plecat: ${(err as Error).message}`);
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
      <section>
        <CardHeader className="px-0 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Proprietari gata de contactat</CardTitle>
              <CardDescription>
                Primul contact · WhatsApp
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching} aria-label="Reîncarcă lista">
              <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0 space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă proprietarii…
            </div>
          ) : error ? (<p role="alert" className="text-sm text-destructive">Lista nu a putut fi încărcată. Reîncearcă.</p>) : prospects.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Niciun proprietar cu telefon valid, gata de contactat. Rulează pașii „Caută" și „Verifică".
            </p>
          ) : (
            prospects.map((p) => {
              const draft = draftOf(p);
              const phone = normalizeRoPhone(p.phone_normalized || p.contact_phone);

              return (
                <div key={p.id} className="rounded-lg border p-3 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-2">{p.title || "Anunț fără titlu"}</p>
                      <p className="text-xs text-muted-foreground">
                        {[({ vanzare: "Vânzare", inchiriere: "Închiriere", necunoscut: null } as const)[detectListingTransaction(p)], p.zone, p.rooms ? `${p.rooms} camere` : null, eur(p.price, p.currency)].filter(Boolean).join(" · ")}
                      </p>
                      <p className="mt-1 text-xs font-medium tabular-nums">{phone}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.source_platform && <Badge variant="outline" className="text-[10px]">{p.source_platform}</Badge>}
                      {p.lead_score != null && <Badge variant="secondary" className="text-[10px]">scor {p.lead_score}</Badge>}
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`tpl-${p.id}`}>Șablon</Label>
                      <Select value={draft.templateKey} onValueChange={(v) => updateDraft(p, { templateKey: v, dirty: false, manualTemplate: true })}>
                        <SelectTrigger id={`tpl-${p.id}`} className="min-h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIRST_TEMPLATES.map((t) => (
                            <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {draft.templateKey !== "first_sale" && <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`offer-${p.id}`}>Ofertă lunară</Label>
                      <Input
                        id={`offer-${p.id}`}
                        inputMode="numeric"
                        placeholder="ex. 550"
                        value={draft.offerPrice}
                        onChange={(e) => updateDraft(p, { offerPrice: e.target.value.replace(/[^\d]/g, "") })}
                        className="min-h-12"
                      />
                    </div>}
                    {draft.templateKey !== "first_sale" && <div className="space-y-1">
                      <Label className="text-xs" htmlFor={`dur-${p.id}`}>Durată (luni)</Label>
                      <Input
                        id={`dur-${p.id}`}
                        inputMode="numeric"
                        value={draft.duration}
                        onChange={(e) => updateDraft(p, { duration: e.target.value.replace(/[^\d]/g, "") })}
                        className="min-h-12"
                      />
                    </div>}
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
                      onClick={() => logAndOpen(p)}
                      disabled={sending !== null || pending !== null}
                      className="min-h-[48px] flex-1 sm:flex-none"
                      aria-label="Pregătește mesajul pe WhatsApp"
                    >
                      {sending === p.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                      WhatsApp
                    </Button>
                    {p.contact_email && (
                      <Button
                        variant="outline"
                        onClick={() => sendEmail(p)}
                        disabled={sending !== null || pending !== null}
                        className="min-h-[48px] flex-1 sm:flex-none"
                        aria-label="Trimite mesajul pe e-mail"
                      >
                        <Mail className="mr-2 h-4 w-4" /> E-mail
                      </Button>
                    )}
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
      </section>

      {pending && (
        <section role="region" aria-label="Confirmă trimiterea manuală" className="border border-primary rounded-lg p-4 space-y-3">
          <h2 className="font-semibold">Confirmă trimiterea pe WhatsApp</h2>
          <p className="text-sm text-muted-foreground">{pending.prospect.title}</p>
          <Textarea value={pending.draft.message} readOnly rows={6} aria-label="Mesaj pregătit pentru WhatsApp" />
          <div className="flex flex-wrap gap-2">
            <Button asChild><a href={whatsappLink(pending.phone, pending.draft.message)} target="_blank" rel="noopener noreferrer">Deschide WhatsApp</a></Button>
            <Button onClick={confirmSent} disabled={sending !== null}><CheckCircle2 className="h-4 w-4 mr-2" />Am trimis mesajul</Button>
            <Button variant="ghost" onClick={() => setPending(null)} disabled={sending !== null}>Anulează</Button>
          </div>
        </section>
      )}

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
