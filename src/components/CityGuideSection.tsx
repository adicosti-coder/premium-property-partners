import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { motion } from 'framer-motion';
import { 
  UtensilsCrossed, 
  Coffee, 
  Landmark, 
  ShoppingBag, 
  TreePine,
  Camera,
  Music,
  Wine,
  MapPin,
  Star,
  Clock,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface Recommendation {
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  category: string;
  distance: string;
  rating?: number;
  highlight?: string;
  highlightEn?: string;
}

const CityGuideSection: React.FC = () => {
  const { language } = useLanguage();
  const animation = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: 'Ghid Local',
      title: 'Descoperă',
      titleHighlight: 'Timișoara',
      subtitle: 'Recomandările noastre pentru o experiență autentică în "Mica Vienă"',
      categories: {
        restaurants: 'Restaurante',
        cafes: 'Cafenele',
        attractions: 'Atracții',
        shopping: 'Cumpărături',
        nature: 'Natură',
        nightlife: 'Viață de Noapte',
      },
      distance: 'distanță',
      seeOnMap: 'Vezi pe Hartă',
      localTip: 'Sfat Local',
      mustTry: 'De încercat',
    },
    en: {
      badge: 'Local Guide',
      title: 'Discover',
      titleHighlight: 'Timișoara',
      subtitle: 'Our recommendations for an authentic experience in "Little Vienna"',
      categories: {
        restaurants: 'Restaurants',
        cafes: 'Cafés',
        attractions: 'Attractions',
        shopping: 'Shopping',
        nature: 'Nature',
        nightlife: 'Nightlife',
      },
      distance: 'away',
      seeOnMap: 'See on Map',
      localTip: 'Local Tip',
      mustTry: 'Must Try',
    }
  };

  const t = content[language as keyof typeof content] || content.ro;

  const categoryIcons: Record<string, React.ElementType> = {
    restaurants: UtensilsCrossed,
    cafes: Coffee,
    attractions: Landmark,
    shopping: ShoppingBag,
    nature: TreePine,
    nightlife: Music,
  };

  const categoryColors: Record<string, string> = {
    restaurants: 'from-rose-500/20 to-rose-500/5 border-rose-500/30',
    cafes: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    attractions: 'from-violet-500/20 to-violet-500/5 border-violet-500/30',
    shopping: 'from-pink-500/20 to-pink-500/5 border-pink-500/30',
    nature: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
    nightlife: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30',
  };

  const categoryIconColors: Record<string, string> = {
    restaurants: 'text-rose-500',
    cafes: 'text-amber-500',
    attractions: 'text-violet-500',
    shopping: 'text-pink-500',
    nature: 'text-emerald-500',
    nightlife: 'text-indigo-500',
  };

  const recommendations: Recommendation[] = [
    {
      name: 'La Căpite',
      nameEn: 'La Căpite',
      description: 'Bucătărie tradițională bănățeană într-un decor autentic. Celebru pentru tocănița de vită și papanașii.',
      descriptionEn: 'Traditional Banat cuisine in an authentic setting. Famous for beef stew and papanași.',
      category: 'restaurants',
      distance: '1.2 km',
      rating: 4.8,
      highlight: 'Tocănița tradițională',
      highlightEn: 'Traditional stew',
    },
    {
      name: 'Scârț loc lejer',
      nameEn: 'Scârț loc lejer',
      description: 'Cafenea creativă cu atmosferă artistică, locul perfect pentru brunch și cafea de specialitate.',
      descriptionEn: 'Creative café with artistic atmosphere, perfect for brunch and specialty coffee.',
      category: 'cafes',
      distance: '800 m',
      rating: 4.7,
      highlight: 'Brunch de weekend',
      highlightEn: 'Weekend brunch',
    },
    {
      name: 'Piața Unirii',
      nameEn: 'Unirii Square',
      description: 'Inima Timișoarei cu arhitectură barocă impresionantă, Domul Catolic și palate istorice.',
      descriptionEn: 'Heart of Timișoara with impressive baroque architecture, Catholic Dome and historic palaces.',
      category: 'attractions',
      distance: '600 m',
      rating: 4.9,
      highlight: 'Arhitectură barocă',
      highlightEn: 'Baroque architecture',
    },
    {
      name: 'Iulius Town',
      nameEn: 'Iulius Town',
      description: 'Cel mai mare mall din vestul României cu branduri internaționale și multiple opțiuni de dining.',
      descriptionEn: 'The largest mall in Western Romania with international brands and multiple dining options.',
      category: 'shopping',
      distance: '2.5 km',
      rating: 4.5,
    },
    {
      name: 'Parcul Rozelor',
      nameEn: 'Rose Park',
      description: 'Oază de liniște cu mii de trandafiri, perfectă pentru plimbări romantice și picnicuri.',
      descriptionEn: 'Peaceful oasis with thousands of roses, perfect for romantic walks and picnics.',
      category: 'nature',
      distance: '1.8 km',
      rating: 4.6,
      highlight: 'Peste 1200 de soiuri',
      highlightEn: 'Over 1200 varieties',
    },
    {
      name: 'D\'Arc',
      nameEn: 'D\'Arc',
      description: 'Bar elegant cu cocktailuri artizanale și atmosferă sofisticată în centrul vechi.',
      descriptionEn: 'Elegant bar with artisanal cocktails and sophisticated atmosphere in the old center.',
      category: 'nightlife',
      distance: '700 m',
      rating: 4.7,
      highlight: 'Cocktailuri signature',
      highlightEn: 'Signature cocktails',
    },
  ];

  const localTips = language === 'ro' ? [
    'Vizitează Piața Victoriei seara pentru cele mai frumoase lumini',
    'Încearcă plăcinta bănățeană la Covrigăria Sârbească',
    'Plimbă-te pe malul Begăi la apus pentru priveliști superbe',
    'Rezervă la restaurante în weekend - sunt foarte căutate',
  ] : [
    'Visit Victory Square at night for the most beautiful lights',
    'Try the Banat pie at Covrigăria Sârbească',
    'Walk along the Bega River at sunset for stunning views',
    'Book restaurants on weekends - they\'re very popular',
  ];

  return (
    <section 
      ref={animation.ref as React.RefObject<HTMLElement>}
      className="py-20 bg-muted/30"
    >
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={animation.isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{t.badge}</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-serif font-bold mb-4">
            {t.title}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              {t.titleHighlight}
            </span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </motion.div>

        {/* Recommendations Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {recommendations.map((rec, index) => {
            const Icon = categoryIcons[rec.category];
            const colorClasses = categoryColors[rec.category];
            const iconColor = categoryIconColors[rec.category];
            
            return (
              <motion.div
                key={rec.name}
                initial={{ opacity: 0, y: 20 }}
                animate={animation.isVisible ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`group relative p-6 rounded-2xl bg-gradient-to-br ${colorClasses} border backdrop-blur-sm hover:shadow-xl transition-all duration-300`}
              >
                {/* Category Icon */}
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-background/80 flex items-center justify-center shadow-sm`}>
                    <Icon className={`w-6 h-6 ${iconColor}`} />
                  </div>
                  {rec.rating && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 text-sm">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{rec.rating}</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                  {language === 'ro' ? rec.name : rec.nameEn}
                </h3>
                
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {language === 'ro' ? rec.description : rec.descriptionEn}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{rec.distance} {t.distance}</span>
                  </div>
                  
                  {(rec.highlight || rec.highlightEn) && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
                      <Sparkles className="w-3 h-3" />
                      {language === 'ro' ? rec.highlight : rec.highlightEn}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Local Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={animation.isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-card rounded-2xl border border-border p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">{t.localTip}</h3>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {localTips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={animation.isVisible ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">{index + 1}</span>
                </div>
                <p className="text-muted-foreground">{tip}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={animation.isVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center mt-10"
        >
          <Link to="/pentru-oaspeti#map">
            <Button size="lg" variant="outline" className="group">
              <MapPin className="w-4 h-4 mr-2" />
              {t.seeOnMap}
              <ExternalLink className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default CityGuideSection;
