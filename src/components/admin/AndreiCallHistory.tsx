import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Archive, Trash2 } from "lucide-react";

type Row = { id: string; created_at: string; to_number: string | null; outcome: string | null; score: number | null; weaknesses: any; objections: any; prompt_fixes: any; transcript: string | null };
type Lesson = { id: string; lesson: string; is_active: boolean; created_at: string; profile_summary: string | null };

function lessonCategory(text: string): string {
  const t = text.toLowerCase();
  if (/ton|politicos|empati|calm|rabd|ascult/.test(t)) return "Tone of Voice";
  if (/obiec|scump|comision|preț|pret|de ce|nu mă interesează|nu ma intereseaza|ocupat|grăbit|grabit/.test(t)) return "Handling Objections";
  if (/vinz|vanz|vânz|închiri|inchiri|randament|hotel|strateg|argument|ofert/.test(t)) return "Sales Strategy";
  return "General";
}

export default function AndreiCallHistory() {
  const [rows, setRows] = useState<Row[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [busyLesson, setBusyLesson] = useState<string | null>(null);

  const loadLessons = () =>
    (supabase as any).from("voice_agent_playbook_addendum").select("id,lesson,is_active,created_at,profile_summary").order("created_at", { ascending: false }).limit(30).then(({ data }: any) => setLessons(data ?? []));

  useEffect(() => {
    (supabase as any).from("voice_call_analyses").select("*").order("created_at", { ascending: false }).limit(50).then(({ data }: any) => setRows(data ?? []));
    loadLessons();
  }, []);

  const archiveLesson = async (l: Lesson) => {
    setBusyLesson(l.id);
    const { error } = await (supabase as any).from("voice_agent_playbook_addendum").update({ is_active: false }).eq("id", l.id);
    setBusyLesson(null);
    if (error) return toast.error("Nu am putut arhiva lecția");
    toast.success("Lecție arhivată — Andrei nu o mai folosește");
    loadLessons();
  };

  const deleteLesson = async (l: Lesson) => {
    setBusyLesson(l.id);
    const { error } = await (supabase as any).from("voice_agent_playbook_addendum").delete().eq("id", l.id);
    setBusyLesson(null);
    if (error) return toast.error("Nu am putut șterge lecția");
    toast.success("Lecție ștearsă definitiv");
    loadLessons();
  };

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
        <CardContent className="pt-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="lectii" className="border-b-0">
              <AccordionTrigger className="min-h-[48px] text-base font-semibold hover:no-underline">
                Lecții aplicate lui Andrei ({lessons.filter((l) => l.is_active).length} active)
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  {!lessons.length && <p className="text-muted-foreground">Nicio lecție aplicată încă.</p>}
                  {lessons.map((l) => (
                    <div key={l.id} className="flex flex-wrap items-start gap-2 rounded-lg border border-border p-3">
                      <Badge variant={l.is_active ? "default" : "secondary"}>{l.is_active ? "Activă" : "Arhivată"}</Badge>
                      <Badge variant="outline" className="shrink-0">[{lessonCategory(l.lesson)}]</Badge>
                      <span className="text-muted-foreground">{new Date(l.created_at).toLocaleDateString("ro-RO")}</span>
                      <span className="flex-1 min-w-[200px]">{l.lesson}</span>
                      <div className="flex gap-1">
                        {l.is_active && (
                          <Button type="button" size="sm" variant="ghost" className="min-h-[48px] min-w-[48px]" disabled={busyLesson === l.id} onClick={() => archiveLesson(l)} aria-label="Arhivează lecția">
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        <Button type="button" size="sm" variant="ghost" className="min-h-[48px] min-w-[48px] text-destructive" disabled={busyLesson === l.id} onClick={() => deleteLesson(l)} aria-label="Șterge lecția definitiv">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
