import { Link } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { MapPin, Users, Building2, ListChecks, LineChart, FileText } from "lucide-react";

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
        { icon: MapPin, title: "Local experience", text: "The team operates only in Timișoara and its metropolitan area, so pricing and demand are assessed on local data." },
        { icon: Users, title: "Dedicated team", text: "One consultant per client, plus operations staff for check-in, cleaning and maintenance." },
        { icon: Building2, title: "Portfolio", text: "14 apartments and houses currently managed under the ApArt Hotel brand." },
        { icon: ListChecks, title: "Documented process", text: "Onboarding in 7-14 days: valuation, photography, listing on Booking and Airbnb, check-in setup." },
        { icon: LineChart, title: "Reported results", text: "Consolidated guest reputation score of 9.7/10 on Booking; owner yield reported as a 9.4% net average scenario." },
        { icon: FileText, title: "Transparency", text: "Commissions stated up front (15-25% management plus platform fees) and monthly written reporting." },
      ]
    : [
        { icon: MapPin, title: "Experiență locală", text: "Echipa lucrează exclusiv în Timișoara și zona metropolitană, deci prețurile și cererea sunt evaluate pe date locale." },
        { icon: Users, title: "Echipă dedicată", text: "Un consultant alocat fiecărui client, plus personal de operațiuni pentru check-in, curățenie și mentenanță." },
        { icon: Building2, title: "Portofoliu", text: "14 apartamente și case administrate în prezent sub brandul ApArt Hotel." },
        { icon: ListChecks, title: "Proces documentat", text: "Onboarding în 7-14 zile: evaluare, fotografie, listare pe Booking și Airbnb, configurare check-in." },
        { icon: LineChart, title: "Rezultate raportate", text: "Scor consolidat de reputație 9,7/10 pe Booking; randamentul pentru proprietari este raportat ca scenariu mediu de 9,4% net." },
        { icon: FileText, title: "Transparență", text: "Comisioane comunicate în avans (15-25% administrare plus comisioanele platformelor) și raportare lunară scrisă." },
      ];

  return (
    <div className="container mx-auto px-6 py-16 space-y-16">
      {/* GEO: self-contained answer block */}
      <section className="ai-quote rounded-xl border-l-4 border-accent bg-muted/40 p-6">
        <h2 className="text-xl font-serif font-semibold text-foreground">
          {isEn ? "What is RealTrust?" : "Ce este RealTrust?"}
        </h2>
        <p className="mt-3 max-w-3xl text-sm md:text-base leading-relaxed text-foreground/90">
          {isEn
            ? "RealTrust is a real estate and property management company operating in Timișoara, Romania, run by the legal entity SC Imo Business Centrum SRL (CUI RO14380627). It brokers apartment and house sales and long-term rentals, advises investors on buying rental property, and manages short-stay apartments under its own accommodation brand, ApArt Hotel. Its clients are property owners, investors and buyers in Timișoara and the surrounding metropolitan area. Work is done under written contracts, with commissions stated in advance and monthly financial reporting. Contact: +40 799 069 256, info@realtrust.ro."
            : "RealTrust este o companie de servicii imobiliare și property management care operează în Timișoara, România, prin entitatea juridică SC Imo Business Centrum SRL (CUI RO14380627). Intermediază vânzări de apartamente și case și închirieri pe termen lung, consiliază investitorii la achiziția de proprietăți pentru randament și administrează apartamente în regim hotelier sub propriul brand de cazare, ApArt Hotel. Clienții sunt proprietari, investitori și cumpărători din Timișoara și zona metropolitană. Colaborarea se face pe bază de contract scris, cu comisioane comunicate în avans și raportare financiară lunară. Contact: +40 799 069 256, info@realtrust.ro."}
        </p>
      </section>

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
