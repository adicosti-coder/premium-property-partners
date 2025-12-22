import { Phone, MessageCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const MobileCTABar = () => {
  const handleCall = () => {
    window.location.href = "tel:+40756123456";
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Bună ziua! Sunt interesat de serviciile de administrare RealTrust.");
    window.open(`https://wa.me/40756123456?text=${message}`, "_blank");
  };

  const scrollToContact = () => {
    const ctaSection = document.getElementById('contact');
    ctaSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-lg border-t border-border py-3 px-4 animate-slide-up">
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="call"
          size="sm"
          className="flex-1"
          onClick={handleCall}
        >
          <Phone className="w-4 h-4" />
          Sună
        </Button>
        
        <Button
          variant="whatsapp"
          size="sm"
          className="flex-1"
          onClick={handleWhatsApp}
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </Button>
        
        <Button
          variant="premium"
          size="sm"
          className="flex-1"
          onClick={scrollToContact}
        >
          <Home className="w-4 h-4" />
          Proprietari
        </Button>
      </div>
    </div>
  );
};

export default MobileCTABar;
