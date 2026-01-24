import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ArrowLeft, Save, FileText, Upload, X, Image as ImageIcon, Loader2, AlertTriangle } from "lucide-react";
import { User } from "@supabase/supabase-js";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const EditArticle = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth", { state: { from: `/comunitate/editeaza/${id}` } });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth", { state: { from: `/comunitate/editeaza/${id}` } });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, id]);

  // Fetch the article
  const { data: article, isLoading: articleLoading, error: articleError } = useQuery({
    queryKey: ["edit-article", id],
    queryFn: async () => {
      if (!id || !user) throw new Error("No ID or user");
      
      const { data, error } = await supabase
        .from("user_article_submissions")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  // Initialize form with article data
  useEffect(() => {
    if (article && !isInitialized) {
      setTitle(article.title);
      setContent(article.content);
      setExcerpt(article.excerpt || "");
      if (article.cover_image_url) {
        setExistingImageUrl(article.cover_image_url);
        setCoverImagePreview(article.cover_image_url);
      }
      setIsInitialized(true);
    }
  }, [article, isInitialized]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(language === "ro" ? "Selectează o imagine validă" : "Please select a valid image");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === "ro" ? "Imaginea trebuie să fie mai mică de 5MB" : "Image must be smaller than 5MB");
      return;
    }

    setCoverImage(file);
    setExistingImageUrl(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setCoverImage(null);
    setCoverImagePreview(null);
    setExistingImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!coverImage || !user) return existingImageUrl;

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

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user || !id) throw new Error("Not authenticated");

      setIsUploading(true);
      let coverImageUrl: string | null = existingImageUrl;

      try {
        if (coverImage) {
          coverImageUrl = await uploadImage();
        } else if (!coverImagePreview) {
          coverImageUrl = null;
        }

        const { error } = await supabase
          .from("user_article_submissions")
          .update({
            title,
            content,
            excerpt: excerpt || content.substring(0, 200),
            cover_image_url: coverImageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("user_id", user.id)
          .eq("status", "pending");

        if (error) throw error;
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["edit-article", id] });
      toast.success(translations[language].successMessage);
      navigate("/comunitate/trimite");
    },
    onError: (error) => {
      console.error("Update error:", error);
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
    updateMutation.mutate();
  };

  const translations = {
    ro: {
      title: "Editează Articolul",
      subtitle: "Modifică articolul tău înainte de aprobare",
      back: "Înapoi",
      articleTitle: "Titlul Articolului",
      articleTitlePlaceholder: "Un titlu captivant pentru articolul tău...",
      excerpt: "Rezumat (opțional)",
      excerptPlaceholder: "O scurtă descriere a articolului...",
      content: "Conținutul Articolului",
      contentPlaceholder: "Scrie aici articolul tău... (minim 500 caractere)",
      save: "Salvează Modificările",
      saving: "Se salvează...",
      successMessage: "Articolul a fost actualizat cu succes!",
      errorMessage: "Eroare la salvare. Încearcă din nou.",
      requiredFields: "Titlul și conținutul sunt obligatorii.",
      minContent: "Articolul trebuie să aibă minim 500 caractere.",
      characters: "caractere",
      coverImage: "Imagine de Cover",
      coverImageDesc: "Adaugă o imagine atractivă pentru articolul tău (opțional)",
      uploadImage: "Încarcă imagine",
      changeImage: "Schimbă imaginea",
      removeImage: "Șterge",
      imageRequirements: "JPG, PNG sau WebP, max 5MB",
      notFound: "Articolul nu a fost găsit",
      notFoundDesc: "Articolul nu există sau nu poate fi editat.",
      pendingOnly: "Doar articolele în așteptare pot fi editate",
      pendingOnlyDesc: "Odată aprobat sau respins, un articol nu mai poate fi modificat.",
    },
    en: {
      title: "Edit Article",
      subtitle: "Modify your article before approval",
      back: "Back",
      articleTitle: "Article Title",
      articleTitlePlaceholder: "A captivating title for your article...",
      excerpt: "Summary (optional)",
      excerptPlaceholder: "A short description of the article...",
      content: "Article Content",
      contentPlaceholder: "Write your article here... (minimum 500 characters)",
      save: "Save Changes",
      saving: "Saving...",
      successMessage: "Article updated successfully!",
      errorMessage: "Error saving. Please try again.",
      requiredFields: "Title and content are required.",
      minContent: "Article must have at least 500 characters.",
      characters: "characters",
      coverImage: "Cover Image",
      coverImageDesc: "Add an attractive image for your article (optional)",
      uploadImage: "Upload image",
      changeImage: "Change image",
      removeImage: "Remove",
      imageRequirements: "JPG, PNG or WebP, max 5MB",
      notFound: "Article not found",
      notFoundDesc: "The article doesn't exist or cannot be edited.",
      pendingOnly: "Only pending articles can be edited",
      pendingOnlyDesc: "Once approved or rejected, an article cannot be modified.",
    },
  };

  const t = translations[language] || translations.ro;

  if (!user) {
    return null;
  }

  if (articleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-4xl">
            <Skeleton className="h-8 w-32 mb-6" />
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-6">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (articleError || !article) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-6 max-w-4xl">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/comunitate/trimite")}
              className="mb-6 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.back}
            </Button>
            
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t.notFound}</AlertTitle>
              <AlertDescription>{t.notFoundDesc}</AlertDescription>
            </Alert>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: language === "ro" ? "Comunitate" : "Community", href: "/comunitate" },
    { label: language === "ro" ? "Trimite Articol" : "Submit Article", href: "/comunitate/trimite" },
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
            onClick={() => navigate("/comunitate/trimite")}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                {t.title}
              </CardTitle>
              <CardDescription>{t.subtitle}</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6 border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertTitle className="text-amber-600">{t.pendingOnly}</AlertTitle>
                <AlertDescription className="text-amber-600/80">
                  {t.pendingOnlyDesc}
                </AlertDescription>
              </Alert>

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
                  disabled={updateMutation.isPending || isUploading}
                >
                  {updateMutation.isPending || isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t.saving}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {t.save}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
      <GlobalConversionWidgets showExitIntent={false} showSocialProof={false} />
      <BackToTop />
    </div>
  );
};

export default EditArticle;
