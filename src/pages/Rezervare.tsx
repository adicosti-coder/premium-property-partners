import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Turnstile } from "@marsidev/react-turnstile";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  ArrowRight, CalendarDays, Check, Loader2, Moon, Phone, ShieldCheck, Sparkles, Users,
} from "lucide-react";

import SEOHead from "@/components/SEOHead";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { properties } from "@/data/properties";
import { usePropertyLiveData } from "@/hooks/usePropertyLiveData";
import { buildPynbookingUrl, isPynbookingUrl, nightsBetween, sanitizeLiveRate } from "@/lib/pynbooking";
import { eurToRon } from "@/utils/currency";

const WHATSAPP_NUMBER = "40799069256";
const CANONICAL = "https://realtrust.ro/rezervare";

const SEO_TITLE = "Rezervare directă apartamente Timișoara | RealTrust ApArt Hotel";
const SEO_DESCRIPTION =
  "Rezervă direct un apartament în regim hotelier în Timișoara: tarife live, disponibilitate reală și confirmare în sistemul nostru de rezervări. Fără comisioane de platformă.";

const bookable = properties.filter((p) => p.isActive !== false);

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function Rezervare() {
  const { toast } = useToast();
  const [params] = useSearchParams();
  const { data: liveData } = usePropertyLiveData();

  const [slug, setSlug] = useState<string>(params.get("apartament") || bookable[0]?.slug || "");
  const [checkIn, setCheckIn] = useState(params.get("checkin") || "");
  const [checkOut, setCheckOut] = useState(params.get("checkout") || "");
  const [guests, setGuests] = useState(params.get("oaspeti") || "2");
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [consent, setConsent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    reference: string;
    emailSent: boolean;
    pynbookingUrl: string | null;
  } | null>(null);

  useEffect(() => {
    supabase.functions
      .invoke("get-turnstile-site-key")
      .then(({ data }) => setSiteKey(data?.siteKey ?? null))
      .catch(() => setSiteKey(null));
  }, []);

  const property = useMemo(() => bookable.find((p) => p.slug === slug) ?? bookable[0], [slug]);

  const rate = useMemo(() => {
    if (!property) return 0;
    const live = liveData?.[property.slug]?.price_per_night ?? null;
    return sanitizeLiveRate(live, property.pricePerNight);
  }, [property, liveData]);

  const isLiveRate = useMemo(() => {
    if (!property) return false;
    const live = liveData?.[property.slug]?.price_per_night ?? null;
    return sanitizeLiveRate(live, -1) === rate && rate > 0;
  }, [property, liveData, rate]);

  const nights = nightsBetween(checkIn, checkOut);
  const total = nights > 0 ? nights * rate : 0;

  const engineUrl = useMemo(
    () =>
      property
        ? buildPynbookingUrl(property.bookingUrl, {
            checkIn,
            checkOut,
            guests: Number(guests) || undefined,
          })
        : "",
    [property, checkIn, checkOut, guests],
  );

  const whatsappUrl = (reference: string) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      [
        `Rezervare ${reference}`,
        `Apartament: ${property?.name ?? ""}`,
        `${checkIn} → ${checkOut} (${nights} nopți, ${guests} oaspeți)`,
        `Nume: ${form.name}`,
      ].join("\n"),
    )}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return;
    if (!property) return;

    if (form.name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) || form.phone.replace(/\D/g, "").length < 8) {
      toast({ title: "Completează datele de contact", description: "Nume, e-mail și telefon valid sunt necesare.", variant: "destructive" });
      return;
    }
    if (nights < 1) {
      toast({ title: "Verifică datele sejurului", description: "Check-out trebuie să fie după check-in.", variant: "destructive" });
      return;
    }
    if (!consent) {
      toast({ title: "Consimțământ necesar", description: "Acceptă prelucrarea datelor pentru a putea confirma rezervarea.", variant: "destructive" });
      return;
    }
    if (siteKey && !captchaToken) {
      toast({ title: "Verificare necesară", description: "Completează verificarea anti-spam.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-booking-request", {
        headers: { "x-idempotency-key": `rezervare-${form.email}-${checkIn}-${checkOut}-${property.slug}` },
        body: {
          guestName: form.name,
          guestEmail: form.email,
          guestPhone: form.phone,
          guests,
          checkIn,
          checkOut,
          message: form.message || undefined,
          propertyName: property.name,
          propertySlug: property.slug,
          propertyRefId: property.id,
          estimatedTotal: total || undefined,
          source: "rezervare_page",
          captchaToken,
        },
      });

      if (error || !data?.success) {
        const details = error instanceof FunctionsHttpError
          ? ((await error.context.json().catch(() => null))?.error as string | undefined)
          : undefined;
        throw new Error(details || (data as { error?: string } | null)?.error || "submit failed");
      }

      const reference = data.reference as string;
      setConfirmation({
        reference,
        emailSent: data.emailSent === true,
        pynbookingUrl: isPynbookingUrl(property.bookingUrl)
          ? buildPynbookingUrl(property.bookingUrl, {
              checkIn,
              checkOut,
              guests: Number(guests) || undefined,
              reference,
            })
          : null,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast({
        title: "Nu am putut trimite rezervarea",
        description: err instanceof Error && err.message !== "submit failed" ? err.message : "Încearcă din nou în câteva momente.",
        variant: "destructive",
      });
      setCaptchaToken(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const jsonLd = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "ReserveAction",
      name: "Rezervare directă apartamente RealTrust ApArt Hotel Timișoara",
      target: {
        "@type": "EntryPoint",
        urlTemplate: CANONICAL,
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
        inLanguage: "ro-RO",
      },
      object: {
        "@type": "LodgingReservation",
        provider: {
          "@type": "LodgingBusiness",
          name: "RealTrust ApArt Hotel",
          address: {
            "@type": "PostalAddress",
            addressLocality: "Timișoara",
            addressRegion: "Timiș",
            addressCountry: "RO",
          },
          telephone: "+40799069256",
        },
      },
      result: { "@type": "LodgingReservation", name: "Confirmare rezervare RealTrust" },
    }),
    [],
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={SEO_TITLE} description={SEO_DESCRIPTION} url={CANONICAL} jsonLd={jsonLd} />
      <Helmet>
        <meta name="robots" content="index, follow" />
      </Helmet>
      <Header />

      <main className="pt-24 pb-20" id="main-content">
        <div className="container mx-auto px-4 max-w-5xl">
          <header className="text-center mb-8">
            <Badge variant="outline" className="mb-3 gap-1">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Rezervare directă, fără comisioane
            </Badge>
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
              Rezervare apartament în Timișoara
            </h1>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              Alege apartamentul, introdu datele sejurului și confirmă rezervarea în sistemul nostru
              de rezervări. Tarifele afișate sunt cele live din motorul de rezervări.
            </p>
          </header>

          {confirmation ? (
            <Card className="max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-7 w-7 text-primary" aria-hidden="true" />
                </div>
                <CardTitle className="mt-3">Rezervare înregistrată</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Referință:{" "}
                  <span className="font-mono font-semibold text-foreground">{confirmation.reference}</span>
                  {" · "}
                  {property?.name}
                  {" · "}
                  {checkIn} → {checkOut} ({nights} nopți)
                </p>
                <p className="text-sm text-muted-foreground">
                  {confirmation.emailSent
                    ? "Ți-am trimis confirmarea pe e-mail."
                    : "Echipa a primit deja rezervarea; te contactăm telefonic pentru confirmare."}
                </p>
                {confirmation.pynbookingUrl && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-left">
                    <p className="text-sm font-semibold text-foreground">
                      Finalizează instant în sistemul de rezervări
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Datele sejurului sunt deja pre-completate. Confirmă acolo pentru blocarea imediată
                      a datelor în calendar.
                    </p>
                    <Button asChild className="mt-3 w-full sm:w-auto">
                      <a href={confirmation.pynbookingUrl} target="_blank" rel="noopener noreferrer">
                        Confirmă rezervarea acum
                        <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>
                  </div>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button asChild variant="outline">
                    <a href={whatsappUrl(confirmation.reference)} target="_blank" rel="noopener noreferrer">
                      <Phone className="mr-2 h-4 w-4" aria-hidden="true" /> Continuă pe WhatsApp
                    </a>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link to="/cazare">Vezi toate apartamentele</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <CalendarDays className="w-5 h-5 text-primary" aria-hidden="true" />
                    Detalii rezervare
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
                      <label htmlFor="rezervare_website">Website</label>
                      <input
                        id="rezervare_website"
                        tabIndex={-1}
                        autoComplete="off"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="apartament">Apartament *</Label>
                      <Select value={property?.slug} onValueChange={setSlug}>
                        <SelectTrigger id="apartament" aria-label="Alege apartamentul">
                          <SelectValue placeholder="Alege apartamentul" />
                        </SelectTrigger>
                        <SelectContent>
                          {bookable.map((p) => (
                            <SelectItem key={p.slug} value={p.slug}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="checkin">Check-in *</Label>
                        <Input
                          id="checkin"
                          type="date"
                          min={todayIso()}
                          value={checkIn}
                          onChange={(e) => setCheckIn(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkout">Check-out *</Label>
                        <Input
                          id="checkout"
                          type="date"
                          min={checkIn || todayIso()}
                          value={checkOut}
                          onChange={(e) => setCheckOut(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="oaspeti">Oaspeți *</Label>
                        <Input
                          id="oaspeti"
                          type="number"
                          min={1}
                          max={property?.capacity ?? 10}
                          value={guests}
                          onChange={(e) => setGuests(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="nume">Nume complet *</Label>
                        <Input id="nume" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ion Popescu" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefon">Telefon *</Label>
                        <Input id="telefon" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+40 7xx xxx xxx" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nume@exemplu.ro" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mesaj">Cerințe speciale (opțional)</Label>
                      <Textarea id="mesaj" rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Ora estimată de sosire, parcare, pat suplimentar…" />
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} aria-label="Accept prelucrarea datelor" />
                      <Label htmlFor="consent" className="text-sm font-normal text-muted-foreground leading-relaxed">
                        Accept prelucrarea datelor pentru confirmarea rezervării, conform{" "}
                        <Link to="/legal/politica-de-confidentialitate" className="text-primary underline underline-offset-4">
                          politicii de confidențialitate
                        </Link>
                        .
                      </Label>
                    </div>

                    {siteKey && (
                      <Turnstile
                        siteKey={siteKey}
                        onSuccess={setCaptchaToken}
                        onExpire={() => setCaptchaToken(null)}
                        options={{ theme: "auto" }}
                      />
                    )}

                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Se trimite…
                        </>
                      ) : (
                        <>Confirmă rezervarea</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <aside className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sumar sejur</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {property && (
                      <>
                        <img
                          src={property.images[0]}
                          alt={`${property.name} – apartament regim hotelier în ${property.location}`}
                          loading="lazy"
                          className="w-full rounded-lg object-cover aspect-[4/3]"
                          width={480}
                          height={360}
                        />
                        <p className="font-semibold text-foreground">{property.name}</p>
                        <p className="text-muted-foreground">{property.location}</p>
                        <div className="flex items-center justify-between border-t pt-3">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Sparkles className="w-4 h-4" aria-hidden="true" /> Tarif
                            {isLiveRate ? " live" : ""}
                          </span>
                          <span className="font-semibold text-foreground">
                            €{rate}/noapte · {eurToRon(rate).toLocaleString("ro-RO")} lei
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Moon className="w-4 h-4" aria-hidden="true" /> Nopți
                          </span>
                          <span className="font-semibold text-foreground">{nights || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-4 h-4" aria-hidden="true" /> Oaspeți
                          </span>
                          <span className="font-semibold text-foreground">{guests}</span>
                        </div>
                        <div className="flex items-center justify-between border-t pt-3 text-base">
                          <span className="font-medium text-foreground">Total estimat</span>
                          <span className="font-bold text-primary">
                            {total ? `€${total.toLocaleString("ro-RO")}` : "—"}
                          </span>
                        </div>
                        {isPynbookingUrl(property.bookingUrl) && (
                          <Button asChild variant="outline" size="sm" className="w-full">
                            <a href={engineUrl} target="_blank" rel="noopener noreferrer">
                              Verifică disponibilitatea live
                            </a>
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6 space-y-2 text-sm text-muted-foreground">
                    <p className="font-semibold text-foreground">De ce rezervi direct?</p>
                    <ul className="space-y-1">
                      <li>• Cel mai bun tarif garantat, fără comision de platformă</li>
                      <li>• Confirmare rapidă de la echipa RealTrust</li>
                      <li>• Check-in flexibil și asistență în română și engleză</li>
                    </ul>
                  </CardContent>
                </Card>
              </aside>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
