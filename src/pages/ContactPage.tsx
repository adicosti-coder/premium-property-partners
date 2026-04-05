import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { MapPin, Phone, Mail, Clock, ExternalLink, Building2, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lazy, Suspense } from "react";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const BASE_URL = "https://www.realtrust.ro";

const ContactPage = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const jsonLdSchemas = [
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "@id": `${BASE_URL}/contact-locatie`,
      "name": "RealTrust & ApArt Hotel Timișoara",
      "alternateName": "RealTrust Property Management",
      "description": isRo
        ? "Management profesional de proprietăți în Timișoara. Administrare apartamente regim hotelier cu randament net 9.4% ROI. Sediu: Str. Samuel Clain Micu Nr.14."
        : "Professional property management in Timișoara. Short-term rental management with 9.4% net ROI. Office: Str. Samuel Clain Micu Nr.14.",
      "url": `${BASE_URL}/contact-locatie`,
      "telephone": "+40723154520",
      "email": "info@realtrust.ro",
      "image": `${BASE_URL}/images/hero-optimized-1920w.webp`,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Strada Samuel Clain Micu Nr.14, ap.4",
        "addressLocality": "Timișoara",
        "addressRegion": "Timiș",
        "postalCode": "300125",
        "addressCountry": "RO",
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 45.7489,
        "longitude": 21.2087,
      },
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          "opens": "09:00",
          "closes": "18:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Saturday",
          "opens": "10:00",
          "closes": "14:00",
        },
      ],
      "areaServed": {
        "@type": "City",
        "name": "Timișoara",
        "containedInPlace": { "@type": "Country", "name": "Romania" },
      },
      "priceRange": "€50-€150 per night",
      "sameAs": [
        "https://www.facebook.com/realtrust.ro",
        "https://www.instagram.com/realtrust_timisoara",
      ],
      "hasMap": "https://www.google.com/maps?q=45.7672,21.2495",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": isRo ? "Acasă" : "Home", "item": BASE_URL },
        { "@type": "ListItem", "position": 2, "name": isRo ? "Contact & Locație" : "Contact & Location", "item": `${BASE_URL}/contact-locatie` },
      ],
    },
  ];

  const services = [
    {
      icon: Building2,
      title: isRo ? "Administrare Regim Hotelier" : "Short-Term Rental Management",
      desc: isRo
        ? "Management complet al apartamentului tău pe Airbnb, Booking.com și alte platforme. Randament net 9.4% ROI."
        : "Complete management of your apartment on Airbnb, Booking.com and other platforms. Net yield 9.4% ROI.",
    },
    {
      icon: Shield,
      title: isRo ? "Asigurare & Protecție" : "Insurance & Protection",
      desc: isRo
        ? "Asigurare civilă de 3.000.000 EUR inclusă. Protecție completă pentru proprietatea ta."
        : "€3,000,000 liability insurance included. Full protection for your property.",
    },
    {
      icon: Star,
      title: isRo ? "Rating Excelent" : "Excellent Rating",
      desc: isRo
        ? "Portofoliul nostru menține un rating mediu de 9.6/10 pe Booking.com cu peste 500 de recenzii verificate."
        : "Our portfolio maintains an average 9.6/10 rating on Booking.com with 500+ verified reviews.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={isRo ? "Contact & Locație | Management Proprietăți Timișoara — RealTrust" : "Contact & Location | Property Management Timișoara — RealTrust"}
        description={isRo
          ? "Contactează RealTrust pentru management profesional de proprietăți în Timișoara. Sediul nostru: Str. Samuel Clain Micu Nr.14. Telefon: +40723154520. Randament 9.4% ROI."
          : "Contact RealTrust for professional property management in Timișoara. Office: Str. Samuel Clain Micu Nr.14. Phone: +40723154520. 9.4% ROI yield."}
        url={`${BASE_URL}/contact-locatie`}
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

          {/* Hero Section */}
          <section className="text-center max-w-3xl mx-auto mb-12">
            <h1 className="text-3xl sm:text-4xl font-serif font-bold mb-4">
              {isRo ? "Contact & Prezență Locală" : "Contact & Local Presence"}
            </h1>
            <p className="text-lg text-muted-foreground">
              {isRo
                ? "Management profesional de proprietăți în Timișoara — sediu fizic, echipă locală dedicată, disponibilitate non-stop pentru oaspeți și proprietari."
                : "Professional property management in Timișoara — physical office, dedicated local team, 24/7 availability for guests and owners."}
            </p>
          </section>

          {/* Contact Cards */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <a href="tel:+40723154520" className="flex flex-col items-center p-6 bg-card border rounded-2xl hover:border-primary/50 transition-colors group">
              <Phone className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <span className="font-semibold mb-1">{isRo ? "Telefon" : "Phone"}</span>
              <span className="text-sm text-muted-foreground">+40 723 154 520</span>
            </a>
            <a href="https://wa.me/40770635252" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-card border rounded-2xl hover:border-primary/50 transition-colors group">
              <svg className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
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

          {/* Map + Address */}
          <section className="grid lg:grid-cols-2 gap-8 mb-16">
            <div className="rounded-2xl overflow-hidden border aspect-[4/3] lg:aspect-auto">
              <iframe
                src="https://maps.google.com/maps?q=45.7672,21.2495&t=&z=16&ie=UTF8&iwloc=&output=embed"
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
                  <p>Strada Samuel Clain Micu Nr.14, ap.4</p>
                  <p>Timișoara, Timiș 300125</p>
                  <p>România</p>
                </address>
              </div>
              <a
                href="https://www.google.com/maps/search/?api=1&query=45.7672,21.2495"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="w-4 h-4" />
                  {isRo ? "Deschide în Google Maps" : "Open in Google Maps"}
                </Button>
              </a>
              <a
                href="https://share.google/oNmn1ltr7L0OEiHet"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
              >
                <Button variant="outline" className="gap-2">
                  <Star className="w-4 h-4" />
                  {isRo ? "Lasă o recenzie pe Google" : "Leave a Google Review"}
                </Button>
              </a>
            </div>
          </section>

          {/* Services */}
          <section className="mb-16">
            <h2 className="text-2xl font-serif font-semibold text-center mb-8">
              {isRo ? "Servicii de Management Proprietăți în Timișoara" : "Property Management Services in Timișoara"}
            </h2>
            <div className="grid sm:grid-cols-3 gap-6">
              {services.map((svc, idx) => (
                <div key={idx} className="p-6 bg-card border rounded-2xl">
                  <svc.icon className="w-8 h-8 text-primary mb-4" />
                  <h3 className="font-semibold mb-2">{svc.title}</h3>
                  <p className="text-sm text-muted-foreground">{svc.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SEO Text Block */}
          <section className="max-w-3xl mx-auto prose prose-sm text-muted-foreground mb-12">
            <h2 className="text-xl font-serif font-semibold text-foreground">
              {isRo ? "Management Proprietăți în Timișoara — De Ce RealTrust?" : "Property Management in Timișoara — Why RealTrust?"}
            </h2>
            {isRo ? (
              <>
                <p>
                  RealTrust & ApArt Hotel este lider în administrarea apartamentelor în regim hotelier din Timișoara. Cu un portofoliu de proprietăți premium situate în cele mai căutate zone — Iulius Town, ISHO, Centrul Vechi, Complex Studențesc — oferim proprietarilor un randament net verificat de 9.4% ROI.
                </p>
                <p>
                  Echipa noastră locală gestionează întregul proces: de la listing-ul profesional pe Airbnb, Booking.com și alte platforme, la self check-in cu smart lock, curățenie profesională între sejururi, mentenanță preventivă și raportare financiară lunară transparentă.
                </p>
                <p>
                  Fie că ești proprietar și vrei să maximizezi venitul din proprietatea ta, fie că ești investitor și cauți oportunități imobiliare cu randament ridicat în Timișoara, te invităm la sediul nostru din Strada Samuel Clain Micu Nr.14 sau ne poți contacta telefonic la +40 723 154 520.
                </p>
              </>
            ) : (
              <>
                <p>
                  RealTrust & ApArt Hotel is the leading short-term rental property management company in Timișoara. With a premium portfolio across the city's most sought-after areas — Iulius Town, ISHO, Old Town, Student Complex — we deliver a verified 9.4% net ROI to property owners.
                </p>
                <p>
                  Our local team manages the entire process: from professional listing on Airbnb, Booking.com and other platforms, to smart-lock self check-in, professional cleaning between stays, preventive maintenance, and transparent monthly financial reporting.
                </p>
                <p>
                  Whether you're a property owner looking to maximize your income, or an investor seeking high-yield real estate opportunities in Timișoara, visit our office at Strada Samuel Clain Micu Nr.14 or call us at +40 723 154 520.
                </p>
              </>
            )}
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
