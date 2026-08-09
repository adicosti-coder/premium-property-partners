import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { maskPhone, maskEmail, maskIP } from "@/utils/security/maskPII";

export type RevealableKind = "phone" | "email" | "ip" | "text";

interface Props {
  value: string | null | undefined;
  kind: RevealableKind;
  /** Table name recorded in the audit log */
  tableName: string;
  /** Primary key / identifier of the record */
  recordId: string;
  /** Field label recorded in the audit log */
  field: string;
  /** Auto-mask again after this many ms (default 30_000). 0 disables. */
  autoMaskMs?: number;
  className?: string;
  /** Optional wrapper (link/button) — receives the revealed value */
  renderRevealed?: (value: string) => React.ReactNode;
}

const maskFor = (kind: RevealableKind, v: string | null | undefined) => {
  if (kind === "phone") return maskPhone(v);
  if (kind === "email") return maskEmail(v);
  if (kind === "ip") return maskIP(v);
  if (!v) return "—";
  return v.length <= 4 ? "•".repeat(v.length) : v.slice(0, 2) + "•".repeat(Math.min(8, v.length - 4)) + v.slice(-2);
};

export const RevealableField = ({
  value,
  kind,
  tableName,
  recordId,
  field,
  autoMaskMs = 30_000,
  className,
  renderRevealed,
}: Props) => {
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => () => clearTimer(), []);

  const onReveal = useCallback(async () => {
    if (!value || busy) return;
    setBusy(true);
    try {
      // Best-effort audit; do NOT block reveal on log failure.
      await supabase.rpc("log_pii_reveal" as any, {
        _table_name: tableName,
        _record_id: recordId,
        _field: field,
      });
    } catch (e) {
      console.warn("[RevealableField] audit log failed", e);
    } finally {
      setBusy(false);
      setRevealed(true);
      clearTimer();
      if (autoMaskMs > 0) {
        timer.current = window.setTimeout(() => setRevealed(false), autoMaskMs);
      }
    }
  }, [value, busy, tableName, recordId, field, autoMaskMs]);

  const hide = () => {
    clearTimer();
    setRevealed(false);
  };

  const display = revealed && value ? value : maskFor(kind, value);
  const content = revealed && value && renderRevealed ? renderRevealed(value) : <span>{display}</span>;

  return (
    <span className={cn("inline-flex items-center gap-1.5 font-mono text-[13px]", className)}>
      {content}
      {value && (
        <button
          type="button"
          onClick={revealed ? hide : onReveal}
          disabled={busy}
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          aria-label={revealed ? `Ascunde ${field}` : `Dezvăluie ${field} (înregistrat în audit)`}
          title={revealed ? "Ascunde" : "Dezvăluie (audit log)"}
        >
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      )}
    </span>
  );
};

export default RevealableField;
