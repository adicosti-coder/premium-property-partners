import { useState, useEffect } from "react";
import { TrendingUp, X, Sparkles, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import { exportInvestorGuidePdf } from "@/utils/exportInvestorGuidePdf";
import { supabase } from "@/lib/supabaseClient";

const FloatingInvestorGuide = () => {
  const { language } = useLanguage();
  const isMobile = useIsMobile();
  const [isVisible, setIsVisible] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "" });

  const isRo = language === "ro";

  // Check if dismissed in session
  useEffect(() => {
    const dismissed = sessionStorage.getItem("investor-guide-dismissed");
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  // Control visibility based on scroll - only on mobile
  useEffect(() => {
    if (!isMobile || isDismissed) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      // Show within first 2 viewport heights (2 scrolls)
      setIsVisible(scrollY < windowHeight * 2);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile, isDismissed]);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("investor-guide-dismissed", "true");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email) {
      toast.error(isRo ? "Completează toate câmpurile" : "Please fill all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      await supabase.functions.invoke("send-lead-magnet", {
        body: {
          name: formData.name,
          email: formData.email,
          source: "floating_investor_guide",
          language: language,
        },
      });

      await exportInvestorGuidePdf({ language });

      toast.success(
        isRo
          ? "Ghidul a fost descărcat! Verifică și email-ul."
          : "Guide downloaded! Check your email too."
      );

      setOpen(false);
      setFormData({ name: "", email: "" });
      handleDismiss();
    } catch (error) {
      console.error("Error:", error);
      await exportInvestorGuidePdf({ language });
      toast.success(isRo ? "Ghidul a fost descărcat!" : "Guide downloaded!");
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Only show on mobile and only on investor pages
  if (!isMobile || isDismissed || !isVisible) return null;

  return (
    <>
      {/* Floating Banner - Investor Blue/Gold Theme */}
      <div className="fixed top-20 left-4 right-4 z-40 animate-slide-down">
        <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-xl shadow-2xl border border-amber-500/30 overflow-hidden">
          {/* Gold shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/10 to-transparent animate-shimmer" />
          
          <div className="relative px-4 py-3">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-amber-300/70" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <TrendingUp className="w-5 h-5 text-blue-900" />
              </div>

              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-semibold text-amber-100 truncate">
                  {isRo ? "Investești în imobiliare?" : "Investing in real estate?"}
                </p>
                <p className="text-xs text-blue-200/80 truncate">
                  {isRo ? "Ghidul Investitorului 2026 - Gratuit" : "2026 Investor Guide - Free"}
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setOpen(true)}
                className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-900 font-bold shadow-lg shadow-amber-500/30 border-0"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                {isRo ? "Vreau" : "Get It"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog - Same as InvestorGuideButton */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Download className="w-5 h-5 text-amber-500" />
              {isRo ? "Ghidul Investitorului 2026" : "Investor's Guide 2026"}
            </DialogTitle>
            <DialogDescription>
              {isRo
                ? "Completează datele pentru a primi ghidul premium cu strategii de maximizare a randamentului în Timișoara."
                : "Fill in your details to receive the premium guide with strategies for maximizing returns in Timișoara."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="floating-investor-name">{isRo ? "Nume" : "Name"}</Label>
              <Input
                id="floating-investor-name"
                type="text"
                placeholder={isRo ? "Numele tău" : "Your name"}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="floating-investor-email">Email</Label>
              <Input
                id="floating-investor-email"
                type="email"
                placeholder={isRo ? "email@exemplu.com" : "email@example.com"}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="bg-blue-900/10 border border-blue-500/20 p-3 rounded-lg text-sm">
              <p className="font-medium mb-1 text-foreground">
                {isRo ? "Ce primești în ghid:" : "What you get:"}
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>📊 {isRo ? "Analiza Pieței Timișoara 2026" : "Timișoara Market Analysis 2026"}</li>
                <li>💰 {isRo ? "ROI: Hotelier vs Clasic (cu cifre reale)" : "ROI: Hotel-style vs Classic (real numbers)"}</li>
                <li>🎯 {isRo ? "Strategii pentru +30% profit" : "Strategies for +30% profit"}</li>
                <li>📍 {isRo ? "Zone premium cu randament maxim" : "Premium zones with maximum returns"}</li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-900 font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isRo ? "Se procesează..." : "Processing..."}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {isRo ? "Descarcă Ghidul Gratuit" : "Download Free Guide"}
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {isRo
                ? "Vei primi și ghidul pe email. Nu facem spam."
                : "You'll also receive the guide by email. No spam."}
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingInvestorGuide;
