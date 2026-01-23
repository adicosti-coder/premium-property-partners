import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RichTextEditor from "./RichTextEditor";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  FileText,
  Eye,
  EyeOff,
  X,
  Copy,
  Globe,
  Languages,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";

interface BlogArticle {
  id: string;
  slug: string;
  title: string;
  title_en: string | null;
  excerpt: string;
  excerpt_en: string | null;
  content: string;
  content_en: string | null;
  cover_image: string | null;
  category: string;
  tags: string[];
  author_name: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const BlogManager = () => {
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;

  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<BlogArticle | null>(null);
  const [deleteArticle, setDeleteArticle] = useState<BlogArticle | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [activeTab, setActiveTab] = useState<"ro" | "en">("ro");

  const [formData, setFormData] = useState({
    title: "",
    title_en: "",
    slug: "",
    excerpt: "",
    excerpt_en: "",
    content: "",
    content_en: "",
    cover_image: "",
    category: "",
    tags: [] as string[],
    author_name: "RealTrust",
    is_published: false,
  });

  const translations = {
    ro: {
      title: "Manager Blog",
      addArticle: "Adaugă Articol",
      editArticle: "Editează Articol",
      noArticles: "Niciun articol",
      noArticlesDescription: "Adaugă primul articol pe blog.",
      articleTitle: "Titlu",
      slug: "Slug (URL)",
      excerpt: "Rezumat",
      content: "Conținut",
      coverImage: "Imagine Copertă (URL)",
      category: "Categorie",
      tags: "Tag-uri",
      addTag: "Adaugă tag",
      author: "Autor",
      published: "Publicat",
      save: "Salvează",
      cancel: "Anulează",
      delete: "Șterge",
      deleteTitle: "Șterge Articol",
      deleteDescription: "Ești sigur că vrei să ștergi acest articol? Acțiunea nu poate fi anulată.",
      saveSuccess: "Articol salvat!",
      deleteSuccess: "Articol șters!",
      error: "Eroare",
      tableHeaders: {
        title: "Titlu",
        category: "Categorie",
        status: "Status",
        translations: "Traduceri",
        date: "Data",
        actions: "Acțiuni",
      },
      draft: "Draft",
      publishedLabel: "Publicat",
      romanian: "Română",
      english: "English",
      copyToEn: "Copiază în EN",
      copySuccess: "Conținut copiat în engleză!",
      hasTranslation: "EN",
      noTranslation: "Lipsește EN",
      translateAI: "Traduce cu AI",
      translating: "Se traduce...",
      translateSuccess: "Articol tradus cu succes!",
      translateError: "Eroare la traducere. Încearcă din nou.",
    },
    en: {
      title: "Blog Manager",
      addArticle: "Add Article",
      editArticle: "Edit Article",
      noArticles: "No articles",
      noArticlesDescription: "Add the first blog article.",
      articleTitle: "Title",
      slug: "Slug (URL)",
      excerpt: "Excerpt",
      content: "Content",
      coverImage: "Cover Image (URL)",
      category: "Category",
      tags: "Tags",
      addTag: "Add tag",
      author: "Author",
      published: "Published",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      deleteTitle: "Delete Article",
      deleteDescription: "Are you sure you want to delete this article? This action cannot be undone.",
      saveSuccess: "Article saved!",
      deleteSuccess: "Article deleted!",
      error: "Error",
      tableHeaders: {
        title: "Title",
        category: "Category",
        status: "Status",
        translations: "Translations",
        date: "Date",
        actions: "Actions",
      },
      draft: "Draft",
      publishedLabel: "Published",
      romanian: "Română",
      english: "English",
      copyToEn: "Copy to EN",
      copySuccess: "Content copied to English!",
      hasTranslation: "EN",
      noTranslation: "Missing EN",
      translateAI: "Translate with AI",
      translating: "Translating...",
      translateSuccess: "Article translated successfully!",
      translateError: "Translation error. Please try again.",
    },
  };

  const t = translations[language] || translations.ro;

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error("Error fetching articles:", error);
      toast({
        title: t.error,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleCopyToEnglish = () => {
    setFormData((prev) => ({
      ...prev,
      title_en: prev.title,
      excerpt_en: prev.excerpt,
      content_en: prev.content,
    }));
    setActiveTab("en");
    toast({ title: t.copySuccess });
  };

  const handleTranslateWithAI = async () => {
    if (!formData.title || !formData.excerpt || !formData.content) {
      toast({
        title: t.error,
        description: "Completează câmpurile în română înainte de a traduce.",
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("translate-blog-article", {
        body: {
          title: formData.title,
          excerpt: formData.excerpt,
          content: formData.content,
        },
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setFormData((prev) => ({
        ...prev,
        title_en: data.title_en,
        excerpt_en: data.excerpt_en,
        content_en: data.content_en,
      }));
      setActiveTab("en");
      toast({ title: t.translateSuccess });
    } catch (error) {
      console.error("Translation error:", error);
      toast({
        title: t.translateError,
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const openDialog = (article?: BlogArticle) => {
    if (article) {
      setEditingArticle(article);
      setFormData({
        title: article.title,
        title_en: article.title_en || "",
        slug: article.slug,
        excerpt: article.excerpt,
        excerpt_en: article.excerpt_en || "",
        content: article.content,
        content_en: article.content_en || "",
        cover_image: article.cover_image || "",
        category: article.category,
        tags: article.tags,
        author_name: article.author_name,
        is_published: article.is_published,
      });
    } else {
      setEditingArticle(null);
      setFormData({
        title: "",
        title_en: "",
        slug: "",
        excerpt: "",
        excerpt_en: "",
        content: "",
        content_en: "",
        cover_image: "",
        category: "",
        tags: [],
        author_name: "RealTrust",
        is_published: false,
      });
    }
    setActiveTab("ro");
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug || !formData.excerpt || !formData.content || !formData.category) {
      toast({
        title: t.error,
        description: "Completează toate câmpurile obligatorii.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const articleData = {
        title: formData.title,
        title_en: formData.title_en || null,
        slug: formData.slug,
        excerpt: formData.excerpt,
        excerpt_en: formData.excerpt_en || null,
        content: formData.content,
        content_en: formData.content_en || null,
        cover_image: formData.cover_image || null,
        category: formData.category,
        tags: formData.tags,
        author_name: formData.author_name,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
      };

      if (editingArticle) {
        const { error } = await supabase
          .from("blog_articles")
          .update(articleData)
          .eq("id", editingArticle.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_articles").insert(articleData);
        if (error) throw error;
      }

      toast({ title: t.saveSuccess });
      setIsDialogOpen(false);
      fetchArticles();
    } catch (error) {
      console.error("Error saving article:", error);
      toast({
        title: t.error,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteArticle) return;

    try {
      const { error } = await supabase
        .from("blog_articles")
        .delete()
        .eq("id", deleteArticle.id);

      if (error) throw error;
      toast({ title: t.deleteSuccess });
      setDeleteArticle(null);
      fetchArticles();
    } catch (error) {
      console.error("Error deleting article:", error);
      toast({
        title: t.error,
        variant: "destructive",
      });
    }
  };

  const hasEnglishTranslation = (article: BlogArticle) => {
    return !!(article.title_en && article.excerpt_en && article.content_en);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {t.title}
        </h2>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          {t.addArticle}
        </Button>
      </div>

      {/* Articles Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t.noArticles}
              </h3>
              <p className="text-muted-foreground">{t.noArticlesDescription}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.tableHeaders.title}</TableHead>
                  <TableHead>{t.tableHeaders.category}</TableHead>
                  <TableHead>{t.tableHeaders.translations}</TableHead>
                  <TableHead>{t.tableHeaders.status}</TableHead>
                  <TableHead>{t.tableHeaders.date}</TableHead>
                  <TableHead className="w-[100px]">{t.tableHeaders.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((article) => (
                  <TableRow key={article.id}>
                    <TableCell className="font-medium max-w-[250px] truncate">
                      {article.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{article.category}</Badge>
                    </TableCell>
                    <TableCell>
                      {hasEnglishTranslation(article) ? (
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          <Globe className="w-3 h-3 mr-1" />
                          {t.hasTranslation}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                          <Languages className="w-3 h-3 mr-1" />
                          {t.noTranslation}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {article.is_published ? (
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          <Eye className="w-3 h-3 mr-1" />
                          {t.publishedLabel}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <EyeOff className="w-3 h-3 mr-1" />
                          {t.draft}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(article.created_at), "d MMM yyyy", {
                        locale: dateLocale,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDialog(article)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteArticle(article)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-primary" />
              {editingArticle ? t.editArticle : t.addArticle}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ro" | "en")} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="ro" className="gap-2">
                  🇷🇴 {t.romanian}
                </TabsTrigger>
                <TabsTrigger value="en" className="gap-2">
                  🇬🇧 {t.english}
                </TabsTrigger>
              </TabsList>
              
              {activeTab === "ro" && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToEnglish}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    {t.copyToEn}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleTranslateWithAI}
                    disabled={isTranslating}
                    className="gap-2"
                  >
                    {isTranslating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isTranslating ? t.translating : t.translateAI}
                  </Button>
                </div>
              )}
            </div>

            {/* Romanian Content */}
            <TabsContent value="ro" className="space-y-4 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{t.articleTitle} (RO) *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Titlul articolului..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">{t.slug} *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, slug: e.target.value }))
                    }
                    placeholder="titlu-articol"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">{t.excerpt} (RO) *</Label>
                <Textarea
                  id="excerpt"
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
                  }
                  placeholder="Rezumat scurt al articolului..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t.content} (RO) *</Label>
                <RichTextEditor
                  content={formData.content}
                  onChange={(content) =>
                    setFormData((prev) => ({ ...prev, content }))
                  }
                  placeholder="Scrie conținutul articolului..."
                />
              </div>
            </TabsContent>

            {/* English Content */}
            <TabsContent value="en" className="space-y-4 mt-0">
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  English translation - Leave empty to use Romanian content as fallback
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title_en">{t.articleTitle} (EN)</Label>
                <Input
                  id="title_en"
                  value={formData.title_en}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title_en: e.target.value }))
                  }
                  placeholder="Article title..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt_en">{t.excerpt} (EN)</Label>
                <Textarea
                  id="excerpt_en"
                  value={formData.excerpt_en}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, excerpt_en: e.target.value }))
                  }
                  placeholder="Short excerpt of the article..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>{t.content} (EN)</Label>
                <RichTextEditor
                  content={formData.content_en}
                  onChange={(content_en) =>
                    setFormData((prev) => ({ ...prev, content_en }))
                  }
                  placeholder="Write the article content..."
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* Shared Fields */}
          <div className="border-t pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cover_image">{t.coverImage}</Label>
                <Input
                  id="cover_image"
                  value={formData.cover_image}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, cover_image: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t.category} *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, category: e.target.value }))
                  }
                  placeholder="Sfaturi, Noutăți, Ghiduri..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="author">{t.author}</Label>
                <Input
                  id="author"
                  value={formData.author_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, author_name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t.tags}</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                    placeholder={t.addTag}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddTag}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_published"
                checked={formData.is_published}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_published: checked }))
                }
              />
              <Label htmlFor="is_published">{t.published}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteArticle} onOpenChange={() => setDeleteArticle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogManager;
