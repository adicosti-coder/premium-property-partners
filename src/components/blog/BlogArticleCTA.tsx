import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/i18n/LanguageContext";
import { Home, Building2, ArrowRight, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

const BlogArticleCTA = () => {
  const { language } = useLanguage();

  const translations = {
    ro: {
      guestLabel: "CAZARE OASPEȚI",
      guestTitle: "Cazare premium în Timișoara",
      guestDescription: "Apartamente premium, self check-in, locații centrale. Simplu, rapid, confortabil.",
      guestCta: "Vezi opțiunile disponibile",
      guestBack: "Înapoi la Acasă",
      ownerLabel: "PROPRIETARI",
      ownerTitle: "Vrei administrare ca la hotel pentru proprietatea ta?",
      ownerDescription: "Cere o analiză gratuită: estimare realistă + 3 recomandări concrete. Fără obligații.",
      ownerCta: "Cere analiză gratuită",
      ownerBack: "Înapoi la Blog",
      ownerFooter: "Plățile intră direct la tine · structură transparentă · fără obligații.",
    },
    en: {
      guestLabel: "GUEST ACCOMMODATION",
      guestTitle: "Premium Accommodation in Timișoara",
      guestDescription: "Premium apartments, self check-in, central locations. Simple, fast, comfortable.",
      guestCta: "See available options",
      guestBack: "Back to Home",
      ownerLabel: "PROPERTY OWNERS",
      ownerTitle: "Want hotel-style management for your property?",
      ownerDescription: "Request a free analysis: realistic estimate + 3 concrete recommendations. No obligations.",
      ownerCta: "Request free analysis",
      ownerBack: "Back to Blog",
      ownerFooter: "Payments go directly to you · transparent structure · no obligations.",
    },
  };

  const t = translations[language] || translations.ro;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const cardVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.98,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut" as const,
      },
    },
  };

  const contentVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        duration: 0.4,
        delay: 0.2,
      },
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        delay: 0.3,
      },
    },
  };

  return (
    <motion.div 
      className="space-y-6 my-12"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
    >
      {/* Guest Section */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden group hover:border-primary/30 transition-colors duration-300">
          <CardContent className="p-6 md:p-8">
            <motion.div 
              className="flex items-center gap-2 mb-3"
              variants={contentVariants}
            >
              <Home className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {t.guestLabel}
              </span>
            </motion.div>
            
            <motion.h3 
              className="text-xl md:text-2xl font-serif font-bold text-foreground mb-3"
              variants={contentVariants}
            >
              {t.guestTitle}
            </motion.h3>
            
            <motion.p 
              className="text-muted-foreground mb-6"
              variants={contentVariants}
            >
              {t.guestDescription}
            </motion.p>
            
            <motion.div 
              className="flex flex-wrap gap-3"
              variants={buttonVariants}
            >
              <Button asChild className="gap-2 group/btn">
                <Link to="/guests">
                  {t.guestCta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <Link to="/">
                  <ArrowLeft className="w-4 h-4" />
                  {t.guestBack}
                </Link>
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Owner Section */}
      <motion.div variants={cardVariants}>
        <Card className="bg-card/80 backdrop-blur-sm border-border/50 overflow-hidden group hover:border-primary/30 transition-colors duration-300">
          <CardContent className="p-6 md:p-8">
            <motion.div 
              className="flex items-center gap-2 mb-3"
              variants={contentVariants}
            >
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                {t.ownerLabel}
              </span>
            </motion.div>
            
            <motion.h3 
              className="text-xl md:text-2xl font-serif font-bold text-foreground mb-3"
              variants={contentVariants}
            >
              {t.ownerTitle}
            </motion.h3>
            
            <motion.p 
              className="text-muted-foreground mb-6"
              variants={contentVariants}
            >
              {t.ownerDescription}
            </motion.p>
            
            <motion.div 
              className="flex flex-wrap gap-3 mb-4"
              variants={buttonVariants}
            >
              <Button asChild className="gap-2 group/btn">
                <Link to="/pentru-proprietari#calculator">
                  {t.ownerCta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                </Link>
              </Button>
              <Button variant="outline" asChild className="gap-2">
                <Link to="/blog">
                  <ArrowLeft className="w-4 h-4" />
                  {t.ownerBack}
                </Link>
              </Button>
            </motion.div>
            
            <motion.p 
              className="text-sm text-muted-foreground/70 border-t border-border/30 pt-4"
              variants={contentVariants}
            >
              {t.ownerFooter}
            </motion.p>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default BlogArticleCTA;
