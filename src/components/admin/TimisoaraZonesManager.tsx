import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, X } from "lucide-react";
import { toast } from "sonner";

type Zone = { id: string; name: string; kind: string; aliases: string[]; is_active: boolean };
const KIND: Record<string, string> = { cartier: "Cartiere", localitate: "Localități limitrofe", reper: "Repere" };

/** Lista oficială de cartiere și repere din Timișoara folosită de Andrei și de verificarea „zonă inventată”. */
export default function TimisoaraZonesManager() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("cartier");
  const load = () => supabase.from("timisoara_zones").select("*").order("name").then(({ data }) => setZones((data as Zone[]) ?? []));
  useEffect(() => { load(); }, []);

  const add = async () => {
    const n = name.trim();
    if (n.length < 3) return toast.error("Scrie numele cartierului sau reperului");
    const { error } = await supabase.from("timisoara_zones").insert({ name: n, kind });
    if (error) return toast.error(error.code === "23505" ? "Există deja în listă" : error.message);
    setName(""); load(); toast.success(`„${n}” a fost adăugat`);
  };
  const remove = async (z: Zone) => {
    const { error } = await supabase.from("timisoara_zones").delete().eq("id", z.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Cartiere și repere din Timișoara ({zones.length})</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Andrei folosește zona exactă din anunț. Orice cartier sau reper din listă pe care îl spune fără să apară în anunț (sau fără să-l fi spus proprietarul) este marcat „Zonă inventată” în istoric și scade nota.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Calea Lipovei" aria-label="Nume cartier sau reper" onKeyDown={(e) => e.key === "Enter" && add()} />
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Tip" className="min-h-[48px] rounded-md border border-input bg-background px-3 text-sm">
            <option value="cartier">Cartier</option><option value="localitate">Localitate limitrofă</option><option value="reper">Reper</option>
          </select>
          <Button className="min-h-[48px]" onClick={add}>Adaugă</Button>
        </div>
        {Object.entries(KIND).map(([k, label]) => (
          <div key={k}>
            <h4 className="mb-2 text-sm font-semibold">{label}</h4>
            <div className="flex flex-wrap gap-2">
              {zones.filter((z) => z.kind === k).map((z) => (
                <Badge key={z.id} variant="secondary" className="gap-1 py-1 pl-3 pr-1 text-xs">
                  {z.name}
                  <button type="button" onClick={() => remove(z)} aria-label={`Elimină ${z.name}`} className="rounded-full p-1 hover:bg-muted"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
