import { 
  SprayCanIcon, 
  ShieldCheck, 
  Sparkles, 
  BedDouble, 
  Bath, 
  UtensilsCrossed,
  Wind,
  CheckCircle2,
  Clock,
  Award
} from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useParallax } from "@/hooks/useParallax";

const CleaningStandards = () => {
  const { t } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: checklistRef, isVisible: checklistVisible } = useScrollAnimation({ threshold: 0.1 });
  const { offset: parallaxOffset1 } = useParallax({ speed: 0.12, direction: 'up' });
  const { offset: parallaxOffset2 } = useParallax({ speed: 0.08, direction: 'down' });

  const categoryIcons = [BedDouble, Bath, UtensilsCrossed, Wind];

  return (
    <section className="section-padding bg-background relative overflow-hidden">
      {/* Background decorations with parallax - hidden on mobile to prevent edge shadows */}
      <div 
        className="absolute top-20 -right-40 w-80 h-80 bg-green-500/5 rounded-full blur-3xl transition-transform duration-100 hidden md:block"
        style={{ transform: `translateY(${parallaxOffset1}px)` }}
      />
      <div 
        className="absolute bottom-20 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl transition-transform duration-100 hidden md:block"
        style={{ transform: `translateY(${parallaxOffset2}px)` }}
      />
      
      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div 
          ref={headerRef}
          className={`text-center section-header-spacing transition-all duration-700 ${
            headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
            <SprayCanIcon className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-500">{t.cleaningStandards?.badge || 'Standarde Premium'}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-6">
            {t.cleaningStandards?.title || 'Standardul Nostru de'} <span className="text-gradient-gold">{t.cleaningStandards?.titleHighlight || 'Curățenie'}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto text-premium">
            {t.cleaningStandards?.subtitle || 'Protocol de curățenie certificat, cu verificare quality control după fiecare checkout. Siguranță și igienă la standarde hoteliere.'}
          </p>
        </div>

        {/* Main Features Grid */}
        <div ref={gridRef} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto mb-16">
          {(t.cleaningStandards?.features || [
            { icon: 'shield', title: 'Protocol Certificat', description: 'Proceduri standardizate bazate pe ghidurile internaționale de igienă și dezinfecție.' },
            { icon: 'sparkles', title: 'Echipe Profesionale', description: 'Personal instruit și verificat, cu experiență în hoteluri de 4-5 stele.' },
            { icon: 'clock', title: 'Verificare QC', description: 'Inspecție quality control după fiecare curățenie, cu checklist de 50+ puncte.' },
          ]).map((feature: { title: string; description: string }, index: number) => {
            const icons = [ShieldCheck, Sparkles, Clock];
            const Icon = icons[index % icons.length];
            return (
              <div
                key={index}
                className={`bg-card rounded-2xl p-8 border border-border hover:border-green-500/30 transition-all duration-500 hover:shadow-lg group ${
                  gridVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{ transitionDelay: gridVisible ? `${index * 100}ms` : '0ms' }}
              >
                <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center mb-5 group-hover:bg-green-500/20 transition-colors">
                  <Icon className="w-7 h-7 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Detailed Checklist Section */}
        <div 
          ref={checklistRef}
          className={`bg-card rounded-3xl p-8 md:p-12 border border-border max-w-6xl mx-auto transition-all duration-700 ${
            checklistVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Award className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">{t.cleaningStandards?.checklistTitle || 'Checklist Complet de Curățenie'}</h3>
              <p className="text-sm text-muted-foreground">{t.cleaningStandards?.checklistSubtitle || '50+ puncte de verificare la fiecare checkout'}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {(t.cleaningStandards?.categories || [
              { 
                name: 'Dormitor', 
                items: ['Schimbare lenjerie fresh', 'Aspirare & mop', 'Curățare oglinzi', 'Dezinfectare întrerupătoare', 'Aranjare decorativă'] 
              },
              { 
                name: 'Baie', 
                items: ['Dezinfecție completă', 'Curățare duș/cadă', 'Sanitare strălucitoare', 'Prosoape noi pliate', 'Reumplere consumabile'] 
              },
              { 
                name: 'Bucătărie', 
                items: ['Spălare veselă', 'Curățare electrocasnice', 'Dezinfectare suprafețe', 'Verificare frigider', 'Aranjare ustensile'] 
              },
              { 
                name: 'Zone Comune', 
                items: ['Aspirare canapele', 'Ștergere praf', 'Curățare geamuri', 'Dezinfectare telecomandă', 'Aerisire completă'] 
              },
            ]).map((category: { name: string; items: string[] }, catIndex: number) => {
              const Icon = categoryIcons[catIndex % categoryIcons.length];
              return (
                <div 
                  key={catIndex}
                  className={`transition-all duration-500 ${
                    checklistVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: checklistVisible ? `${(catIndex + 3) * 100}ms` : '0ms' }}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold text-foreground">{category.name}</h4>
                  </div>
                  <ul className="space-y-2.5">
                    {category.items.map((item: string, itemIndex: number) => (
                      <li key={itemIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Bottom Stats */}
          <div className="mt-10 pt-8 border-t border-border flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="text-center">
              <p className="text-3xl font-serif font-semibold text-foreground">50+</p>
              <p className="text-sm text-muted-foreground">{t.cleaningStandards?.statsPoints || 'Puncte de verificare'}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-serif font-semibold text-foreground">100%</p>
              <p className="text-sm text-muted-foreground">{t.cleaningStandards?.statsQC || 'Inspecție QC'}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-serif font-semibold text-foreground">4h</p>
              <p className="text-sm text-muted-foreground">{t.cleaningStandards?.statsTurnaround || 'Turnaround mediu'}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-serif font-semibold text-foreground">5★</p>
              <p className="text-sm text-muted-foreground">{t.cleaningStandards?.statsRating || 'Rating curățenie'}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CleaningStandards;