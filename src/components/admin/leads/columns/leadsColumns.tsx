import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  CalendarClock,
  History,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { RevealableField } from "../../shared/RevealableField";
import { LeadScoreBadge } from "./LeadScoreBadge";
import LeadNotesDialog from "../../LeadNotesDialog";
import type { LeadRow } from "../hooks/useLeads";

export interface LeadRowLabels {
  perMonth: string;
  perYear: string;
  markAsRead: string;
  markAsUnread: string;
  deleteConfirm: string;
  deleteDescription: string;
  cancel: string;
  delete: string;
  activityHistory: string;
  language: "ro" | "en";
}

interface Props {
  lead: LeadRow;
  labels: LeadRowLabels;
  sourceBadge: React.ReactNode;
  isDeleting: boolean;
  isTogglingRead: boolean;
  onSelect: (lead: LeadRow) => void;
  onToggleRead: (lead: LeadRow) => void;
  onDelete: (id: string) => void;
  onFollowUpChange: (leadId: string, date: string | null) => void;
  onShowActivity: (leadId: string) => void;
}

export const LeadTableRow = ({
  lead,
  labels,
  sourceBadge,
  isDeleting,
  isTogglingRead,
  onSelect,
  onToggleRead,
  onDelete,
  onFollowUpChange,
  onShowActivity,

}: Props) => {
  const dateLocale = labels.language === "ro" ? ro : enUS;

  return (
    <TableRow
      className={cn("cursor-pointer", !lead.is_read ? "bg-primary/5 hover:bg-primary/10" : "")}
      onClick={() => onSelect(lead)}
    >
      <TableCell className="font-medium">
        <div className="flex items-center gap-2">
          {!lead.is_read && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
          <div>
            <div className="flex items-center gap-2">
              <p className={!lead.is_read ? "font-semibold" : ""}>{lead.name}</p>
              {lead.lead_score != null && <LeadScoreBadge lead={lead} />}
            </div>
            {lead.message && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MessageSquare className="w-3 h-3" />
                {lead.message.substring(0, 50)}...
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary">
            <Phone className="w-4 h-4 shrink-0" />
            <RevealableField
              value={lead.whatsapp_number}
              kind="phone"
              tableName="leads"
              recordId={lead.id}
              field="whatsapp_number"
              renderRevealed={(v) => (
                <a
                  href={`https://wa.me/${v.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  {v}
                </a>
              )}
            />
          </div>
          {lead.email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="w-3 h-3 shrink-0" />
              <RevealableField
                value={lead.email}
                kind="email"
                tableName="leads"
                recordId={lead.id}
                field="email"
                renderRevealed={(v) => (
                  <a href={`mailto:${v}`} className="hover:text-foreground">
                    {v}
                  </a>
                )}
              />
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-muted-foreground" />
          <div>
            <span className="font-medium capitalize">{lead.property_type}</span>
            <span className="text-muted-foreground ml-2">({lead.property_area} m²)</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {lead.simulation_data?.scor != null ? (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white ${
                  lead.simulation_data.scor >= 100
                    ? "bg-emerald-500"
                    : lead.simulation_data.scor >= 70
                    ? "bg-amber-500"
                    : "bg-red-500"
                }`}
              >
                {lead.simulation_data.scor}
              </div>
              <div className="text-xs">
                <p className="font-medium">/{lead.simulation_data.max_scor || 140}</p>
                <p className="text-muted-foreground">{lead.simulation_data.categorie || "—"}</p>
              </div>
            </div>
            {lead.simulation_data.zona && (
              <p className="text-[10px] text-muted-foreground">📍 {lead.simulation_data.zona}</p>
            )}
            {lead.simulation_data.roi_estimat && (
              <p className="text-[10px] font-medium text-emerald-600">
                ROI: {lead.simulation_data.roi_estimat}
              </p>
            )}
            {lead.simulation_data.tarif_noapte && (
              <p className="text-[10px] text-muted-foreground">
                {lead.simulation_data.tarif_noapte}€/noapte
              </p>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </TableCell>
      <TableCell>
        {lead.calculated_net_profit ? (
          <div>
            <span className="font-semibold text-primary">
              {lead.calculated_net_profit.toLocaleString()} €{labels.perMonth}
            </span>
            {lead.calculated_yearly_profit && (
              <p className="text-sm text-muted-foreground">
                {lead.calculated_yearly_profit.toLocaleString()} €{labels.perYear}
              </p>
            )}
          </div>
        ) : lead.simulation_data?.estimatedIncome ? (
          <div>
            <span className="font-semibold text-green-600">
              {lead.simulation_data.estimatedIncome.toLocaleString()} €{labels.perMonth}
            </span>
            <p className="text-xs text-muted-foreground">
              {lead.simulation_data.city} • {lead.simulation_data.roomType}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>{sourceBadge}</TableCell>
      <TableCell>
        <div className="space-y-1">
          <span className="text-muted-foreground">
            {format(new Date(lead.created_at), "d MMM yyyy, HH:mm", { locale: dateLocale })}
          </span>
          {lead.follow_up_date && (
            <div
              className={`flex items-center gap-1 text-xs ${
                new Date(lead.follow_up_date) < new Date() ? "text-destructive" : "text-primary"
              }`}
            >
              <CalendarClock className="w-3 h-3" />
              <span className="font-medium">
                Follow-up: {format(new Date(lead.follow_up_date), "d MMM, HH:mm", { locale: dateLocale })}
              </span>
            </div>
          )}
        </div>
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          {(() => {
            const cleaned = (lead.whatsapp_number || "").replace(/\D/g, "");
            const valid = cleaned.length >= 8 && lead.whatsapp_number !== "pending";
            if (!valid) return null;
            const greeting =
              labels.language === "ro"
                ? `Bună ziua, ${lead.name}! Vă contactez din partea RealTrust referitor la solicitarea dvs. pentru ${lead.property_type} (${lead.property_area} m²).`
                : `Hello ${lead.name}! I'm reaching out from RealTrust regarding your inquiry about ${lead.property_type} (${lead.property_area} m²).`;
            const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(greeting)}`;
            return (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:text-emerald-400"
                title={labels.language === "ro" ? "Contactează pe WhatsApp" : "Contact on WhatsApp"}
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline text-xs font-medium">WhatsApp</span>
                </a>
              </Button>
            );
          })()}
          {alertFailed && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onResendAlert(lead.id)}
              disabled={isResending}
              className="h-8 gap-1.5 border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
              title={labels.resendAlertHint}
              aria-label={labels.resendAlert}
            >
              {isResending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BellRing className="w-3.5 h-3.5" />
              )}
              <span className="hidden xl:inline text-xs font-medium">{labels.resendAlert}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onShowActivity(lead.id)}
            className="text-muted-foreground hover:text-foreground"
            title={labels.activityHistory}
            aria-label={labels.activityHistory}
          >
            <History className="w-4 h-4" />
          </Button>

          <LeadNotesDialog
            leadId={lead.id}
            leadName={lead.name}
            followUpDate={lead.follow_up_date}
            onFollowUpChange={(date) => onFollowUpChange(lead.id, date)}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleRead(lead)}
            className="text-muted-foreground hover:text-foreground"
            title={lead.is_read ? labels.markAsUnread : labels.markAsRead}
            aria-label={lead.is_read ? labels.markAsUnread : labels.markAsRead}
          >
            {isTogglingRead ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : lead.is_read ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                aria-label={labels.deleteConfirm}
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{labels.deleteConfirm}</AlertDialogTitle>
                <AlertDialogDescription>{labels.deleteDescription}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{labels.cancel}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(lead.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {labels.delete}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
};

export const sourceBadgeFor = (
  source: string | null,
  language: "ro" | "en",
  sourceLabels: Record<string, { ro: string; en: string; color: string }>,
) => {
  const src = source || "calculator";
  const label = sourceLabels[src]?.[language] || src;
  const colorClass = sourceLabels[src]?.color || "bg-gray-500";
  return (
    <Badge variant="secondary" className={`${colorClass} text-white`}>
      {label}
    </Badge>
  );
};
