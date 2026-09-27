import { useState } from "react";
import { Phone, CalendarClock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitLead } from "@/lib/leadSubmission";
import { isValidWhatsAppNumber } from "@/lib/conversionTracking";

const SLOTS = ["Cât mai curând", "09:00–12:00", "12:00–15:00", "15:00–18:00"];

const CallbackCard = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [slot, setSlot] = useState(SLOTS[0]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !isValidWhatsAppNumber(phone)) {
      toast.error("Completați numele și un număr de telefon valid.");
      return;
    }
    setLoading(true);
    try {
      const res = await submitLead({
        name: name.trim(),
        whatsapp_number: phone,
        email: email.trim() || undefined,
        message: `Cerere apel 2 minute · interval: ${slot}`,
        property_type: "general",
        property_area: 0,
        source: "apel_2_minute",
      } as any);
      if (res.ok === false) throw new Error("fail");
      setDone(true);
      toast.success("Mulțumim! Vă sunăm în intervalul ales.");
    } catch {
      toast.error("Nu am putut trimite cererea. Încercați din nou sau sunați-ne direct.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="programare-apel" className="max-w-4xl mx-auto mb-12 scroll-mt-24">
      <div className="rounded-3xl border border-accent/30 bg-card shadow-lg overflow-hidden grid md:grid-cols-2">
        <div className="p-6 sm:p-8 bg-accent/[0.07] flex flex-col gap-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Drum direct</p>
          <h2 className="font-serif text-2xl font-semibold">Un apel de 2 minute</h2>
          <p className="text-sm text-muted-foreground">
            Nu folosiți WhatsApp? Sunați-ne acum sau lăsați-ne numărul și vă sunăm noi, în intervalul ales.
          </p>
          <a href="tel:+40799069256" className="w-full">
            <Button size="lg" className="w-full min-h-12 gap-2 bg-accent text-accent-foreground hover:bg-accent/90">
              <Phone className="w-4 h-4" /> Sunați acum
            </Button>
          </a>
          <a href="https://wa.me/40799069256" target="_blank" rel="noopener noreferrer" className="w-full">
            <Button size="lg" variant="outline" className="w-full min-h-12 gap-2">
              <MessageCircle className="w-4 h-4" /> Scrieți pe WhatsApp
            </Button>
          </a>
        </div>
        <form onSubmit={submit} className="p-6 sm:p-8 flex flex-col gap-3">
          <div className="flex items-center gap-2 font-semibold"><CalendarClock className="w-4 h-4 text-accent" /> Vă sunăm noi</div>
          {done ? (
            <p className="text-sm text-muted-foreground">Cererea a fost trimisă. Vă contactăm în scurt timp.</p>
          ) : (
            <>
              <Input aria-label="Nume" placeholder="Nume *" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              <Input aria-label="Telefon" placeholder="Telefon *" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
              <Input aria-label="E-mail" placeholder="E-mail (opțional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} />
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Interval apel">
                {SLOTS.map((s) => (
                  <button
                    type="button" key={s} role="radio" aria-checked={slot === s} onClick={() => setSlot(s)}
                    className={`min-h-10 rounded-full border px-3 text-xs ${slot === s ? "border-accent bg-accent/10 text-foreground" : "border-border text-muted-foreground"}`}
                  >{s}</button>
                ))}
              </div>
              <Button type="submit" disabled={loading} className="min-h-12">{loading ? "Se trimite…" : "Programează apelul"}</Button>
            </>
          )}
        </form>
      </div>
    </section>
  );
};

export default CallbackCard;
