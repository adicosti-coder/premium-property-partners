import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  title?: string | null;
  reason?: "expired" | "manual";
  contextLabel?: string;
  variant?: "icon" | "button";
  size?: "sm" | "default" | "icon";
  className?: string;
  label?: string;
  disabled?: boolean;
  undoDelayMs?: number;
  /** Optimistic hide. */
  onDismissed?: () => void;
  /** Restore UI if commit failed or undo clicked. */
  onUndo?: () => void;
  /** React-Query keys to invalidate after destructive commit. */
  invalidateKeys?: Array<readonly unknown[] | string>;
}

/**
 * "Renunță (expirat)" — sets is_active=false, lifecycle_status='expired',
 * appends an admin_notes line and logs to admin_audit_log.
 * Uses a 5-second sonner Undo toast (works in iframe; no window.confirm).
 */
export function DismissExpiredButton({
  id,
  title,
  reason = "expired",
  contextLabel,
  variant = "button",
  size = "sm",
  className,
  label,
  disabled,
  undoDelayMs = 5000,
  onDismissed,
  onUndo,
  invalidateKeys,
}: Props) {
  const [pending, setPending] = useState(false);
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const commit = async () => {
    if (cancelledRef.current) return;
    setPending(true);
    try {
      const noteLine = `[${new Date().toISOString().slice(0, 16).replace("T", " ")}] dismissed (${reason})${contextLabel ? ` · ${contextLabel}` : ""}`;
      const { data: existing } = await supabase
        .from("prospect_listings")
        .select("admin_notes")
        .eq("id", id)
        .maybeSingle();
      const newNotes = existing?.admin_notes ? `${existing.admin_notes}\n${noteLine}` : noteLine;

      const { error } = await supabase
        .from("prospect_listings")
        .update({
          is_active: false,
          lifecycle_status: reason === "expired" ? "expired" : "rejected",
          admin_notes: newNotes,
        } as any)
        .eq("id", id);

      if (error) {
        toast.error(`Eroare: ${error.message}`);
        onUndo?.();
        return;
      }

      // Audit log (best-effort)
      try {
        await supabase.from("admin_audit_log").insert({
          action: reason === "expired" ? "prospect_dismissed_expired" : "prospect_dismissed_manual",
          entity_id: id,
          details: { title, context: contextLabel ?? null },
        } as any);
      } catch { /* ignore */ }

      toast.success(`🗑️ Renunțat (${reason === "expired" ? "expirat" : "manual"}).`);
      invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? [...key] : [key] });
      });
    } catch (err: any) {
      toast.error(err?.message || "Eroare la renunțare.");
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
    onDismissed?.();

    const toastId = toast(`🗑️ Renunț la „${(title || "anunț").slice(0, 60)}”`, {
      description: `Marcat ${reason === "expired" ? "expirat" : "manual"} în 5 secunde. Apasă Undo pentru a anula.`,
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
          toast.success("Anulat. Anunțul rămâne în listă.");
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
        title="Renunță (expirat)"
        aria-label="Renunță (expirat)"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant="ghost"
      disabled={disabled || pending}
      onClick={handleClick}
      className={cn(
        "gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      title="Renunță la anunț (expirat / nu mai e valabil) · 5s Undo"
    >
      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      <span>{label ?? "Renunță (expirat)"}</span>
    </Button>
  );
}

export default DismissExpiredButton;
