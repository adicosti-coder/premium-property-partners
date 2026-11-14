import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { MapPin, Users, Building2, ListChecks, LineChart, FileText } from "lucide-react";
import EntityDefinitionBlock from "@/components/EntityDefinitionBlock";
import { GUEST_SCORE_EN, GUEST_SCORE_RO } from "@/lib/businessFacts";


/**
 * Homepage authority blocks:
 *  1. "Ce este RealTrust?" — self-contained, AI-extractable answer (GEO).
 *  2. "De ce RealTrust?" — evidence-based reasons (no invented stats or
 *     certifications; figures are labelled as reported averages/scenarios).
 * Plus contextual internal links to the canonical pillar pages.
 */
const HomeAuthorityBlocks = () => {
  const { language } = useLanguage();
  const isEn = language === "en";

  const reasons = isEn
    ? [
        { icon: MapPin, title: "Uninterrupted local experience", text: "Through SC Imo Business Centrum SRL, we have been active without interruption on the Timișoara real estate market since 2001. We know the active partner developments first-hand — City of Mara, Monarch, NordOne, XCity and the Torontalului area — so prices and demand are assessed on local data." },
        { icon: Building2, title: "360° approach", text: "One partner for the whole life of your property: real estate brokerage, advice for safe investments, long-term property management and short-stay (hotel-regime) management under the ApArt Hotel brand." },
        { icon: LineChart, title: "Dynamic pricing, adjusted daily", text: "Pricing algorithms adjusted every day to events and demand in Timișoara, plus automatic synchronisation across booking channels — your nightly rate stays up to date with no manual work." },
        { icon: Users, title: "Dedicated team", text: "One consultant per client, plus operations staff for check-in, cleaning and maintenance, for the 15 apartments and houses currently managed under the ApArt Hotel brand." },
        { icon: ListChecks, title: "Documented, transparent process", text: "Onboarding in 7-14 days: valuation, photography, listing on Booking and Airbnb, check-in setup. Commissions stated up front (15–20% management plus platform fees) and monthly written reporting." },
        { icon: FileText, title: "Reported results", text: `Consolidated guest reputation score of ${GUEST_SCORE_EN}/10 on Booking; portfolio properties attract an estimated net yield between 6.5% and 9.4% per year, depending on occupancy, location and furnishing.` },
      ]
    : [
        { icon: MapPin, title: "Experiență locală neîntreruptă", text: "Prin SC Imo Business Centrum SRL, suntem prezenți neîntrerupt pe piața imobiliară din Timișoara din 2001. Cunoaștem direct ansamblurile partenere active — City of Mara, Monarch, NordOne, XCity și zona Torontalului — deci prețurile și cererea sunt evaluate pe date locale." },
        { icon: Building2, title: "Abordare 360°", text: "Un singur partener pentru toată viața proprietății: intermediere imobiliară, consultanță pentru investiții sigure, property management pe termen lung și regim hotelier sub brandul ApArt Hotel." },
        { icon: LineChart, title: "Tarifare dinamică, ajustată zilnic", text: "Algoritmi de tarifare dinamică adaptați zilnic la evenimentele și cererea din Timișoara + sincronizare automată pe canale — tariful pe noapte rămâne actual, fără intervenție manuală." },
        { icon: Users, title: "Echipă dedicată", text: "Un consultant alocat fiecărui client, plus personal de operațiuni pentru check-in, curățenie și mentenanță, pentru cele 15 apartamente și case administrate în prezent sub brandul ApArt Hotel." },
        { icon: ListChecks, title: "Proces documentat și transparent", text: "Onboarding în 7-14 zile: evaluare, fotografie, listare pe Booking și Airbnb, configurare check-in. Comisioane comunicate în avans (comision de administrare 15–20% din venitul net plus comisioanele platformelor) și raportare lunară scrisă." },
        { icon: FileText, title: "Rezultate raportate", text: `Scor consolidat de reputație ${GUEST_SCORE_RO}/10 pe Booking; proprietățile din portofoliu atrag un randament net estimat între 6,5% și 9,4% pe an, în funcție de ocupare, locație și amenajare.` },
      ];

  return (
    <div className="container mx-auto px-6 py-16 space-y-16">
      {/* GEO: canonical entity answer, shared with /despre-noi, /contact and
          /pentru-proprietari via src/lib/entityDefinition.ts */}
      <EntityDefinitionBlock pagePath="/" />


      {/* Evidence-based reasons */}
      <section aria-labelledby="de-ce-realtrust">
        <h2 id="de-ce-realtrust" className="text-2xl md:text-3xl font-serif font-semibold text-foreground">
          {isEn ? "Why RealTrust?" : "De ce RealTrust?"}
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r) => {
            const Icon = r.icon;
            return (
              <article key={r.title} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-semibold text-foreground">{r.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
              </article>
            );
          })}
        </div>

        <p className="mt-8 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {isEn ? "Read more about " : "Află mai mult despre "}
          <Link to="/preturi" className="underline decoration-primary/40 hover:text-primary">
            {isEn ? "our fees" : "comisioanele noastre"}
          </Link>
          {isEn ? ", the " : ", despre "}
          <Link to="/despre-noi" className="underline decoration-primary/40 hover:text-primary">
            {isEn ? "team behind RealTrust" : "echipa din spatele RealTrust"}
          </Link>
          {isEn ? ", the apartments available for " : ", apartamentele disponibile pentru "}
          <Link to="/cazare" className="underline decoration-primary/40 hover:text-primary">
            {isEn ? "short stays" : "cazare"}
          </Link>
          {isEn ? ", or get in touch " : ", sau scrie-ne direct pe pagina de "}
          <Link to="/contact" className="underline decoration-primary/40 hover:text-primary">
            {isEn ? "directly" : "contact"}
          </Link>
          .
        </p>
      </section>
    </div>
  );
};

export default HomeAuthorityBlocks;
