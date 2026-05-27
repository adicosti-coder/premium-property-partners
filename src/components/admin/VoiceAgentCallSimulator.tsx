import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, Loader2, Play, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";

interface ContextResponse {
  found: boolean;
  agent_memory_context?: string;
  prospect?: {
    id: string;
    raw_name: string | null;
    inferred_name: string | null;
    phone: string;
    zone: string | null;
    price_eur: number | null;
    surface_m2: number | null;
    rooms: string | null;
    property_type: string | null;
    source: string | null;
    quality_score: number | null;
    ai_notes: string | null;
    lifecycle_status: string | null;
  };
  fallback_template?: string;
  latency_ms?: number;
}

export default function VoiceAgentCallSimulator() {
  const [phone, setPhone] = useState("+40");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContextResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const simulateCall = async () => {
    if (!/^\+[1-9]\d{6,14}$/.test(phone.trim())) {
      toast({
        title: "Număr invalid",
        description: "Folosește format internațional E.164 (ex: +40722123456)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "voice-agent-context-proxy",
        { body: { phone: phone.trim() } }
      );

      if (invokeErr) {
        const msg = invokeErr.message || "Eroare la apelul edge function";
        setError(msg);
        toast({
          title: "Eroare context",
          description: msg,
          variant: "destructive",
        });
        return;
      }

      setResult(data);
      toast({
        title: data.found ? "✅ Prospect găsit" : "ℹ️ Prospect necunoscut",
        description: data.found
          ? `Memorie încărcată pentru ${data.prospect?.inferred_name || data.prospect?.raw_name || phone}`
          : "Se folosește template-ul fallback.",
      });
    } catch (err: any) {
      setError(err.message || "Eroare de rețea");
      toast({ title: "Eroare rețea", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border border-border/60 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Phone className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold">Simulator Apel Andrei</CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Simulează declanșarea unui apel prin ElevenLabs și verifică contextul dinamic încărcat din v_prospect_funnel.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Număr de telefon (format internațional)
            </label>
            <Input
              type="tel"
              placeholder="+40722123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={simulateCall}
              disabled={loading}
              className="h-10 gap-2 bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Simulează declanșare ElevenLabs
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.found ? (
                <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle className="h-3 w-3" />
                  Găsit în funnel
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Fallback activ
                </Badge>
              )}
              {result.latency_ms != null && (
                <span className="text-xs text-muted-foreground">
                  Latență: {result.latency_ms}ms
                </span>
              )}
            </div>

            {result.found && result.prospect && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md bg-muted p-2">
                  <span className="text-xs text-muted-foreground">Nume</span>
                  <p className="font-medium">
                    {result.prospect.inferred_name || result.prospect.raw_name || "—"}
                  </p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <span className="text-xs text-muted-foreground">Zonă</span>
                  <p className="font-medium">{result.prospect.zone || "—"}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <span className="text-xs text-muted-foreground">Preț</span>
                  <p className="font-medium">
                    {result.prospect.price_eur != null
                      ? `€${result.prospect.price_eur.toLocaleString("ro-RO")}`
                      : "—"}
                  </p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <span className="text-xs text-muted-foreground">Suprafață / Camere</span>
                  <p className="font-medium">
                    {result.prospect.surface_m2 ? `${result.prospect.surface_m2} m²` : "—"}
                    {result.prospect.rooms ? ` / ${result.prospect.rooms}` : ""}
                  </p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <span className="text-xs text-muted-foreground">Tip</span>
                  <p className="font-medium">{result.prospect.property_type || "—"}</p>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <span className="text-xs text-muted-foreground">Sursă / Scor</span>
                  <p className="font-medium">
                    {result.prospect.source || "—"} / {result.prospect.quality_score ?? "—"}
                  </p>
                </div>
              </div>
            )}

            <div>
              <span className="text-xs font-medium text-muted-foreground mb-1 block">
                Agent Memory Context (prompt injectat lui Andrei)
              </span>
              <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-relaxed whitespace-pre-wrap">
                {result.agent_memory_context || result.fallback_template || "—"}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
