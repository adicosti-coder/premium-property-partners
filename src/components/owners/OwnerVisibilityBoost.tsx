import { Link } from "react-router-dom";
import { LineChart, Search, Images, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackConversion } from "@/lib/conversionTracking";

const items = [
  {
    icon: LineChart,
    title: "Prețuri dinamice algoritmice",
    desc: "Prin RoomPriceGenie & Pynbooking, tariful pe noapte se ajustează zilnic după cererea din piață, evenimente locale și gradul de ocupare.",
  },
  {
    icon: Search,
    title: "Optimizare SEO a anunțurilor pe Airbnb și Booking",
    desc: "Titluri și descrieri generate inteligent, cu cuvintele-cheie căutate de oaspeți, pentru poziții cât mai sus în rezultatele de căutare.",
  },
  {
    icon: Images,
    title: "A/B testing pe poza de copertă",
    desc: "Testăm alternativ mai multe poze principale și o păstrăm pe cea care aduce cele mai multe clicuri (CTR) și rezervări.",
  },
];

const OwnerVisibilityBoost = () => (
  <section className="py-16 md:py-20" aria-labelledby="owner-visibility-title">
    <div className="container mx-auto px-4 max-w-6xl">
      <header className="text-center max-w-3xl mx-auto mb-10">
        <h2 id="owner-visibility-title" className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Optimizare & maximizare vizibilitate
        </h2>
        <p className="text-lg text-muted-foreground">
          Un anunț bun nu ajunge dacă nu este văzut. Lucrăm zilnic la preț, poziție în căutări și poza care atrage clicul.
        </p>
      </header>
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {items.map((it) => (
          <article key={it.title} className="bg-card rounded-xl border border-border p-6 shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-gold/10 flex items-center justify-center mb-4">
              <it.icon className="w-6 h-6 text-gold" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">{it.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{it.desc}</p>
          </article>
        ))}
      </div>
      <div className="flex flex-col items-center gap-2 text-center">
        <Button asChild variant="hero" size="lg" className="min-h-12">
          <Link
            to="/evaluare-gratuita?beneficiu=vizibilitate_anunturi"
            onClick={() => trackConversion({ event: "owner_cta_click", source: "pentru_proprietari", benefit: "vizibilitate_anunturi" })}
          >
            Vezi cât de vizibil poate fi anunțul tău
            <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Evaluare gratuită, cu recomandări concrete pentru anunțul tău.</p>
      </div>
    </div>
  </section>
);

export default OwnerVisibilityBoost;
