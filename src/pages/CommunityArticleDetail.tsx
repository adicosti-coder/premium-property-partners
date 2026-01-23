import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AccessibilityPanel from "@/components/AccessibilityPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  Trophy, 
  Heart, 
  ArrowLeft, 
  User as UserIcon,
  Calendar,
  MessageCircle,
  Send,
  Trash2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { toast } from "sonner";
import { User } from "@supabase/supabase-js";

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

interface Comment {
  id: string;
  submission_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

const CommunityArticleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const dateLocale = language === "ro" ? ro : enUS;
  const [user, setUser] = useState<User | null>(null);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch article
  const { data: article, isLoading: articleLoading } = useQuery({
    queryKey: ["community-article", id],
    queryFn: async () => {
      if (!id) throw new Error("No ID provided");
      
      const { data, error } = await supabase
        .from("user_article_submissions")
        .select("*")
        .eq("id", id)
        .in("status", ["approved", "winner"])
        .single();

      if (error) throw error;

      // Fetch author name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user_id)
        .single();

      return {
        ...data,
        author_name: profile?.full_name || "Anonim"
      } as Submission;
    },
    enabled: !!id,
  });

  // Fetch comments
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["community-article-comments", id],
    queryFn: async () => {
      if (!id) return [];
      
      const { data, error } = await supabase
        .from("community_article_comments")
        .select("*")
        .eq("submission_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch author names
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      return data.map(c => ({
        ...c,
        author_name: profileMap.get(c.user_id) || "Anonim"
      })) as Comment[];
    },
    enabled: !!id,
  });

  // Fetch user's vote
  const { data: userVote } = useQuery({
    queryKey: ["user-article-vote", id, user?.id],
    queryFn: async () => {
      if (!user || !id) return null;
      const { data } = await supabase
        .from("article_votes")
        .select("id")
        .eq("submission_id", id)
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user && !!id,
  });

  const hasVoted = !!userVote;

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Not authenticated");

      if (hasVoted) {
        const { error } = await supabase
          .from("article_votes")
          .delete()
          .eq("submission_id", id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("article_votes")
          .insert({ submission_id: id, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-article-vote", id] });
      queryClient.invalidateQueries({ queryKey: ["community-article", id] });
    },
    onError: () => {
      toast.error(t.voteError);
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("community_article_comments")
        .insert({
          submission_id: id,
          user_id: user.id,
          content,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["community-article-comments", id] });
      toast.success(t.commentAdded);
    },
    onError: () => {
      toast.error(t.commentError);
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("community_article_comments")
        .delete()
        .eq("id", commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-article-comments", id] });
      toast.success(t.commentDeleted);
    },
    onError: () => {
      toast.error(t.deleteError);
    },
  });

  const handleVote = () => {
    if (!user) {
      toast.error(t.loginToVote);
      navigate("/auth", { state: { from: `/comunitate/articol/${id}` } });
      return;
    }
    voteMutation.mutate();
  };

  const handleAddComment = () => {
    if (!user) {
      toast.error(t.loginToComment);
      navigate("/auth", { state: { from: `/comunitate/articol/${id}` } });
      return;
    }
    if (!newComment.trim()) {
      toast.error(t.emptyComment);
      return;
    }
    addCommentMutation.mutate(newComment.trim());
  };

  const translations = {
    ro: {
      backToArticles: "Înapoi la articole",
      by: "de",
      votes: "voturi",
      vote: "Votează",
      voted: "Ai votat",
      loginToVote: "Trebuie să fii autentificat pentru a vota",
      voteError: "Eroare la votare. Încearcă din nou.",
      winner: "Câștigător",
      comments: "Comentarii",
      noComments: "Niciun comentariu încă. Fii primul care comentează!",
      addComment: "Adaugă un comentariu",
      commentPlaceholder: "Scrie un comentariu...",
      send: "Trimite",
      loginToComment: "Trebuie să fii autentificat pentru a comenta",
      emptyComment: "Comentariul nu poate fi gol",
      commentAdded: "Comentariu adăugat cu succes!",
      commentError: "Eroare la adăugarea comentariului",
      commentDeleted: "Comentariu șters",
      deleteError: "Eroare la ștergerea comentariului",
      articleNotFound: "Articolul nu a fost găsit",
      published: "Publicat",
    },
    en: {
      backToArticles: "Back to articles",
      by: "by",
      votes: "votes",
      vote: "Vote",
      voted: "Voted",
      loginToVote: "You need to be logged in to vote",
      voteError: "Error voting. Please try again.",
      winner: "Winner",
      comments: "Comments",
      noComments: "No comments yet. Be the first to comment!",
      addComment: "Add a comment",
      commentPlaceholder: "Write a comment...",
      send: "Send",
      loginToComment: "You need to be logged in to comment",
      emptyComment: "Comment cannot be empty",
      commentAdded: "Comment added successfully!",
      commentError: "Error adding comment",
      commentDeleted: "Comment deleted",
      deleteError: "Error deleting comment",
      articleNotFound: "Article not found",
      published: "Published",
    },
  };

  const t = translations[language] || translations.ro;

  if (articleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-4xl">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-64 w-full rounded-xl mb-8" />
            <Skeleton className="h-10 w-3/4 mb-4" />
            <Skeleton className="h-4 w-48 mb-8" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">{t.articleNotFound}</h1>
            <Button onClick={() => navigate("/comunitate")} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.backToArticles}
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isWinner = article.status === "winner";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          {/* Back button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate("/comunitate")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToArticles}
          </Button>

          {/* Cover Image */}
          {article.cover_image_url && (
            <div className="relative h-64 md:h-96 rounded-xl overflow-hidden mb-8">
              <img
                src={article.cover_image_url}
                alt={article.title}
                className="w-full h-full object-cover"
              />
              {isWinner && (
                <div className="absolute top-4 left-4">
                  <Badge className="bg-amber-500 text-white gap-1 px-3 py-1">
                    <Trophy className="w-4 h-4" />
                    {t.winner}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Article Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground mb-4">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                <span>{t.by} {article.author_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{t.published} {format(new Date(article.created_at), "d MMMM yyyy", { locale: dateLocale })}</span>
              </div>
            </div>
          </div>

          {/* Vote Section */}
          <Card className="mb-8 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <p className="text-2xl font-bold text-foreground">{article.vote_count} {t.votes}</p>
                  <p className="text-sm text-muted-foreground">
                    {hasVoted ? t.voted : t.vote}
                  </p>
                </div>
                <Button
                  size="lg"
                  variant={hasVoted ? "default" : "outline"}
                  onClick={handleVote}
                  disabled={voteMutation.isPending}
                  className="gap-2 min-w-[140px]"
                >
                  <Heart className={`w-5 h-5 ${hasVoted ? 'fill-current' : ''}`} />
                  {hasVoted ? t.voted : t.vote}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Article Content */}
          <article className="prose prose-lg max-w-none mb-12">
            <div className="whitespace-pre-wrap text-foreground leading-relaxed">
              {article.content}
            </div>
          </article>

          <Separator className="my-12" />

          {/* Comments Section */}
          <section>
            <h2 className="text-2xl font-serif font-bold text-foreground mb-6 flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              {t.comments} ({comments?.length || 0})
            </h2>

            {/* Add Comment Form */}
            <Card className="mb-8">
              <CardContent className="p-6">
                <h3 className="font-semibold text-foreground mb-4">{t.addComment}</h3>
                <Textarea
                  placeholder={t.commentPlaceholder}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="mb-4 min-h-[100px]"
                />
                <Button 
                  onClick={handleAddComment}
                  disabled={addCommentMutation.isPending || !newComment.trim()}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  {t.send}
                </Button>
              </CardContent>
            </Card>

            {/* Comments List */}
            {commentsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-32 mb-2" />
                          <Skeleton className="h-4 w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : !comments || comments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center">
                  <MessageCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">{t.noComments}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <Card key={comment.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {comment.author_name?.charAt(0)?.toUpperCase() || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="font-medium text-foreground">{comment.author_name}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                {formatDistanceToNow(new Date(comment.created_at), { 
                                  addSuffix: true, 
                                  locale: dateLocale 
                                })}
                              </span>
                            </div>
                            {user?.id === comment.user_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteCommentMutation.mutate(comment.id)}
                                disabled={deleteCommentMutation.isPending}
                                className="text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <p className="text-foreground whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
      <AccessibilityPanel />
    </div>
  );
};

export default CommunityArticleDetail;
