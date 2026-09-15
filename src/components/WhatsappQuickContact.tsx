import { useEffect, useState } from "react";
import { Home, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { fetchPublicListings } from "@/lib/listingQueries";

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
    txTitle: "Sau discută direct despre un apartament",
    txPick: "Alege apartamentul",
    txSend: "Deschide discuția despre apartament",
    txMissing: "Alege mai întâi apartamentul.",
    txIntro: "Bună ziua! Sunt interesat(ă) de acest apartament de pe realtrust.ro:",
    txAsk: "Îmi puteți trimite detaliile, prețul final și o vizionare?",
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
    txTitle: "Or talk directly about an apartment",
    txPick: "Choose the apartment",
    txSend: "Open the chat about this apartment",
    txMissing: "Please choose an apartment first.",
    txIntro: "Hello! I'm interested in this apartment from realtrust.ro:",
    txAsk: "Could you send me the details, the final price and a viewing?",
  },
};

type SaleListing = {
  id: string;
  name: string;
  slug: string | null;
  location: string | null;
  size: number | null;
  bedrooms: number | null;
  capital_necesar: number | null;
};

const WhatsappQuickContact = () => {
  const { language } = useLanguage();
  const { trackWhatsApp } = useCtaAnalytics();
  const c = COPY[language === "en" ? "en" : "ro"];

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [listings, setListings] = useState<SaleListing[]>([]);
  const [pickedListing, setPickedListing] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await fetchPublicListings<SaleListing>({
        columns: ["id", "name", "slug", "location", "size", "bedrooms", "capital_necesar"],
        listingTypes: ["vanzare", "investitie"],
        orderBy: { column: "name", ascending: true },
      });
      if (active) setListings((data ?? []).filter((l) => !!l.slug));
    })();
    return () => { active = false; };
  }, []);

  /** Butonul de tranzacție: deschide discuția live cu anunțul ales. */
  const handleTransaction = () => {
    const listing = listings.find((l) => l.id === pickedListing);
    if (!listing) {
      toast.error(c.txMissing);
      return;
    }
    const details = [
      listing.bedrooms ? `${listing.bedrooms} camere` : null,
      listing.size ? `${listing.size} m²` : null,
      listing.location || null,
      listing.capital_necesar ? `${listing.capital_necesar.toLocaleString("ro-RO")} €` : null,
    ].filter(Boolean).join(" · ");
    const text = [
      c.txIntro,
      "",
      listing.name,
      details || null,
      `https://realtrust.ro/proprietate/${listing.slug}`,
      "",
      c.txAsk,
    ].filter((l) => l !== null).join("\n");

    trackWhatsApp();
    toast.success(c.opened);
    window.open(
      `https://wa.me/${WA_AUTOMATION_NUMBER}?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

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

          {listings.length > 0 && (
            <div className="mt-8 border-t border-border pt-6">
              <p className="text-sm font-medium text-foreground mb-3">{c.txTitle}</p>
              <div className="space-y-3">
                <Select value={pickedListing} onValueChange={setPickedListing}>
                  <SelectTrigger aria-label={c.txPick} className="min-h-[48px]">
                    <SelectValue placeholder={c.txPick} />
                  </SelectTrigger>
                  <SelectContent>
                    {listings.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleTransaction}
                  className="w-full min-h-[48px]"
                  aria-label={c.txSend}
                >
                  <Home className="w-5 h-5 mr-2" />
                  {c.txSend}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default WhatsappQuickContact;
