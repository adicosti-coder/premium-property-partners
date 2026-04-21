import { ClipboardCheck, Cog, TrendingUp, ArrowRight, BarChart3, CheckCircle2, TrendingDown } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";

const OwnerHowItWorks = () => {
  const { language } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      label: "Cum Funcționează",
      title: "3 pași până la",
      titleHighlight: "primul venit",
      subtitle: "De la prima discuție la prima încasare — sub 7 zile. Tu semnezi un singur contract. Restul facem noi.",
      steps: [
        {
          icon: ClipboardCheck,
          number: "01",
          title: "Evaluare gratuită, calibrată pe date reale",
          description: "Estimăm venitul lunar pe intervale recalibrate trimestrial din portofoliul nostru în regim hotelier (75–85% ocupare, tarife 2025–2026, comisioane Booking/Airbnb deduse). Fără promisiuni umflate — doar cifre verificate pe apartamente similare din zona ta.",
          detail: "Răspuns în 24h",
        },
        {
          icon: Cog,
          number: "02",
          title: "Onboarding complet, gestionat de noi",
          description: "Fotografii profesionale, listare pe 30+ canale, self check-in digital, pricing dinamic și toate procedurile hoteliere — pregătite la cheie de echipa noastră.",
          detail: "Live în 3-5 zile",
        },
        {
          icon: TrendingUp,
          number: "03",
          title: "Încasezi lunar, fără bătăi de cap",
          description: "Operăm tot: oaspeți, curățenie, mentenanță, comunicare. Tu primești banii direct în cont, cu raport financiar detaliat în fiecare lună — comparat cu estimarea inițială pentru transparență totală.",
          detail: "Plăți lunare garantate",
        },
      ],
      report: {
        eyebrow: "Raport lunar · exemplu real",
        title: "Apartament 2 camere · Iosefin · octombrie 2025",
        subtitle: "Așa arată comparația estimare inițială vs. realizat pe care o primești în fiecare lună:",
        estimateLabel: "Estimare inițială",
        actualLabel: "Realizat (verificat)",
        deltaLabel: "Diferență",
        rows: [
          { metric: "Ocupare", estimate: "78%", actual: "84%", delta: "+6 pp", positive: true },
          { metric: "ADR (tarif mediu/noapte)", estimate: "92 €", actual: "98 €", delta: "+6 €", positive: true },
          { metric: "Venit brut", estimate: "2.230 €", actual: "2.555 €", delta: "+325 €", positive: true },
          { metric: "Comisioane Booking/Airbnb", estimate: "−18%", actual: "−16,4%", delta: "+1,6 pp", positive: true },
          { metric: "Curățenie & utilități", estimate: "−380 €", actual: "−395 €", delta: "−15 €", positive: false },
          { metric: "Venit net proprietar", estimate: "1.450 €", actual: "1.690 €", delta: "+240 €", positive: true },
        ],
        recalibrationLabel: "Indicatori recalibrați trimestrial",
        recalibrationItems: [
          "Ocupare medie pe tip de apartament & zonă",
          "ADR & tarife weekend / sezon",
          "Comisioane reale Booking, Airbnb, Direct",
          "Costuri curățenie & utilități pe regim",
        ],
        footnote: "Cifrele provin din portofoliul nostru operat în Timișoara. Estimarea ta inițială este calibrată pe apartamente comparabile, apoi raportul lunar îți arată exact unde am livrat peste sau sub prognoză.",
      },
    },
    en: {
      label: "How It Works",
      title: "3 steps to your",
      titleHighlight: "first payout",
      subtitle: "From first call to first payout — under 7 days. You sign one contract. We handle the rest.",
      steps: [
        {
          icon: ClipboardCheck,
          number: "01",
          title: "Free evaluation, calibrated on real data",
          description: "We estimate monthly income using ranges recalibrated quarterly from our hotel-regime portfolio (75–85% occupancy, 2025–2026 rates, Booking/Airbnb fees deducted). No inflated promises — only verified figures from comparable apartments in your area.",
          detail: "Answer in 24h",
        },
        {
          icon: Cog,
          number: "02",
          title: "Full onboarding, handled by us",
          description: "Professional photography, listing on 30+ channels, digital self check-in, dynamic pricing and all hotel-grade procedures — set up turnkey by our team.",
          detail: "Live in 3-5 days",
        },
        {
          icon: TrendingUp,
          number: "03",
          title: "Monthly income, zero hassle",
          description: "We run everything: guests, cleaning, maintenance, communication. You receive money directly in your account, with a detailed monthly report — benchmarked against the initial estimate for full transparency.",
          detail: "Guaranteed monthly payments",
        },
      ],
      report: {
        eyebrow: "Monthly report · real example",
        title: "1-bedroom apartment · Iosefin · October 2025",
        subtitle: "This is the initial-estimate vs. actual comparison you receive every month:",
        estimateLabel: "Initial estimate",
        actualLabel: "Actual (verified)",
        deltaLabel: "Delta",
        rows: [
          { metric: "Occupancy", estimate: "78%", actual: "84%", delta: "+6 pp", positive: true },
          { metric: "ADR (avg. nightly rate)", estimate: "€92", actual: "€98", delta: "+€6", positive: true },
          { metric: "Gross revenue", estimate: "€2,230", actual: "€2,555", delta: "+€325", positive: true },
          { metric: "Booking/Airbnb fees", estimate: "−18%", actual: "−16.4%", delta: "+1.6 pp", positive: true },
          { metric: "Cleaning & utilities", estimate: "−€380", actual: "−€395", delta: "−€15", positive: false },
          { metric: "Net owner income", estimate: "€1,450", actual: "€1,690", delta: "+€240", positive: true },
        ],
        recalibrationLabel: "Indicators recalibrated quarterly",
        recalibrationItems: [
          "Average occupancy by apartment type & area",
          "ADR & weekend / seasonal rates",
          "Real Booking, Airbnb and Direct fees",
          "Cleaning & utility costs per regime",
        ],
        footnote: "Figures come from our portfolio operated in Timișoara. Your initial estimate is calibrated on comparable apartments, then the monthly report shows you exactly where we delivered above or below forecast.",
      },
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  return (
    <section id="cum-functioneaza-proprietari" className="section-padding bg-gradient-subtle">
      <div className="container mx-auto px-6 lg:px-8">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center section-header-spacing transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4 font-sans">
            {t.label}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-6">
            {t.title}{" "}
            <span className="text-gradient-gold">{t.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-premium">
            {t.subtitle}
          </p>
        </div>

        {/* Steps */}
        <div ref={gridRef} className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
            {/* Connector lines between steps (desktop) */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-px bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20" />

            {t.steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={index}
                  className={`relative group text-center transition-all duration-500 ${
                    gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: gridVisible ? `${index * 150}ms` : "0ms" }}
                >
                  {/* Icon with number */}
                  <div className="relative inline-flex items-center justify-center mb-8">
                    <div className="w-28 h-28 rounded-2xl bg-card border border-border shadow-card flex items-center justify-center group-hover:border-primary/40 group-hover:shadow-elegant transition-all duration-300">
                      <Icon className="w-12 h-12 text-primary group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <span className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center font-sans shadow-lg">
                      {step.number}
                    </span>
                    {/* Arrow between steps (desktop) */}
                    {index < 2 && (
                      <ArrowRight className="hidden md:block absolute -right-10 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
                    )}
                  </div>

                  <h3 className="text-xl lg:text-2xl heading-premium text-foreground mb-3">
                    {step.title}
                  </h3>

                  <p className="text-muted-foreground text-premium mb-4 max-w-xs mx-auto">
                    {step.description}
                  </p>

                  {/* Detail badge */}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {step.detail}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Monthly report mini-example — estimate vs. actual + recalibrated indicators */}
          <div
            className={`mt-16 lg:mt-20 transition-all duration-700 ${
              gridVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: gridVisible ? "450ms" : "0ms" }}
          >
            <div className="rounded-3xl border border-primary/20 bg-card shadow-elegant overflow-hidden">
              <div className="bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8 border-b border-border">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                    {t.report.eyebrow}
                  </span>
                </div>
                <h3 className="text-xl md:text-2xl heading-premium text-foreground mb-2">
                  {t.report.title}
                </h3>
                <p className="text-muted-foreground text-sm md:text-base text-premium">
                  {t.report.subtitle}
                </p>
              </div>

              <div className="p-4 sm:p-6 lg:p-8">
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                        <th className="py-3 px-3 font-semibold">&nbsp;</th>
                        <th className="py-3 px-3 font-semibold text-right">{t.report.estimateLabel}</th>
                        <th className="py-3 px-3 font-semibold text-right">{t.report.actualLabel}</th>
                        <th className="py-3 px-3 font-semibold text-right">{t.report.deltaLabel}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.report.rows.map((row, i) => {
                        const isTotal = i === t.report.rows.length - 1;
                        return (
                          <tr
                            key={row.metric}
                            className={`border-b border-border/50 last:border-b-0 ${
                              isTotal ? "bg-primary/5 font-semibold" : ""
                            }`}
                          >
                            <td className="py-3 px-3 text-foreground">{row.metric}</td>
                            <td className="py-3 px-3 text-right text-muted-foreground tabular-nums">
                              {row.estimate}
                            </td>
                            <td className="py-3 px-3 text-right text-foreground tabular-nums">
                              {row.actual}
                            </td>
                            <td
                              className={`py-3 px-3 text-right tabular-nums font-medium ${
                                row.positive ? "text-primary" : "text-muted-foreground"
                              }`}
                            >
                              <span className="inline-flex items-center gap-1 justify-end">
                                {row.positive ? (
                                  <TrendingUp className="w-3.5 h-3.5" aria-hidden="true" />
                                ) : (
                                  <TrendingDown className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                                {row.delta}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-8 pt-6 border-t border-border">
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">
                    {t.report.recalibrationLabel}
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {t.report.recalibrationItems.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm text-foreground/80"
                      >
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-6 text-xs text-muted-foreground italic leading-relaxed">
                  {t.report.footnote}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OwnerHowItWorks;
