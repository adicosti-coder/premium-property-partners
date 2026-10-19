import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const SCOPE_LABELS: Record<string, string> = {
  openid: "Confirmă identitatea contului",
  email: "Partajează adresa de email",
  profile: "Partajează profilul de bază",
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!authorizationId) return setError("Cererea de autorizare lipsește sau este invalidă.");
        const { data: sess } = await supabase.auth.getSession();
        if (!sess.session) {
          const next = window.location.pathname + window.location.search;
          window.location.href = "/auth?redirect=" + encodeURIComponent(next);
          return;
        }
        setEmail(sess.session.user.email ?? "");
        const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) return setError(error.message || "Cererea a expirat sau nu mai este validă.");
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) { window.location.href = immediate; return; }
        setDetails(data);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Eroare la încărcarea cererii.");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    try {
      const { data, error } = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (error) throw new Error(error.message);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) throw new Error("Serverul de autorizare nu a returnat o adresă de întoarcere.");
      window.location.href = target;
    } catch (e) {
      setBusy(false);
      setError((approve ? "Aprobarea a eșuat: " : "Anularea a eșuat: ") + (e instanceof Error ? e.message : ""));
    }
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "o aplicație";
  const scopes: string[] = String(details?.scope ?? details?.scopes ?? "").split(/[\s,]+/).filter(Boolean);
  const redirectUri = details?.redirect_uri ?? details?.client?.redirect_uri;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
        {error && !details ? (
          <p role="alert" className="text-sm text-destructive">Nu am putut încărca cererea: {error}</p>
        ) : !details ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…</p>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-foreground">Conectează {clientName} la RealTrust</h1>
            {email && <p className="text-sm text-muted-foreground">Cont conectat: <strong>{email}</strong></p>}
            <p className="text-sm text-foreground">{clientName} va putea folosi instrumentele acestei aplicații în numele tău.</p>
            {redirectUri && <p className="text-xs text-muted-foreground break-all">Redirecționare: {redirectUri}</p>}
            {scopes.length > 0 && (
              <ul className="text-sm list-disc pl-5 text-foreground">
                {scopes.map((s) => <li key={s}>{SCOPE_LABELS[s] ?? `Permisiune suplimentară: ${s}`}</li>)}
              </ul>
            )}
            <p className="text-xs text-muted-foreground">Accesul nu ocolește permisiunile și regulile de securitate ale aplicației.</p>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button className="flex-1 min-h-[48px]" disabled={busy} onClick={() => decide(true)}>Aprobă</Button>
              <Button variant="outline" className="flex-1 min-h-[48px]" disabled={busy} onClick={() => decide(false)}>Anulează conexiunea</Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
