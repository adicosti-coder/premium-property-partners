import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Ban, Loader2, Plus, Trash2, Upload } from "lucide-react";
import RevealableField from "@/components/admin/shared/RevealableField";

type DncRow = {
  id: string;
  phone_normalized: string;
  reason: string | null;
  label: string;
  source: string;
  created_at: string;
};

const LABELS = [
  { value: "manual", label: "Manual" },
  { value: "refuz", label: "A refuzat" },
  { value: "agentie", label: "Agenție" },
  { value: "invalid", label: "Număr invalid" },
];

/** Normalizează un număr RO la format E.164 (+40…). */
export function normalizeRoPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  let n = digits.replace(/^\+/, "");
  if (n.startsWith("0040")) n = n.slice(4);
  else if (n.startsWith("40")) n = n.slice(2);
  else if (n.startsWith("0")) n = n.slice(1);
  if (!/^7\d{8}$/.test(n) && !/^[23]\d{8}$/.test(n)) return null;
  return `+40${n}`;
}

export function WhatsappDncList() {
  const [rows, setRows] = useState<DncRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [label, setLabel] = useState("manual");
  const [bulk, setBulk] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("wa_dnc_list")
      .select("id, phone_normalized, reason, label, source, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      toast({ title: "Eroare la încărcarea listei", description: error.message, variant: "destructive" });
    }
    setRows((data ?? []) as DncRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const insertNumbers = async (numbers: string[], src: string) => {
    const valid = [...new Set(numbers.map(normalizeRoPhone).filter(Boolean))] as string[];
    const skipped = numbers.length - valid.length;
    if (!valid.length) {
      toast({
        title: "Niciun număr valid",
        description: "Folosește format românesc (07xxxxxxxx sau +407xxxxxxxx).",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("wa_dnc_list").upsert(
      valid.map((p) => ({
        phone_normalized: p,
        reason: reason.trim() ? reason.trim().slice(0, 300) : null,
        label,
        source: src,
        added_by: userData?.user?.id ?? null,
      })),
      { onConflict: "phone_normalized" },
    );
    setBusy(false);
    if (error) {
      toast({ title: "Salvare eșuată", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: `${valid.length} numere adăugate în lista de excludere`,
      description: skipped ? `${skipped} intrări invalide au fost ignorate.` : undefined,
    });
    setPhone("");
    setBulk("");
    setReason("");
    await load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("wa_dnc_list").delete().eq("id", id);
    if (error) {
      toast({ title: "Ștergere eșuată", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Număr eliminat din listă" });
    await load();
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Ban className="h-4 w-4 text-destructive" />
          Listă excludere numere (Do Not Contact)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-muted-foreground">
          Worker-ul verifică această listă înainte de fiecare trimitere și blochează instant mesajul
          dacă numărul este prezent.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label htmlFor="dnc-phone" className="text-xs">Număr de telefon</Label>
            <Input
              id="dnc-phone"
              placeholder="07xxxxxxxx"
              value={phone}
              maxLength={20}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="dnc-label" className="text-xs">Motiv (etichetă)</Label>
            <Select value={label} onValueChange={setLabel}>
              <SelectTrigger id="dnc-label"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LABELS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dnc-reason" className="text-xs">Observații</Label>
            <Input
              id="dnc-reason"
              placeholder="ex: a cerut să nu fie contactat"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={busy || !phone.trim()}
              onClick={() => void insertNumbers([phone], "admin")}
            >
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Adaugă
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dnc-bulk" className="text-xs">Import în masă (un număr pe linie sau separate prin virgulă)</Label>
          <Textarea
            id="dnc-bulk"
            rows={3}
            placeholder={"0712345678\n0723456789"}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={busy || !bulk.trim()}
            onClick={() => void insertNumbers(bulk.split(/[\s,;]+/).filter(Boolean), "import")}
          >
            <Upload className="h-4 w-4 mr-2" /> Importă lista
          </Button>
        </div>

        <div className="rounded-md border border-border divide-y divide-border">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && !rows.length && (
            <p className="text-sm text-muted-foreground text-center py-6">
              Lista de excludere este goală.
            </p>
          )}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 text-sm">
              <RevealableField value={r.phone_normalized} type="phone" recordId={r.id} tableName="wa_dnc_list" />
              <Badge variant="outline">{LABELS.find((l) => l.value === r.label)?.label ?? r.label}</Badge>
              <span className="text-xs text-muted-foreground truncate flex-1">{r.reason ?? "—"}</span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                {new Date(r.created_at).toLocaleDateString("ro-RO")}
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Elimină numărul din lista de excludere`}
                onClick={() => void remove(r.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
