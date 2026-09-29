import { TrendingUp, Wallet, ShieldCheck, BarChart3, Search, Lock, Radio, EyeOff } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

/**
 * Property Management revenue & operations stack for owners:
 * 1. Dynamic pricing (RoomPriceGenie + Pynbooking algorithmic integration) + listing SEO.
 * 2. Co-hosting transparency — payouts land directly in the owner's account.
 * 3. Safety & Smart Access package (smart locks + non-intrusive sensors).
 */
const OwnerPmRevenueStack = () => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const t = {
    ro: {
      badge: "Tehnologie & Transparență",
      title: "Venituri promovate activ, prețuri dinamice și încasări directe",
      subtitle:
        "Administrarea RealTrust combină algoritmi de tarifare cu marketing de anunțuri și un model co-hosting în care banii ajung direct la tine — noi facturăm doar comisionul de management, după ce tu ai încasat.",

      revenueTitle: "Promovare venituri & prețuri dinamice",
      revenueItems: [
        {
          icon: TrendingUp,
          title: "Prețuri dinamice, ajustate automat",
          desc: "Tarifele se ajustează automat în funcție de cererea din piață, evenimente locale și grad de ocupare, prin integrarea algoritmică cu RoomPriceGenie & Pynbooking — fără intervenție manuală și fără tarife depășite.",
        },
        {
          icon: BarChart3,
          title: "Optimizare continuă a randamentului",
          desc: "Algoritmii compară zilnic cererea, sezonalitatea și concurența din zona apartamentului și recalibrează prețul pe noapte, pentru maximizarea venitului net pe care îl vezi în raportul lunar.",
        },
        {
          icon: Search,
          title: "SEO al anunțurilor pe Airbnb, Booking.com și site-ul propriu",
          desc: "Optimizăm titluri, descrieri, fotografii și cuvinte-cheie pe Airbnb, Booking.com și site-ul RealTrust pentru un număr maxim de afișări și o rată de conversie (CTR) crescută — anunțul tău concurează serios, nu doar există.",
        },
      ],

      cohostTitle: "Co-hosting transparent — încasările ajung direct la tine",
      cohostItems: [
        {
          icon: Wallet,
          title: "Banii din rezervări intră direct în contul tău",
          desc: "Rezervările sunt emise pe contul tău de proprietar pe Airbnb și Booking.com, iar plățile directe ajung în contul tău bancar. Noi nu intermediăm încasările — urmărești fiecare rezervare în portalul proprietarului.",
        },
        {
          icon: ShieldCheck,
          title: "Comision de management achitat ulterior, 15–20%",
          desc: "Comisionul de management RealTrust (15–20%, în funcție de pachet) se achită după ce încasările au ajuns la tine, pe baza raportului lunar detaliat. Fără avansuri, fără costuri ascunse, fără bani reținuți din rezervări.",
        },
      ],

      safetyTitle: "Pachet Siguranță & Smart Access",
      safetyItems: [
        {
          icon: Lock,
          title: "Acces automatizat cu Smart Locks",
          desc: "Check-in și check-out automatizate prin Smart Locks cu coduri unice, generate per rezervare — oaspeții intră singuri, iar accesul expiră automat la finalul șederii.",
        },
        {
          icon: Radio,
          title: "Senzori de protecție și monitorizare a zgomotului",
          desc: "Senzori de fum, monoxid de carbon și scurgeri de apă, plus detectoare de zgomot care alertează echipa înainte ca vecinii să sesizeze — totul monitorizat 24/7 din centrala noastră de operațiuni.",
        },
        {
          icon: EyeOff,
          title: "Fără încălcarea intimității",
          desc: "Zero camere în zonele private: senzorii măsoară doar nivelul de zgomot și factorii de mediu, nu filmează și nu înregistrează. Intimitatea oaspeților rămâne intactă, conform legislației și politicilor platformelor.",
        },
      ],
    },
    en: {
      badge: "Technology & Transparency",
      title: "Actively promoted revenue, dynamic pricing and direct payouts",
      subtitle:
        "RealTrust management combines pricing algorithms with listing marketing and a co-hosting model where the money lands directly in your account — we only invoice the management commission, after you have been paid.",

      revenueTitle: "Revenue promotion & dynamic pricing",
      revenueItems: [
        {
          icon: TrendingUp,
          title: "Dynamic rates, adjusted automatically",
          desc: "Rates adjust automatically based on market demand, local events and occupancy, through the algorithmic integration with RoomPriceGenie & Pynbooking — no manual work and no outdated prices.",
        },
        {
          icon: BarChart3,
          title: "Continuous yield optimization",
          desc: "The algorithms compare demand, seasonality and competition in your building's area daily and recalibrate the nightly rate to maximize the net income you see in your monthly report.",
        },
        {
          icon: Search,
          title: "Listing SEO on Airbnb, Booking.com and our own site",
          desc: "We optimize titles, descriptions, photos and keywords on Airbnb, Booking.com and the RealTrust site for maximum impressions and a higher click-through rate (CTR) — your listing competes seriously, it doesn't just exist.",
        },
      ],

      cohostTitle: "Transparent co-hosting — payments go straight to you",
      cohostItems: [
        {
          icon: Wallet,
          title: "Booking revenue lands directly in your account",
          desc: "Bookings are issued on your own Airbnb and Booking.com host account, and direct payments go to your bank account. We never intermediate your revenue — you track every reservation in the owner portal.",
        },
        {
          icon: ShieldCheck,
          title: "Management commission paid afterwards, 15–20%",
          desc: "The RealTrust management commission (15–20%, depending on the package) is paid after the revenue has reached you, based on the detailed monthly report. No advances, no hidden fees, no money held back from bookings.",
        },
      ],

      safetyTitle: "Safety & Smart Access package",
      safetyItems: [
        {
          icon: Lock,
          title: "Automated access with Smart Locks",
          desc: "Automated check-in and check-out through Smart Locks with unique codes generated per reservation — guests let themselves in and access expires automatically at the end of the stay.",
        },
        {
          icon: Radio,
          title: "Protection sensors and noise monitoring",
          desc: "Smoke, carbon monoxide and water leak sensors, plus noise detectors that alert our team before the neighbours complain — all monitored 24/7 from our operations hub.",
        },
        {
          icon: EyeOff,
          title: "No privacy invasion",
          desc: "Zero cameras in private areas: sensors only measure noise levels and environmental factors — no recording, no video. Guest privacy stays intact, in line with legislation and platform policies.",
        },
      ],
    },
  };

  const c = t[lang];
  const iconCls = "w-6 h-6 text-primary";

  return (
    <section
      ref={ref}
      className="py-16 md:py-20 bg-muted/30 border-y border-border"
      aria-labelledby="pm-revenue-stack-title"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <header className={`text-center max-w-3xl mx-auto mb-12 transition-opacity duration-500 ${isVisible ? "opacity-100" : "opacity-0"}`}>
          <p className="inline-flex items-center gap-2 text-sm font-medium text-primary bg-primary/10 rounded-full px-4 py-1.5 mb-4">
            {c.badge}
          </p>
          <h2 id="pm-revenue-stack-title" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {c.title}
          </h2>
          <p className="text-lg text-muted-foreground">{c.subtitle}</p>
        </header>

        {/* Block 1 — Revenue promotion & dynamic pricing */}
        <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gold" aria-hidden="true" />
          {c.revenueTitle}
        </h3>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {c.revenueItems.map((item) => (
            <article key={item.title} className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <item.icon className={iconCls} aria-hidden="true" />
              </div>
              <h4 className="text-base font-semibold text-foreground mb-2">{item.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </article>
          ))}
        </div>

        {/* Block 2 — Co-hosting transparency & direct payouts */}
        <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-gold" aria-hidden="true" />
          {c.cohostTitle}
        </h3>
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {c.cohostItems.map((item) => (
            <article key={item.title} className="bg-card rounded-xl border border-gold/25 p-6 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-gold" aria-hidden="true" />
              </div>
              <h4 className="text-base font-semibold text-foreground mb-2">{item.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </article>
          ))}
        </div>

        {/* Block 3 — Safety & Smart Access package */}
        <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-6 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gold" aria-hidden="true" />
          {c.safetyTitle}
        </h3>
        <div className="grid md:grid-cols-3 gap-6">
          {c.safetyItems.map((item) => (
            <article key={item.title} className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <item.icon className={iconCls} aria-hidden="true" />
              </div>
              <h4 className="text-base font-semibold text-foreground mb-2">{item.title}</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OwnerPmRevenueStack;
