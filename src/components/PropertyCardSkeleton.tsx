import { ImageIcon } from "lucide-react";

// Premium shimmer skeleton with animated gradient
const ShimmerBox = ({ className = "" }: { className?: string }) => (
  <div className={`relative overflow-hidden bg-gradient-to-br from-muted/60 via-muted/40 to-muted/60 ${className}`}>
    <div 
      className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite]"
      style={{
        background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.08) 50%, transparent 100%)'
      }}
    />
  </div>
);

const PropertyCardSkeleton = () => {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border">
      {/* Image skeleton with premium shimmer */}
      <div className="h-48 w-full relative overflow-hidden bg-gradient-to-br from-muted/60 via-muted/40 to-muted/60">
        {/* Shimmer overlay */}
        <div 
          className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite]"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.08) 50%, transparent 100%)'
          }}
        />
        {/* Blurred backdrop effect */}
        <div className="absolute inset-0 backdrop-blur-[2px] bg-gradient-to-t from-background/20 to-transparent" />
        {/* Content placeholder */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted-foreground/10 flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
          </div>
          <div className="flex gap-1.5">
            <div className="h-1.5 w-8 bg-muted-foreground/15 rounded-full" />
            <div className="h-1.5 w-12 bg-muted-foreground/10 rounded-full" />
            <div className="h-1.5 w-6 bg-muted-foreground/15 rounded-full" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Title */}
        <ShimmerBox className="h-6 w-3/4 rounded-md" />

        {/* Description */}
        <div className="space-y-2">
          <ShimmerBox className="h-4 w-full rounded-md" />
          <ShimmerBox className="h-4 w-2/3 rounded-md" />
        </div>

        {/* Capacity info */}
        <div className="flex items-center gap-4">
          <ShimmerBox className="h-4 w-20 rounded-md" />
          <ShimmerBox className="h-4 w-24 rounded-md" />
          <ShimmerBox className="h-4 w-16 rounded-md" />
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-2">
          <ShimmerBox className="h-6 w-24 rounded-full" />
          <ShimmerBox className="h-6 w-16 rounded-full" />
          <ShimmerBox className="h-6 w-20 rounded-full" />
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <ShimmerBox className="h-9 flex-1 rounded-md" />
          <ShimmerBox className="h-9 w-9 rounded-md" />
        </div>
      </div>
    </div>
  );
};

export default PropertyCardSkeleton;
