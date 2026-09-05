import { useRegisterFAQs } from "@/hooks/useFAQSchema";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CalendarClock, ShieldCheck, CalendarX2, TrendingUp, LineChart, MessageCircleQuestion } from "lucide-react";
import { trackConversion, OWNER_FUNNEL_VALUE_EUR, attributionParams } from "@/lib/conversionTracking";

/**
 * OwnerObjectionsFAQ — demontează cele 4 obiecții majore ale proprietarilor
 * (daune, folosință proprie, comparație cu chiria clasică, lunile slabe).
 * Emite FAQPage JSON-LD pentru rich results în Google.
 */

const OwnerObjectionsFAQ = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const t = isRo
    ? {
        badge: "Obiecții frecvente",
        title: "Ce ne întreabă proprietarii înainte să semneze",
        subtitle:
          "Răspunsuri directe, fără limbaj de marketing. Dacă rămâne o întrebare, o punem la telefon în 15 minute.",
        cta: "Rezervă un call de 15 min",
        items: [
          {
            icon: ShieldCheck,
            q: "Ce se întâmplă dacă oaspeții distrug ceva?",
            a: "În practică, incidentele serioase sunt rare pentru că filtrăm cine intră: rezervări doar cu identitate verificată, fără petreceri, fără check-in fără act, cu refuz pe profilurile fără istoric bun. Peste asta stau trei straturi de protecție: (1) garanția platformelor — Airbnb AirCover și programele Booking acoperă daunele reclamate în fereastra oficială, (2) preautorizare/garanție de daune pe rezervările directe, (3) polița de asigurare a locuinței, pe care o recomandăm și o urmărim să fie valabilă. Fiecare check-out are verificare cu poze, deci o pagubă este documentată în aceeași zi, nu descoperită după 12 luni ca la o chirie clasică. Reparațiile mici (un pahar, o lampă) le rezolvăm noi din fondul operațional, fără să te sunăm pentru fiecare detaliu.",
          },
          {
            icon: CalendarX2,
            q: "Ce fac dacă am nevoie de apartament pentru mine sau pentru rude?",
            a: "Apartamentul rămâne al tău și îl folosești când vrei. Blochezi zilele dorite direct din portalul de proprietar (sau cu un mesaj pe WhatsApp) și calendarul se închide pe toate platformele simultan. Nu există taxă de blocare și nu există penalizare. Singura recomandare practică: anunță-ne cu 7–14 zile înainte pentru sezonul aglomerat (târguri, evenimente, sărbători), ca să nu blocăm zile deja rezervate cu tarif mare. Dacă apare o urgență, mutăm oaspeții în alt apartament din portofoliu și suportăm noi diferența, în limita disponibilității.",
          },
          {
            icon: TrendingUp,
            q: "De ce să nu închiriez pe termen lung, mai simplu?",
            a: "Pe aceleași apartamente din Timișoara, regimul hotelier gestionat profesionist produce în medie cu circa 40% mai mult net decât chiria clasică — la o ocupare de lucru de 75% ținta noastră este 9,4% randament net anual. În plus, dispar exact riscurile care doare la chiria pe termen lung: rău-platnicii (la noi banii intră înainte de cazare), evacuarea prin instanță, apartamentul văzut o dată la 12 luni. Curățenia profesională la fiecare plecare înseamnă că starea apartamentului este verificată de câteva ori pe lună, nu o dată pe an. Compromisul e real și îl spunem deschis: venitul variază lunar și apartamentul are nevoie de un standard minim de amenajare.",
          },
          {
            icon: LineChart,
            q: "Ce se întâmplă în lunile slabe (ianuarie, februarie)?",
            a: "Nu lăsăm tariful fix. Folosim dynamic pricing: algoritmul recalculează prețul zilnic în funcție de cererea reală, de evenimentele din oraș (târguri, concerte, conferințe, meciuri), de tarifele concurenței directe din zona ta și de cât de aproape e data. În lunile slabe comutăm strategia pe ocupare: reduceri pentru sejururi lungi, tarife pentru mediu de business și corporate, pachete de 7–28 nopți. Așa lunile slabe rămân profitabile, chiar dacă tariful mediu scade. Peste asta, garanția de neocupare: dacă ocuparea lunară scade sub 55% din vina administrării noastre, luna aceea nu are comision.",
          },
        ],
      }
    : {
        badge: "Common objections",
        title: "What owners ask before signing",
        subtitle: "Straight answers, no marketing language. Anything left, we cover in a 15-minute call.",
        cta: "Book a 15-min call",
        items: [
          {
            icon: ShieldCheck,
            q: "What if guests damage something?",
            a: "Serious incidents are rare because we filter who gets in: verified-identity bookings only, no parties, no check-in without ID, and we decline profiles without a solid history. On top of that there are three protection layers: platform guarantees (Airbnb AirCover and Booking's damage programmes), a damage deposit or pre-authorisation on direct bookings, and your home insurance policy, which we help keep valid. Every check-out includes a photo inspection, so damage is documented the same day instead of being discovered after 12 months as with long-term rent. Small items (a glass, a lamp) we replace from the operating fund without calling you for every detail.",
          },
          {
            icon: CalendarX2,
            q: "What if I need the apartment for myself or family?",
            a: "It stays your apartment. You block any dates from the owner portal (or a WhatsApp message) and the calendar closes across all platforms at once. No blocking fee, no penalty. One practical note: give us 7–14 days' notice for peak season (fairs, events, holidays) so we don't block already-booked high-rate nights. In an emergency we relocate guests to another apartment in the portfolio and absorb the difference, subject to availability.",
          },
          {
            icon: TrendingUp,
            q: "Why not just rent long term?",
            a: "On the same Timișoara apartments, professionally managed short-term rental nets roughly 40% more than long-term rent — at a 75% working occupancy our target is 9.4% net annual yield. It also removes the long-term risks: non-paying tenants (we're paid before check-in), court evictions, and seeing your apartment once a year. Professional cleaning after every stay means the apartment is inspected several times a month. The trade-off is real and we say it openly: income varies month to month and the apartment needs a minimum furnishing standard.",
          },
          {
            icon: LineChart,
            q: "What happens in low season?",
            a: "We never leave the rate fixed. Dynamic pricing recalculates daily based on real demand, city events, direct competitor rates in your area and booking lead time. In slow months we switch to an occupancy strategy: long-stay discounts, corporate and business-travel rates, 7–28 night packages. And there's the occupancy guarantee: if monthly occupancy drops below 55% due to our management, that month carries no commission.",
          },
        ],
      };

  // Single FAQPage per URL: register the visible Q&A centrally.
  useRegisterFAQs(
    "owner-objections",
    t.items.map((item) => ({ question: item.q, answer: item.a })),
  );

  const handleCta = () => {
    trackConversion({
      event: "begin_checkout",
      source: "owners_objections_faq_cta",
      value: OWNER_FUNNEL_VALUE_EUR.intent,
      currency: "EUR",
      ...attributionParams(),
    });
    document.getElementById("call-15-min")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="obiectii-frecvente" className="py-16 md:py-20 scroll-mt-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
            <MessageCircleQuestion className="w-4 h-4 mr-2 text-primary" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.title}</h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {t.items.map((item, index) => {
            const Icon = item.icon;
            return (
              <AccordionItem
                key={item.q}
                value={`objection-${index}`}
                className="border rounded-lg px-4 bg-card data-[state=open]:border-primary/30"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <span className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="font-semibold">{item.q}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">{item.a}</AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <div className="text-center mt-8">
          <Button size="lg" className="min-h-12" onClick={handleCta} aria-label={t.cta}>
            <CalendarClock className="w-4 h-4 mr-2" aria-hidden="true" />
            {t.cta}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default OwnerObjectionsFAQ;
