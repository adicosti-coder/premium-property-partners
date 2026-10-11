import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Mode = "recheck" | "archive";
const TAG: Record<Mode, string> = { recheck: "necesită-verificare", archive: "arhivat" };

/** Acțiuni în masă pentru drafturile inactive mai vechi de 7 zile. */
export default function StaleDraftsActions({ count }: { count: number }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<Mode | null>(null);
  const [confirm, setConfirm] = useState(false);

  const run = async (mode: Mode) => {
    setBusy(mode);
    try {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await supabase.from("properties").select("id, features")
        .eq("is_active", false).lt("created_at", since).limit(500);
      if (error) throw error;
      const rows = (data ?? []).filter((r: any) => !((r.features as string[]) || []).includes("arhivat"));
      let done = 0;
      for (const r of rows as any[]) {
        const features = [...new Set([...((r.features as string[]) || []), TAG[mode]])];
        const { error: e } = await supabase.from("properties").update({ features }).eq("id", r.id);
        if (!e) done++;
      }
      toast({ title: mode === "archive" ? `${done} drafturi arhivate` : `${done} drafturi trimise la re-verificare` });
      await qc.invalidateQueries();
    } catch {
      toast({ title: "Acțiunea nu s-a putut finaliza", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 md:col-span-3">
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arhivezi {count} drafturi vechi?</AlertDialogTitle>
            <AlertDialogDescription>Drafturile inactive de peste 7 zile primesc eticheta „arhivat” și nu mai apar în contor. Nu se șterge nimic și nu se publică nimic.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-12">Renunță</AlertDialogCancel>
            <AlertDialogAction className="min-h-12" onClick={() => void run("archive")}>Da, arhivează</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Button variant="outline" className="min-h-12" disabled={!count || !!busy} onClick={() => void run("recheck")}>
        {busy === "recheck" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Re-verifică drafturile vechi
      </Button>
      <Button variant="outline" className="min-h-12" disabled={!count || !!busy} onClick={() => setConfirm(true)}>
        {busy === "archive" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Arhivează în masă ({count})
      </Button>
    </div>
  );
}
