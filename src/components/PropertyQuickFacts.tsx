import { BedDouble, Building2, Maximize, MapPin, MessageCircle } from "lucide-react";

/**
 * „Apartamentul pe scurt" — suprafața, etajul, camerele și vecinătatea,
 * plus un buton de WhatsApp cu detaliile completate, ca vizitatorul să vadă
 * esențialul înainte de a cere o ofertă.
 */
type Props = {
  name: string;
  location?: string | null;
  size?: number | string | null;
  floor?: string | number | null;
  bedrooms?: number | null;
  capacity?: number | null;
  language?: string;
};

const WA_NUMBER = "40799069256";

const PropertyQuickFacts = ({
  name,
  location,
  size,
  floor,
  bedrooms,
  capacity,
  language = "ro",
}: Props) => {
  const ro = language !== "en";
  const floorLabel =
    floor === null || floor === undefined || floor === ""
      ? null
      : String(floor).match(/^\d+$/)
        ? Number(floor) === 0
          ? ro ? "Parter" : "Ground floor"
          : `${ro ? "Etaj" : "Floor"} ${floor}`
        : String(floor);

  const facts = [
    size ? { icon: Maximize, label: ro ? "Suprafață" : "Size", value: `${size} m²` } : null,
    floorLabel ? { icon: Building2, label: ro ? "Etaj" : "Floor", value: floorLabel } : null,
    bedrooms
      ? {
          icon: BedDouble,
          label: ro ? "Camere" : "Rooms",
          value: `${bedrooms}${capacity ? ` · ${capacity} ${ro ? "pers." : "guests"}` : ""}`,
        }
      : null,
    location ? { icon: MapPin, label: ro ? "Vecinătate" : "Neighbourhood", value: location } : null,
  ].filter(Boolean) as { icon: typeof Maximize; label: string; value: string }[];

  if (facts.length === 0) return null;

  const waText = [
    ro
      ? `Bună ziua! Sunt interesat de ${name}.`
      : `Hello! I'm interested in ${name}.`,
    [
      size ? `${size} m²` : null,
      floorLabel,
      bedrooms ? `${bedrooms} ${ro ? "camere" : "rooms"}` : null,
      location,
    ]
      .filter(Boolean)
      .join(" · "),
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <section
      aria-label={ro ? "Apartamentul pe scurt" : "Apartment at a glance"}
      className="rounded-2xl border bg-card p-5 sm:p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold">
        {ro ? "Apartamentul pe scurt" : "Apartment at a glance"}
      </h2>

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {facts.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <f.icon className="w-3.5 h-3.5 shrink-0" />
              {f.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground break-words">{f.value}</dd>
          </div>
        ))}
      </dl>

      <a
        href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waText)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ro ? "Întreabă pe WhatsApp despre acest apartament" : "Ask about this apartment on WhatsApp"}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <MessageCircle className="w-4 h-4" />
        {ro ? "Întreabă pe WhatsApp" : "Ask on WhatsApp"}
      </a>
    </section>
  );
};

export default PropertyQuickFacts;
