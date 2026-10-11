import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, RefreshCw } from "lucide-react";

type Ev = { id: string; start: string; kind: string; owner: string | null; phone: string | null; listing: string | null; category: string | null; link?: string };
const TIP: Record<string, string> = { vanzare: "Vânzare", inchiriere: "Închiriere", regim_hotelier: "Regim hotelier", cazare: "Regim hotelier" };

/** Programările rezervate de Andrei în Google Calendar (următoarele 14 zile). */
export default function AndreiUpcomingCalls() {
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = async () => {
    setEvents(null); setErr(null);
    const { data, error } = await supabase.functions.invoke("voice-agent-training-lab", { body: { action: "upcoming_calls" } });
    setEvents(data?.events ?? []); setErr(error ? "Nu am putut citi calendarul" : data?.error ?? null);
  };
  useEffect(() => { load(); }, []);
  const fmt = (d: string) => new Intl.DateTimeFormat("ro-RO", { timeZone: "Europe/Bucharest", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Apeluri programate de Andrei</CardTitle>
        <Button variant="ghost" size="icon" className="h-12 w-12" onClick={load} aria-label="Reîncarcă programările"><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {err && <p className="text-sm text-destructive">{err}</p>}
        {events === null ? <p className="text-sm text-muted-foreground">Se încarcă…</p>
          : events.length === 0 ? <p className="text-sm text-muted-foreground">Nicio programare în următoarele 14 zile.</p>
          : events.map((e) => (
            <div key={e.id} className="flex flex-col gap-1 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="font-semibold">{fmt(e.start)}</div>
                <div className="text-muted-foreground">{e.owner || "Proprietar"}{e.phone ? ` · ${e.phone}` : ""}</div>
                {e.listing && <div className="text-xs text-muted-foreground line-clamp-1">{e.listing}</div>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{e.kind === "evaluare" ? "Evaluare la apartament" : "Discuție telefonică"}</Badge>
                <Badge>{e.category ? TIP[e.category] ?? e.category : "Tip necunoscut"}</Badge>
                {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline self-center">Calendar</a>}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
