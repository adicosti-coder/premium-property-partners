import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Props {
  property: Record<string, unknown>;
  onUseTitle: (t: string) => void;
  onUseDescription: (d: string) => void;
}

const AndreiSeoAssistant = ({ property, onUseTitle, onUseDescription }: Props) => {
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<{ titles: string[]; descriptions: string[]; keywords: string[] } | null>(null);

  const run = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("andrei-listing-seo", { body: { property } });
    setLoading(false);
    if (error || !data?.success) {
      toast({ title: "Andrei AI", description: data?.error || "Nu am putut genera variantele.", variant: "destructive" });
      return;
    }
    setRes({ titles: data.titles ?? [], descriptions: data.descriptions ?? [], keywords: data.keywords ?? [] });
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-medium text-foreground">Andrei AI · Titluri & descrieri SEO</p>
        <Button type="button" size="sm" onClick={run} disabled={loading} className="min-h-10">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {res ? "Generează din nou" : "Generează variante"}
        </Button>
      </div>
      {res && (
        <div className="space-y-3 text-sm">
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Titluri</p>
            {res.titles.map((t) => (
              <div key={t} className="flex items-center justify-between gap-2 rounded bg-background p-2 border border-border">
                <span>{t} <span className="text-xs text-muted-foreground">({t.length})</span></span>
                <Button type="button" size="sm" variant="outline" onClick={() => onUseTitle(t)}>Folosește</Button>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase text-muted-foreground">Descrieri</p>
            {res.descriptions.map((d, i) => (
              <div key={i} className="rounded bg-background p-2 border border-border space-y-2">
                <p className="whitespace-pre-line">{d}</p>
                <Button type="button" size="sm" variant="outline" onClick={() => onUseDescription(d)}>Folosește descrierea</Button>
              </div>
            ))}
          </div>
          {res.keywords.length > 0 && (
            <p className="text-xs text-muted-foreground">Cuvinte-cheie: {res.keywords.join(", ")}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AndreiSeoAssistant;
