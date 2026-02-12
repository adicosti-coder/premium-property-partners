import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  FileText, 
  Heart, 
  Trophy, 
  Calendar,
  Award,
  Crown,
  Star
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import BadgeShowcase from "@/components/BadgeShowcase";
import { formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";

interface ProfileData {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface ArticleData {
  id: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  vote_count: number;
  status: string;
  created_at: string;
}

interface UserStats {
  totalArticles: number;
  totalVotes: number;
  totalBadges: number;
  wins: number;
}

const PublicProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { language } = useLanguage();

  const t = {
    ro: {
      back: "Înapoi la comunitate",
      memberSince: "Membru din",
      articles: "Articole publicate",
      votes: "Voturi primite",
      badges: "Badge-uri",
      wins: "Câștiguri concurs",
      noArticles: "Niciun articol publicat încă",
      viewArticle: "Citește articolul",
      loading: "Se încarcă profilul...",
      notFound: "Profilul nu a fost găsit",
      notFoundDesc: "Utilizatorul căutat nu există sau profilul nu este public.",
      backToHome: "Înapoi acasă",
      publishedArticles: "Articole publicate",
      badgeCollection: "Colecție de badge-uri",
      anonymousUser: "Utilizator anonim",
      winner: "Câștigător",
    },
    en: {
      back: "Back to community",
      memberSince: "Member since",
      articles: "Published articles",
      votes: "Votes received",
      badges: "Badges",
      wins: "Contest wins",
      noArticles: "No published articles yet",
      viewArticle: "Read article",
      loading: "Loading profile...",
      notFound: "Profile not found",
      notFoundDesc: "The user you're looking for doesn't exist or the profile is not public.",
      backToHome: "Back home",
      publishedArticles: "Published Articles",
      badgeCollection: "Badge Collection",
      anonymousUser: "Anonymous User",
      winner: "Winner",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .rpc("get_public_profile", { p_user_id: userId })
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data as ProfileData;
    },
    enabled: !!userId,
  });

  // Fetch user's published articles
  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["public-profile-articles", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("user_article_submissions")
        .select("id, title, excerpt, cover_image_url, vote_count, status, created_at")
        .eq("user_id", userId)
        .in("status", ["approved", "winner"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching articles:", error);
        return [];
      }

      return data as ArticleData[];
    },
    enabled: !!userId,
  });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ["public-profile-stats", userId],
    queryFn: async (): Promise<UserStats> => {
      if (!userId) return { totalArticles: 0, totalVotes: 0, totalBadges: 0, wins: 0 };

      // Get badge count
      const { count: badgeCount } = await supabase
        .from("user_badges")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      // Calculate stats from articles
      const wins = articles.filter(a => a.status === "winner").length;
      const totalVotes = articles.reduce((sum, a) => sum + a.vote_count, 0);

      return {
        totalArticles: articles.length,
        totalVotes,
        totalBadges: badgeCount || 0,
        wins,
      };
    },
    enabled: !!userId && articles.length >= 0,
  });

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === "ro" ? ro : enUS,
    });
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

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-24 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="flex items-center gap-6">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-24 max-w-4xl text-center">
          <div className="space-y-6">
            <Trophy className="w-16 h-16 mx-auto text-muted-foreground/50" />
            <h1 className="text-2xl font-bold">{text.notFound}</h1>
            <p className="text-muted-foreground">{text.notFoundDesc}</p>
            <Button asChild>
              <Link to="/comunitate">
                <ArrowLeft className="w-4 h-4 mr-2" />
                {text.backToHome}
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const displayName = profile.full_name || text.anonymousUser;
  
  const breadcrumbItems = [
    { label: language === 'ro' ? 'Comunitate' : 'Community', href: '/comunitate' },
    { label: displayName }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={`${displayName} - ${language === 'ro' ? 'Profil Comunitate' : 'Community Profile'}`}
        description={`${text.articles}: ${stats?.totalArticles || 0}, ${text.votes}: ${stats?.totalVotes || 0}`}
      />
      <Header />
      
      <main className="container mx-auto px-4 py-24 max-w-4xl">
        {/* Breadcrumb */}
        <PageBreadcrumb items={breadcrumbItems} className="mb-6" />
        
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/comunitate">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {text.back}
          </Link>
        </Button>

        {/* Profile Header */}
        <Card className="mb-8 overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20" />
          <CardContent className="relative pt-0">
            <div className="flex flex-col md:flex-row items-center md:items-end gap-4 -mt-12">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                <AvatarImage src={profile.avatar_url || undefined} alt={displayName} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                  {getInitials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center md:text-left pb-2">
                <h1 className="text-2xl font-bold">{displayName}</h1>
                <p className="text-sm text-muted-foreground flex items-center justify-center md:justify-start gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {text.memberSince} {formatDate(profile.created_at)}
                </p>
              </div>

              {/* Stats Badges on Desktop */}
              <div className="hidden md:flex items-center gap-2">
                {stats && stats.wins > 0 && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                    <Crown className="w-3 h-3 mr-1" />
                    {stats.wins}x {text.winner}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="text-center p-4 hover:shadow-md transition-shadow">
            <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats?.totalArticles || 0}</p>
            <p className="text-xs text-muted-foreground">{text.articles}</p>
          </Card>
          
          <Card className="text-center p-4 hover:shadow-md transition-shadow">
            <Heart className="w-6 h-6 mx-auto mb-2 text-rose-500" />
            <p className="text-2xl font-bold">{stats?.totalVotes || 0}</p>
            <p className="text-xs text-muted-foreground">{text.votes}</p>
          </Card>
          
          <Card className="text-center p-4 hover:shadow-md transition-shadow">
            <Award className="w-6 h-6 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{stats?.totalBadges || 0}</p>
            <p className="text-xs text-muted-foreground">{text.badges}</p>
          </Card>
          
          <Card className="text-center p-4 hover:shadow-md transition-shadow">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{stats?.wins || 0}</p>
            <p className="text-xs text-muted-foreground">{text.wins}</p>
          </Card>
        </div>

        {/* Badge Showcase */}
        <BadgeShowcase userId={userId!} className="mb-8" />

        {/* Published Articles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {text.publishedArticles}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {articlesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{text.noArticles}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    to={`/comunitate/articol/${article.id}`}
                    className="block group"
                  >
                    <Card className="overflow-hidden hover:shadow-md transition-all hover:border-primary/30">
                      <div className="flex gap-4 p-4">
                        {article.cover_image_url && (
                          <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted">
                            <img
                              src={article.cover_image_url}
                              alt={article.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                              {article.title}
                            </h3>
                            {article.status === "winner" && (
                              <Badge className="flex-shrink-0 bg-amber-500/10 text-amber-600 border-amber-500/20">
                                <Crown className="w-3 h-3 mr-1" />
                                {text.winner}
                              </Badge>
                            )}
                          </div>
                          
                          {article.excerpt && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {article.excerpt}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Heart className="w-3 h-3" />
                              {article.vote_count}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(article.created_at)}
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 self-center">
                          <Star className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
      <GlobalConversionWidgets showExitIntent={false} showSocialProof={false} />
      <BackToTop />
    </div>
  );
};

export default PublicProfile;