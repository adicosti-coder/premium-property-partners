import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";

export type EditableQueueItem = {
  id: string;
  template_name: string;
  template_language: string;
  template_params: unknown;
  status: string;
};

export function WhatsappQueueEditDialog({
  item,
  onClose,
  onSaved,
}: {
  item: EditableQueueItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [params, setParams] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setParams(Array.isArray(item.template_params) ? (item.template_params as string[]).map(String) : []);
  }, [item]);

  const save = async () => {
    if (!item) return;
    setSaving(true);
    const { error } = await supabase
      .from("wa_outbound_queue")
      .update({ template_params: params })
      .eq("id", item.id)
      .eq("status", "pending");
    setSaving(false);
    if (error) {
      toast({ title: "Salvare eșuată", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Mesaj actualizat", description: "Variabilele șablonului au fost salvate." });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editare mesaj</DialogTitle>
          <DialogDescription>
            Ajustează variabilele șablonului <strong>{item?.template_name}</strong> ({item?.template_language})
            înainte de expediere. Doar mesajele în așteptare pot fi editate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {params.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Șablonul nu are variabile setate. Adaugă una dacă e nevoie.
            </p>
          )}
          {params.map((p, i) => (
            <div key={i} className="space-y-1">
              <Label htmlFor={`param-${i}`} className="text-xs">{`Variabila {{${i + 1}}}`}</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`param-${i}`}
                  value={p}
                  maxLength={300}
                  onChange={(e) =>
                    setParams((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Șterge variabila ${i + 1}`}
                  onClick={() => setParams((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setParams((p) => [...p, ""])}>
            <Plus className="h-4 w-4 mr-1" /> Adaugă variabilă
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Anulează</Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvează
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
