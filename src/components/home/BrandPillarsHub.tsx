import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card } from "@/components/ui/card";
import {
  Building2,
  Handshake,
  TrendingUp,
  Tags,
  Sparkles,
  BedDouble,
  Landmark,
  MapPin,
  BookOpen,
  ShieldCheck,
  Phone,
} from "lucide-react";

type Pillar = {
  to: string;
  icon: typeof Building2;
  ro: { title: string; desc: string };
  en: { title: string; desc: string };
};

const PILLARS: Pillar[] = [
  {
    to: "/pentru-proprietari",
    icon: Building2,
    ro: { title: "Pentru proprietari", desc: "Administrare completă în regim hotelier, cu randament net predictibil." },
    en: { title: "For owners", desc: "Full short-stay management with predictable net returns." },
  },
  {
    to: "/servicii-imobiliare",
    icon: Handshake,
    ro: { title: "Servicii imobiliare", desc: "Vânzări, cumpărări și închirieri în Timișoara, cu consultanță dedicată." },
    en: { title: "Real estate services", desc: "Sales, purchases and rentals in Timișoara with dedicated advisory." },
  },
  {
    to: "/investitii",
    icon: TrendingUp,
    ro: { title: "Investiții imobiliare", desc: "Oportunități verificate, cu analiză de randament înainte de achiziție." },
    en: { title: "Property investments", desc: "Verified opportunities with yield analysis before you buy." },
  },
  {
    to: "/preturi",
    icon: Tags,
    ro: { title: "Prețuri și comisioane", desc: "Structura de costuri, transparentă, fără taxe ascunse." },
    en: { title: "Pricing", desc: "Transparent cost structure, no hidden fees." },
  },
  {
    to: "/hostscan-ai",
    icon: Sparkles,
    ro: { title: "HostScan AI", desc: "Evaluare gratuită a potențialului apartamentului, din fotografii." },
    en: { title: "HostScan AI", desc: "Free photo-based assessment of your apartment's potential." },
  },
  {
    to: "/cazare",
    icon: BedDouble,
    ro: { title: "Cazare Timișoara", desc: "Apartamente în regim hotelier, disponibilitate și tarife live." },
    en: { title: "Stays in Timișoara", desc: "Serviced apartments with live availability and rates." },
  },
  {
    to: "/ansambluri-rezidentiale",
    icon: Landmark,
    ro: { title: "Ansambluri rezidențiale", desc: "ISHO, Ateneo, City of Mara, Fructus Plaza și alte dezvoltări premium." },
    en: { title: "Residential complexes", desc: "ISHO, Ateneo, City of Mara, Fructus Plaza and other premium projects." },
  },
  {
    to: "/cartiere",
    icon: MapPin,
    ro: { title: "Cartiere", desc: "Cetate, Iosefin, Fabric, Dumbrăvița, Aradului — prețuri și potențial." },
    en: { title: "Neighborhoods", desc: "Cetate, Iosefin, Fabric, Dumbrăvița, Aradului — prices and potential." },
  },
  {
    to: "/blog",
    icon: BookOpen,
    ro: { title: "Blog și ghiduri", desc: "Analize de piață, ghiduri pentru proprietari și pentru oaspeți." },
    en: { title: "Blog and guides", desc: "Market analysis, owner guides and guest guides." },
  },
  {
    to: "/despre-noi",
    icon: ShieldCheck,
    ro: { title: "Despre noi", desc: "Echipa, experiența și rezultatele din spatele RealTrust." },
    en: { title: "About us", desc: "The team, experience and results behind RealTrust." },
  },
  {
    to: "/contact",
    icon: Phone,
    ro: { title: "Contact", desc: "Telefon, e-mail și adresa biroului din Timișoara." },
    en: { title: "Contact", desc: "Phone, email and our Timișoara office address." },
  },
];

/**
 * Homepage brand-authority hub: one clear entry point per commercial intent,
 * so the homepage stays the authority page and each sub-page owns its search intent.
 */
const BrandPillarsHub = () => {
  const { language } = useLanguage();
  const ro = language !== "en";

  return (
    <section aria-labelledby="pillars-heading" className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mb-10">
          <h2 id="pillars-heading" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {ro ? "Tot ce facem, într-un singur loc" : "Everything we do, in one place"}
          </h2>
          <p className="text-lg text-muted-foreground">
            {ro
              ? "RealTrust acoperă întregul ciclu imobiliar din Timișoara: intermediere, investiții și administrare în regim hotelier. Alege direcția care ți se potrivește."
              : "RealTrust covers the full real estate cycle in Timișoara: brokerage, investments and short-stay management. Pick the path that fits you."}
          </p>
        </div>

        <nav aria-label={ro ? "Secțiuni principale RealTrust" : "Main RealTrust sections"}>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => {
              const copy = ro ? p.ro : p.en;
              const Icon = p.icon;
              return (
                <li key={p.to}>
                  <Card className="h-full transition-shadow hover:shadow-lg focus-within:ring-2 focus-within:ring-ring">
                    <Link
                      to={p.to}
                      className="flex h-full min-h-[112px] items-start gap-4 p-5 rounded-lg outline-none"
                    >
                      <span className="shrink-0 rounded-md bg-primary/10 p-3 text-primary" aria-hidden="true">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-base font-semibold text-foreground">{copy.title}</span>
                        <span className="mt-1 block text-sm text-muted-foreground">{copy.desc}</span>
                      </span>
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </section>
  );
};

export default BrandPillarsHub;
