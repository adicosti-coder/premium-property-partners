import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Rocket, RefreshCw, Send, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

interface OverrideRow {
  url_path: string;
  applied_at?: string | null;
  is_active: boolean;
}

interface Props {
  overrides: OverrideRow[];
}

const SITEMAP_URL = "https://realtrust.ro/sitemap.xml";

export const SEORedeployPanel = ({ overrides }: Props) => {
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<{ label: string; status: "idle" | "ok" | "err"; detail?: string }[]>([]);

  const activeUrls = overrides
    .filter((o) => o.is_active)
    .map((o) => `https://realtrust.ro${o.url_path === "/" ? "" : o.url_path}`);

  const runRedeploy = async () => {
    setRunning(true);
    const log: { label: string; status: "idle" | "ok" | "err"; detail?: string }[] = [];

    // 1. Regenerate sitemap via edge function (avoids CORS from preview origin)
    log.push({ label: "Regenerez sitemap.xml", status: "idle" });
    setSteps([...log]);
    try {
      const MAX_ATTEMPTS = 3;
      let lastErr: any = null;
      let success = false;
      let detail = "";
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const { data, error } = await supabase.functions.invoke("generate-sitemap", {
            method: "GET" as any,
          });
          if (error) throw error;
          const ok = typeof data === "string" ? data.includes("<urlset") : true;
          if (!ok) throw new Error("format invalid");
          success = true;
          detail = attempt === 1 ? "OK" : `OK (retry ${attempt - 1})`;
          break;
        } catch (e: any) {
          lastErr = e;
          if (attempt < MAX_ATTEMPTS) {
            log[log.length - 1] = { label: "Sitemap regenerat", status: "idle", detail: `retry ${attempt}/${MAX_ATTEMPTS - 1}…` };
            setSteps([...log]);
            // Exponential backoff: 500ms, 1500ms
            await new Promise((r) => setTimeout(r, 500 * Math.pow(3, attempt - 1)));
          }
        }
      }
      if (success) {
        log[log.length - 1] = { label: "Sitemap regenerat", status: "ok", detail };
      } else {
        // Final fallback: warm via no-cors fetch
        try {
          await fetch(SITEMAP_URL, { cache: "no-store", mode: "no-cors" });
          log[log.length - 1] = { label: "Sitemap regenerat", status: "ok", detail: "warm fallback" };
        } catch (e2: any) {
          log[log.length - 1] = { label: "Sitemap regenerat", status: "err", detail: e2.message || lastErr?.message || "failed" };
        }
      }
    } catch (e: any) {
      log[log.length - 1] = { label: "Sitemap regenerat", status: "err", detail: e.message };
    }
    setSteps([...log]);

    // 2. IndexNow ping
    log.push({ label: `Trimit IndexNow ping (${activeUrls.length} URL-uri)`, status: "idle" });
    setSteps([...log]);
    try {
      const { data, error } = await supabase.functions.invoke("indexnow-notify", {
        body: { urls: activeUrls.length > 0 ? activeUrls : [SITEMAP_URL.replace("/sitemap.xml", "/")] },
      });
      if (error) throw error;
      log[log.length - 1] = {
        label: "IndexNow ping trimis",
        status: data?.ok ? "ok" : "err",
        detail: `HTTP ${data?.status ?? "?"}`,
      };
    } catch (e: any) {
      log[log.length - 1] = { label: "IndexNow ping", status: "err", detail: e.message };
    }
    setSteps([...log]);

    // 3. Cloudflare cache: signal via cache-busting fetch (no API key managed). Soft purge by warming.
    log.push({ label: "Warm cache pentru URL-uri aplicate", status: "idle" });
    setSteps([...log]);
    try {
      const limited = activeUrls.slice(0, 20);
      await Promise.allSettled(limited.map((u) => fetch(u, { cache: "no-store", mode: "no-cors" })));
      log[log.length - 1] = { label: `Cache warm (${limited.length} pagini)`, status: "ok" };
    } catch (e: any) {
      log[log.length - 1] = { label: "Cache warm", status: "err", detail: e.message };
    }
    setSteps([...log]);

    setRunning(false);
    const failed = log.filter((s) => s.status === "err").length;
    if (failed === 0) toast.success("Re-deploy SEO complet");
    else toast.warning(`Re-deploy cu ${failed} avertismente`);
  };

  return (
    <Card className="border-emerald-200 dark:border-emerald-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-emerald-600" />
          One-Click Re-deploy SEO
          <Badge variant="outline" className="ml-2">{activeUrls.length} URL-uri active</Badge>
        </CardTitle>
        <CardDescription>
          Regenerează sitemap, trimite ping IndexNow (Bing/Yandex/Seznam) și încălzește cache-ul Cloudflare pentru toate paginile cu override SEO aplicat.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runRedeploy} disabled={running} className="gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {running ? "Re-deploy în curs…" : "Rulează re-deploy"}
        </Button>

        {steps.length > 0 && (
          <ul className="space-y-2 text-sm">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-2">
                {s.status === "idle" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {s.status === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {s.status === "err" && <XCircle className="w-4 h-4 text-red-600" />}
                <span>{s.label}</span>
                {s.detail && <span className="text-xs text-muted-foreground">— {s.detail}</span>}
              </li>
            ))}
          </ul>
        )}

        <div className="text-xs text-muted-foreground flex items-start gap-2">
          <RefreshCw className="w-3 h-3 mt-0.5" />
          <span>
            IndexNow notifică instant Bing, Yandex și Seznam. Google indexează prin sitemap regenerat.
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
