import { Link } from "react-router-dom";
import { TrendingUp, Calculator, Building2, MapPin, LineChart, Wallet, Home, Briefcase } from "lucide-react";

/**
 * BlogPillarHub
 * -------------
 * Restructures the long-form pillar content into a logical H2 → H3 hierarchy
 * and explicitly targets the missing-keyword opportunities identified in the
 * SEO audit (21.04.2026):
 *  - "evaluare apartament Timișoara preț"
 *  - "piața imobiliară Timișoara evoluție"
 *  - "randament chirie Timișoara"
 *
 * Includes a Table of Contents with anchor jump links for UX on long pages.
 */

type TocItem = { id: string; label: string };

const tocItems: TocItem[] = [
  { id: "piata-evolutie", label: "Evoluția pieței imobiliare Timișoara" },
  { id: "evaluare-pret", label: "Evaluare apartament Timișoara — preț corect" },
  { id: "randament-chirie", label: "Randament chirie Timișoara — clasic vs hotelier" },
  { id: "analiza-cartiere", label: "Analiza cartierelor din Timișoara" },
  { id: "ghiduri-proprietari", label: "Ghiduri pentru proprietari și investitori" },
];

const BlogPillarHub = () => {
  return (
    <section className="mb-12 space-y-10" aria-label="Ghid imobiliar Timișoara — hub conținut">
      {/* Table of Contents */}
      <nav
        aria-label="Cuprins ghid imobiliar"
        className="rounded-2xl border border-border bg-card/60 p-5 md:p-6"
      >
        <h2 className="text-lg font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
          <LineChart className="w-5 h-5 text-primary" />
          Cuprins — Ghid imobiliar Timișoara
        </h2>
        <ol className="grid gap-2 sm:grid-cols-2 text-sm">
          {tocItems.map((item, idx) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="text-primary hover:underline underline-offset-4"
              >
                {idx + 1}. {item.label}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* Section 1 — Piața imobiliară evoluție */}
      <article id="piata-evolutie" className="scroll-mt-24">
        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Evoluția pieței imobiliare Timișoara (2020–2026)
        </h2>
        <p className="text-muted-foreground mb-4">
          <strong>Piața imobiliară Timișoara</strong> a parcurs o <strong>evoluție</strong> remarcabilă în
          ultimii ani: prețurile medii pe metru pătrat au crescut cu 35–50% între 2020 și 2026,
          susținute de expansiunea hub-urilor industriale (Continental, Hella, Flex), dezvoltarea
          ansamblurilor moderne (ISHO, Openville, Atria Urban Resort) și cererea constantă pentru
          regim hotelier post-pandemic.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-base font-semibold text-foreground mb-1">Centru &amp; ISHO</h3>
            <p className="text-sm text-muted-foreground">
              2.300–2.600 €/mp, apreciere 8–10% anual.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-base font-semibold text-foreground mb-1">Dumbrăvița &amp; Giroc</h3>
            <p className="text-sm text-muted-foreground">
              1.800–2.100 €/mp, cerere ridicată din zona metropolitană.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-base font-semibold text-foreground mb-1">Mehala &amp; Ronaț</h3>
            <p className="text-sm text-muted-foreground">
              1.300–1.500 €/mp, cele mai accesibile prețuri de intrare.
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Vezi indicatorii live pe pagina{" "}
          <Link to="/piata-imobiliara-timisoara" className="text-primary hover:underline">
            Piața imobiliară Timișoara
          </Link>{" "}
          sau analiza completă în{" "}
          <Link to="/blog/ghid-investitii-imobiliare-timisoara-2026" className="text-primary hover:underline">
            Ghidul Investițiilor Imobiliare 2026
          </Link>
          .
        </p>
      </article>

      {/* Section 2 — Evaluare apartament preț */}
      <article id="evaluare-pret" className="scroll-mt-24">
        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          Evaluare apartament Timișoara — care este prețul corect?
        </h2>
        <p className="text-muted-foreground mb-4">
          <strong>Evaluarea unui apartament în Timișoara</strong> și stabilirea unui{" "}
          <strong>preț</strong> corect de vânzare sau cumpărare necesită analiza a 4 factori
          principali: zona, tipul de comfort, anul construcției și etajul. Folosim un model hibrid
          care combină prețul mediu pe mp din zonă cu ajustări pentru finisaje, vedere, dotări și
          potențialul de regim hotelier.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-base font-semibold text-foreground mb-1">Metoda comparativă</h3>
            <p className="text-sm text-muted-foreground">
              Analizăm 5–10 anunțuri active în raza de 500 m, ajustate pentru suprafață utilă,
              etaj și finisaje. Util pentru stabilirea unui preț de listare realist.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-base font-semibold text-foreground mb-1">Metoda capitalizării</h3>
            <p className="text-sm text-muted-foreground">
              Calculăm valoarea pornind de la chiria potențială (clasică sau regim hotelier),
              împărțită la rata de capitalizare a zonei (4–9%).
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Pentru o evaluare gratuită, completează formularul de pe pagina{" "}
          <Link to="/evaluare-gratuita" className="text-primary hover:underline">
            Evaluare gratuită apartament Timișoara
          </Link>
          .
        </p>
      </article>

      {/* Section 3 — Randament chirie */}
      <article id="randament-chirie" className="scroll-mt-24">
        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
          <Calculator className="w-6 h-6 text-primary" />
          Randament chirie Timișoara — clasic vs regim hotelier
        </h2>
        <p className="text-muted-foreground mb-4">
          <strong>Randamentul chiriei în Timișoara</strong> diferă semnificativ în funcție de
          modelul ales. <strong>Chiria clasică</strong> (lunară, contract pe termen lung) oferă un
          randament brut de 4–6% anual și implică risc redus, dar venit limitat.{" "}
          <strong>Regimul hotelier</strong> administrat profesional generează 9.4% net verificat,
          cu un multiplicator de 1.6–2.5x față de chiria clasică.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3 font-semibold text-foreground">Model</th>
                <th className="p-3 font-semibold text-foreground">Randament brut</th>
                <th className="p-3 font-semibold text-foreground">Randament net</th>
                <th className="p-3 font-semibold text-foreground">Risc</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3 text-muted-foreground">Chirie clasică</td>
                <td className="p-3 text-muted-foreground">5–7%</td>
                <td className="p-3 text-muted-foreground">4–6%</td>
                <td className="p-3 text-muted-foreground">Scăzut</td>
              </tr>
              <tr>
                <td className="p-3 text-muted-foreground">Regim hotelier (auto-administrat)</td>
                <td className="p-3 text-muted-foreground">10–14%</td>
                <td className="p-3 text-muted-foreground">6–8%</td>
                <td className="p-3 text-muted-foreground">Mediu / mare timp investit</td>
              </tr>
              <tr>
                <td className="p-3 text-foreground font-medium">Regim hotelier RealTrust</td>
                <td className="p-3 text-foreground font-medium">12–16%</td>
                <td className="p-3 text-primary font-semibold">9.4% verificat</td>
                <td className="p-3 text-muted-foreground">Scăzut (full-service)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Calculează propriul randament cu{" "}
          <Link to="/calculator-roi" className="text-primary hover:underline">
            Calculatorul ROI
          </Link>{" "}
          sau citește{" "}
          <Link to="/blog/ghid-investitii-imobiliare-timisoara-2026" className="text-primary hover:underline">
            ghidul complet de investiții 2026
          </Link>
          .
        </p>
      </article>

      {/* Section 4 — Analiza cartierelor (umbrella H2 for the 55 flat H2s) */}
      <article id="analiza-cartiere" className="scroll-mt-24">
        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          Analiza cartierelor din Timișoara
        </h2>
        <p className="text-muted-foreground mb-4">
          Fiecare cartier are propriul profil de investiție. Mai jos găsești sub-pagini dedicate
          pentru cele mai active zone, fiecare cu prețuri actualizate, randamente estimate și
          listări active.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {[
            { slug: "centru", name: "Apartamente Centru" },
            { slug: "iosefin", name: "Apartamente Iosefin" },
            { slug: "fabric", name: "Apartamente Fabric" },
            { slug: "elisabetin", name: "Apartamente Elisabetin" },
            { slug: "complex-studentesc", name: "Complex Studențesc" },
            { slug: "dumbravita", name: "Dumbrăvița" },
            { slug: "giroc", name: "Giroc" },
            { slug: "aradului", name: "Calea Aradului" },
            { slug: "lipovei", name: "Lipovei" },
          ].map((c) => (
            <li key={c.slug}>
              <Link
                to={`/imobiliare-timisoara/${c.slug}`}
                className="block rounded-lg border border-border bg-background px-3 py-2 hover:border-primary/40 hover:text-primary transition-colors"
              >
                <h3 className="text-sm font-medium inline">{c.name}</h3>
              </Link>
            </li>
          ))}
        </ul>
      </article>

      {/* Section 5 — Ghiduri proprietari */}
      <article id="ghiduri-proprietari" className="scroll-mt-24">
        <h2 className="text-2xl md:text-3xl font-serif font-semibold text-foreground mb-3 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary" />
          Ghiduri pentru proprietari și investitori
        </h2>
        <p className="text-muted-foreground mb-4">
          Resurse practice pentru deciziile zilnice: fiscalitate, prețuri dinamice, marketing
          listări și gestionarea oaspeților.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/pentru-proprietari"
            className="rounded-xl border border-border bg-background p-4 hover:border-primary/40 transition-colors"
          >
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Home className="w-4 h-4 text-primary" /> Servicii pentru proprietari
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Administrare full-service, comision 2%, randament 9.4% net.
            </p>
          </Link>
          <Link
            to="/catalog-investitii"
            className="rounded-xl border border-border bg-background p-4 hover:border-primary/40 transition-colors"
          >
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Catalog investiții 2026
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Proprietăți pre-evaluate cu ROI și capital necesar.
            </p>
          </Link>
        </div>
      </article>
    </section>
  );
};

export default BlogPillarHub;
