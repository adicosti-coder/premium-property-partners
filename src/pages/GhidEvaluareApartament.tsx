import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Info, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import ContextualLinks from "@/components/seo/ContextualLinks";
import GeoAnswers from "@/components/seo/GeoAnswers";
import DataProvenance from "@/components/seo/DataProvenance";
import { Button } from "@/components/ui/button";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const BASE_URL = "https://realtrust.ro";
const URL = `${BASE_URL}/ghid-evaluare-apartament-timisoara`;

interface Criterion {
  name: string;
  body: string;
}

/**
 * Step-by-step valuation guide for a Timișoara apartment.
 *
 * Every criterion describes HOW it moves value, without inventing percentages,
 * market statistics or transaction data. The only figures repeated here are the
 * published RealTrust assumptions (75% occupancy, 27% operational deduction,
 * 9.4% net reference yield).
 */
const CRITERIA: Criterion[] = [
  {
    name: "Suprafața utilă",
    body: "Punctul de plecare al oricărei evaluări. Se compară suprafața utilă din cartea funciară, nu cea din anunț, iar suprafețele construite (inclusiv pereți) nu se amestecă cu cele utile. Apartamentele mici au de regulă un preț pe metru pătrat mai mare, dar un preț total mai accesibil — de aceea garsonierele se închiriază și se revând mai repede.",
  },
  {
    name: "Etajul",
    body: "Etajele intermediare sunt cele mai căutate. Parterul pierde valoare din cauza intimității și siguranței, dar câștigă dacă are grădină sau posibilitate de spațiu comercial. Ultimul etaj depinde de starea acoperișului și de existența unei terase. La blocurile fără lift, orice etaj peste 3 reduce sensibil cererea.",
  },
  {
    name: "Anul construcției și structura",
    body: "Determină costurile viitoare: imobilele interbelice din Cetate, Iosefin sau Elisabetin au suprafețe generoase, dar cer verificarea structurii, șarpantei și instalațiilor. Blocurile din anii '70–'80 se evaluează în funcție de reabilitarea termică și de înlocuirea coloanelor. Clădirile ridicate în ultimii ani au costuri previzibile, dar preț de intrare mai mare.",
  },
  {
    name: "Poziționarea în oraș",
    body: "Distanța până la o stație de transport, până la un campus, până la Iulius Town sau până la centrul istoric contează adesea mai mult decât finisajele. Compară adrese, nu cartiere: în aceeași zonă, două străzi pot avea profiluri de cerere diferite.",
  },
  {
    name: "Compartimentarea",
    body: "Decomandat rămâne cel mai ușor de vândut și de închiriat pe termen lung. Open-space cu bucătărie deschisă funcționează foarte bine pentru cazare pe termen scurt și pentru chiriași tineri, dar reduce interesul familiilor. Camerele de trecere și băile fără fereastră scad valoarea.",
  },
  {
    name: "Parcarea",
    body: "În zonele centrale și în ansamblurile noi, locul de parcare este un activ separat, cu preț propriu. Verifică dacă este inclus în act, dacă este subteran sau la suprafață și dacă este atribuit nominal. Absența parcării limitează cererea, mai ales pentru oaspeții de business.",
  },
  {
    name: "Balcon, terasă, grădină",
    body: "Un balcon utilizabil (nu doar tehnic) adaugă valoare reală, iar terasele și grădinile la parter sunt diferențiatori puternici. Contează dacă spațiul este intabulat și dacă închiderea balconului a fost făcută legal și uniform cu restul imobilului.",
  },
  {
    name: "Vederea și orientarea",
    body: "Orientarea sud/sud-est aduce lumină și costuri mai mici de încălzire; vederea spre o arteră aglomerată aduce zgomot. Se verifică pe teren, la ore diferite, nu din fotografii.",
  },
  {
    name: "Finisajele și dotările",
    body: "Se evaluează pe stare și pe vârstă, nu pe descriere. Instalațiile electrice și sanitare înlocuite, tâmplăria performantă, centrala proprie și o bucătărie funcțională contează mai mult decât un mobilier scump. Pentru regim hotelier, standardul de amenajare influențează direct tariful realizabil pe noapte.",
  },
  {
    name: "Eficiența energetică",
    body: "Certificatul energetic este obligatoriu la tranzacție și oferă o primă imagine, dar verificarea practică este mai utilă: izolație, tâmplărie, tip de încălzire, expunere. Diferența se vede lunar, în factură, și se transferă în chiria pe care un chiriaș informat este dispus să plătească.",
  },
  {
    name: "Costurile de întreținere",
    body: "Cere factura de întreținere pentru o lună de iarnă și situația restanțelor asociației. Un apartament ieftin într-un bloc cu datorii, coloane vechi și fond de reparații gol nu este o afacere. În ansamblurile noi, verifică taxele pentru spațiile comune și pentru parcarea subterană.",
  },
  {
    name: "Comparabilele",
    body: "Se compară proprietăți similare din același perimetru: aceeași zonă, suprafață apropiată, etaj comparabil, stare similară. Anunțurile arată prețul cerut, nu prețul de tranzacționare — de aceea comparabilele trebuie corectate cu marja de negociere observată în zonă.",
  },
  {
    name: "Cererea",
    body: "Câți chiriași sau cumpărători caută efectiv acest tip de apartament în această zonă? O garsonieră lângă un campus și o garsonieră într-un cartier de familii au același metraj și piețe complet diferite.",
  },
  {
    name: "Venitul potențial",
    body: "Pentru un apartament de investiție, evaluarea nu se opreşte la preț: estimăm chiria clasică realizabilă și, separat, venitul din regim hotelier. La regim hotelier folosim ipoteze publice — ocupare medie 75% și o deducere operațională de aproximativ 27% (comisioane platforme, impozit efectiv, consumabile) — la care se adaugă utilitățile fixe și comisionul de administrare.",
  },
  {
    name: "Randamentul investițional",
    body: "Raportul dintre venitul net anual și capitalul total investit (preț de achiziție + renovare + mobilare + taxe de tranzacție). Pragul nostru de referință este 9,4% net pe an; îl folosim ca test, nu ca promisiune. Dacă un apartament nu îl atinge, spunem asta înainte de achiziție.",
  },
];

const GhidEvaluareApartament = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "Cum se evaluează un apartament în Timișoara",
      description:
        "Pașii de evaluare a unui apartament din Timișoara: suprafață, etaj, an de construcție, poziționare, compartimentare, parcare, finisaje, eficiență energetică, comparabile, cerere, venit potențial și randament investițional.",
      url: URL,
      inLanguage: "ro-RO",
      step: CRITERIA.map((c, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: c.name,
        text: c.body,
        url: `${URL}#${encodeURIComponent(c.name.toLowerCase().replace(/\s+/g, "-"))}`,
      })),
    },
    // FAQPage structured data for this page comes from the visible
    // <GeoAnswers group="evaluare" /> block via the central FAQSchemaProvider.
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Cum se evaluează un apartament în Timișoara — ghid pas cu pas | RealTrust"
        description="Ghid de evaluare pentru apartamentele din Timișoara: suprafață, etaj, an de construcție, compartimentare, parcare, finisaje, comparabile, venit potențial și randament net."
        url={URL}
        breadcrumbItems={[
          { name: "Acasă", url: BASE_URL },
          { name: "Servicii imobiliare", url: `${BASE_URL}/servicii-imobiliare` },
          { name: "Ghid de evaluare apartament", url: URL },
        ]}
        jsonLd={jsonLd}
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <PageBreadcrumb
            items={[
              { label: "Servicii imobiliare", href: "/servicii-imobiliare" },
              { label: "Ghid de evaluare apartament" },
            ]}
          />

          <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            Cum se evaluează un apartament în Timișoara
          </h1>

          <section
            className="ai-quote my-6 rounded-xl border-l-4 border-accent bg-muted/40 p-5"
            aria-label="Cum se evaluează un apartament în Timișoara?"
          >
            <p className="text-sm md:text-base leading-relaxed text-foreground/90">
              Evaluarea unui apartament din Timișoara începe de la suprafața utilă din cartea
              funciară, etaj, anul construcției și poziționarea exactă, apoi se corectează cu
              compartimentarea, parcarea, balconul, finisajele, eficiența energetică și costurile de
              întreținere. Urmează comparabilele din același perimetru, ajustate cu marja de
              negociere. Pentru un apartament de investiție se estimează separat chiria clasică și
              venitul din regim hotelier, pentru a obține randamentul net raportat la capitalul total
              investit.
            </p>
          </section>

          <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-8">
            Ghidul de mai jos este ordinea în care ne uităm la un apartament înainte să dăm o
            estimare, indiferent dacă proprietarul vrea să vândă, să închirieze pe termen lung sau să
            treacă apartamentul în regim hotelier. Nu conține prețuri de piață pe zonă: acelea se
            schimbă și le tratăm separat, pe paginile de cartier și în comparația între zone.
          </p>

          <section className="mb-10">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              Cei 15 factori pe care îi cântărim, în ordine
            </h2>
            <ol className="space-y-5">
              {CRITERIA.map((c, i) => (
                <li
                  key={c.name}
                  id={c.name.toLowerCase().replace(/\s+/g, "-")}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    {i + 1}. {c.name}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              Valoare de piață, preț cerut, preț de tranzacționare și valoare investițională
            </h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold text-foreground mb-1">Prețul cerut</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Suma din anunț. Reflectă așteptarea vânzătorului și, uneori, o marjă pregătită
                  pentru negociere. Nu este o măsură a valorii.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Prețul de tranzacționare
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Suma plătită efectiv la semnarea contractului. Este singurul preț confirmat, dar nu
                  este public — de aceea comparabilele din anunțuri trebuie corectate.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold text-foreground mb-1">Valoarea de piață</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Estimarea sumei la care proprietatea s-ar vinde între un cumpărător și un vânzător
                  informați, fără presiune, într-un interval rezonabil de expunere. Este o estimare,
                  nu o certitudine, și se schimbă odată cu piața.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Valoarea investițională
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Cât valorează proprietatea pentru un investitor anume, în funcție de venitul pe
                  care o poate produce și de strategia lui. Un apartament poate avea valoare
                  investițională mai mare decât valoarea de piață pentru cine îl poate opera în regim
                  hotelier și mai mică pentru cine îl ține închiriat clasic.
                </p>
              </div>
            </div>
          </section>

          <aside className="rounded-xl border border-border bg-secondary/40 p-5 mb-10 flex gap-3">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Limitele acestui ghid.</strong> Este metodologia
              noastră de lucru, nu un raport de evaluare autorizat ANEVAR. Pentru credit ipotecar,
              partaj sau litigiu ai nevoie de un evaluator autorizat. Cifrele de randament folosite
              aici sunt ipotezele noastre publice (ocupare 75%, deducere operațională 27%, randament
              net de referință 9,4%), nu rezultate garantate.
            </p>
          </aside>

          <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8 text-center mb-10">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Vrei estimarea pentru apartamentul tău?
            </h2>
            <p className="text-sm text-muted-foreground mb-4 max-w-2xl mx-auto">
              Aplicăm pașii din acest ghid pe adresa ta și îți trimitem o estimare de preț plus
              venitul lunar realizabil în chirie clasică și în regim hotelier.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild>
                <Link to="/evaluare-gratuita">
                  Cere o evaluare gratuită
                  <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/calculator-roi">Simulează randamentul net</Link>
              </Button>
            </div>
          </section>

          <GeoAnswers
            group="evaluare"
            title="Răspunsuri directe despre evaluarea unui apartament"
            intro="Cele mai frecvente întrebări despre valoare, preț și €/mp, cu răspuns scurt și trimitere la explicația completă."
          />

          <DataProvenance
            className="mb-10"
            external={[
              "Comparabilele provin din anunțurile publice și din tranzacțiile pe care le intermediem; prețurile de tranzacționare nu sunt publice în România.",
              "Certificatul energetic și suprafața utilă se preiau din documentele proprietății (carte funciară, certificat energetic).",
            ]}
            assumptions={[
              "Ocupare 75% și deducere operațională de aproximativ 27% pentru estimarea venitului în regim hotelier.",
              "Randament net de referință 9,4% pe an, folosit ca test de decizie, nu ca promisiune.",
            ]}
            calculations={[
              "Randament net = venit net anual / capital total investit (preț + taxe + renovare + mobilare) × 100.",
              "Estimările de valoare sunt comerciale; nu înlocuiesc un raport de evaluare autorizat ANEVAR.",
            ]}
            verifiedOn="5 septembrie 2026"
          />

          <ContextualLinks
            title="Pași următori"
            intro="Zone, randament și servicii legate direct de evaluarea unui apartament."
            layout="list"
            links={[
              {
                href: "/zone-investitii-timisoara",
                label: "compararea zonelor din Timișoara pentru investiții",
                description: "Preț, chirie, cerere, lichiditate și risc, zonă cu zonă.",
              },
              {
                href: "/evaluare-gratuita",
                label: "evaluare gratuită a proprietății",
                description: "Estimare de preț și de venit lunar, fără costuri.",
              },
              {
                href: "/servicii-imobiliare",
                label: "servicii imobiliare complete în Timișoara",
                description: "Vânzare, achiziție, închiriere și consultanță.",
              },
              {
                href: "/pentru-proprietari",
                label: "administrarea apartamentului în regim hotelier",
                description: "Ce se întâmplă operațional după achiziție.",
              },
              {
                href: "/cartiere",
                label: "ghidul cartierelor din Timișoara",
                description: "Profilul fiecărei zone și indicele intern de preț.",
              },
            ]}
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

export default GhidEvaluareApartament;
