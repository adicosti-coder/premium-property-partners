import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, Crown, Medal, Users, Trophy, Star, ExternalLink } from "lucide-react";
import UserBadges from "@/components/UserBadges";
import { cn } from "@/lib/utils";

interface UserRankEntry {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  badge_count: number;
  total_votes: number;
  article_count: number;
  win_count: number;
}

interface UserLeaderboardProps {
  maxDisplay?: number;
  className?: string;
}

const UserLeaderboard = ({ maxDisplay = 10, className }: UserLeaderboardProps) => {
  const { language } = useLanguage();

  const translations = {
    ro: {
      title: "Top Contributori",
      subtitle: "Clasament bazat pe badge-uri",
      badges: "badge-uri",
      articles: "articole",
      votes: "voturi",
      wins: "victorii",
      noUsers: "Niciun utilizator în clasament încă",
      anonymous: "Anonim",
    },
    en: {
      title: "Top Contributors",
      subtitle: "Ranking based on badges",
      badges: "badges",
      articles: "articles",
      votes: "votes",
      wins: "wins",
      noUsers: "No users in the leaderboard yet",
      anonymous: "Anonymous",
    },
  };

  const t = translations[language] || translations.ro;

  const { data: users, isLoading } = useQuery({
    queryKey: ["user-leaderboard"],
    queryFn: async () => {
      // Get users with their badge counts
      const { data: badgeCounts, error: badgeError } = await supabase
        .from("user_badges")
        .select("user_id");

      if (badgeError) throw badgeError;

      // Count badges per user
      const badgeCountMap = new Map<string, number>();
      badgeCounts?.forEach((ub) => {
        badgeCountMap.set(ub.user_id, (badgeCountMap.get(ub.user_id) || 0) + 1);
      });

      // Get unique user IDs with badges
      const userIds = [...badgeCountMap.keys()];
      
      if (userIds.length === 0) return [];

      // Fetch profiles
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      if (profileError) throw profileError;

      // Fetch article stats
      const { data: articles, error: articlesError } = await supabase
        .from("user_article_submissions")
        .select("user_id, vote_count, status")
        .in("user_id", userIds)
        .in("status", ["approved", "winner"]);

      if (articlesError) throw articlesError;

      // Calculate stats per user
      const statsMap = new Map<string, { votes: number; articles: number; wins: number }>();
      articles?.forEach((article) => {
        const current = statsMap.get(article.user_id) || { votes: 0, articles: 0, wins: 0 };
        statsMap.set(article.user_id, {
          votes: current.votes + (article.vote_count || 0),
          articles: current.articles + 1,
          wins: current.wins + (article.status === "winner" ? 1 : 0),
        });
      });

      // Combine all data
      const result: UserRankEntry[] = profiles?.map((profile) => ({
        user_id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        badge_count: badgeCountMap.get(profile.id) || 0,
        total_votes: statsMap.get(profile.id)?.votes || 0,
        article_count: statsMap.get(profile.id)?.articles || 0,
        win_count: statsMap.get(profile.id)?.wins || 0,
      })) || [];

      // Sort by badge count (primary), then by votes (secondary)
      result.sort((a, b) => {
        if (b.badge_count !== a.badge_count) {
          return b.badge_count - a.badge_count;
        }
        return b.total_votes - a.total_votes;
      });

      return result.slice(0, maxDisplay);
    },
    staleTime: 60000, // Cache for 1 minute
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-amber-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-slate-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/20";
      case 2:
        return "bg-gradient-to-r from-slate-300/10 to-slate-400/10 border-slate-400/20";
      case 3:
        return "bg-gradient-to-r from-amber-700/10 to-orange-700/10 border-amber-700/20";
      default:
        return "hover:bg-muted/50";
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="p-6 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t.noUsers}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-full">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{t.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {users.map((user, index) => {
          const rank = index + 1;

          return (
            <Link
              key={user.user_id}
              to={`/comunitate/profil/${user.user_id}`}
              className={cn(
                "flex items-center gap-3 p-4 border-b last:border-b-0 transition-colors group cursor-pointer",
                getRankStyle(rank)
              )}
            >
              {/* Rank */}
              <div className="w-8 h-8 flex items-center justify-center shrink-0">
                {getRankIcon(rank)}
              </div>

              {/* Avatar */}
              <Avatar className="w-10 h-10 border-2 border-background shrink-0 group-hover:ring-2 group-hover:ring-primary/30 transition-all">
                <AvatarImage src={user.avatar_url || undefined} alt={user.full_name || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium text-foreground text-sm truncate group-hover:text-primary transition-colors">
                    {user.full_name || t.anonymous}
                  </h4>
                  {user.win_count > 0 && (
                    <Badge variant="outline" className="gap-1 text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                      <Trophy className="w-3 h-3" />
                      {user.win_count}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {user.badge_count} {t.badges}
                  </span>
                  <span>{user.article_count} {t.articles}</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {user.total_votes}
                  </span>
                </div>
              </div>

              {/* Badges Display */}
              <div className="shrink-0 hidden sm:flex items-center gap-2">
                <UserBadges userId={user.user_id} size="sm" maxDisplay={3} />
                <ExternalLink className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default UserLeaderboard;
