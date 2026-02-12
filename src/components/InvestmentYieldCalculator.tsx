import { useState, useCallback } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, MessageCircle, Download } from "lucide-react";

const InvestmentYieldCalculator = () => {
  const { language } = useLanguage();
  const [pret, setPret] = useState(85000);
  const [renovare, setRenovare] = useState(5000);
  const [chirie, setChirie] = useState(450);
  const [vacanta, setVacanta] = useState(1);

  const investitieTotala = pret + renovare;
  const venitAnual = chirie * 12;
  const yieldAnual = investitieTotala > 0 ? (venitAnual / investitieTotala) * 100 : 0;
  const aniAmortizare = venitAnual > 0 ? investitieTotala / venitAnual : 0;

  const handleWhatsApp = useCallback(() => {
    const msg = `Bună ziua! Am simulat un randament imobiliar pe RealTrust.ro:%0A- Randament: ${yieldAnual.toFixed(2)}%%0A- Amortizare: ${aniAmortizare.toFixed(1)} ani%0A- Pagina: ${window.location.href}`;
    window.open(`https://wa.me/40723154520?text=${msg}`, "_blank");
  }, [yieldAnual, aniAmortizare]);

  const handleDownload = useCallback(() => {
    const text = [
      "RealTrust | Analiză Investiție",
      "═══════════════════════════════",
      `Preț Achiziție: ${pret.toLocaleString()} €`,
      `Mobilare/Renovare: ${renovare.toLocaleString()} €`,
      `Investiție Totală: ${investitieTotala.toLocaleString()} €`,
      `Chirie Lunară: ${chirie.toLocaleString()} €`,
      `Grad de ocupare: ${12 - vacanta} luni / an`,
      "───────────────────────────────",
      `Randament Anual (Yield): ${yieldAnual.toFixed(2)}%`,
      `Amortizare: ${aniAmortizare.toFixed(1)} ani`,
      `Profit Estimat: ${Math.round(venitAnual).toLocaleString()} € / an`,
    ].join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "Analiza-Investitie-RealTrust.txt";
    link.click();
  }, [pret, renovare, investitieTotala, chirie, vacanta, yieldAnual, aniAmortizare, venitAnual]);

  const ro = language === "ro";

  return (
    <section className="py-12 md:py-16">
      <div className="container mx-auto px-6">
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-full mb-4">
            <TrendingUp className="w-4 h-4 inline mr-1.5 -mt-0.5" />
            {ro ? "Calculator Investiție" : "Investment Calculator"}
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-2">
            {ro ? "Analiză Randament " : "Investment Yield "}
            <span className="text-primary">{ro ? "Imobiliar" : "Analysis"}</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {ro
              ? "Calculează rapid randamentul unei investiții imobiliare în Timișoara"
              : "Quickly calculate the yield of a real estate investment in Timișoara"}
          </p>
        </div>

        <Card className="max-w-2xl mx-auto border-primary/20 bg-card shadow-xl shadow-primary/5">
          <CardContent className="p-6 md:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="calc-pret" className="text-muted-foreground text-sm">
                  {ro ? "Preț Achiziție (€)" : "Purchase Price (€)"}
                </Label>
                <Input
                  id="calc-pret"
                  type="number"
                  value={pret}
                  onChange={(e) => setPret(Number(e.target.value) || 0)}
                  className="bg-muted/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calc-renovare" className="text-muted-foreground text-sm">
                  {ro ? "Mobilare/Renovare (€)" : "Furnishing/Renovation (€)"}
                </Label>
                <Input
                  id="calc-renovare"
                  type="number"
                  value={renovare}
                  onChange={(e) => setRenovare(Number(e.target.value) || 0)}
                  className="bg-muted/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="calc-chirie" className="text-muted-foreground text-sm">
                  {ro ? "Chirie Lunară (€)" : "Monthly Rent (€)"}
                </Label>
                <Input
                  id="calc-chirie"
                  type="number"
                  value={chirie}
                  onChange={(e) => setChirie(Number(e.target.value) || 0)}
                  className="bg-muted/50 border-border"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">
                  {ro ? "Grad de ocupare" : "Occupancy Rate"}
                </Label>
                <Select
                  value={String(vacanta)}
                  onValueChange={(v) => setVacanta(Number(v))}
                >
                  <SelectTrigger className="bg-muted/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">12 {ro ? "luni / an" : "months / year"}</SelectItem>
                    <SelectItem value="1">11 {ro ? "luni / an" : "months / year"}</SelectItem>
                    <SelectItem value="2">10 {ro ? "luni / an" : "months / year"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results */}
            <div className="mt-8 p-5 bg-muted/50 rounded-xl border-l-4 border-primary">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">
                    {ro ? "Randament Anual (Yield)" : "Annual Yield"}
                  </span>
                  <p className="text-3xl md:text-4xl font-bold text-primary mt-1">
                    {yieldAnual.toFixed(2)}%
                  </p>
                </div>
                <div className="sm:text-right">
                  <span className="text-sm text-muted-foreground">
                    {ro ? "Amortizare" : "Payback Period"}
                  </span>
                  <p className="text-2xl font-bold text-green-500 dark:text-green-400 mt-1">
                    {aniAmortizare.toFixed(1)} {ro ? "ani" : "years"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                {ro ? "Profit Net estimat: " : "Estimated Net Profit: "}
                <strong className="text-foreground">
                  {Math.round(venitAnual).toLocaleString()} € / {ro ? "an" : "year"}
                </strong>
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
              <Button
                onClick={handleWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                {ro ? "Trimite pe WhatsApp" : "Send via WhatsApp"}
              </Button>
              <Button
                onClick={handleDownload}
                variant="default"
                className="bg-primary hover:bg-primary/90"
              >
                <Download className="w-4 h-4 mr-2" />
                {ro ? "Descarcă Rezumat" : "Download Summary"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default InvestmentYieldCalculator;
