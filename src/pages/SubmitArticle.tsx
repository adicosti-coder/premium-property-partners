import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Send, FileText, AlertCircle, CheckCircle, Trophy } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SubmitArticle = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth", { state: { from: "/comunitate/trimite" } });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth", { state: { from: "/comunitate/trimite" } });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch active contest
  const { data: activeContest } = useQuery({
    queryKey: ["active-contest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contest_periods")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch user's existing submissions
  const { data: userSubmissions } = useQuery({
    queryKey: ["user-submissions", user?.id, activeContest?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_article_submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_article_submissions")
        .insert({
          user_id: user.id,
          title,
          content,
          excerpt: excerpt || content.substring(0, 200),
          contest_period_id: activeContest?.id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(translations[language].successMessage);
      navigate("/comunitate");
    },
    onError: (error) => {
      console.error("Submit error:", error);
      toast.error(translations[language].errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error(translations[language].requiredFields);
      return;
    }
    if (content.length < 500) {
      toast.error(translations[language].minContent);
      return;
    }
    submitMutation.mutate();
  };

  const translations = {
    ro: {
      title: "Trimite un Articol",
      subtitle: "Scrie un articol original și câștigă o noapte gratuită de cazare!",
      back: "Înapoi la Comunitate",
      articleTitle: "Titlul Articolului",
      articleTitlePlaceholder: "Un titlu captivant pentru articolul tău...",
      excerpt: "Rezumat (opțional)",
      excerptPlaceholder: "O scurtă descriere a articolului (va fi generată automat dacă lași gol)...",
      content: "Conținutul Articolului",
      contentPlaceholder: "Scrie aici articolul tău... (minim 500 caractere)",
      submit: "Trimite Articolul",
      submitting: "Se trimite...",
      successMessage: "Articolul a fost trimis! Va fi verificat de echipa noastră.",
      errorMessage: "Eroare la trimitere. Încearcă din nou.",
      requiredFields: "Titlul și conținutul sunt obligatorii.",
      minContent: "Articolul trebuie să aibă minim 500 caractere.",
      guidelines: "Ghid de Scriere",
      guideline1: "Scrie conținut original, nu copiat de pe alte surse.",
      guideline2: "Alege un subiect legat de călătorii, Timișoara sau cazare.",
      guideline3: "Folosește un stil prietenos și informativ.",
      guideline4: "Minim 500 caractere, ideal 1000-2000.",
      noContest: "Nu există un concurs activ",
      noContestDesc: "Poți trimite articolul, dar nu va fi inclus în concurs.",
      activeContestInfo: "Concurs activ",
      yourSubmissions: "Articolele Tale",
      pending: "În așteptare",
      approved: "Aprobat",
      rejected: "Respins",
      winner: "Câștigător",
      characters: "caractere",
    },
    en: {
      title: "Submit an Article",
      subtitle: "Write an original article and win a free night stay!",
      back: "Back to Community",
      articleTitle: "Article Title",
      articleTitlePlaceholder: "A captivating title for your article...",
      excerpt: "Summary (optional)",
      excerptPlaceholder: "A short description of the article (will be auto-generated if left empty)...",
      content: "Article Content",
      contentPlaceholder: "Write your article here... (minimum 500 characters)",
      submit: "Submit Article",
      submitting: "Submitting...",
      successMessage: "Article submitted! It will be reviewed by our team.",
      errorMessage: "Error submitting. Please try again.",
      requiredFields: "Title and content are required.",
      minContent: "Article must have at least 500 characters.",
      guidelines: "Writing Guidelines",
      guideline1: "Write original content, not copied from other sources.",
      guideline2: "Choose a topic related to travel, Timișoara, or accommodation.",
      guideline3: "Use a friendly and informative style.",
      guideline4: "Minimum 500 characters, ideally 1000-2000.",
      noContest: "No active contest",
      noContestDesc: "You can submit the article, but it won't be included in a contest.",
      activeContestInfo: "Active contest",
      yourSubmissions: "Your Submissions",
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      winner: "Winner",
      characters: "characters",
    },
  };

  const t = translations[language] || translations.ro;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="text-amber-600 bg-amber-100 px-2 py-1 rounded text-xs">{t.pending}</span>;
      case "approved":
        return <span className="text-green-600 bg-green-100 px-2 py-1 rounded text-xs">{t.approved}</span>;
      case "rejected":
        return <span className="text-red-600 bg-red-100 px-2 py-1 rounded text-xs">{t.rejected}</span>;
      case "winner":
        return <span className="text-amber-600 bg-amber-100 px-2 py-1 rounded text-xs flex items-center gap-1"><Trophy className="w-3 h-3" />{t.winner}</span>;
      default:
        return null;
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/comunitate")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    {t.title}
                  </CardTitle>
                  <CardDescription>{t.subtitle}</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeContest ? (
                    <Alert className="mb-6 border-primary/30 bg-primary/5">
                      <Trophy className="h-4 w-4 text-primary" />
                      <AlertTitle>{t.activeContestInfo}</AlertTitle>
                      <AlertDescription>
                        {activeContest.name} • {activeContest.prize_description}
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t.noContest}</AlertTitle>
                      <AlertDescription>{t.noContestDesc}</AlertDescription>
                    </Alert>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">{t.articleTitle} *</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={t.articleTitlePlaceholder}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="excerpt">{t.excerpt}</Label>
                      <Textarea
                        id="excerpt"
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        placeholder={t.excerptPlaceholder}
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="content">{t.content} *</Label>
                        <span className={`text-xs ${content.length < 500 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {content.length} {t.characters}
                        </span>
                      </div>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder={t.contentPlaceholder}
                        rows={15}
                        required
                      />
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full gap-2"
                      disabled={submitMutation.isPending}
                    >
                      {submitMutation.isPending ? (
                        t.submitting
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          {t.submit}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Guidelines */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t.guidelines}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[t.guideline1, t.guideline2, t.guideline3, t.guideline4].map((guideline, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{guideline}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* User's Submissions */}
              {userSubmissions && userSubmissions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t.yourSubmissions}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {userSubmissions.slice(0, 5).map((sub) => (
                      <div key={sub.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50">
                        <span className="text-sm text-foreground truncate flex-1">{sub.title}</span>
                        {getStatusBadge(sub.status)}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SubmitArticle;