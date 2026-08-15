import { Suspense, lazy, useEffect, useMemo, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, MessageCircle, Phone, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { trackConversion } from "@/lib/conversionTracking";
import { getCampaignAttribution } from "@/lib/campaignAttribution";

const Header = lazy(() => import("@/components/Header"));
const YieldReportDelivery = lazy(() => import("@/components/thankyou/YieldReportDelivery"));
const Footer = lazy(() => import("@/components/Footer"));

const WHATSAPP_NUMBER = "40799069256";
const PHONE_DISPLAY = "+40 799 069 256";

/**
 * /multumire — single confirmation page for every owner lead funnel.
 *
 * Query params (all optional):
 *   nume, telefon, oras|zona, tip, camere, sursa, email
 *
 * Fires exactly ONE `generate_lead` conversion (GA4 + Meta pixel + CAPI,
 * consent-gated inside trackConversion) per page view. The guard survives
 * React strict-mode double effects and re-renders.
 */
const ThankYou = () => {
  const [searchParams] = useSearchParams();
  const firedRef = useRef(false);

  const summary = useMemo(() => {
    const get = (...keys: string[]) => {
      for (const k of keys) {
        const v = searchParams.get(k);
        if (v && v.trim()) return v.trim().slice(0, 80);
      }
      return "";
    };
    return {
      name: get("nume", "name"),
      phone: get("telefon", "phone"),
      email: get("email"),
      zone: get("zona", "oras", "zone", "city"),
      type: get("tip", "type"),
      rooms: get("camere", "rooms"),
      source: get("sursa", "source") || "multumire",
    };
  }, [searchParams]);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    const attribution = getCampaignAttribution();
    trackConversion({
      event: "generate_lead",
      source: summary.source,
      currency: "EUR",
      page_path: "/multumire",
      lead_zone: summary.zone || undefined,
      lead_type: summary.type || undefined,
      utm_source: attribution?.utm_source,
      utm_medium: attribution?.utm_medium,
      utm_campaign: attribution?.utm_campaign,
      // Advanced matching — hashed server-side, never stored client-side.
      name: summary.name || undefined,
      phone: summary.phone || undefined,
      email: summary.email || undefined,
    });
  }, [summary]);

  const firstName = summary.name ? summary.name.split(" ")[0] : "";

  const waMessage = [
    `Salut, sunt ${summary.name || "proprietar"}${summary.zone ? ` din ${summary.zone}` : ""}.`,
    "Am trimis solicitarea de evaluare pe realtrust.ro și aș vrea să discutăm despre randamentul apartamentului meu în regim hotelier.",
  ].join(" ");

  const rows: Array<{ label: string; value: string }> = [
    { label: "Nume", value: summary.name },
    { label: "Telefon", value: summary.phone },
    { label: "Zonă / Localitate", value: summary.zone },
    { label: "Tip proprietate", value: summary.type },
    { label: "Camere", value: summary.rooms },
  ].filter((r) => !!r.value);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Mulțumim! Cererea ta a fost înregistrată | RealTrust Timișoara"
        description="Am primit solicitarea ta de evaluare pentru regim hotelier în Timișoara. Un consultant RealTrust te contactează în maximum 24 de ore lucrătoare."
        url="https://realtrust.ro/multumire"
        noIndex
      />
      <Suspense fallback={null}>
        <Header />
      </Suspense>

      <main className="px-4 pt-32 pb-20 md:pt-36">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-5" aria-hidden="true" />
            <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
              {firstName ? `Mulțumim, ${firstName}!` : "Mulțumim!"} Cererea ta a fost înregistrată
            </h1>
            <p className="text-muted-foreground text-lg">
              Un consultant RealTrust analizează datele apartamentului tău și te contactează cu
              estimarea de venit lunar personalizată. Fără obligații contractuale.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-primary">
            <Clock className="w-4 h-4" aria-hidden="true" />
            Răspuns în maximum 24 de ore lucrătoare
          </div>

          {rows.length > 0 && (
            <section
              aria-labelledby="thankyou-summary"
              className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm"
            >
              <h2 id="thankyou-summary" className="text-lg font-semibold text-foreground mb-4">
                Rezumatul solicitării tale
              </h2>
              <dl className="space-y-3">
                {rows.map((row) => (
                  <div key={row.label} className="flex justify-between gap-4 text-sm">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="font-medium text-foreground text-right">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <Suspense fallback={null}>
            <YieldReportDelivery
              name={summary.name}
              phone={summary.phone}
              email={summary.email}
              zone={summary.zone}
              rooms={summary.rooms}
            />
          </Suspense>

          <div className="mt-8 space-y-3">
            <Button asChild size="lg" className="w-full min-h-[48px]">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waMessage)}&utm_source=site&utm_medium=thankyou&utm_campaign=owner_lead`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discută acum pe WhatsApp cu un consultant RealTrust"
                onClick={() =>
                  trackConversion({
                    event: "WhatsApp_Click",
                    source: "multumire_whatsapp",
                    page_path: "/multumire",
                  })
                }
              >
                <MessageCircle className="w-5 h-5 mr-2" aria-hidden="true" />
                Vorbește acum pe WhatsApp
              </a>
            </Button>

            <Button asChild variant="outline" size="lg" className="w-full min-h-[48px]">
              <a
                href={`tel:+${WHATSAPP_NUMBER}`}
                aria-label={`Sună consultantul RealTrust la ${PHONE_DISPLAY}`}
                onClick={() =>
                  trackConversion({ event: "phone_click", source: "multumire_phone" })
                }
              >
                <Phone className="w-5 h-5 mr-2" aria-hidden="true" />
                {PHONE_DISPLAY}
              </a>
            </Button>
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-muted/40 p-6">
            <h2 className="text-base font-semibold text-foreground mb-3">Ce urmează?</h2>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>Analizăm zona, tipul apartamentului și tarifele reale din Timișoara.</li>
              <li>Primești estimarea de venit lunar net și pachetul de administrare potrivit.</li>
              <li>Decizi liniștit — vizităm apartamentul doar dacă vrei să continuăm.</li>
            </ol>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild variant="ghost" size="sm">
                <Link to="/pentru-proprietari" aria-label="Înapoi la pagina pentru proprietari">
                  Servicii pentru proprietari
                  <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/blog" aria-label="Citește ghidurile despre regim hotelier">
                  Ghiduri regim hotelier
                  <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
};

export default ThankYou;
