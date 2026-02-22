import { Play, Pause } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useRef, useState } from "react";

const OnboardingVideoExplainer = () => {
  const { language } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const content = {
    ro: {
      label: "Tur Rapid",
      title: "Vezi Cum Funcționează",
      titleHighlight: "Procesul de Onboarding",
      subtitle: "De la prima evaluare la primul oaspete — un proces simplu, rapid și complet gestionat de echipa noastră.",
      playBtn: "Pornește Video",
      pauseBtn: "Pauză",
    },
    en: {
      label: "Quick Tour",
      title: "See How the",
      titleHighlight: "Onboarding Process Works",
      subtitle: "From the first evaluation to the first guest — a simple, fast process fully managed by our team.",
      playBtn: "Play Video",
      pauseBtn: "Pause",
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

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

        {/* Video Player */}
        <div
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
          style={{ transitionDelay: "200ms" }}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-elegant border border-border group">
            <video
              ref={videoRef}
              src="/videos/onboarding-process.mp4"
              className="w-full aspect-video object-cover"
              loop
              muted
              playsInline
              preload="metadata"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Play/Pause overlay */}
            <button
              onClick={togglePlay}
              className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
                isPlaying
                  ? "bg-black/0 hover:bg-black/20 opacity-0 hover:opacity-100"
                  : "bg-black/30"
              }`}
              aria-label={isPlaying ? t.pauseBtn : t.playBtn}
            >
              <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-110">
                {isPlaying ? (
                  <Pause className="w-8 h-8 text-primary-foreground" />
                ) : (
                  <Play className="w-8 h-8 text-primary-foreground ml-1" />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OnboardingVideoExplainer;
