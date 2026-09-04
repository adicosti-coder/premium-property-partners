import { BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useLanguage } from "@/i18n/LanguageContext";

/**
 * "Owner's Guide" content hub teaser.
 * Internal linking to blog/guide articles + neighborhood + complex pages.
 */
const OwnerGuideHub = () => {
  const { language } = useLanguage();
  const lang = language === "en" ? "en" : "ro";

  const t = {
    ro: {
      badge: "Ghidul Proprietarului 2026",
      title: "Resurse esențiale pentru proprietari",
      subtitle:
        "Articole detaliate, studii de caz și ghiduri practice care te ajută să iei decizii informate despre apartamentul tău.",
      articles: [
        {
          title: "Legislație regim hotelier vs. închiriere clasică",
          desc: "Compară cele două modele: autorizații necesare, fiscalitate, randament net și flexibilitate operațională.",
          to: "/blog?category=legislatie",
        },
        {
          title: "Ghid de amenajare pentru randament maxim",
          desc: "Cum amenajezi un apartament în regim hotelier ca să atragi recenzii 9.5+ și ocupare peste 85%.",
          to: "/blog?category=amenajare",
        },
        {
          title: "Fiscalitate venituri din chirii — ghid 2026",
          desc: "Optimizare fiscală, micro-întreprindere, PFA, taxe locale și consultanță fiscală pentru proprietari din Timișoara.",
          to: "/blog?category=fiscalitate",
        },
        {
          title: "Cum am crescut venitul unui apartament din ISHO cu 25%",
          desc: "Studiu de caz real: pricing dinamic, fotografii premium și optimizare listări pe Booking & Airbnb.",
          to: "/ansambluri/isho",
        },
      ],
      complexCta: "Vezi proprietăți în ansambluri rezidențiale",
    },
    en: {
      badge: "The 2026 Owner's Guide",
      title: "Essential resources for owners",
      subtitle:
        "Detailed articles, case studies and practical guides to help you make informed decisions about your apartment.",
      articles: [
        {
          title: "Short-term rental vs. classic long-term lease",
          desc: "Compare both models: required permits, taxation, net returns and operational flexibility.",
          to: "/blog?category=legislatie",
        },
        {
          title: "Interior design guide for maximum yield",
          desc: "How to furnish a short-term rental to earn 9.5+ reviews and 85%+ occupancy.",
          to: "/blog?category=amenajare",
        },
        {
          title: "Rental income taxation — 2026 guide",
          desc: "Tax optimization, micro-company, PFA, local taxes and tax advisory for Timișoara owners.",
          to: "/blog?category=fiscalitate",
        },
        {
          title: "How we grew an ISHO apartment's income by 25%",
          desc: "Real case study: dynamic pricing, premium photography and Booking & Airbnb listing optimization.",
          to: "/ansambluri/isho",
        },
      ],
      complexCta: "Browse properties in residential complexes",
    },
  }[lang];

  // Article schema (ItemList of BlogPosting) for the 4 owner-guide articles
  // E-E-A-T: explicit Person author + Organization publisher with valid logo
  const baseUrl = "https://realtrust.ro";
  const isoDate = new Date().toISOString().split("T")[0];
  const author = {
    "@type": "Person",
    "@id": `${baseUrl}/despre-noi#adrian-costi`,
    "name": "Adrian Costi",
    "jobTitle": lang === "ro" ? "Fondator & CEO RealTrust" : "Founder & CEO RealTrust",
    "url": `${baseUrl}/despre-noi`,
    "worksFor": { "@type": "Organization", "name": "RealTrust" },
  };
  const publisher = {
    "@type": "Organization",
    "name": "RealTrust & ApArt Hotel Timișoara",
    "url": baseUrl,
    "logo": {
      "@type": "ImageObject",
      "url": `${baseUrl}/images/hero-optimized-800w.webp`,
      "width": 800,
      "height": 450,
    },
  };
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": lang === "ro" ? "Ghidul Proprietarului 2026" : "The 2026 Owner's Guide",
    "itemListElement": t.articles.map((a, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "BlogPosting",
        "headline": a.title,
        "description": a.desc,
        "url": `${baseUrl}${a.to}`,
        "datePublished": isoDate,
        "dateModified": isoDate,
        "inLanguage": lang === "ro" ? "ro-RO" : "en-US",
        "author": author,
        "publisher": publisher,
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": `${baseUrl}${a.to}`,
        },
      },
    })),
  };

  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
      </Helmet>
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
            <BookOpen className="w-4 h-4" />
            {t.badge}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
            {t.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.subtitle}</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 max-w-5xl mx-auto mb-8">
          {t.articles.map((a, i) => (
            <Link
              key={i}
              to={a.to}
              className="group block p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-elegant transition-all duration-300"
            >
              <h3 className="text-lg font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {a.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                {a.desc}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
                {lang === "ro" ? "Citește" : "Read"}{" "}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/cartiere"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {t.complexCta} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default OwnerGuideHub;
