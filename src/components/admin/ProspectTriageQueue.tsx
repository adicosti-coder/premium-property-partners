import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { MarkAsAgencyButton } from "@/components/admin/MarkAsAgencyButton";

interface TriageRow {
  id: string;
  title: string | null;
  source_url: string | null;
  source_platform: string | null;
  zone: string | null;
  location: string | null;
  price: number | null;
  contact_phone: string | null;
  phone_normalized: string | null;
  prospect_type: string | null;
  lifecycle_status: string | null;
  rejection_reason: string | null;
  score: number | null;
  scraped_at: string | null;
  created_at: string;
}

const AMBIGUOUS_TYPES = ["generic_search", "sale", "rent", "vanzare"];

export default function ProspectTriageQueue() {
  const [rows, setRows] = useState<TriageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Ambiguous = not yet confirmed as owner OR explicitly flagged for review
      const { data, error } = await supabase
        .from("prospect_listings")
        .select("id,title,source_url,source_platform,zone,location,price,contact_phone,phone_normalized,prospect_type,lifecycle_status,rejection_reason,score,scraped_at,created_at")
        .eq("is_active", true)
        .or(`prospect_type.in.(${AMBIGUOUS_TYPES.join(",")}),prospect_type.is.null,lifecycle_status.eq.pending_review`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setRows((data || []) as TriageRow[]);
    } catch (e: any) {
      toast({ title: "Eroare", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const approve = async (row: TriageRow) => {
    setActingId(row.id);
    try {
      const { error } = await supabase
        .from("prospect_listings")
        .update({
          prospect_type: "proprietar",
          lifecycle_status: "new",
          rejection_reason: null,
          is_active: true,
        })
        .eq("id", row.id);
      if (error) throw error;
      toast({ title: "Aprobat pentru Andrei", description: row.title?.slice(0, 60) ?? row.id });
      setRows(prev => prev.filter(r => r.id !== row.id));
    } catch (e: any) {
      toast({ title: "Eroare aprobare", description: e.message, variant: "destructive" });
    } finally {
      setActingId(null);
    }
  };

  return (
    <Card className="border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Carantină prospecți ambigui
            <Badge variant="outline" className="ml-1">{rows.length}</Badge>
          </CardTitle>
          <CardDescription>
            Lead-uri ne-clasificate ca proprietar — nu au trecut filtrul <code className="text-xs">explicitOwnerSignal</code> sau așteaptă revizuire. Aprobă-i pentru a-i face vizibili pentru Andrei.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {loading && rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Se încarcă…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            ✨ Coadă goală — niciun prospect ambiguu de revizuit.
          </div>
        ) : (
          <ScrollArea className="h-[480px] pr-3">
            <div className="space-y-2">
              {rows.map(row => (
                <div key={row.id} className="border rounded-lg p-3 bg-card hover:bg-accent/30 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="secondary" className="text-[10px]">{row.source_platform || "—"}</Badge>
                        {row.prospect_type && (
                          <Badge variant="outline" className="text-[10px]">{row.prospect_type}</Badge>
                        )}
                        {row.rejection_reason && (
                          <Badge variant="destructive" className="text-[10px]">{row.rejection_reason}</Badge>
                        )}
                        {row.zone && <span className="text-xs text-muted-foreground">📍 {row.zone}</span>}
                        {row.price && <span className="text-xs font-medium">€{row.price.toLocaleString()}</span>}
                      </div>
                      <div className="text-sm font-medium line-clamp-2">{row.title || "(fără titlu)"}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {row.contact_phone && <span>📞 {row.contact_phone}</span>}
                        {row.source_url && (
                          <a
                            href={row.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-primary underline truncate max-w-[200px]"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" /> sursa
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => approve(row)}
                        disabled={actingId === row.id}
                      >
                        {actingId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        Aprobă pentru Andrei
                      </Button>
                      <MarkAsAgencyButton
                        id={row.id}
                        source="prospect_listings"
                        rawPhone={row.contact_phone}
                        phone={row.phone_normalized}
                        url={row.source_url}
                        contextLabel={`Triage · ${row.title?.slice(0, 60) || row.id}`}
                        onMarked={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
