import { Coins, Percent, TrendingUp, MessageCircle } from "lucide-react";

/**
 * „Oferta reală" de pe pagina apartamentului: prețul din anunț, comisionul
 * RealTrust de administrare (15-20% din încasări) și profitul net estimat
 * (circa 9,4% pe an din valoarea apartamentului, ca estimare medie).
 */
type Props = {
  name: string;
  price?: number | null;
  language?: string;
};

const WA_NUMBER = "40799069256";
const NET_YIELD = 0.094;
const FEE_MIN = 0.15;
const FEE_MAX = 0.2;

const PropertyOfferBox = ({ name, price, language = "ro" }: Props) => {
  const ro = language !== "en";
  const value = Number(price) || 0;
  if (!value) return null;

  const eur = (v: number) =>
    `${Math.round(v).toLocaleString(ro ? "ro-RO" : "en-US")} €`;

  const netYear = value * NET_YIELD;
  const netMonth = netYear / 12;
  const grossMonth = netMonth / 0.73;

  const rows = [
    {
      icon: Coins,
      label: ro ? "Preț din anunț" : "Listing price",
      value: eur(value),
      hint: ro ? "Prețul cerut, fără costuri de achiziție" : "Asking price, purchase costs excluded",
    },
    {
      icon: Percent,
      label: ro ? "Comision RealTrust administrare" : "RealTrust management fee",
      value: `15–20% · ${eur(grossMonth * FEE_MIN)}–${eur(grossMonth * FEE_MAX)}/${ro ? "lună" : "mo"}`,
      hint: ro
        ? "Anunțuri, prețuri dinamice, comunicare cu oaspeții, curățenie, mentenanță"
        : "Listings, dynamic pricing, guest communication, cleaning, maintenance",
    },
    {
      icon: TrendingUp,
      label: ro ? "Profit net estimat" : "Estimated net profit",
      value: `${eur(netMonth)}/${ro ? "lună" : "mo"} · ${eur(netYear)}/${ro ? "an" : "yr"}`,
      hint: ro
        ? "Circa 9,4% pe an — estimare medie, în funcție de ocupare și costurile reale"
        : "Around 9.4% per year — average estimate, depending on occupancy and real costs",
    },
  ];

  const waText = ro
    ? `Bună ziua! Aș vrea oferta pentru ${name} (preț anunț ${eur(value)}).`
    : `Hello! I'd like the offer for ${name} (listed at ${eur(value)}).`;

  return (
    <section
      aria-label={ro ? "Oferta pentru acest apartament" : "Offer for this apartment"}
      className="rounded-2xl border bg-card p-5 sm:p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold">
        {ro ? "Oferta pentru acest apartament" : "Offer for this apartment"}
      </h2>

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start gap-3">
            <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {r.label}: <span className="font-semibold">{r.value}</span>
              </p>
              <p className="text-xs text-muted-foreground">{r.hint}</p>
            </div>
          </li>
        ))}
      </ul>

      <a
        href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waText)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ro ? "Cere oferta pe WhatsApp pentru acest apartament" : "Request the offer on WhatsApp"}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <MessageCircle className="h-4 w-4" />
        {ro ? "Cere oferta pe WhatsApp" : "Request the offer on WhatsApp"}
      </a>

      <p className="text-xs text-muted-foreground">
        {ro
          ? "Cifrele sunt estimative și se confirmă după vizionare și evaluare, fără nicio obligație."
          : "Figures are estimates, confirmed after the viewing and valuation, with no obligation."}
      </p>
    </section>
  );
};

export default PropertyOfferBox;
