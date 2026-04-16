import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, CheckCircle, Phone, Download, X } from "lucide-react";

interface ScraperBulkActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onRefresh: () => void;
  allLeads: Array<{ id: string; title: string; original_price: number; extra_profit_3y: number; monthly_extra: number; lead_score: number; url: string; status: string; created_at: string }>;
}

export const ScraperBulkActions = ({ selectedIds, onClearSelection, onRefresh, allLeads }: ScraperBulkActionsProps) => {
  const handleBulkStatus = async (status: string) => {
    const { error } = await supabase
      .from("scraper_leads_archive_2026" as any)
      .update({ status })
      .in("id", selectedIds);
    if (error) {
      toast.error("Eroare la actualizare");
    } else {
      toast.success(`${selectedIds.length} lead-uri actualizate → ${status}`);
      onClearSelection();
      onRefresh();
    }
  };

  const handleBulkDelete = async () => {
    const { error } = await supabase
      .from("scraper_leads_archive_2026" as any)
      .delete()
      .in("id", selectedIds);
    if (error) {
      toast.error("Eroare la ștergere");
    } else {
      toast.success(`${selectedIds.length} lead-uri șterse`);
      onClearSelection();
      onRefresh();
    }
  };

  const handleExportCSV = () => {
    const toExport = selectedIds.length > 0
      ? allLeads.filter((l) => selectedIds.includes(l.id))
      : allLeads;

    const headers = ["Titlu", "Preț", "Profit 3Y", "Extra/lună", "Scor", "Status", "URL", "Data"];
    const rows = toExport.map((l) => [
      `"${l.title}"`,
      l.original_price,
      l.extra_profit_3y,
      l.monthly_extra,
      l.lead_score,
      l.status,
      l.url,
      l.created_at?.slice(0, 10),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scraper-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Export CSV: ${toExport.length} lead-uri`);
  };

  if (selectedIds.length === 0) {
    return (
      <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
        <Download className="w-4 h-4" /> Export CSV
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant="secondary" className="gap-1">
        {selectedIds.length} selectate
        <button onClick={onClearSelection} className="ml-1 hover:text-foreground">
          <X className="w-3 h-3" />
        </button>
      </Badge>
      <Button variant="outline" size="sm" onClick={() => handleBulkStatus("contacted")} className="gap-1.5">
        <Phone className="w-3.5 h-3.5" /> Contactat
      </Button>
      <Button variant="outline" size="sm" onClick={() => handleBulkStatus("converted")} className="gap-1.5">
        <CheckCircle className="w-3.5 h-3.5" /> Convertit
      </Button>
      <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-1.5">
        <Trash2 className="w-3.5 h-3.5" /> Șterge
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
        <Download className="w-4 h-4" /> CSV
      </Button>
    </div>
  );
};
