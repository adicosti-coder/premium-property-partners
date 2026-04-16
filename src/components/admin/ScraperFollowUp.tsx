import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Bell, Clock, X, BellRing } from "lucide-react";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface FollowUpManagerProps {
  leadId: string;
  followUpAt?: string | null;
  snoozedUntil?: string | null;
  onUpdated?: () => void;
}

const QUICK_OPTIONS = [
  { label: "În 2 ore", hours: 2 },
  { label: "Mâine 9:00", custom: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
  { label: "Peste 3 zile", days: 3 },
  { label: "Săptămâna viitoare", days: 7 },
];

export const FollowUpManager = ({ leadId, followUpAt, snoozedUntil, onUpdated }: FollowUpManagerProps) => {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const setReminder = async (date: Date, type: "follow_up" | "snooze") => {
    const update = type === "follow_up"
      ? { follow_up_at: date.toISOString() }
      : { snoozed_until: date.toISOString() };

    const { error } = await supabase.from("scraper_leads").update(update as any).eq("id", leadId);
    if (error) {
      toast.error("Eroare la setare");
      return;
    }
    toast.success(type === "follow_up" ? `Reminder setat pentru ${format(date, "dd MMM HH:mm", { locale: ro })}` : `Snooze până ${format(date, "dd MMM HH:mm", { locale: ro })}`);
    queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
    onUpdated?.();
    setOpen(false);
  };

  const clearReminder = async (type: "follow_up" | "snooze") => {
    const update = type === "follow_up" ? { follow_up_at: null } : { snoozed_until: null };
    const { error } = await supabase.from("scraper_leads").update(update as any).eq("id", leadId);
    if (error) { toast.error("Eroare"); return; }
    toast.success("Șters");
    queryClient.invalidateQueries({ queryKey: ["scraper-leads"] });
    onUpdated?.();
  };

  const followUpDate = followUpAt ? new Date(followUpAt) : null;
  const snoozedDate = snoozedUntil ? new Date(snoozedUntil) : null;
  const hasActive = !!(followUpDate || snoozedDate);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className={cn("gap-1.5", hasActive && "border-blue-500/40 text-blue-600 dark:text-blue-400")}>
          {hasActive ? <BellRing className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
          {followUpDate ? format(followUpDate, "dd MMM HH:mm", { locale: ro }) : snoozedDate ? `Snooze ${format(snoozedDate, "dd MMM", { locale: ro })}` : "Reminder"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="end">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📅 Programează follow-up</p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_OPTIONS.map((opt) => (
              <Button
                key={opt.label}
                size="sm"
                variant="outline"
                className="text-xs h-8"
                onClick={() => {
                  let d: Date;
                  if (opt.custom) d = opt.custom();
                  else {
                    d = new Date();
                    if (opt.hours) d.setHours(d.getHours() + opt.hours);
                    if (opt.days) d.setDate(d.getDate() + opt.days);
                  }
                  setReminder(d, "follow_up");
                }}
              >
                <Clock className="w-3 h-3 mr-1" /> {opt.label}
              </Button>
            ))}
          </div>

          <div className="border-t pt-2">
            <p className="text-[10px] text-muted-foreground mb-1.5">Sau alege o dată exactă:</p>
            <Calendar
              mode="single"
              onSelect={(d) => d && setReminder(d, "follow_up")}
              initialFocus
              className="rounded-md border p-2"
            />
          </div>

          {(followUpDate || snoozedDate) && (
            <div className="border-t pt-2 space-y-1">
              {followUpDate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-blue-600 dark:text-blue-400">📅 Follow-up: {format(followUpDate, "dd MMM yyyy HH:mm", { locale: ro })}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => clearReminder("follow_up")}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {snoozedDate && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-600 dark:text-amber-400">😴 Snooze: {format(snoozedDate, "dd MMM yyyy HH:mm", { locale: ro })}</span>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => clearReminder("snooze")}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

/** Banner that shows leads due for follow-up today. */
interface DueRemindersBannerProps {
  leads: Array<{ id: string; title: string; follow_up_at?: string | null }>;
  onSelectLead?: (id: string) => void;
}

export const DueRemindersBanner = ({ leads, onSelectLead }: DueRemindersBannerProps) => {
  const dueLeads = leads.filter((l) => {
    if (!l.follow_up_at) return false;
    return new Date(l.follow_up_at).getTime() <= Date.now() + 60 * 60 * 1000; // due in next hour or past
  });

  if (dueLeads.length === 0) return null;

  return (
    <div className="mb-4 p-3 rounded-lg border border-blue-500/30 bg-blue-500/5 flex items-center gap-3 flex-wrap">
      <BellRing className="w-5 h-5 text-blue-500 shrink-0 animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">⏰ {dueLeads.length} {dueLeads.length === 1 ? "reminder activ" : "remindere active"}</p>
        <p className="text-xs text-muted-foreground">
          {dueLeads.slice(0, 2).map((l) => l.title.slice(0, 40)).join(" · ")}
          {dueLeads.length > 2 && ` și încă ${dueLeads.length - 2}`}
        </p>
      </div>
      {onSelectLead && (
        <Button size="sm" variant="outline" onClick={() => onSelectLead(dueLeads[0].id)}>
          Deschide primul
        </Button>
      )}
    </div>
  );
};

/** Simple debounce hook for search inputs. */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
