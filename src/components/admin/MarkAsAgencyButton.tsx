import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { markAsAgency, type MarkAsAgencyInput } from "@/lib/markAsAgency";
import { cn } from "@/lib/utils";

interface Props extends MarkAsAgencyInput {
  variant?: "icon" | "button" | "menu";
  size?: "sm" | "default" | "icon";
  className?: string;
  label?: string;
  /** Called immediately (optimistic) — use to hide the card from list state. */
  onMarked?: (result: { phone?: string | null; domain?: string | null }) => void;
  /** Called if the user clicks Undo within 5 seconds. */
  onUndo?: () => void;
  /** React-Query keys to invalidate after the destructive commit. */
  invalidateKeys?: Array<readonly unknown[] | string>;
  disabled?: boolean;
  /** Delay before the destructive action fires (ms). Default 5000. */
  undoDelayMs?: number;
}

/**
 * "Marchează Agenție" with a 5-second Undo window.
 * On click → optimistic UI hide + sonner toast with Undo.
 * If untouched after the delay → runs blocklist + archive + audit log.
 */
export function MarkAsAgencyButton({
  variant = "button",
  size = "sm",
  className,
  label,
  onMarked,
  onUndo,
  invalidateKeys,
  disabled,
  undoDelayMs = 5000,
  ...payload
}: Props) {
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const commit = async () => {
    if (cancelledRef.current) return;
    setPending(true);
    try {
      const res = await markAsAgency(payload);
      if (!res.ok) {
        toast.error(res.message);
        onUndo?.(); // restore UI if commit failed
        return;
      }
      const phoneLabel = res.blockedPhone || payload.rawPhone || "—";
      toast.success(`🏢 ${phoneLabel} marcat ca agenție și șters din index.`);
      invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? [...key] : [key] });
      });
    } catch (err: any) {
      toast.error(err?.message || "Eroare la marcarea ca agenție.");
      onUndo?.();
    } finally {
      setPending(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (pending || timerRef.current) return;

    cancelledRef.current = false;
    // Optimistic: hide immediately
    onMarked?.({ phone: payload.phone, domain: null });

    const phoneLabel = payload.phone || payload.rawPhone || "contact";
    const toastId = toast(`🏢 Marchez ca agenție: ${phoneLabel}`, {
      description: "Se șterge din index în 5 secunde. Apasă Undo pentru a anula.",
      duration: undoDelayMs,
      action: {
        label: "Undo",
        onClick: () => {
          cancelledRef.current = true;
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          toast.dismiss(toastId);
          toast.success("Anulat. Contactul rămâne în listă.");
          onUndo?.();
        },
      },
    });

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void commit();
    }, undoDelayMs);
  };

  if (variant === "icon") {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled || pending}
        onClick={handleClick}
        className={cn(
          "h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive",
          className,
        )}
        title="Marchează ca Agenție (blocklist + arhivă + audit)"
        aria-label="Marchează ca Agenție"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      disabled={disabled || pending}
      onClick={handleClick}
      className={cn(
        "gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      title="Marchează ca Agenție (blocklist + arhivă + audit · 5s Undo)"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
      <span>{label ?? "Marchează Agenție"}</span>
    </Button>
  );
}

export default MarkAsAgencyButton;
