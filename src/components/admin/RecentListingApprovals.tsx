import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Check, X, Loader2, Phone, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface InspectionRow {
  id: string; prospect_listing_id: string; clean_title: string | null;
  clean_description: string | null; price: number | null; neighborhood: string | null; status: string;
  prospect_listings: { title: string | null; category: string | null; contact_phone: string | null; phone_normalized: string | null } | null;
}
export default function RecentListingApprovals() {
  const [params] = useSearchParams();
  const [decision, setDecision] = useState<{ row: InspectionRow; action: "approve" | "reject" } | null>(null);
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "recent-inspection-approvals"], staleTime: 30000, refetchInterval: 60000,
    queryFn: async () => {
      const { data, error } = await supabase.from("listing_inspections")
        .select("id, prospect_listing_id, clean_title, clean_description, price, neighborhood, status, prospect_listings(title, category, contact_phone, phone_normalized)")
        .in("status", ["pending", "approved_waiting_consent", "approved"]).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return (data ?? []) as InspectionRow[];
    },
  });
  const apply = async () => {
    if (!decision || busy) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-review-inspection", { body: { inspection_id: decision.row.id, action: decision.action } });
      if (error || !data?.success) throw new Error(data?.error || "Decizia nu a putut fi procesată");
      toast.success(data.published ? "Anunț publicat pe realtrust.ro" : data.waiting_consent ? "Aprobat — publicarea așteaptă acordul proprietarului" : "Anunț respins");
      setDecision(null);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Acțiunea a eșuat"); }
    finally { setBusy(false); await client.invalidateQueries({ queryKey: ["admin", "recent-inspection-approvals"] }); }
  };
  const highlighted = params.get("inspection");
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (highlighted && q.data) sectionRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [highlighted, q.data]);
  const rows = [...(q.data ?? [])].sort((a, b) => Number(b.id === highlighted || b.prospect_listing_id === highlighted) - Number(a.id === highlighted || a.prospect_listing_id === highlighted));
  return <section ref={sectionRef} id="aprobari-recente" className="scroll-mt-24 space-y-3">
    <div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold">Aprobări și inspecții recente</h2><Badge variant="secondary">{rows.length}</Badge></div>
    {q.isLoading ? <p className="text-muted-foreground">Se încarcă…</p> : q.isError ? <div className="flex gap-2 items-center"><p className="text-destructive">Lista nu a putut fi încărcată.</p><Button variant="outline" onClick={() => q.refetch()}>Reîncearcă</Button></div> : !rows.length ? <p className="text-sm text-muted-foreground">Niciun anunț în așteptare.</p> : <ul className="divide-y divide-border">{rows.map(row => {
      const phone = row.prospect_listings?.phone_normalized || row.prospect_listings?.contact_phone;
      return <li key={row.id} className={`py-4 space-y-2 ${row.id === highlighted || row.prospect_listing_id === highlighted ? "bg-accent" : ""}`}>
        <div className="flex flex-wrap items-center gap-2"><h3 className="font-medium break-words">{row.clean_title || row.prospect_listings?.title || "Anunț"}</h3><Badge variant="outline">{row.status === "pending" ? "De verificat" : row.status === "approved" ? "Aprobat · de publicat" : "Așteaptă acordul"}</Badge></div>
        <p className="text-sm text-muted-foreground">{row.neighborhood || "—"} · {row.price ? `${row.price.toLocaleString("ro-RO")} €${row.prospect_listings?.category === "inchiriere" ? "/lună" : ""}` : "Preț lipsă"}{phone ? ` · ${phone}` : ""}</p>
        {row.clean_description && <details className="text-sm"><summary className="cursor-pointer min-h-12 flex items-center">Descriere verificată</summary><p className="whitespace-pre-wrap text-muted-foreground break-words">{row.clean_description}</p></details>}
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-12 gap-2" onClick={() => setDecision({ row, action: "approve" })} disabled={busy}><Check className="h-4 w-4"/>Aprobă și publică</Button>
          <Button variant="outline" className="min-h-12 gap-2" onClick={() => setDecision({ row, action: "reject" })} disabled={busy}><X className="h-4 w-4"/>Respinge</Button>
          {phone && <><Button asChild variant="ghost" size="icon" className="min-h-12 min-w-12"><a href={`tel:${phone}`} aria-label="Sună proprietarul"><Phone className="h-4 w-4"/></a></Button><Button asChild variant="ghost" className="min-h-12 gap-2"><a href={`/admin/whatsapp-chat?phone=${encodeURIComponent(phone)}`}><ExternalLink className="h-4 w-4"/>Conversație</a></Button></>}
        </div>
      </li>;
    })}</ul>}
    <AlertDialog open={!!decision} onOpenChange={open => { if (!open && !busy) setDecision(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{decision?.action === "approve" ? "Aprobi publicarea anunțului?" : "Respingi anunțul?"}</AlertDialogTitle><AlertDialogDescription>{decision?.row.clean_title || "Anunț"}. {decision?.action === "approve" ? "Publicarea se face numai dacă există acordul proprietarului; altfel rămâne în așteptarea acordului." : "Anunțul nu va fi publicat. Istoricul rămâne păstrat."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Înapoi</AlertDialogCancel><Button onClick={apply} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Confirmă</Button></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </section>;
}