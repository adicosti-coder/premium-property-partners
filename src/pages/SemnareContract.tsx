import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { ContractEmbeddedCheckout } from "@/components/ContractEmbeddedCheckout";
import { isPaymentsConfigured } from "@/lib/stripe";
import { CheckCircle2, FileSignature, Loader2, ShieldCheck } from "lucide-react";

interface LineItem {
  price_id: string;
  label: string;
  amount_cents: number;
}

interface PublicContract {
  id: string;
  token: string;
  owner_name: string;
  owner_email: string | null;
  owner_tax_id: string | null;
  owner_address: string | null;
  property_address: string | null;
  management_fee_percent: number;
  onboarding_fee_cents: number;
  photo_session_included: boolean;
  photo_session_fee_cents: number;
  currency: string;
  line_items: LineItem[] | null;
  contract_body: string | null;
  status: string;
  signed_at: string | null;
  signature_name: string | null;
  paid_at: string | null;
}

const formatFee = (cents: number, currency: string) =>
  `${(cents / 100).toLocaleString("ro-RO", { minimumFractionDigits: 2 })} ${currency.toUpperCase()}`;

export default function SemnareContract() {
  const { token = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [contract, setContract] = useState<PublicContract | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [signatureName, setSignatureName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [signing, setSigning] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const returnedFromCheckout = !!searchParams.get("session_id");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("contract-public", { body: { token } });
    if (error || !data?.contract) {
      setLoadError(data?.error || "Contractul nu a fost găsit sau linkul a expirat.");
      setContract(null);
    } else {
      const c = data.contract as PublicContract;
      setContract(c);
      setEmail((prev) => prev || c.owner_email || "");
      setSignatureName((prev) => prev || c.owner_name || "");
      setLoadError(null);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => {
    if (token) void load();
  }, [token, load]);

  // After Stripe returns, re-poll a few times until the webhook lands.
  useEffect(() => {
    if (!returnedFromCheckout || contract?.paid_at) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      void load();
      if (tries >= 6) clearInterval(id);
    }, 3000);
    return () => clearInterval(id);
  }, [returnedFromCheckout, contract?.paid_at, load]);

  const sendCode = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("contract-sign", {
      body: { token, action: "send_code", email },
    });
    setSending(false);
    if (error || data?.error) {
      toast({ title: "Nu am putut trimite codul", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setCodeSent(true);
    toast({
      title: data?.email_sent ? "Cod trimis prin email" : "Cod generat",
      description: data?.email_sent
        ? "Verifică inboxul și introdu codul de 6 cifre."
        : "Emailul nu a putut fi livrat — echipa RealTrust te contactează cu codul.",
    });
  };

  const sign = async () => {
    setSigning(true);
    const { data, error } = await supabase.functions.invoke("contract-sign", {
      body: { token, action: "sign", code, signature_name: signatureName, accepted_terms: accepted },
    });
    setSigning(false);
    if (error || data?.error) {
      toast({ title: "Semnarea a eșuat", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Contract semnat", description: "Poți continua cu plata taxei de onboarding." });
    await load();
  };

  const statusBadge = useMemo(() => {
    if (!contract) return null;
    if (contract.paid_at) return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Semnat & plătit</Badge>;
    if (contract.status === "signed") return <Badge variant="secondary">Semnat — plată în așteptare</Badge>;
    return <Badge variant="outline">În așteptare semnătură</Badge>;
  }, [contract]);

  if (loading) {
    return (
      <main className="container max-w-3xl py-16">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-4 h-64 w-full" />
      </main>
    );
  }

  if (loadError || !contract) {
    return (
      <main className="container max-w-2xl py-24 text-center">
        <h1 className="text-2xl font-semibold">Contract indisponibil</h1>
        <p className="mt-3 text-muted-foreground">{loadError}</p>
      </main>
    );
  }

  const isSigned = contract.status === "signed" || !!contract.paid_at;
  const isPaid = !!contract.paid_at;

  return (
    <>
      <Helmet>
        <title>Semnare contract administrare | RealTrust Timișoara</title>
        <meta name="description" content="Semnează digital contractul de administrare RealTrust și achită taxa de onboarding în siguranță." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <PaymentTestModeBanner />
      <main className="container max-w-3xl py-12">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Contract de administrare</h1>
            <p className="mt-1 text-muted-foreground">RealTrust Timișoara · regim hotelier</p>
          </div>
          {statusBadge}
        </header>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Datele din contract</CardTitle>
            <CardDescription>Pre-completate pe baza discuției cu echipa. Anunță-ne dacă ceva nu e corect.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Proprietar" value={contract.owner_name} />
            <Field label="CNP / CUI" value={contract.owner_tax_id} />
            <Field label="Adresă proprietar" value={contract.owner_address} />
            <Field label="Adresă proprietate" value={contract.property_address} />
            <Field label="Comision administrare" value={`${contract.management_fee_percent}%`} />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Sumar de plată</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {(contract.line_items ?? []).map((item) => (
                <li key={item.price_id} className="flex items-center justify-between py-3">
                  <span className="text-sm">{item.label}</span>
                  <span className="font-medium">{formatFee(item.amount_cents, contract.currency)}</span>
                </li>
              ))}
              {(!contract.line_items || contract.line_items.length === 0) && (
                <li className="flex items-center justify-between py-3">
                  <span className="text-sm">Taxă onboarding administrare RealTrust</span>
                  <span className="font-medium">{formatFee(contract.onboarding_fee_cents, contract.currency)}</span>
                </li>
              )}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-semibold">
                {formatFee(
                  (contract.line_items ?? []).reduce((sum, item) => sum + (item.amount_cents ?? 0), 0) ||
                    contract.onboarding_fee_cents,
                  contract.currency,
                )}
              </span>
            </div>
          </CardContent>
        </Card>


        {contract.contract_body && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Termenii contractuali</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
                {contract.contract_body}
              </div>
            </CardContent>
          </Card>
        )}

        {!isSigned && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSignature className="h-5 w-5" aria-hidden="true" /> Semnătură digitală
              </CardTitle>
              <CardDescription>Confirmăm identitatea printr-un cod trimis pe email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="contract-email">Email pentru codul de confirmare</Label>
                <Input
                  id="contract-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nume@exemplu.ro"
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signature-name">Nume complet semnatar</Label>
                <Input
                  id="signature-name"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Ex: Ion Popescu"
                  autoComplete="name"
                />
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="accept-terms"
                  checked={accepted}
                  onCheckedChange={(v) => setAccepted(v === true)}
                  aria-label="Accept termenii contractuali"
                />
                <Label htmlFor="accept-terms" className="text-sm font-normal leading-relaxed">
                  Am citit și accept termenii contractului de administrare, precum și{" "}
                  <a href="/legal/politica-de-confidentialitate" className="underline" target="_blank" rel="noopener noreferrer">
                    Politica de confidențialitate
                  </a>
                  .
                </Label>
              </div>

              {!codeSent ? (
                <Button onClick={sendCode} disabled={sending || !email.includes("@") || !accepted || signatureName.trim().length < 3}>
                  {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Trimite codul de semnare
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="otp-code">Cod de 6 cifre</Label>
                    <Input
                      id="otp-code"
                      inputMode="numeric"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={sign} disabled={signing || code.length !== 6 || !accepted}>
                      {signing && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                      Semnează contractul
                    </Button>
                    <Button variant="outline" onClick={sendCode} disabled={sending}>
                      Retrimite codul
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isSigned && !isPaid && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" /> Plata taxei de onboarding
              </CardTitle>
              <CardDescription>
                Contract semnat de {contract.signature_name} · {formatFee(contract.onboarding_fee_cents, contract.currency)} de achitat
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!isPaymentsConfigured() ? (
                <p className="text-sm text-muted-foreground">
                  Plata online se activează în curând. Echipa RealTrust te contactează cu instrucțiunile de plată.
                </p>
              ) : !showCheckout ? (
                <Button onClick={() => setShowCheckout(true)}>Continuă către plată securizată</Button>
              ) : (
                <ContractEmbeddedCheckout
                  token={token}
                  returnUrl={`${window.location.origin}/contract/${token}?session_id={CHECKOUT_SESSION_ID}`}
                />
              )}
              {returnedFromCheckout && (
                <p className="mt-4 text-sm text-muted-foreground">
                  Confirmăm plata... pagina se actualizează automat.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isPaid && (
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="flex items-start gap-3 py-6">
              <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" aria-hidden="true" />
              <div>
                <p className="font-semibold">Contract semnat & plătit</p>
                <p className="text-sm text-muted-foreground">
                  Îți mulțumim! Echipa RealTrust preia proprietatea în administrare și te contactează pentru pașii de onboarding.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value || "—"}</p>
    </div>
  );
}
