import { useState } from "react";
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
  /** Called after a successful mark — use to remove the item from local list state. */
  onMarked?: (result: { phone?: string | null; domain?: string | null }) => void;
  /** React-Query keys to invalidate after success. */
  invalidateKeys?: Array<readonly unknown[] | string>;
  disabled?: boolean;
}

/**
 * Reusable "Marchează Agenție" action.
 * Adds the phone + domain to the blocklist and archives the row across all prospect sources.
 */
export function MarkAsAgencyButton({
  variant = "button",
  size = "sm",
  className,
  label,
  onMarked,
  invalidateKeys,
  disabled,
  ...payload
}: Props) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await markAsAgency(payload);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      const phoneLabel = res.blockedPhone || payload.rawPhone || "—";
      toast.success(`Numărul ${phoneLabel} a fost marcat ca agenție și adăugat în blocklist.`);
      onMarked?.({ phone: res.blockedPhone, domain: res.blockedDomain });
      invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? [...key] : [key] });
      });
    } catch (err: any) {
      toast.error(err?.message || "Eroare la marcarea ca agenție.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled || loading}
        onClick={handleClick}
        className={cn(
          "h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive",
          className,
        )}
        title="Marchează ca Agenție (blocklist + arhivă)"
        aria-label="Marchează ca Agenție"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant="outline"
      disabled={disabled || loading}
      onClick={handleClick}
      className={cn(
        "gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive",
        className,
      )}
      title="Marchează ca Agenție (blocklist + arhivă)"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Building2 className="h-3.5 w-3.5" />}
      <span>{label ?? "Marchează Agenție"}</span>
    </Button>
  );
}

export default MarkAsAgencyButton;
