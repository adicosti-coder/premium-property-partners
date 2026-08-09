import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles, RefreshCw, Loader2, Save, ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";
import PropertyQualityScoreCard, { type PropertyQualityAnalysis } from "./PropertyQualityScoreCard";


export interface EnrichedImage {
  original: string;
  optimized: string;
  alt: string;
}

interface Props {
  prospect: {
    id: string;
    title: string | null;
    description: string | null;
    images: string[] | null;
    enriched_title?: string | null;
    enriched_description?: string | null;
    enriched_images?: EnrichedImage[] | null;
    enrichment_status?: string | null;
    enriched_at?: string | null;
    enrichment_error?: string | null;
    enrichment_saved_at?: string | null;
    quality_score?: number | null;
    quality_analysis?: PropertyQualityAnalysis | null;
    quality_analyzed_at?: string | null;

  };
  onUpdated?: (patch: Record<string, unknown>) => void;
}

export default function ProspectEnrichmentPanel({ prospect, onUpdated }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState("premium");

  const status = prospect.enrichment_status || "pending";
  const hasPremium = !!(prospect.enriched_title || prospect.enriched_description || (prospect.enriched_images || []).length);

  const runEnrich = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("enrich-prospect-listing", {
        body: { prospect_id: prospect.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "✨ Fișă optimizată generată", description: "Textul și imaginile au fost procesate." });
      qc.invalidateQueries({ queryKey: ["prospect-triage"] });
      qc.invalidateQueries({ queryKey: ["prospects"] });
      // Re-fetch the row to update UI
      supabase
        .from("prospect_listings")
        .select("enriched_title,enriched_description,enriched_images,enrichment_status,enriched_at,enrichment_error")
        .eq("id", prospect.id)
        .maybeSingle()
        .then(({ data }) => { if (data) onUpdated?.(data); });
    },
    onError: (e: Error) => {
      toast({ title: "Eroare AI", description: e.message, variant: "destructive" });
    },
  });

  const saveOptimized = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("prospect_listings")
        .update({ enrichment_saved_at: new Date().toISOString() } as never)
        .eq("id", prospect.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "💾 Fișă premium salvată", description: "Marcată pentru publicare." });
      qc.invalidateQueries({ queryKey: ["prospect-triage"] });
      onUpdated?.({ enrichment_saved_at: new Date().toISOString() });
    },
    onError: (e: Error) => toast({ title: "Eroare salvare", description: e.message, variant: "destructive" }),
  });

  const StatusBadge = () => {
    if (status === "done") return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle2 className="w-3 h-3 mr-1" /> Optimizat AI</Badge>;
    if (status === "processing") return <Badge className="bg-blue-100 text-blue-800 border-blue-300"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> În procesare</Badge>;
    if (status === "failed") return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Eșuat</Badge>;
    return <Badge variant="outline">În așteptare</Badge>;
  };

  const enrichedImages = prospect.enriched_images || [];
  const originalImages = (prospect.images || []).slice(0, 6);

  return (
    <div className="space-y-4">
    <PropertyQualityScoreCard
      prospectId={prospect.id}
      imagesCount={(prospect.images || []).length}
      qualityScore={prospect.quality_score ?? null}
      qualityAnalysis={prospect.quality_analysis ?? null}
      qualityAnalyzedAt={prospect.quality_analyzed_at ?? null}
      onUpdated={onUpdated}
    />
    <Card className="border-amber-200 dark:border-amber-800">

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Fișă Optimizată Premium
          </CardTitle>
          <div className="flex items-center gap-2">
            <StatusBadge />
            <Button
              size="sm"
              variant="outline"
              onClick={() => runEnrich.mutate()}
              disabled={runEnrich.isPending}
            >
              {runEnrich.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
              {hasPremium ? "Regenerează" : "Generează"}
            </Button>
          </div>
        </div>
        {prospect.enrichment_error && (
          <p className="text-xs text-red-600 mt-1">⚠ {prospect.enrichment_error}</p>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="original">📄 Original (brut)</TabsTrigger>
            <TabsTrigger value="premium">✨ Premium AI</TabsTrigger>
          </TabsList>

          <TabsContent value="original" className="space-y-3 pt-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Titlu original</p>
              <p className="text-sm">{prospect.title || <em className="text-muted-foreground">(lipsește)</em>}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">Descriere originală</p>
              <p className="text-xs whitespace-pre-wrap text-muted-foreground max-h-48 overflow-y-auto">
                {prospect.description || <em>(lipsește)</em>}
              </p>
            </div>
            {originalImages.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Imagini brute ({originalImages.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {originalImages.map((img, i) => (
                    <img key={i} src={img} alt={`Original ${i+1}`} className="rounded w-full h-20 object-cover" loading="lazy" />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="premium" className="space-y-3 pt-3">
            {!hasPremium && status !== "processing" && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-50" />
                Nicio fișă premium încă. Apasă <strong>Generează</strong> pentru a rula AI rewrite + optimizare imagini.
              </div>
            )}
            {status === "processing" && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" /> Se procesează…
              </div>
            )}
            {hasPremium && (
              <>
                {prospect.enriched_title && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Titlu SEO premium</p>
                    <p className="text-base font-semibold text-foreground">{prospect.enriched_title}</p>
                  </div>
                )}
                {prospect.enriched_description && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Descriere structurată</p>
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm max-h-72 overflow-y-auto rounded border bg-muted/30 p-3">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{prospect.enriched_description}</ReactMarkdown>
                    </div>
                  </div>
                )}
                {enrichedImages.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" /> Galerie HD cu watermark ({enrichedImages.length})
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {enrichedImages.map((img, i) => (
                        <figure key={i} className="space-y-1">
                          <img
                            src={img.optimized}
                            alt={img.alt}
                            title={img.alt}
                            className="rounded w-full h-20 object-cover ring-1 ring-amber-300/50"
                            loading="lazy"
                          />
                          <figcaption className="text-[10px] text-muted-foreground truncate" title={img.alt}>
                            {img.alt}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {prospect.enrichment_saved_at ? "✅ Salvat ca premium" : "Nesalvat încă"}
                  </p>
                  <Button
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => saveOptimized.mutate()}
                    disabled={saveOptimized.isPending}
                  >
                    {saveOptimized.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
                    Salvează Listarea Optimizată
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
    </div>
  );

}
