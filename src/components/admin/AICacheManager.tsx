import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Trash2, Sparkles, Brain, Languages, Image, PenLine, RefreshCw } from "lucide-react";

interface CacheInfo {
  key: string;
  table: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const CACHES: CacheInfo[] = [
  {
    key: "advisor",
    table: "advisor_cache",
    label: "The Advisor",
    description: "Analize premium AI generate pentru fiecare proprietate",
    icon: <Brain className="w-5 h-5" />,
    color: "text-purple-500",
  },
  {
    key: "captions",
    table: "image_caption_cache",
    label: "Descrieri Imagini",
    description: "Caption-uri AI pentru fotografiile proprietăților",
    icon: <Image className="w-5 h-5" />,
    color: "text-blue-500",
  },
  {
    key: "translations",
    table: "translation_cache",
    label: "Traduceri",
    description: "Traduceri AI (RO ↔ EN) pentru descrieri",
    icon: <Languages className="w-5 h-5" />,
    color: "text-green-500",
  },
  {
    key: "rewrite",
    table: "rewrite_cache",
    label: "Rewrite Descrieri",
    description: "Descrieri rescrise AI pentru anunțuri imobiliare",
    icon: <PenLine className="w-5 h-5" />,
    color: "text-amber-500",
  },
];

const AICacheManager = () => {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [loadingCounts, setLoadingCounts] = useState(false);

  const fetchCounts = async () => {
    setLoadingCounts(true);
    const results: Record<string, number | null> = {};
    await Promise.all(
      CACHES.map(async (c) => {
        const { count, error } = await supabase
          .from(c.table as any)
          .select("*", { count: "exact", head: true });
        results[c.key] = error ? null : (count ?? 0);
      })
    );
    setCounts(results);
    setLoadingCounts(false);
  };

  const clearCache = async (cache: CacheInfo) => {
    setLoading((prev) => ({ ...prev, [cache.key]: true }));
    try {
      // Delete all rows - use a filter that matches everything
      const { error } = await supabase
        .from(cache.table as any)
        .delete()
        .gte("created_at", "1970-01-01");

      if (error) throw error;

      toast({
        title: `✅ Cache „${cache.label}" golit`,
        description: "La următoarea accesare, conținutul se va regenera automat.",
      });
      setCounts((prev) => ({ ...prev, [cache.key]: 0 }));
    } catch (err: any) {
      console.error(`Error clearing ${cache.table}:`, err);
      toast({
        title: "Eroare",
        description: err.message || "Nu s-a putut goli cache-ul.",
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, [cache.key]: false }));
    }
  };

  const clearAll = async () => {
    setLoading((prev) => ({ ...prev, all: true }));
    let success = 0;
    let failed = 0;

    for (const cache of CACHES) {
      try {
        const { error } = await supabase
          .from(cache.table as any)
          .delete()
          .gte("created_at", "1970-01-01");
        if (error) throw error;
        success++;
        setCounts((prev) => ({ ...prev, [cache.key]: 0 }));
      } catch {
        failed++;
      }
    }

    toast({
      title: failed === 0 ? "✅ Toate cache-urile AI au fost golite!" : "⚠️ Golire parțială",
      description: `${success} cache-uri golite${failed > 0 ? `, ${failed} erori` : ""}. Conținutul se va regenera automat.`,
      variant: failed > 0 ? "destructive" : "default",
    });
    setLoading((prev) => ({ ...prev, all: false }));
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              <div>
                <CardTitle className="text-xl font-serif">AI Cache Manager</CardTitle>
                <CardDescription>
                  Gestionează cache-urile de conținut generat de AI. La golire, textele se vor regenera automat la următoarea vizitare.
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCounts} disabled={loadingCounts}>
              {loadingCounts ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Verifică dimensiuni
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {CACHES.map((cache) => (
              <Card key={cache.key} className="border border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${cache.color}`}>{cache.icon}</div>
                      <div>
                        <h3 className="font-semibold text-sm">{cache.label}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{cache.description}</p>
                        {counts[cache.key] !== undefined && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {counts[cache.key] === null ? "Eroare" : `${counts[cache.key]} intrări`}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => clearCache(cache)}
                      disabled={!!loading[cache.key]}
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      {loading[cache.key] ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="pt-2 border-t border-border">
            <Button
              variant="destructive"
              onClick={clearAll}
              disabled={!!loading.all}
              className="w-full sm:w-auto"
            >
              {loading.all ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Golire TOTALĂ — Regenerare completă AI
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ Aceasta va șterge toate textele generate de AI. Ele se vor regenera automat, dar va consuma credite AI.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AICacheManager;
