import { GOOGLE_BUSINESS_PROFILE_URL } from "@/lib/orgIdentity";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import EntityDefinitionBlock from "@/components/EntityDefinitionBlock";
import BackToTop from "@/components/BackToTop";
import { MapPin, Phone, Mail, Clock, Building2, Shield, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import QuickContactForm from "@/components/contact/QuickContactForm";
import CallbackCard from "@/components/contact/CallbackCard";
import { useRegisterFAQs } from "@/hooks/useFAQSchema";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const BASE_URL = "https://realtrust.ro";
const GOOGLE_BUSINESS_URL = GOOGLE_BUSINESS_PROFILE_URL;

const ContactPage = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const faqItems = isRo
    ? [
        { q: "Care este programul RealTrust Timișoara?", a: "Programul de consultanță și administrare este Luni-Vineri 09:00-18:00 și Sâmbătă 10:00-14:00. Suport oaspeți disponibil 24/7 prin WhatsApp." },
        { q: "Unde au loc întâlnirile și vizionările?", a: "Nu primim clienți într-un sediu comercial: consultanța se face online sau telefonic, iar vizionările se programează direct la proprietate — în Centru/Cetate, Iosefin, Fabric, Dumbrăvița sau pe culoarul Aradului." },
        { q: "Cum solicit o evaluare sau o consultanță?", a: "Sunteți la distanță de un apel sau un mesaj: sunați la +40 799 069 256, scrieți pe WhatsApp sau trimiteți formularul de pe această pagină și revenim cu o evaluare online a proprietății." },
      ]
    : [
        { q: "What are RealTrust's working hours in Timișoara?", a: "Consulting and management hours are Mon-Fri 09:00-18:00 and Sat 10:00-14:00. Guest support is available 24/7 via WhatsApp." },
        { q: "Where do meetings and viewings take place?", a: "We don't host clients at a commercial office: consulting is done online or by phone, and viewings are scheduled directly at the property — in Centru/Cetate, Iosefin, Fabric, Dumbrăvița or the Arad corridor." },
        { q: "How do I request a valuation or a consultation?", a: "You're one call or message away: call +40 799 069 256, message us on WhatsApp or submit the form on this page and we'll come back with an online valuation of your property." },
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
        ? "RealTrust Timișoara — consultanță, vânzări, închirieri și administrare regim hotelier. Contact rapid prin telefon, WhatsApp și e-mail."
        : "RealTrust Timișoara — consulting, sales, rentals and short-term rental management. Fast contact by phone, WhatsApp and e-mail.",
      "url": `${BASE_URL}/contact`,
      "telephone": "+40799069256",
      "email": "info@realtrust.ro",
      "image": `${BASE_URL}/images/hero-optimized-800w.webp`,
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
          "telephone": "+40799069256",
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
          "telephone": "+40799069256",
          "email": "info@realtrust.ro",
        },
      ],
      "sameAs": [
        "https://www.facebook.com/realtrust.ro",
        "https://www.instagram.com/realtrust_timisoara",
        GOOGLE_BUSINESS_URL,
      ],
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
          ? "Contactează echipa RealTrust Timișoara: telefon +40 799 069 256, WhatsApp și info@realtrust.ro. Consultanță la distanță și vizionări programate direct la proprietate."
          : "Contact the RealTrust Timișoara team: phone +40 799 069 256, WhatsApp and info@realtrust.ro. Remote consulting and viewings scheduled directly at the property."}
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
              {isRo ? "Contact — RealTrust Timișoara" : "Contact — RealTrust Timișoara"}
            </h1>
            <p className="text-base text-muted-foreground mb-5">
              {isRo
                ? "Consultanță & administrare la distanță în Timișoara — telefon, WhatsApp și e-mail. Întâlnirile și vizionările se stabilesc direct la proprietate."
                : "Remote consulting & management in Timișoara — phone, WhatsApp and e-mail. Meetings and viewings are scheduled directly at the property."}
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

          <CallbackCard />

          {/* Quick contact cards */}
          <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            <a href="tel:+40799069256" className="flex flex-col items-center p-6 bg-card border rounded-2xl hover:border-primary/50 transition-colors group">
              <Phone className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <span className="font-semibold mb-1">{isRo ? "Telefon" : "Phone"}</span>
              <span className="text-sm text-muted-foreground">0799 069 256</span>
            </a>
            <a href="https://wa.me/40799069256" target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-6 bg-card border rounded-2xl hover:border-primary/50 transition-colors group">
              <svg className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span className="font-semibold mb-1">WhatsApp</span>
              <span className="text-sm text-muted-foreground">+40 799 069 256</span>
            </a>
            <a href="mailto:info@realtrust.ro" className="flex flex-col items-center p-6 bg-card border rounded-2xl hover:border-primary/50 transition-colors group">
              <Mail className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
              <span className="font-semibold mb-1">Email</span>
              <span className="text-sm text-muted-foreground">info@realtrust.ro</span>
            </a>
            <div className="flex flex-col items-center p-6 bg-card border rounded-2xl">
              <Clock className="w-8 h-8 text-primary mb-3" />
              <span className="font-semibold mb-1">{isRo ? "Program consultanță" : "Consulting hours"}</span>
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
                <a href="tel:+40799069256" className="text-sm text-primary hover:underline block">+40 799 069 256</a>
                <a href="mailto:info@realtrust.ro" className="text-sm text-primary hover:underline">info@realtrust.ro</a>
              </div>
            </div>
          </section>

          {/* Servicii la distanță + vizionări la proprietate */}
          <section className="grid lg:grid-cols-2 gap-8 mb-12">
            <div className="p-8 bg-card border rounded-2xl">
              <h2 className="text-2xl font-serif font-semibold mb-3 flex items-center gap-2">
                <Phone className="w-6 h-6 text-primary" />
                {isRo ? "Consultanță & Administrare la distanță" : "Remote Consulting & Management"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {isRo
                  ? "Deservim Timișoara și județul Timiș fără un sediu comercial: evaluările, consultanța și administrarea se fac integral la distanță — telefonic, pe WhatsApp sau online. Trimiteți documentele digital, iar noi ne ocupăm de tot restul."
                  : "We serve Timișoara and Timiș county without a commercial office: valuations, consulting and management are handled fully remotely — by phone, WhatsApp or online. Send documents digitally and we take care of the rest."}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2"><Phone className="w-4 h-4 text-primary" />{isRo ? "Consultanță telefonică și evaluări online" : "Phone consulting and online valuations"}</li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-primary" />{isRo ? "Documente și contracte digital" : "Digital documents and contracts"}</li>
                <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" />{isRo ? "Administrare 100% pasivă, rapoarte lunare" : "Fully passive management, monthly reports"}</li>
              </ul>
            </div>
            <div className="p-8 bg-card border rounded-2xl flex flex-col">
              <h2 className="text-2xl font-serif font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-primary" />
                {isRo ? "Întâlniri & vizionări la proprietate" : "Meetings & viewings at the property"}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {isRo
                  ? "Nu primim vizitatori într-un birou: toate vizionările și întâlnirile se stabilesc direct la proprietate, la ora care vă convine. Lucrăm în Centru/Cetate, Iosefin, Fabric, Dumbrăvița și pe culoarul Aradului."
                  : "We don't host visitors at an office: all viewings and meetings take place directly at the property, whenever suits you. We cover Centru/Cetate, Iosefin, Fabric, Dumbrăvița and the Arad corridor."}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{isRo ? "Program L-V 09:00-18:00, S 10:00-14:00" : "Mon-Fri 09:00-18:00, Sat 10:00-14:00"}</li>
                <li className="flex items-center gap-2"><Building2 className="w-4 h-4 text-primary" />{isRo ? "Programezi vizionarea telefonic sau pe WhatsApp" : "Book a viewing by phone or WhatsApp"}</li>
              </ul>
              <div className="flex flex-wrap gap-2 mt-auto pt-6">
                <a href="tel:+40799069256">
                  <Button variant="outline" className="gap-2">
                    <Phone className="w-4 h-4" />
                    {isRo ? "Sună acum" : "Call now"}
                  </Button>
                </a>
                <a href="https://wa.me/40799069256" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
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
