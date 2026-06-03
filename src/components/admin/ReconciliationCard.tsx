import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, RotateCw, Wrench, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type ReconState = {
  loading: boolean;
  toCallIds: Set<string>;
  migratedIds: Set<string>;
  orphanProspects: string[];
  orphanProperties: { id: string; prospect_id: string }[];
};

export type ReconcileInput = {
  toCallProspects: { id: string }[];
  migratedProperties: { id: string; migrated_from_prospect_id: string | null }[];
};

export type ReconcileResult = {
  orphanProspects: string[];
  orphanProperties: { id: string; prospect_id: string }[];
  toCallCount: number;
  migratedCount: number;
  asymmetry: number;
};

/**
 * Pure reconciliation logic, exported for unit testing.
 * Compares `to_call` prospects against `properties.migrated_from_prospect_id`
 * and returns the two orphan sets.
 */
export function computeReconciliation(input: ReconcileInput): ReconcileResult {
  const toCallIds = new Set(input.toCallProspects.map((p) => p.id));
  const migratedIds = new Set(
    input.migratedProperties.map((p) => p.migrated_from_prospect_id).filter((x): x is string => !!x),
  );
  const orphanProspects = [...toCallIds].filter((id) => !migratedIds.has(id));
  const orphanProperties = input.migratedProperties
    .filter((p) => p.migrated_from_prospect_id && !toCallIds.has(p.migrated_from_prospect_id))
    .map((p) => ({ id: p.id, prospect_id: p.migrated_from_prospect_id as string }));
  return {
    orphanProspects,
    orphanProperties,
    toCallCount: toCallIds.size,
    migratedCount: migratedIds.size,
    asymmetry: orphanProspects.length + orphanProperties.length,
  };
}

/**
 * ReconciliationCard
 *
 * Compară prospecții `to_call` cu proprietățile publicate via
 * `migrated_from_prospect_id`, semnalează asimetriile și permite repararea
 * cu confirmare + raport de rezultat.
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState<{
    fixedA: number;
    fixedB: number;
    failedA: number;
    failedB: number;
    errors: string[];
  } | null>(null);

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

      const result = computeReconciliation({
        toCallProspects: (prospectsRes.data || []) as any,
        migratedProperties: (propsRes.data || []) as any,
      });

      setState({
        loading: false,
        toCallIds: new Set([...(prospectsRes.data || []).map((p: any) => p.id)]),
        migratedIds: new Set(
          [...(propsRes.data || [])].map((p: any) => p.migrated_from_prospect_id).filter(Boolean),
        ),
        orphanProspects: result.orphanProspects,
        orphanProperties: result.orphanProperties,
      });
    } catch (e: any) {
      toast({ title: "Reconciliere eșuată", description: e?.message || String(e), variant: "destructive" });
      setState((s) => ({ ...s, loading: false }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const asymmetry = state.orphanProspects.length + state.orphanProperties.length;

  const runRepair = async () => {
    setConfirmOpen(false);
    setRepairing(true);
    const errors: string[] = [];
    let fixedA = 0;
    let fixedB = 0;
    let failedA = 0;
    let failedB = 0;
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
        if (error) {
          failedA = state.orphanProspects.length;
          errors.push(`Orfani A: ${error.message}`);
        } else {
          fixedA = count || 0;
        }
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
        if (error) {
          failedB = ids.length;
          errors.push(`Orfani B: ${error.message}`);
        } else {
          fixedB = count || 0;
        }
      }
      setReport({ fixedA, fixedB, failedA, failedB, errors });
      setReportOpen(true);
      if (errors.length === 0) {
        toast({ title: "Reparare finalizată", description: `${fixedA + fixedB} înregistrări sincronizate.` });
      } else {
        toast({
          title: "Reparare parțială",
          description: errors.join(" • "),
          variant: "destructive",
        });
      }
      load();
    } catch (e: any) {
      errors.push(e?.message || String(e));
      setReport({ fixedA, fixedB, failedA, failedB, errors });
      setReportOpen(true);
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
          {repairing && (
            <Badge variant="outline" className="border-primary/60 text-primary text-[10px] ml-1 gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Procesare…
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Verifică simetria între prospecți „to_call” și proprietățile publicate cu{" "}
          <code>migrated_from_prospect_id</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-1 space-y-3">
        {repairing && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary"
          >
            <Loader2 className="w-3 h-3 animate-spin" />
            Reconciliere în curs… actualizăm {asymmetry} înregistrări.
          </div>
        )}

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
          <Button size="sm" variant="ghost" onClick={load} disabled={state.loading || repairing}>
            <RotateCw className={`w-3 h-3 mr-1 ${state.loading ? "animate-spin" : ""}`} /> Re-scanare
          </Button>
          <Button
            size="sm"
            variant={asymmetry > 0 ? "default" : "outline"}
            disabled={asymmetry === 0 || repairing}
            onClick={() => setConfirmOpen(true)}
          >
            {repairing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wrench className="w-3 h-3 mr-1" />}
            {repairing ? "Se repară…" : "Sincronizare și Reparare Stări"}
          </Button>
        </div>
      </CardContent>

      {/* Confirmare cu rezumat */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Confirmă reconcilierea
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Vor fi efectuate următoarele modificări în baza de date:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>{state.orphanProspects.length}</strong> prospecți „to_call” → <em>pending</em>{" "}
                    (nu au proprietate publicată).
                  </li>
                  <li>
                    <strong>{state.orphanProperties.length}</strong> prospecți → <em>to_call</em> (au deja
                    proprietate publicată).
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  Total: <strong>{asymmetry}</strong> înregistrări. Acțiunea este reversibilă manual.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction onClick={runRepair}>Confirmă și repară</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Raport rezultat */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {report && report.errors.length === 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-destructive" />
              )}
              Raport reconciliere
            </DialogTitle>
            <DialogDescription>Rezultatul ultimei operațiuni de sincronizare.</DialogDescription>
          </DialogHeader>
          {report && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-2xl font-bold tabular-nums text-emerald-600">{report.fixedA}</div>
                  <div className="text-xs text-muted-foreground">Orfani A reparați (→ pending)</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-2xl font-bold tabular-nums text-emerald-600">{report.fixedB}</div>
                  <div className="text-xs text-muted-foreground">Orfani B aliniați (→ to_call)</div>
                </div>
                {(report.failedA > 0 || report.failedB > 0) && (
                  <>
                    <div className="rounded-md border border-destructive/40 p-3">
                      <div className="text-2xl font-bold tabular-nums text-destructive">{report.failedA}</div>
                      <div className="text-xs text-muted-foreground">Eșecuri A</div>
                    </div>
                    <div className="rounded-md border border-destructive/40 p-3">
                      <div className="text-2xl font-bold tabular-nums text-destructive">{report.failedB}</div>
                      <div className="text-xs text-muted-foreground">Eșecuri B</div>
                    </div>
                  </>
                )}
              </div>
              {report.errors.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs space-y-1">
                  <div className="font-semibold text-destructive">Erori:</div>
                  {report.errors.map((err, i) => (
                    <div key={i} className="font-mono">
                      • {err}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setReportOpen(false)}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default ReconciliationCard;
