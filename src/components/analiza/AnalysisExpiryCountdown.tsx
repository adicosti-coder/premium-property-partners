import { CalendarClock } from "lucide-react";

interface Props {
  expiresAt: string | null;
}

const dayLabel = (d: number) => (d === 1 ? "1 zi" : `${d} zile`);

/** Vizual countdown pentru validitatea linkului public de analiză (30 zile). */
const AnalysisExpiryCountdown = ({ expiresAt }: Props) => {
  if (!expiresAt) return null;
  const end = new Date(expiresAt).getTime();
  if (!Number.isFinite(end)) return null;

  const msLeft = end - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  const expired = msLeft <= 0;
  const urgent = !expired && daysLeft <= 5;
  const pct = Math.max(0, Math.min(100, (daysLeft / 30) * 100));

  const text = expired
    ? "Linkul analizei a expirat"
    : `Link valabil încă ${dayLabel(daysLeft)}`;

  return (
    <div
      className={`rounded-xl border p-3 ${
        expired || urgent ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"
      }`}
      role="status"
      aria-label={text}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarClock
            className={`h-4 w-4 ${expired || urgent ? "text-destructive" : "text-primary"}`}
            aria-hidden="true"
          />
          {text}
        </p>
        <p className="text-xs text-muted-foreground">
          Expiră la {new Date(expiresAt).toLocaleDateString("ro-RO")}
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${expired || urgent ? "bg-destructive" : "bg-primary"}`}
          style={{ width: `${expired ? 100 : pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {expired
          ? "Generează o analiză nouă, gratuit, pentru date actualizate."
          : "După expirare poți solicita o re-evaluare gratuită cu date actualizate de piață."}
      </p>
    </div>
  );
};

export default AnalysisExpiryCountdown;
