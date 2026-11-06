import { useState, useEffect, useCallback } from "react";
import { X, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Inline investor calculator popup, opened from the FAB menu.
 * Dedicated formula kept: chirie × (12 − luni libere) × 0.95.
 */
const InlineCalculatorPopup = () => {
  const [visible, setVisible] = useState(false);
  const [pret, setPret] = useState(95000);
  const [chirie, setChirie] = useState(500);
  const [renovare, setRenovare] = useState(7000);
  const [vacanta, setVacanta] = useState(1);

  const investitieTotala = pret + renovare;
  const venitNetAnual = (chirie * (12 - vacanta)) * 0.95;
  const yieldAnual = investitieTotala > 0 ? (venitNetAnual / investitieTotala) * 100 : 0;
  const aniAmortizare = venitNetAnual > 0 ? investitieTotala / venitNetAnual : 0;

  const close = useCallback(() => {
    setVisible(false);
    localStorage.setItem("rt_popup_shown_v2", "true");
  }, []);

  useEffect(() => {
    const handleOpen = () => {
      if (!localStorage.getItem("rt_popup_shown_v2")) setVisible(true);
    };
    window.addEventListener("open-inline-calculator", handleOpen);
    return () => window.removeEventListener("open-inline-calculator", handleOpen);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, close]);

  const contactExpert = () => {
    const msg = `Bună ziua! Am folosit calculatorul de investiții de pe site.\n\nRezultate estimate:\n- Randament: ${yieldAnual.toFixed(2)}%\n- Amortizare: ${aniAmortizare.toFixed(1)} ani.\n\nDoresc mai multe informații!`;
    window.open(`https://wa.me/40799069256?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  if (!visible) return null;

  const num = (id: string, label: string, value: number, set: (n: number) => void) => (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      <Input id={id} type="number" inputMode="decimal" value={value} onChange={(e) => set(Number(e.target.value) || 0)} className="h-11 bg-background font-semibold tabular-nums text-foreground" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-foreground/70 p-4" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="inline-calc-title" className="relative w-full max-w-[560px] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={close} aria-label="Închide calculatorul" className="absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="border-b border-border px-6 py-5 pr-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Calculator randament · rezultat pe loc</p>
          <h2 id="inline-calc-title" className="mt-1 font-serif text-xl font-semibold text-foreground">Analiză investiție imobiliară</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 px-6 py-5">
          {num("ic-pret", "Preț achiziție (€)", pret, setPret)}
          {num("ic-renovare", "Mobilare / renovare (€)", renovare, setRenovare)}
          {num("ic-chirie", "Chirie lunară (€)", chirie, setChirie)}
          <div className="space-y-1.5">
            <span className="text-xs text-muted-foreground" id="ic-luni">Luni închiriate / an</span>
            <div role="radiogroup" aria-labelledby="ic-luni" className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
              {[2, 1, 0].map((v) => (
                <button key={v} type="button" role="radio" aria-checked={vacanta === v} onClick={() => setVacanta(v)} className={`min-h-11 rounded-lg text-sm font-semibold ${vacanta === v ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>
                  {12 - v}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div aria-live="polite" className="border-t border-border bg-muted/40 px-6 py-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Randament anual</p>
              <p className="font-serif text-4xl font-semibold tabular-nums text-primary">{yieldAnual.toFixed(2)}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Amortizare</p>
              <p className="text-xl font-semibold tabular-nums text-foreground">{aniAmortizare.toFixed(1)} ani</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Venit net anual estimat: {Math.round(venitNetAnual).toLocaleString("ro-RO")} €</p>
          <Button onClick={contactExpert} size="lg" className="mt-4 min-h-12 w-full">
            <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
            Solicită detalii pe WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InlineCalculatorPopup;
