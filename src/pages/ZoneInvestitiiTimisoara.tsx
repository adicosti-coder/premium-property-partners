import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Info, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import ContextualLinks from "@/components/seo/ContextualLinks";
import { CLUSTER_LINKS } from "@/lib/internalLinking";
import { neighborhoods } from "@/data/neighborhoods";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const BASE_URL = "https://realtrust.ro";
const URL = `${BASE_URL}/zone-investitii-timisoara`;

type Level = "Ridicat" | "Mediu" | "Scăzut" | "Foarte ridicat" | "Variabil";

interface ZoneRow {
  /** Neighborhood slug when a dedicated page exists. */
  slug?: string;
  name: string;
  /** Internal RealTrust price index (€/mp) when available. */
  priceIndex?: number;
  rent: Level;
  hotelPotential: Level;
  demand: Level;
  liquidity: Level;
  profile: string;
  risk: Level;
  access: string;
  note: string;
}

/**
 * Comparative table across the Timișoara areas RealTrust works in.
 *
 * DATA PROVENANCE — important for E-E-A-T:
 *  - `priceIndex` comes from src/data/neighborhoods.ts, an internal RealTrust
 *    index, not an official market quotation.
 *  - every qualitative column is an internal assessment based on the
 *    apartments we manage and the listings we handle; it is labelled as such
 *    in the page copy and must never be presented as published statistics.
 *  - Fabric and Cetate/Centru have no separate neighborhood page yet, so their
 *    price index is intentionally left empty rather than estimated.
 */
const ZONES: ZoneRow[] = [
  {
    name: "Centru / Cetate",
    rent: "Ridicat",
    hotelPotential: "Foarte ridicat",
    demand: "Foarte ridicat",
    liquidity: "Ridicat",
    profile: "Turiști, călători de business, chiriași cu venituri peste medie",
    risk: "Mediu",
    access: "Totul pe jos; parcare dificilă",
    note: "Cel mai bun tarif pe noapte din oraș și cerere pe tot anul, dar preț de achiziție ridicat și fond construit istoric, cu costuri de renovare greu de estimat.",
  },
  {
    slug: "iosefin",
    name: "Iosefin",
    rent: "Mediu",
    hotelPotential: "Ridicat",
    demand: "Ridicat",
    liquidity: "Mediu",
    profile: "Tineri profesioniști, oaspeți care vor centrul fără prețul din Cetate",
    risk: "Mediu",
    access: "Tramvai, gară, mers pe jos până în Cetate",
    note: "Cartier istoric în reabilitare progresivă: potențial de apreciere, dar calitate foarte variabilă de la o stradă la alta.",
  },
  {
    slug: "isho",
    name: "ISHO",
    rent: "Ridicat",
    hotelPotential: "Ridicat",
    demand: "Ridicat",
    liquidity: "Ridicat",
    profile: "Angajați IT, expați, oaspeți de business",
    risk: "Mediu",
    access: "Pietonal spre centru, trafic dificil cu mașina",
    note: "Clădiri noi, servicii la parter, cerere dublă (chirie lungă + cazare). Prețul de intrare cere un tarif mediu pe noapte peste media orașului.",
  },
  {
    name: "Fabric",
    rent: "Mediu",
    hotelPotential: "Mediu",
    demand: "Mediu",
    liquidity: "Mediu",
    profile: "Chiriași pe termen lung, turiști interesați de patrimoniu industrial",
    risk: "Mediu",
    access: "Tramvai, promenada Begăi spre centru",
    note: "Fond construit de secol XIX–XX, cu potențial de reconversie. Randamentul depinde de bugetul de renovare, nu doar de prețul de achiziție.",
  },
  {
    slug: "circumvalatiunii",
    name: "Circumvalațiunii",
    rent: "Mediu",
    hotelPotential: "Mediu",
    demand: "Ridicat",
    liquidity: "Ridicat",
    profile: "Studenți, tineri angajați, familii, oaspeți de business",
    risk: "Scăzut",
    access: "Tramvai și autobuz dens, ieșire directă spre A1",
    note: "Cea mai bună lichiditate pentru apartamente de 2 camere: se închiriază și se revând repede, cu cerere din mai multe surse.",
  },
  {
    slug: "zona-aradului",
    name: "Calea Aradului",
    rent: "Mediu",
    hotelPotential: "Ridicat",
    demand: "Ridicat",
    liquidity: "Mediu",
    profile: "Studenți, angajați corporate, călători sosiți pe aeroport",
    risk: "Scăzut",
    access: "Cel mai rapid acces spre aeroport și A1",
    note: "Cerere din trei surse independente, deci sezonalitate mai blândă. Ofertă nouă abundentă — atenție la suprasaturare pe anumite tronsoane.",
  },
  {
    slug: "calea-lipovei",
    name: "Calea Lipovei",
    rent: "Scăzut",
    hotelPotential: "Scăzut",
    demand: "Mediu",
    liquidity: "Mediu",
    profile: "Familii tinere, chiriași pe termen lung",
    risk: "Scăzut",
    access: "Tramvai și autobuz spre centru",
    note: "Zonă de chirie clasică. Fără generatori de trafic în apropiere, un model de cazare pe termen scurt este greu de susținut.",
  },
  {
    slug: "complex-studentesc",
    name: "Complex Studențesc",
    rent: "Ridicat",
    hotelPotential: "Variabil",
    demand: "Foarte ridicat",
    liquidity: "Ridicat",
    profile: "Studenți, părinți în vizită, participanți la conferințe",
    risk: "Mediu",
    access: "Totul pe jos; parcare foarte dificilă",
    note: "Venit brut ridicat raportat la prețul de achiziție, dar sezonalitate accentuată și uzură mare. Funcționează bine ca model mixt (chirie în anul universitar, cazare vara).",
  },
  {
    slug: "zona-girocului",
    name: "Girocului",
    rent: "Scăzut",
    hotelPotential: "Scăzut",
    demand: "Mediu",
    liquidity: "Mediu",
    profile: "Familii tinere, personal medical",
    risk: "Mediu",
    access: "Artera spre inelul de circulație; transport public mai rar spre limită",
    note: "Cel mai mult metru pătrat pentru buget, cu compromisul infrastructurii încă în formare în zonele de expansiune.",
  },
  {
    slug: "sagului",
    name: "Calea Șagului",
    rent: "Scăzut",
    hotelPotential: "Scăzut",
    demand: "Mediu",
    liquidity: "Mediu",
    profile: "Angajați din producție, logistică și retail",
    risk: "Mediu",
    access: "Tramvai spre centru, ieșire directă spre sud-vest",
    note: "Preț de intrare mic și chiriaș stabil. Cererea depinde însă de câțiva angajatori mari din vecinătate.",
  },
  {
    slug: "dumbravita",
    name: "Dumbrăvița",
    rent: "Mediu",
    hotelPotential: "Mediu",
    demand: "Ridicat",
    liquidity: "Mediu",
    profile: "Familii, angajați din nordul orașului",
    risk: "Mediu",
    access: "Acces rutier bun spre nord; dependență de mașină",
    note: "Locuințe noi la prețuri sub zonele centrale, cu cerere susținută de familii. Este comună separată de Timișoara — verifică taxele locale.",
  },
  {
    slug: "giroc",
    name: "Giroc",
    rent: "Scăzut",
    hotelPotential: "Scăzut",
    demand: "Mediu",
    liquidity: "Scăzut",
    profile: "Familii care caută casă sau apartament spațios",
    risk: "Mediu",
    access: "Dependență de mașină pentru rutina zilnică",
    note: "Preț de intrare mic pentru suprafețe mari, dar lichiditate mai lentă la revânzare și cerere de cazare ocazională.",
  },
];

const priceOf = (slug?: string) => {
  if (!slug) return undefined;
  return neighborhoods.find((n) => n.slug === slug)?.avgPricePerSqm;
};

const ZoneInvestitiiTimisoara = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Care sunt cele mai bune zone din Timișoara pentru investiții imobiliare?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Nu există o zonă „cea mai bună” în mod absolut — depinde de strategie. Pentru tarif pe noapte și cerere pe tot anul, Cetate/Centru, Iosefin și ISHO conduc. Pentru lichiditate și cerere mixtă, Circumvalațiunii și Calea Aradului sunt cele mai echilibrate. Pentru preț de intrare mic și chiriaș stabil pe termen lung, Calea Șagului, Calea Lipovei și Girocului sunt mai potrivite. Complexul Studențesc oferă venit brut ridicat, dar cu sezonalitate accentuată.",
          },
        },
        {
          "@type": "Question",
          name: "Ce criterii compari între zonele din Timișoara înainte de o investiție?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Preț de achiziție, nivelul chiriei realizabile, potențialul de regim hotelier, intensitatea cererii, lichiditatea la revânzare, profilul chiriașilor sau oaspeților, riscul specific zonei, accesul și maturitatea infrastructurii. O zonă bună pentru chirie clasică nu este automat bună pentru cazare pe termen scurt.",
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Cele mai bune zone din Timișoara pentru investiții imobiliare | RealTrust"
        description="Comparație pe zone din Timișoara: preț, chirie, potențial de regim hotelier, cerere, lichiditate și risc. Analiză internă RealTrust pentru investitori, fără declarații absolute."
        url={URL}
        breadcrumbItems={[
          { name: "Acasă", url: BASE_URL },
          { name: "Investiții imobiliare", url: `${BASE_URL}/investitii` },
          { name: "Zone pentru investiții", url: URL },
        ]}
        jsonLd={jsonLd}
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <PageBreadcrumb
            items={[
              { label: "Investiții imobiliare", href: "/investitii" },
              { label: "Zone pentru investiții" },
            ]}
          />

          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            Care sunt cele mai bune zone din Timișoara pentru investiții imobiliare?
          </h1>

          <section
            className="ai-quote my-6 rounded-xl border-l-4 border-accent bg-muted/40 p-5"
            aria-label="Care sunt zonele bune pentru investiții în Timișoara?"
          >
            <p className="text-sm md:text-base leading-relaxed text-foreground/90">
              În Timișoara nu există o zonă „cea mai bună” în mod absolut: rezultatul depinde de
              strategie. Pentru tarif pe noapte și cerere pe tot anul conduc Cetate/Centru, Iosefin
              și ISHO. Pentru lichiditate și cerere din mai multe surse, Circumvalațiunii și Calea
              Aradului sunt cele mai echilibrate. Pentru preț de intrare mic și chiriaș stabil pe
              termen lung, Calea Șagului, Calea Lipovei și Girocului sunt mai potrivite. Complexul
              Studențesc dă venit brut ridicat, cu sezonalitate accentuată.
            </p>
          </section>

          <aside className="rounded-xl border border-border bg-secondary/40 p-5 mb-8 flex gap-3">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Metodologie și sursa datelor.</strong> Coloana
              „preț” este indicele intern RealTrust pe metru pătrat folosit pe paginile de cartier și
              nu este o cotație oficială de piață. Evaluările calitative (chirie, potențial de regim
              hotelier, cerere, lichiditate, risc) sunt o <em>analiză internă</em> bazată pe
              apartamentele pe care le administrăm în Timișoara (15 unități) și pe anunțurile pe care
              le intermediem. Nu sunt statistici publicate și se pot schimba odată cu piața. Zonele
              Centru/Cetate și Fabric nu au încă un indice de preț propriu, așa că am lăsat coloana
              necompletată în loc să estimăm. Randamentele folosite în simulări pornesc de la
              ipotezele publice: ocupare 75%, deducere operațională 27%, randament net de referință
              9,4%.
            </p>
          </aside>

          <div className="overflow-x-auto mb-8 rounded-xl border border-border">
            <table className="w-full min-w-[900px] text-sm">
              <caption className="sr-only">
                Comparație între zonele din Timișoara după criterii investiționale — analiză internă
                RealTrust
              </caption>
              <thead className="bg-muted/60">
                <tr>
                  <th scope="col" className="text-left p-3 font-semibold text-foreground">Zonă</th>
                  <th scope="col" className="text-left p-3 font-semibold text-foreground">Preț (indice intern, €/mp)</th>
                  <th scope="col" className="text-left p-3 font-semibold text-foreground">Chirie</th>
                  <th scope="col" className="text-left p-3 font-semibold text-foreground">Potențial regim hotelier</th>
                  <th scope="col" className="text-left p-3 font-semibold text-foreground">Cerere</th>
                  <th scope="col" className="text-left p-3 font-semibold text-foreground">Lichiditate</th>
                  <th scope="col" className="text-left p-3 font-semibold text-foreground">Risc</th>
                  <th scope="col" className="text-left p-3 font-semibold text-foreground">Profil chiriași / oaspeți</th>
                  <th scope="col" className="text-left p-3 font-semibold text-foreground">Acces</th>
                </tr>
              </thead>
              <tbody>
                {ZONES.map((z) => {
                  const price = priceOf(z.slug);
                  return (
                    <tr key={z.name} className="border-t border-border align-top">
                      <th scope="row" className="text-left p-3 font-medium text-foreground">
                        {z.slug ? (
                          <Link
                            to={`/imobiliare-timisoara/${z.slug}`}
                            className="text-primary hover:underline"
                          >
                            {z.name}
                          </Link>
                        ) : (
                          z.name
                        )}
                      </th>
                      <td className="p-3 text-muted-foreground">
                        {price ? `${price.toLocaleString("ro-RO")} €/mp` : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground">{z.rent}</td>
                      <td className="p-3 text-muted-foreground">{z.hotelPotential}</td>
                      <td className="p-3 text-muted-foreground">{z.demand}</td>
                      <td className="p-3 text-muted-foreground">{z.liquidity}</td>
                      <td className="p-3 text-muted-foreground">{z.risk}</td>
                      <td className="p-3 text-muted-foreground">{z.profile}</td>
                      <td className="p-3 text-muted-foreground">{z.access}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <section className="mb-10">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              Ce spune fiecare zonă despre strategia ta
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {ZONES.map((z) => (
                <article key={z.name} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-base font-semibold text-foreground mb-1">{z.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{z.note}</p>
                  {z.slug && (
                    <Link
                      to={`/imobiliare-timisoara/${z.slug}`}
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      analiza completă a zonei {z.name}
                      <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="mb-10 max-w-3xl">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-3">
              Cum folosim această comparație în practică
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-3">
              Pornim de la strategia proprietarului, nu de la zonă. Dacă obiectivul este venit
              pasiv cu implicare minimă și risc mic, ne uităm la zonele cu cerere stabilă de chirie
              clasică. Dacă obiectivul este randament net cât mai aproape de pragul nostru de
              referință de 9,4%, ne uităm la zonele unde tariful pe noapte susține ipoteza de ocupare
              de 75% după deducerea operațională de 27%.
            </p>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Pasul următor este întotdeauna o verificare pe o adresă concretă: aceeași zonă poate
              produce rezultate foarte diferite în funcție de etaj, compartimentare, parcare și
              starea imobilului. Ghidul nostru despre{" "}
              <Link to="/ghid-evaluare-apartament-timisoara" className="text-primary underline underline-offset-2">
                cum se evaluează un apartament în Timișoara
              </Link>{" "}
              explică exact ce cântărim.
            </p>
          </section>

          <ContextualLinks
            title="Continuă documentarea despre investițiile imobiliare din Timișoara"
            intro="Randament, catalog de oportunități și zonele analizate individual."
            links={CLUSTER_LINKS.investitii}
          />
        </div>
      </main>

      <Suspense fallback={null}>
        <Footer />
        <GlobalConversionWidgets />
      </Suspense>
      <BackToTop />
    </div>
  );
};

export default ZoneInvestitiiTimisoara;
