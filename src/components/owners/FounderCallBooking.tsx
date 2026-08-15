import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarClock, CheckCircle2, Clock, Loader2, Phone } from "lucide-react";
import { trackConversion } from "@/lib/conversionTracking";

/**
 * FounderCallBooking — programare call de 15 minute direct cu fondatorul.
 * Sloturi generate local (zile lucrătoare, program 10:00–18:00 Europe/Bucharest),
 * salvate în `chatbot_appointments` (insert public permis prin RLS + rate limit pe telefon).
 */

const SLOTS = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"] as const;
const APPOINTMENT_TYPE = "call_15min_proprietar";

function nextWorkingDays(count: number): Date[] {
  const days: Date[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.length < count) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) days.push(new Date(cursor));
  }
  return days;
}

const toISODate = (d: Date) => {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

const FounderCallBooking = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";
  const { toast } = useToast();

  const days = useMemo(() => nextWorkingDays(5), []);
  const [selectedDate, setSelectedDate] = useState(() => toISODate(nextWorkingDays(1)[0]));
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const t = isRo
    ? {
        badge: "Call de 15 minute",
        title: "Alege un interval și vorbim direct",
        subtitle:
          "Fără prezentări lungi: 15 minute în care îți spunem estimarea de venit pentru apartamentul tău și dacă suntem potriviți. Dacă nu e cazul, îți spunem sincer.",
        pickDay: "Ziua",
        pickSlot: "Ora (ora României)",
        name: "Nume",
        phone: "Telefon",
        email: "Email (opțional)",
        notes: "Zona / tipul apartamentului (opțional)",
        submit: "Rezervă intervalul",
        sending: "Se trimite...",
        needSlot: "Alege o oră disponibilă.",
        needFields: "Completează numele și telefonul.",
        okTitle: "Interval rezervat",
        okDesc: "Te sunăm la ora aleasă. Dacă apare o suprapunere, îți propunem alt interval prin WhatsApp.",
        errTitle: "Nu am putut salva programarea",
        errDesc: "Încearcă din nou sau scrie-ne pe WhatsApp la 0799 069 256.",
        doneTitle: "Ne auzim curând",
        doneBody: "Programarea a fost înregistrată. Primești confirmarea pe telefon.",
        note: "Program: luni–vineri, 10:00–18:00. Durată: 15 minute, fără obligații.",
      }
    : {
        badge: "15-minute call",
        title: "Pick a slot and talk to us directly",
        subtitle:
          "No long pitch: 15 minutes to get your apartment's income estimate and find out whether we're a fit. If we're not, we'll say so.",
        pickDay: "Day",
        pickSlot: "Time (Romania time)",
        name: "Name",
        phone: "Phone",
        email: "Email (optional)",
        notes: "Area / apartment type (optional)",
        submit: "Book the slot",
        sending: "Sending...",
        needSlot: "Please pick an available time.",
        needFields: "Please fill in your name and phone.",
        okTitle: "Slot booked",
        okDesc: "We'll call you at the chosen time. If there's an overlap, we'll propose another slot on WhatsApp.",
        errTitle: "Could not save the booking",
        errDesc: "Please try again or message us on WhatsApp at +40 799 069 256.",
        doneTitle: "Talk soon",
        doneBody: "Your booking is registered. You'll get a confirmation by phone.",
        note: "Hours: Mon–Fri, 10:00–18:00. Duration: 15 minutes, no obligation.",
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || phone.trim().length < 7) {
      toast({ title: t.needFields, variant: "destructive" });
      return;
    }
    if (!selectedSlot) {
      toast({ title: t.needSlot, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("chatbot_appointments").insert({
        appointment_type: APPOINTMENT_TYPE,
        contact_name: name.trim(),
        contact_phone: phone.trim(),
        contact_email: email.trim() ? email.trim() : null,
        preferred_date: selectedDate,
        preferred_time_slot: selectedSlot,
        notes: notes.trim() ? notes.trim() : null,
        status: "pending",
      });
      if (error) throw error;

      trackConversion({
        event: "generate_lead",
        source: "owners_founder_call_booking",
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      });

      setDone(true);
      toast({ title: t.okTitle, description: t.okDesc });
    } catch {
      toast({ title: t.errTitle, description: t.errDesc, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="call-15-min" className="py-16 md:py-20 bg-muted/30 scroll-mt-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
            <CalendarClock className="w-4 h-4 mr-2 text-primary" />
            {t.badge}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.title}</h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <Card className="border-primary/15 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" aria-hidden="true" />
              {t.pickSlot}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" aria-hidden="true" />
                <p className="font-semibold text-lg mb-1">{t.doneTitle}</p>
                <p className="text-muted-foreground text-sm">{t.doneBody}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <span className="text-sm font-medium mb-2 block">{t.pickDay}</span>
                  <div className="flex flex-wrap gap-2" role="group" aria-label={t.pickDay}>
                    {days.map((d) => {
                      const iso = toISODate(d);
                      const active = iso === selectedDate;
                      return (
                        <Button
                          key={iso}
                          type="button"
                          variant={active ? "default" : "outline"}
                          className="min-h-12 flex-col px-4 py-2 h-auto"
                          aria-pressed={active}
                          aria-label={d.toLocaleDateString(isRo ? "ro-RO" : "en-GB", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                          onClick={() => setSelectedDate(iso)}
                        >
                          <span className="text-xs capitalize">
                            {d.toLocaleDateString(isRo ? "ro-RO" : "en-GB", { weekday: "short" })}
                          </span>
                          <span className="text-sm font-semibold">
                            {d.toLocaleDateString(isRo ? "ro-RO" : "en-GB", { day: "numeric", month: "short" })}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <span className="text-sm font-medium mb-2 block">{t.pickSlot}</span>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2" role="group" aria-label={t.pickSlot}>
                    {SLOTS.map((slot) => {
                      const active = slot === selectedSlot;
                      return (
                        <Button
                          key={slot}
                          type="button"
                          variant={active ? "default" : "outline"}
                          className="min-h-12"
                          aria-pressed={active}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          {slot}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="call-name">{t.name}</Label>
                    <Input
                      id="call-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="call-phone">{t.phone}</Label>
                    <Input
                      id="call-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      inputMode="tel"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="call-email">{t.email}</Label>
                    <Input
                      id="call-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="call-notes">{t.notes}</Label>
                    <Input
                      id="call-notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full min-h-12" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                      {t.sending}
                    </>
                  ) : (
                    <>
                      <Phone className="w-4 h-4 mr-2" aria-hidden="true" />
                      {t.submit}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">{t.note}</p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default FounderCallBooking;
