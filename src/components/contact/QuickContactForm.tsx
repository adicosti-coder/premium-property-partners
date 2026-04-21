import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, CheckCircle2 } from "lucide-react";

const contactSchema = z.object({
  name: z.string().trim().min(2, "min").max(100, "max"),
  whatsapp_number: z.string().trim().min(7, "min").max(30, "max"),
  email: z.string().trim().email("email").max(255).optional().or(z.literal("")),
  message: z.string().trim().min(5, "min").max(1000, "max"),
});

const QuickContactForm = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
    success: isRo ? "Mesaj trimis! Te contactăm în curând." : "Message sent! We'll be in touch shortly.",
    error: isRo ? "Eroare la trimitere. Încearcă din nou sau sună-ne direct." : "Send failed. Please try again or call us directly.",
    invalid: isRo ? "Verifică datele introduse." : "Please check the entered data.",
    successTitle: isRo ? "Mesaj înregistrat" : "Message received",
    successDesc: isRo
      ? "Mulțumim! Un consultant RealTrust te va contacta în maxim 1 oră lucrătoare."
      : "Thank you! A RealTrust consultant will contact you within 1 business hour.",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = contactSchema.safeParse({
      name,
      whatsapp_number: phone,
      email,
      message,
    });
    if (!parsed.success) {
      toast.error(t.invalid);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("leads").insert({
        name: parsed.data.name,
        whatsapp_number: parsed.data.whatsapp_number,
        email: parsed.data.email || null,
        message: parsed.data.message,
        property_type: "general",
        property_area: 0,
        source: "pagina_contact",
      });
      if (error) throw error;
      setDone(true);
      toast.success(t.success);
    } catch {
      toast.error(t.error);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="bg-card border rounded-2xl p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
        <h3 className="text-xl font-semibold mb-2">{t.successTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.successDesc}</p>
      </div>
    );
  }

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
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
            required
            autoComplete="tel"
            placeholder="+40 7XX XXX XXX"
          />
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
    </form>
  );
};

export default QuickContactForm;
