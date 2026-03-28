import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MoreHorizontal, Trash2, MessageSquare, CheckCircle, Phone, Eye, StickyNote } from "lucide-react";
import { downloadLeadAnalysisPdf } from "@/utils/exportLeadAnalysisPdf";

interface ScraperLeadActionsProps {
  leadId: string;
  currentStatus: string;
  leadData: {
    title: string;
    original_price: number;
    extra_profit_3y: number;
    monthly_extra: number;
    lead_score: number;
    url: string;
    status: string;
    created_at: string;
  };
  onRefresh: () => void;
  onViewDetails: () => void;
}

const statusOptions = [
  { value: "new", label: "Nou", icon: Eye },
  { value: "contacted", label: "Contactat", icon: Phone },
  { value: "converted", label: "Convertit", icon: CheckCircle },
  { value: "rejected", label: "Respins", icon: Trash2 },
];

export const ScraperLeadActions = ({ leadId, currentStatus, leadData, onRefresh, onViewDetails }: ScraperLeadActionsProps) => {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    const { error } = await supabase
      .from("scraper_leads")
      .update({ status: newStatus })
      .eq("id", leadId);
    if (error) {
      toast.error("Eroare la schimbarea statusului");
    } else {
      toast.success(`Status actualizat: ${newStatus}`);
      onRefresh();
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const { error } = await supabase.from("scraper_leads").delete().eq("id", leadId);
    setLoading(false);
    setDeleteConfirmOpen(false);
    if (error) {
      toast.error("Eroare la ștergere");
    } else {
      toast.success("Lead șters cu succes");
      onRefresh();
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    // Store note as a simple update to whatsapp_message or a dedicated approach
    // For now we append to a notes JSON approach - but since we don't have a notes column,
    // we'll use a lightweight approach: store in localStorage keyed by lead id
    const existing = JSON.parse(localStorage.getItem("scraper_lead_notes") || "{}");
    const notes = existing[leadId] || [];
    notes.push({ text: noteText.trim(), date: new Date().toISOString() });
    existing[leadId] = notes;
    localStorage.setItem("scraper_lead_notes", JSON.stringify(existing));
    setNoteText("");
    setNoteOpen(false);
    toast.success("Notă adăugată");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onViewDetails}>
            <Eye className="w-4 h-4 mr-2" /> Detalii
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {statusOptions
            .filter((s) => s.value !== currentStatus)
            .map((s) => (
              <DropdownMenuItem key={s.value} onClick={() => handleStatusChange(s.value)}>
                <s.icon className="w-4 h-4 mr-2" /> {s.label}
              </DropdownMenuItem>
            ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setNoteOpen(true)}>
            <StickyNote className="w-4 h-4 mr-2" /> Adaugă notă
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteConfirmOpen(true)}>
            <Trash2 className="w-4 h-4 mr-2" /> Șterge
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Confirmi ștergerea?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Această acțiune este ireversibilă.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Anulează</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Se șterge..." : "Șterge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Adaugă notă</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Ex: Am sunat, așteaptă ofertă..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteOpen(false)}>Anulează</Button>
            <Button onClick={handleAddNote} disabled={!noteText.trim()}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export const getLeadNotes = (leadId: string): { text: string; date: string }[] => {
  const existing = JSON.parse(localStorage.getItem("scraper_lead_notes") || "{}");
  return existing[leadId] || [];
};
