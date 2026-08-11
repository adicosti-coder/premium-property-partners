import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, MessageCircle, AlertCircle } from "lucide-react";
import {
  trackConversion,
  isValidWhatsAppNumber,
  formatPhoneInput,
} from "@/lib/conversionTracking";
import { submitLead } from "@/lib/leadSubmission";
import FormTrustBadges from "@/components/forms/FormTrustBadges";
import { formMessages } from "@/lib/formMessages";

const QuickContactForm = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRo = language === "ro";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+40 ");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const phoneValid = isValidWhatsAppNumber(phone);
  const phoneTouched = phone.replace(/\D/g, "").length > 3;

  const t = {
    title: isRo ? "Trimite-ne un mesaj rapid" : "Send us a quick message",
    subtitle: isRo
      ? "Echipa RealTrust te contactează în maxim 1 oră lucrătoare."
      : "The RealTrust team will reach out within 1 business hour.",
    name: isRo ? "Nume" : "Name",
    phone: isRo ? "Telefon / WhatsApp *" : "Phone / WhatsApp *",
    email: isRo ? "Email (opțional)" : "Email (optional)",
    message: isRo ? "Mesaj *" : "Message *",
    msgPlaceholder: isRo
      ? "Cum te putem ajuta? (vânzare, închiriere, administrare regim hotelier...)"
      : "How can we help? (sale, rental, short-term rental management...)",
    send: isRo ? "Trimite mesajul" : "Send message",
    sending: isRo ? "Se trimite..." : "Sending...",
    error: formMessages.errorBody(language),
    invalid: formMessages.validationBody(language),
    invalidPhone: formMessages.invalidPhone(language),
    phoneValid: isRo ? "Număr WhatsApp valid" : "Valid WhatsApp number",
  };

  const handlePhoneChange = (raw: string) => {
    setPhone(formatPhoneInput(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // guard against double-click

    // Quick client-side phone validation for a precise toast
    if (!isValidWhatsAppNumber(phone)) {
      toast.error(t.invalidPhone);
      return;
    }

    setLoading(true);
    try {
      const result = await submitLead({
        name,
        whatsapp_number: phone,
        email,
        message,
        property_type: "general",
        property_area: 0,
        source: "pagina_contact",
      });

      if (result.ok === false) {
        if (result.reason === "validation") {
          toast.error(result.errors.whatsapp_number ? t.invalidPhone : t.invalid);
        } else {
          toast.error(t.error);
        }
        return;
      }

      if (result.duplicate) {
        toast.success(formMessages.duplicateBody(language));
      }

      trackConversion({ event: "contact_form_submit", source: "pagina_contact" });
      navigate("/multumim");
    } finally {
      setLoading(false);
    }
  };


  return (
    <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-6 sm:p-8 space-y-4">
      <div>
        <h3 className="text-xl font-serif font-semibold mb-1">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contact-name">{t.name}</Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            autoComplete="name"
          />
        </div>
        <div>
          <Label htmlFor="contact-phone">{t.phone}</Label>
          <Input
            id="contact-phone"
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            maxLength={20}
            required
            autoComplete="tel"
            placeholder="+40 7XX XXX XXX"
            aria-invalid={phoneTouched && !phoneValid}
            className={phoneTouched && !phoneValid ? "border-destructive focus-visible:ring-destructive" : ""}
          />
          {phoneTouched && !phoneValid && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {t.invalidPhone}
            </p>
          )}
          {phoneValid && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {t.phoneValid}
            </p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="contact-email">{t.email}</Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={255}
          autoComplete="email"
        />
      </div>

      <div>
        <Label htmlFor="contact-message">{t.message}</Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          rows={4}
          required
          placeholder={t.msgPlaceholder}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-blue-950 font-bold gap-2"
      >
        <Send className="w-4 h-4" />
        {loading ? t.sending : t.send}
      </Button>

      <FormTrustBadges className="mt-2" />
    </form>
  );
};

export default QuickContactForm;
