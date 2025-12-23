import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

const propertyTypes = [
  { value: "apartament", label: "Apartament" },
  { value: "casa", label: "Casă" },
  { value: "studio", label: "Studio" },
  { value: "penthouse", label: "Penthouse" },
  { value: "vila", label: "Vilă" },
];

const LeadCaptureForm = ({
  isOpen,
  onClose,
  calculatedNetProfit,
  calculatedYearlyProfit,
  simulationData,
}: LeadCaptureFormProps) => {
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
        title: "Completează toate câmpurile",
        description: "Te rugăm să completezi toate informațiile necesare.",
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

      setIsSuccess(true);
      toast({
        title: "Cerere trimisă cu succes!",
        description: "Te vom contacta în curând cu analiza detaliată.",
      });

      // Reset and close after delay
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
        title: "Eroare",
        description: "A apărut o eroare. Te rugăm să încerci din nou.",
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
            Obține Analiza Detaliată
          </DialogTitle>
          <DialogDescription>
            Completează datele și vei primi o analiză personalizată pentru proprietatea ta.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Mulțumim!</h3>
            <p className="text-muted-foreground">Te vom contacta în curând.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nume complet</Label>
              <Input
                id="name"
                placeholder="Ion Popescu"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">Număr WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="+40 7XX XXX XXX"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">Suprafață proprietate (m²)</Label>
              <Input
                id="area"
                type="number"
                placeholder="50"
                value={propertyArea}
                onChange={(e) => setPropertyArea(e.target.value)}
                required
                min={10}
                max={1000}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tip proprietate</Label>
              <Select value={propertyType} onValueChange={setPropertyType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selectează tipul" />
                </SelectTrigger>
                <SelectContent>
                  {propertyTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
              <p className="text-sm text-muted-foreground">
                Profit estimat din simulare:{" "}
                <span className="text-primary font-semibold">
                  {calculatedNetProfit.toLocaleString()} €/lună
                </span>
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Se trimite...
                </>
              ) : (
                "Trimite Cererea"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LeadCaptureForm;
