import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import { Building2, MapPin, Home, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import apt01 from "@/assets/apt-01.jpg";
import apt02 from "@/assets/apt-02.jpg";
import apt03 from "@/assets/apt-03.jpg";
import apt04 from "@/assets/apt-04.jpg";
import apt05 from "@/assets/apt-05.jpg";
import apt06 from "@/assets/apt-06.jpg";

interface Complex {
  id: number;
  name: string;
  location: string;
  propertyCount: number;
  images: string[];
  descriptionRo: string;
  descriptionEn: string;
}

const complexes: Complex[] = [
  {
    id: 1,
    name: "Iosefin Residence",
    location: "Iosefin, Timișoara",
    propertyCount: 4,
    images: [apt01, apt02, apt03],
    descriptionRo: "Complex rezidențial modern în inima cartierului Iosefin, cu apartamente premium complet mobilate.",
    descriptionEn: "Modern residential complex in the heart of Iosefin neighborhood, with fully furnished premium apartments.",
  },
  {
    id: 2,
    name: "Central Park Living",
    location: "Ultracentral, Timișoara",
    propertyCount: 5,
    images: [apt04, apt05, apt06],
    descriptionRo: "Apartamente de lux în zona ultracentral, la câțiva pași de Piața Victoriei.",
    descriptionEn: "Luxury apartments in the city center, steps away from Victory Square.",
  },
  {
    id: 3,
    name: "Dacia Premium",
    location: "Dacia, Timișoara",
    propertyCount: 2,
    images: [apt02, apt04, apt01],
    descriptionRo: "Clădire renovată complet cu apartamente spațioase și parcare privată.",
    descriptionEn: "Fully renovated building with spacious apartments and private parking.",
  },
];

const ResidentialComplexes = () => {
  const { t, language } = useLanguage();
  const { ref: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { ref: carouselRef, isVisible: carouselVisible } = useScrollAnimation({ threshold: 0.1 });

  const translations = {
    ro: {
      label: "Complexe Rezidențiale",
      title: "Administrăm Clădiri",
      titleHighlight: "Complete",
      subtitle: "Nu doar apartamente individuale – gestionăm portofolii întregi de proprietăți în cele mai căutate zone din Timișoara.",
      properties: "proprietăți",
      viewAll: "Vezi Toate Proprietățile",
    },
    en: {
      label: "Residential Complexes",
      title: "We Manage Complete",
      titleHighlight: "Buildings",
      subtitle: "Not just individual apartments – we manage entire property portfolios in Timișoara's most sought-after areas.",
      properties: "properties",
      viewAll: "View All Properties",
    },
  };

  const text = translations[language as keyof typeof translations] || translations.ro;

  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-20 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <div
          ref={headerRef}
          className={`text-center mb-16 transition-all duration-700 ${
            headerVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4 flex items-center justify-center gap-2">
            <Building2 className="w-4 h-4" />
            {text.label}
          </p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {text.title} <span className="text-gradient-gold">{text.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{text.subtitle}</p>
        </div>

        {/* Complexes Carousel */}
        <div
          ref={carouselRef}
          className={`max-w-6xl mx-auto transition-all duration-700 ${
            carouselVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {complexes.map((complex) => (
                <CarouselItem key={complex.id} className="pl-4 md:basis-1/2 lg:basis-1/2">
                  <div className="group bg-card rounded-2xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant h-full">
                    {/* Image Carousel for each complex */}
                    <div className="relative h-64 overflow-hidden">
                      <Carousel opts={{ loop: true }} className="w-full h-full">
                        <CarouselContent className="h-full -ml-0">
                          {complex.images.map((image, idx) => (
                            <CarouselItem key={idx} className="pl-0 h-full">
                              <img
                                src={image}
                                alt={`${complex.name} - ${idx + 1}`}
                                className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                            </CarouselItem>
                          ))}
                        </CarouselContent>
                        <CarouselPrevious className="left-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CarouselNext className="right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Carousel>

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />

                      {/* Location badge */}
                      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-medium text-foreground">{complex.location}</span>
                      </div>

                      {/* Property count badge */}
                      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-sm flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-primary-foreground" />
                        <span className="text-xs font-bold text-primary-foreground">
                          {complex.propertyCount} {text.properties}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                        {complex.name}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {language === "en" ? complex.descriptionEn : complex.descriptionRo}
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <div className="flex justify-center gap-2 mt-6">
              <CarouselPrevious className="static translate-y-0 h-10 w-10" />
              <CarouselNext className="static translate-y-0 h-10 w-10" />
            </div>
          </Carousel>
        </div>

        {/* CTA */}
        <div
          className={`text-center mt-12 transition-all duration-700 delay-300 ${
            carouselVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Button
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8"
          >
            <a href="#portofoliu">{text.viewAll}</a>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ResidentialComplexes;
