import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { properties as staticProps } from "@/data/properties";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

type Cell = { clicks: number; impressions: number; position: number | null };
type Data = {
  months: string[];
  site: Record<string, { clicks: number; impressions: number }>;
  listings: { slug: string; months: Record<string, Cell> }[];
};

const label = (m: string) => {
  const [y, mm] = m.split("-");
  const names = ["ian.", "feb.", "mar.", "apr.", "mai", "iun.", "iul.", "aug.", "sep.", "oct.", "nov.", "dec."];
  return `${names[Number(mm) - 1] ?? mm} ${y.slice(2)}`;
};

const nameOf = (slug: string) => staticProps.find((p) => p.slug === slug)?.name ?? slug;

/** Trafic organic Google (Search Console) pe luni: total site + fiecare apartament de cazare. */
export default function OrganicTrafficMonthlyPanel() {
  const [months, setMonths] = useState(6);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (m = months) => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.functions.invoke("gsc-monthly-pages", { body: { months: m } });
    setLoading(false);
    if (err || res?.error) { setError(res?.error ?? "Nu am putut citi datele din Google."); return; }
    setData(res as Data);
  };

  useEffect(() => { load(months); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [months]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Trafic organic din Google, pe luni</CardTitle>
        <div className="flex gap-1">
          {[3, 6, 12].map((m) => (
            <Button key={m} size="sm" variant={m === months ? "default" : "outline"} onClick={() => setMonths(m)}>{m} luni</Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => load()} disabled={loading} aria-label="Reîncarcă datele">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto space-y-3">
        <p className="text-xs text-muted-foreground">
          Vizitele venite din căutările Google (date din Google Search Console, cu întârziere de circa 2 zile).
          Prima linie e tot site-ul; apoi fiecare apartament de cazare. „Afișări” = de câte ori a apărut în rezultate, „Poziție” = locul mediu în listă.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {!data && !error && <p className="text-sm text-muted-foreground">Se încarcă…</p>}
        {data && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1">Pagină</th>
                {data.months.map((m) => <th key={m} className="px-2">{label(m)}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border font-medium">
                <td className="py-1">realtrust.ro (tot site-ul)</td>
                {data.months.map((m) => (
                  <td key={m} className="px-2">
                    {data.site[m]?.clicks ?? 0}
                    <span className="text-xs text-muted-foreground"> / {data.site[m]?.impressions ?? 0}</span>
                  </td>
                ))}
              </tr>
              {staticProps.map((p) => {
                const row = data.listings.find((l) => l.slug === p.slug);
                return (
                  <tr key={p.slug} className="border-t border-border">
                    <td className="py-1">{nameOf(p.slug)}</td>
                    {data.months.map((m) => {
                      const c = row?.months[m];
                      return (
                        <td key={m} className="px-2">
                          {c?.clicks ?? 0}
                          <span className="text-xs text-muted-foreground"> / {c?.impressions ?? 0}{c?.position ? ` · poz. ${c.position}` : ""}</span>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {data && <p className="text-xs text-muted-foreground">Format celulă: vizite / afișări · poziția medie.</p>}
      </CardContent>
    </Card>
  );
}
