import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Mail, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

type Digest = {
  id: string;
  sent_at: string;
  hours: number;
  recipient: string;
  subject: string;
  stats: Record<string, number> | null;
  html: string;
  email_sent: boolean;
  error: string | null;
};

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" }) : "—";

/**
 * Tab „E-mailuri zilnice": istoricul rezumatelor trimise la info@realtrust.ro,
 * cu firul complet al discuțiilor livrate — vizibil din Admin chiar dacă
 * e-mailul a fost șters din inbox.
 */
const WhatsappDailyDigests = () => {
  const { toast } = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["wa-daily-digests"],
    queryFn: async () => {
      const { data: rows, error: qErr } = await supabase
        .from("wa_daily_digests")
        .select("id, sent_at, hours, recipient, subject, stats, html, email_sent, error")
        .order("sent_at", { ascending: false })
        .limit(60);
      if (qErr) throw qErr;
      return (rows ?? []) as Digest[];
    },
  });

  /** Trimite acum rezumatul zilnic, fără să aștepte ora programată. */
  const sendNow = async () => {
    setSending(true);
    const { data: res, error: fnErr } = await supabase.functions.invoke(
      "wa-conversations-digest",
      { body: { hours: 24 } },
    );
    setSending(false);
    const ok = !fnErr && (res as { ok?: boolean } | null)?.ok !== false;
    toast({
      title: ok ? "Rezumat trimis" : "Rezumatul nu a plecat",
      description: ok
        ? "E-mailul cu firul complet al discuțiilor a plecat la info@realtrust.ro."
        : fnErr?.message || "Verifică jurnalul de e-mailuri.",
      variant: ok ? "default" : "destructive",
    });
    void refetch();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Mail className="h-5 w-5" />
            E-mailuri zilnice
          </CardTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="min-h-[40px]"
              onClick={() => void refetch()}
              disabled={isRefetching}
              aria-label="Reîncarcă lista de e-mailuri zilnice"
            >
              {isRefetching
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button
              size="sm"
              className="min-h-[40px]"
              onClick={() => void sendNow()}
              disabled={sending}
              aria-label="Trimite acum rezumatul zilnic al discuțiilor"
            >
              {sending
                ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                : <Mail className="h-4 w-4 mr-2" />}
              Trimite acum
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Fiecare rezumat conține firul complet al discuțiilor livrate în ultimele 24 de ore:
            mesajele clienților, răspunsurile agenților, ora, șablonul și confirmarea de la WhatsApp.
          </p>

          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> Lista nu a putut fi încărcată.
            </div>
          )}
          {!isLoading && !error && (data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Încă nu a fost trimis niciun rezumat zilnic.
            </p>
          )}

          {(data ?? []).map((d) => {
            const s = d.stats ?? {};
            const open = openId === d.id;
            return (
              <div key={d.id} className="rounded-lg border">
                <button
                  type="button"
                  className="w-full text-left p-3 flex flex-col sm:flex-row sm:items-center gap-2 min-h-[48px]"
                  onClick={() => setOpenId(open ? null : d.id)}
                  aria-label={`Deschide firul complet din rezumatul de la ${fmt(d.sent_at)}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      {fmt(d.sent_at)} · către {d.recipient} · ultimele {d.hours} h
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={d.email_sent ? "secondary" : "destructive"}>
                      {d.email_sent ? "livrat" : "eșuat"}
                    </Badge>
                    <Badge variant="outline">{s.conversations ?? 0} discuții</Badge>
                    <Badge variant="outline">{s.inbound ?? 0} de la clienți</Badge>
                    <Badge variant="outline">{s.delivered ?? 0} livrate</Badge>
                    {!!s.failed && <Badge variant="destructive">{s.failed} eșuate</Badge>}
                    {open
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>
                {d.error && (
                  <p className="px-3 pb-2 text-xs text-destructive">{d.error}</p>
                )}
                {open && (
                  <div className="border-t p-3 overflow-x-auto">
                    <div
                      className="text-sm [&_table]:w-full"
                      // Conținut generat de noi, curățat înainte de afișare.
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(d.html, { USE_PROFILES: { html: true } }),
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsappDailyDigests;
