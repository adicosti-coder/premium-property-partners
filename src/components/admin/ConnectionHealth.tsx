import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { useConnectionHealth } from "@/hooks/useConnectionHealth";
import { STATUS_TEXT, type HealthStatus } from "../../../supabase/functions/_shared/connectionHealthRules";

export const CONNECTION_HEALTH_ANCHOR = "sanatate-conexiuni";

const DOT: Record<HealthStatus, string> = {
  green: "bg-success",
  yellow: "bg-warning",
  red: "bg-destructive",
};
const ROW: Record<HealthStatus, string> = {
  green: "border-border",
  yellow: "border-warning/50 bg-warning-soft/40",
  red: "border-destructive/50 bg-destructive/5",
};
const LABEL: Record<HealthStatus, string> = { green: "Activ", yellow: "Atenție", red: "Oprit / blocat" };

const timeFmt = new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });
const fmt = (iso: string) => { try { return timeFmt.format(new Date(iso)); } catch { return iso; } };

function Dot({ status, className = "" }: { status: HealthStatus; className?: string }) {
  return <span aria-hidden className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${DOT[status]} ${className}`} />;
}

/** Compact pill for the admin status bar; tapping it opens the card on „Astăzi”. */
export function ConnectionHealthPill() {
  const navigate = useNavigate();
  const { data, isLoading } = useConnectionHealth();
  const status: HealthStatus = data?.overall ?? "green";
  const text = isLoading ? "Se verifică…" : STATUS_TEXT[status];
  return (
    <button
      type="button"
      onClick={() => navigate(`/admin#${CONNECTION_HEALTH_ANCHOR}`)}
      className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-md px-2 py-1 transition hover:bg-muted"
      aria-label={`Sănătate conexiuni: ${text}. Deschide detaliile.`}
      title="Sănătate conexiuni"
    >
      {isLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : <Dot status={status} />}
      <span className="text-muted-foreground hidden sm:inline">Conexiuni:</span>
      <span className="font-semibold text-foreground">{text}</span>
    </button>
  );
}

/** „Sănătate Conexiuni” card on the „Astăzi” screen. */
export function ConnectionHealthCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const ref = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, recheck, rechecking } = useConnectionHealth();

  useEffect(() => {
    if (location.hash === `#${CONNECTION_HEALTH_ANCHOR}`) {
      const t = setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      return () => clearTimeout(t);
    }
  }, [location.hash, location.key]);

  const overall = data?.overall;

  return (
    <Card id={CONNECTION_HEALTH_ANCHOR} ref={ref} className="scroll-mt-20">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            Sănătate Conexiuni
            {overall && (
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium">
                <Dot status={overall} /> {STATUS_TEXT[overall]}
              </span>
            )}
          </CardTitle>
          <CardDescription>Baza de date, WhatsApp Business și webhook-urile Make, verificate automat la câteva minute.</CardDescription>
        </div>
        <Button
          variant="outline" size="sm" className="min-h-[44px] shrink-0 gap-2"
          onClick={() => recheck()} disabled={rechecking}
        >
          {rechecking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="hidden min-[380px]:inline">Reverifică acum</span>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Se verifică conexiunile…</div>
        ) : isError || !data ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Verificarea nu a putut fi încărcată. Încearcă „Reverifică acum”.</div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {data.services.map((s) => (
              <li key={s.key} className={`flex min-w-0 flex-col gap-2 rounded-lg border p-3 ${ROW[s.status]}`}>
                <div className="flex items-center gap-2">
                  <Dot status={s.status} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{s.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{LABEL[s.status]}</span>
                </div>
                <p className="text-sm break-words">{s.summary}</p>
                {s.lastError && s.status !== "green" && (
                  <p className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground break-words">
                    Ultima eroare: {s.lastError}
                  </p>
                )}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-muted-foreground">Verificat: {fmt(s.checkedAt)}</span>
                  <Button
                    variant="ghost" size="sm" className="min-h-[44px] gap-1 px-2"
                    onClick={() => navigate(s.fixRoute)}
                    aria-label={`Deschide secțiunea pentru ${s.label}`}
                  >
                    Remediază <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
