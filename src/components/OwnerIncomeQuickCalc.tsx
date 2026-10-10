import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useZonePrices } from "@/hooks/useZonePrices";

const eur = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} €`;

/** Calculator rapid de venit pentru proprietari: chirie clasică vs. regim hotelier RealTrust (9,4% net). */
export default function OwnerIncomeQuickCalc() {
  const data = useZonePrices();
  const [zone, setZone] = useState("Centru / Cetate");
  const [rooms, setRooms] = useState("2");
  const [size, setSize] = useState("55");

  const r = useMemo(() => {
    const z = data?.zones.find((x) => x.label === zone);
    const m2 = Math.max(15, Math.min(300, Number(size) || 0));
    if (!data || !z) return null;
    const value = m2 * (z.ppm ?? data.city_ppm);
    const classic = m2 * z.rent_ppm;
    const hotelMin = (value * 0.065) / 12;
    const hotelMax = (value * 0.094) / 12;
    return { value, classic, hotelMin, hotelMax, diff: hotelMin - classic };
  }, [data, zone, size]);

  const wa = encodeURIComponent(
    `Bună! Vreau o ofertă de administrare pentru apartamentul meu: ${zone}, ${rooms} camere, ${size} m².` +
      (r ? ` Calculatorul arată chirie clasică ~${eur(r.classic)}/lună vs. regim hotelier ~${eur(r.hotel)}/lună net.` : ""),
  );

  return (
    <section className="px-4 py-16" aria-labelledby="quick-income-title">
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle id="quick-income-title" className="text-2xl md:text-3xl">Cât poate câștiga apartamentul tău?</CardTitle>
          <p className="text-muted-foreground">Alege cartierul, camerele și suprafața. Calculăm din anunțurile reale din Timișoara.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="qc-zone">Cartier</Label>
              <Select value={zone} onValueChange={setZone}>
                <SelectTrigger id="qc-zone" className="min-h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(data?.zones ?? [{ label: "Centru / Cetate" }]).map((z) => <SelectItem key={z.label} value={z.label}>{z.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-rooms">Camere</Label>
              <Select value={rooms} onValueChange={setRooms}>
                <SelectTrigger id="qc-rooms" className="min-h-12"><SelectValue /></SelectTrigger>
                <SelectContent>{["1", "2", "3", "4"].map((v) => <SelectItem key={v} value={v}>{v === "1" ? "Garsonieră" : `${v} camere`}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc-size">Suprafață (m²)</Label>
              <Input id="qc-size" type="number" inputMode="numeric" min={15} max={300} value={size} onChange={(e) => setSize(e.target.value)} className="min-h-12" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border p-5">
              <div className="text-sm text-muted-foreground">Chirie clasică (estimare)</div>
              <div className="mt-1 text-3xl font-bold text-foreground">{r ? `${eur(r.classic)}/lună` : "…"}</div>
            </div>
            <div className="rounded-xl border border-primary bg-primary/5 p-5">
              <div className="text-sm text-muted-foreground">Regim hotelier RealTrust (~9,4% net/an)</div>
              <div className="mt-1 text-3xl font-bold text-primary">{r ? `${eur(r.hotel)}/lună` : "…"}</div>
              {r && r.diff > 0 && <div className="mt-1 text-sm text-foreground">+{eur(r.diff)}/lună față de chiria clasică</div>}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Estimare orientativă: valoarea apartamentului din prețul mediu pe m² al cartierului, chiria din anunțurile de închiriere din zonă.
          </p>
          <Button asChild size="lg" className="min-h-12 w-full sm:w-auto gap-2">
            <a href={`https://wa.me/40799069256?text=${wa}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-5 w-5" /> Cere ofertă dedicată pe WhatsApp
            </a>
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
