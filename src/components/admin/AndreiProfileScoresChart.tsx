import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";

const LABEL: Record<string, string> = { sceptic: "Sceptic", grabit: "Grăbit", negociator: "Negociator", garsoniera: "Garsonieră" };

type Point = { profil: string; ultima: number; medie: number; rulari: number };

/** Notele pe profil din antrenamentele automate (ultimele 30 de zile). */
export default function AndreiProfileScoresChart() {
  const [data, setData] = useState<Point[]>([]);
  useEffect(() => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString();
    supabase.from("voice_call_analyses").select("outcome, score, created_at").eq("source", "training_lab_auto")
      .gte("created_at", since).order("created_at", { ascending: true }).limit(500)
      .then(({ data: rows }) => {
        const g: Record<string, number[]> = {};
        for (const r of rows ?? []) {
          const key = String(r.outcome || "").split(" · ")[0].split("-")[0].trim();
          if (!LABEL[key] || r.score == null) continue;
          (g[key] ||= []).push(Number(r.score));
        }
        setData(Object.keys(LABEL).filter((k) => g[k]?.length).map((k) => ({
          profil: LABEL[k], ultima: g[k][g[k].length - 1],
          medie: Math.round((g[k].reduce((a, b) => a + b, 0) / g[k].length) * 10) / 10, rulari: g[k].length,
        })));
      });
  }, []);

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Note pe profil (ultimele 30 de zile)</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <p className="text-sm text-muted-foreground">Încă nu există antrenamente automate.</p> : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="profil" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ultima" name="Ultima notă" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="medie" name="Media" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Profilul cu nota cea mai mică arată unde mai are Andrei de lucru. {data.map((d) => `${d.profil}: ${d.rulari} rulări`).join(" · ")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
