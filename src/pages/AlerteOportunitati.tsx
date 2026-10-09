import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { BellRing, Loader2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";

const Header = lazy(() => import("@/components/Header"));
const Footer = lazy(() => import("@/components/Footer"));
const ZONES = ["Centru / Cetate", "Elisabetin", "Iosefin", "Fabric", "Nord / Aradului", "Dumbrăvița", "Sud", "Periurban"];

const AlerteOportunitati = () => {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [zones, setZones] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { toast.error("Bifează acordul pentru alerte pe WhatsApp."); return; }
    setLoading(true);
    try {
      const res = await fetch(`${supabaseConfig.url}/functions/v1/investor-alert-subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: getSupabasePublishableKey(), Authorization: `Bearer ${getSupabasePublishableKey()}` },
        body: JSON.stringify({ phone, name, zones, max_price: Number(maxPrice) || null, consent }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) toast.error(d?.message || "Nu am putut salva abonarea.");
      else setDone(true);
    } catch { toast.error("Eroare de conexiune. Încearcă din nou."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Alerte oportunități sub prețul pieței în Timișoara | RealTrust"
        description="Primește pe WhatsApp apartamentele din Timișoara listate sub prețul mediu al cartierului, detectate automat din anunțurile noi."
        url="https://realtrust.ro/alerte-oportunitati"
      />
      <Suspense fallback={null}><Header /></Suspense>
      <main className="px-4 pt-28 pb-16">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">Oportunități sub prețul pieței</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Verificăm zilnic anunțurile noi din Timișoara. Când un apartament e listat clar sub prețul mediu pe m² al cartierului
            (scor peste 80/100), primești alerta pe WhatsApp.
          </p>
        </section>
        <Card className="mx-auto mt-10 max-w-2xl">
          <CardContent className="p-6">
            {done ? (
              <div className="space-y-3 text-center">
                <BellRing className="mx-auto h-10 w-10 text-primary" />
                <p className="text-lg font-semibold text-foreground">Te-ai abonat la alerte.</p>
                <p className="text-muted-foreground">
                  Ca să poți primi mesajele, scrie-ne o dată „Alerte” pe WhatsApp. Te poți dezabona oricând răspunzând STOP.
                </p>
                <Button asChild className="min-h-12"><a href="https://wa.me/40799069256?text=Alerte" target="_blank" rel="noopener noreferrer">Scrie „Alerte” pe WhatsApp</a></Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="ia-phone">Telefon WhatsApp *</Label>
                    <Input id="ia-phone" type="tel" inputMode="tel" required placeholder="07xx xxx xxx" value={phone} onChange={(e) => setPhone(e.target.value)} className="min-h-12" /></div>
                  <div className="space-y-2"><Label htmlFor="ia-name">Nume (opțional)</Label>
                    <Input id="ia-name" value={name} onChange={(e) => setName(e.target.value)} className="min-h-12" /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="ia-max">Buget maxim € (opțional)</Label>
                  <Input id="ia-max" type="number" inputMode="numeric" placeholder="ex. 120000" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="min-h-12" /></div>
                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium">Cartiere (gol = toate)</legend>
                  <div className="flex flex-wrap gap-2">
                    {ZONES.map((z) => {
                      const on = zones.includes(z);
                      return <Button key={z} type="button" size="sm" variant={on ? "default" : "outline"} aria-pressed={on} className="min-h-12"
                        onClick={() => setZones((s) => (on ? s.filter((x) => x !== z) : [...s, z]))}>{z}</Button>;
                    })}
                  </div>
                </fieldset>
                <label className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" aria-label="Acord alerte WhatsApp" />
                  <span>Accept să primesc pe WhatsApp alerte RealTrust cu apartamente sub prețul pieței. Mă pot dezabona oricând răspunzând STOP.</span>
                </label>
                <Button type="submit" size="lg" disabled={loading} className="w-full min-h-12 gap-2">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <BellRing className="h-5 w-5" />} Abonează-mă la alerte
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-muted-foreground">
          Vezi și <Link to="/harta-preturi" className="text-primary underline">harta prețurilor și randamentelor</Link> sau{" "}
          <Link to="/analiza-anunt" className="text-primary underline">analizează un anunț</Link>.
        </p>
      </main>
      <Suspense fallback={null}><Footer /></Suspense>
    </div>
  );
};
export default AlerteOportunitati;
