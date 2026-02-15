import { ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

const BlogCardSkeleton = () => (
  <Card className="overflow-hidden h-full">
    {/* Image */}
    <div className="h-48 w-full relative overflow-hidden bg-gradient-to-br from-muted/60 via-muted/40 to-muted/60">
      <div 
        className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_ease-in-out_infinite]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.08) 50%, transparent 100%)'
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
      </div>
    </div>
    <CardContent className="p-6 space-y-3">
      <ShimmerBox className="h-5 w-20 rounded-full" />
      <ShimmerBox className="h-6 w-full rounded-md" />
      <ShimmerBox className="h-4 w-full rounded-md" />
      <ShimmerBox className="h-4 w-3/4 rounded-md" />
      <div className="flex items-center gap-4 pt-2">
        <ShimmerBox className="h-4 w-24 rounded-md" />
        <ShimmerBox className="h-4 w-20 rounded-md" />
      </div>
    </CardContent>
  </Card>
);

export default BlogCardSkeleton;
