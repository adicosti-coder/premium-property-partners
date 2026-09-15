import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";

/** Numărul înregistrat pentru automatizarea WhatsApp (răspuns automat de calificare). */
const WA_AUTOMATION_NUMBER = "40733783540";

const COPY = {
  ro: {
    label: "Contact rapid",
    title: "Scrie-ne pe WhatsApp",
    subtitle:
      "Completează pe scurt și mesajul pleacă direct în WhatsApp. Primești imediat răspuns cu variantele: imobiliare, administrare sau rezervare.",
    name: "Nume",
    namePh: "Numele tău",
    phone: "Telefon",
    phonePh: "07xx xxx xxx",
    message: "Mesaj",
    messagePh: "Ce te interesează? (vânzare, închiriere, administrare, rezervare)",
    send: "Trimite pe WhatsApp",
    missing: "Completează numele, telefonul și mesajul.",
    opened: "Se deschide WhatsApp cu mesajul pregătit.",
    intro: "Bună ziua! Vă scriu de pe realtrust.ro.",
    options:
      "Mă interesează: 1) imobiliare (vânzare/achiziție/închiriere), 2) administrare regim hotelier, 3) rezervare cazare.",
  },
  en: {
    label: "Quick contact",
    title: "Message us on WhatsApp",
    subtitle:
      "Fill in the short form and your message goes straight to WhatsApp. You get an instant reply with the options: real estate, property management or booking.",
    name: "Name",
    namePh: "Your name",
    phone: "Phone",
    phonePh: "07xx xxx xxx",
    message: "Message",
    messagePh: "What do you need? (sale, rent, management, booking)",
    send: "Send on WhatsApp",
    missing: "Please fill in your name, phone and message.",
    opened: "Opening WhatsApp with your message ready.",
    intro: "Hello! I'm writing from realtrust.ro.",
    options:
      "I'm interested in: 1) real estate (buy/sell/rent), 2) hotel-regime management, 3) accommodation booking.",
  },
};

const WhatsappQuickContact = () => {
  const { language } = useLanguage();
  const { trackWhatsApp } = useCtaAnalytics();
  const c = COPY[language === "en" ? "en" : "ro"];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!name.trim() || !phone.trim() || !message.trim()) {
      toast.error(c.missing);
      return;
    }
    const text = [
      c.intro,
      "",
      `${c.name}: ${name.trim()}`,
      `${c.phone}: ${phone.trim()}`,
      `${c.message}: ${message.trim()}`,
      "",
      c.options,
    ].join("\n");

    trackWhatsApp();
    toast.success(c.opened);
    window.open(
      `https://wa.me/${WA_AUTOMATION_NUMBER}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <section id="whatsapp-contact" className="py-16 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-xl mx-auto rounded-2xl border border-border bg-card p-6 md:p-8 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            {c.label}
          </p>
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-2">{c.title}</h2>
          <p className="text-sm text-muted-foreground mb-6">{c.subtitle}</p>

          <div className="space-y-4">
            <div>
              <Label htmlFor="wa-name">{c.name}</Label>
              <Input
                id="wa-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={c.namePh}
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="wa-phone">{c.phone}</Label>
              <Input
                id="wa-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={c.phonePh}
                autoComplete="tel"
              />
            </div>
            <div>
              <Label htmlFor="wa-message">{c.message}</Label>
              <Textarea
                id="wa-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={c.messagePh}
                rows={4}
              />
            </div>
            <Button
              onClick={handleSend}
              className="w-full min-h-[48px]"
              aria-label={c.send}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              {c.send}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatsappQuickContact;
