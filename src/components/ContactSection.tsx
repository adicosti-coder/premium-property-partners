import { useState } from "react";
import { Phone, Mail, MapPin, Copy, Check, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const quickTemplate = `Bună ziua,

Sunt proprietar al unui apartament în Timișoara și sunt interesat de serviciile de administrare în regim hotelier oferite de RealTrust.

Detalii proprietate:
- Locație: [zona]
- Tipul apartamentului: [nr. camere]
- Suprafață: [mp]

Vă rog să mă contactați pentru o evaluare gratuită.

Mulțumesc!`;

const ContactSection = () => {
  const [copied, setCopied] = useState(false);

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(quickTemplate);
      setCopied(true);
      toast.success("Șablon copiat în clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Nu s-a putut copia șablonul");
    }
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent("Bună ziua! Sunt proprietar și sunt interesat de serviciile de administrare RealTrust.");
    window.open(`https://wa.me/40756123456?text=${message}`, "_blank");
  };

  const handleEmail = () => {
    const subject = encodeURIComponent("Solicitare Evaluare Gratuită - RealTrust");
    const body = encodeURIComponent(quickTemplate);
    window.location.href = `mailto:contact@realtrust.ro?subject=${subject}&body=${body}`;
  };

  return (
    <section id="contact" className="py-24 bg-background relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4">Contact</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            Hai Să <span className="text-gradient-gold">Discutăm</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Suntem aici să răspundem la toate întrebările tale. Contactează-ne pentru o evaluare gratuită a proprietății.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-card p-8 rounded-2xl border border-border">
              <h3 className="text-xl font-serif font-semibold text-foreground mb-6">
                Informații Contact
              </h3>
              
              <div className="space-y-6">
                <a
                  href="tel:+40756123456"
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p className="text-foreground font-medium group-hover:text-primary transition-colors">
                      +40 756 123 456
                    </p>
                  </div>
                </a>

                <a
                  href="mailto:contact@realtrust.ro"
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-foreground font-medium group-hover:text-primary transition-colors">
                      contact@realtrust.ro
                    </p>
                  </div>
                </a>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Locație</p>
                    <p className="text-foreground font-medium">Timișoara, România</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="whatsapp" className="flex-1" onClick={handleWhatsApp}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleEmail}>
                    <Send className="w-4 h-4 mr-2" />
                    Trimite Email
                  </Button>
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div className="bg-secondary/30 p-6 rounded-xl border border-border">
              <h4 className="font-semibold text-foreground mb-4">Program</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Luni - Vineri</span>
                  <span className="text-foreground">09:00 - 18:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sâmbătă</span>
                  <span className="text-foreground">10:00 - 14:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suport Oaspeți</span>
                  <span className="text-primary font-medium">24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Template */}
          <div className="bg-card p-8 rounded-2xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif font-semibold text-foreground">
                Șablon Rapid pentru Proprietari
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyTemplate}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copiat!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copiază
                  </>
                )}
              </Button>
            </div>

            <div className="bg-secondary/50 p-6 rounded-xl font-mono text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed border border-border">
              {quickTemplate}
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Copiază acest șablon și completează-l cu datele proprietății tale. Îl poți trimite prin email sau WhatsApp.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <Button variant="premium" className="flex-1" onClick={handleEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Trimite prin Email
              </Button>
              <Button variant="whatsapp" className="flex-1" onClick={handleWhatsApp}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Trimite pe WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
