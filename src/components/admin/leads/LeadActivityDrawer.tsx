import { useQuery } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabaseClient";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  MessageCircle,
  Repeat2,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import LeadEventTimeline from "./LeadEventTimeline";

interface ActivityEntry {
  at?: string;
  event?: string;
  source?: string | null;
  campaign?: string | null;
  score?: number | null;
  grade?: string | null;
  [key: string]: unknown;
}

interface Props {
  leadId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const gradeTone: Record<string, string> = {
  hot: "bg-destructive/10 text-destructive border-destructive/30",
  warm: "bg-primary/10 text-primary border-primary/30",
  cool: "bg-muted text-muted-foreground border-border",
  cold: "bg-muted text-muted-foreground border-border",
};

const fmt = (value?: string | null) =>
  value ? format(new Date(value), "d MMM yyyy, HH:mm", { locale: ro }) : "—";

const LeadActivityDrawer = ({ leadId, open, onOpenChange }: Props) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-lead-activity", leadId],
    enabled: open && !!leadId,
    queryFn: async () => {
      const [leadRes, logsRes] = await Promise.all([
        supabase
          .from("leads")
          .select(
            "id, name, source, lead_score, lead_grade, touch_count, engagement_status, activity_history, created_at, updated_at, last_touch_at",
          )
          .eq("id", leadId!)
          .maybeSingle(),
        supabase
          .from("communication_logs")
          .select("id, channel, direction, status, outcome, created_at, to_number, metadata, source")
          .eq("lead_id", leadId!)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (leadRes.error) throw leadRes.error;
      if (logsRes.error) throw logsRes.error;

      return { lead: leadRes.data, logs: logsRes.data ?? [] };
    },
  });

  const lead = data?.lead as
    | {
        name: string;
        source: string | null;
        lead_score: number | null;
        lead_grade: string | null;
        touch_count: number | null;
        engagement_status: string | null;
        activity_history: unknown;
        created_at: string;
        updated_at?: string | null;
        last_touch_at?: string | null;
      }
    | null
    | undefined;

  const history: ActivityEntry[] = Array.isArray(lead?.activity_history)
    ? ([...(lead!.activity_history as ActivityEntry[])].reverse() as ActivityEntry[])
    : [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Istoric activitate
          </SheetTitle>
          <SheetDescription>
            {lead?.name ? `Lead: ${lead.name}` : "Toate interacțiunile, sursele și scorurile."}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3 mt-6">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <div className="mt-8 flex flex-col items-center text-center gap-2">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <p className="text-sm text-muted-foreground">
              Nu am putut încărca istoricul acestui lead.
            </p>
          </div>
        ) : !lead ? (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Lead-ul nu mai există.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border p-3 text-center">
                <TrendingUp className="w-4 h-4 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">Scor</p>
                <p className="text-lg font-bold">{lead.lead_score ?? "—"}</p>
              </div>
              <div className="rounded-xl border p-3 text-center">
                <Repeat2 className="w-4 h-4 mx-auto text-accent mb-1" />
                <p className="text-xs text-muted-foreground">Interacțiuni</p>
                <p className="text-lg font-bold">{lead.touch_count ?? 1}</p>
              </div>
              <div className="rounded-xl border p-3 text-center">
                <ArrowUpRight className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-xs font-semibold capitalize">
                  {(lead.engagement_status ?? "new").replace("_", " ")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {lead.lead_grade && (
                <Badge
                  variant="outline"
                  className={cn("uppercase", gradeTone[lead.lead_grade] ?? "")}
                >
                  {lead.lead_grade}
                </Badge>
              )}
              <span>Creat: {fmt(lead.created_at)}</span>
              {lead.last_touch_at && <span>· Ultima atingere: {fmt(lead.last_touch_at)}</span>}
            </div>

            {/* Automation timeline */}
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Cronologie automatizări
              </h4>
              <LeadEventTimeline leadId={leadId} enabled={open} />
            </section>

            {/* Activity timeline */}
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Cronologie surse & scor
              </h4>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nicio re-interacțiune înregistrată — lead-ul are o singură sursă
                  {lead.source ? `: ${lead.source}` : ""}.
                </p>
              ) : (
                <ol className="relative border-l border-border pl-4 space-y-4">
                  {history.map((entry, i) => (
                    <li key={i} className="relative">
                      <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">
                          {entry.event === "re_engaged"
                            ? "Re-interacțiune"
                            : entry.event ?? "Interacțiune"}
                        </span>
                        {typeof entry.score === "number" && (
                          <Badge variant="secondary" className="text-[10px]">
                            scor {entry.score}
                            {entry.grade ? ` · ${entry.grade}` : ""}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {fmt(entry.at)}
                        {entry.source ? ` · sursă: ${entry.source}` : ""}
                        {entry.campaign ? ` · campanie: ${entry.campaign}` : ""}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* WhatsApp / alert delivery logs */}
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Livrare alerte & mesaje
              </h4>
              {data!.logs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nicio alertă înregistrată pentru acest lead.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data!.logs.map((log) => (
                    <li
                      key={log.id}
                      className="flex items-start gap-3 rounded-lg border p-3 text-xs"
                    >
                      <MessageCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium capitalize">{log.channel}</span>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {log.direction}
                          </Badge>
                          {log.status && (
                            <Badge
                              variant={log.status === "failed" ? "destructive" : "secondary"}
                              className="text-[10px] capitalize"
                            >
                              {log.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground mt-0.5">
                          {fmt(log.created_at)}
                          {log.source ? ` · ${log.source}` : ""}
                          {log.outcome ? ` · ${log.outcome}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default LeadActivityDrawer;
