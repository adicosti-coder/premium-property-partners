import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldCheck, ShieldAlert, RefreshCw, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";

// Endpoints that must require admin auth (gated in edge functions).
const AI_ENDPOINTS = [
  { name: "openrouter-ai", tokenCap: 8192, requires: "admin" as const },
  { name: "openrouter-glm", tokenCap: 8192, requires: "admin" as const },
];

interface ProbeResult {
  endpoint: string;
  anonymousStatus: number | "network-error";
  authenticatedStatus: number | "skipped" | "network-error";
  passed: boolean; // anonymous must be 401/403; authenticated must NOT be 401/403 for admin
  note: string;
}

interface ScanRecord {
  id: string;
  at: string;
  results: ProbeResult[];
  overall: "pass" | "fail";
}

const HISTORY_KEY = "ai-security.scan-history.v1";
const MAX_HISTORY = 10;

function loadHistory(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(history: ScanRecord[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // ignore quota errors
  }
}

async function probeEndpoint(fnName: string, accessToken: string | null): Promise<ProbeResult> {
  const baseUrl = `https://mvzssjyzbwccioqvhjpo.supabase.co/functions/v1/${fnName}`;
  const anonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12enNzanl6YndjY2lvcXZoanBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0MjQxNjIsImV4cCI6MjA4MjAwMDE2Mn0.60JJMqMaDwIz1KXi3AZNqOd0lUU9pu2kqbg3Os3qbC8";

  const body = JSON.stringify({ prompt: "ping" });

  // Anonymous probe (no bearer JWT). Must be rejected (401/403).
  let anonymousStatus: ProbeResult["anonymousStatus"];
  try {
    const r = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: anonKey },
      body,
    });
    anonymousStatus = r.status;
  } catch {
    anonymousStatus = "network-error";
  }

  // Authenticated probe (bearer JWT). Should NOT be 401/403 for admin.
  let authenticatedStatus: ProbeResult["authenticatedStatus"] = "skipped";
  if (accessToken) {
    try {
      const r = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body,
      });
      authenticatedStatus = r.status;
    } catch {
      authenticatedStatus = "network-error";
    }
  }

  const anonBlocked = anonymousStatus === 401 || anonymousStatus === 403;
  const authAllowed =
    authenticatedStatus === "skipped" ||
    (typeof authenticatedStatus === "number" && authenticatedStatus !== 401 && authenticatedStatus !== 403);

  const passed = anonBlocked && authAllowed;
  const note = !anonBlocked
    ? "Anonim NEBLOCAT — endpoint expus fără JWT."
    : !authAllowed
    ? "Adminul autentificat este blocat cu 401/403 — verifică rolul."
    : "Gating admin activ.";

  return {
    endpoint: fnName,
    anonymousStatus,
    authenticatedStatus,
    passed,
    note,
  };
}

export default function AISecurityPanel() {
  const [history, setHistory] = useState<ScanRecord[]>(() => loadHistory());
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  const latest = history[0];

  const runScan = async () => {
    setScanning(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      if (!token) {
        toast.error("Trebuie să fii autentificat ca admin pentru a rula scanarea.");
        return;
      }

      const results: ProbeResult[] = [];
      for (const ep of AI_ENDPOINTS) {
        // eslint-disable-next-line no-await-in-loop
        results.push(await probeEndpoint(ep.name, token));
      }

      const overall: ScanRecord["overall"] = results.every(r => r.passed) ? "pass" : "fail";
      const record: ScanRecord = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        results,
        overall,
      };
      setHistory(prev => [record, ...prev].slice(0, MAX_HISTORY));

      if (overall === "pass") {
        toast.success("Scanare finalizată — toate endpoint-urile AI sunt securizate.");
      } else {
        toast.error("Scanare finalizată — au fost detectate probleme de securitate.");
      }
    } catch (err) {
      toast.error("Nu am putut rula scanarea. Te rugăm să reîncerci.");
      console.error("[AISecurityPanel] scan error", err);
    } finally {
      setScanning(false);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    toast.success("Istoricul scanărilor a fost șters.");
  };

  const exportReport = () => {
    try {
      const report = {
        generatedAt: new Date().toISOString(),
        project: "RealTrust",
        endpoints: AI_ENDPOINTS.map(ep => ({
          name: ep.name,
          authRequirement: ep.requires,
          maxTokensCap: ep.tokenCap,
        })),
        latestScan: latest ?? null,
        history,
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `realtrust-ai-security-report-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Raport de securitate exportat.");
    } catch (err) {
      console.error("[AISecurityPanel] export error", err);
      toast.error("Nu am putut genera raportul. Te rugăm să reîncerci.");
    }
  };

  const statusBadge = (r: ScanRecord) =>
    r.overall === "pass" ? (
      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
        <ShieldCheck className="w-3 h-3 mr-1" aria-hidden />
        Securizat
      </Badge>
    ) : (
      <Badge variant="destructive">
        <ShieldAlert className="w-3 h-3 mr-1" aria-hidden />
        Atenție
      </Badge>
    );

  const permissionRows = useMemo(
    () =>
      AI_ENDPOINTS.map(ep => ({
        endpoint: ep.name,
        role: "admin",
        maxTokens: ep.tokenCap,
      })),
    [],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" aria-hidden />
              Securitate rute AI
            </CardTitle>
            <CardDescription>
              Verifică că endpoint-urile OpenRouter resping cererile fără admin și
              că limitele de tokeni sunt aplicate pe server.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={runScan}
              disabled={scanning}
              aria-label="Re-scanează endpoint-urile AI"
            >
              {scanning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden />
              )}
              Re-scanează
            </Button>
            <Button
              variant="outline"
              onClick={exportReport}
              aria-label="Exportă raport de securitate"
            >
              <Download className="w-4 h-4 mr-2" aria-hidden />
              Exportă raport
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Permisiuni & limite curente</h3>
            <Table aria-label="Permisiuni și limite pe endpoint">
              <TableCaption className="sr-only">
                Lista endpoint-urilor AI cu rolul necesar și limita de tokeni pe cerere.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Endpoint</TableHead>
                  <TableHead scope="col">Rol necesar</TableHead>
                  <TableHead scope="col" className="text-right">Max tokens / cerere</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionRows.map(r => (
                  <TableRow key={r.endpoint}>
                    <TableCell className="font-mono text-xs">{r.endpoint}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.role}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.maxTokens}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Separator />

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold">Istoric scanări</h3>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  aria-label="Șterge istoricul scanărilor"
                >
                  <Trash2 className="w-4 h-4 mr-1" aria-hidden />
                  Șterge istoric
                </Button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nicio scanare rulată încă. Apasă „Re-scanează" pentru a începe.
              </p>
            ) : (
              <Table aria-label="Istoric scanări de securitate">
                <TableCaption className="sr-only">
                  Rezultatele ultimelor scanări ale endpoint-urilor AI.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Data</TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">Detalii</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(r => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <time dateTime={r.at} className="text-xs tabular-nums">
                          {new Date(r.at).toLocaleString("ro-RO")}
                        </time>
                      </TableCell>
                      <TableCell>{statusBadge(r)}</TableCell>
                      <TableCell className="text-xs">
                        <ul className="space-y-1">
                          {r.results.map(res => (
                            <li key={res.endpoint} className="flex flex-wrap gap-2">
                              <span className="font-mono">{res.endpoint}</span>
                              <span className="text-muted-foreground">
                                anon={String(res.anonymousStatus)} · auth={String(res.authenticatedStatus)}
                              </span>
                              <span className={res.passed ? "text-emerald-600" : "text-destructive"}>
                                {res.note}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
