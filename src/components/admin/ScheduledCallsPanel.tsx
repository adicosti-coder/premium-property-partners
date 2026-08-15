import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { maskEmail, maskPhone } from "@/utils/security/maskPII";
import { CalendarClock, CheckCircle2, Eye, EyeOff, Mail, MailCheck, Phone, XCircle } from "lucide-react";

/**
 * Apelurile de 15 minute programate din pagina /pentru-proprietari.
 * Sursă: `chatbot_appointments` cu appointment_type = 'call_15min_proprietar'.
 */

const APPOINTMENT_TYPE = "call_15min_proprietar";

interface CallRow {
  id: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  preferred_date: string | null;
  preferred_time_slot: string | null;
  notes: string | null;
  status: string | null;
  confirmation_sent_at: string | null;
  reminder_sent_at: string | null;
}

const fmtDate = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("ro-RO", { weekday: "short", day: "numeric", month: "short" })
    : "—";

const ScheduledCallsPanel = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "scheduled-calls"],
    queryFn: async (): Promise<CallRow[]> => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("chatbot_appointments")
        .select(
          "id, contact_name, contact_phone, contact_email, preferred_date, preferred_time_slot, notes, status, confirmation_sent_at, reminder_sent_at",
        )
        .eq("appointment_type", APPOINTMENT_TYPE)
        .gte("preferred_date", since)
        .order("preferred_date", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as CallRow[];
    },
    staleTime: 60_000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("chatbot_appointments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "scheduled-calls"] });
      toast({ title: "Status actualizat" });
    },
    onError: () => toast({ title: "Nu am putut actualiza statusul", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" aria-hidden="true" />
          Apeluri programate (15 min)
        </CardTitle>
        <CardDescription>
          Programările din pagina pentru proprietari. Reminderul se trimite automat cu 2 ore înainte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nu există apeluri programate în perioada următoare.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((call) => {
              const show = revealed[call.id];
              return (
                <li key={call.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{call.contact_name ?? "—"}</span>
                      <Badge variant="outline">
                        {fmtDate(call.preferred_date)} · {call.preferred_time_slot ?? "—"}
                      </Badge>
                      {call.status === "confirmed" && (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400">
                          Confirmat
                        </Badge>
                      )}
                      {call.status === "cancelled" && <Badge variant="destructive">Anulat</Badge>}
                      {call.confirmation_sent_at && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <MailCheck className="w-3.5 h-3.5" aria-hidden="true" /> confirmare trimisă
                        </span>
                      )}
                      {call.reminder_sent_at && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" aria-hidden="true" /> reminder trimis
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 break-all">
                      {show ? (call.contact_phone ?? "—") : maskPhone(call.contact_phone ?? "")}
                      {call.contact_email
                        ? ` · ${show ? call.contact_email : maskEmail(call.contact_email)}`
                        : ""}
                    </p>
                    {call.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{call.notes}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-12 min-w-12"
                      aria-label={show ? "Ascunde datele de contact" : "Afișează datele de contact"}
                      onClick={() => setRevealed((prev) => ({ ...prev, [call.id]: !prev[call.id] }))}
                    >
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    {call.contact_phone && (
                      <Button asChild variant="outline" size="icon" className="min-h-12 min-w-12">
                        <a href={`tel:${call.contact_phone}`} aria-label="Sună clientul">
                          <Phone className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="min-h-12 min-w-12"
                      aria-label="Marchează apelul ca efectuat"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: call.id, status: "confirmed" })}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-12 min-w-12 text-destructive"
                      aria-label="Anulează apelul"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: call.id, status: "cancelled" })}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default ScheduledCallsPanel;
