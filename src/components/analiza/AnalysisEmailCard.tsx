import { useState } from "react";
import { Loader2, Mail, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabaseConfig, getSupabasePublishableKey } from "@/lib/supabaseClient";

const EMAIL_URL = `${supabaseConfig.url}/functions/v1/send-analysis-email`;
const EMAIL_RE = /^[^\s@]+@[^\s@,;]+\.[a-z]{2,}$/i;

interface Props {
  shareToken?: string | null;
  defaultName?: string;
}

const AnalysisEmailCard = ({ shareToken, defaultName = "" }: Props) => {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (sending) return;
    if (!shareToken) {
      toast.error("Raportul nu este încă salvat. Reia analiza.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      toast.error("Introdu o adresă de e-mail validă.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(EMAIL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: getSupabasePublishableKey(),
          Authorization: `Bearer ${getSupabasePublishableKey()}`,
        },
        body: JSON.stringify({ token: shareToken, email: email.trim(), name: defaultName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.message || "Nu am putut trimite e-mailul. Încearcă din nou.");
        return;
      }
      setSent(true);
      toast.success("Raportul a fost trimis pe e-mail.");
    } catch {
      toast.error("Conexiune întreruptă. Încearcă din nou.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
        <MailCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-sm text-foreground">
          Am trimis raportul pe <strong>{email.trim()}</strong>. Verifică și folderul Spam dacă nu apare în
          câteva minute.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
          Primește raportul pe e-mail
        </h3>
        <p className="text-xs text-muted-foreground">
          Îți trimitem rezumatul ROI, linkul securizat către raport (valabil 30 de zile) și opțiunea de a
          programa o consultanță gratuită.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="analysis-email" className="sr-only">
            Adresa ta de e-mail
          </Label>
          <Input
            id="analysis-email"
            type="email"
            autoComplete="email"
            placeholder="email@exemplu.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="Adresa ta de e-mail pentru primirea raportului"
          />
        </div>
        <Button onClick={send} disabled={sending} className="min-h-12 sm:w-auto">
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Se trimite...
            </>
          ) : (
            <>
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" /> Trimite raportul
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AnalysisEmailCard;
