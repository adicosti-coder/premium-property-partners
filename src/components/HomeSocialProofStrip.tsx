import { Award, Star, ShieldCheck } from "lucide-react";
import { realEstateSinceLabel } from "@/lib/businessFacts";
import { useLanguage } from "@/i18n/LanguageContext";

/** Three compact proof points (experience, guest rating, trial period) under the homepage hero. Static, no data fetching. */
const HomeSocialProofStrip = () => {
  const { language } = useLanguage();
  const ro = language !== "en";
  const items = [
    { Icon: Award, title: realEstateSinceLabel(language), text: ro ? "Tradiție și consiliere imobiliară de încredere în Timișoara." : "Trusted real estate tradition and advice in Timișoara." },
    { Icon: Star, title: "9,7/10 Booking · 4,9/5 Airbnb", text: ro ? "Evaluarea oaspeților noștri." : "Our guests' rating." },
    { Icon: ShieldCheck, title: ro ? "90 de zile perioadă de probă" : "90-day trial period", text: ro ? "Testează serviciul fără obligații pe termen lung." : "Try the service without a long-term commitment." },
  ];
  return (
    <section aria-label={ro ? "De ce RealTrust" : "Why RealTrust"} className="border-b border-border bg-background">
      <ul className="container mx-auto grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-3 sm:gap-4 md:py-5">
        {items.map(({ Icon, title, text }) => (
          <li key={title} className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
            <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm leading-snug text-muted-foreground">
              <strong className="block font-semibold text-foreground">{title}</strong> {text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default HomeSocialProofStrip;
