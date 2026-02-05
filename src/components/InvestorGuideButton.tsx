import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { Download, Sparkles, Loader2 } from "lucide-react";
import { exportInvestorGuidePdf } from "@/utils/exportInvestorGuidePdf";

interface InvestorGuideButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  fullWidth?: boolean;
}

const InvestorGuideButton = ({
  variant = "default",
  size = "default",
  className = "",
  fullWidth = false,
}: InvestorGuideButtonProps) => {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const isRo = language === "ro";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email) {
      toast.error(isRo ? "Completează toate câmpurile" : "Please fill all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Send to Make.com webhook for email automation & admin notification
      const webhookUrl = "https://hook.eu1.make.com/swcd8yafsc17xlrys9w2ivlfnhukay4p";
      
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "investor_guide_download",
          name: formData.name,
          email: formData.email,
          language: language,
          timestamp: new Date().toISOString(),
          source: window.location.pathname,
        }),
      });

      // Generate and download the PDF immediately
      exportInvestorGuidePdf({ language });

      toast.success(
        isRo
          ? "Ghidul a fost descărcat! Verifică și email-ul."
          : "Guide downloaded! Check your email too."
      );

      setOpen(false);
      setFormData({ name: "", email: "" });
    } catch (error) {
      console.error("Error submitting investor guide form:", error);
      // Still download PDF even if webhook fails
      exportInvestorGuidePdf({ language });
      toast.success(
        isRo
          ? "Ghidul a fost descărcat!"
          : "Guide downloaded!"
      );
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
          <Button
          variant={variant}
          size={size}
          className={`
            ${fullWidth ? "w-full" : ""}
            ${variant === "default" ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300" : ""}
            ${className}
          `}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isRo ? "Vreau Ghidul Gratuit de Investiții Premium" : "Get Free Premium Investment Guide"}
        </Button>
      </DialogTrigger>
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
            <Label htmlFor="investor-name">{isRo ? "Nume" : "Name"}</Label>
            <Input
              id="investor-name"
              type="text"
              placeholder={isRo ? "Numele tău" : "Your name"}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="investor-email">Email</Label>
            <Input
              id="investor-email"
              type="email"
              placeholder={isRo ? "email@exemplu.com" : "email@example.com"}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          <div className="bg-primary/5 dark:bg-primary/10 p-3 rounded-lg text-sm text-foreground">
            <p className="font-medium mb-1">
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
            className="w-full bg-primary hover:bg-primary/90"
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
  );
};

export default InvestorGuideButton;
