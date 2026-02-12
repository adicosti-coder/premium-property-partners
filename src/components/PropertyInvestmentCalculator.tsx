import { useState, useMemo } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageCircle, CheckCircle2 } from "lucide-react";

interface Props {
  propertyName: string;
  propertyCode?: string | null;
  defaultPrice?: number;
  defaultRent?: number;
}

const PropertyInvestmentCalculator = ({ propertyName, propertyCode, defaultPrice = 95000, defaultRent = 500 }: Props) => {
  const { language } = useLanguage();
  const [pret, setPret] = useState(defaultPrice);
  const [chirie, setChirie] = useState(defaultRent);

  const { yieldAnual, aniAmortizare } = useMemo(() => {
    const venitNetAnual = (chirie * 11) * 0.95;
    const investitieTotala = pret * 1.03;
    const yieldAnual = investitieTotala > 0 ? (venitNetAnual / investitieTotala) * 100 : 0;
    const aniAmortizare = venitNetAnual > 0 ? investitieTotala / venitNetAnual : 0;
    return { yieldAnual, aniAmortizare };
  }, [pret, chirie]);

  const handleWhatsAppCalc = () => {
    const msg = language === "ro"
      ? `Bună ziua! Sunt interesat de apartamentul de pe RealTrust (${window.location.href}). Am simulat un yield de ${yieldAnual.toFixed(2)}%. Doresc să discutăm despre pașii achiziției.`
      : `Hello! I'm interested in the property on RealTrust (${window.location.href}). I simulated a yield of ${yieldAnual.toFixed(2)}%. I'd like to discuss the acquisition steps.`;
    window.open(`https://wa.me/40723154520?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleWhatsAppSell = () => {
    const msg = language === "ro"
      ? `Bună ziua! Sunt proprietar și am văzut anunțul de pe ${window.location.href}. Doresc o evaluare gratuită pentru proprietatea mea și detalii despre vânzarea rapidă prin RealTrust.`
      : `Hello! I'm a property owner and I saw the listing at ${window.location.href}. I'd like a free evaluation for my property and details about a quick sale through RealTrust.`;
    window.open(`https://wa.me/40723154520?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const t = language === "ro"
    ? {
        calcTitle: "Simulează Profitabilitatea",
        calcSubtitle: "Ești investitor? Vezi randamentul acestui apartament:",
        pret: "Preț Achiziție (€)",
        chirie: "Chirie Lunară Estimată (€)",
        yieldLabel: "Yield Anual",
        amortLabel: "Amortizare",
        ani: "ani",
        calcCta: "SOLICITĂ ANALIZĂ DETALIATĂ",
        sellTitle: "Vrei să vinzi rapid?",
        sellDesc: "Ai o proprietate similară în Timișoara și vrei să o vinzi fără bătăi de cap?",
        sellTeam: "Echipa RealTrust îți oferă:",
        sellBenefits: [
          "Evaluare gratuită la prețul pieței",
          "Acces la baza noastră de investitori activi",
          "Vânzare în medie în mai puțin de 30 de zile",
        ],
        sellCta: "VREAU O EVALUARE GRATUITĂ",
        sellBadge: "PROPRIETARI",
      }
    : {
        calcTitle: "Simulate Profitability",
        calcSubtitle: "Are you an investor? See the yield for this apartment:",
        pret: "Purchase Price (€)",
        chirie: "Estimated Monthly Rent (€)",
        yieldLabel: "Annual Yield",
        amortLabel: "Payback",
        ani: "years",
        calcCta: "REQUEST DETAILED ANALYSIS",
        sellTitle: "Want to sell fast?",
        sellDesc: "Do you have a similar property in Timișoara and want to sell it hassle-free?",
        sellTeam: "The RealTrust team offers you:",
        sellBenefits: [
          "Free market-price evaluation",
          "Access to our active investor base",
          "Sale on average in less than 30 days",
        ],
        sellCta: "I WANT A FREE EVALUATION",
        sellBadge: "OWNERS",
      };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-8">
      {/* Calculator Card */}
      <div className="border border-border p-6 rounded-2xl bg-card shadow-sm">
        <h3 className="text-foreground font-bold text-lg border-b-2 border-amber-500 inline-block pb-1 mb-1">
          {t.calcTitle}
        </h3>
        <p className="text-muted-foreground text-sm mb-5">{t.calcSubtitle}</p>

        <div className="space-y-4 mb-5">
          <div>
            <Label className="text-xs font-bold">{t.pret}</Label>
            <Input type="number" value={pret} onChange={(e) => setPret(Number(e.target.value))} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs font-bold">{t.chirie}</Label>
            <Input type="number" value={chirie} onChange={(e) => setChirie(Number(e.target.value))} className="mt-1" />
          </div>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl flex justify-around text-center text-white">
          <div>
            <span className="text-[10px] uppercase text-slate-400">{t.yieldLabel}</span>
            <div className="text-xl font-bold text-amber-500">{yieldAnual.toFixed(2)}%</div>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <span className="text-[10px] uppercase text-slate-400">{t.amortLabel}</span>
            <div className="text-xl font-bold text-green-400">
              {aniAmortizare.toFixed(1)} {t.ani}
            </div>
          </div>
        </div>

        <Button onClick={handleWhatsAppCalc} className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white font-bold">
          {t.calcCta}
        </Button>
      </div>

      {/* Sell Fast Card */}
      <div className="border-2 border-amber-500 p-6 rounded-2xl bg-amber-50 dark:bg-amber-500/5 flex flex-col relative overflow-hidden">
        <div className="absolute top-3 -right-8 bg-amber-500 text-slate-900 px-10 py-1 rotate-45 text-xs font-bold">
          {t.sellBadge}
        </div>

        <h3 className="text-foreground font-bold text-lg mt-0">{t.sellTitle}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          {t.sellDesc}
          <br /><br />
          <strong>{t.sellTeam}</strong>
        </p>
        <ul className="space-y-2 mb-5 text-sm text-muted-foreground pl-1">
          {t.sellBenefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              {b}
            </li>
          ))}
        </ul>

        <Button
          onClick={handleWhatsAppSell}
          className="w-full mt-auto bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold shadow-md"
        >
          {t.sellCta}
        </Button>
      </div>
    </div>
  );
};

export default PropertyInvestmentCalculator;
