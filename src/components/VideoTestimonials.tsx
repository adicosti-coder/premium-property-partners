import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Play, Quote, Star, Building2, MapPin, X } from "lucide-react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

interface VideoTestimonial {
  id: string;
  name: string;
  role: string;
  property: string;
  location: string;
  quote: string;
  youtubeId: string;
  rating: number;
  monthsAsClient: number;
}

const VideoTestimonials = () => {
  const { language } = useLanguage();
  const animation = useScrollAnimation({ threshold: 0.1 });
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const content = {
    ro: {
      badge: "Testimoniale Video",
      title: "Proprietari",
      titleHighlight: "Mulțumiți",
      subtitle: "Ascultă poveștile de succes ale proprietarilor care ne-au încredințat proprietățile lor.",
      cta: "Vezi Video",
      months: "luni parteneriat",
      testimonials: [
        {
          id: "1",
          name: "Alexandru Marinescu",
          role: "Proprietar Apartament",
          property: "Apartament 2 Camere Premium",
          location: "Complexul Isho, Timișoara",
          quote: "Am trecut de la 40% ocupare gestionând singur la 95% cu ApArt Hotel. Venitul meu s-a triplat în primele 6 luni. Recomand cu încredere!",
          youtubeId: "dQw4w9WgXcQ",
          rating: 5,
          monthsAsClient: 18
        },
        {
          id: "2",
          name: "Ioana Dumitrescu",
          role: "Investitor Imobiliar",
          property: "3 Apartamente în Portofoliu",
          location: "Zone Premium, Timișoara",
          quote: "Ca investitor cu mai multe proprietăți, aveam nevoie de un partener de încredere. Transparența financiară și rapoartele detaliate m-au convins să rămân.",
          youtubeId: "dQw4w9WgXcQ",
          rating: 5,
          monthsAsClient: 24
        },
        {
          id: "3",
          name: "Mihai Popa",
          role: "Proprietar Rezident",
          property: "Apartament Studio",
          location: "Iulius Town, Timișoara",
          quote: "Locuiesc în străinătate și nu aveam cum să gestionez închirierea. Echipa ApArt Hotel se ocupă de tot, iar eu primesc banii direct în cont. Perfect!",
          youtubeId: "dQw4w9WgXcQ",
          rating: 5,
          monthsAsClient: 12
        }
      ]
    },
    en: {
      badge: "Video Testimonials",
      title: "Satisfied",
      titleHighlight: "Owners",
      subtitle: "Listen to the success stories of property owners who trusted us with their properties.",
      cta: "Watch Video",
      months: "months partnership",
      testimonials: [
        {
          id: "1",
          name: "Alexandru Marinescu",
          role: "Apartment Owner",
          property: "2 Bedroom Premium Apartment",
          location: "Isho Complex, Timișoara",
          quote: "I went from 40% occupancy managing myself to 95% with ApArt Hotel. My income tripled in the first 6 months. Highly recommend!",
          youtubeId: "dQw4w9WgXcQ",
          rating: 5,
          monthsAsClient: 18
        },
        {
          id: "2",
          name: "Ioana Dumitrescu",
          role: "Real Estate Investor",
          property: "3 Apartments in Portfolio",
          location: "Premium Areas, Timișoara",
          quote: "As an investor with multiple properties, I needed a reliable partner. The financial transparency and detailed reports convinced me to stay.",
          youtubeId: "dQw4w9WgXcQ",
          rating: 5,
          monthsAsClient: 24
        },
        {
          id: "3",
          name: "Mihai Popa",
          role: "Expat Owner",
          property: "Studio Apartment",
          location: "Iulius Town, Timișoara",
          quote: "I live abroad and couldn't manage the rental. The ApArt Hotel team handles everything, and I receive money directly in my account. Perfect!",
          youtubeId: "dQw4w9WgXcQ",
          rating: 5,
          monthsAsClient: 12
        }
      ]
    }
  };

  const t = content[language];

  const getYoutubeThumbnail = (videoId: string) => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  return (
    <>
      <section className="py-20 md:py-28 bg-gradient-to-b from-background via-primary/5 to-background relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-40 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 -right-20 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div
          ref={animation.ref}
          className={`container mx-auto px-4 relative z-10 transition-all duration-700 ${
            animation.isVisible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
              <Play className="w-4 h-4 mr-2 text-primary" />
              {t.badge}
            </Badge>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              {t.title}{" "}
              <span className="text-primary">{t.titleHighlight}</span>
            </h2>
            
            <p className="text-lg text-muted-foreground">
              {t.subtitle}
            </p>
          </div>

          {/* Video Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {t.testimonials.map((testimonial: VideoTestimonial, index: number) => (
              <Card 
                key={testimonial.id}
                className="group overflow-hidden border-2 hover:border-primary/30 transition-all duration-500 hover:shadow-2xl"
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Video Thumbnail */}
                <div 
                  className="relative aspect-video cursor-pointer overflow-hidden"
                  onClick={() => setActiveVideo(testimonial.youtubeId)}
                >
                  <img
                    src={getYoutubeThumbnail(testimonial.youtubeId)}
                    alt={`${testimonial.name} video testimonial`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  
                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors duration-300 flex items-center justify-center">
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-xl">
                      <Play className="w-7 h-7 md:w-8 md:h-8 text-white fill-white ml-1" />
                    </div>
                  </div>

                  {/* Duration badge */}
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/70 rounded text-white text-xs font-medium">
                    {testimonial.monthsAsClient} {t.months}
                  </div>
                </div>

                <CardContent className="p-6">
                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                    ))}
                  </div>

                  {/* Quote */}
                  <div className="relative mb-4">
                    <Quote className="w-6 h-6 text-primary/20 absolute -top-1 -left-1" />
                    <p className="text-muted-foreground text-sm leading-relaxed pl-4 italic">
                      "{testimonial.quote}"
                    </p>
                  </div>

                  {/* Owner info */}
                  <div className="border-t pt-4">
                    <h4 className="font-bold text-foreground">{testimonial.name}</h4>
                    <p className="text-sm text-primary font-medium">{testimonial.role}</p>
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {testimonial.property}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {testimonial.location}
                    </div>
                  </div>

                  {/* CTA */}
                  <Button 
                    variant="outline" 
                    className="w-full mt-4 group-hover:bg-primary group-hover:text-white transition-colors"
                    onClick={() => setActiveVideo(testimonial.youtubeId)}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {t.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Video Modal */}
      <Dialog open={!!activeVideo} onOpenChange={() => setActiveVideo(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black border-none overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Video Testimonial</DialogTitle>
          </VisuallyHidden>
          
          <button
            onClick={() => setActiveVideo(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
            aria-label="Close video"
          >
            <X className="w-5 h-5" />
          </button>
          
          {activeVideo && (
            <div className="aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1&rel=0`}
                title="Video testimonial"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VideoTestimonials;
