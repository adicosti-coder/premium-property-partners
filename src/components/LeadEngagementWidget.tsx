import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { MessageSquare, Phone, ArrowRight, ShieldCheck, X, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { submitLead } from "@/lib/leadSubmission";
import { roMobileField } from "@/lib/phoneField";
import { SocialPreview } from "@/components/social/SocialFollow";

export type LeadPropertyType = "apartament" | "casa_istorica" | "administrare_regim_hotelier";

export interface LeadEngagementWidgetProps {
  /** WhatsApp Business number, international digits without "+". */
  whatsappNumber?: string;
  /** Pre-filled WhatsApp text. */
  whatsappMessage?: string;
  /** Saved as `leads.source` so admin can see where the lead came from. */
  source?: string;
  /** Extra positioning classes (e.g. raise above a bottom bar). */
  className?: string;
  /** Called after a lead is saved. */
  onLeadSubmitted?: (lead: { name: string; phone: string; propertyType: LeadPropertyType }) => void;
}

const PROPERTY_TYPES: { value: LeadPropertyType; label: string }[] = [
  { value: "apartament", label: "Apartament" },
  { value: "casa_istorica", label: "Casă istorică" },
  { value: "administrare_regim_hotelier", label: "Administrare regim hotelier" },
];

export const LEAD_INTENTS = ["Simulare randament", "Administrare regim hotelier"] as const;
export type LeadIntent = (typeof LEAD_INTENTS)[number];

/** Source tag saved on the lead: `lead_engagement_widget:<pathname>` (max 100 chars). */
export const buildWidgetSource = (pathname: string) => `lead_engagement_widget:${pathname || "/"}`.slice(0, 100);

const schema = z.object({
  name: z.string().trim().min(2, "Scrieți numele (minim 2 caractere).").max(120),
  phone: roMobileField("Introduceți un număr de mobil valid (07XX XXX XXX)."),
  propertyType: z.enum(["apartament", "casa_istorica", "administrare_regim_hotelier"]),
  intent: z.enum(LEAD_INTENTS),
  message: z.string().trim().max(1000, "Mesajul poate avea maxim 1000 de caractere."),
});

const LeadEngagementWidget = ({
  whatsappNumber = "40799069256",
  whatsappMessage = "Bună ziua! Aș dori informații despre randamentul apartamentului meu din Timișoara.",
  source = "lead_engagement_widget",
  className,
  onLeadSubmitted,
}: LeadEngagementWidgetProps) => {
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: "",
    phone: "",
    propertyType: "apartament" as LeadPropertyType,
    intent: LEAD_INTENTS[0] as LeadIntent,
    message: "",
  });

  const waHref = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setErrors({});
    setSending(true);
    const typeLabel = PROPERTY_TYPES.find((t) => t.value === parsed.data.propertyType)?.label ?? "";
    const res = await submitLead({
      name: parsed.data.name,
      // Lead storage expects international format (+407…); the field returns 07…
      whatsapp_number: parsed.data.phone.replace(/\D/g, "").replace(/^0/, "+40").replace(/^(?!\+)/, "+"),
      property_type: typeLabel,
      property_area: 0,
      message: [`Intenție: ${parsed.data.intent}`, parsed.data.message].filter(Boolean).join("\n"),
      source: source === "lead_engagement_widget" ? buildWidgetSource(window.location.pathname) : source,
      simulation_data: {
        page_url: window.location.href,
        intent: parsed.data.intent,
        mesaj: parsed.data.message || parsed.data.intent,
        phone_verified: true,
      },
    });
    setSending(false);
    if (!res.ok) {
      toast.error("Nu am putut trimite mesajul. Încercați din nou sau scrieți-ne pe WhatsApp.");
      return;
    }
    toast.success("Mulțumim! Vă contactăm în cel mai scurt timp.", {
      description: "De regulă răspundem în aceeași zi lucrătoare.",
    });
    onLeadSubmitted?.({ name: parsed.data.name, phone: parsed.data.phone, propertyType: parsed.data.propertyType });
    setForm((f) => ({ ...f, name: "", phone: "", message: "" }));
    setSubmitted(true);
    setExpanded(false);
  };

  return (
    <>
      <div
        className={cn(
          "fixed right-4 z-40 flex flex-col items-end gap-3",
          "bottom-[calc(1rem+env(safe-area-inset-bottom))]",
          className,
        )}
      >
        {expanded && (
          <div className="flex flex-col items-end gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-12 items-center gap-2 rounded-full bg-whatsapp px-5 py-3 text-sm font-semibold text-whatsapp-foreground shadow-lg transition-transform hover:scale-[1.03]"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Vorbește cu noi pe WhatsApp
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={() => { setSubmitted(false); setOpen(true); }}
              className="flex min-h-12 items-center gap-2 rounded-full border border-accent/40 bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.03]"
            >
              <MessageSquare className="h-4 w-4 text-accent" aria-hidden="true" />
              Trimite Mesaj Quick Lead
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Închide opțiunile de contact" : "Deschide opțiunile de contact"}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl ring-2 ring-accent/60"
        >
          {!expanded && <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" aria-hidden="true" />}
          {expanded ? <X className="relative h-6 w-6" /> : <MessageSquare className="relative h-6 w-6 text-accent" />}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{submitted ? "Cerere trimisă" : "Cerere rapidă"}</DialogTitle>
            <DialogDescription>{submitted ? "Mulțumim! Vă contactăm în cel mai scurt timp." : "Lăsați-ne datele și vă sunăm sau vă scriem pe WhatsApp."}</DialogDescription>
          </DialogHeader>
          {submitted ? <div className="space-y-4"><SocialPreview /><Button variant="outline" className="min-h-12 w-full" onClick={() => setOpen(false)}>Închide</Button></div> : <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Ce vă interesează?</legend>
              <div role="radiogroup" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {LEAD_INTENTS.map((i) => (
                  <button key={i} type="button" role="radio" aria-checked={form.intent === i}
                    onClick={() => setForm({ ...form, intent: i })}
                    className={cn("min-h-12 rounded-lg border px-3 text-sm transition-colors",
                      form.intent === i ? "border-accent bg-accent/10 font-semibold" : "border-border hover:bg-muted")}>
                    {i}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="space-y-1.5">
              <Label htmlFor="lew-name">Nume</Label>
              <Input id="lew-name" autoComplete="name" value={form.name} maxLength={120}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lew-phone">Telefon <span className="text-destructive" aria-hidden="true">*</span></Label>
              <Input id="lew-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX" required aria-required="true"
                value={form.phone} maxLength={20} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">Tip proprietate</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {PROPERTY_TYPES.map((t) => (
                  <button key={t.value} type="button" aria-pressed={form.propertyType === t.value}
                    onClick={() => setForm({ ...form, propertyType: t.value })}
                    className={cn("min-h-12 rounded-lg border px-3 text-sm transition-colors",
                      form.propertyType === t.value ? "border-accent bg-accent/10 font-semibold" : "border-border hover:bg-muted")}>
                    {t.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="space-y-1.5">
              <Label htmlFor="lew-msg">Mesaj (opțional)</Label>
              <Textarea id="lew-msg" rows={3} maxLength={1000} value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })} />
              {errors.message && <p className="text-xs text-destructive">{errors.message}</p>}
            </div>
            <Button type="submit" className="min-h-12 w-full" disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Trimite cererea
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              Datele sunt folosite doar pentru a vă răspunde.
            </p>
          </form>}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LeadEngagementWidget;
