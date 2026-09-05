import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Mail, Linkedin, MapPin, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import ContextualLinks from "@/components/seo/ContextualLinks";
import ceoImageAsset from "@/assets/adrian-costi-founder.png.asset.json";
import { BRAND } from "@/lib/orgIdentity";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const BASE_URL = "https://realtrust.ro";
const URL = `${BASE_URL}/autor/adrian-costi`;
const LINKEDIN = "https://www.linkedin.com/in/costi-adrian-2b50931a";
const AUTHOR_EMAIL = "adrian@realtrust.ro";

/**
 * Editorial author profile — the single identity behind the RealTrust content.
 *
 * STRICT RULE: this page may only restate facts already published elsewhere on
 * the site (founder & CEO role, 25+ years in Timișoara real estate, the 15
 * managed apartments, the services and the published yield assumptions).
 * No diplomas, certifications, awards or client counts may be added here
 * without written confirmation from Adrian Costi.
 */
const AutorAdrianCosti = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: URL,
      inLanguage: "ro-RO",
      mainEntity: {
        "@type": "Person",
        "@id": `${BASE_URL}/despre-noi#adrian-costi`,
        name: "Adrian Costi",
        jobTitle: "Fondator & CEO RealTrust",
        url: URL,
        image: ceoImageAsset.url,
        email: `mailto:${AUTHOR_EMAIL}`,
        sameAs: [LINKEDIN],
        knowsAbout: [
          "Investiții imobiliare Timișoara",
          "Administrare apartamente în regim hotelier",
          "Property management",
          "Evaluare apartamente",
          "Randament investițional imobiliar",
        ],
        worksFor: {
          "@type": "Organization",
          name: BRAND.name,
          legalName: BRAND.legalName,
          url: BASE_URL,
        },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Timișoara",
          addressRegion: "Timiș",
          addressCountry: "RO",
        },
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Adrian Costi — Fondator RealTrust Timișoara | Autor articole imobiliare"
        description="Adrian Costi, fondator și CEO RealTrust Timișoara, cu peste 25 de ani în tranzacții și administrare de proprietăți. Autorul ghidurilor despre investiții, regim hotelier și evaluare."
        url={URL}
        breadcrumbItems={[
          { name: "Acasă", url: BASE_URL },
          { name: "Despre noi", url: `${BASE_URL}/despre-noi` },
          { name: "Adrian Costi", url: URL },
        ]}
        jsonLd={jsonLd}
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          <PageBreadcrumb
            items={[{ label: "Despre noi", href: "/despre-noi" }, { label: "Adrian Costi" }]}
          />

          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start mb-8">
            <img
              src={ceoImageAsset.url}
              alt="Adrian Costi, fondator și CEO RealTrust Timișoara"
              width={160}
              height={160}
              loading="eager"
              className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border border-border"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-2">
                Adrian Costi
              </h1>
              <p className="text-base text-primary font-medium mb-3">
                Fondator &amp; CEO RealTrust · {BRAND.legalName}
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" aria-hidden="true" /> Timișoara, Timiș
                </span>
                <a
                  href={`mailto:${AUTHOR_EMAIL}`}
                  className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Mail className="w-4 h-4" aria-hidden="true" /> {AUTHOR_EMAIL}
                </a>
                <a
                  href={LINKEDIN}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
                  aria-label="Profilul de LinkedIn al lui Adrian Costi"
                >
                  <Linkedin className="w-4 h-4" aria-hidden="true" /> LinkedIn
                </a>
              </div>
            </div>
          </div>

          <section
            className="ai-quote my-6 rounded-xl border-l-4 border-accent bg-muted/40 p-5"
            aria-label="Cine scrie conținutul RealTrust?"
          >
            <p className="text-sm md:text-base leading-relaxed text-foreground/90">
              Adrian Costi este fondatorul și CEO-ul RealTrust ({BRAND.legalName}), companie
              imobiliară din Timișoara. Are peste 25 de ani de activitate în tranzacții și
              administrare de proprietăți în Timișoara și vestul României și coordonează direct
              administrarea celor 15 apartamente din portofoliul RealTrust, operate în regim hotelier
              sub brandul ApArt Hotel. Este identitatea editorială din spatele ghidurilor și
              analizelor publicate pe realtrust.ro.
            </p>
          </section>

          <section className="mb-10 max-w-3xl">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-3">
              Experiență relevantă
            </h2>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-3">
              Peste 25 de ani în tranzacții și administrare de proprietăți în Timișoara. A fondat
              RealTrust și brandul de cazare ApArt Hotel pentru a oferi proprietarilor un model
              complet: de la închiriere clasică pe termen lung până la operare în regim hotelier la
              standard de boutique hotel.
            </p>
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              Filosofia declarată de lucru este un portofoliu restrâns și atent operat, în locul
              administrării superficiale a unui număr mare de unități — motivul pentru care
              portofoliul administrat este de 15 apartamente, fiecare cu implicare directă în
              amenajare, pricing și relația cu oaspeții.
            </p>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              Domenii de expertiză
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {[
                {
                  title: "Investiții imobiliare în Timișoara",
                  body: "Selecția zonelor și a tipurilor de apartamente în funcție de strategia proprietarului.",
                },
                {
                  title: "Administrare în regim hotelier",
                  body: "Listare multi-channel, pricing dinamic, operare zilnică și raportare pentru proprietari.",
                },
                {
                  title: "Evaluare de proprietăți",
                  body: "Estimarea prețului și a venitului realizabil, cu ipoteze explicite.",
                },
                {
                  title: "Analiza randamentului",
                  body: "Comparație între chirie clasică și regim hotelier, la ocupare 75% și deducere operațională 27%.",
                },
              ].map((e) => (
                <li key={e.title} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="text-base font-semibold text-foreground mb-1">{e.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{e.body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-2xl font-serif font-semibold text-foreground mb-4">
              Conținut publicat
            </h2>
            <ul className="space-y-2">
              {[
                { to: "/blog", label: "toate articolele și ghidurile RealTrust" },
                {
                  to: "/zone-investitii-timisoara",
                  label: "comparația zonelor din Timișoara pentru investiții",
                },
                {
                  to: "/ghid-evaluare-apartament-timisoara",
                  label: "ghidul de evaluare a unui apartament în Timișoara",
                },
                {
                  to: "/blog/categorie/investitii-imobiliare",
                  label: "analize despre investițiile imobiliare locale",
                },
                {
                  to: "/blog/categorie/sfaturi-proprietari",
                  label: "ghiduri practice pentru proprietari și gazde",
                },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <ContextualLinks
            title="Despre companie"
            layout="list"
            links={[
              {
                href: "/despre-noi",
                label: "povestea și echipa RealTrust",
                description: "Entitatea juridică, valorile și modul de lucru.",
              },
              {
                href: "/pentru-proprietari",
                label: "administrarea apartamentului în regim hotelier",
                description: "Ce include serviciul, pas cu pas.",
              },
              {
                href: "/contact",
                label: "date de contact și adresa sediului",
                description: "Telefon, e-mail, program și locație în Timișoara.",
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

export default AutorAdrianCosti;
