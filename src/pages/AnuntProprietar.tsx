/**
 * Admin — anunțul complet al unui proprietar: linkul, textul integral, prețul și
 * datele de contact, plus publicarea pe realtrust.ro (doar cu acord pe WhatsApp).
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useAdminRole } from "@/hooks/useAdminRole";
import type { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, Copy, ExternalLink, Globe, Loader2, MessageCircle, Phone, ShieldAlert, ShieldCheck, Undo2,
} from "lucide-react";

const eur = (v: number | null, currency?: string | null) =>
  v == null ? "—" : `${Math.round(Number(v)).toLocaleString("ro-RO")} ${currency || "EUR"}`;

const dt = (v: string | null) =>
  v ? new Date(v).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" }) : "—";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "anunt";

export default function AnuntProprietar() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { isAdmin, isLoading: roleLoading } = useAdminRole(user);
  const [pubTitle, setPubTitle] = useState("");
  const [pubDesc, setPubDesc] = useState("");
  const [pubImage, setPubImage] = useState("");
  const [saving, setSaving] = useState(false);
  // Mesaj către proprietar: preț propus, durată contract și textul mesajului.
  const [offerPrice, setOfferPrice] = useState("");
  const [durationMonths, setDurationMonths] = useState("12");
  const [outreachText, setOutreachText] = useState("");
  const [savingOutreach, setSavingOutreach] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["owner-listing-detail", id],
    enabled: isAdmin && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_listings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: consent } = useQuery({
    queryKey: ["owner-listing-consent", id, listing?.phone_normalized],
    enabled: isAdmin && !!listing,
    queryFn: async () => {
      const filters = supabase
        .from("wa_publish_consents")
        .select("id, status, consent_text, consented_at, revoked_at, phone_normalized, prospect_listing_id")
        .order("updated_at", { ascending: false })
        .limit(5);
      const { data, error } = listing?.phone_normalized
        ? await filters.or(`prospect_listing_id.eq.${id},phone_normalized.eq.${listing.phone_normalized}`)
        : await filters.eq("prospect_listing_id", id);
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });

  const { data: published } = useQuery({
    queryKey: ["owner-listing-published", id],
    enabled: isAdmin && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_public_listings")
        .select("*")
        .eq("prospect_listing_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: outreach } = useQuery({
    queryKey: ["owner-listing-outreach", id],
    enabled: isAdmin && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("owner_outreach_messages")
        .select("id, offer_price, currency, duration_months, message, status, created_at")
        .eq("prospect_listing_id", id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const saveOutreach = async () => {
    if (!listing) return;
    const message = outreachText.trim();
    if (message.length < 10) {
      toast({ title: "Scrie mesajul", description: "Mesajul are nevoie de cel puțin 10 caractere.", variant: "destructive" });
      return;
    }
    setSavingOutreach(true);
    const { error } = await supabase.from("owner_outreach_messages").insert({
      prospect_listing_id: listing.id,
      offer_price: offerPrice.trim() ? Number(offerPrice.replace(/[^0-9.]/g, "")) : null,
      currency: listing.currency ?? "EUR",
      duration_months: durationMonths.trim() ? Number(durationMonths.replace(/[^0-9]/g, "")) : null,
      message,
      created_by: user?.id ?? null,
    });
    setSavingOutreach(false);
    if (error) {
      toast({ title: "Mesajul nu a fost salvat", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mesaj salvat", description: "Îl găsești mai jos, în istoricul mesajelor." });
    setOutreachText("");
    await qc.invalidateQueries({ queryKey: ["owner-listing-outreach", id] });
  };

  useEffect(() => {
    if (!listing) return;
    setPubTitle(published?.title ?? listing.enriched_title ?? listing.title ?? "");
    setPubDesc(published?.description ?? listing.enriched_description ?? listing.description ?? "");
    const firstImage = Array.isArray(listing.images) ? String(listing.images[0] ?? "") : "";
    setPubImage(published?.image_url ?? firstImage);
  }, [listing, published]);

  const canPublish = consent?.status === "consented";
  const priceLabel = useMemo(
    () => eur(listing?.price ?? null, listing?.currency),
    [listing?.price, listing?.currency],
  );

  /** Fotografiile anunțului: cele îmbogățite au prioritate, apoi cele originale. */
  const photos = useMemo(() => {
    const collect = (value: unknown): string[] =>
      Array.isArray(value)
        ? value.map((v) => String(v ?? "").trim()).filter((v) => /^https?:\/\//i.test(v))
        : [];
    const all = [...collect(listing?.enriched_images), ...collect(listing?.images)];
    return Array.from(new Set(all)).slice(0, 20);
  }, [listing?.enriched_images, listing?.images]);
  const [activePhoto, setActivePhoto] = useState(0);
  useEffect(() => setActivePhoto(0), [id, photos.length]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copiat` });
    } catch {
      toast({ title: "Nu s-a putut copia", variant: "destructive" });
    }
  };

  const publish = async () => {
    if (!listing || !canPublish) return;
    setSaving(true);
    try {
      const payload = {
        prospect_listing_id: listing.id,
        slug: published?.slug ?? `${slugify(pubTitle || "anunt-proprietar")}-${String(listing.id).slice(0, 6)}`,
        title: pubTitle.trim() || "Anunț de la proprietar",
        description: pubDesc.trim() || null,
        price: listing.price,
        currency: listing.currency ?? "EUR",
        zone: listing.zone,
        rooms: listing.rooms,
        size: listing.size,
        property_type: listing.category ? String(listing.category) : null,
        transaction_type: listing.category ? String(listing.category) : null,
        image_url: pubImage.trim() || null,
        source_url: listing.source_url,
        source_platform: listing.source_platform,
        is_published: true,
        published_at: new Date().toISOString(),
        unpublished_at: null,
        consent_id: consent?.id ?? null,
        consent_proof: consent?.consent_text ?? null,
        created_by: user?.id ?? null,
      };
      const { error } = published
        ? await supabase.from("owner_public_listings").update(payload).eq("id", published.id)
        : await supabase.from("owner_public_listings").insert(payload);
      if (error) throw error;
      toast({ title: "Publicat pe realtrust.ro", description: "Anunțul apare acum în pagina publică." });
      await qc.invalidateQueries({ queryKey: ["owner-listing-published", id] });
    } catch (e) {
      toast({
        title: "Publicarea nu a reușit",
        description: (e as Error)?.message ?? "Încearcă din nou.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const unpublish = async () => {
    if (!published) return;
    setSaving(true);
    const { error } = await supabase
      .from("owner_public_listings")
      .update({ is_published: false, unpublished_at: new Date().toISOString() })
      .eq("id", published.id);
    setSaving(false);
    if (error) {
      toast({ title: "Retragerea nu a reușit", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Anunț retras din pagina publică" });
    await qc.invalidateQueries({ queryKey: ["owner-listing-published", id] });
  };

  if (!authReady || roleLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-24 max-w-lg text-center">
          <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-xl font-semibold mb-2">Pagină internă</h1>
          <p className="text-muted-foreground mb-4">Doar echipa RealTrust are acces la datele proprietarilor.</p>
          <Button onClick={() => navigate("/")}>Înapoi la pagina principală</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Anunț proprietar — Admin" description="Detaliile complete ale unui anunț de la proprietar." noIndex />
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="min-h-[44px] -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Înapoi
        </Button>

        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
        {!isLoading && !listing && <p className="text-muted-foreground">Anunțul nu a fost găsit.</p>}

        {listing && (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  {listing.source_platform && <Badge variant="secondary">{listing.source_platform}</Badge>}
                  {listing.is_active === false && <Badge variant="destructive">inactiv</Badge>}
                  {listing.prospect_type === "agentie" && <Badge variant="destructive">agenție</Badge>}
                </div>
                <CardTitle className="text-xl leading-snug mt-2">
                  {listing.enriched_title || listing.title || "Fără titlu"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {photos.length > 0 ? (
                  <div className="space-y-2">
                    <img
                      src={photos[activePhoto] ?? photos[0]}
                      alt={`Fotografie anunț: ${listing.enriched_title || listing.title || "anunț proprietar"}`}
                      loading="lazy"
                      className="w-full aspect-[4/3] object-cover rounded-lg border bg-muted"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    />
                    {photos.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {photos.map((src, i) => (
                          <button
                            key={`${src}-${i}`}
                            type="button"
                            onClick={() => setActivePhoto(i)}
                            aria-label={`Vezi fotografia ${i + 1}`}
                            className={`shrink-0 rounded-md border overflow-hidden ${i === activePhoto ? "ring-2 ring-primary" : ""}`}
                          >
                            <img src={src} alt="" loading="lazy" className="h-16 w-20 object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {photos.length} {photos.length === 1 ? "fotografie" : "fotografii"} preluate din anunțul original.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground rounded-lg border bg-muted/40 p-3">
                    Anunțul nu are fotografii salvate. Deschide anunțul original pentru poze.
                  </p>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Preț</p>
                    <p className="text-lg font-semibold">{priceLabel}</p>
                    {listing.price_per_sqm != null && (
                      <p className="text-xs text-muted-foreground">
                        {Math.round(Number(listing.price_per_sqm)).toLocaleString("ro-RO")} €/mp
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Zonă</p>
                    <p className="font-medium">{listing.zone || listing.location || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Camere / suprafață / etaj</p>
                    <p className="font-medium">
                      {listing.rooms ?? "—"} cam · {listing.size ?? "—"} mp · {listing.floor || "—"}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Link către anunț</p>
                    {listing.source_url ? (
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" className="min-h-[44px]">
                          <a href={listing.source_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-1.5" /> Deschide anunțul
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-[44px]"
                          onClick={() => copy(listing.source_url as string, "Linkul")}>
                          <Copy className="h-4 w-4 mr-1.5" /> Copiază linkul
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Anunțul nu are link salvat.</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2 break-all">{listing.source_url}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Contact proprietar (date personale)</p>
                    <p className="font-medium">{listing.contact_name || "—"}</p>
                    {listing.contact_phone ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Button asChild size="sm" variant="outline" className="min-h-[44px]">
                          <a href={`tel:${listing.contact_phone}`}>
                            <Phone className="h-4 w-4 mr-1.5" /> {listing.contact_phone}
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" className="min-h-[44px]"
                          onClick={() => copy(listing.contact_phone as string, "Telefonul")}>
                          <Copy className="h-4 w-4 mr-1.5" /> Copiază
                        </Button>
                        {listing.phone_normalized && (
                          <Button asChild size="sm" variant="outline" className="min-h-[44px]">
                            <a
                              href={`https://wa.me/${String(listing.phone_normalized).replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <MessageCircle className="h-4 w-4 mr-1.5" /> WhatsApp
                            </a>
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Fără telefon salvat.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">Textul anunțului</p>
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                    {listing.enriched_description || listing.description || "Anunțul nu are text salvat."}
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-3 text-xs text-muted-foreground">
                  <p>Găsit: {dt(listing.scraped_at)}</p>
                  <p>Ultima vizualizare: {dt(listing.last_seen_at)}</p>
                  <p>Preț verificat: {dt(listing.price_checked_at)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" /> Publicare pe realtrust.ro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-3 text-sm">
                  {canPublish ? (
                    <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="h-4 w-4" /> Proprietarul a dat acordul pe WhatsApp
                      {consent?.consented_at ? ` (${dt(consent.consented_at)})` : ""}.
                    </p>
                  ) : (
                    <p className="flex items-start gap-2 text-muted-foreground">
                      <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                      Fără acord scris pe WhatsApp („DA PUBLIC”) anunțul nu poate fi publicat.
                      {consent?.status ? ` Stare acord: ${consent.status}.` : " Trimite mai întâi cererea de acord."}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pub-title">Titlu pentru site</Label>
                  <Input id="pub-title" value={pubTitle} onChange={(e) => setPubTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pub-desc">Descriere pentru site</Label>
                  <Textarea id="pub-desc" rows={6} value={pubDesc} onChange={(e) => setPubDesc(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pub-img">Imagine (link)</Label>
                  <Input id="pub-img" value={pubImage} onChange={(e) => setPubImage(e.target.value)}
                    placeholder="https://..." />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={publish} disabled={!canPublish || saving} className="min-h-[44px]">
                    {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Globe className="h-4 w-4 mr-1.5" />}
                    {published?.is_published ? "Actualizează pe site" : "Publică pe site"}
                  </Button>
                  {published?.is_published && (
                    <>
                      <Button variant="outline" onClick={unpublish} disabled={saving} className="min-h-[44px]">
                        <Undo2 className="h-4 w-4 mr-1.5" /> Retrage din site
                      </Button>
                      <Button asChild variant="ghost" className="min-h-[44px]">
                        <Link to="/anunturi-proprietari">Vezi pagina publică</Link>
                      </Button>
                    </>
                  )}
                </div>
                {published?.published_at && (
                  <p className="text-xs text-muted-foreground">
                    Publicat: {dt(published.published_at)}
                    {published.is_published ? "" : ` · retras: ${dt(published.unpublished_at)}`}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" /> Mesaj către proprietar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="offer-price">Preț propus ({listing.currency || "EUR"})</Label>
                    <Input
                      id="offer-price"
                      inputMode="numeric"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(e.target.value)}
                      placeholder={listing.price ? String(Math.round(Number(listing.price))) : "ex. 95000"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="offer-duration">Durată (luni)</Label>
                    <Input
                      id="offer-duration"
                      inputMode="numeric"
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(e.target.value)}
                      placeholder="ex. 12"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offer-message">Mesaj</Label>
                  <Textarea
                    id="offer-message"
                    rows={5}
                    value={outreachText}
                    onChange={(e) => setOutreachText(e.target.value)}
                    placeholder="Bună ziua, am văzut anunțul dumneavoastră și v-aș propune administrarea apartamentului…"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={saveOutreach} disabled={savingOutreach} className="min-h-[44px]">
                    {savingOutreach
                      ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                      : <MessageCircle className="h-4 w-4 mr-1.5" />}
                    Salvează mesajul
                  </Button>
                  {listing.phone_normalized && (
                    <Button asChild variant="outline" className="min-h-[44px]">
                      <a
                        href={`https://wa.me/${String(listing.phone_normalized).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(outreachText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Trimite pe WhatsApp
                      </a>
                    </Button>
                  )}
                </div>

                {(outreach ?? []).length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Mesaje salvate</p>
                    {(outreach ?? []).map((m) => (
                      <div key={m.id} className="rounded-lg border p-3 text-sm space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{dt(m.created_at)}</span>
                          {m.offer_price != null && (
                            <Badge variant="secondary">{eur(Number(m.offer_price), m.currency)}</Badge>
                          )}
                          {m.duration_months != null && <Badge variant="outline">{m.duration_months} luni</Badge>}
                        </div>
                        <p className="whitespace-pre-wrap">{m.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
