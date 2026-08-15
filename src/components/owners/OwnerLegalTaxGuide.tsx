import { useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpenCheck, Download, Loader2, Percent, Scale, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackConversion } from "@/lib/conversionTracking";
import { exportOwnersLegalGuidePdf } from "@/utils/exportOwnersLegalGuidePdf";

/**
 * OwnerLegalTaxGuide — ghid interactiv "Regim hotelier vs. chirie clasică":
 * randament, fiscalitate (normă de venit vs. 7% pe venit net efectiv) și riscuri.
 * Include lead magnet: PDF descărcabil după nume + email (edge function `send-lead-magnet`).
 */
const OwnerLegalTaxGuide = () => {
  const { language } = useLanguage();
  const isRo = language === "ro";
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const t = isRo
    ? {
        badge: "Ghid legal & fiscal",
        title: "Regim hotelier vs. chirie clasică — cifrele și taxele, fără perdea",
        subtitle:
          "Aceleași ipoteze pentru ambele variante: apartament 2 camere, zonă centrală Timișoara, ocupare de calcul 75%, costuri operaționale 27%.",
        tabs: { yield: "Randament", tax: "Fiscalitate", risk: "Riscuri" },
        colA: "Regim hotelier",
        colB: "Chirie clasică",
        metric: "Indicator",
        rows: [
          { label: "Venit brut / lună", a: "1.800 €", b: "550 €" },
          { label: "Ocupare de calcul", a: "75%", b: "100%" },
          { label: "Costuri operaționale", a: "− 27%", b: "− 5%" },
          { label: "Venit net / lună", a: "1.130 €", b: "500 €" },
          { label: "Venit net / an", a: "13.560 €", b: "6.000 €" },
          { label: "ROI net (la 145.000 €)", a: "9,4%", b: "4,1%" },
          { label: "Efort lunar proprietar", a: "0 ore", b: "3–6 ore" },
        ],
        yieldNote:
          "Scenariu de lucru, nu promisiune. Diferența reală depinde de zonă, dotare și sezon — îți facem estimarea pe apartamentul tău.",
        taxTitle: "Cele două variante de impozitare",
        taxItems: [
          {
            title: "Normă de venit (cazare turistică)",
            body: "Impozit calculat pe o normă fixă stabilită anual, nu pe încasările reale. Predictibil, birocrație minimă, avantajos dacă apartamentul performează peste medie.",
          },
          {
            title: "Sistem real — 7% pe venitul net efectiv",
            body: "Impozit de 7% aplicat pe venitul net efectiv (încasări minus cheltuieli deductibile documentate). Recomandat când ai investit recent în amenajare sau ai costuri de operare mari.",
          },
          {
            title: "Ce se deduce în sistem real",
            body: "Comision administrare, curățenie și consumabile, utilități, comisioanele platformelor, amortizarea mobilierului și electrocasnicelor.",
          },
          {
            title: "Contribuții și plafoane",
            body: "Peste anumite plafoane de venit anual pot apărea contribuții sociale (CASS). Verificăm împreună plafonul valabil pentru anul fiscal curent.",
          },
        ],
        taxDisclaimer:
          "Nu suntem consultanți fiscali autorizați. Îți arătăm structura folosită de proprietarii din portofoliu și te punem în legătură cu un contabil care lucrează cu regim hotelier în Timișoara.",
        riskTitle: "Riscuri reale, comparate corect",
        risks: [
          { h: "Neplata chiriei", hotel: "Practic zero: încasăm prin platforme, plata e confirmată înainte de sosire.", classic: "Risc real: 1–3 luni pierdute plus proces de evacuare." },
          { h: "Sezonalitate", hotel: "Ianuarie–februarie și august au ocupare mai mică.", classic: "Venit constant, dar plafonat." },
          { h: "Uzură", hotel: "Mai mare: consumabile și mici reparații lunar.", classic: "Mai mică, dar reparațiile apar la final de contract." },
          { h: "Control asupra apartamentului", hotel: "Îl poți folosi personal, cu rezervare în calendar.", classic: "Blocat pe toată durata contractului." },
        ],
        magnetTitle: "Descarcă Ghidul Legal & Fiscal pentru Proprietari (PDF)",
        magnetBody:
          "12 pagini: comparație pe cifre, normă de venit vs. 7% pe venit net, dosarul de clasificare, acordul asociației și obligațiile lunare.",
        magnetCta: "Descarcă ghidul PDF",
        formTitle: "Unde trimitem ghidul?",
        formDesc: "Îl descarci imediat și îl primești și pe email, ca să îl ai la îndemână.",
        nameLabel: "Nume",
        emailLabel: "Email",
        phoneLabel: "Telefon (opțional)",
        submit: "Descarcă acum",
        sending: "Se pregătește...",
        needFields: "Completează numele și email-ul.",
        okTitle: "Ghidul a fost descărcat",
        okDesc: "Verifică și email-ul — ai acolo aceeași versiune.",
        errTitle: "Nu am putut genera ghidul",
        errDesc: "Încearcă din nou sau scrie-ne pe WhatsApp la 0799 069 256.",
      }
    : {
        badge: "Legal & tax guide",
        title: "Short-term vs. long-term rental — the numbers and the taxes, no spin",
        subtitle:
          "Same assumptions for both: 2-room apartment, central Timișoara, 75% assumed occupancy, 27% operating costs.",
        tabs: { yield: "Yield", tax: "Taxes", risk: "Risks" },
        colA: "Short-term",
        colB: "Long-term",
        metric: "Metric",
        rows: [
          { label: "Gross income / month", a: "€1,800", b: "€550" },
          { label: "Assumed occupancy", a: "75%", b: "100%" },
          { label: "Operating costs", a: "− 27%", b: "− 5%" },
          { label: "Net income / month", a: "€1,130", b: "€500" },
          { label: "Net income / year", a: "€13,560", b: "€6,000" },
          { label: "Net ROI (on €145,000)", a: "9.4%", b: "4.1%" },
          { label: "Owner effort / month", a: "0 hours", b: "3–6 hours" },
        ],
        yieldNote:
          "A working scenario, not a promise. The real gap depends on area, furnishing and season — we estimate yours.",
        taxTitle: "The two taxation routes",
        taxItems: [
          { title: "Fixed income norm (tourist accommodation)", body: "Tax on an annually set fixed norm rather than actual receipts. Predictable, minimal paperwork, favourable when the flat performs above average." },
          { title: "Actual-income system — 7% on effective net income", body: "7% tax applied to effective net income (receipts minus documented deductible expenses). Recommended after recent furnishing investment or with high operating costs." },
          { title: "What is deductible", body: "Management fee, cleaning and supplies, utilities, platform commissions, furniture and appliance depreciation." },
          { title: "Contributions and thresholds", body: "Above certain annual income thresholds, health contributions may apply. We check the current fiscal year threshold together." },
        ],
        taxDisclaimer:
          "We are not licensed tax advisors. We show the structure used by owners in our portfolio and connect you with an accountant experienced in short-term rentals in Timișoara.",
        riskTitle: "Real risks, fairly compared",
        risks: [
          { h: "Unpaid rent", hotel: "Practically zero: platform-collected, paid before arrival.", classic: "Real risk: 1–3 months lost plus eviction process." },
          { h: "Seasonality", hotel: "January–February and August run lower occupancy.", classic: "Steady income, but capped." },
          { h: "Wear and tear", hotel: "Higher: supplies and small repairs monthly.", classic: "Lower, but repairs pile up at contract end." },
          { h: "Control of your flat", hotel: "You can use it yourself by blocking the calendar.", classic: "Locked for the whole contract." },
        ],
        magnetTitle: "Download the Owners' Legal & Tax Guide (PDF)",
        magnetBody:
          "12 pages: number-by-number comparison, income norm vs. 7% net tax, the classification file, association approval and monthly duties.",
        magnetCta: "Download the PDF guide",
        formTitle: "Where should we send the guide?",
        formDesc: "You download it instantly and also receive it by email.",
        nameLabel: "Name",
        emailLabel: "Email",
        phoneLabel: "Phone (optional)",
        submit: "Download now",
        sending: "Preparing...",
        needFields: "Please fill in your name and email.",
        okTitle: "Guide downloaded",
        okDesc: "Check your inbox too — same version is there.",
        errTitle: "Could not generate the guide",
        errDesc: "Please try again or message us on WhatsApp at +40 799 069 256.",
      };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || !email.includes("@")) {
      toast({ title: t.needFields, variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await supabase.functions.invoke("send-lead-magnet", {
        body: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          source: "owners_legal_tax_guide",
          language,
        },
      });
    } catch {
      // non-blocking: PDF download must still happen
    }

    try {
      await exportOwnersLegalGuidePdf({ language });
      trackConversion({
        event: "generate_lead",
        source: "owners_legal_tax_guide",
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
      });
      toast({ title: t.okTitle, description: t.okDesc });
      setOpen(false);
      setName("");
      setEmail("");
      setPhone("");
    } catch {
      toast({ title: t.errTitle, description: t.errDesc, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="ghid-legal-fiscal" className="py-16 md:py-20 bg-background scroll-mt-24">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8">
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5">
            <Scale className="w-4 h-4 mr-2 text-primary" aria-hidden="true" />
            {t.badge}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.title}</h2>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <Tabs defaultValue="yield" className="mb-10">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="yield" className="min-h-12">{t.tabs.yield}</TabsTrigger>
            <TabsTrigger value="tax" className="min-h-12">{t.tabs.tax}</TabsTrigger>
            <TabsTrigger value="risk" className="min-h-12">{t.tabs.risk}</TabsTrigger>
          </TabsList>

          <TabsContent value="yield" className="mt-6">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <caption className="sr-only">{t.title}</caption>
                  <thead>
                    <tr className="bg-muted/60 text-left">
                      <th scope="col" className="p-3 font-semibold">{t.metric}</th>
                      <th scope="col" className="p-3 font-semibold text-primary">{t.colA}</th>
                      <th scope="col" className="p-3 font-semibold text-muted-foreground">{t.colB}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r) => (
                      <tr key={r.label} className="border-t border-border/60">
                        <th scope="row" className="p-3 font-normal text-muted-foreground text-left">{r.label}</th>
                        <td className="p-3 font-semibold">{r.a}</td>
                        <td className="p-3 text-muted-foreground">{r.b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground mt-3">{t.yieldNote}</p>
          </TabsContent>

          <TabsContent value="tax" className="mt-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Percent className="w-5 h-5 text-primary" aria-hidden="true" />
              {t.taxTitle}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {t.taxItems.map((item) => (
                <Card key={item.title} className="border-border/60">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{item.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t.taxDisclaimer}</p>
          </TabsContent>

          <TabsContent value="risk" className="mt-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" aria-hidden="true" />
              {t.riskTitle}
            </h3>
            <div className="space-y-3">
              {t.risks.map((r) => (
                <Card key={r.h} className="border-border/60">
                  <CardContent className="p-4">
                    <p className="font-semibold text-sm mb-2">{r.h}</p>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <p className="rounded-md bg-primary/5 p-3">
                        <span className="block text-xs font-semibold text-primary mb-1">{t.colA}</span>
                        {r.hotel}
                      </p>
                      <p className="rounded-md bg-muted/60 p-3">
                        <span className="block text-xs font-semibold text-muted-foreground mb-1">{t.colB}</span>
                        {r.classic}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 md:flex md:items-center md:gap-6">
            <BookOpenCheck className="w-10 h-10 text-primary mb-4 md:mb-0 shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{t.magnetTitle}</h3>
              <p className="text-sm text-muted-foreground">{t.magnetBody}</p>
            </div>
            <Button size="lg" className="mt-4 md:mt-0 min-h-12 w-full md:w-auto" onClick={() => setOpen(true)}>
              <Download className="w-4 h-4 mr-2" aria-hidden="true" />
              {t.magnetCta}
            </Button>
          </CardContent>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t.formTitle}</DialogTitle>
              <DialogDescription>{t.formDesc}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleDownload} className="space-y-4">
              <div>
                <Label htmlFor="guide-name">{t.nameLabel}</Label>
                <Input id="guide-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="guide-email">{t.emailLabel}</Label>
                <Input id="guide-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className="mt-1" />
              </div>
              <div>
                <Label htmlFor="guide-phone">{t.phoneLabel}</Label>
                <Input id="guide-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className="mt-1" />
              </div>
              <Button type="submit" className="w-full min-h-12" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                    {t.sending}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                    {t.submit}
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

export default OwnerLegalTaxGuide;
