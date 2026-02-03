import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Medal, TrendingUp, Heart, Crown, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import UserBadges from "@/components/UserBadges";

interface LeaderboardEntry {
  id: string;
  title: string;
  vote_count: number;
  author_name: string;
  user_id: string;
  cover_image_url: string | null;
  previousRank?: number;
}

interface LiveLeaderboardProps {
  contestId?: string;
}

const LiveLeaderboard = ({ contestId }: LiveLeaderboardProps) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [previousRanks, setPreviousRanks] = useState<Map<string, number>>(new Map());

  const translations = {
    ro: {
      title: "Clasament Live",
      subtitle: "Actualizare în timp real",
      votes: "voturi",
      noEntries: "Niciun articol în clasament",
      rank: "Loc",
      trending: "În creștere",
    },
    en: {
      title: "Live Leaderboard",
      subtitle: "Real-time updates",
      votes: "votes",
      noEntries: "No articles in leaderboard",
      rank: "Rank",
      trending: "Trending",
    },
  };

  const t = translations[language] || translations.ro;

  const { data: entries, isLoading } = useQuery({
    queryKey: ["leaderboard", contestId],
    queryFn: async () => {
      let query = supabase
        .from("user_article_submissions")
        .select("id, title, vote_count, user_id, cover_image_url")
        .in("status", ["approved", "winner"])
        .order("vote_count", { ascending: false })
        .limit(10);

      if (contestId) {
        query = query.eq("contest_period_id", contestId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch author names
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return data.map((entry, index) => ({
        ...entry,
        author_name: profileMap.get(entry.user_id) || "Anonim",
        previousRank: previousRanks.get(entry.id),
      })) as LeaderboardEntry[];
    },
    refetchInterval: 30000, // Also poll every 30 seconds as backup
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("leaderboard-votes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "article_votes",
        },
        () => {
          // Invalidate and refetch leaderboard when votes change
          queryClient.invalidateQueries({ queryKey: ["leaderboard", contestId] });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_article_submissions",
          filter: "vote_count=neq.vote_count",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leaderboard", contestId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contestId, queryClient]);

  // Update previous ranks when entries change
  useEffect(() => {
    if (entries) {
      const newRanks = new Map<string, number>();
      entries.forEach((entry, index) => {
        newRanks.set(entry.id, index + 1);
      });
      setPreviousRanks(newRanks);
    }
  }, [entries]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-amber-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-300/20 to-gray-400/20 border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-700/20 to-orange-700/20 border-amber-700/30";
      default:
        return "bg-card hover:bg-muted/50";
    }
  };

  const getRankChange = (currentRank: number, previousRank?: number) => {
    if (!previousRank || previousRank === currentRank) return null;
    if (previousRank > currentRank) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1 text-green-500 text-xs"
        >
          <TrendingUp className="w-3 h-3" />
          +{previousRank - currentRank}
        </motion.div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-3/4 mb-1" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Card className="overflow-hidden border-dashed">
        <CardContent className="p-6 text-center">
          <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{t.noEntries}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{t.title}</CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="w-3 h-3 text-orange-500 animate-pulse" />
                {t.subtitle}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <AnimatePresence mode="popLayout">
          {entries.map((entry, index) => {
            const rank = index + 1;
            const rankChange = getRankChange(rank, entry.previousRank);

            return (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  to={`/comunitate/articol/${entry.id}`}
                  className={`flex items-center gap-3 p-4 border-b last:border-b-0 transition-colors ${getRankColor(rank)}`}
                >
                  {/* Rank */}
                  <div className="w-10 h-10 flex items-center justify-center shrink-0">
                    {getRankIcon(rank)}
                  </div>

                  {/* Avatar/Image */}
                  {entry.cover_image_url ? (
                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                      <img
                        src={entry.cover_image_url}
                        alt={entry.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Trophy className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {entry.title}
                    </h4>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        {entry.author_name}
                      </p>
                      <UserBadges userId={entry.user_id} size="sm" maxDisplay={2} />
                    </div>
                  </div>

                  {/* Votes & Rank Change */}
                  <div className="flex items-center gap-2 shrink-0">
                    {rankChange}
                    <Badge 
                      variant={rank <= 3 ? "default" : "outline"} 
                      className={`gap-1 ${rank === 1 ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0' : ''}`}
                    >
                      <Heart className={`w-3 h-3 ${rank <= 3 ? 'fill-current' : ''}`} />
                      {entry.vote_count}
                    </Badge>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default LiveLeaderboard;
