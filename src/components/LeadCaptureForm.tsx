import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";

interface LeadCaptureFormProps {
  isOpen: boolean;
  onClose: () => void;
  calculatedNetProfit: number;
  calculatedYearlyProfit: number;
  simulationData: {
    adr: number;
    occupancy: number;
    cleaningCost: number;
    managementFee: number;
    platformFee: number;
    avgStayDuration: number;
  };
}

const propertyTypeKeys = ["apartament", "casa", "studio", "penthouse", "vila"] as const;

const LeadCaptureForm = ({
  isOpen,
  onClose,
  calculatedNetProfit,
  calculatedYearlyProfit,
  simulationData,
}: LeadCaptureFormProps) => {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [propertyArea, setPropertyArea] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !whatsappNumber.trim() || !propertyArea || !propertyType) {
      toast({
        title: t.leadForm.fillAllFields,
        description: t.leadForm.fillAllFieldsMessage,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("leads").insert({
        name: name.trim(),
        whatsapp_number: whatsappNumber.trim(),
        property_area: parseInt(propertyArea),
        property_type: propertyType,
        calculated_net_profit: calculatedNetProfit,
        calculated_yearly_profit: calculatedYearlyProfit,
        simulation_data: simulationData,
      });

      if (error) throw error;

      try {
        await supabase.functions.invoke("send-lead-notification", {
          body: {
            name: name.trim(),
            whatsappNumber: whatsappNumber.trim(),
            propertyArea: parseInt(propertyArea),
            propertyType: propertyType,
            calculatedNetProfit,
            calculatedYearlyProfit,
            simulationData,
          },
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }

      setIsSuccess(true);
      toast({
        title: t.leadForm.successToast,
        description: t.leadForm.successToastMessage,
      });

      setTimeout(() => {
        setName("");
        setWhatsappNumber("");
        setPropertyArea("");
        setPropertyType("");
        setIsSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast({
        title: t.leadForm.error,
        description: t.leadForm.errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <FileText className="w-5 h-5 text-primary" />
            {t.leadForm.title}
          </DialogTitle>
          <DialogDescription>
            {t.leadForm.description}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">{t.leadForm.success}</h3>
            <p className="text-muted-foreground">{t.leadForm.successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t.leadForm.name}</Label>
              <Input
                id="name"
                placeholder={t.leadForm.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">{t.leadForm.whatsapp}</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder={t.leadForm.whatsappPlaceholder}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">{t.leadForm.propertyArea}</Label>
              <Input
                id="area"
                type="number"
                placeholder={t.leadForm.propertyAreaPlaceholder}
                value={propertyArea}
                onChange={(e) => setPropertyArea(e.target.value)}
                required
                min={10}
                max={1000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">{t.leadForm.propertyType}</Label>
              <Select value={propertyType} onValueChange={setPropertyType} required>
                <SelectTrigger>
                  <SelectValue placeholder={t.leadForm.selectType} />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypeKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t.leadForm.propertyTypes[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                {t.leadForm.estimatedProfit}{" "}
                <span className="text-primary font-semibold">
                  {calculatedNetProfit.toLocaleString()} €/lună
                </span>
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.leadForm.sending}
                </>
              ) : (
                t.leadForm.submit
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeadCaptureForm;