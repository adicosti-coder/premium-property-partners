import { Users, Star, Percent } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

/** Three compact, approved proof points under the homepage hero. Static, no data fetching. */
const HomeSocialProofStrip = () => {
  const { language } = useLanguage();
  const ro = language !== "en";
  const items = [
    { Icon: Users, title: ro ? "Peste 10.000" : "Over 10,000", text: ro ? "oaspeți cazați" : "guests hosted" },
    { Icon: Star, title: "9,7/10 Booking · 4,9/5 Airbnb", text: ro ? "evaluarea oaspeților" : "guest rating" },
    { Icon: Percent, title: ro ? "Comision 15–20%" : "15–20% fee", text: ro ? "din venitul net" : "of net income" },
  ];
  return (
    <section aria-label={ro ? "De ce RealTrust" : "Why RealTrust"} className="border-b border-border bg-background">
      <ul className="container mx-auto grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-3 sm:gap-4 md:py-5">
        {items.map(({ Icon, title, text }) => (
          <li key={title} className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
            <Icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm leading-snug text-muted-foreground">
              <strong className="font-semibold text-foreground">{title}</strong> {text}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default HomeSocialProofStrip;
