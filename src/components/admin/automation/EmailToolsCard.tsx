import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Mail, Send } from "lucide-react";
import type { Run } from "./types";

export function EmailToolsCard({ runs }: { runs: Run[] }) {
  const [reportEmail, setReportEmail] = useState("adicosti@gmail.com");
  const [sendingReport, setSendingReport] = useState(false);
  const [lastReportAt, setLastReportAt] = useState<string | null>(null);
  const [sendingDigestTest, setSendingDigestTest] = useState(false);
  const [digestTestBanner, setDigestTestBanner] = useState<{ type: "success" | "error"; message: string; details?: string } | null>(null);

  const validEmail = () => {
    if (!reportEmail || !/.+@.+\..+/.test(reportEmail)) {
      toast({ title: "Email invalid", description: "Introdu o adresă validă.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const sendReport = async () => {
    if (!validEmail()) return;
    setSendingReport(true);
    try {
      const recent = runs.slice(0, 30).map((r) => ({
        job_key: r.job_key,
        status: r.status,
        duration_ms: r.duration_ms ?? 0,
        error: r.error,
        started_at: r.started_at,
      }));
      const ok = recent.filter((r) => r.status === "success").length;
      const failed = recent.filter((r) => r.status === "failed" || r.status === "timeout").length;
      const { data, error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "automation-run-report",
          recipientEmail: reportEmail,
          idempotencyKey: `manual-report-${Date.now()}`,
          fromOverride: "RealTrust Sistem <noreply@notify.realtrust.ro>",
          templateData: {
            summary: `Raport manual: ${ok} OK / ${failed} eșuate din ultimele ${recent.length}`,
            results: recent,
            generated_at: new Date().toISOString(),
          },
        },
      });
      if (error) throw error;
      const provider = (data as { provider?: string })?.provider ?? "queue";
      setLastReportAt(new Date().toISOString());
      toast({ title: "Raport trimis", description: `Livrat prin ${provider} către ${reportEmail}.` });
    } catch (e) {
      toast({
        title: "Eroare trimitere email",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setSendingReport(false);
    }
  };

  const sendDigestTest = async () => {
    if (!validEmail()) return;
    setSendingDigestTest(true);
    setDigestTestBanner(null);
    try {
      console.log("[digest-test] invoking automation-daily-digest", { recipient: reportEmail });
      const { data, error } = await supabase.functions.invoke("automation-daily-digest", {
        body: { dry_run: false, recipient_override: reportEmail },
      });
      if (error) {
        console.error("[digest-test] invoke error", error);
        throw error;
      }
      const result = (data as { recipients?: Array<{ to: string; ok: boolean; status: number; error?: string }>; digest?: Record<string, unknown> }) || {};
      const first = result.recipients?.[0];
      if (!first || !first.ok) {
        const errMsg = first?.error || `HTTP ${first?.status ?? "?"}`;
        console.error("[digest-test] resend gateway rejected", { recipients: result.recipients, digest: result.digest });
        setDigestTestBanner({
          type: "error",
          message: "Resend a respins email-ul. Vezi consola pentru log complet.",
          details: errMsg,
        });
        toast({ title: "Eroare Resend", description: errMsg.slice(0, 180), variant: "destructive" });
        return;
      }
      setDigestTestBanner({
        type: "success",
        message: "Email trimis cu succes! Verifică inbox-ul.",
        details: `Livrat către ${first.to} • PM Leads: ${(result.digest?.pm_leads_24h as number) ?? 0} • Proprietăți noi: ${(result.digest?.properties_24h as number) ?? 0}`,
      });
      toast({ title: "Digest trimis", description: `Către ${first.to}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[digest-test] exception", e);
      setDigestTestBanner({ type: "error", message: "Eroare la trimitere", details: msg });
      toast({ title: "Eroare", description: msg, variant: "destructive" });
    } finally {
      setSendingDigestTest(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="w-4 h-4" /> Unelte email — raport manual + digest live
        </CardTitle>
        <CardDescription>
          Un singur email destinatar pentru ambele acțiuni: <strong>raport ultimele 30 rulaje</strong> (fallback pentru digest-ul zilnic) și
          <strong> digest live B2C+B2B</strong> (rulează interogarea reală pe 24h și trimite prin Resend).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-w-md">
          <Label htmlFor="report-email" className="text-xs">Email destinatar (comun)</Label>
          <input
            id="report-email"
            type="email"
            value={reportEmail}
            onChange={(e) => setReportEmail(e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border rounded-md bg-background"
            placeholder="email@exemplu.ro"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={sendReport} disabled={sendingReport} className="gap-2">
            {sendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sendingReport ? "Se trimite raportul..." : "Re-trimite raport (ultimele 30 rulaje)"}
          </Button>
          <Button onClick={sendDigestTest} disabled={sendingDigestTest} variant="outline" className="gap-2">
            {sendingDigestTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sendingDigestTest ? "Se trimite digest..." : "Trimite digest de test acum"}
          </Button>
          {lastReportAt && (
            <span className="text-xs text-muted-foreground">
              Ultim raport: {new Date(lastReportAt).toLocaleTimeString("ro-RO")}
            </span>
          )}
        </div>

        {digestTestBanner && (
          <div
            className={
              digestTestBanner.type === "success"
                ? "rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900"
                : "rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900"
            }
            role="status"
          >
            <div className="font-semibold">{digestTestBanner.message}</div>
            {digestTestBanner.details && (
              <div className="mt-1 text-xs opacity-80 font-mono break-all">{digestTestBanner.details}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
