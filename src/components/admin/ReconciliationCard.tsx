import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Shield, RotateCw, Wrench, Loader2 } from "lucide-react";

type ReconState = {
  loading: boolean;
  toCallIds: Set<string>;
  migratedIds: Set<string>;
  orphanProspects: string[];
  orphanProperties: { id: string; prospect_id: string }[];
};

/**
 * ReconciliationCard
 *
 * Compară prospecții cu `lifecycle_status = 'to_call'` cu proprietățile
 * publicate corelate prin `migrated_from_prospect_id` și raportează
 * asimetriile (orfani tip A / tip B), oferind un buton de reparare.
 */
export function ReconciliationCard() {
  const [state, setState] = useState<ReconState>({
    loading: true,
    toCallIds: new Set(),
    migratedIds: new Set(),
    orphanProspects: [],
    orphanProperties: [],
  });
  const [repairing, setRepairing] = useState(false);

  const load = async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const [prospectsRes, propsRes] = await Promise.all([
        supabase
          .from("prospect_listings")
          .select("id")
          .eq("lifecycle_status", "to_call" as any)
          .limit(2000),
        supabase
          .from("properties")
          .select("id, migrated_from_prospect_id")
          .not("migrated_from_prospect_id", "is", null)
          .limit(2000),
      ]);
      if (prospectsRes.error) throw prospectsRes.error;
      if (propsRes.error) throw propsRes.error;

      const toCallIds = new Set<string>((prospectsRes.data || []).map((p: any) => p.id));
      const migratedIds = new Set<string>(
        (propsRes.data || []).map((p: any) => p.migrated_from_prospect_id).filter(Boolean),
      );
      const orphanProspects = [...toCallIds].filter((id) => !migratedIds.has(id));
      const orphanProperties = (propsRes.data || [])
        .filter((p: any) => p.migrated_from_prospect_id && !toCallIds.has(p.migrated_from_prospect_id))
        .map((p: any) => ({ id: p.id as string, prospect_id: p.migrated_from_prospect_id as string }));

      setState({ loading: false, toCallIds, migratedIds, orphanProspects, orphanProperties });
    } catch (e: any) {
      toast({ title: "Reconciliere eșuată", description: e?.message || String(e), variant: "destructive" });
      setState((s) => ({ ...s, loading: false }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const asymmetry = state.orphanProspects.length + state.orphanProperties.length;

  const repair = async () => {
    if (asymmetry === 0) return;
    setRepairing(true);
    let fixed = 0;
    try {
      if (state.orphanProspects.length > 0) {
        const { error, count } = await supabase
          .from("prospect_listings")
          .update(
            {
              lifecycle_status: "pending" as any,
              admin_notes: "[reconcile] revert to_call → pending (no published property)",
            } as any,
            { count: "exact" },
          )
          .in("id", state.orphanProspects);
        if (error) throw error;
        fixed += count || 0;
      }
      if (state.orphanProperties.length > 0) {
        const ids = state.orphanProperties.map((p) => p.prospect_id);
        const { error, count } = await supabase
          .from("prospect_listings")
          .update(
            {
              lifecycle_status: "to_call" as any,
              admin_notes: "[reconcile] align prospect → to_call (property exists)",
            } as any,
            { count: "exact" },
          )
          .in("id", ids);
        if (error) throw error;
        fixed += count || 0;
      }
      toast({ title: "Reparare finalizată", description: `${fixed} înregistrări sincronizate.` });
      load();
    } catch (e: any) {
      toast({ title: "Reparare eșuată", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setRepairing(false);
    }
  };

  return (
    <Card className="bg-card/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" /> Reconciliere integritate date
          {!state.loading && asymmetry > 0 && (
            <Badge variant="outline" className="border-destructive/60 text-destructive text-[10px] ml-1">
              Asimetrie Date Detectată
            </Badge>
          )}
          {!state.loading && asymmetry === 0 && (
            <Badge variant="outline" className="border-emerald-500/60 text-emerald-600 text-[10px] ml-1">
              Sincronizat
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Verifică simetria între prospecți „to_call” și proprietățile publicate cu{" "}
          <code>migrated_from_prospect_id</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div>
            <div className="text-xl font-bold tabular-nums">{state.loading ? "…" : state.toCallIds.size}</div>
            <div className="text-[11px] text-muted-foreground">prospecți to_call</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums">{state.loading ? "…" : state.migratedIds.size}</div>
            <div className="text-[11px] text-muted-foreground">properties migrate</div>
          </div>
          <div>
            <div
              className={`text-xl font-bold tabular-nums ${
                state.orphanProspects.length > 0 ? "text-destructive" : ""
              }`}
            >
              {state.loading ? "…" : state.orphanProspects.length}
            </div>
            <div className="text-[11px] text-muted-foreground">orfan A: to_call fără property</div>
          </div>
          <div>
            <div
              className={`text-xl font-bold tabular-nums ${
                state.orphanProperties.length > 0 ? "text-destructive" : ""
              }`}
            >
              {state.loading ? "…" : state.orphanProperties.length}
            </div>
            <div className="text-[11px] text-muted-foreground">orfan B: property fără to_call</div>
          </div>
        </div>

        {(state.orphanProspects.length > 0 || state.orphanProperties.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-3 text-[11px]">
            {state.orphanProspects.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                <div className="font-semibold text-destructive mb-1">
                  Orfani A ({state.orphanProspects.length})
                </div>
                <ul className="space-y-0.5 max-h-24 overflow-auto font-mono text-muted-foreground">
                  {state.orphanProspects.slice(0, 10).map((id) => (
                    <li key={id} className="truncate">
                      {id}
                    </li>
                  ))}
                  {state.orphanProspects.length > 10 && (
                    <li className="italic">+{state.orphanProspects.length - 10} mai mulți…</li>
                  )}
                </ul>
              </div>
            )}
            {state.orphanProperties.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                <div className="font-semibold text-destructive mb-1">
                  Orfani B ({state.orphanProperties.length})
                </div>
                <ul className="space-y-0.5 max-h-24 overflow-auto font-mono text-muted-foreground">
                  {state.orphanProperties.slice(0, 10).map((p) => (
                    <li key={p.id} className="truncate">
                      prop:{p.id.slice(0, 8)} ← prospect:{p.prospect_id.slice(0, 8)}
                    </li>
                  ))}
                  {state.orphanProperties.length > 10 && (
                    <li className="italic">+{state.orphanProperties.length - 10} mai multe…</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={load} disabled={state.loading}>
            <RotateCw className={`w-3 h-3 mr-1 ${state.loading ? "animate-spin" : ""}`} /> Re-scanare
          </Button>
          <Button
            size="sm"
            variant={asymmetry > 0 ? "default" : "outline"}
            disabled={asymmetry === 0 || repairing}
            onClick={repair}
          >
            {repairing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wrench className="w-3 h-3 mr-1" />}
            Sincronizare și Reparare Stări
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReconciliationCard;
