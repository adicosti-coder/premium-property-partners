import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Shield, RefreshCw, Loader2, PhoneOff, Copy as CopyIcon, AlertCircle } from "lucide-react";

interface RejectionRow {
  rejection_reason: string;
  count_24h: number;
  count_period: number;
}

const REASON_META: Record<string, { label: string; tone: string; icon: any; help: string }> = {
  duplicate:    { label: "Duplicate cross-platform", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30", icon: CopyIcon, help: "Anunț identic detectat (același telefon + cartier + camere + suprafață) — refuzat la inserare." },
  landline:     { label: "Fix (landline)",           tone: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",     icon: PhoneOff, help: "Twilio Lookup → fix. Marcat instant do_not_call pentru a proteja bugetul." },
  voip:         { label: "VoIP",                     tone: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",     icon: PhoneOff, help: "Twilio Lookup → VoIP. Marcat instant do_not_call." },
  unreachable:  { label: "Unreachable",              tone: "bg-muted text-muted-foreground border-border",                            icon: AlertCircle, help: "Număr inexistent / dezactivat la rețea." },
};

const PERIOD_DAYS = 7;

export default function ProspectInjectionRejectionStats() {
  const [rows, setRows] = useState<RejectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_prospect_injection_rejection_summary", { p_days: PERIOD_DAYS });
    if (error) {
      toast({ title: "Eroare la încărcare", description: error.message, variant: "destructive" });
      setRows([]);
    } else {
      setRows((data as RejectionRow[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const t24 = rows.reduce((s, r) => s + Number(r.count_24h || 0), 0);
    const tp = rows.reduce((s, r) => s + Number(r.count_period || 0), 0);
    return { t24, tp };
  }, [rows]);

  return (
    <Card className="border-2 border-amber-500/20">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" /> Numere respinse automat la injecție
          </CardTitle>
          <CardDescription>
            Filtrare cross-platform + Twilio Lookup. Numerele de tip <strong>fix / VoIP / unreachable</strong> sunt marcate
            instant <code className="text-xs">do_not_call</code> pentru a proteja bugetul.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Reîncarcă
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground">Respinse ultimele 24h</div>
            <div className="text-2xl font-bold">{totals.t24}</div>
          </div>
          <div className="p-3 rounded-lg border bg-card">
            <div className="text-xs text-muted-foreground">Respinse ultimele {PERIOD_DAYS} zile</div>
            <div className="text-2xl font-bold">{totals.tp}</div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold bg-muted/50">
            <div className="col-span-6">Motiv</div>
            <div className="col-span-3 text-right">Ultimele 24h</div>
            <div className="col-span-3 text-right">Ultimele {PERIOD_DAYS} zile</div>
          </div>
          <div className="divide-y">
            {loading && rows.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> Se încarcă...
              </div>
            )}
            {!loading && rows.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Niciun număr respins în ultimele {PERIOD_DAYS} zile. ✨
              </div>
            )}
            {rows.map((r) => {
              const meta = REASON_META[r.rejection_reason] || { label: r.rejection_reason, tone: "", icon: AlertCircle, help: "" };
              const Icon = meta.icon;
              return (
                <div key={r.rejection_reason} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-center">
                  <div className="col-span-6 flex items-center gap-2">
                    <Badge variant="outline" className={meta.tone}>
                      <Icon className="w-3 h-3 mr-1" /> {meta.label}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden md:inline" title={meta.help}>
                      {meta.help}
                    </span>
                  </div>
                  <div className="col-span-3 text-right font-mono font-medium">{r.count_24h}</div>
                  <div className="col-span-3 text-right font-mono font-medium">{r.count_period}</div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          🛡️ Trigger-ul rulează la fiecare inserare în <code className="text-xs">prospect_listings</code>. Anunțurile duplicate
          sunt detectate prin <code className="text-xs">phone_normalized + cartier + camere + suprafață</code>.
        </p>
      </CardContent>
    </Card>
  );
}
