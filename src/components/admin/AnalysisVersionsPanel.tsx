import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, RefreshCw, RotateCcw } from "lucide-react";

interface VersionRow {
  id: string;
  analysis_id: string;
  version: number;
  params: Record<string, unknown> | null;
  analysis: Record<string, unknown> | null;
  created_at: string;
  property_analyses: { share_token: string | null; zone: string | null } | null;
}

const CHANGE_FIELDS = [
  { value: "__all__", label: "Orice modificare" },
  { value: "tarif_noapte", label: "Tarif / noapte" },
  { value: "occupancy", label: "Grad de ocupare" },
  { value: "zona", label: "Zonă" },
  { value: "tip_proprietate", label: "Tip proprietate" },
  { value: "pret_listare", label: "Preț listare" },
];

const dt = (v: string | null) => (v ? new Date(v).toLocaleString("ro-RO") : "—");

const paramSummary = (params: Record<string, unknown> | null) => {
  if (!params) return "—";
  const map: Record<string, string> = {
    tarif_noapte: "tarif",
    occupancy: "ocupare",
    zona: "zonă",
    tip_proprietate: "tip",
    pret_listare: "preț",
  };
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${map[k] || k}: ${String(v)}`);
  return parts.length ? parts.join(" · ") : "—";
};

export default function AnalysisVersionsPanel() {
  const [token, setToken] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [field, setField] = useState("__all__");

  const versions = useQuery({
    queryKey: ["admin", "analysis-versions", from, to],
    queryFn: async () => {
      let q = supabase
        .from("property_analysis_versions")
        .select(
          "id, analysis_id, version, params, analysis, created_at, property_analyses!inner(share_token, zone)",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (from) q = q.gte("created_at", new Date(`${from}T00:00:00`).toISOString());
      if (to) q = q.lte("created_at", new Date(`${to}T23:59:59`).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VersionRow[];
    },
  });

  const rows = useMemo(() => {
    const list = versions.data ?? [];
    const t = token.trim().toLowerCase();
    return list.filter((r) => {
      if (t) {
        const hay = `${r.property_analyses?.share_token ?? ""} ${r.analysis_id} ${
          r.property_analyses?.zone ?? ""
        }`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      if (field !== "__all__") {
        const p = r.params || {};
        const v = (p as Record<string, unknown>)[field];
        if (v === null || v === undefined || v === "") return false;
      }
      return true;
    });
  }, [versions.data, token, field]);

  const reset = () => {
    setToken("");
    setFrom("");
    setTo("");
    setField("__all__");
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" aria-hidden="true" />
            Audit recalculări analize
          </CardTitle>
          <CardDescription>
            Istoricul versiunilor salvate la fiecare recalculare locală a unei analize AI.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => versions.refetch()}
          disabled={versions.isFetching}
          aria-label="Reîncarcă istoricul versiunilor"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${versions.isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          Reîncarcă
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="av-token">Token / zonă</Label>
            <Input
              id="av-token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="share token sau zonă"
              aria-label="Filtrează după token de partajare sau zonă"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="av-from">De la data</Label>
            <Input
              id="av-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="Filtrează de la data"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="av-to">Până la data</Label>
            <Input
              id="av-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="Filtrează până la data"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="av-field">Modificare</Label>
            <Select value={field} onValueChange={setField}>
              <SelectTrigger id="av-field" aria-label="Filtrează după câmpul modificat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANGE_FIELDS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">{rows.length} versiuni</Badge>
          <Button variant="ghost" size="sm" onClick={reset} aria-label="Resetează filtrele">
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Resetează filtrele
          </Button>
        </div>

        {versions.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nu există versiuni care să corespundă filtrelor.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Versiune</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Zonă</TableHead>
                  <TableHead>Parametri modificați</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {dt(r.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">v{r.version}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate font-mono text-xs">
                      {r.property_analyses?.share_token || r.analysis_id}
                    </TableCell>
                    <TableCell className="text-sm">{r.property_analyses?.zone || "—"}</TableCell>
                    <TableCell className="max-w-[320px] text-xs text-muted-foreground">
                      {paramSummary(r.params)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
