import { Play } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState } from "react";

// Replace this with your actual YouTube or Vimeo video ID
const YOUTUBE_VIDEO_ID = "dQw4w9WgXcQ"; // placeholder — swap with your real video ID
// For Vimeo, set: const VIMEO_VIDEO_ID = "123456789";

const OnboardingVideoExplainer = () => {
  const { language } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const [showEmbed, setShowEmbed] = useState(false);

  const content = {
    ro: {
      label: "Tur Rapid",
      title: "Vezi Cum Funcționează",
      titleHighlight: "Procesul de Onboarding",
      subtitle: "De la prima evaluare la primul oaspete — un proces simplu, rapid și complet gestionat de echipa noastră.",
      playBtn: "Pornește Video",
    },
    en: {
      label: "Quick Tour",
      title: "See How the",
      titleHighlight: "Onboarding Process Works",
      subtitle: "From the first evaluation to the first guest — a simple, fast process fully managed by our team.",
      playBtn: "Play Video",
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  return (
    <section className="section-padding bg-background">
      <div className="container mx-auto px-6 lg:px-8">
        {/* Header */}
        <div
          ref={sectionRef}
          className={`text-center section-header-spacing transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4 font-sans">
            {t.label}
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-6">
            {t.title}{" "}
            <span className="text-gradient-gold">{t.titleHighlight}</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-premium">
            {t.subtitle}
          </p>
        </div>

        {/* Video Embed */}
        <div
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-elegant border border-border aspect-video">
            {showEmbed ? (
              <iframe
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`}
                title="Onboarding Process Walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            ) : (
              /* Thumbnail with play button — loads iframe on click for performance */
              <button
                onClick={() => setShowEmbed(true)}
                className="absolute inset-0 w-full h-full group cursor-pointer"
                aria-label={t.playBtn}
              >
                {/* YouTube thumbnail */}
                <img
                  src={`https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />
                {/* Play button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                    <Play className="w-8 h-8 text-primary-foreground ml-1" />
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default OnboardingVideoExplainer;
