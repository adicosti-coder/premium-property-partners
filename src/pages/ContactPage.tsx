import { GOOGLE_BUSINESS_PROFILE_URL } from "@/lib/orgIdentity";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import EntityDefinitionBlock from "@/components/EntityDefinitionBlock";
import BackToTop from "@/components/BackToTop";
import { MapPin, Phone, Mail, Clock, ExternalLink, Building2, Shield, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import QuickContactForm from "@/components/contact/QuickContactForm";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const BASE_URL = "https://realtrust.ro";
const GOOGLE_BUSINESS_URL = GOOGLE_BUSINESS_PROFILE_URL;
const GOOGLE_MAPS_QUERY = encodeURIComponent("Strada Samuil Micu 14, ap.4, Timișoara");
const GOOGLE_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${GOOGLE_MAPS_QUERY}`;

const ContactPage = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const faqItems = isRo
    ? [
        { q: "Care este programul agenției imobiliare RealTrust din Timișoara?", a: "Sediul RealTrust din Strada Samuil Micu Nr.14, ap.4, Timișoara este deschis Luni-Vineri 09:00-18:00 și Sâmbătă 10:00-14:00. Suport oaspeți disponibil 24/7 prin WhatsApp." },
        { q: "Aveți departamente separate pentru vânzări, închirieri și administrare?", a: "Da. Departamentul Vânzări gestionează tranzacțiile imobiliare, Departamentul Închirieri se ocupă de contracte rezidențiale, iar Departamentul Administrare operează portofoliul ApArt Hotel. Vezi toate serviciile pe pagina Servicii Imobiliare Timișoara." },
        { q: "Cum ajung la sediul RealTrust din Timișoara?", a: "Sediul este în Strada Samuil Micu Nr.14, ap.4, sector central — vis-à-vis de zona Iulius Town. Folosește butonul „Deschide în Google Maps” pentru rută." },
      ]
    : [
        { q: "What are RealTrust office hours in Timișoara?", a: "Our office at Strada Samuil Micu Nr.14, ap.4, Timișoara is open Mon-Fri 09:00-18:00 and Sat 10:00-14:00. Guest support is available 24/7 via WhatsApp." },
        { q: "Do you have separate departments for sales, rentals and management?", a: "Yes. The Sales department handles transactions, the Rentals department covers long-term residential contracts, and the Management department operates the ApArt Hotel portfolio. See all services on the Real Estate Services Timișoara page." },
        { q: "How do I get to the RealTrust office in Timișoara?", a: "The office is at Strada Samuil Micu Nr.14, ap.4, central area — near Iulius Town. Use the 'Open in Google Maps' button for directions." },
      ];

  // Visible FAQ → single consolidated FAQPage node via the provider.
  useRegisterFAQs(
    "contact",
    faqItems.map((f) => ({ question: f.q, answer: f.a })),
  );

  const jsonLdSchemas = [
    {
      "@context": "https://schema.org",
      "@type": ["RealEstateAgent", "LocalBusiness"],
      "@id": `${BASE_URL}/contact`,
      "name": "RealTrust",
      "description": isRo
        ? "Sediu RealTrust Timișoara — date contact, program și locație. Departamente: Vânzări, Închirieri, Administrare regim hotelier."
        : "RealTrust Timișoara office — contact details, hours and location. Departments: Sales, Rentals, Short-term rental management.",
      "url": `${BASE_URL}/contact`,
      "telephone": "+40799069256",
      "email": "info@realtrust.ro",
      "image": `${BASE_URL}/images/hero-optimized-800w.webp`,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Strada Samuil Micu Nr.14, ap.4",
        "addressLocality": "Timișoara",
        "addressRegion": "Timiș",
        "postalCode": "300125",
        "addressCountry": "RO",
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 45.7672,
        "longitude": 21.2495,
      },
      "openingHoursSpecification": [
        { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "18:00" },
        { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "10:00", "closes": "14:00" },
      ],
      "areaServed": [
        { "@type": "City", "name": "Timișoara" },
        { "@type": "AdministrativeArea", "name": "Județul Timiș" },
      ],
      "contactPoint": [
        {
          "@type": "ContactPoint",
          "contactType": isRo ? "Relații clienți" : "customer service",
          "telephone": "+40799069256",
          "email": "info@realtrust.ro",
          "availableLanguage": ["ro", "en"],
          "areaServed": "RO",
          "hoursAvailable": [
            { "@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "09:00", "closes": "18:00" },
            { "@type": "OpeningHoursSpecification", "dayOfWeek": "Saturday", "opens": "10:00", "closes": "14:00" },
          ],
        },
        {
          "@type": "ContactPoint",
          "contactType": isRo ? "Vânzări și investiții" : "sales",
          "telephone": "+40799069256",
          "email": "info@realtrust.ro",
          "availableLanguage": ["ro", "en"],
          "areaServed": "RO",
        },
        {
          "@type": "ContactPoint",
          "contactType": isRo ? "Suport oaspeți ApArt Hotel (24/7)" : "reservations",
          "telephone": "+40770635252",
          "email": "info@realtrust.ro",
          "availableLanguage": ["ro", "en"],
          "areaServed": "RO",
        },
      ],
      "department": [
        {
          "@type": "RealEstateAgent",
          "name": isRo ? "Departament Vânzări" : "Sales Department",
          "telephone": "+40799069256",
          "email": "info@realtrust.ro",
        },
        {
          "@type": "RealEstateAgent",
          "name": isRo ? "Departament Închirieri" : "Rentals Department",
          "telephone": "+40799069256",
          "email": "info@realtrust.ro",
        },
        {
          "@type": "LodgingBusiness",
          "name": isRo ? "Departament Administrare (ApArt Hotel)" : "Management Department (ApArt Hotel)",
          "telephone": "+40770635252",
          "email": "info@realtrust.ro",
        },
      ],
      "sameAs": [
        "https://www.facebook.com/realtrust.ro",
        "https://www.instagram.com/realtrust_timisoara",
        GOOGLE_BUSINESS_URL,
      ],
      "hasMap": GOOGLE_MAPS_URL,
      "founder": {
        "@type": "Person",
        "@id": `${BASE_URL}/despre-noi#adrian-costi`,
        "name": "Adrian Costi",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": isRo ? "Acasă" : "Home", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": isRo ? "Contact & Locație" : "Contact & Location", "item": `${BASE_URL}/contact` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={isRo ? "Contact & Locație | Management Proprietăți Timișoara — RealTrust" : "Contact & Location | Property Management Timișoara — RealTrust"}
        description={isRo
          ? "Contactează echipa RealTrust Timișoara: sediu Str. Samuil Micu 14, ap.4, telefon +40 799 069 256, hartă și program. Suntem aici pentru a te ajuta!"
          : "Contact the RealTrust Timișoara team: office Str. Samuil Micu 14, ap.4, phone +40 799 069 256, map and hours. We're here to help!"}
        url={`${BASE_URL}/contact`}
        jsonLd={jsonLdSchemas}
      />
      <Header />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 sm:px-6">
          <PageBreadcrumb
            items={[
              { label: isRo ? "Acasă" : "Home", href: "/" },
              { label: isRo ? "Contact & Locație" : "Contact & Location" },
            ]}
          />

          {/* ENTITY SEO / GEO: canonical "Ce este RealTrust?" definition */}
          <div className="mt-4 max-w-4xl mx-auto">
            <EntityDefinitionBlock pagePath="/contact" />
          </div>

          {/* Hero */}
          <section className="text-center max-w-2xl mx-auto mb-10">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-3">
              {isRo ? "Contact & Locație — Sediu RealTrust Timișoara" : "Contact & Location — RealTrust Timișoara Office"}
            </h1>
            <p className="text-base text-muted-foreground mb-5">
              {isRo
                ? "Adresă, telefon, program și hartă. Pentru detalii despre serviciile noastre, vezi pagina dedicată."
                : "Address, phone, hours and map. For details about our services, see the dedicated page."}
            </p>
            <Link to="/servicii-imobiliare" className="inline-block">
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold shadow-lg shadow-amber-500/30 gap-2"
              >
                {isRo ? "→ Toate serviciile imobiliare" : "→ All real estate services"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </section>

          {/* Quick contact cards */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <a href="tel:+40799069256" className="flex flex-col items-center p-6 bg-card border rounded-2xl hover:border-primary/50 transition-colors group">
              <Phone className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <span className="font-semibold mb-1">{isRo ? "Telefon" : "Phone"}</span>
              <span className="text-sm text-muted-foreground">0799 069 256</span>
            </a>
            <a href="https://wa.me/40770635252" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-card border rounded-2xl hover:border-primary/50 transition-colors group">
              <svg className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span className="font-semibold mb-1">WhatsApp</span>
              <span className="text-sm text-muted-foreground">+40 770 635 252</span>
            </a>
            <a href="mailto:info@realtrust.ro" className="flex flex-col items-center p-6 bg-card border rounded-2xl hover:border-primary/50 transition-colors group">
              <Mail className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <span className="font-semibold mb-1">Email</span>
              <span className="text-sm text-muted-foreground">info@realtrust.ro</span>
            </a>
            <div className="flex flex-col items-center p-6 bg-card border rounded-2xl">
              <Clock className="w-8 h-8 text-primary mb-3" />
              <span className="font-semibold mb-1">{isRo ? "Program" : "Hours"}</span>
              <span className="text-sm text-muted-foreground text-center">{isRo ? "L-V: 09-18 | S: 10-14" : "Mon-Fri: 09-18 | Sat: 10-14"}</span>
            </div>
          </section>

          {/* Departments */}
          <section className="max-w-4xl mx-auto mb-12">
            <h2 className="text-2xl font-serif font-semibold text-center mb-6">
              {isRo ? "Contact pe Departamente" : "Contact by Department"}
            </h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-5 bg-card border rounded-2xl">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />{isRo ? "Vânzări" : "Sales"}</h3>
                <a href="tel:+40799069256" className="text-sm text-primary hover:underline block">+40 799 069 256</a>
                <a href="mailto:info@realtrust.ro" className="text-sm text-primary hover:underline">info@realtrust.ro</a>
              </div>
              <div className="p-5 bg-card border rounded-2xl">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />{isRo ? "Închirieri" : "Rentals"}</h3>
                <a href="tel:+40799069256" className="text-sm text-primary hover:underline block">+40 799 069 256</a>
                <a href="mailto:info@realtrust.ro" className="text-sm text-primary hover:underline">info@realtrust.ro</a>
              </div>
              <div className="p-5 bg-card border rounded-2xl">
                <h3 className="font-semibold mb-2 flex items-center gap-2"><Star className="w-5 h-5 text-primary" />{isRo ? "Administrare" : "Management"}</h3>
                <a href="tel:+40770635252" className="text-sm text-primary hover:underline block">+40 770 635 252</a>
                <a href="mailto:info@realtrust.ro" className="text-sm text-primary hover:underline">info@realtrust.ro</a>
              </div>
            </div>
          </section>

          {/* Map + Address */}
          <section className="grid lg:grid-cols-2 gap-8 mb-12">
            <div className="rounded-2xl overflow-hidden border aspect-[4/3] lg:aspect-auto">
              <iframe
                src={`https://maps.google.com/maps?q=${GOOGLE_MAPS_QUERY}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: 300 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={isRo ? "Sediul RealTrust pe hartă" : "RealTrust office on map"}
              />
            </div>
            <div className="flex flex-col justify-center space-y-6">
              <div>
                <h2 className="text-2xl font-serif font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  {isRo ? "Sediu Fizic" : "Physical Office"}
                </h2>
                <address className="not-italic text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">RealTrust & ApArt Hotel</p>
                  <p>Strada Samuil Micu Nr.14, ap.4</p>
                  <p>Timișoara, Timiș 300125</p>
                  <p>România</p>
                </address>
              </div>
              <ul className="text-sm space-y-1">
                <li className="flex justify-between"><span className="text-muted-foreground">{isRo ? "Luni – Vineri" : "Monday – Friday"}</span><span className="font-medium">09:00 – 18:00</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">{isRo ? "Sâmbătă" : "Saturday"}</span><span className="font-medium">10:00 – 14:00</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">{isRo ? "Duminică" : "Sunday"}</span><span className="font-medium">{isRo ? "Doar urgențe" : "Emergencies only"}</span></li>
              </ul>
              <div className="flex flex-wrap gap-2">
                <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="w-4 h-4" />
                    {isRo ? "Deschide în Google Maps" : "Open in Google Maps"}
                  </Button>
                </a>
                <a href={GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <Star className="w-4 h-4" />
                    {isRo ? "Profil Google" : "Google Profile"}
                  </Button>
                </a>
              </div>
            </div>
          </section>

          {/* Quick Contact Form */}
          <section id="formular" className="max-w-2xl mx-auto mb-12 scroll-mt-24">
            <QuickContactForm />
          </section>

          {/* FAQ — short */}
          <section className="max-w-3xl mx-auto mb-12">
            <h2 className="text-2xl font-serif font-semibold mb-6 text-center">
              {isRo ? "Întrebări Frecvente" : "Frequently Asked Questions"}
            </h2>
            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <details key={i} className="group p-5 bg-card border rounded-2xl open:border-primary/40">
                  <summary className="cursor-pointer font-semibold list-none flex justify-between items-center gap-4">
                    <span>{item.q}</span>
                    <span className="text-primary text-xl transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
            <p className="text-center text-sm text-muted-foreground mt-6">
              {isRo ? "Cauți detalii despre servicii? " : "Looking for service details? "}
              <Link to="/servicii-imobiliare" className="text-primary hover:underline font-medium">
                {isRo ? "Vezi pagina Servicii Imobiliare Timișoara" : "See the Real Estate Services Timișoara page"}
              </Link>
            </p>
          </section>
        </div>
      </main>

      <Suspense fallback={null}>
        <GlobalConversionWidgets />
      </Suspense>
      <Footer />
      <BackToTop />
    </div>
  );
};

export default ContactPage;
