import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = { id: string; created_at: string; to_number: string | null; outcome: string | null; score: number | null; weaknesses: any; objections: any; prompt_fixes: any; transcript: string | null };
type Lesson = { id: string; lesson: string; is_active: boolean; created_at: string; profile_summary: string | null };

export default function AndreiCallHistory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (supabase as any).from("voice_call_analyses").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }: any) => setRows(data ?? []));
    (supabase as any).from("voice_agent_playbook_addendum").select("id,lesson,is_active,created_at,profile_summary").order("created_at", { ascending: false }).limit(30).then(({ data }: any) => setLessons(data ?? []));
  }, []);

  const arr = (v: any) => (Array.isArray(v) ? v : []);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Istoric apeluri reale analizate automat</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {!rows.length && <p className="text-muted-foreground">Încă niciun apel analizat. Fiecare apel real încheiat se analizează automat.</p>}
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border p-3">
              <button type="button" className="flex w-full min-h-[48px] flex-wrap items-center gap-2 text-left" onClick={() => setOpen(open === r.id ? null : r.id)}>
                <Badge variant={(r.score ?? 0) >= 7 ? "default" : "destructive"}>Nota {r.score ?? "—"}/10</Badge>
                <span>{new Date(r.created_at).toLocaleString("ro-RO")}</span>
                <span className="text-muted-foreground">{r.to_number}</span>
                {r.outcome && <Badge variant="secondary">{r.outcome}</Badge>}
                <span className="text-muted-foreground">{arr(r.objections).length} obiecții</span>
              </button>
              {open === r.id && (
                <div className="mt-3 space-y-3">
                  <ul className="space-y-1">{arr(r.objections).map((o: any, i: number) => (
                    <li key={i} className="flex gap-2"><Badge variant={o.handled ? "secondary" : "destructive"} className="shrink-0">{o.handled ? "Tratată" : "Netratată"}</Badge><span><b>{o.objection}</b>{o.comment ? ` — ${o.comment}` : ""}</span></li>
                  ))}</ul>
                  {arr(r.weaknesses).length > 0 && <div><b>Puncte slabe:</b> {arr(r.weaknesses).join(" · ")}</div>}
                  {arr(r.prompt_fixes).length > 0 && <div><b>Sugestii:</b><ul className="list-disc pl-5">{arr(r.prompt_fixes).map((f: string, i: number) => <li key={i}>{f}</li>)}</ul></div>}
                  {r.transcript && <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{r.transcript}</pre>}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Lecții aplicate lui Andrei</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {lessons.map((l) => (
            <div key={l.id} className="flex flex-wrap items-start gap-2">
              <Badge variant={l.is_active ? "default" : "secondary"}>{l.is_active ? "Activă" : "Inactivă"}</Badge>
              <span className="text-muted-foreground">{new Date(l.created_at).toLocaleDateString("ro-RO")}</span>
              <span className="flex-1">{l.lesson}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
