import { MessageCircle } from "lucide-react";

const FloatingWhatsApp = () => {
  const handleClick = () => {
    const message = encodeURIComponent("Bună ziua! Sunt interesat de serviciile RealTrust.");
    window.open(`https://wa.me/40756123456?text=${message}`, "_blank");
  };

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-24 md:bottom-8 right-6 z-40 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center animate-pulse-glow"
      aria-label="Contactează-ne pe WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </button>
  );
};

export default FloatingWhatsApp;
