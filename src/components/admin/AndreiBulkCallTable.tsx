/**
 * Trimitere în masă către Andrei (apeluri AI) din „Flux proprietari”.
 * Doar proprietari privați confirmați, mobil 07…, status nou/revenire.
 * Apelurile pleacă pe rând, L–S 09:00–20:00.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { andreiIneligibleReason, andreiScenario, toRoE164 } from "@/lib/andreiBulkQueue";

interface Row {
  id: string;
  title: string | null;
  zone: string | null;
  rooms: number | null;
  price: number | null;
  currency: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  phone_normalized: string | null;
  source_platform: string | null;
  lifecycle_status: string | null;
  seller_type: string | null;
  category: string | null;
  tags: string[] | null;
  andrei_queued_at: string | null;
  andrei_call_after: string | null;
}

const QK = ["andrei-bulk-queue-rows"];
const fmtDate = (v: string) => new Date(v).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function AndreiBulkCallTable() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [schedule, setSchedule] = useState<"now" | "10:00">("now");
  const [sending, setSending] = useState(false);

  const { data: rows = [], isLoading, error } = useQuery({
    queryKey: QK,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("prospect_listings")
        .select("id,title,zone,rooms,price,currency,contact_name,contact_phone,phone_normalized,source_platform,lifecycle_status,seller_type,category,tags,andrei_queued_at,andrei_call_after")
        .eq("is_active", true).eq("seller_type", "privat").eq("do_not_call", false)
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const eligibleIds = useMemo(() => rows.filter((r) => !andreiIneligibleReason(r)).map((r) => r.id), [rows]);
  const chosen = rows.filter((r) => selected.has(r.id) && !andreiIneligibleReason(r));
  const allChecked = eligibleIds.length > 0 && eligibleIds.every((id) => selected.has(id));
  const someChecked = eligibleIds.some((id) => selected.has(id));

  const toggle = (id: string, on: boolean) => setSelected((prev) => { const n = new Set(prev); if (on) n.add(id); else n.delete(id); return n; });
  const toggleAll = (on: boolean) => setSelected(on ? new Set(eligibleIds) : new Set());

  const scenarios = [...new Set(chosen.map((r) => andreiScenario(r.category)))];

  const confirm = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("andrei-bulk-queue", {
        body: { prospect_ids: chosen.map((r) => r.id), schedule, scenario: scenarios.join(" / ") },
      });
      if (error) {
        const ctx = (error as { context?: Response }).context;
        const details = ctx ? await ctx.text().catch(() => "") : "";
        throw new Error(details || error.message);
      }
      const skipped = (data?.skipped ?? []).length;
      toast.success(`${data?.queued ?? 0} proprietari trimiși la Andrei`, {
        description: `Apelurile pornesc ${schedule === "now" ? "acum, pe rând" : `la ${fmtDate(data.call_after)}`}${skipped ? ` · ${skipped} săriți (deja trimiși sau neeligibili)` : ""}.`,
      });
      setOpen(false);
      setSelected(new Set());
      await qc.invalidateQueries({ queryKey: QK });
    } catch (e) {
      toast.error("Trimiterea către Andrei a eșuat", { description: (e as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Apeluri Andrei (AI)</CardTitle>
          <CardDescription>Proprietari privați confirmați. Andrei sună pe rând, luni–sâmbătă 09:00–20:00.</CardDescription>
        </div>
        <Button onClick={() => setOpen(true)} disabled={chosen.length === 0} className="min-h-[48px] gap-2">
          <PhoneCall className="h-4 w-4" />
          {chosen.length ? `Trimite ${chosen.length} proprietari către Andrei` : "Trimite către Andrei (AI Voice Call)"}
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă anunțurile…</div>
        ) : error ? (
          <p className="py-6 text-sm text-destructive">Nu am putut încărca anunțurile: {(error as Error).message}</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-sm text-muted-foreground">Nu există proprietari privați confirmați.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox aria-label="Selectează toate anunțurile eligibile" disabled={!eligibleIds.length}
                    checked={allChecked ? true : someChecked ? "indeterminate" : false}
                    onCheckedChange={(v) => toggleAll(v === true)} />
                </TableHead>
                <TableHead>Anunț</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Scenariu</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const reason = andreiIneligibleReason(r);
                return (
                  <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox aria-label={`Selectează ${r.title ?? "anunțul"}`} disabled={!!reason}
                        checked={selected.has(r.id) && !reason} onCheckedChange={(v) => toggle(r.id, v === true)} />
                    </TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="truncate font-medium">{r.title ?? "Fără titlu"}</div>
                      <div className="text-xs text-muted-foreground">{[r.source_platform, r.zone, r.rooms ? `${r.rooms} cam.` : null, r.price ? `${Math.round(r.price).toLocaleString("ro-RO")} ${(r.currency || "EUR").toUpperCase() === "RON" ? "lei" : "€"}` : null].filter(Boolean).join(" · ")}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{r.phone_normalized || r.contact_phone || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{andreiScenario(r.category).replace("Scenariu ", "")}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {reason === "Trimis la Andrei" ? (
                        <Badge variant="secondary">{r.andrei_call_after ? `Trimis la Andrei · ${fmtDate(r.andrei_call_after)}` : r.lifecycle_status === "calling" ? "În curs de apelare" : "Trimis la Andrei"}</Badge>
                      ) : reason ? <Badge variant="outline">{reason}</Badge> : <Badge>Validat / Neprocesat</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => !sending && setOpen(v)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Trimiți {chosen.length} proprietari către Andrei?</DialogTitle>
            <DialogDescription>{scenarios.join(" / ") || "—"}. Fiecare număr e sunat o singură dată, pe rând.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2 text-sm">
            {chosen.map((r) => (
              <li key={r.id} className="flex justify-between gap-3">
                <span className="truncate">{r.contact_name || r.title || "Proprietar"}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{toRoE164(r.phone_normalized || r.contact_phone)}</span>
              </li>
            ))}
          </ul>
          <RadioGroup value={schedule} onValueChange={(v) => setSchedule(v as "now" | "10:00")} className="gap-3">
            <div className="flex items-center gap-2"><RadioGroupItem value="now" id="andrei-now" /><Label htmlFor="andrei-now">Apelează acum (dacă e în afara orarului, pornește la 09:00)</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem value="10:00" id="andrei-10" /><Label htmlFor="andrei-10">Programează apelurile la ora 10:00 (următoarea zi lucrătoare L–S)</Label></div>
          </RadioGroup>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending} className="min-h-[48px]">Renunță</Button>
            <Button onClick={confirm} disabled={sending || chosen.length === 0} className="min-h-[48px] gap-2">
              {sending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmă trimiterea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
