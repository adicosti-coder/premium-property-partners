import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Send, FileText, AlertCircle, CheckCircle, Trophy, Upload, X, Image as ImageIcon, Loader2, Pencil } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SubmitArticle = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(language === "ro" ? "Selectează o imagine validă" : "Please select a valid image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === "ro" ? "Imaginea trebuie să fie mai mică de 5MB" : "Image must be smaller than 5MB");
      return;
    }

    setCoverImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setCoverImage(null);
    setCoverImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!coverImage || !user) return null;

    const fileExt = coverImage.name.split(".").pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("community-articles")
      .upload(fileName, coverImage);

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("community-articles")
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      setIsUploading(true);
      let coverImageUrl: string | null = null;

      try {
        if (coverImage) {
          coverImageUrl = await uploadImage();
        }

        const { error } = await supabase
          .from("user_article_submissions")
          .insert({
            user_id: user.id,
            title,
            content,
            excerpt: excerpt || content.substring(0, 200),
            contest_period_id: activeContest?.id || null,
            cover_image_url: coverImageUrl,
          });

        if (error) throw error;
      } finally {
        setIsUploading(false);
      }
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
      edit: "Editează",
      coverImage: "Imagine de Cover",
      coverImageDesc: "Adaugă o imagine atractivă pentru articolul tău (opțional)",
      uploadImage: "Încarcă imagine",
      changeImage: "Schimbă imaginea",
      removeImage: "Șterge",
      imageRequirements: "JPG, PNG sau WebP, max 5MB",
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
      edit: "Edit",
      coverImage: "Cover Image",
      coverImageDesc: "Add an attractive image for your article (optional)",
      uploadImage: "Upload image",
      changeImage: "Change image",
      removeImage: "Remove",
      imageRequirements: "JPG, PNG or WebP, max 5MB",
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

  const breadcrumbItems = [
    { label: language === "ro" ? "Comunitate" : "Community", href: "/comunitate" },
    { label: t.title }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={`${t.title} | RealTrust`}
        description={t.subtitle}
        noIndex={true}
      />
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6 max-w-4xl">
          <PageBreadcrumb items={breadcrumbItems} className="mb-6" />
          
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

                    {/* Cover Image Upload */}
                    <div className="space-y-2">
                      <Label>{t.coverImage}</Label>
                      <p className="text-xs text-muted-foreground">{t.coverImageDesc}</p>
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />

                      {coverImagePreview ? (
                        <div className="relative rounded-lg overflow-hidden border border-border">
                          <img
                            src={coverImagePreview}
                            alt="Cover preview"
                            className="w-full h-48 object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                            >
                              {t.changeImage}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={removeImage}
                            >
                              <X className="w-4 h-4 mr-1" />
                              {t.removeImage}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-muted/50 transition-colors"
                        >
                          <ImageIcon className="w-8 h-8 text-muted-foreground/50" />
                          <span className="text-sm text-muted-foreground">{t.uploadImage}</span>
                          <span className="text-xs text-muted-foreground/70">{t.imageRequirements}</span>
                        </button>
                      )}
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
                      disabled={submitMutation.isPending || isUploading}
                    >
                      {submitMutation.isPending || isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {t.submitting}
                        </>
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
                        <div className="flex items-center gap-2">
                          {sub.status === "pending" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/comunitate/editeaza/${sub.id}`)}
                              className="h-7 px-2 text-primary hover:text-primary"
                            >
                              <Pencil className="w-3 h-3 mr-1" />
                              {t.edit}
                            </Button>
                          )}
                          {getStatusBadge(sub.status)}
                        </div>
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
      <GlobalConversionWidgets showExitIntent={false} showSocialProof={false} />
      <BackToTop />
    </div>
  );
};

export default SubmitArticle;