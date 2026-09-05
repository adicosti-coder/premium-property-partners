import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Clock, Linkedin, Mail, ShieldCheck, TrendingUp, Users } from "lucide-react";

import ceoImageAsset from "@/assets/adrian-costi-founder.png.asset.json";
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

interface StatItem {
  value: string;
  suffix: string;
  label: string;
  icon: "clock" | "trending" | "shield";
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
      statsTitle: "Cifrele care ne definesc",
      quoteLabel: "Filosofia fondatorului",
      team: [
        {
          name: "Adrian Costi",
          role: "Fondator & CEO",
          description: "Cu peste 25 de ani în tranzacții și administrare de proprietăți în Timișoara, Adrian a fondat RealTrust & ApArt Hotel pentru a oferi proprietarilor un model complet: de la închiriere pe termen lung la regim hotelier la standard de boutique hotel.",
          image: ceoImageAsset.url,
          linkedin: "https://www.linkedin.com/in/costi-adrian-2b50931a",
          email: "adrian@realtrust.ro"
        }
      ],
      founderStats: [
        { value: "25+", suffix: "", label: "Ani experiență în imobiliare Timișoara", icon: "clock" as const },
        { value: "9.4", suffix: "%", label: "Randament mediu net pentru proprietari", icon: "trending" as const },
        { value: "100", suffix: "%", label: "Administrare completă, de la A la Z", icon: "shield" as const },
      ],
      founderQuote:
        "„Preferăm un portofoliu restrâns și înalt performant, unde fiecare apartament primește atenția directă pe care ar primi-o într-un hotel de top, decât administrarea superficială a sute de unități.\"",
    },
    en: {
      badge: "Our Team",
      title: "The People Behind",
      titleHighlight: "Success",
      subtitle: "A dedicated team that transforms vision into reality, day by day.",
      statsTitle: "The numbers that define us",
      quoteLabel: "Founder's philosophy",
      team: [
        {
          name: "Adrian Costi",
          role: "Founder & CEO",
          description: "With over 25 years in real estate transactions and property management in Timișoara, Adrian founded RealTrust & ApArt Hotel to give owners a complete model: from long-term rentals to boutique-hotel-standard short-term operations.",
          image: ceoImageAsset.url,
          linkedin: "https://www.linkedin.com/in/costi-adrian-2b50931a",
          email: "adrian@realtrust.ro"
        }
      ],
      founderStats: [
        { value: "25+", suffix: "", label: "Years of real estate experience in Timișoara", icon: "clock" as const },
        { value: "9.4", suffix: "%", label: "Average net yield for owners", icon: "trending" as const },
        { value: "100", suffix: "%", label: "End-to-end management, from A to Z", icon: "shield" as const },
      ],
      founderQuote:
        '"We prefer a small, high-performing portfolio where every apartment receives the direct attention it would get in a top hotel, rather than the superficial management of hundreds of units."',
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
                  alt={`${member.name}, ${member.role} — echipa RealTrust Timișoara`}
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
                {member.name === "Adrian Costi" && (
                  <a
                    href="/autor/adrian-costi"
                    className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
                  >
                    {language === "en"
                      ? "Author profile & published guides"
                      : "Profil de autor și ghiduri publicate"}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-12 border-primary/15">
          <CardContent className="p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-xl font-bold mb-4">{t.statsTitle}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {t.founderStats.map((stat: StatItem, idx: number) => {
                    const Icon = stat.icon === "clock" ? Clock : stat.icon === "trending" ? TrendingUp : ShieldCheck;
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border border-primary/15 bg-primary/5 p-4 text-center"
                      >
                        <Icon className="w-6 h-6 text-primary mx-auto mb-2" aria-hidden="true" />
                        <p className="text-3xl font-extrabold text-primary mb-1">
                          {stat.value}{stat.suffix}
                        </p>
                        <p className="text-sm text-muted-foreground leading-snug">{stat.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <blockquote className="relative rounded-lg border-l-4 border-primary bg-muted/40 p-5">
                <Award className="w-6 h-6 text-primary/40 mb-2" aria-hidden="true" />
                <p className="text-base md:text-lg font-medium italic text-foreground">{t.founderQuote}</p>
                <footer className="mt-3 text-sm font-semibold text-primary">— Adrian Costi</footer>
              </blockquote>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default TeamSection;
