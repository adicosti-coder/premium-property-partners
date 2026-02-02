import { useState } from "react";
import { Phone, Mail, MapPin, Copy, Check, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { useCtaAnalytics } from "@/hooks/useCtaAnalytics";

const ContactSection = () => {
  const { t } = useLanguage();
  const { trackWhatsApp, trackEmail, trackCall } = useCtaAnalytics();
  const [copied, setCopied] = useState(false);

  const copyTemplate = async () => {
    try {
      await navigator.clipboard.writeText(t.contactSection.template);
      setCopied(true);
      toast.success(t.contactSection.templateCopied);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error(t.contactSection.templateCopyError);
    }
  };

  const handleWhatsApp = () => {
    trackWhatsApp();
    const message = encodeURIComponent(t.contactSection.whatsappMessage);
    window.open(`https://wa.me/40723154520?text=${message}`, "_blank");
  };

  const handleEmail = () => {
    trackEmail();
    const subject = encodeURIComponent("Solicitare Evaluare Gratuită - RealTrust");
    const body = encodeURIComponent(t.contactSection.template);
    window.location.href = `mailto:adicosti@gmail.com?subject=${subject}&body=${body}`;
  };

  const handleCall = () => {
    trackCall();
    window.location.href = "tel:+40723154520";
  };

  return (
    <section id="contact" className="py-24 bg-background relative overflow-hidden">
      {/* Background decorations - centered */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-70" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center mb-16">
          <p className="text-primary uppercase tracking-widest text-sm font-semibold mb-4">{t.contactSection.sectionLabel}</p>
          <h2 className="text-3xl md:text-4xl font-serif font-semibold text-foreground mb-4">
            {t.contactSection.title} <span className="text-gradient-gold">{t.contactSection.titleHighlight}</span>
          </h2>
          <p className="text-foreground/70 dark:text-muted-foreground max-w-2xl mx-auto">
            {t.contactSection.subtitle}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div className="space-y-8">
            <div className="bg-card p-8 rounded-2xl border border-border">
              <h3 className="text-xl font-serif font-semibold text-foreground mb-6">
                {t.contactSection.contactInfo}
              </h3>
              
              <div className="space-y-6">
                <a
                  href="tel:+40723154520"
                  onClick={handleCall}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60 dark:text-muted-foreground">{t.contactSection.phone}</p>
                    <p className="text-foreground font-medium group-hover:text-primary transition-colors">
                      0723 154 520
                    </p>
                  </div>
                </a>

                <a
                  href="mailto:adicosti@gmail.com"
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60 dark:text-muted-foreground">{t.contactSection.email}</p>
                    <p className="text-foreground font-medium group-hover:text-primary transition-colors">
                      adicosti@gmail.com
                    </p>
                  </div>
                </a>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60 dark:text-muted-foreground">{t.contactSection.location}</p>
                    <p className="text-foreground font-medium">Timișoara, România</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="whatsapp" className="flex-1" onClick={handleWhatsApp}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    {t.contactSection.whatsapp}
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleEmail}>
                    <Send className="w-4 h-4 mr-2" />
                    {t.contactSection.sendEmail}
                  </Button>
                </div>
              </div>
            </div>

            {/* Working Hours */}
            <div className="bg-secondary/30 p-6 rounded-xl border border-border">
              <h4 className="font-semibold text-foreground mb-4">{t.contactSection.schedule}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-foreground/60 dark:text-muted-foreground">{t.contactSection.mondayFriday}</span>
                  <span className="text-foreground">09:00 - 18:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60 dark:text-muted-foreground">{t.contactSection.saturday}</span>
                  <span className="text-foreground">10:00 - 14:00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-foreground/60 dark:text-muted-foreground">{t.contactSection.guestSupport}</span>
                  <span className="text-primary font-medium">24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Template */}
          <div className="bg-card p-8 rounded-2xl border border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-serif font-semibold text-foreground">
                {t.contactSection.quickTemplate}
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
                    {t.contactSection.copied}
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    {t.contactSection.copy}
                  </>
                )}
              </Button>
            </div>

            <div className="bg-secondary/50 p-6 rounded-xl font-mono text-sm text-foreground/60 dark:text-muted-foreground whitespace-pre-wrap leading-relaxed border border-border">
              {t.contactSection.template}
            </div>

            <p className="mt-4 text-sm text-foreground/60 dark:text-muted-foreground">
              {t.contactSection.templateDescription}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <Button variant="premium" className="flex-1" onClick={handleEmail}>
                <Mail className="w-4 h-4 mr-2" />
                {t.contactSection.sendByEmail}
              </Button>
              <Button variant="whatsapp" className="flex-1" onClick={handleWhatsApp}>
                <MessageCircle className="w-4 h-4 mr-2" />
                {t.contactSection.sendByWhatsapp}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;