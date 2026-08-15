import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  KeyRound,
  Eye,
  MapPin,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Clock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";

interface WhyUsProps {
  variant?: "owner" | "about";
}

interface BenefitCard {
  icon: LucideIcon;
  title: string;
  description: string;
  highlights: string[];
  stat?: { value: string; label: string };
}

const WhyUs = ({ variant = "owner" }: WhyUsProps) => {
  const { language } = useLanguage();
  const { trackFormSubmit } = useCtaAnalytics();

  const translations = {
    ro: {
      label: "DE CE NOI",
      title: "Alegerea care transformă proprietatea într-un",
      titleHighlight: "activ care lucrează pentru tine",
      subtitle:
        "Nu oferim doar administrare — oferim un parteneriat complet în care tu păstrezi proprietatea, iar noi livrăm venituri, liniște și transparență.",
      cards: [
        {
          icon: KeyRound,
          title: "Management 100% pasiv pentru tine",
          description:
            "Preluăm tot fluxul operațional de la preluarea cheilor: promovare multi-canal, tarifare dinamică, curățenie profesională la nivel de hotel, mentenanță și raportare lunară.",
          highlights: [
            "Preluare chei & setup complet",
            "Listare pe 15+ platforme",
            "Curățenie & mentenanță incluse",
            "Tu primești doar raportul și venitul",
          ],
          stat: { value: "0%", label: "implicare zilnică" },
        },
        {
          icon: Eye,
          title: "Transparență totală & fără risc",
          description:
            "Acces direct la sistemul de rezervări, rapoarte clare de venituri și comisioane corecte, direct aliniate cu succesul proprietății. Fără taxe ascunse, fără lock-in abuziv.",
          highlights: [
            "Dashboard & raportare lunară",
            "Comision 15-25% din net",
            "Fără setup fee sau costuri ascunse",
            "Reziliere cu 30 de zile preaviz",
          ],
          stat: { value: "100%", label: "transparență" },
        },
        {
          icon: MapPin,
          title: "Experiență & cunoaștere locală",
          description:
            "Peste 25 de ani de expertiză pe piața imobiliară din Timișoara, cu focus pe maximizarea gradului de ocupare și protejarea activului pe termen lung.",
          highlights: [
            "25+ ani în imobiliare Timișoara",
            "Ocupare medie 75%",
            "Randament net țintă 9,4%",
            "Rating consolidat 9,7/10",
          ],
          stat: { value: "25+", label: "ani experiență" },
        },
      ] as BenefitCard[],
      trustPills: [
        "Fără lock-in",
        "Raportare lunară",
        "Suport 24/7",
        "Oaspeți verificați",
      ],
      ctaTitle: "Hai să vedem dacă apartamentul tău se potrivește modelului",
      ctaSubtitle:
        "Primești o evaluare gratuită în 24 de ore, cu cifre reale și pași clari — fără presiune sau obligații.",
      ctaPrimary: "Solicită evaluare gratuită",
      ctaSecondary: "Programează discuție cu Adrian",
    },
    en: {
      label: "WHY US",
      title: "The choice that turns your property into an",
      titleHighlight: "asset that works for you",
      subtitle:
        "We don't just manage properties — we offer a full partnership where you keep the asset and we deliver income, peace of mind, and transparency.",
      cards: [
        {
          icon: KeyRound,
          title: "100% passive management for you",
          description:
            "We take over the full operational flow from key handover: multi-channel marketing, dynamic pricing, hotel-level cleaning, maintenance, and monthly reporting.",
          highlights: [
            "Key handover & full setup",
            "Listed on 15+ platforms",
            "Cleaning & maintenance included",
            "You only receive reports and income",
          ],
          stat: { value: "0%", label: "daily involvement" },
        },
        {
          icon: Eye,
          title: "Total transparency & zero risk",
          description:
            "Direct access to the booking system, clear revenue reports, and fair commissions aligned with your property's success. No hidden fees, no abusive lock-ins.",
          highlights: [
            "Dashboard & monthly reporting",
            "15-25% commission on net income",
            "No setup fees or hidden costs",
            "30-day notice termination",
          ],
          stat: { value: "100%", label: "transparency" },
        },
        {
          icon: MapPin,
          title: "Experience & local market knowledge",
          description:
            "Over 25 years of expertise in the Timișoara real estate market, focused on maximizing occupancy and protecting your asset in the long run.",
          highlights: [
            "25+ years in Timișoara real estate",
            "75% average occupancy",
            "9.4% target net yield",
            "Consolidated 9.7/10 rating",
          ],
          stat: { value: "25+", label: "years experience" },
        },
      ] as BenefitCard[],
      trustPills: [
        "No lock-in",
        "Monthly reporting",
        "24/7 support",
        "Verified guests",
      ],
      ctaTitle: "Let's see if your apartment fits the model",
      ctaSubtitle:
        "Get a free evaluation within 24 hours with real numbers and clear next steps — no pressure, no obligations.",
      ctaPrimary: "Request free evaluation",
      ctaSecondary: "Schedule a call with Adrian",
    },
  };

  const aboutTranslations = {
    ro: {
      ...translations.ro,
      ctaTitle: "De ce să lucrezi cu RealTrust Timișoara?",
      ctaSubtitle:
        "Indiferent că vrei să vinzi, să închiriezi pe termen lung sau să transformi apartamentul într-o sursă de venit pasiv, discutăm fără obligații despre cea mai bună strategie.",
      ctaPrimary: "Solicită o consultare",
      ctaSecondary: "Vezi pachetele pentru proprietari",
    },
    en: {
      ...translations.en,
      ctaTitle: "Why work with RealTrust Timișoara?",
      ctaSubtitle:
        "Whether you want to sell, rent long-term, or turn your apartment into passive income, let's discuss the best strategy with no obligation.",
      ctaPrimary: "Request a consultation",
      ctaSecondary: "View owner packages",
    },
  };

  const t = variant === "about" ? aboutTranslations[language] : translations[language];

  const handlePrimaryCta = () => {
    trackFormSubmit("why_us_primary_click", {
      page: variant === "about" ? "despre-noi" : "pentru-proprietari",
      variant,
      label: "free_evaluation",
    });
  };

  const handleSecondaryCta = () => {
    trackFormSubmit("why_us_secondary_click", {
      page: variant === "about" ? "despre-noi" : "pentru-proprietari",
      variant,
      label: variant === "about" ? "owner_packages" : "schedule_call_adrian",
    });
  };

  return (
    <section
      id="de-ce-noi"
      className="section-padding bg-background relative overflow-hidden"
      aria-labelledby="why-us-heading"
    >
      {/* Decorative background blobs */}
      <div
        className="absolute top-0 -right-40 w-[28rem] h-[28rem] bg-primary/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 -left-40 w-[28rem] h-[28rem] bg-primary/5 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        {/* Section header */}
        <div className="max-w-3xl mx-auto text-center mb-14">
          <span className="inline-block text-primary tracking-widest text-sm font-semibold mb-4 font-sans uppercase">
            {t.label}
          </span>
          <h2
            id="why-us-heading"
            className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-6"
          >
            {t.title}{" "}
            <span className="text-primary">{t.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed font-sans">
            {t.subtitle}
          </p>
        </div>

        {/* Benefit cards grid */}
        <div className="grid lg:grid-cols-3 gap-6 max-w-7xl mx-auto mb-12">
          {t.cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <article
                key={index}
                className="group relative bg-card rounded-2xl border border-border p-8 hover:shadow-elegant hover:border-primary/20 transition-all duration-300 flex flex-col"
              >
                {/* Icon header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                    <Icon
                      className="w-7 h-7 text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  {card.stat && (
                    <div className="text-right">
                      <p className="text-3xl font-serif font-bold text-primary leading-none">
                        {card.stat.value}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 font-sans">
                        {card.stat.label}
                      </p>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-serif font-semibold text-foreground mb-3">
                  {card.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed font-sans text-sm mb-6">
                  {card.description}
                </p>

                <ul className="space-y-3 mt-auto">
                  {card.highlights.map((highlight, hIndex) => (
                    <li
                      key={hIndex}
                      className="flex items-start gap-3 text-sm text-foreground/80 font-sans"
                    >
                      <CheckCircle2
                        className="w-4 h-4 text-primary flex-shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        {/* Trust pills / social proof strip */}
        <div className="flex flex-wrap justify-center gap-3 mb-16 max-w-3xl mx-auto">
          {t.trustPills.map((pill, index) => {
            const icons = [ShieldCheck, Clock, TrendingUp, Sparkles];
            const Icon = icons[index % icons.length];
            return (
              <span
                key={index}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-sm text-foreground/80 font-sans"
              >
                <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
                {pill}
              </span>
            );
          })}
        </div>

        {/* CTA block */}
        <div className="relative max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-3xl border border-primary/20 p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-serif font-bold text-foreground mb-4">
              {t.ctaTitle}
            </h3>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto font-sans">
              {t.ctaSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="group w-full sm:w-auto"
                onClick={handlePrimaryCta}
              >
                <Link to="/evaluare-gratuita">
                  {t.ctaPrimary}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full sm:w-auto"
                onClick={handleSecondaryCta}
              >
                <Link
                  to={
                    variant === "about"
                      ? "/pentru-proprietari#pachete"
                      : "/programare-apel-fondator"
                  }
                >
                  {t.ctaSecondary}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
