import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Download, CheckCircle, Loader2, Sparkles, TrendingUp, Building2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

interface LeadMagnetBannerProps {
  variant?: "inline" | "hero" | "sidebar";
  className?: string;
}

const LeadMagnetBanner = ({ variant = "inline", className }: LeadMagnetBannerProps) => {
  const { language } = useLanguage();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  const content = {
    ro: {
      badge: "Ghid Gratuit 2026",
      title: "Maximul de randament în Timișoara",
      subtitle: "Cât mai poți câștiga din imobiliare în anul Capitalei Culturale și după? Află cum transformăm apartamentele obișnuite în investiții cu randament dublu față de chiria clasică.",
      highlight: "30% mai mult",
      highlightContext: "venit în regim hotelier vs chirie clasică",
      cta: "Vreau Ghidul Gratuit",
      namePlaceholder: "Numele tău",
      emailPlaceholder: "Email-ul tău",
      success: "Ghidul a fost trimis pe email!",
      features: [
        "Analiză piață Timișoara 2026",
        "Comparație randament hotelier vs clasic",
        "Strategii de maximizare profit"
      ]
    },
    en: {
      badge: "Free Guide 2026",
      title: "Maximum Yield in Timișoara",
      subtitle: "How much can you still earn from real estate in the year of the European Capital of Culture and beyond? Find out how we turn ordinary apartments into investments with double the yield of classic rent.",
      highlight: "30% more",
      highlightContext: "income in hotel regime vs classic rent",
      cta: "Get the Free Guide",
      namePlaceholder: "Your name",
      emailPlaceholder: "Your email",
      success: "The guide has been sent to your email!",
      features: [
        "Timișoara 2026 Market Analysis",
        "Hotel vs Classic Yield Comparison",
        "Profit Maximization Strategies"
      ]
    }
  };

  const t = content[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      toast.error(language === "ro" ? "Te rugăm să completezi toate câmpurile" : "Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Send to Make.com webhook via edge function
      const { error } = await supabase.functions.invoke("send-lead-magnet", {
        body: {
          name: name.trim(),
          email: email.trim(),
          source: "lead_magnet_guide_2026",
          language
        }
      });

      if (error) throw error;

      setIsSuccess(true);
      toast.success(t.success);
      
      // Reset form after delay
      setTimeout(() => {
        setName("");
        setEmail("");
        setIsSuccess(false);
      }, 5000);

    } catch (error) {
      console.error("Lead magnet submission error:", error);
      toast.error(language === "ro" ? "A apărut o eroare. Te rugăm să încerci din nou." : "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isHero = variant === "hero";
  const isSidebar = variant === "sidebar";

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        className
      )}
    >
      <Card className={cn(
        "overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/5",
        isHero && "shadow-2xl",
        isSidebar && "shadow-lg"
      )}>
        <CardContent className={cn(
          "p-0",
          isHero ? "grid md:grid-cols-2 gap-0" : isSidebar ? "p-6" : "grid md:grid-cols-5 gap-0"
        )}>
          {/* Left side - Tablet Mockup (hidden on sidebar) */}
          {!isSidebar && (
            <div className={cn(
              "relative bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 flex items-center justify-center p-8",
              isHero ? "min-h-[400px]" : "md:col-span-2 min-h-[300px]"
            )}>
              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
              <div className="absolute bottom-4 right-4 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
              
              {/* Tablet Mockup */}
              <div className="relative">
                {/* Tablet Frame */}
                <div className="relative bg-card rounded-2xl shadow-2xl border-4 border-muted p-3 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                  {/* Screen */}
                  <div className="bg-gradient-to-br from-primary via-primary/90 to-accent rounded-xl overflow-hidden w-48 h-64 md:w-56 md:h-72">
                    {/* Guide Cover Content */}
                    <div className="p-4 h-full flex flex-col justify-between text-primary-foreground">
                      <div>
                        <div className="flex items-center gap-1 mb-2">
                          <Building2 className="w-4 h-4" />
                          <span className="text-xs font-medium opacity-90">RealTrust</span>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 mb-3">
                          <Sparkles className="w-5 h-5 mb-1" />
                          <span className="text-[10px] font-medium block">GHID INVESTITOR</span>
                        </div>
                        <h4 className="text-sm font-bold leading-tight mb-1">
                          Timișoara 2026
                        </h4>
                        <p className="text-[10px] opacity-80 leading-tight">
                          Capitala Culturală Europeană
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-white/10 rounded-lg px-2 py-1">
                          <TrendingUp className="w-3 h-3" />
                          <span className="text-[9px]">+30% Randament</span>
                        </div>
                        <div className="text-[8px] opacity-70">
                          Ediție Limitată 2026
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Home button */}
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-muted-foreground/30 rounded-full" />
                </div>
                
                {/* Floating badge */}
                <div className="absolute -top-3 -right-3 bg-accent text-accent-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-pulse">
                  PDF
                </div>
              </div>
            </div>
          )}

          {/* Right side - Content & Form */}
          <div className={cn(
            "p-6 md:p-8 flex flex-col justify-center",
            isHero ? "" : "md:col-span-3",
            isSidebar && "p-6"
          )}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-3 py-1 rounded-full w-fit mb-4">
              <Download className="w-4 h-4" />
              {t.badge}
            </div>

            {/* Title */}
            <h3 className={cn(
              "font-serif font-bold text-foreground mb-3",
              isHero ? "text-2xl md:text-3xl" : isSidebar ? "text-xl" : "text-xl md:text-2xl"
            )}>
              {t.title}
            </h3>

            {/* Subtitle */}
            <p className={cn(
              "text-muted-foreground mb-4 leading-relaxed",
              isSidebar ? "text-sm" : "text-sm md:text-base"
            )}>
              {t.subtitle}
            </p>

            {/* Highlight stat */}
            <div className="flex items-center gap-3 mb-6 p-3 bg-primary/5 rounded-xl border border-primary/10">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-primary font-bold text-lg">{t.highlight}</span>
                <p className="text-xs text-muted-foreground">{t.highlightContext}</p>
              </div>
            </div>

            {/* Features list (only on hero) */}
            {isHero && (
              <ul className="space-y-2 mb-6">
                {t.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            )}

            {/* Form */}
            {isSuccess ? (
              <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-primary" />
                <span className="text-primary font-medium">{t.success}</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <Input
                  type="text"
                  placeholder={t.namePlaceholder}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background"
                  disabled={isSubmitting}
                />
                <Input
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-background"
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  variant="hero"
                  size={isHero ? "xl" : "lg"}
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {language === "ro" ? "Se trimite..." : "Sending..."}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      {t.cta}
                    </>
                  )}
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadMagnetBanner;
