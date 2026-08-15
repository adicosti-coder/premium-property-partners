import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Mail,
  RefreshCw,
  Sparkles,
  Webhook,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LeadEventRow {
  id: string;
  event_type: string;
  status: string;
  message: string | null;
  duration_ms: number | null;
  attempt: number | null;
  actor: string | null;
  metadata: unknown;
  created_at: string;
}

const EVENT_META: Record<string, { label: string; icon: LucideIcon }> = {
  lead_created: { label: "Lead creat", icon: Sparkles },
  crm_sync: { label: "Sincronizare CRM", icon: Webhook },
  crm_retry: { label: "Reîncercare sincronizare CRM", icon: RefreshCw },
  crm_webhook: { label: "Webhook CRM", icon: Webhook },
  crm_webhook_retry: { label: "Retry webhook CRM", icon: RefreshCw },
  team_email: { label: "Email alertă echipă", icon: Mail },
  owner_email: { label: "Email raport către proprietar", icon: Mail },
  pdf_generated: { label: "Raport PDF generat", icon: FileText },
  pdf_stored: { label: "Raport PDF salvat", icon: FileText },
  report_viewed: { label: "Raport vizualizat", icon: Eye },
};

const STATUS_TONE: Record<string, { dot: string; badge: string; icon: LucideIcon }> = {
  success: {
    dot: "bg-primary",
    badge: "bg-primary/10 text-primary border-primary/30",
    icon: CheckCircle2,
  },
  error: {
    dot: "bg-destructive",
    badge: "bg-destructive/10 text-destructive border-destructive/30",
    icon: XCircle,
  },
  warning: {
    dot: "bg-accent",
    badge: "bg-accent/10 text-accent-foreground border-accent/30",
    icon: AlertTriangle,
  },
  info: {
    dot: "bg-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
    icon: Clock,
  },
};

const fmtTime = (value: string) =>
  format(new Date(value), "d MMM yyyy, HH:mm:ss", { locale: ro });

const fmtDuration = (ms: number | null) => {
  if (ms == null) return null;
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`;
};

interface Props {
  leadId: string | null;
  enabled?: boolean;
  limit?: number;
}

const LeadEventTimeline = ({ leadId, enabled = true, limit = 100 }: Props) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-lead-events", leadId, limit],
    enabled: enabled && !!leadId,
    queryFn: async (): Promise<LeadEventRow[]> => {
      const { data, error } = await supabase
        .from("lead_events")
        .select("id, event_type, status, message, duration_ms, attempt, actor, metadata, created_at")
        .eq("lead_id", leadId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as LeadEventRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" aria-hidden="true" />
        Nu am putut încărca istoricul de automatizări.
      </p>
    );
  }

  const events = data ?? [];

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nicio automatizare înregistrată încă pentru acest lead.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-border pl-4 space-y-4">
      {events.map((ev) => {
        const meta = EVENT_META[ev.event_type] ?? { label: ev.event_type, icon: Clock };
        const tone = STATUS_TONE[ev.status] ?? STATUS_TONE.info;
        const Icon = meta.icon;
        const duration = fmtDuration(ev.duration_ms);
        return (
          <li key={ev.id} className="relative">
            <span
              className={cn(
                "absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full",
                tone.dot,
              )}
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-medium">{meta.label}</span>
              <Badge variant="outline" className={cn("text-[10px] capitalize", tone.badge)}>
                {ev.status}
              </Badge>
              {duration && (
                <Badge variant="secondary" className="text-[10px] font-mono">
                  {duration}
                </Badge>
              )}
              {ev.attempt != null && ev.attempt > 1 && (
                <Badge variant="secondary" className="text-[10px]">
                  încercarea {ev.attempt}
                </Badge>
              )}
            </div>
            {ev.message && (
              <p className="text-xs text-foreground/80 mt-1 break-words">{ev.message}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">
              {fmtTime(ev.created_at)}
              {ev.actor ? ` · ${ev.actor}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
};

export default LeadEventTimeline;
