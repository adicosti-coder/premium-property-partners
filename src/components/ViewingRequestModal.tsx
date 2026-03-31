import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { CalendarCheck, Loader2, CheckCircle2 } from "lucide-react";

interface ViewingRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyName: string;
  propertyId: string;
}

const ViewingRequestModal = ({ open, onOpenChange, propertyName, propertyId }: ViewingRequestModalProps) => {
  const { language } = useLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const t = language === "ro" ? {
    title: "Programează o Vizionare",
    desc: `Completează formularul pentru a vizita ${propertyName}.`,
    name: "Nume complet",
    phone: "Număr de telefon",
    timeSlot: "Interval orar preferat",
    morning: "Dimineață (9:00 – 12:00)",
    afternoon: "După-amiază (12:00 – 17:00)",
    evening: "Seara (17:00 – 20:00)",
    submit: "Trimite Cererea",
    success: "Cererea ta a fost trimisă! Te vom contacta în cel mai scurt timp.",
    errorName: "Introduceți numele",
    errorPhone: "Introduceți un număr de telefon valid",
    errorSlot: "Selectați un interval orar",
  } : {
    title: "Schedule a Viewing",
    desc: `Fill in the form to visit ${propertyName}.`,
    name: "Full name",
    phone: "Phone number",
    timeSlot: "Preferred time slot",
    morning: "Morning (9:00 – 12:00)",
    afternoon: "Afternoon (12:00 – 17:00)",
    evening: "Evening (17:00 – 20:00)",
    submit: "Send Request",
    success: "Your request has been sent! We'll contact you shortly.",
    errorName: "Please enter your name",
    errorPhone: "Please enter a valid phone number",
    errorSlot: "Please select a time slot",
  };

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) { toast({ title: t.errorName, variant: "destructive" }); return; }
    if (!phone.trim() || phone.trim().length < 6) { toast({ title: t.errorPhone, variant: "destructive" }); return; }
    if (!timeSlot) { toast({ title: t.errorSlot, variant: "destructive" }); return; }

    setIsSubmitting(true);
    try {
      const msg = `Vizionare: ${propertyName} (${propertyId})\nNume: ${name}\nTelefon: ${phone}\nInterval: ${timeSlot}`;
      window.open(`https://wa.me/40723154520?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
      setIsSuccess(true);
      toast({ title: t.success });
    } finally {
      setIsSubmitting(false);
    }
  }, [name, phone, timeSlot, propertyName, propertyId, t]);

  const handleClose = (val: boolean) => {
    if (!val) { setName(""); setPhone(""); setTimeSlot(""); setIsSuccess(false); }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-serif">{t.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-center text-muted-foreground text-sm max-w-xs">{t.success}</p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="viewing-name">{t.name}</Label>
              <Input id="viewing-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ion Popescu" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewing-phone">{t.phone}</Label>
              <Input id="viewing-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+40 7XX XXX XXX" />
            </div>
            <div className="space-y-2">
              <Label>{t.timeSlot}</Label>
              <Select value={timeSlot} onValueChange={setTimeSlot}>
                <SelectTrigger><SelectValue placeholder={t.timeSlot} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">{t.morning}</SelectItem>
                  <SelectItem value="afternoon">{t.afternoon}</SelectItem>
                  <SelectItem value="evening">{t.evening}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CalendarCheck className="w-4 h-4 mr-2" />}
              {t.submit}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewingRequestModal;
