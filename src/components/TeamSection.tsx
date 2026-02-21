import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Linkedin, Mail } from "lucide-react";

import ceoImage from "@/assets/team/ceo.jpg";
import propertyManagerImage from "@/assets/team/property-manager.jpg";
import operationsImage from "@/assets/team/operations.jpg";
import guestRelationsImage from "@/assets/team/guest-relations.jpg";

interface TeamMember {
  name: string;
  role: string;
  description: string;
  image: string;
  linkedin?: string;
  email?: string;
}

const TeamSection = () => {
  const { language } = useLanguage();
  const animation = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Echipa Noastră",
      title: "Oamenii din Spatele",
      titleHighlight: "Succesului",
      subtitle: "O echipă dedicată care transformă viziunea în realitate, zi de zi.",
      team: [
        {
          name: "Adrian Costea",
          role: "Fondator & CEO",
          description: "Cu peste 10 ani de experiență în imobiliare, Adrian a fondat RealTrust & ApArt Hotel cu viziunea de a aduce standarde internaționale în piața din Timișoara.",
          image: ceoImage,
          linkedin: "#",
          email: "adrian@realtrust.ro"
        },
        {
          name: "Maria Popescu",
          role: "Manager Proprietăți",
          description: "Maria coordonează toate proprietățile din portofoliu, asigurând că fiecare apartament întrunește standardele noastre de excelență.",
          image: propertyManagerImage,
          linkedin: "#",
          email: "maria@realtrust.ro"
        },
        {
          name: "Andrei Mureșan",
          role: "Coordonator Operațiuni",
          description: "Andrei supervizează operațiunile zilnice, de la curățenie la mentenanță, garantând experiențe impecabile pentru fiecare oaspete.",
          image: operationsImage,
          linkedin: "#",
          email: "andrei@realtrust.ro"
        },
        {
          name: "Elena Ionescu",
          role: "Specialist Relații Oaspeți",
          description: "Elena este primul punct de contact pentru oaspeți, oferind suport 24/7 și asigurând că fiecare ședere este memorabilă.",
          image: guestRelationsImage,
          linkedin: "#",
          email: "elena@realtrust.ro"
        }
      ]
    },
    en: {
      badge: "Our Team",
      title: "The People Behind",
      titleHighlight: "Success",
      subtitle: "A dedicated team that transforms vision into reality, day by day.",
      team: [
        {
          name: "Adrian Costea",
          role: "Founder & CEO",
          description: "With over 10 years of real estate experience, Adrian founded RealTrust & ApArt Hotel with the vision of bringing international standards to the Timișoara market.",
          image: ceoImage,
          linkedin: "#",
          email: "adrian@realtrust.ro"
        },
        {
          name: "Maria Popescu",
          role: "Property Manager",
          description: "Maria coordinates all properties in the portfolio, ensuring that each apartment meets our standards of excellence.",
          image: propertyManagerImage,
          linkedin: "#",
          email: "maria@realtrust.ro"
        },
        {
          name: "Andrei Mureșan",
          role: "Operations Coordinator",
          description: "Andrei oversees daily operations, from cleaning to maintenance, guaranteeing impeccable experiences for every guest.",
          image: operationsImage,
          linkedin: "#",
          email: "andrei@realtrust.ro"
        },
        {
          name: "Elena Ionescu",
          role: "Guest Relations Specialist",
          description: "Elena is the first point of contact for guests, providing 24/7 support and ensuring every stay is memorable.",
          image: guestRelationsImage,
          linkedin: "#",
          email: "elena@realtrust.ro"
        }
      ]
    }
  };

  const t = content[language];

  return (
    <section className="py-20 md:py-28 bg-background">
      <div
        ref={animation.ref}
        className={`container mx-auto px-4 transition-all duration-700 ${
          animation.isVisible
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-6 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
            <Users className="w-4 h-4 mr-2 text-primary" />
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

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {t.team.map((member: TeamMember, index: number) => (
            <Card 
              key={index} 
              className="group overflow-hidden hover:shadow-xl transition-all duration-500 border-2 hover:border-primary/30"
            >
              <div className="relative overflow-hidden">
                <img
                  src={member.image}
                  alt={member.name}
                  loading="lazy"
                  decoding="async"
                  width={400}
                  height={400}
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Social links overlay */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-4 group-hover:translate-y-0">
                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                      aria-label={`${member.name} LinkedIn`}
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {member.email && (
                    <a
                      href={`mailto:${member.email}`}
                      className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                      aria-label={`Email ${member.name}`}
                    >
                      <Mail className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
              
              <CardContent className="p-6 text-center">
                <h3 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                  {member.name}
                </h3>
                <p className="text-sm font-medium text-primary mb-3">
                  {member.role}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {member.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;
