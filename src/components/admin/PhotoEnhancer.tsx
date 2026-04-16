import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Loader2, Wand2, Sofa, Eraser, Sunset, Download } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "enhance", label: "Enhance", icon: Wand2, desc: "Lumină, claritate, culoare" },
  { id: "stage", label: "Staging", icon: Sofa, desc: "Mobilare virtuală cameră goală" },
  { id: "declutter", label: "Curăță", icon: Eraser, desc: "Elimină obiecte deranjante" },
  { id: "twilight", label: "Twilight", icon: Sunset, desc: "Exterior zi → apus premium" },
] as const;

interface Props {
  imageUrl: string;
  onApply?: (newUrl: string) => void;
}

export function PhotoEnhancer({ imageUrl, onApply }: Props) {
  const [mode, setMode] = useState<typeof MODES[number]["id"]>("enhance");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("enhance-property-photo", {
        body: { imageUrl, mode, style: "modern" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.enhancedImage) throw new Error("Nu s-a generat imagine");
      setResult(data.enhancedImage);
      toast.success("Imagine procesată");
    } catch (e: any) {
      toast.error(e.message || "Eroare procesare");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `enhanced-${mode}-${Date.now()}.png`;
    a.click();
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Photo Enhancement & Staging
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid grid-cols-4 w-full h-auto">
            {MODES.map((m) => (
              <TabsTrigger key={m.id} value={m.id} className="flex flex-col gap-1 py-2 text-[11px]">
                <m.icon className="h-4 w-4" />
                {m.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <p className="text-xs text-muted-foreground text-center">
          {MODES.find(m => m.id === mode)?.desc}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Original</div>
            <img src={imageUrl} alt="original" className="w-full aspect-video object-cover rounded-md border" />
          </div>
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Rezultat AI</div>
            <div className="w-full aspect-video rounded-md border bg-muted/30 flex items-center justify-center overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-xs">Procesare AI…</span>
                </div>
              ) : result ? (
                <img src={result} alt="enhanced" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">Apasă "Generează"</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={run} disabled={loading} className="flex-1 gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generează
          </Button>
          {result && (
            <>
              <Button variant="outline" onClick={download} className="gap-2">
                <Download className="h-4 w-4" /> Descarcă
              </Button>
              {onApply && (
                <Button variant="default" onClick={() => onApply(result)}>
                  Aplică
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
