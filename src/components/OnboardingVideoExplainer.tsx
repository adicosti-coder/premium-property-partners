import { Play, ArrowRight, FileText } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Replace with your actual YouTube video ID
const YOUTUBE_VIDEO_ID = "dQw4w9WgXcQ";

const OnboardingVideoExplainer = () => {
  const { language } = useLanguage();
  const { ref: sectionRef, isVisible } = useScrollAnimation({ threshold: 0.1 });
  const [showEmbed, setShowEmbed] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  const content = {
    ro: {
      label: "Tur Rapid",
      title: "Vezi Cum Funcționează",
      titleHighlight: "Procesul de Onboarding",
      subtitle: "De la prima evaluare la primul oaspete — un proces simplu, rapid și complet gestionat de echipa noastră.",
      playBtn: "Pornește Video",
      ctaText: "Începe Onboarding-ul Gratuit",
      ctaSubtext: "Evaluare gratuită • Fără obligații • Răspuns în 24h",
      transcriptTitle: "Citește Transcriptul Video",
      transcript: [
        {
          time: "0:00",
          heading: "Pasul 1 — Evaluare Gratuită",
          text: "Totul începe cu o evaluare gratuită a proprietății tale. Echipa noastră analizează locația, dotările și potențialul de venit al apartamentului. În mai puțin de 24 de ore primești o estimare personalizată a venitului lunar pe care îl poți obține.",
        },
        {
          time: "0:15",
          heading: "Pasul 2 — Pregătire & Listare",
          text: "Odată ce decizi să colaborăm, ne ocupăm de tot: fotografii profesionale, descrieri optimizate, listare pe Booking.com, Airbnb și alte platforme majore. Instalăm self check-in digital și configurăm prețurile dinamice pentru a maximiza ocuparea.",
        },
        {
          time: "0:30",
          heading: "Pasul 3 — Încasezi Venituri",
          text: "Din acest moment, echipa noastră gestionează complet proprietatea: comunicare cu oaspeții, curățenie profesională, mentenanță și rapoarte financiare transparente. Tu primești banii direct în cont, lunar, fără bătăi de cap.",
        },
      ],
    },
    en: {
      label: "Quick Tour",
      title: "See How the",
      titleHighlight: "Onboarding Process Works",
      subtitle: "From the first evaluation to the first guest — a simple, fast process fully managed by our team.",
      playBtn: "Play Video",
      ctaText: "Start Free Onboarding",
      ctaSubtext: "Free evaluation • No obligations • Response in 24h",
      transcriptTitle: "Read the Video Transcript",
      transcript: [
        {
          time: "0:00",
          heading: "Step 1 — Free Evaluation",
          text: "Everything starts with a free evaluation of your property. Our team analyzes the location, amenities, and income potential. In less than 24 hours, you receive a personalized estimate of the monthly income you can generate.",
        },
        {
          time: "0:15",
          heading: "Step 2 — Setup & Listing",
          text: "Once you decide to partner with us, we handle everything: professional photography, optimized descriptions, listing on Booking.com, Airbnb, and other major platforms. We install digital self check-in and configure dynamic pricing to maximize occupancy.",
        },
        {
          time: "0:30",
          heading: "Step 3 — Earn Income",
          text: "From this point, our team fully manages the property: guest communication, professional cleaning, maintenance, and transparent financial reports. You receive money directly in your account, monthly, hassle-free.",
        },
      ],
    },
  };

  const t = content[language as keyof typeof content] || content.ro;

  const scrollToCalculator = () => {
    const el = document.getElementById("calculator");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      language === "ro"
        ? "Bună ziua! Vreau să încep procesul de onboarding pentru apartamentul meu."
        : "Hello! I'd like to start the onboarding process for my apartment."
    );
    window.open(`https://wa.me/40723154520?text=${message}`, "_blank");
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

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Video Embed */}
          <div
            className={`transition-all duration-700 ${
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
                <button
                  onClick={() => setShowEmbed(true)}
                  className="absolute inset-0 w-full h-full group cursor-pointer"
                  aria-label={t.playBtn}
                >
                  <img
                    src={`https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/maxresdefault.jpg`}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
                      <Play className="w-8 h-8 text-primary-foreground ml-1" />
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Prominent CTA */}
          <div
            className={`text-center transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            <Button
              variant="hero"
              size="xl"
              onClick={handleWhatsApp}
              className="group bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold border-0 shadow-lg shadow-amber-500/20"
            >
              {t.ctaText}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <p className="text-muted-foreground text-sm mt-3">{t.ctaSubtext}</p>
          </div>

          {/* Transcript */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "500ms" }}
          >
            <Collapsible open={transcriptOpen} onOpenChange={setTranscriptOpen}>
              <CollapsibleTrigger className="w-full flex items-center justify-center gap-2 py-3 text-muted-foreground hover:text-foreground transition-colors group">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">{t.transcriptTitle}</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${transcriptOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 rounded-2xl bg-card border border-border p-6 md:p-8 space-y-6">
                  {t.transcript.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center justify-center w-14 h-7 rounded-full bg-primary/10 text-primary text-xs font-mono font-semibold">
                          {item.time}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground mb-1">{item.heading}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OnboardingVideoExplainer;
