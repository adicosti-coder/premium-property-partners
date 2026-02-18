import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { motion } from 'framer-motion';
import { Crown, Star, MapPin, Heart } from 'lucide-react';
import ImageWithFallback from './ImageWithFallback';
import POIPlaceholder from './POIPlaceholder';
import { usePoiFavorites } from '@/hooks/usePoiFavorites';
import Autoplay from 'embla-carousel-autoplay';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

interface POI {
  id: string;
  name: string;
  name_en: string;
  category: string;
  description: string | null;
  description_en: string | null;
  address: string | null;
  rating: number | null;
  is_active: boolean;
  display_order: number;
  image_url: string | null;
  is_premium: boolean;
}

interface PremiumPOICarouselProps {
  pois: POI[];
}

const categoryLabels: Record<string, { ro: string; en: string }> = {
  restaurant: { ro: 'Restaurant', en: 'Restaurant' },
  cafe: { ro: 'Cafenea', en: 'Café' },
  attraction: { ro: 'Atracție', en: 'Attraction' },
  shopping: { ro: 'Cumpărături', en: 'Shopping' },
  nature: { ro: 'Natură', en: 'Nature' },
  nightlife: { ro: 'Viață de Noapte', en: 'Nightlife' },
  transport: { ro: 'Transport', en: 'Transport' },
  health: { ro: 'Sănătate', en: 'Health' },
  entertainment: { ro: 'Divertisment', en: 'Entertainment' },
  sports: { ro: 'Sport', en: 'Sports' },
  services: { ro: 'Servicii', en: 'Services' },
};

const PremiumPOICarousel: React.FC<PremiumPOICarouselProps> = ({ pois }) => {
  const { language } = useLanguage();
  const { isFavorite, toggleFavorite } = usePoiFavorites();
  
  const premiumPois = pois.filter(poi => poi.is_premium && poi.image_url);
  
  if (premiumPois.length === 0) return null;
  
  const content = {
    ro: {
      badge: 'Recomandări Exclusive',
      title: 'Locații Premium',
      subtitle: 'Descoperă cele mai speciale locuri din Timișoara, selectate de echipa noastră',
    },
    en: {
      badge: 'Exclusive Picks',
      title: 'Premium Locations',
      subtitle: 'Discover the most special places in Timișoara, handpicked by our team',
    }
  };
  
  const t = content[language as keyof typeof content] || content.ro;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mb-12"
    >
      {/* Section Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-500/30 mb-4"
        >
          <Crown className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{t.badge}</span>
        </motion.div>
        
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {t.title}
        </h3>
        <p className="text-muted-foreground max-w-lg mx-auto">
          {t.subtitle}
        </p>
      </div>

      {/* Carousel with Autoplay */}
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 4000,
            stopOnInteraction: true,
            stopOnMouseEnter: true,
          }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {premiumPois.map((poi, index) => (
            <CarouselItem key={poi.id} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="group relative rounded-2xl overflow-hidden bg-card border-2 border-amber-500/30 shadow-lg hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300"
              >
                {/* Premium Badge */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-semibold shadow-lg">
                  <Crown className="w-3.5 h-3.5" />
                  Premium
                </div>
                
                {/* Favorite Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(poi.id);
                  }}
                  className="absolute top-3 right-3 z-20 w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors shadow-md"
                  aria-label={isFavorite(poi.id) ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart 
                    className={`w-5 h-5 transition-colors ${
                      isFavorite(poi.id) 
                        ? 'text-rose-500 fill-rose-500' 
                        : 'text-muted-foreground hover:text-rose-500'
                    }`} 
                  />
                </button>

                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <ImageWithFallback
                    src={poi.image_url!}
                    alt={language === 'ro' ? poi.name : poi.name_en}
                    className="w-full h-full group-hover:scale-110 transition-transform duration-700"
                    aspectRatio="16/9"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    priority={index < 3}
                    fallbackType="custom"
                    fallbackIcon={
                      <POIPlaceholder 
                        category={poi.category} 
                        name={language === 'ro' ? poi.name : poi.name_en}
                        className="w-full h-full"
                      />
                    }
                    retryCount={1}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                  
                  {/* Rating on image */}
                  {poi.rating && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm text-sm shadow-md">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="font-semibold">{poi.rating}</span>
                    </div>
                  )}
                  
                  {/* Category Badge */}
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium text-foreground shadow-md">
                    {categoryLabels[poi.category]?.[language as 'ro' | 'en'] || poi.category}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 bg-gradient-to-b from-card to-card/95">
                  <h4 className="text-lg font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-1">
                    {language === 'ro' ? poi.name : poi.name_en}
                  </h4>
                  
                  {(poi.description || poi.description_en) ? (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                      {language === 'ro' 
                        ? (poi.description || poi.description_en) 
                        : (poi.description_en || poi.description)}
                    </p>
                  ) : null}
                  
                  {poi.address && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-1">{poi.address}</span>
                    </div>
                  )}
                </div>
                
                {/* Gold accent border effect on hover */}
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-amber-500/50 transition-colors pointer-events-none" />
              </motion.div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {/* Navigation Buttons */}
        <CarouselPrevious className="hidden md:flex -left-4 bg-background/90 backdrop-blur-sm border-amber-500/30 hover:bg-background hover:border-amber-500/50" />
        <CarouselNext className="hidden md:flex -right-4 bg-background/90 backdrop-blur-sm border-amber-500/30 hover:bg-background hover:border-amber-500/50" />
      </Carousel>
      
      {/* Mobile indicator dots */}
      <div className="flex justify-center gap-1.5 mt-4 md:hidden">
        {premiumPois.slice(0, 5).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-amber-500/30"
          />
        ))}
        {premiumPois.length > 5 && (
          <span className="text-xs text-muted-foreground ml-1">+{premiumPois.length - 5}</span>
        )}
      </div>
    </motion.div>
  );
};

export default PremiumPOICarousel;
