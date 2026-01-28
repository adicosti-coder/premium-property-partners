import { RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { cn } from "@/lib/utils";

interface PullToRefreshIndicatorProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const PullToRefreshIndicator = ({
  onRefresh,
  children,
  className,
  disabled = false,
}: PullToRefreshIndicatorProps) => {
  const {
    containerRef,
    pullDistance,
    isRefreshing,
    progress,
    canRefresh,
  } = usePullToRefresh({
    onRefresh,
    threshold: 80,
    maxPull: 120,
    disabled,
  });

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
        style={{
          top: Math.min(pullDistance - 40, 20),
          opacity: progress,
        }}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center transition-colors",
            canRefresh && "bg-primary border-primary"
          )}
        >
          <RefreshCw
            className={cn(
              "w-5 h-5 text-muted-foreground transition-colors",
              canRefresh && "text-primary-foreground",
              isRefreshing && "animate-spin"
            )}
            style={{
              transform: `rotate(${progress * 180}deg)`,
            }}
          />
        </div>
      </motion.div>

      {/* Content with pull transform */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? "transform 0.3s ease-out" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefreshIndicator;
