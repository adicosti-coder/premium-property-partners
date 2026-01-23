import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Award, 
  Trophy, 
  Heart, 
  Star, 
  FileText, 
  MessageCircle, 
  Pencil,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BadgeShowcaseProps {
  userId: string;
  className?: string;
}

interface BadgeDefinition {
  id: string;
  code: string;
  name_ro: string;
  name_en: string;
  description_ro: string;
  description_en: string;
  icon: string;
  color: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  requirement_type: string;
  requirement_value: number;
  earned?: boolean;
  earned_at?: string;
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

const tierLabels = {
  bronze: { ro: "Bronz", en: "Bronze" },
  silver: { ro: "Argint", en: "Silver" },
  gold: { ro: "Aur", en: "Gold" },
  platinum: { ro: "Platină", en: "Platinum" },
};

const BadgeShowcase = ({ userId, className }: BadgeShowcaseProps) => {
  const { language } = useLanguage();

  // Fetch all badges with user's earned status
  const { data: allBadges, isLoading } = useQuery({
    queryKey: ["all-badges-with-user-status", userId],
    queryFn: async () => {
      // Fetch all available badges
      const { data: badges, error: badgesError } = await supabase
        .from("community_badges")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (badgesError) throw badgesError;

      // Fetch user's earned badges
      const { data: userBadges, error: userError } = await supabase
        .from("user_badges")
        .select("badge_id, earned_at")
        .eq("user_id", userId);

      if (userError) throw userError;

      const earnedMap = new Map(
        userBadges?.map((ub) => [ub.badge_id, ub.earned_at]) || []
      );

      return badges.map((badge) => ({
        ...badge,
        earned: earnedMap.has(badge.id),
        earned_at: earnedMap.get(badge.id),
      })) as BadgeDefinition[];
    },
    enabled: !!userId,
  });

  const translations = {
    ro: {
      title: "Colecție de Badge-uri",
      earned: "Obținut",
      locked: "Blocat",
      progress: "Progres",
    },
    en: {
      title: "Badge Collection",
      earned: "Earned",
      locked: "Locked",
      progress: "Progress",
    },
  };

  const t = translations[language] || translations.ro;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!allBadges || allBadges.length === 0) {
    return null;
  }

  const earnedCount = allBadges.filter((b) => b.earned).length;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            {t.title}
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {earnedCount} / {allBadges.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {allBadges.map((badge) => {
            const IconComponent = iconMap[badge.icon] || Award;
            const name = language === "ro" ? badge.name_ro : badge.name_en;
            const description = language === "ro" ? badge.description_ro : badge.description_en;
            const tierLabel = tierLabels[badge.tier][language];

            return (
              <div
                key={badge.id}
                className={cn(
                  "relative p-4 rounded-xl border text-center transition-all",
                  badge.earned
                    ? tierColors[badge.tier]
                    : "bg-muted/30 border-muted text-muted-foreground opacity-50"
                )}
              >
                {!badge.earned && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-3 h-3" />
                  </div>
                )}
                <div
                  className={cn(
                    "w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center",
                    badge.earned ? "bg-background/50" : "bg-muted"
                  )}
                >
                  <IconComponent className="w-6 h-6" />
                </div>
                <p className="font-medium text-sm leading-tight mb-1">{name}</p>
                <p className="text-xs opacity-70 leading-tight">{description}</p>
                <p className="text-[10px] mt-2 uppercase tracking-wide opacity-50">
                  {tierLabel}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default BadgeShowcase;
