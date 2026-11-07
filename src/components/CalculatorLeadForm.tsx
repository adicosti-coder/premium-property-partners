import { useId, useRef, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitLead } from "@/lib/leadSubmission";
import { supabase } from "@/lib/supabaseClient";
import { roMobileField } from "@/lib/phoneField";
import { withCampaignTracking } from "@/lib/campaignAttribution";
import { formatPhoneInput } from "@/lib/conversionTracking";
import type { CalculatorLeadRequest } from "@/lib/calculatorLeads";
import { useCalculatorDelivery } from "@/hooks/useCalculatorDelivery";

const schema = z.object({
  name: z.string().trim().min(2, "Introdu numele (minim 2 caractere)").max(80),
  phone: roMobileField("Introdu un mobil valid (ex: 0722 123 456)"),
  email: z.union([z.literal(""), z.string().trim().email("Email invalid").max(255)]),
});

type DeliveryState = "pending" | "sent" | "unconfirmed";

interface CalculatorLeadFormProps {
  request: CalculatorLeadRequest;
  triggerLabel: string;
  title: string;
  description: string;
  variant?: "default" | "outline" | "secondary";
  className?: string;
  /** Ridică formularul peste ferestre proprii cu z-index mare (ex. fereastra rapidă investitori). */
  layerClassName?: string;
}

export function CalculatorLeadForm({ request, triggerLabel, title, description, variant = "default", className, layerClassName }: CalculatorLeadFormProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState({ name: "", phone: "", email: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryState>("pending");
  const locked = useRef(false);
  const submission = useRef<{ fingerprint: string; id: string } | null>(null);
  const [receipt, setReceipt] = useState<{ leadId: string; reportToken?: string } | null>(null);
  const adminReceived = useCalculatorDelivery(receipt);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (locked.current) return;
    const parsed = schema.safeParse(fields);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (messages?.[0]) next[key] = messages[0];
      }
      setErrors(next);
      return;
    }

    setErrors({});
    locked.current = true;
    setSubmitting(true);
    setDelivery("pending");
    let savedLeadId: string | null = null;
    try {
      const values = parsed.data;
      const fingerprint = JSON.stringify({ values, request });
      if (submission.current?.fingerprint !== fingerprint) submission.current = { fingerprint, id: crypto.randomUUID() };
      const simulationData = withCampaignTracking({
        calculator_kind: request.kind,
        lead_tag: request.tag,
        calculator_name: request.calculatorName,
        admin_summary: request.adminSummary,
        visitor_summary: request.visitorSummary,
        visitor_next_step: request.visitorNextStep,
        location: request.location,
        ...request.data,
      });
      const saved = await submitLead({
        name: values.name,
        whatsapp_number: formatPhoneInput(values.phone),
        email: values.email || undefined,
        property_type: request.propertyType,
        property_area: 0,
        message: `${request.tag} ${request.adminSummary}`,
        source: request.source,
        simulation_data: simulationData,
        viaServer: true,
        submission_id: submission.current.id,
      });
      if (!saved.ok || !saved.leadId) {
        toast.error("Nu am putut salva cererea. Verifică datele și încearcă din nou.");
        return;
      }
      savedLeadId = saved.leadId;
      setReceipt({ leadId: saved.leadId, reportToken: saved.reportToken });
      setDelivery("unconfirmed");
      submission.current = null;

      const { data, error } = await supabase.functions.invoke("handle-lead-whatsapp", {
        body: {
          nume: values.name,
          telefon: values.phone,
          ...(values.email ? { email: values.email } : {}),
          zona: request.location,
          venit_estimat_min: 0,
          venit_estimat_max: 0,
          calculator_kind: request.kind,
          lead_tag: request.tag,
          sursa: request.source,
          lead_id: saved.leadId,
          report_token: saved.reportToken,
        },
      });
      const visitorStatus = !error && (data as { delivery?: { visitor?: { status?: string } } } | null)?.delivery?.visitor?.status;
      setDelivery(visitorStatus === "sent" ? "sent" : "unconfirmed");
    } catch {
      // După salvare nu invităm vizitatorul să retrimită: ar crea un calcul nou.
      if (savedLeadId) setDelivery("unconfirmed");
      else toast.error("Conexiunea a eșuat. Cererea nu a fost confirmată; încearcă din nou.");
    } finally {
      setSubmitting(false);
      locked.current = false;
    }
  };

  return (
    <>
      <Button type="button" size="lg" variant={variant} className={className} onClick={() => { if (!locked.current) { setDelivery("pending"); setReceipt(null); setOpen(true); } }}>
        <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-calculator-lead-dialog="" className={cn("max-w-md", layerClassName)} overlayClassName={layerClassName}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {delivery === "pending" ? (
            <form onSubmit={submit} className="space-y-4" noValidate>
              <p className="rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">{request.visitorSummary}</p>
              <div className="space-y-2">
                <Label htmlFor={`${id}-name`}>Nume</Label>
                <Input id={`${id}-name`} autoComplete="name" value={fields.name} onChange={(e) => setFields({ ...fields, name: e.target.value })} aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id}-name-error` : undefined} />
                {errors.name && <p id={`${id}-name-error`} role="alert" className="text-sm text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${id}-phone`}>Telefon WhatsApp</Label>
                <Input id={`${id}-phone`} type="tel" inputMode="tel" autoComplete="tel" placeholder="07XX XXX XXX" value={fields.phone} onChange={(e) => setFields({ ...fields, phone: e.target.value })} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? `${id}-phone-error` : undefined} />
                {errors.phone && <p id={`${id}-phone-error`} role="alert" className="text-sm text-destructive">{errors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${id}-email`}>E-mail (opțional)</Label>
                <Input id={`${id}-email`} type="email" autoComplete="email" value={fields.email} onChange={(e) => setFields({ ...fields, email: e.target.value })} aria-invalid={!!errors.email} aria-describedby={errors.email ? `${id}-email-error` : undefined} />
                {errors.email && <p id={`${id}-email-error`} role="alert" className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <Button type="submit" size="lg" className="min-h-12 w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {submitting ? "Se trimite cererea…" : "Trimite cererea"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Folosim datele doar pentru această cerere și pentru rezumatul solicitat.</p>
            </form>
          ) : (
            <div role="status" aria-live="polite" className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
              <h3 className="font-semibold text-foreground">{adminReceived ? "Andrei a primit cererea ta" : "Cererea a fost înregistrată"}</h3>
              <p className="text-sm text-muted-foreground">
                {delivery === "sent"
                  ? "Confirmarea WhatsApp a fost trimisă către serviciul de notificări. Livrarea este verificată separat."
                  : "Datele sunt salvate. Așteptăm confirmarea livrării notificării către Andrei."}
              </p>
              <Button type="button" variant="outline" className="min-h-12 w-full" onClick={() => setOpen(false)}>Închide</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
