import { useState } from "react";
import { Calendar, Users, Phone, Mail, MessageSquare, Globe, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const bookingSchema = z.object({
  name: z.string().min(2, "Numele trebuie să aibă minim 2 caractere").max(100),
  phone: z.string().min(10, "Număr de telefon invalid").max(20),
  email: z.string().email("Email invalid").max(255),
  checkIn: z.string().min(1, "Selectează data de check-in"),
  checkOut: z.string().min(1, "Selectează data de check-out"),
  guests: z.string().min(1, "Selectează numărul de oaspeți"),
  country: z.string().min(1, "Selectează țara de proveniență"),
  message: z.string().max(500).optional(),
});

interface BookingFormProps {
  isOpen: boolean;
  onClose: () => void;
  propertyName?: string;
}

const countries = [
  "România", "Germania", "Franța", "Italia", "Spania", "Marea Britanie",
  "Olanda", "Belgia", "Austria", "Elveția", "Polonia", "Ungaria",
  "SUA", "Canada", "Australia", "Altă țară"
];

const BookingForm = ({ isOpen, onClose, propertyName }: BookingFormProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    checkIn: "",
    checkOut: "",
    guests: "",
    country: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    try {
      bookingSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const sendEmailNotification = async () => {
    try {
      await supabase.functions.invoke('send-booking-notification', {
        body: {
          guestName: formData.name,
          guestEmail: formData.email,
          guestPhone: formData.phone,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          guests: formData.guests,
          country: formData.country,
          message: formData.message,
          propertyName: propertyName || "Orice proprietate disponibilă",
        }
      });
    } catch (error) {
      console.error("Email notification error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Eroare",
        description: "Verifică câmpurile marcate cu roșu",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    // Send email notification
    await sendEmailNotification();

    // Build WhatsApp message
    const property = propertyName || "Orice proprietate disponibilă";
    const whatsappMessage = `🏠 *Cerere de Rezervare - RealTrust*

👤 *Nume:* ${formData.name}
📧 *Email:* ${formData.email}
📱 *Telefon:* ${formData.phone}
🌍 *Țara:* ${formData.country}

📅 *Check-in:* ${formData.checkIn}
📅 *Check-out:* ${formData.checkOut}
👥 *Număr oaspeți:* ${formData.guests}

🏡 *Proprietate:* ${property}

💬 *Mesaj:* ${formData.message || "Fără mesaj adițional"}`;

    const encodedMessage = encodeURIComponent(whatsappMessage);
    const whatsappUrl = `https://wa.me/40742000000?text=${encodedMessage}`;

    // Open WhatsApp
    window.open(whatsappUrl, "_blank");

    toast({
      title: "Cerere trimisă!",
      description: "Te vom contacta în curând pentru confirmare.",
    });

    setIsSubmitting(false);
    onClose();
    setFormData({
      name: "",
      phone: "",
      email: "",
      checkIn: "",
      checkOut: "",
      guests: "",
      country: "",
      message: "",
    });
  };

  // Get today's date for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Rezervă Acum
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {propertyName ? (
              <>Completează formularul pentru <span className="text-primary font-medium">{propertyName}</span></>
            ) : (
              "Completează formularul și te vom contacta pentru a găsi proprietatea perfectă"
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Nume complet *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Ion Popescu"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground flex items-center gap-2">
                <Phone className="w-4 h-4 text-primary" />
                Telefon *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                placeholder="+40 7XX XXX XXX"
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@exemplu.com"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
          </div>

          {/* Check-in & Check-out */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn" className="text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Check-in *
              </Label>
              <Input
                id="checkIn"
                type="date"
                min={today}
                value={formData.checkIn}
                onChange={(e) => handleChange("checkIn", e.target.value)}
                className={errors.checkIn ? "border-destructive" : ""}
              />
              {errors.checkIn && <p className="text-xs text-destructive">{errors.checkIn}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="checkOut" className="text-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                Check-out *
              </Label>
              <Input
                id="checkOut"
                type="date"
                min={formData.checkIn || today}
                value={formData.checkOut}
                onChange={(e) => handleChange("checkOut", e.target.value)}
                className={errors.checkOut ? "border-destructive" : ""}
              />
              {errors.checkOut && <p className="text-xs text-destructive">{errors.checkOut}</p>}
            </div>
          </div>

          {/* Guests & Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Număr oaspeți *
              </Label>
              <Select value={formData.guests} onValueChange={(value) => handleChange("guests", value)}>
                <SelectTrigger className={errors.guests ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selectează" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                    <SelectItem key={num} value={num.toString()}>
                      {num} {num === 1 ? "oaspete" : "oaspeți"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.guests && <p className="text-xs text-destructive">{errors.guests}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-foreground flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Țara de proveniență *
              </Label>
              <Select value={formData.country} onValueChange={(value) => handleChange("country", value)}>
                <SelectTrigger className={errors.country ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selectează" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.country && <p className="text-xs text-destructive">{errors.country}</p>}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Cerințe speciale (opțional)
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleChange("message", e.target.value)}
              placeholder="Menționează orice cerințe speciale: pat suplimentar, parcare, etc."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Anulează
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isSubmitting ? (
                "Se trimite..."
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Trimite pe WhatsApp
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BookingForm;