import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Archive, Loader2, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = {
  id: string;
  phone_normalized: string | null;
  status: string | null;
  consented_at: string | null;
  revoked_at: string | null;
  notes: string | null;
  property_id: string | null;
  prospect_listing_id: string | null;
};

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", dateStyle: "short", timeStyle: "short" }) : "—";

/** Arhiva retragerilor + retragere manuală (fără WhatsApp) pentru anunțurile active. */
export default function RevokedListingsPanel() {
  const [revoked, setRevoked] = useState<Row[]>([]);
  const [active, setActive] = useState<Row[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const cols = "id, phone_normalized, status, consented_at, revoked_at, notes, property_id, prospect_listing_id";
    const [r, a] = await Promise.all([
      (supabase as any).from("wa_publish_consents").select(cols).not("revoked_at", "is", null).order("revoked_at", { ascending: false }).limit(200),
      (supabase as any).from("wa_publish_consents").select(cols).is("revoked_at", null).not("property_id", "is", null).order("consented_at", { ascending: false }).limit(200),
    ]);
    setRevoked(r.data ?? []);
    setActive(a.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const retract = async (row: Row) => {
    if (!window.confirm("Retragi anunțul de pe realtrust.ro? Proprietarul nu primește mesaj.")) return;
    setBusy(row.id);
    const now = new Date().toISOString();
    const { error } = await (supabase as any).from("wa_publish_consents")
      .update({ status: "revoked", revoked_at: now, notes: "Retras manual din Admin" }).eq("id", row.id);
    if (!error && row.property_id) {
      await supabase.from("properties").update({ is_active: false }).eq("id", row.property_id);
    }
    setBusy(null);
    if (error) toast.error(`Nu am putut retrage: ${error.message}`);
    else { toast.success("Anunț retras de pe site"); void load(); }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Undo2 className="h-4 w-4" /> Retragere manuală ({active.length} publicate)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : active.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niciun anunț publicat cu acord activ.</p>
          ) : active.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
              <span>{r.phone_normalized || "—"} · acord {fmt(r.consented_at)}</span>
              <Button size="sm" variant="destructive" className="min-h-12" disabled={busy === r.id} onClick={() => retract(r)}>
                {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retrage de pe site"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Archive className="h-4 w-4" /> Anunțuri arhivate / retrase ({revoked.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {loading ? null : revoked.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nicio retragere până acum.</p>
          ) : revoked.map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium">{r.phone_normalized || "—"}</span>
                <span className="text-muted-foreground">retras {fmt(r.revoked_at)}</span>
              </div>
              {r.notes && <p className="mt-1 text-muted-foreground">Mesaj: „{r.notes}”</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
