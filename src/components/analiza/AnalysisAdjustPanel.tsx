import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, RotateCcw, SlidersHorizontal } from "lucide-react";
import type { ListingAnalysis } from "./AiListingAnalyzer";

const DAYS_PER_MONTH = 30.4;
const NET_FACTOR = 0.73; // 27% management + taxe
const EUR_RON = 5;

const ZONES = ["Centru / Cetate", "Iosefin", "Fabric", "Dumbrăvița", "Aradului", "Altă zonă Timișoara"];
const TYPES = ["apartament", "casa", "studio", "comercial"];

export interface AdjustParams {
  tarifNoapte: number;
  ocupare: number;
  zona: string;
  tipProprietate: string;
  pretListare: number;
}

interface Props {
  analysis: ListingAnalysis;
  onRecalculated: (analysis: ListingAnalysis, params: AdjustParams) => void;
}

const fmt = (n: number) => Math.round(n).toLocaleString("ro-RO");

export function recalcAnalysis(base: ListingAnalysis, p: AdjustParams): ListingAnalysis {
  const brut = p.tarifNoapte * DAYS_PER_MONTH * (p.ocupare / 100);
  const net = brut * NET_FACTOR;
  const priceRon = (p.pretListare || 0) * (base.moneda === "RON" ? 1 : EUR_RON);
  const roi = priceRon > 0 ? ((net * 12) / priceRon) * 100 : null;
  return {
    ...base,
    zona: p.zona,
    tip_proprietate: p.tipProprietate,
    tarif_noapte: Math.round(p.tarifNoapte),
    pret_listare: p.pretListare || base.pret_listare,
    venit_lunar_brut: Math.round(brut),
    venit_lunar_net: Math.round(net),
    roi_estimat: roi ? `${roi.toFixed(1).replace(".", ",")}% net` : base.roi_estimat,
  };
}

const AnalysisAdjustPanel = ({ analysis, onRecalculated }: Props) => {
  const initial = useMemo<AdjustParams>(
    () => ({
      tarifNoapte: Math.round(analysis.tarif_noapte || 300),
      ocupare: 75,
      zona: analysis.zona || ZONES[0],
      tipProprietate: (analysis.tip_proprietate || "apartament").toLowerCase(),
      pretListare: Math.round(analysis.pret_listare || 0),
    }),
    [analysis],
  );

  const [params, setParams] = useState<AdjustParams>(initial);
  useEffect(() => setParams(initial), [initial]);

  const preview = useMemo(() => recalcAnalysis(analysis, params), [analysis, params]);

  const apply = () => {
    onRecalculated(preview, params);
    toast.success("Calculele au fost actualizate local, fără consum de credite AI.");
  };

  return (
    <section className="space-y-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
          Corectează datele și recalculează (fără AI)
        </h3>
        <p className="text-xs text-muted-foreground">
          Ajustează tariful, zona sau tipul proprietății. Recalculăm venitul și ROI-ul instant, local — nu se
          reia analiza sursei și nu se consumă credite AI.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="adj-tarif">Tarif pe noapte (RON)</Label>
          <Input
            id="adj-tarif"
            type="number"
            min={50}
            max={3000}
            inputMode="numeric"
            value={params.tarifNoapte}
            onChange={(e) => setParams((s) => ({ ...s, tarifNoapte: Number(e.target.value) || 0 }))}
            aria-label="Tarif pe noapte în RON"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adj-pret">Preț listare ({analysis.moneda || "EUR"})</Label>
          <Input
            id="adj-pret"
            type="number"
            min={0}
            inputMode="numeric"
            value={params.pretListare}
            onChange={(e) => setParams((s) => ({ ...s, pretListare: Number(e.target.value) || 0 }))}
            aria-label="Preț de listare al proprietății"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adj-zona">Locație / zonă</Label>
          <Select value={params.zona} onValueChange={(v) => setParams((s) => ({ ...s, zona: v }))}>
            <SelectTrigger id="adj-zona" aria-label="Zona proprietății">
              <SelectValue placeholder="Alege zona" />
            </SelectTrigger>
            <SelectContent>
              {(ZONES.includes(params.zona) ? ZONES : [params.zona, ...ZONES]).map((z) => (
                <SelectItem key={z} value={z}>
                  {z}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adj-tip">Tip proprietate</Label>
          <Select
            value={params.tipProprietate}
            onValueChange={(v) => setParams((s) => ({ ...s, tipProprietate: v }))}
          >
            <SelectTrigger id="adj-tip" aria-label="Tipul proprietății">
              <SelectValue placeholder="Alege tipul" />
            </SelectTrigger>
            <SelectContent>
              {(TYPES.includes(params.tipProprietate) ? TYPES : [params.tipProprietate, ...TYPES]).map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "casa" ? "casă" : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="adj-ocupare">Grad de ocupare estimat</Label>
          <span className="text-sm font-semibold text-foreground">{params.ocupare}%</span>
        </div>
        <Slider
          id="adj-ocupare"
          min={40}
          max={95}
          step={1}
          value={[params.ocupare]}
          onValueChange={([v]) => setParams((s) => ({ ...s, ocupare: v }))}
          aria-label="Grad de ocupare estimat în procente"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Venit brut/lună", value: `${fmt(preview.venit_lunar_brut || 0)} RON` },
          { label: "Venit net/lună", value: `${fmt(preview.venit_lunar_net || 0)} RON` },
          { label: "ROI estimat", value: preview.roi_estimat || "—" },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-background p-3">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
            <p className="text-sm font-bold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={apply} className="min-h-12 flex-1">
          <Calculator className="mr-2 h-4 w-4" aria-hidden="true" />
          Recalculează raportul
        </Button>
        <Button
          variant="outline"
          onClick={() => setParams(initial)}
          className="min-h-12"
          aria-label="Revino la valorile estimate de AI"
        >
          <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
          Valorile AI
        </Button>
      </div>
    </section>
  );
};

export default AnalysisAdjustPanel;
