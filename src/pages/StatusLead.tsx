import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";

interface Stage {
  key: string;
  label: string;
  description: string;
  state: "done" | "current" | "pending";
  at: string | null;
}

interface LeadStatus {
  owner_name: string | null;
  owner_email_masked: string | null;
  property_address: string | null;
  contract_status: string | null;
  invoice_number: string | null;
  management_fee_percent: number | null;
  currency: string;
  payment_amount_cents: number | null;
  can_sign: boolean;
  stages: Stage[];
  updated_at: string;
}

const TOKEN_RE = /^[a-f0-9]{32,64}$/i;

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

const StatusLead = () => {
  const [params, setParams] = useSearchParams();
  const urlToken = (params.get("token") ?? "").trim();

  const [tokenInput, setTokenInput] = useState(urlToken);
  const [status, setStatus] = useState<LeadStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (token: string) => {
    if (!TOKEN_RE.test(token)) {
      setError("Codul de urmărire nu este valid. Verifică linkul primit pe email.");
      setStatus(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("lead-status-public", {
        body: { token },
      });
      if (fnError) throw fnError;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setStatus((data as { status: LeadStatus }).status);
    } catch (e) {
      setStatus(null);
      setError(
        e instanceof Error && e.message
          ? e.message
          : "Nu am putut încărca statusul. Încearcă din nou în câteva momente.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (urlToken) void load(urlToken);
  }, [urlToken, load]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const token = tokenInput.trim();
    setParams(token ? { token } : {});
    void load(token);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Status proprietate | RealTrust Timișoara</title>
        <meta
          name="description"
          content="Urmărește în timp real etapa proprietății tale în procesul de administrare RealTrust Timișoara: evaluare, contract, plată și listare."
        />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <main className="container mx-auto max-w-3xl px-4 py-16 md:py-24">
        <Link
          to="/pentru-proprietari"
          className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          aria-label="Înapoi la pagina pentru proprietari"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Pentru proprietari
        </Link>

        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Status proprietate</h1>
        <p className="mt-3 text-muted-foreground">
          Introdu codul de urmărire primit pe email pentru a vedea exact în ce etapă se află
          proprietatea ta.
        </p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Input
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            placeholder="Cod de urmărire (din email)"
            aria-label="Cod de urmărire proprietate"
            autoComplete="off"
            spellCheck={false}
            className="h-12"
          />
          <Button type="submit" className="h-12 min-w-[9rem]" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="ml-2">Verifică</span>
          </Button>
        </form>

        {loading && (
          <div className="mt-10 space-y-4" aria-busy="true" aria-live="polite">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        )}

        {!loading && error && (
          <Card className="mt-10 border-destructive/40">
            <CardContent className="flex items-start gap-3 p-6">
              <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" aria-hidden="true" />
              <div>
                <p className="font-medium">Status indisponibil</p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href="tel:+40751123456" aria-label="Sună consultantul RealTrust">
                      <Phone className="mr-2 h-4 w-4" aria-hidden="true" /> Sună-ne
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a
                      href="https://wa.me/40751123456"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Scrie pe WhatsApp"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" /> WhatsApp
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && !status && (
          <Card className="mt-10 border-dashed">
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nu ai codul la îndemână? Îl găsești în emailul cu contractul de administrare sau ți-l
              retrimitem la o cerere pe WhatsApp.
            </CardContent>
          </Card>
        )}

        {!loading && status && (
          <div className="mt-10 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Proprietar</p>
                    <p className="text-lg font-semibold">{status.owner_name ?? "—"}</p>
                    {status.owner_email_masked && (
                      <p className="text-sm text-muted-foreground">{status.owner_email_masked}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {status.contract_status ?? "în lucru"}
                  </Badge>
                </div>
                <div className="mt-4 grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Proprietate</p>
                    <p className="font-medium">{status.property_address ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Comision administrare</p>
                    <p className="font-medium">
                      {status.management_fee_percent != null
                        ? `${status.management_fee_percent}%`
                        : "—"}
                    </p>
                  </div>
                  {status.invoice_number && (
                    <div>
                      <p className="text-muted-foreground">Factură</p>
                      <p className="font-medium">{status.invoice_number}</p>
                    </div>
                  )}
                  {status.payment_amount_cents != null && (
                    <div>
                      <p className="text-muted-foreground">Sumă plătită</p>
                      <p className="font-medium">
                        {(status.payment_amount_cents / 100).toFixed(2)} {status.currency}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Etapele procesului</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void load(urlToken || tokenInput.trim())}
                    aria-label="Reîmprospătează statusul"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                <ol className="mt-6 space-y-6">
                  {status.stages.map((stage) => (
                    <li key={stage.key} className="flex gap-4">
                      <div className="pt-0.5">
                        {stage.state === "done" ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
                        ) : stage.state === "current" ? (
                          <Loader2
                            className="h-5 w-5 animate-spin text-muted-foreground"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground/50" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <p
                          className={
                            stage.state === "pending"
                              ? "font-medium text-muted-foreground"
                              : "font-medium"
                          }
                        >
                          {stage.label}
                          {stage.state === "current" && (
                            <Badge variant="outline" className="ml-2 align-middle">
                              în curs
                            </Badge>
                          )}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">{stage.description}</p>
                        {formatDate(stage.at) && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(stage.at)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                {status.can_sign && (
                  <div className="mt-8 rounded-lg border bg-muted/40 p-4">
                    <p className="text-sm font-medium">Contractul tău așteaptă semnătura</p>
                    <Button asChild className="mt-3">
                      <Link to={`/contract/${urlToken || tokenInput.trim()}`}>
                        Semnează contractul
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default StatusLead;
