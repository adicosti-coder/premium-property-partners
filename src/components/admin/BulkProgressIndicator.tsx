import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2, ImageIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkProgressIndicatorProps {
  isActive: boolean;
  current: number;
  total: number;
  success: number;
  failed: number;
  type: 'google' | 'pixabay';
  className?: string;
}

const BulkProgressIndicator = ({
  isActive,
  current,
  total,
  success,
  failed,
  type,
  className
}: BulkProgressIndicatorProps) => {
  if (!isActive) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const successRate = current > 0 ? Math.round((success / current) * 100) : 0;
  
  const isGoogle = type === 'google';
  const Icon = isGoogle ? Sparkles : ImageIcon;
  const label = isGoogle ? 'Google Places + Pixabay' : 'Pixabay';
  const accentClass = isGoogle ? 'text-primary' : 'text-green-600 dark:text-green-400';
  const progressClass = isGoogle ? 'bg-primary' : 'bg-green-500';

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 w-80 bg-card border border-border rounded-xl shadow-2xl p-4 animate-scale-in",
      className
    )}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={cn("p-2 rounded-lg bg-muted", accentClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-sm text-foreground">Populare imagini</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progres</span>
          <span className="font-medium text-foreground">{percentage}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-300 ease-out rounded-full", progressClass)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <div className="text-center p-2 bg-muted/50 rounded-lg">
          <p className="text-lg font-bold text-foreground">{current}</p>
          <p className="text-xs text-muted-foreground">din {total}</p>
        </div>
        <div className="text-center p-2 bg-green-500/10 rounded-lg">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <p className="text-lg font-bold text-green-600">{success}</p>
          </div>
          <p className="text-xs text-muted-foreground">găsite</p>
        </div>
        <div className="text-center p-2 bg-destructive/10 rounded-lg">
          <div className="flex items-center justify-center gap-1">
            <XCircle className="w-4 h-4 text-destructive" />
            <p className="text-lg font-bold text-destructive">{failed}</p>
          </div>
          <p className="text-xs text-muted-foreground">lipsă</p>
        </div>
      </div>

      {/* Success rate */}
      {current > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Rată succes</span>
            <span className={cn(
              "font-medium",
              successRate >= 70 ? "text-green-600" : 
              successRate >= 40 ? "text-yellow-600" : 
              "text-destructive"
            )}>
              {successRate}%
            </span>
          </div>
        </div>
      )}

      {/* Estimated time */}
      {current > 0 && current < total && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          ~{Math.ceil((total - current) * 0.5)} secunde rămase
        </p>
      )}
    </div>
  );
};

export default BulkProgressIndicator;
