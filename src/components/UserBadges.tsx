import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Award, 
  Trophy, 
  Heart, 
  Star, 
  FileText, 
  MessageCircle, 
  Pencil 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserBadgesProps {
  userId: string;
  showAll?: boolean;
  maxDisplay?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface BadgeData {
  id: string;
  code: string;
  name_ro: string;
  name_en: string;
  description_ro: string;
  description_en: string;
  icon: string;
  color: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  earned_at: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  award: Award,
  trophy: Trophy,
  heart: Heart,
  star: Star,
  "file-text": FileText,
  "message-circle": MessageCircle,
  pencil: Pencil,
};

const tierColors: Record<string, string> = {
  bronze: "bg-amber-600/20 text-amber-700 border-amber-600/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
  silver: "bg-slate-400/20 text-slate-600 border-slate-400/30 dark:bg-slate-300/20 dark:text-slate-300 dark:border-slate-400/30",
  gold: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30 dark:bg-yellow-400/20 dark:text-yellow-400 dark:border-yellow-500/30",
  platinum: "bg-violet-500/20 text-violet-700 border-violet-500/30 dark:bg-violet-400/20 dark:text-violet-300 dark:border-violet-400/30",
};

const tierGlow: Record<string, string> = {
  bronze: "",
  silver: "shadow-sm",
  gold: "shadow-md shadow-yellow-500/20",
  platinum: "shadow-lg shadow-violet-500/30 animate-pulse",
};

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

const iconSizeClasses = {
  sm: "w-3 h-3",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

const UserBadges = ({ 
  userId, 
  showAll = false, 
  maxDisplay = 5, 
  size = "md",
  className 
}: UserBadgesProps) => {
  const { language } = useLanguage();

  const { data: badges, isLoading } = useQuery({
    queryKey: ["user-badges", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          id,
          earned_at,
          badge:badge_id (
            id,
            code,
            name_ro,
            name_en,
            description_ro,
            description_en,
            icon,
            color,
            tier
          )
        `)
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        code: item.badge.code,
        name_ro: item.badge.name_ro,
        name_en: item.badge.name_en,
        description_ro: item.badge.description_ro,
        description_en: item.badge.description_en,
        icon: item.badge.icon,
        color: item.badge.color,
        tier: item.badge.tier,
        earned_at: item.earned_at,
      })) as BadgeData[];
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className={cn("flex gap-1", className)}>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className={cn("rounded-full", sizeClasses[size])} />
        ))}
      </div>
    );
  }

  if (!badges || badges.length === 0) {
    return null;
  }

  const displayBadges = showAll ? badges : badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  return (
    <div className={cn("flex flex-wrap gap-1.5 items-center", className)}>
      {displayBadges.map((badge) => {
        const IconComponent = iconMap[badge.icon] || Award;
        const name = language === "ro" ? badge.name_ro : badge.name_en;
        const description = language === "ro" ? badge.description_ro : badge.description_en;

        return (
          <Tooltip key={badge.id}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "rounded-full border flex items-center justify-center cursor-pointer transition-transform hover:scale-110",
                  sizeClasses[size],
                  tierColors[badge.tier],
                  tierGlow[badge.tier]
                )}
              >
                <IconComponent className={iconSizeClasses[size]} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[200px]">
              <div className="text-center">
                <p className="font-semibold text-sm">{name}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      })}
      
      {!showAll && remainingCount > 0 && (
        <Badge variant="secondary" className="text-xs px-2 py-0.5">
          +{remainingCount}
        </Badge>
      )}
    </div>
  );
};

export default UserBadges;
