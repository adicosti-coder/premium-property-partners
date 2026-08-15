import { useState } from "react";
import { Download, MessageCircle, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackConversion } from "@/lib/conversionTracking";
import type { YieldReportInput } from "@/utils/exportYieldReportPdf";

const WHATSAPP_NUMBER = "40799069256";

/** Standard Timișoara ADR benchmarks used for the instant estimate (EUR / night). */
const ADR_BY_ROOMS: Record<string, number> = { "1": 45, "2": 60, "3": 80, "4": 95 };
const OCCUPANCY = 75;
const AVG_STAY = 3;
const CLEANING_FEE = 15;
const MANAGEMENT_FEE = 20;
/** Platform commissions + effective tax + consumables ≈ 27% total deduction. */
const PLATFORM_FEE = 7;

interface Props {
  name?: string;
  phone?: string;
  email?: string;
  zone?: string;
  rooms?: string;
}

const buildReportInput = ({ name, rooms, zone }: Props): YieldReportInput => {
  const roomKey = (rooms || "").replace(/[^\d]/g, "").charAt(0) || "2";
  const adr = ADR_BY_ROOMS[roomKey] ?? 60;

  const occupiedDays = Math.round((30 * OCCUPANCY) / 100);
  const numberOfStays = Math.max(1, Math.round(occupiedDays / AVG_STAY));
  const grossRevenue = adr * occupiedDays;
  const cleaningCosts = 0; // paid by the guest, neutral for the owner
  const managementCost = (grossRevenue * MANAGEMENT_FEE) / 100;
  const platformCost = (grossRevenue * PLATFORM_FEE) / 100;
  const totalCosts = managementCost + platformCost + cleaningCosts;
  const netProfit = grossRevenue - totalCosts;

  return {
    adr,
    occupancy: OCCUPANCY,
    cleaningCost: CLEANING_FEE,
    managementFee: MANAGEMENT_FEE,
    platformFee: PLATFORM_FEE,
    avgStayDuration: AVG_STAY,
    occupiedDays,
    numberOfStays,
    grossRevenue,
    cleaningCosts,
    managementCost,
    platformCost,
    totalCosts,
    netProfit,
    yearlyGross: grossRevenue * 12,
    yearlyNet: netProfit * 12,
    ownerName: [name, zone].filter(Boolean).join(" · ") || undefined,
    language: "ro",
  };
};

/**
 * Instant delivery of the personalised yield report on /multumire:
 *  - "Descarcă PDF" generates the report fully client-side (no round-trip),
 *  - "Primește pe WhatsApp" uploads it, gets a 7-day signed link, emails it when
 *    an address is known and opens the WhatsApp chat with the link prefilled.
 */
const YieldReportDelivery = (props: Props) => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"download" | "whatsapp" | null>(null);

  const buildPdf = async () => {
    const { generateYieldReportPdf } = await import("@/utils/exportYieldReportPdf");
    return generateYieldReportPdf(buildReportInput(props));
  };

  const handleDownload = async () => {
    setBusy("download");
    try {
      const doc = await buildPdf();
      doc.save("Raport-Randament-RealTrust.pdf");
      trackConversion({ event: "yield_report_download", source: "multumire_pdf", page_path: "/multumire" });
    } catch {
      toast({
        title: "Nu am putut genera raportul",
        description: "Încearcă din nou sau cere-l pe WhatsApp și ți-l trimitem noi.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  const handleWhatsapp = async () => {
    setBusy("whatsapp");
    try {
      const doc = await buildPdf();
      const base64 = doc.output("datauristring").split(",")[1] ?? "";

      const { data, error } = await supabase.functions.invoke("deliver-yield-report", {
        body: { pdfBase64: base64, name: props.name, email: props.email, phone: props.phone },
      });

      const url = (data as { url?: string } | null)?.url;
      if (error || !url) throw new Error("delivery_failed");

      trackConversion({ event: "yield_report_whatsapp", source: "multumire_pdf_wa", page_path: "/multumire" });

      const message = [
        `Salut, sunt ${props.name || "proprietar"}${props.zone ? ` din ${props.zone}` : ""}.`,
        "Am generat raportul de randament pe realtrust.ro:",
        url,
        "Aș vrea să îl discutăm.",
      ].join("\n");

      window.open(
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer",
      );

      toast({
        title: "Raportul e pregătit",
        description: (data as { email_sent?: boolean } | null)?.email_sent
          ? "Ți l-am trimis și pe email, iar linkul e deja în conversația WhatsApp."
          : "Linkul raportului e deja completat în conversația WhatsApp.",
      });
    } catch {
      toast({
        title: "Trimiterea a eșuat",
        description: "Descarcă raportul direct în PDF sau scrie-ne pe WhatsApp și ți-l trimitem manual.",
        variant: "destructive",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      aria-labelledby="yield-report-delivery"
      className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-6"
    >
      <div className="flex items-start gap-3">
        <FileText className="w-5 h-5 text-primary mt-0.5" aria-hidden="true" />
        <div>
          <h2 id="yield-report-delivery" className="text-lg font-semibold text-foreground">
            Raportul tău de randament, acum
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estimarea de venit în regim hotelier cu ținta de <strong>9,4% net</strong> pe an,
            defalcarea deducerilor de <strong>27%</strong> (comisioane platforme, impozit efectiv,
            consumabile) și planul de colaborare în 3 pași.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Button
          onClick={handleDownload}
          disabled={busy !== null}
          size="lg"
          variant="outline"
          className="w-full min-h-[48px]"
          aria-label="Descarcă raportul PDF de randament"
        >
          {busy === "download" ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="w-5 h-5 mr-2" aria-hidden="true" />
          )}
          Descarcă PDF
        </Button>

        <Button
          onClick={handleWhatsapp}
          disabled={busy !== null}
          size="lg"
          className="w-full min-h-[48px]"
          aria-label="Primește raportul de randament pe WhatsApp"
        >
          {busy === "whatsapp" ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
          ) : (
            <MessageCircle className="w-5 h-5 mr-2" aria-hidden="true" />
          )}
          Primește pe WhatsApp
        </Button>
      </div>
    </section>
  );
};

export default YieldReportDelivery;
