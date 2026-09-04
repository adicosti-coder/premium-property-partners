import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * Interactive coverage map for owner-focused page.
 * Lists all Timișoara neighborhoods (incl. Mehala, Freidorf) where we operate.
 * Uses an embedded Google Maps iframe for an interactive geographic signal.
 */
const OwnerCoverageMap = () => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";

  // LCP optimization: only mount the heavy Google Maps iframe when the
  // map container is about to enter the viewport. Until then we render a
  // lightweight placeholder so the page stays fast on mobile.
  const mapRef = useRef<HTMLDivElement>(null);
  const [showIframe, setShowIframe] = useState(false);
  useEffect(() => {
    const el = mapRef.current;
    if (!el || showIframe) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShowIframe(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [showIframe]);

  const neighborhoods = [
    "Centrul Istoric",
    "Iosefin",
    "Elisabetin",
    "Cetate",
    "Fabric",
    "Complex Studențesc",
    "Circumvalațiunii",
    "Aradului",
    "Lipovei",
    "Take Ionescu",
    "Mehala",
    "Freidorf",
    "Calea Șagului",
    "Dumbrăvița",
    "Giroc",
    "ISHO",
    "Openville",
    "Ateneo",
  ];

  const t = {
    ro: {
      badge: "Acoperire locală completă",
      title: "Administrăm proprietăți în toate cartierele Timișoarei",
      subtitle:
        "De la centrul istoric (Cetate, Iosefin, Elisabetin) până la zonele rezidențiale noi (Dumbrăvița, Giroc) și cartiere istorice precum Mehala sau zona industrială Freidorf — operăm pe toată harta orașului.",
      mapTitle: "Hartă zone de operare RealTrust — Timișoara",
      cta: "Vezi proprietăți pe ansambluri",
    },
    en: {
      badge: "Full local coverage",
      title: "We manage properties in every Timișoara neighborhood",
      subtitle:
        "From the historic center (Cetate, Iosefin, Elisabetin) to new residential zones (Dumbrăvița, Giroc) and historic districts like Mehala or the Freidorf industrial area — we operate across the entire city map.",
      mapTitle: "RealTrust operating zones map — Timișoara",
      cta: "Browse properties by complex",
    },
  }[lang];

  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            <MapPin className="w-4 h-4" />
            {t.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid gap-6 lg:gap-8 lg:grid-cols-[2fr_1fr] max-w-6xl mx-auto items-start">
          {/* Interactive map - mobile-friendly height, deferred iframe for LCP */}
          <div
            ref={mapRef}
            className="relative rounded-2xl overflow-hidden border border-border shadow-elegant h-[280px] sm:h-[360px] lg:h-[480px] bg-muted"
          >
            {showIframe ? (
              <iframe
                title={t.mapTitle}
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d22245.55!2d21.226!3d45.756!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x474567667be8a5cf%3A0x1f5ad8caf058b49a!2sTimi%C8%99oara!5e0!3m2!1sro!2sro!4v1700000000000"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <MapPin className="w-8 h-8 text-primary/60" />
                  <span className="text-sm">{t.mapTitle}</span>
                </div>
              </div>
            )}
          </div>

          {/* Neighborhoods list - scrollable on mobile to avoid overflow */}
          <div className="rounded-2xl bg-card border border-border p-5 sm:p-6 w-full">
            <h3 className="text-base sm:text-lg font-serif font-semibold text-foreground mb-4">
              {lang === "ro" ? "Cartiere acoperite" : "Covered neighborhoods"}
            </h3>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-2 mb-5 max-h-[260px] lg:max-h-none overflow-y-auto pr-1">
              {neighborhoods.map((n) => (
                <li
                  key={n}
                  className="flex items-center gap-1.5 text-sm text-foreground/80 min-w-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">{n}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/cartiere"
              className="inline-flex items-center text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              {t.cta} →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OwnerCoverageMap;
