import { Star, Quote } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  role: string;
  content: string;
  rating: number;
  source: string;
  sourceIcon: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Alexandru M.",
    role: "Proprietar, 2 apartamente",
    content: "De când colaborez cu RealTrust, veniturile mele au crescut cu 45%. Echipa lor se ocupă de absolut tot, de la comunicare cu oaspeții până la curățenie. Recomand cu încredere!",
    rating: 5,
    source: "Google Reviews",
    sourceIcon: "G",
  },
  {
    id: 2,
    name: "Maria P.",
    role: "Proprietar, 1 apartament",
    content: "Profesionalism de excepție! Am fost sceptică la început, dar rezultatele vorbesc de la sine. Rata de ocupare a crescut de la 60% la 95% în doar 3 luni.",
    rating: 5,
    source: "Facebook",
    sourceIcon: "f",
  },
  {
    id: 3,
    name: "Cristian D.",
    role: "Proprietar, 3 apartamente",
    content: "Cel mai bun partener pentru administrarea proprietăților. Transparență totală, rapoarte detaliate și comunicare excelentă. Veniturile au depășit așteptările.",
    rating: 5,
    source: "Trustpilot",
    sourceIcon: "★",
  },
  {
    id: 4,
    name: "Elena S.",
    role: "Proprietar, 1 apartament",
    content: "Echipa RealTrust m-a ajutat să transform un apartament gol într-o sursă constantă de venit. Fotografiile profesionale și descrierile optimizate au făcut diferența.",
    rating: 5,
    source: "Google Reviews",
    sourceIcon: "G",
  },
];

const Testimonials = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4">Testimoniale</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            Ce Spun <span className="text-gradient-gold">Proprietarii</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Descoperă poveștile de succes ale proprietarilor care au ales să colaboreze cu noi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-card rounded-2xl p-8 border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-elegant relative"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-8 h-8 text-primary/20" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>

              {/* Content */}
              <p className="text-muted-foreground mb-6 leading-relaxed">
                "{testimonial.content}"
              </p>

              {/* Author */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{testimonial.name}</p>
                  <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                </div>
                
                {/* Source badge */}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-xs text-muted-foreground">
                  <span className="font-bold">{testimonial.sourceIcon}</span>
                  <span>{testimonial.source}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust stats */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">4.9/5</p>
            <p className="text-muted-foreground text-sm">Rating mediu</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">200+</p>
            <p className="text-muted-foreground text-sm">Recenzii verificate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-serif font-semibold text-foreground">98%</p>
            <p className="text-muted-foreground text-sm">Clienți mulțumiți</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
