import { useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { markAsAgency } from "@/lib/markAsAgency";

interface Props {
  /** Buton compact pentru bare de unelte. */
  size?: "sm" | "default";
  className?: string;
  onSaved?: () => void;
}

/**
 * Adaugă manual numere de telefon de agenție imobiliară în blocklist.
 * Acceptă mai multe numere, separate prin virgulă sau rând nou.
 */
export default function AddAgencyPhoneDialog({ size = "sm", className, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [raw, setRaw] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const numbers = Array.from(
      new Set(
        raw
          .split(/[\n,;]+/)
          .map((n) => n.trim())
          .filter((n) => n.replace(/\D/g, "").length >= 9),
      ),
    );
    if (numbers.length === 0) {
      toast.error("Scrie cel puțin un număr de telefon valid.");
      return;
    }
    setSaving(true);
    try {
      const results = await Promise.all(
        numbers.map((n) => markAsAgency({ rawPhone: n, contextLabel: "adăugat manual din Admin" })),
      );
      const okCount = results.filter((r) => r.ok).length;
      const failed = results.filter((r) => !r.ok);
      if (okCount > 0) {
        toast.success(
          `🏢 ${okCount} ${okCount === 1 ? "număr" : "numere"} marcate ca agenție și excluse din căutări.`,
        );
      }
      if (failed.length > 0) toast.error(failed[0].message);
      if (okCount > 0) {
        setRaw("");
        setOpen(false);
        onSaved?.();
      }
    } catch (err: any) {
      toast.error(err?.message || "Eroare la salvarea numerelor de agenție.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size={size} className={className}>
          <Building2 className="h-4 w-4 mr-2" />
          Adaugă telefon agenție
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Numere de agenție imobiliară</DialogTitle>
          <DialogDescription>
            Numerele adăugate aici nu mai apar în căutări și în „Anunțuri noi găsite”. Poți adăuga mai multe,
            separate prin virgulă sau rând nou.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          rows={5}
          placeholder={"0723 000 000\n+40 745 111 222"}
          aria-label="Numere de telefon de agenție"
        />
        <Button onClick={save} disabled={saving} className="w-full min-h-[44px]">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Building2 className="h-4 w-4 mr-2" />}
          Salvează ca agenție
        </Button>
      </DialogContent>
    </Dialog>
  );
}
