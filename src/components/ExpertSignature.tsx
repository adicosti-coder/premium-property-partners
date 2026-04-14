import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/i18n/LanguageContext";
import { ExternalLink, Award } from "lucide-react";

interface ExpertSignatureProps {
  authorName?: string;
  className?: string;
}

const ExpertSignature = ({ authorName, className = "" }: ExpertSignatureProps) => {
  const { language } = useLanguage();

  const expert = {
    name: "Adrian Costi",
    title: language === "ro" ? "Fondator & CEO, RealTrust" : "Founder & CEO, RealTrust",
    certification: language === "ro"
      ? "Consultant Imobiliar Autorizat · Expert în Investiții Regim Hotelier"
      : "Certified Real Estate Consultant · Short-Term Rental Investment Expert",
    linkedin: "https://www.linkedin.com/in/costi-adrian-2b50931a",
    bio: language === "ro"
      ? "Cu peste 8 ani de experiență în administrarea proprietăților în regim hotelier și un portofoliu gestionat cu randament mediu de 9.4%, Adrian oferă consultanță bazată pe date reale de piață din Timișoara."
      : "With over 8 years of experience managing short-term rental properties and a managed portfolio averaging 9.4% yields, Adrian provides consulting based on real market data from Timișoara.",
  };

  // Show the signature only when the article author matches or use default
  const displayName = authorName || expert.name;
  const isMainExpert = !authorName || authorName.toLowerCase().includes("realtrust") || authorName.toLowerCase().includes("adrian");

  // E-E-A-T Person Schema
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": expert.name,
    "jobTitle": "Fondator & CEO",
    "worksFor": {
      "@type": "Organization",
      "name": "RealTrust & ApArt Hotel Timișoara",
      "url": "https://www.realtrust.ro",
    },
    "sameAs": [expert.linkedin],
    "knowsAbout": [
      "Real Estate Investment",
      "Short-Term Rental Management",
      "Property Management Timișoara",
      "Hospitality Industry",
      "ROI Analysis",
    ],
    "hasCredential": {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "Professional Certification",
      "name": "Consultant Imobiliar Autorizat",
    },
  };

  return (
    <div className={`border-t border-border pt-6 mt-8 ${className}`}>
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(personSchema)}</script>
      </Helmet>

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 border-2 border-primary/20">
          <span className="text-xl font-serif font-bold text-primary">
            {expert.name.split(" ").map((n) => n[0]).join("")}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground">{isMainExpert ? expert.name : displayName}</span>
            <Award className="w-4 h-4 text-primary" />
            {isMainExpert && (
              <a
                href={expert.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                LinkedIn <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{expert.title}</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
            <Award className="w-3 h-3" />
            {expert.certification}
          </p>
          {isMainExpert && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{expert.bio}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExpertSignature;
