import { useState, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageCircle } from "lucide-react";

const InvestmentQuickCalculator = () => {
  const { language } = useLanguage();
  const [pret, setPret] = useState(95000);
  const [chirie, setChirie] = useState(500);

  const { yieldAnual, aniAmortizare, venitAnual } = useMemo(() => {
    const venitAnual = chirie * 12;
    const investitieTotala = pret * 1.02;
    const yieldAnual = investitieTotala > 0 ? (venitAnual / investitieTotala) * 100 : 0;
    const aniAmortizare = venitAnual > 0 ? investitieTotala / venitAnual : 0;
    return { yieldAnual, aniAmortizare, venitAnual };
  }, [pret, chirie]);

  const handleWhatsApp = () => {
    const msg = language === "ro"
      ? `Bună ziua! Sunt interesat de o proprietate de investiție. Calculul meu de randament arată ${yieldAnual.toFixed(2)}%. Putem discuta detalii?`
      : `Hello! I'm interested in an investment property. My yield calculation shows ${yieldAnual.toFixed(2)}%. Can we discuss details?`;
    window.open(`https://wa.me/40723154520?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const t = language === "ro"
    ? { title: "Simulează Profitabilitatea", subtitle: "Vezi în cât timp se plătește singură această proprietate", pret: "Preț Achiziție (€)", chirie: "Chirie Lunară (€)", yieldLabel: "RANDAMENT ANUAL", amortLabel: "AMORTIZARE", ani: "ani", cta: "REZERVAȚI O CONSULTANȚĂ INVESTIȚIONALĂ" }
    : { title: "Simulate Profitability", subtitle: "See how quickly this property pays for itself", pret: "Purchase Price (€)", chirie: "Monthly Rent (€)", yieldLabel: "ANNUAL YIELD", amortLabel: "PAYBACK PERIOD", ani: "years", cta: "BOOK AN INVESTMENT CONSULTATION" };

  return (
    <div className="w-full border border-dashed border-amber-500 p-6 md:p-8 rounded-xl bg-card">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-foreground">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs font-bold">{t.pret}</Label>
          <Input type="number" value={pret} onChange={e => setPret(Number(e.target.value))} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs font-bold">{t.chirie}</Label>
          <Input type="number" value={chirie} onChange={e => setChirie(Number(e.target.value))} className="mt-1" />
        </div>
      </div>

      <div className="mt-5 flex justify-around bg-slate-900 p-4 rounded-lg text-white text-center">
        <div>
          <span className="text-[11px] text-slate-400">{t.yieldLabel}</span>
          <div className="text-2xl font-bold text-amber-500">{yieldAnual.toFixed(2)}%</div>
        </div>
        <div className="border-l border-slate-700 pl-4">
          <span className="text-[11px] text-slate-400">{t.amortLabel}</span>
          <div className="text-2xl font-bold text-green-400">{aniAmortizare.toFixed(1)} {t.ani}</div>
        </div>
      </div>

      <Button onClick={handleWhatsApp} className="w-full mt-4 bg-[#25d366] hover:bg-[#1da851] text-white font-bold">
        <MessageCircle className="w-4 h-4 mr-2" />
        {t.cta}
      </Button>
    </div>
  );
};

export default InvestmentQuickCalculator;
