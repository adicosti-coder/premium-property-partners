import { useState } from "react";
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

export interface BlogAiSnapshotLite {
  id: string;
  article_id: string;
  confidence_score: number | null;
  ai_model: string | null;
  rationale: string | null;
  created_at: string;
}

interface Props {
  snapshot: BlogAiSnapshotLite | null;
  onRolledBack?: () => void;
}

/**
 * Rollback control for an AI-optimized article.
 *
 * IMPORTANT: the snapshot is passed in from the parent (BlogManager) so that
 * rendering a big table of articles doesn't fire N per-row Supabase requests.
 * The parent bulk-fetches the latest un-rolled-back snapshot per article once.
 */
export const BlogRollbackButton = ({ snapshot, onRolledBack }: Props) => {
  const [loading, setLoading] = useState(false);
  const [rolledBack, setRolledBack] = useState(false);

  if (!snapshot || rolledBack) return null;

  const confPct = snapshot.confidence_score != null
    ? Math.round(Number(snapshot.confidence_score) * 100)
    : null;

  const handleRollback = async () => {
    setLoading(true);
    const { error } = await supabase.rpc(
      "blog_rollback_ai_snapshot" as never,
      { _snapshot_id: snapshot.id } as never,
    );
    setLoading(false);
    if (error) {
      toast({ title: "Rollback eșuat", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Modificare AI anulată", description: "Articolul a fost restaurat la starea anterioară." });
    setRolledBack(true);
    onRolledBack?.();
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/40 text-amber-600">
            <Bot className="h-3 w-3" aria-hidden="true" /> AI {confPct != null ? `${confPct}%` : ""}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          <div className="font-medium mb-1">Optimizare aplicată de AI</div>
          {snapshot.rationale && <div className="text-muted-foreground">{snapshot.rationale}</div>}
        </TooltipContent>
      </Tooltip>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" aria-label="Anulează modificarea AI">
            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Anulează AI
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anulezi modificarea AI?</AlertDialogTitle>
            <AlertDialogDescription>
              Articolul va fi restaurat instant la starea anterioară (title, meta, traduceri EN).
              {snapshot.rationale ? <><br /><span className="italic">„{snapshot.rationale}"</span></> : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Renunță</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" /> : <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />}
              Anulează AI
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogRollbackButton;
