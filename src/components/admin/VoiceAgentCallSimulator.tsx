import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Phone, Loader2, Play, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { FunctionsHttpError } from "@supabase/supabase-js";
import type { VoiceProspectSummary } from "./VoiceProspectCard";
import { consentPhone } from "./autoConsentedListingUtils";

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

export default function VoiceAgentCallSimulator({ prospect }: { prospect?: VoiceProspectSummary | null }) {
  const [phone, setPhone] = useState(prospect?.phone_normalized || prospect?.contact_phone || "+40");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContextResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [callInfo, setCallInfo] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const [config, setConfig] = useState<{ ready: boolean; checks: { key: string; label: string; ok: boolean; required: boolean; detail: string }[] } | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const loadConfig = async () => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("voice-agent-config-check", { body: {} });
      if (invokeErr) {
        const details = invokeErr instanceof FunctionsHttpError ? await invokeErr.context.text() : invokeErr.message;
        throw new Error(details);
      }
      if (data?.error) throw new Error(data.error);
      setConfig(data);
    } catch (e: any) {
      setConfigError(`Nu am putut verifica configurația: ${e?.message || "eroare"}`);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => { loadConfig(); }, []);
  useEffect(() => {
    requestVersion.current += 1;
    setPhone(prospect?.phone_normalized || prospect?.contact_phone || "+40");
    setResult(null);
    setError(null);
    setLoading(false);
  }, [prospect?.id, prospect?.phone_normalized, prospect?.contact_phone]);

  const simulateCall = async () => {
    const normalizedPhone = consentPhone(phone);
    if (!/^\+[1-9]\d{6,14}$/.test(normalizedPhone)) {
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
    const version = ++requestVersion.current;

    try {
      const { data, error: invokeErr } = await supabase.functions.invoke(
        "voice-agent-context-proxy",
        { body: { phone: normalizedPhone, ...(prospect ? { prospect_id: prospect.id } : {}) } }
      );
      if (version !== requestVersion.current) return;

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

      if (data?.error) throw new Error(data.details || data.error);
      if (prospect && (!data?.found || data.prospect?.id !== prospect.id)) throw new Error("Contextul primit nu corespunde primului prospect din listă.");
      const response = { ...data, found: data.found ?? data.caller_found ?? false } as ContextResponse;
      setResult(response);
      toast({
        title: response.found ? "✅ Context încărcat (simulare, fără apel)" : "ℹ️ Prospect necunoscut (simulare, fără apel)",
        description: `${response.found
          ? `Memorie încărcată pentru ${data.prospect?.inferred_name || data.prospect?.raw_name || phone}.`
          : "Se folosește template-ul fallback."} Pentru ca telefonul să sune, apasă „Pornește apel real”.`,
      });
    } catch (err: any) {
      if (version !== requestVersion.current) return;
      setError(err.message || "Eroare de rețea");
      toast({ title: "Eroare rețea", description: err.message, variant: "destructive" });
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  };

  const explainCallError = (status: number | undefined, body: any): string => {
    const raw = typeof body === "string" ? body : JSON.stringify(body?.details ?? body ?? {});
    const base = body?.error || body?.message || "Eroare necunoscută";
    if (body?.missing) {
      const miss = Object.entries(body.missing).filter(([, v]) => v).map(([k]) => k).join(", ");
      return `Configurație lipsă: ${miss || "Twilio"}. ${base}`;
    }
    if (status === 401) return `401 Unauthorized — sesiunea de admin a expirat sau cheia conectorului e invalidă. ${raw}`;
    if (status === 403) return `403 Forbidden — cont fără rol admin sau conectorul Twilio nu are acces. ${raw}`;
    if (/21219|unverified/i.test(raw)) return `Twilio 21219: numărul destinatar nu e verificat (cont Trial). Detalii: ${raw}`;
    if (/21210|21606|From/i.test(raw)) return `Numărul Twilio „From” (TWILIO_FROM_NUMBER) nu e valid/nu aparține contului. Detalii: ${raw}`;
    if (/21215|geo|permission/i.test(raw)) return `Twilio: apelurile spre România nu sunt activate în Geo Permissions. Detalii: ${raw}`;
    if (/20003|authenticate/i.test(raw)) return `Twilio 20003: autentificare eșuată — reconectează Twilio. Detalii: ${raw}`;
    return `${status ? `HTTP ${status} — ` : ""}${base}${body?.details ? ` · ${raw}` : ""}`;
  };

  const startRealCall = async () => {
    const normalizedPhone = consentPhone(phone);
    if (!/^\+[1-9]\d{6,14}$/.test(normalizedPhone)) {
      toast({ title: "Număr invalid", description: "Format E.164, ex: +40722123456", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Andrei va suna REAL numărul ${normalizedPhone}. Continui?`)) return;
    setCalling(true);
    setCallError(null);
    setCallInfo(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("voice-agent-initiate", {
        body: { toNumber: normalizedPhone, ...(prospect ? { prospectId: prospect.id } : {}), forceElevenLabs: true },
      });
      if (invokeErr) {
        let status: number | undefined;
        let body: any = invokeErr.message;
        if (invokeErr instanceof FunctionsHttpError) {
          status = invokeErr.context.status;
          const text = await invokeErr.context.text();
          try { body = JSON.parse(text); } catch { body = { error: text }; }
        }
        const msg = explainCallError(status, body);
        console.error("voice-agent-initiate failed:", status, body);
        setCallError(msg);
        toast({ title: "Apelul nu a pornit", description: msg, variant: "destructive" });
        return;
      }
      if (data?.skipped) {
        const msg = data.message || `Apel sărit: ${data.skipped}`;
        setCallError(msg);
        toast({ title: "Apel sărit", description: msg, variant: "destructive" });
        return;
      }
      if (data?.error) {
        const msg = explainCallError(undefined, data);
        setCallError(msg);
        toast({ title: "Apelul nu a pornit", description: msg, variant: "destructive" });
        return;
      }
      setCallInfo(`Apel trimis către Twilio (SID ${data?.callSid ?? "—"}). Telefonul ar trebui să sune în câteva secunde.`);
      toast({ title: "📞 Apel inițiat", description: `Andrei sună ${normalizedPhone}` });
    } catch (err: any) {
      const msg = err?.message || "Eroare de rețea";
      setCallError(msg);
      toast({ title: "Eroare rețea", description: msg, variant: "destructive" });
    } finally {
      setCalling(false);
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
          {prospect?.title || "Context apel Andrei"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="andrei-simulator-phone" className="text-xs font-medium text-muted-foreground mb-1 block">
              Număr de telefon (format internațional)
            </label>
            <Input
              id="andrei-simulator-phone"
              type="tel"
              placeholder="+40722123456"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="min-h-12"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={simulateCall}
              disabled={loading}
              className="min-h-12 h-auto gap-2 whitespace-normal"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Simulează declanșare ElevenLabs
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              onClick={startRealCall}
              disabled={calling}
              variant="destructive"
              className="min-h-12 h-auto gap-2 whitespace-normal"
            >
              {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
              Pornește apel real
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          „Simulează” doar încarcă contextul (nu sună). „Pornește apel real” sună efectiv numărul prin Twilio + vocea ElevenLabs.
        </p>

        <div className="rounded-md border border-border/60 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold">Configurație apeluri ieșire</span>
            <Button variant="ghost" size="sm" className="min-h-12 h-auto" onClick={loadConfig} disabled={configLoading}>
              {configLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reverifică"}
            </Button>
          </div>
          {configError && <p role="alert" className="text-xs text-destructive break-words">{configError}</p>}
          {config?.checks?.map((c) => (
            <div key={c.key} className="flex items-start gap-2 text-xs">
              {c.ok ? <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" /> : <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-destructive" />}
              <span><strong>{c.label}</strong> ({c.key}) — {c.detail}</span>
            </div>
          ))}
          {config && (
            <p className={`text-xs font-medium ${config.ready ? "text-primary" : "text-destructive"}`}>
              {config.ready ? "✅ Totul e configurat pentru apeluri reale." : "⚠️ Lipsește configurație — apelul real nu va porni până nu e completată."}
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {callError && (
          <div role="alert" className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive break-words">
            <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{callError}</span>
          </div>
        )}
        {callInfo && (
          <div className="flex items-start gap-2 rounded-md bg-primary/10 p-3 text-sm text-foreground">
            <CheckCircle className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>{callInfo}</span>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {result.found ? (
                <Badge variant="secondary" className="gap-1">
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
