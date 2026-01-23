import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Trophy, 
  Heart, 
  PenLine, 
  Calendar, 
  Clock, 
  User as UserIcon,
  Award,
  Gift,
  Sparkles,
  ChevronRight,
  ThumbsUp
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";
import { Link, useNavigate } from "react-router-dom";

interface ContestPeriod {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  prize_description: string;
  is_active: boolean;
  winner_submission_id: string | null;
  winner_announced_at: string | null;
}

interface Submission {
  id: string;
  user_id: string;
  contest_period_id: string | null;
  title: string;
  content: string;
  excerpt: string | null;
  cover_image_url: string | null;
  status: string;
  vote_count: number;
  created_at: string;
  author_name?: string;
}

interface Vote {
  submission_id: string;
}

const CommunityArticles = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dateLocale = language === "ro" ? ro : enUS;
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch active contest
  const { data: activeContest, isLoading: contestLoading } = useQuery({
    queryKey: ["active-contest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contest_periods")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as ContestPeriod | null;
    },
  });

  // Fetch approved submissions
  const { data: submissions, isLoading: submissionsLoading } = useQuery({
    queryKey: ["approved-submissions", activeContest?.id],
    queryFn: async () => {
      let query = supabase
        .from("user_article_submissions")
        .select("*")
        .in("status", ["approved", "winner"])
        .order("vote_count", { ascending: false });

      if (activeContest?.id) {
        query = query.eq("contest_period_id", activeContest.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch author names from profiles
      const userIds = [...new Set(data.map(s => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      return data.map(s => ({
        ...s,
        author_name: profileMap.get(s.user_id) || "Anonim"
      })) as Submission[];
    },
    enabled: !contestLoading,
  });

  // Fetch user's votes
  const { data: userVotes } = useQuery({
    queryKey: ["user-votes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("article_votes")
        .select("submission_id")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as Vote[];
    },
    enabled: !!user,
  });

  // Fetch past winners
  const { data: pastWinners } = useQuery({
    queryKey: ["past-winners"],
    queryFn: async () => {
      const { data: contests, error } = await supabase
        .from("contest_periods")
        .select("*")
        .not("winner_submission_id", "is", null)
        .order("end_date", { ascending: false })
        .limit(5);

      if (error) throw error;

      const winnerIds = contests.map(c => c.winner_submission_id).filter(Boolean);
      if (winnerIds.length === 0) return [];

      const { data: winnerSubmissions } = await supabase
        .from("user_article_submissions")
        .select("*")
        .in("id", winnerIds);

      const userIds = [...new Set(winnerSubmissions?.map(s => s.user_id) || [])];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      const submissionMap = new Map(winnerSubmissions?.map(s => [s.id, { ...s, author_name: profileMap.get(s.user_id) || "Anonim" }]) || []);

      return contests.map(c => ({
        contest: c as ContestPeriod,
        submission: submissionMap.get(c.winner_submission_id!) as Submission | undefined
      })).filter(w => w.submission);
    },
  });

  const votedSubmissionIds = new Set(userVotes?.map(v => v.submission_id) || []);

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      if (!user) throw new Error("Not authenticated");

      const hasVoted = votedSubmissionIds.has(submissionId);

      if (hasVoted) {
        const { error } = await supabase
          .from("article_votes")
          .delete()
          .eq("submission_id", submissionId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("article_votes")
          .insert({ submission_id: submissionId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-votes"] });
      queryClient.invalidateQueries({ queryKey: ["approved-submissions"] });
    },
    onError: () => {
      toast.error(translations[language].voteError);
    },
  });

  const handleVote = (submissionId: string) => {
    if (!user) {
      toast.error(translations[language].loginToVote);
      navigate("/auth", { state: { from: "/comunitate" } });
      return;
    }
    voteMutation.mutate(submissionId);
  };

  const translations = {
    ro: {
      title: "Comunitate",
      subtitle: "Scrie și câștigă! Trimite-ți articolul și poți câștiga o noapte gratuită de cazare.",
      activeContest: "Concurs Activ",
      noActiveContest: "Niciun concurs activ momentan",
      noActiveContestDesc: "Revino în curând pentru un nou concurs!",
      prize: "Premiu",
      endsIn: "Se încheie în",
      ended: "Încheiat",
      submitArticle: "Trimite un Articol",
      articles: "Articole în Concurs",
      noArticles: "Niciun articol încă",
      noArticlesDesc: "Fii primul care trimite un articol!",
      votes: "voturi",
      vote: "Votează",
      voted: "Ai votat",
      loginToVote: "Trebuie să fii autentificat pentru a vota",
      voteError: "Eroare la votare. Încearcă din nou.",
      pastWinners: "Câștigători Anteriori",
      noPastWinners: "Niciun câștigător încă",
      winner: "Câștigător",
      howItWorks: "Cum Funcționează",
      step1Title: "Scrie un articol",
      step1Desc: "Trimite un articol original despre călătorii, Timișoara sau experiențe de cazare.",
      step2Title: "Așteaptă aprobarea",
      step2Desc: "Echipa noastră verifică articolul și îl publică pentru votare.",
      step3Title: "Colectează voturi",
      step3Desc: "Comunitatea votează articolele favorite timp de 3 luni.",
      step4Title: "Câștigă premiul",
      step4Desc: "Articolul cu cele mai multe voturi câștigă o noapte gratuită!",
      readMore: "Citește",
      by: "de",
    },
    en: {
      title: "Community",
      subtitle: "Write and win! Submit your article and you could win a free night stay.",
      activeContest: "Active Contest",
      noActiveContest: "No active contest at the moment",
      noActiveContestDesc: "Come back soon for a new contest!",
      prize: "Prize",
      endsIn: "Ends in",
      ended: "Ended",
      submitArticle: "Submit an Article",
      articles: "Contest Articles",
      noArticles: "No articles yet",
      noArticlesDesc: "Be the first to submit an article!",
      votes: "votes",
      vote: "Vote",
      voted: "Voted",
      loginToVote: "You need to be logged in to vote",
      voteError: "Error voting. Please try again.",
      pastWinners: "Past Winners",
      noPastWinners: "No winners yet",
      winner: "Winner",
      howItWorks: "How It Works",
      step1Title: "Write an article",
      step1Desc: "Submit an original article about travel, Timișoara, or accommodation experiences.",
      step2Title: "Wait for approval",
      step2Desc: "Our team reviews your article and publishes it for voting.",
      step3Title: "Collect votes",
      step3Desc: "The community votes for their favorite articles over 3 months.",
      step4Title: "Win the prize",
      step4Desc: "The article with the most votes wins a free night!",
      readMore: "Read",
      by: "by",
    },
  };

  const t = translations[language] || translations.ro;

  const isContestEnded = activeContest && new Date(activeContest.end_date) < new Date();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-4">
              <Trophy className="w-5 h-5" />
              <span className="font-medium">{t.activeContest}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">
              {t.title}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              {t.subtitle}
            </p>
            <Button size="lg" onClick={() => navigate("/comunitate/trimite")} className="gap-2">
              <PenLine className="w-5 h-5" />
              {t.submitArticle}
            </Button>
          </div>

          {/* Active Contest Banner */}
          {contestLoading ? (
            <Skeleton className="h-32 w-full mb-8 rounded-xl" />
          ) : activeContest ? (
            <Card className="mb-8 overflow-hidden border-primary/30 bg-gradient-to-r from-primary/5 via-transparent to-amber-500/5">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <Trophy className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{activeContest.name}</h3>
                      {activeContest.description && (
                        <p className="text-muted-foreground">{activeContest.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-500" />
                      <span className="text-foreground font-medium">{t.prize}: {activeContest.prize_description}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className={isContestEnded ? "text-destructive" : "text-muted-foreground"}>
                        {isContestEnded ? t.ended : `${t.endsIn} ${formatDistanceToNow(new Date(activeContest.end_date), { locale: dateLocale })}`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8 border-dashed">
              <CardContent className="p-8 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">{t.noActiveContest}</h3>
                <p className="text-muted-foreground">{t.noActiveContestDesc}</p>
              </CardContent>
            </Card>
          )}

          {/* How It Works */}
          <div className="mb-12">
            <h2 className="text-2xl font-serif font-bold text-foreground mb-6 text-center">{t.howItWorks}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { icon: PenLine, title: t.step1Title, desc: t.step1Desc },
                { icon: Clock, title: t.step2Title, desc: t.step2Desc },
                { icon: ThumbsUp, title: t.step3Title, desc: t.step3Desc },
                { icon: Award, title: t.step4Title, desc: t.step4Desc },
              ].map((step, i) => (
                <Card key={i} className="text-center">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">
                      {i + 1}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Articles Grid */}
          <Tabs defaultValue="articles" className="mb-12">
            <TabsList className="mb-6">
              <TabsTrigger value="articles" className="gap-2">
                <Sparkles className="w-4 h-4" />
                {t.articles}
              </TabsTrigger>
              <TabsTrigger value="winners" className="gap-2">
                <Trophy className="w-4 h-4" />
                {t.pastWinners}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="articles">
              {submissionsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <Skeleton className="h-48 w-full" />
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-2/3" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : !submissions || submissions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <PenLine className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">{t.noArticles}</h3>
                    <p className="text-muted-foreground mb-6">{t.noArticlesDesc}</p>
                    <Button onClick={() => navigate("/comunitate/trimite")} className="gap-2">
                      <PenLine className="w-4 h-4" />
                      {t.submitArticle}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {submissions.map((submission, index) => {
                    const hasVoted = votedSubmissionIds.has(submission.id);
                    const isWinner = submission.status === "winner";

                    return (
                      <Card key={submission.id} className={`overflow-hidden group hover:shadow-lg transition-shadow cursor-pointer ${isWinner ? 'border-amber-500/50 ring-2 ring-amber-500/20' : ''}`}>
                        <Link to={`/comunitate/articol/${submission.id}`}>
                          {submission.cover_image_url && (
                            <div className="relative h-48 overflow-hidden">
                              <img
                                src={submission.cover_image_url}
                                alt={submission.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-3 left-3 flex gap-2">
                                {index < 3 && (
                                  <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                                    #{index + 1}
                                  </Badge>
                                )}
                                {isWinner && (
                                  <Badge className="bg-amber-500 text-white">
                                    <Trophy className="w-3 h-3 mr-1" />
                                    {t.winner}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                          <CardContent className="p-6">
                            <h3 className="text-lg font-serif font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                              {submission.title}
                            </h3>
                            {submission.excerpt && (
                              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                {submission.excerpt}
                              </p>
                            )}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <UserIcon className="w-4 h-4" />
                                <span>{t.by} {submission.author_name}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Link>
                        <CardContent className="pt-0 pb-4 px-6">
                          <div className="flex items-center justify-between">
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="text-muted-foreground"
                            >
                              <Link to={`/comunitate/articol/${submission.id}`}>
                                <ChevronRight className="w-4 h-4 mr-1" />
                                {t.readMore}
                              </Link>
                            </Button>
                            <Button
                              variant={hasVoted ? "default" : "outline"}
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleVote(submission.id);
                              }}
                              disabled={voteMutation.isPending}
                              className="gap-1"
                            >
                              <Heart className={`w-4 h-4 ${hasVoted ? 'fill-current' : ''}`} />
                              {submission.vote_count} {t.votes}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="winners">
              {!pastWinners || pastWinners.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-12 text-center">
                    <Trophy className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">{t.noPastWinners}</h3>
                  </CardContent>
                </Card>
              ) : (
              <div className="space-y-4">
                  {pastWinners.map((winner) => (
                    <Link key={winner.contest.id} to={`/comunitate/articol/${winner.submission?.id}`}>
                      <Card className="overflow-hidden border-amber-500/30 hover:shadow-lg transition-shadow cursor-pointer">
                        <CardContent className="p-6">
                          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                            <div className="p-3 bg-amber-500/10 rounded-full shrink-0">
                              <Trophy className="w-8 h-8 text-amber-500" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs">
                                  {format(new Date(winner.contest.end_date), "MMM yyyy", { locale: dateLocale })}
                                </Badge>
                                <span className="text-sm text-muted-foreground">{winner.contest.name}</span>
                              </div>
                              <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{winner.submission?.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t.by} {winner.submission?.author_name} • {winner.submission?.vote_count} {t.votes}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1 text-amber-600 font-medium text-sm">
                                <Gift className="w-4 h-4" />
                                {winner.contest.prize_description}
                              </span>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
      <AccessibilityPanel />
    </div>
  );
};

export default CommunityArticles;