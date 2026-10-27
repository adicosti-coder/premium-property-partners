import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Gavel } from "lucide-react";

const eur = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(Number(n)) + " €";

const statusLabel: Record<string, string> = {
  primita: "Primită", acceptata: "Acceptată", respinsa: "Respinsă", retrasa: "Retrasă",
};

// The visible minimum must always belong to the property currently selected.
// A value typed by the user counts only while it was typed for that property,
// so switching listings can never leave another listing's minimum in the box.
const getMinPriceInput = (
  propertyId: string,
  edit: { propertyId: string; value: string } | null,
  saved: unknown,
) => {
  if (edit && edit.propertyId === propertyId) return edit.value;
  return saved == null ? "" : String(saved);
};

const OwnerOffers = ({ propertyId }: { propertyId: string }) => {
  const qc = useQueryClient();
  const db = supabase as any;
  const [minEdit, setMinEdit] = useState<{ propertyId: string; value: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["owner-offers", propertyId],
    queryFn: async () => {
      const [offers, settings] = await Promise.all([
        db.from("property_sale_offers").select("*").eq("property_id", propertyId).order("amount_eur", { ascending: false }),
        db.from("property_sale_settings").select("*").eq("property_id", propertyId).maybeSingle(),
      ]);
      if (offers.error) throw offers.error;
      return { offers: offers.data ?? [], settings: settings.data };
    },
  });

  const savedMin = data?.settings?.min_price_eur;
  const minInput = getMinPriceInput(propertyId, minEdit, savedMin);

  const saveMin = async () => {
    const v = Number(minInput.replace(/[^\d]/g, ""));
    if (!v) return toast({ title: "Introduceți un preț minim valid", variant: "destructive" });
    setSaving(true);
    const { error } = await db.from("property_sale_settings")
      .upsert({ property_id: propertyId, min_price_eur: v, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) return toast({ title: "Nu am putut salva prețul minim", description: error.message, variant: "destructive" });
    toast({ title: "Preț minim salvat", description: "Doar dumneavoastră și echipa RealTrust îl vedeți." });
    setMinEdit(null);
    qc.invalidateQueries({ queryKey: ["owner-offers", propertyId] });
  };


  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const offers = data?.offers ?? [];
  const min = data?.settings?.min_price_eur != null ? Number(data.settings.min_price_eur) : null;
  const best = offers.find((o: any) => o.status !== "retrasa");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Oferte primite</p><p className="text-2xl font-semibold">{offers.length}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cea mai bună ofertă</p><p className="text-2xl font-semibold">{eur(best?.amount_eur)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Preț de pornire</p><p className="text-2xl font-semibold">{eur(data?.settings?.start_price_eur)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ShieldCheck className="h-5 w-5 text-primary" />Prețul dumneavoastră minim</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="min-price">Sub această sumă nu acceptați nicio ofertă (EUR)</Label>
            <Input id="min-price" inputMode="numeric" value={minInput} onChange={(e) => setMinEdit({ propertyId, value: e.target.value })} placeholder="ex. 120000" className="h-12" />
          </div>
          <Button onClick={saveMin} disabled={saving} className="h-12">{saving ? "Se salvează..." : "Salvează"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Gavel className="h-5 w-5 text-primary" />Ofertele scrise primite</CardTitle></CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Încă nu ați primit oferte. Le veți vedea aici imediat ce sunt înregistrate.</p>
          ) : (
            <ul className="divide-y divide-border">
              {offers.map((o: any) => {
                const below = min != null && Number(o.amount_eur) < min;
                return (
                  <li key={o.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{o.buyer_label}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("ro-RO")}
                        {o.payment_method ? ` · ${o.payment_method}` : ""}
                        {o.conditions ? ` · ${o.conditions}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{eur(o.amount_eur)}</span>
                      {below && <Badge variant="outline">Sub prețul minim</Badge>}
                      <Badge variant="secondary">{statusLabel[o.status] ?? o.status}</Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">Decizia finală vă aparține. Datele de contact ale cumpărătorilor sunt păstrate de echipa RealTrust.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OwnerOffers;
