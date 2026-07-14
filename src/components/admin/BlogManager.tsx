import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import RichTextEditor from "./RichTextEditor";
import HubPreviewEditor from "./HubPreviewEditor";
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
  Bot,
  BarChart3,
  Save,
  RefreshCw,
  CheckSquare,
  Square,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { BlogLiveActivity } from "./blog/BlogLiveActivity";
import { BlogSEOAnalyticsPanel } from "./blog/BlogSEOAnalyticsPanel";
import { BlogRollbackButton } from "./blog/BlogRollbackButton";
import { useBlogAdminShortcuts } from "@/hooks/useBlogAdminShortcuts";
import { TooltipProvider } from "@/components/ui/tooltip";
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
  is_premium: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  translation_locked: boolean;
  scheduled_for?: string | null;
  faq_items?: unknown;
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
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [translationFailures, setTranslationFailures] = useState<Record<string, string>>({});
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [activeTab, setActiveTab] = useState<"ro" | "en">("ro");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [isAutopilotRunning, setIsAutopilotRunning] = useState(false);
  const [isReauditing, setIsReauditing] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllVisible = () => {
    setSelectedIds((prev) => {
      if (prev.size === articles.length) return new Set();
      return new Set(articles.map((a) => a.id));
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleRunAutopilot = async () => {
    setIsAutopilotRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("blog-ai-autopilot", {
        body: { limit: 5 },
      });
      if (error) throw error;
      const d = data as { applied?: number; queued?: number; processed?: number };
      toast({
        title: "AI Auto-Pilot rulat",
        description: `Procesate: ${d.processed ?? 0} · Aplicate: ${d.applied ?? 0} · În așteptare aprobare: ${d.queued ?? 0}`,
      });
      loadArticles();
    } catch (e) {
      toast({ title: "Auto-Pilot eșuat", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setIsAutopilotRunning(false);
    }
  };

  const handleBulkSave = async () => {
    if (selectedIds.size === 0) return;
    toast({ title: "Salvare bulk", description: `${selectedIds.size} articole marcate pentru salvare (deschide fiecare pentru editare individuală).` });
  };

  const handleBulkReaudit = async () => {
    if (selectedIds.size === 0) {
      toast({ title: "Selectează articole", description: "Bifează articolele pentru re-audit SEO." });
      return;
    }
    setIsReauditing(true);
    let ok = 0, fail = 0;
    for (const id of selectedIds) {
      const article = articles.find((a) => a.id === id);
      if (!article) continue;
      try {
        const { error } = await supabase.functions.invoke("seo-audit", {
          body: { url: `https://realtrust.ro/blog/${article.slug}` },
        });
        if (error) fail++; else ok++;
      } catch { fail++; }
    }
    setIsReauditing(false);
    toast({ title: "Re-audit SEO finalizat", description: `Reușite: ${ok} · Eșuate: ${fail}` });
  };

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
    is_premium: false,
    translation_locked: false,
    scheduled_for: "" as string, // datetime-local value, e.g. "2026-08-01T09:00"
    faq_items_json: "" as string, // raw JSON textarea
  });
  const [faqJsonError, setFaqJsonError] = useState<string | null>(null);

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
      premium: "Premium (doar autentificați)",
      premiumLabel: "Premium",
      publicLabel: "Public",
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
        access: "Acces",
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
      translateAllMissing: "Traduce toate lipsă (EN)",
      translatingAllMissing: "Se traduc articolele...",
      translateAllSuccess: (n: number) => `${n} articole procesate.`,
      translateAllNothing: "Toate articolele au deja traducere EN.",
      translateSkipped: (n: number) => `${n} sărite (blocate manual).`,
      translationCol: "Traducere EN",
      badgeTranslated: "Tradus EN",
      badgeManual: "Editat Manual",
      badgeMissing: "Lipsă EN",
      badgeFailed: "Eșec traducere",
      retry: "Reîncearcă",
      lockLabel: "Blochează traducerea automată",
      lockHint: "Când e activ, funcțiile AI (individuale sau în bloc) NU vor mai suprascrie textele EN.",
      bulkProgress: (done: number, total: number) => `Se traduc articolele... ${done}/${total}`,
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
      premium: "Premium (authenticated only)",
      premiumLabel: "Premium",
      publicLabel: "Public",
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
        access: "Access",
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
      translateAllMissing: "Translate all missing (EN)",
      translatingAllMissing: "Translating articles...",
      translateAllSuccess: (n: number) => `${n} articles processed.`,
      translateAllNothing: "All articles already have EN translations.",
      translateSkipped: (n: number) => `${n} skipped (manually locked).`,
      translationCol: "EN translation",
      badgeTranslated: "EN translated",
      badgeManual: "Manually edited",
      badgeMissing: "Missing EN",
      badgeFailed: "Translation failed",
      retry: "Retry",
      lockLabel: "Lock automatic translation",
      lockHint: "When on, AI functions (single or bulk) will not overwrite the EN fields.",
      bulkProgress: (done: number, total: number) => `Translating articles… ${done}/${total}`,
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
      const faqJson = article.faq_items
        ? JSON.stringify(article.faq_items, null, 2)
        : "";
      const scheduledLocal = article.scheduled_for
        ? new Date(article.scheduled_for).toISOString().slice(0, 16)
        : "";
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
        is_premium: article.is_premium,
        translation_locked: article.translation_locked ?? false,
        scheduled_for: scheduledLocal,
        faq_items_json: faqJson,
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
        is_premium: false,
        translation_locked: false,
        scheduled_for: "",
        faq_items_json: "",
      });
    }
    setFaqJsonError(null);
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
      // Auto-lock translations if EN fields were manually changed vs. the loaded article.
      // The admin can still uncheck the toggle explicitly before saving.
      const enFieldsChanged = editingArticle
        ? (editingArticle.title_en || "") !== (formData.title_en || "") ||
          (editingArticle.excerpt_en || "") !== (formData.excerpt_en || "") ||
          (editingArticle.content_en || "") !== (formData.content_en || "")
        : !!(formData.title_en || formData.excerpt_en || formData.content_en);

      const translationLocked = formData.translation_locked || enFieldsChanged;

      // Parse curated FAQ items (optional). Validates strict compatibility with
      // Google FAQPage JSON-LD Rich Results spec: array of {question, answer}
      // objects, non-empty strings, no raw HTML tags in questions, and per-item
      // length caps that keep the SERP snippet valid.
      let faqItems: unknown = null;
      if (formData.faq_items_json.trim()) {
        try {
          const parsed = JSON.parse(formData.faq_items_json);
          if (!Array.isArray(parsed)) {
            throw new Error("faq_items trebuie să fie un array JSON");
          }
          if (parsed.length === 0) {
            throw new Error("array-ul FAQ este gol");
          }
          if (parsed.length > 12) {
            throw new Error(`prea multe întrebări (${parsed.length}); Google recomandă max. 12`);
          }
          const htmlTag = /<\/?[a-z][\s\S]*?>/i;
          parsed.forEach((item, idx) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
              throw new Error(`item #${idx + 1}: trebuie să fie obiect JSON`);
            }
            const q = (item as Record<string, unknown>).question ?? (item as Record<string, unknown>).q;
            const a = (item as Record<string, unknown>).answer ?? (item as Record<string, unknown>).a;
            if (typeof q !== "string" || !q.trim()) {
              throw new Error(`item #${idx + 1}: câmpul "question" lipsește sau este gol`);
            }
            if (typeof a !== "string" || !a.trim()) {
              throw new Error(`item #${idx + 1}: câmpul "answer" lipsește sau este gol`);
            }
            if (htmlTag.test(q)) {
              throw new Error(`item #${idx + 1}: "question" nu poate conține HTML (Google Rich Results)`);
            }
            if (q.length > 300) {
              throw new Error(`item #${idx + 1}: "question" > 300 caractere (limită Rich Results)`);
            }
            if (a.length > 1000) {
              throw new Error(`item #${idx + 1}: "answer" > 1000 caractere; scurtează pentru snippet valid`);
            }
          });
          faqItems = parsed;
          setFaqJsonError(null);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "JSON invalid";
          setFaqJsonError(msg);
          toast({ title: t.error, description: `FAQ JSON: ${msg}`, variant: "destructive" });
          setIsSaving(false);
          return;
        }
      }

      // Scheduling logic:
      //   - scheduled_for in the FUTURE  → keep is_published=false, publish later via cron
      //   - scheduled_for in the PAST/empty → normal publish flow
      const scheduledIso = formData.scheduled_for
        ? new Date(formData.scheduled_for).toISOString()
        : null;
      const isFutureScheduled =
        !!scheduledIso && new Date(scheduledIso).getTime() > Date.now();
      const effectivePublished = isFutureScheduled ? false : formData.is_published;

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
        is_published: effectivePublished,
        is_premium: formData.is_premium,
        translation_locked: translationLocked,
        published_at: effectivePublished ? new Date().toISOString() : null,
        scheduled_for: isFutureScheduled ? scheduledIso : null,
        faq_items: faqItems,
      };

      // Cast to any: `faq_items` + `scheduled_for` are newly added columns
      // not yet reflected in the generated Supabase types.
      const payload = articleData as unknown as Record<string, unknown>;
      if (editingArticle) {
        const { error } = await supabase
          .from("blog_articles")
          .update(payload as never)
          .eq("id", editingArticle.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_articles").insert(payload as never);
        if (error) throw error;
      }

      toast({ title: t.saveSuccess });
      setIsDialogOpen(false);
      fetchArticles();

      // Notify IndexNow about the new/updated article
      try {
        const { notifyIndexNow } = await import("@/hooks/useIndexNowNotify");
        notifyIndexNow([`/blog/${articleData.slug}`]);
      } catch {}

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

  // Status shown in the table for a given article
  type TranslationStatus = "translated" | "manual" | "missing" | "failed";
  const getTranslationStatus = (a: BlogArticle): TranslationStatus => {
    if (translationFailures[a.id]) return "failed";
    if (a.translation_locked) return "manual";
    if (hasEnglishTranslation(a)) return "translated";
    return "missing";
  };

  // Translate ONE article via the shared edge function; returns true on success.
  const translateOne = async (articleId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("translate-blog-articles", {
        body: { articleId, includeContent: true, limit: 1 },
      });
      if (error) throw error;
      const first = (data as { results?: Array<{ ok: boolean; error?: string }> })?.results?.[0];
      if (!first || first.ok !== true) {
        throw new Error(first?.error || "unknown_error");
      }
      setTranslationFailures((prev) => {
        const next = { ...prev };
        delete next[articleId];
        return next;
      });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTranslationFailures((prev) => ({ ...prev, [articleId]: msg }));
      return false;
    }
  };

  const handleTranslateAllMissing = async () => {
    // Exclude locked + already-fully-translated
    const missing = articles.filter(
      (a) => !a.translation_locked && (!a.title_en || !a.excerpt_en || !a.content_en),
    );
    const skipped = articles.filter(
      (a) => a.translation_locked && (!a.title_en || !a.excerpt_en || !a.content_en),
    ).length;

    if (missing.length === 0) {
      toast({
        title: t.translateAllNothing,
        description: skipped > 0 ? t.translateSkipped(skipped) : undefined,
      });
      return;
    }

    setIsBulkTranslating(true);
    setBulkProgress({ done: 0, total: missing.length });
    let okCount = 0;
    let failCount = 0;
    try {
      for (let i = 0; i < missing.length; i++) {
        const ok = await translateOne(missing[i].id);
        if (ok) okCount += 1;
        else failCount += 1;
        setBulkProgress({ done: i + 1, total: missing.length });
      }
      toast({
        title: t.translateAllSuccess(okCount),
        description:
          (failCount > 0
            ? `${failCount} ${language === "en" ? "failed" : "eșuate"}. `
            : "") + (skipped > 0 ? t.translateSkipped(skipped) : ""),
        variant: failCount > 0 ? "destructive" : undefined,
      });
      await fetchArticles();
    } finally {
      setIsBulkTranslating(false);
      setBulkProgress(null);
    }
  };

  const handleRetryTranslation = async (articleId: string) => {
    setRetryingId(articleId);
    const ok = await translateOne(articleId);
    setRetryingId(null);
    if (ok) {
      toast({ title: t.translateSuccess });
      await fetchArticles();
    } else {
      toast({
        title: t.translateError,
        description: translationFailures[articleId],
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          {t.title}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleTranslateAllMissing}
            disabled={isBulkTranslating || isLoading}
          >
            {isBulkTranslating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Languages className="w-4 h-4 mr-2" />
            )}
            {isBulkTranslating
              ? bulkProgress
                ? t.bulkProgress(bulkProgress.done, bulkProgress.total)
                : t.translatingAllMissing
              : t.translateAllMissing}
          </Button>
          <Button onClick={() => openDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            {t.addArticle}
          </Button>
        </div>
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
                  <TableHead>{t.tableHeaders.access}</TableHead>
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
                      {article.is_premium ? (
                        <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                          {t.premiumLabel}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-500 border-green-500/30">
                          {t.publicLabel}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const status = getTranslationStatus(article);
                        const failMsg = translationFailures[article.id];
                        const isRetrying = retryingId === article.id;
                        return (
                          <div className="flex items-center gap-2 flex-wrap">
                            {status === "translated" && (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                <Globe className="w-3 h-3 mr-1" />
                                {t.badgeTranslated}
                              </Badge>
                            )}
                            {status === "manual" && (
                              <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                                <Sparkles className="w-3 h-3 mr-1" />
                                {t.badgeManual}
                              </Badge>
                            )}
                            {status === "missing" && (
                              <Badge variant="outline" className="text-muted-foreground">
                                <Languages className="w-3 h-3 mr-1" />
                                {t.badgeMissing}
                              </Badge>
                            )}
                            {status === "failed" && (
                              <>
                                <Badge
                                  variant="outline"
                                  className="text-destructive border-destructive/40"
                                  title={failMsg}
                                >
                                  <Languages className="w-3 h-3 mr-1" />
                                  {t.badgeFailed}
                                </Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-xs"
                                  disabled={isRetrying || article.translation_locked}
                                  onClick={() => handleRetryTranslation(article.id)}
                                >
                                  {isRetrying ? (
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                  ) : (
                                    <Sparkles className="w-3 h-3 mr-1" />
                                  )}
                                  {t.retry}
                                </Button>
                              </>
                            )}
                          </div>
                        );
                      })()}
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

              <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Label htmlFor="translation_locked" className="cursor-pointer">
                    {t.lockLabel}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">{t.lockHint}</p>
                </div>
                <Switch
                  id="translation_locked"
                  checked={formData.translation_locked}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, translation_locked: checked }))
                  }
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

            <div className="flex items-center gap-6">
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
              
              <div className="flex items-center gap-2">
                <Switch
                  id="is_premium"
                  checked={formData.is_premium}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, is_premium: checked }))
                  }
                />
                <Label htmlFor="is_premium">{t.premium}</Label>
              </div>
            </div>

            {/* Editorial scheduling — auto-publishes when scheduled_for <= now() */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="scheduled_for">📅 Programează publicare (opțional)</Label>
                <Input
                  id="scheduled_for"
                  type="datetime-local"
                  value={formData.scheduled_for}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, scheduled_for: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Dacă e completată în viitor, articolul rămâne draft până la data setată,
                  apoi este publicat automat (verificare la fiecare 5 min).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq_items_json">
                  ❓ FAQ structurat (JSON, opțional)
                </Label>
                <Textarea
                  id="faq_items_json"
                  value={formData.faq_items_json}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, faq_items_json: e.target.value }));
                    setFaqJsonError(null);
                  }}
                  rows={5}
                  placeholder={`[
  { "question": "Cum funcționează X?", "answer": "..." }
]`}
                  className={`font-mono text-xs ${faqJsonError ? "border-destructive" : ""}`}
                />
                <p className="text-xs text-muted-foreground">
                  Suprascrie FAQ-ul automat. Este prins de generatorul FAQPage JSON-LD
                  pentru Rich Snippets Google.
                </p>
                {faqJsonError && (
                  <p className="text-xs text-destructive">JSON invalid: {faqJsonError}</p>
                )}
              </div>
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

      {/* Hub SEO live preview — prototypes hubIntro/hubKeywords per category */}
      <HubPreviewEditor />


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
