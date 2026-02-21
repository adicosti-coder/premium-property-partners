import { useState, useEffect, useCallback } from "react";

/**
 * Inline calculator popup – migrated from index.html to reduce initial HTML parse time.
 * Shows after 30s or on exit-intent (desktop mouse leaves viewport).
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

  const show = useCallback(() => {
    if (localStorage.getItem("rt_popup_shown_v2")) return;
    setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    localStorage.setItem("rt_popup_shown_v2", "true");
  }, []);

  useEffect(() => {
    const timer = setTimeout(show, 30000);
    const handleMouse = (e: MouseEvent) => { if (e.clientY < 0) show(); };
    document.addEventListener("mouseleave", handleMouse);
    return () => { clearTimeout(timer); document.removeEventListener("mouseleave", handleMouse); };
  }, [show]);

  const contactExpert = () => {
    const msg = `Bună ziua! Am folosit calculatorul de investiții de pe site.%0A%0ARezultate estimate:%0A- Randament: ${yieldAnual.toFixed(2)}%%0A- Amortizare: ${aniAmortizare.toFixed(1)} ani.%0A%0ADoresc mai multe informații!`;
    window.open(`https://wa.me/40723154520?text=${msg}`, "_blank");
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(5px)" }}
    >
      <div className="relative w-[90%] max-w-[550px] rounded-2xl p-8"
        style={{ background: "#1a1a2e", border: "2px solid #f39c12", boxShadow: "0 20px 50px rgba(0,0,0,0.8)", color: "white" }}>
        <span className="absolute top-4 right-5 text-3xl font-bold cursor-pointer text-white hover:text-[#f39c12]" onClick={close}>&times;</span>
        <div className="text-center mb-5">
          <h2 className="text-[#f39c12] text-[22px] font-bold m-0">Analiză Investiție Imobiliară</h2>
          <p className="text-[#ccc] text-sm">Vezi randamentul pentru această proprietate:</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-[#aaa] mb-1">Preț Achiziție (€)</label>
            <input type="number" value={pret} onChange={e => setPret(+e.target.value)} className="w-full p-2.5 rounded bg-[#0f0f1f] text-white border border-[#333] mb-3" />
            <label className="block text-xs text-[#aaa] mb-1">Chirie Lunară (€)</label>
            <input type="number" value={chirie} onChange={e => setChirie(+e.target.value)} className="w-full p-2.5 rounded bg-[#0f0f1f] text-white border border-[#333] mb-3" />
          </div>
          <div>
            <label className="block text-xs text-[#aaa] mb-1">Mobilare/Renovare (€)</label>
            <input type="number" value={renovare} onChange={e => setRenovare(+e.target.value)} className="w-full p-2.5 rounded bg-[#0f0f1f] text-white border border-[#333] mb-3" />
            <label className="block text-xs text-[#aaa] mb-1">Grad Ocupare</label>
            <select value={vacanta} onChange={e => setVacanta(+e.target.value)} className="w-full p-2.5 rounded bg-[#0f0f1f] text-white border border-[#333] mb-3">
              <option value={1}>11 luni / an</option>
              <option value={2}>10 luni / an</option>
              <option value={0}>12 luni / an</option>
            </select>
          </div>
        </div>
        <div className="mt-4 p-5 rounded-lg text-center" style={{ background: "#252545", borderLeft: "5px solid #f39c12" }}>
          <span className="text-[13px] text-[#ccc] tracking-wider">RANDAMENT ANUAL (YIELD)</span>
          <h2 className="text-[42px] text-[#f39c12] font-bold my-1">{yieldAnual.toFixed(2)}%</h2>
          <p className="text-sm text-[#2ecc71] font-bold m-0">Amortizare în {aniAmortizare.toFixed(1)} ani</p>
        </div>
        <button onClick={contactExpert} className="w-full mt-6 py-4 rounded-lg font-bold text-base cursor-pointer transition-colors" style={{ background: "#f39c12", color: "#1a1a2e", border: "none" }}>
          SOLICITĂ DETALII PRIN WHATSAPP
        </button>
      </div>
    </div>
  );
};

export default InlineCalculatorPopup;
