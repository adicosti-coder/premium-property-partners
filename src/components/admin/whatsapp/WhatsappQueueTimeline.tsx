import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Loader2, CircleDot } from "lucide-react";

type EventRow = {
  id: string;
  event: string;
  detail: Record<string, unknown> | null;
  created_at: string;
};

const EVENT_LABEL: Record<string, string> = {
  enqueued: "Adăugat în coadă",
  sending: "Se trimite",
  sent: "Trimis",
  delivered: "Livrat",
  read: "Citit",
  replied: "A răspuns",
  failed: "Eșuat",
  cancelled: "Anulat",
  pending: "Reprogramat",
  edited: "Mesaj editat",
};

const fmt = (v: string) =>
  new Date(v).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "medium" });

export function WhatsappQueueTimeline({
  queueId,
  onClose,
}: {
  queueId: string | null;
  onClose: () => void;
}) {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!queueId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const { data } = await supabase
        .from("wa_outbound_events")
        .select("id, event, detail, created_at")
        .eq("queue_id", queueId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setEvents((data ?? []) as EventRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [queueId]);

  return (
    <Sheet open={!!queueId} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Timeline evenimente</SheetTitle>
          <SheetDescription>
            Istoricul complet al stărilor mesajului, cu marcaj de timp exact.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {loading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && !events.length && (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nu există evenimente înregistrate pentru acest mesaj.
            </p>
          )}
          <ol className="relative border-l border-border pl-5 space-y-5">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <CircleDot className="absolute -left-[27px] top-0.5 h-3.5 w-3.5 text-primary bg-background" />
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{EVENT_LABEL[e.event] ?? e.event}</Badge>
                  <span className="text-xs text-muted-foreground">{fmt(e.created_at)}</span>
                </div>
                {e.detail && Object.keys(e.detail).length > 0 && (
                  <pre className="mt-1 text-[11px] text-muted-foreground whitespace-pre-wrap break-all">
                    {JSON.stringify(e.detail)}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}
