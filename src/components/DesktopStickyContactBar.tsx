import { Phone, MessageCircle, Mail } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";
import { cn } from "@/lib/utils";

const DesktopStickyContactBar = () => {
  const { t } = useLanguage();
  const { trackCall, trackWhatsApp, trackEmail } = useCtaAnalytics();

  const fireContactClick = (method: string) => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "contact_click", { method, page_path: window.location.pathname });
    }
  };

  const handleCall = () => {
    trackCall();
    fireContactClick("phone");
    window.location.href = "tel:+40723154520";
  };

  const handleWhatsApp = () => {
    trackWhatsApp();
    fireContactClick("whatsapp");
    const message = encodeURIComponent(t.floatingWhatsapp.message);
    window.open(`https://wa.me/40723154520?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  const handleEmail = () => {
    trackEmail();
    window.location.href = "mailto:info@realtrust.ro";
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 hidden md:block">
      <div className="bg-card/95 backdrop-blur-lg border-t border-border shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-8 py-3">
            {/* Phone */}
            <button
              onClick={handleCall}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90 transition-all duration-200",
                "hover:scale-105 active:scale-95"
              )}
            >
              <Phone className="w-4 h-4" />
              <span className="font-medium">+40 723 154 520</span>
            </button>

            {/* WhatsApp */}
            <button
              onClick={handleWhatsApp}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full",
                "bg-whatsapp text-whatsapp-foreground",
                "hover:bg-whatsapp-hover transition-all duration-200",
                "hover:scale-105 active:scale-95"
              )}
            >
              <MessageCircle className="w-4 h-4" />
              <span className="font-medium">WhatsApp</span>
            </button>

            {/* Email */}
            <button
              onClick={handleEmail}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full",
                "bg-muted text-foreground border border-border",
                "hover:bg-accent transition-all duration-200",
                "hover:scale-105 active:scale-95"
              )}
            >
              <Mail className="w-4 h-4" />
              <span className="font-medium">info@realtrust.ro</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesktopStickyContactBar;
