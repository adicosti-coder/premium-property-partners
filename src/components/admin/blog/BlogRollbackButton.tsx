import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RotateCcw, Bot, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Snapshot {
  id: string;
  confidence_score: number | null;
  ai_model: string | null;
  rationale: string | null;
  created_at: string;
}

export const BlogRollbackButton = ({ articleId, onRolledBack }: { articleId: string; onRolledBack?: () => void }) => {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("blog_ai_snapshots" as any)
        .select("id, confidence_score, ai_model, rationale, created_at")
        .eq("article_id", articleId)
        .is("rolled_back_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setSnap((data as any) ?? null);
    })();
    return () => { cancelled = true; };
  }, [articleId]);

  if (!snap) return null;

  const confPct = snap.confidence_score != null ? Math.round(Number(snap.confidence_score) * 100) : null;

  const handleRollback = async () => {
    setLoading(true);
    const { error } = await supabase.rpc("blog_rollback_ai_snapshot" as any, { _snapshot_id: snap.id });
    setLoading(false);
    if (error) {
      toast({ title: "Rollback eșuat", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Modificare AI anulată", description: "Articolul a fost restaurat la starea anterioară." });
    setSnap(null);
    onRolledBack?.();
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/40 text-amber-600">
            <Bot className="h-3 w-3" /> AI {confPct != null ? `${confPct}%` : ""}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <div className="font-medium mb-1">Optimizare aplicată de AI</div>
          {snap.rationale && <div className="text-muted-foreground">{snap.rationale}</div>}
        </TooltipContent>
      </Tooltip>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
            <RotateCcw className="h-3 w-3" /> Anulează AI
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulezi modificarea AI?</AlertDialogTitle>
            <AlertDialogDescription>
              Articolul va fi restaurat instant la starea anterioară (title, meta, traduceri EN).
              {snap.rationale ? <><br /><span className="italic">„{snap.rationale}"</span></> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Renunță</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />}
              Anulează AI
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogRollbackButton;
