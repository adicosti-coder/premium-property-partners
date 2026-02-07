import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeaserCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index?: number;
  isVisible?: boolean;
  variant?: "default" | "compact";
}

const TeaserCard = ({
  icon: Icon,
  title,
  description,
  index = 0,
  isVisible = true,
  variant = "default",
}: TeaserCardProps) => {
  const isCompact = variant === "compact";

  return (
    <div
      className={cn(
        "group bg-card backdrop-blur-sm rounded-2xl border border-border hover:border-primary/30 transition-all duration-500 hover:shadow-elegant",
        isCompact ? "p-4" : "p-6",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      )}
      style={{ transitionDelay: isVisible ? `${index * 75}ms` : "0ms" }}
    >
      <div
        className={cn(
          "rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors",
          isCompact ? "w-10 h-10 mb-3" : "w-12 h-12 mb-4"
        )}
      >
        <Icon className={cn("text-primary", isCompact ? "w-5 h-5" : "w-6 h-6")} />
      </div>
      <h3
        className={cn(
          "font-semibold text-foreground mb-2",
          isCompact ? "text-base" : "text-lg"
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          "text-foreground/70 dark:text-muted-foreground leading-relaxed whitespace-pre-line",
          isCompact ? "text-xs" : "text-sm"
        )}
      >
        {description}
      </p>
    </div>
  );
};

export default TeaserCard;
