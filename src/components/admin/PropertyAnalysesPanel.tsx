import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { BrainCircuit, ExternalLink, FileDown, Link as LinkIcon, RefreshCw } from "lucide-react";
import AnalysisVersionsPanel from "@/components/admin/AnalysisVersionsPanel";
import type { ListingAnalysis } from "@/components/analiza/AiListingAnalyzer";

interface AnalysisRow {
  id: string;
  share_token: string;
  mode: string;
  source_url: string | null;
  photo_count: number;
  context_text: string | null;
  model: string | null;
  cached: boolean;
  score: number | null;
  zone: string | null;
  analysis: unknown;
  created_at: string;
}

const COLUMNS =
  "id, share_token, mode, source_url, photo_count, context_text, model, cached, score, zone, analysis, created_at";

const dt = (v: string | null) => (v ? new Date(v).toLocaleString("ro-RO") : "—");

export default function PropertyAnalysesPanel() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const analyses = useQuery({
    queryKey: ["admin", "property-analyses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_analyses")
        .select(COLUMNS)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as AnalysisRow[];
    },
  });

  const rows = useMemo(() => {
    const list = analyses.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [r.zone, r.source_url, r.context_text, r.model, (r.analysis as ListingAnalysis)?.titlu]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [analyses.data, search]);

  const copyShare = async (token: string) => {
    const url = `${window.location.origin}/analiza/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiat", description: url });
    } catch {
      toast({ title: "Nu am putut copia linkul", variant: "destructive" });
    }
  };

  const downloadPdf = async (row: AnalysisRow) => {
    try {
      const { downloadAnalysisPdf } = await import("@/lib/analysisPdf");
      downloadAnalysisPdf({
        analysis: (row.analysis as ListingAnalysis) || {},
        sourceUrl: row.source_url,
        mode: row.mode === "photos" ? "photos" : "url",
        photoCount: row.photo_count,
        shareUrl: `${window.location.origin}/analiza/${row.share_token}`,
        createdAt: row.created_at,
      });
    } catch {
      toast({ title: "Nu am putut genera PDF-ul", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" aria-hidden="true" />
            Istoric analize AI
          </CardTitle>
          <CardDescription>
            Toate analizele generate pe /hostscan-ai, cu link de partajare și export PDF.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => analyses.refetch()}
          disabled={analyses.isFetching}
          aria-label="Reîncarcă lista de analize"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${analyses.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
          Reîncarcă
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Caută după zonă, titlu, link sau model"
            aria-label="Caută în istoricul analizelor"
            className="max-w-sm"
          />
          <Badge variant="secondary">{rows.length} analize</Badge>
        </div>

        {analyses.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nu există analize salvate încă.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Proprietate</TableHead>
                  <TableHead>Zonă</TableHead>
                  <TableHead>Scor</TableHead>
                  <TableHead>Sursă</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const a = (r.analysis as ListingAnalysis) || {};
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {dt(r.created_at)}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="truncate text-sm font-medium">{a.titlu || "Analiză fără titlu"}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.model || "—"}
                          {r.cached ? " · cache" : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm">{r.zone || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={(r.score ?? 0) >= 70 ? "default" : "secondary"}>
                          {r.score ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {r.source_url ? (
                          <a
                            href={r.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            anunț <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        ) : (
                          `${r.photo_count} foto`
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyShare(r.share_token)}
                            aria-label="Copiază linkul de partajare"
                          >
                            <LinkIcon className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => downloadPdf(r)}
                            aria-label="Descarcă raportul PDF"
                          >
                            <FileDown className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    <AnalysisVersionsPanel />
    </div>
  );
}
