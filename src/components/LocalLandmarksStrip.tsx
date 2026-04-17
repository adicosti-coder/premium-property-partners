import { useLanguage } from "@/i18n/LanguageContext";
import { Link } from "react-router-dom";
import { MapPin, GraduationCap, ShoppingBag, Trees, Plane } from "lucide-react";

/**
 * SEO-focused homepage strip — mentions Timișoara local entities & landmarks
 * (UVT, UPT, UMF, Iulius Town, Shopping City, Parcul Rozelor, Parcul Central)
 * with explicit proximity signals and links to neighborhood detail pages.
 */
export function LocalLandmarksStrip() {
  const { language } = useLanguage();
  const ro = language === "ro";

  const cards = [
    {
      slug: "complex-studentesc",
      icon: GraduationCap,
      title: ro
        ? "Apartamente regim hotelier lângă UVT, UPT și UMF"
        : "Short-term apartments near UVT, UPT and UMF",
      desc: ro
        ? "Complexul Studențesc Timișoara — la câțiva pași de Universitatea de Vest, Politehnica și Medicina. Cerere constantă din partea studenților, profesorilor și participanților la conferințe academice."
        : "Student Complex Timișoara — steps from West University, Politehnica and Medicine. Constant demand from students, professors and academic conference attendees.",
    },
    {
      slug: "iosefin",
      icon: Trees,
      title: ro
        ? "Apartamente Iosefin — lângă Bega și Piața Unirii"
        : "Iosefin apartments — near Bega and Piața Unirii",
      desc: ro
        ? "Cartier istoric cu arhitectură habsburgică, la 8 minute pietonal de Piața Unirii. Aproape de Catedrala Romano-Catolică, Sinagogă și malul Begăi. Tramvai direct spre Iulius Town."
        : "Historic Habsburg-era neighborhood, 8 min walk to Piața Unirii. Near the Roman Catholic Cathedral, Synagogue and Bega riverbank. Direct tram to Iulius Town.",
    },
    {
      slug: "elisabetin",
      icon: Trees,
      title: ro
        ? "Apartamente Elisabetin — lângă Parcul Rozelor"
        : "Elisabetin apartments — next to Rose Park",
      desc: ro
        ? "Cartier rezidențial premium cu vile interbelice, la 5 minute de Parcul Rozelor și 10 minute pietonal de Piața Victoriei. Tramvai direct către UVT."
        : "Premium residential neighborhood with interwar villas, 5 min from Rose Park and 10 min walk to Piața Victoriei. Direct tram to UVT.",
    },
    {
      slug: "isho",
      icon: ShoppingBag,
      title: ro
        ? "Apartamente ISHO & Fabric — lângă Iulius Town"
        : "ISHO & Fabric apartments — near Iulius Town",
      desc: ro
        ? "Complex iconic mixed-use pe malul Begăi, la 7 minute de Iulius Town și Openville. Profil premium, cerere ridicată din partea profesioniștilor IT și a turiștilor de business."
        : "Iconic mixed-use complex on Bega riverbank, 7 min to Iulius Town and Openville. Premium demand from IT pros and business travelers.",
    },
    {
      slug: "circumvalatiunii",
      icon: ShoppingBag,
      title: ro
        ? "Cazare lângă Shopping City Timișoara"
        : "Stays near Shopping City Timișoara",
      desc: ro
        ? "Calea Circumvalațiunii — acces rapid la Shopping City Timișoara, Parcul Rozelor și Bega Shopping Center. Tramvai și autobuz la sub 100m, ocupare 90%+ în regim hotelier."
        : "Calea Circumvalațiunii — quick access to Shopping City Timișoara, Rose Park and Bega Shopping Center. Tram and bus under 100m, 90%+ occupancy in short-term rental.",
    },
    {
      slug: "zona-aradului",
      icon: Plane,
      title: ro
        ? "Apartamente Aradului — la 10 min de aeroport"
        : "Aradului apartments — 10 min from airport",
      desc: ro
        ? "Calea Aradului — acces direct la Aeroportul Internațional Traian Vuia și autostrada A1. Aproape de Iulius Town și Openville, ideal pentru investitori și călători de business."
        : "Calea Aradului — direct access to Traian Vuia Airport and A1 highway. Near Iulius Town and Openville, ideal for investors and business travelers.",
    },
  ];

  return (
    <section
      className="w-full bg-background py-10 md:py-14"
      aria-labelledby="local-landmarks-heading"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 xl:px-12">
        <div className="text-center mb-8 md:mb-10 max-w-3xl mx-auto">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-primary mb-2">
            {ro ? "Local SEO Timișoara" : "Local SEO Timișoara"}
          </span>
          <h2
            id="local-landmarks-heading"
            className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-foreground mb-3"
          >
            {ro
              ? "Apartamente regim hotelier Timișoara — investiții imobiliare în cartierele cheie"
              : "Short-term rental apartments Timișoara — real estate investments in key neighborhoods"}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            {ro
              ? "Proprietăți selectate în Complexul Studențesc, Iosefin, Elisabetin, ISHO și Aradului — aproape de UVT, UPT, UMF, Iulius Town, Shopping City Timișoara și Parcul Rozelor."
              : "Selected properties in Student Complex, Iosefin, Elisabetin, ISHO and Aradului — near UVT, UPT, UMF, Iulius Town, Shopping City Timișoara and Rose Park."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Link
                key={c.slug}
                to={`/imobiliare-timisoara/${c.slug}`}
                className="group block rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors leading-snug">
                    {c.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {c.desc}
                </p>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                  <MapPin className="w-3.5 h-3.5" />
                  {ro ? "Vezi proprietăți →" : "View properties →"}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default LocalLandmarksStrip;
