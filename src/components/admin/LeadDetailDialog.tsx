import { motion } from "framer-motion";
import { TrendingUp, MapPin, CheckCircle2, Phone, Mail, Building2, Calendar, Euro, User, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface SimulationData {
  adr?: number;
  occupancy?: number;
  cleaningCost?: number;
  managementFee?: number;
  platformFee?: number;
  avgStayDuration?: number;
  city?: string;
  roomType?: string;
  location?: string;
  estimatedIncome?: number;
  scor?: number;
  max_scor?: number;
  zona?: string;
  roi_estimat?: string;
  tarif_noapte?: number;
  note_consultant?: string;
  recomandari?: string[];
  categorie?: string;
}

interface Lead {
  id: string;
  name: string;
  whatsapp_number: string;
  property_area: number;
  property_type: string;
  calculated_net_profit: number | null;
  calculated_yearly_profit: number | null;
  simulation_data: SimulationData | null;
  created_at: string;
  source: string | null;
  email: string | null;
  message: string | null;
  is_read: boolean;
  follow_up_date: string | null;
}

interface Props {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LeadDetailDialog = ({ lead, open, onOpenChange }: Props) => {
  if (!lead) return null;

  const sim = lead.simulation_data;
  const hasHostScan = sim?.scor != null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {lead.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Contact & Property Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact</h4>
              <a
                href={`https://wa.me/${lead.whatsapp_number.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Phone className="w-4 h-4" /> {lead.whatsapp_number}
              </a>
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <Mail className="w-4 h-4" /> {lead.email}
                </a>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {format(new Date(lead.created_at), "d MMM yyyy, HH:mm", { locale: ro })}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Proprietate</h4>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="capitalize">{lead.property_type}</span>
                <span className="text-muted-foreground">• {lead.property_area} m²</span>
              </div>
              {lead.calculated_net_profit && (
                <div className="flex items-center gap-2 text-sm">
                  <Euro className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-primary">{lead.calculated_net_profit.toLocaleString()} €/lună</span>
                </div>
              )}
              {lead.calculated_yearly_profit && (
                <p className="text-xs text-muted-foreground ml-6">
                  {lead.calculated_yearly_profit.toLocaleString()} €/an
                </p>
              )}
              <Badge variant="secondary">{lead.source || "calculator"}</Badge>
            </div>
          </div>

          {/* Message */}
          {lead.message && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase">Mesaj</span>
              </div>
              <p className="text-sm">{lead.message}</p>
            </div>
          )}

          {/* HostScan Report */}
          {hasHostScan && sim && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-card to-accent/5 border border-primary/30 shadow-lg space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary">
                    Raport HostScan AI
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-bold text-foreground">{sim.scor}</span>
                  <span className="text-sm text-muted-foreground">/{sim.max_scor || 140}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${((sim.scor ?? 0) / (sim.max_scor || 140)) * 100}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    (sim.scor ?? 0) >= 100 ? "bg-accent" : (sim.scor ?? 0) >= 70 ? "bg-primary" : "bg-destructive"
                  )}
                />
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-background/50 rounded-xl p-3 border border-border/30">
                  <MapPin className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xs text-muted-foreground">Zonă</p>
                  <p className="text-sm font-bold text-foreground">{sim.zona || "—"}</p>
                </div>
                <div className="bg-background/50 rounded-xl p-3 border border-border/30">
                  <TrendingUp className="w-4 h-4 mx-auto text-accent mb-1" />
                  <p className="text-xs text-muted-foreground">ROI</p>
                  <p className="text-sm font-bold text-foreground">{sim.roi_estimat || "—"}</p>
                </div>
                <div className="bg-background/50 rounded-xl p-3 border border-border/30">
                  <Euro className="w-4 h-4 mx-auto text-primary mb-1" />
                  <p className="text-xs text-muted-foreground">Tarif/noapte</p>
                  <p className="text-sm font-bold text-foreground">{sim.tarif_noapte ? `${sim.tarif_noapte}€` : "—"}</p>
                </div>
              </div>

              {/* Category badge */}
              {sim.categorie && (
                <div className="flex justify-center">
                  <Badge variant="outline" className={cn(
                    "text-xs px-3 py-1",
                    sim.categorie === "Premium" && "border-accent text-accent",
                    sim.categorie === "Standard" && "border-primary text-primary",
                  )}>
                    {sim.categorie}
                  </Badge>
                </div>
              )}

              {/* Consultant note */}
              {sim.note_consultant && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                  "{sim.note_consultant}"
                </p>
              )}

              {/* Recommendations */}
              {sim.recomandari && sim.recomandari.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recomandări</p>
                  {sim.recomandari.map((rec, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-foreground/80">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent shrink-0" /> {rec}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Simulation data (non-HostScan) */}
          {!hasHostScan && sim && (sim.adr || sim.estimatedIncome) && (
            <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Date Simulare</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {sim.city && (
                  <div><span className="text-muted-foreground">Oraș:</span> <span className="font-medium">{sim.city}</span></div>
                )}
                {sim.adr && (
                  <div><span className="text-muted-foreground">ADR:</span> <span className="font-medium">{sim.adr}€</span></div>
                )}
                {sim.occupancy && (
                  <div><span className="text-muted-foreground">Ocupare:</span> <span className="font-medium">{sim.occupancy}%</span></div>
                )}
                {sim.estimatedIncome && (
                  <div><span className="text-muted-foreground">Venit estimat:</span> <span className="font-medium text-primary">{sim.estimatedIncome.toLocaleString()}€/lună</span></div>
                )}
                {sim.cleaningCost && (
                  <div><span className="text-muted-foreground">Cost curățenie:</span> <span className="font-medium">{sim.cleaningCost}€</span></div>
                )}
                {sim.managementFee && (
                  <div><span className="text-muted-foreground">Fee management:</span> <span className="font-medium">{sim.managementFee}%</span></div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailDialog;
