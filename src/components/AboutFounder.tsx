import { useLanguage } from "@/i18n/LanguageContext";
import { CheckCircle, MapPin, Award, Users } from "lucide-react";
import { useParallax } from "@/hooks/useParallax";

const AboutFounder = () => {
  const { t, language } = useLanguage();

  const translations = {
    ro: {
      label: "Despre",
      title: "Cine este în spatele",
      titleHighlight: "RealTrust",
      subtitle: "Nu sunt un call-center anonim — sunt un antreprenor local implicat direct în operare și în relația cu proprietarii.",
      founderName: "Adrian",
      founderRole: "Fondator RealTrust & ApArt Hotel",
      description: "Lucrez zi de zi în imobiliare și regim hotelier în Timișoara. Cunosc zonele și tipurile de apartamente care se pretează mai bine la chirie clasică vs regim hotelier — și îți spun sincer ce are sens pentru tine.",
      philosophy: "Prefer colaborări pe termen lung, în care cifrele (nu doar impresiile) arată că suntem pe direcția corectă.",
      expectations: "Ce poți aștepta",
      items: [
        "Feedback sincer — inclusiv când regimul hotelier nu are sens",
        "Structură, proceduri și digitalizare (nu 'merge și așa')",
        "Transparență — vezi clar ce se întâmplă cu proprietatea ta",
        "Focus pe rezultat, nu pe 'plin cu orice preț'",
      ],
      tags: ["Focus Timișoara", "Administrare dedicată", "Raportare clară"],
    },
    en: {
      label: "About",
      title: "Who is behind",
      titleHighlight: "RealTrust",
      subtitle: "I'm not an anonymous call center — I'm a local entrepreneur directly involved in operations and relationships with property owners.",
      founderName: "Adrian",
      founderRole: "Founder of RealTrust & ApArt Hotel",
      description: "I work daily in real estate and hotel management in Timișoara. I know the areas and types of apartments that are better suited for classic rental vs hotel-style — and I'll honestly tell you what makes sense for you.",
      philosophy: "I prefer long-term collaborations, where the numbers (not just impressions) show we're on the right track.",
      expectations: "What you can expect",
      items: [
        "Honest feedback — including when hotel management doesn't make sense",
        "Structure, procedures and digitalization (not 'it works somehow')",
        "Transparency — you clearly see what's happening with your property",
        "Focus on results, not on 'full at any cost'",
      ],
      tags: ["Timișoara Focus", "Dedicated Management", "Clear Reporting"],
    },
  };

  const tr = translations[language] || translations.en;
  const { offset: parallaxOffset1 } = useParallax({ speed: 0.12, direction: 'up' });
  const { offset: parallaxOffset2 } = useParallax({ speed: 0.08, direction: 'down' });

  return (
    <section id="despre" className="py-24 bg-card relative overflow-hidden">
      {/* Background decorations with parallax */}
      <div 
        className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset1}px)` }}
      />
      <div 
        className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl transition-transform duration-100"
        style={{ transform: `translateY(${parallaxOffset2}px)` }}
      />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-primary text-sm font-semibold">{tr.label}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {tr.title} <span className="text-gradient-gold">{tr.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {tr.subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto items-center">
          {/* Founder Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-primary-foreground text-2xl font-serif font-bold">
                A
              </div>
              <div>
                <h3 className="text-2xl font-serif font-semibold text-foreground">{tr.founderName}</h3>
                <p className="text-muted-foreground">{tr.founderRole}</p>
                <div className="flex items-center gap-1 text-primary text-sm mt-1">
                  <MapPin className="w-3 h-3" />
                  Timișoara
                </div>
              </div>
            </div>
            
            <p className="text-foreground/90 leading-relaxed">
              {tr.description}
            </p>
            
            <p className="text-muted-foreground italic border-l-2 border-primary pl-4">
              {tr.philosophy}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 pt-4">
              {tr.tags.map((tag, index) => (
                <span 
                  key={index}
                  className="px-3 py-1.5 text-xs font-medium bg-primary/10 border border-primary/20 rounded-full text-primary"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Expectations */}
          <div className="bg-background p-8 rounded-2xl border border-border">
            <div className="flex items-center gap-2 mb-6">
              <Award className="w-5 h-5 text-primary" />
              <h4 className="text-xl font-serif font-semibold text-foreground">{tr.expectations}</h4>
            </div>
            
            <ul className="space-y-4">
              {tr.items.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutFounder;
