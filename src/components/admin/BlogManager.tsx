import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import {
  BarChart3,
  Bot,
  CheckSquare,
  FileText,
  Languages,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import HubPreviewEditor from "./HubPreviewEditor";
import { BlogLiveActivity } from "./blog/BlogLiveActivity";
import { BlogSEOAnalyticsPanel } from "./blog/BlogSEOAnalyticsPanel";
import { useBlogAdminShortcuts } from "@/hooks/useBlogAdminShortcuts";
import { AdminPagination } from "./shared/AdminPagination";
import type { PageSize } from "@/hooks/admin/usePaginatedQuery";
import {
  useBlogArticles,
  useBlogCategoryOptions,
  type BlogArticle,
  type BlogStatusFilter,
} from "./blog/hooks/useBlogArticles";
import { BlogArticleRow } from "./blog/columns/blogColumns";
import { BlogArticleEditor } from "./blog/dialogs/BlogArticleEditor";

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
    deleteDescription:
      "Ești sigur că vrei să ștergi acest articol? Acțiunea nu poate fi anulată.",
    saveSuccess: "Articol salvat!",
    deleteSuccess: "Articol șters!",
    error: "Eroare",
    tableHeaders: {
      title: "Titlu",
      category: "Categorie",
      status: "Status",
      access: "Acces",
      translations: "Traduceri",
      date: "Actualizat",
      actions: "Acțiuni",
    },
    draft: "Draft",
    publishedLabel: "Publicat",
    romanian: "Română",
    english: "English",
    copyToEn: "Copiază în EN",
    copySuccess: "Conținut copiat în engleză!",
    translateAI: "Traduce cu AI",
    translating: "Se traduce...",
    translateSuccess: "Articol tradus cu succes!",
    translateError: "Eroare la traducere. Încearcă din nou.",
    translateAllMissing: "Traduce toate lipsă (EN)",
    translatingAllMissing: "Se traduc articolele...",
    translateAllSuccess: (n: number) => `${n} articole procesate.`,
    translateAllNothing: "Toate articolele au deja traducere EN.",
    translateSkipped: (n: number) => `${n} sărite (blocate manual).`,
    badgeTranslated: "Tradus EN",
    badgeManual: "Editat Manual",
    badgeMissing: "Lipsă EN",
    badgeFailed: "Eșec traducere",
    retry: "Reîncearcă",
    lockLabel: "Blochează traducerea automată",
    lockHint:
      "Când e activ, funcțiile AI (individuale sau în bloc) NU vor mai suprascrie textele EN.",
    bulkProgress: (done: number, total: number) =>
      `Se traduc articolele... ${done}/${total}`,
    filterStatus: "Status",
    filterCategory: "Categorie",
    searchPlaceholder: "Caută titlu sau slug…",
    allStatuses: "Toate",
    statusPublished: "Publicat",
    statusDraft: "Draft",
    statusScheduled: "Programat",
    allCategories: "Toate categoriile",
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
    deleteDescription:
      "Are you sure you want to delete this article? This action cannot be undone.",
    saveSuccess: "Article saved!",
    deleteSuccess: "Article deleted!",
    error: "Error",
    tableHeaders: {
      title: "Title",
      category: "Category",
      status: "Status",
      access: "Access",
      translations: "Translations",
      date: "Updated",
      actions: "Actions",
    },
    draft: "Draft",
    publishedLabel: "Published",
    romanian: "Română",
    english: "English",
    copyToEn: "Copy to EN",
    copySuccess: "Content copied to English!",
    translateAI: "Translate with AI",
    translating: "Translating...",
    translateSuccess: "Article translated successfully!",
    translateError: "Translation error. Please try again.",
    translateAllMissing: "Translate all missing (EN)",
    translatingAllMissing: "Translating articles...",
    translateAllSuccess: (n: number) => `${n} articles processed.`,
    translateAllNothing: "All articles already have EN translations.",
    translateSkipped: (n: number) => `${n} skipped (manually locked).`,
    badgeTranslated: "EN translated",
    badgeManual: "Manually edited",
    badgeMissing: "Missing EN",
    badgeFailed: "Translation failed",
    retry: "Retry",
    lockLabel: "Lock automatic translation",
    lockHint:
      "When on, AI functions (single or bulk) will not overwrite the EN fields.",
    bulkProgress: (done: number, total: number) =>
      `Translating articles… ${done}/${total}`,
    filterStatus: "Status",
    filterCategory: "Category",
    searchPlaceholder: "Search title or slug…",
    allStatuses: "All",
    statusPublished: "Published",
    statusDraft: "Draft",
    statusScheduled: "Scheduled",
    allCategories: "All categories",
  },
};

const BlogManager = () => {
  const { language } = useLanguage();
  const t = translations[language] || translations.ro;

  // Filters (server-side).
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BlogStatusFilter>("all");
  const [category, setCategory] = useState<string>("all");

  // Debounce search input (400ms).
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput), 400);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  // Reset page when filters change.
  useEffect(() => {
    setPage(0);
  }, [search, status, category, pageSize]);

  const {
    articles,
    total,
    pageCount,
    isLoading,
    isFetching,
    snapshotByArticle,
    refetch,
  } = useBlogArticles({ page, pageSize, search, status, category });

  const { data: categoryOptions = [] } = useBlogCategoryOptions();

  // Selection state (per-page).
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAllVisible = () =>
    setSelectedIds((prev) => {
      const allSelected = articles.length > 0 && articles.every((a) => prev.has(a.id));
      if (allSelected) {
        const next = new Set(prev);
        articles.forEach((a) => next.delete(a.id));
        return next;
      }
      const next = new Set(prev);
      articles.forEach((a) => next.add(a.id));
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set());

  // Editor + delete dialogs.
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<BlogArticle | null>(null);
  const [deleteArticle, setDeleteArticle] = useState<BlogArticle | null>(null);

  const openDialog = (article?: BlogArticle) => {
    setEditingArticle(article ?? null);
    setIsDialogOpen(true);
  };

  // Bulk / analytics state.
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [isAutopilotRunning, setIsAutopilotRunning] = useState(false);
  const [isReauditing, setIsReauditing] = useState(false);
  const [isBulkTranslating, setIsBulkTranslating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [translationFailures, setTranslationFailures] = useState<Record<string, string>>({});
  const [retryingId, setRetryingId] = useState<string | null>(null);

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
      refetch();
    } catch (err) {
      console.error("Error deleting article:", err);
      toast({ title: t.error, variant: "destructive" });
    }
  };

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
      refetch();
    } catch (e) {
      toast({
        title: "Auto-Pilot eșuat",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setIsAutopilotRunning(false);
    }
  };

  const handleBulkSave = () => {
    if (selectedIds.size === 0) return;
    toast({
      title: "Salvare bulk",
      description: `${selectedIds.size} articole marcate pentru salvare (deschide fiecare pentru editare individuală).`,
    });
  };

  const handleBulkReaudit = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "Selectează articole",
        description: "Bifează articolele pentru re-audit SEO.",
      });
      return;
    }
    setIsReauditing(true);
    let ok = 0;
    let fail = 0;
    for (const id of selectedIds) {
      const article = articles.find((a) => a.id === id);
      if (!article) continue;
      try {
        const { error } = await supabase.functions.invoke("seo-audit", {
          body: { url: `https://realtrust.ro/blog/${article.slug}` },
        });
        if (error) fail++;
        else ok++;
      } catch {
        fail++;
      }
    }
    setIsReauditing(false);
    toast({
      title: "Re-audit SEO finalizat",
      description: `Reușite: ${ok} · Eșuate: ${fail}`,
    });
  };

  const translateOne = async (articleId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("translate-blog-articles", {
        body: { articleId, includeContent: true, limit: 1 },
      });
      if (error) throw error;
      const first = (data as { results?: Array<{ ok: boolean; error?: string }> })?.results?.[0];
      if (!first || first.ok !== true) throw new Error(first?.error || "unknown_error");
      setTranslationFailures((prev) => {
        const next = { ...prev };
        delete next[articleId];
        return next;
      });
      return true;
    } catch (err) {
      setTranslationFailures((prev) => ({
        ...prev,
        [articleId]: err instanceof Error ? err.message : String(err),
      }));
      return false;
    }
  };

  const handleTranslateAllMissing = async () => {
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
      refetch();
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
      refetch();
    } else {
      toast({
        title: t.translateError,
        description: translationFailures[articleId],
        variant: "destructive",
      });
    }
  };

  useBlogAdminShortcuts({
    onBulkSave: handleBulkSave,
    onReaudit: handleBulkReaudit,
  });

  const allVisibleSelected =
    articles.length > 0 && articles.every((a) => selectedIds.has(a.id));

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            {t.title}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowAnalytics((v) => !v)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              {showAnalytics ? "Ascunde Analytics" : "Arată Analytics"}
            </Button>
            <Button
              variant="outline"
              onClick={handleRunAutopilot}
              disabled={isAutopilotRunning}
              className="border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
            >
              {isAutopilotRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Bot className="w-4 h-4 mr-2" />
              )}
              AI Auto-Pilot
            </Button>
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

        {/* Analytics */}
        {showAnalytics && <BlogSEOAnalyticsPanel />}

        {/* 2-column Command Center */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-3">
            {/* Filter bar */}
            <div className="flex flex-wrap gap-2 items-center">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="h-9 max-w-[260px]"
              />
              <Select value={status} onValueChange={(v) => setStatus(v as BlogStatusFilter)}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder={t.filterStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allStatuses}</SelectItem>
                  <SelectItem value="published">{t.statusPublished}</SelectItem>
                  <SelectItem value="draft">{t.statusDraft}</SelectItem>
                  <SelectItem value="scheduled">{t.statusScheduled}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[220px] h-9">
                  <SelectValue placeholder={t.filterCategory} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.allCategories}</SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={refetch}
                disabled={isFetching}
                aria-label="Reîncarcă"
              >
                <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
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
                        <TableHead className="w-[40px]">
                          <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={toggleAllVisible}
                            aria-label="Selectează tot"
                          />
                        </TableHead>
                        <TableHead>{t.tableHeaders.title}</TableHead>
                        <TableHead>{t.tableHeaders.category}</TableHead>
                        <TableHead>{t.tableHeaders.access}</TableHead>
                        <TableHead>{t.tableHeaders.translations}</TableHead>
                        <TableHead>{t.tableHeaders.status}</TableHead>
                        <TableHead>{t.tableHeaders.date}</TableHead>
                        <TableHead className="w-[180px]">{t.tableHeaders.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {articles.map((article) => (
                        <BlogArticleRow
                          key={article.id}
                          article={article}
                          selected={selectedIds.has(article.id)}
                          onToggleSelect={toggleSelect}
                          snapshot={snapshotByArticle[article.id] ?? null}
                          translationFailure={translationFailures[article.id]}
                          isRetrying={retryingId === article.id}
                          onRetryTranslation={handleRetryTranslation}
                          onEdit={openDialog}
                          onDelete={setDeleteArticle}
                          onRolledBack={refetch}
                          language={language as "ro" | "en"}
                          labels={{
                            premiumLabel: t.premiumLabel,
                            publicLabel: t.publicLabel,
                            publishedLabel: t.publishedLabel,
                            draft: t.draft,
                            badgeTranslated: t.badgeTranslated,
                            badgeManual: t.badgeManual,
                            badgeMissing: t.badgeMissing,
                            badgeFailed: t.badgeFailed,
                            retry: t.retry,
                          }}
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <AdminPagination
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
              isFetching={isFetching}
            />
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <BlogLiveActivity />
          </div>
        </div>

        {/* Sticky bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
            <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckSquare className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedIds.size}</span> selectate
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={handleBulkSave}>
                  <Save className="h-4 w-4 mr-2" /> Salvează bulk
                  <kbd className="ml-2 rounded border bg-muted px-1.5 py-0.5 text-[10px]">⌘A</kbd>
                </Button>
                <Button size="sm" variant="outline" onClick={handleBulkReaudit} disabled={isReauditing}>
                  {isReauditing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Re-audit SEO
                  <kbd className="ml-2 rounded border bg-muted px-1.5 py-0.5 text-[10px]">⌘R</kbd>
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-2" /> Deselectează
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Dialog */}
        <BlogArticleEditor
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          article={editingArticle}
          onSaved={refetch}
          labels={{
            editArticle: t.editArticle,
            addArticle: t.addArticle,
            articleTitle: t.articleTitle,
            slug: t.slug,
            excerpt: t.excerpt,
            content: t.content,
            coverImage: t.coverImage,
            category: t.category,
            tags: t.tags,
            addTag: t.addTag,
            author: t.author,
            published: t.published,
            premium: t.premium,
            save: t.save,
            cancel: t.cancel,
            romanian: t.romanian,
            english: t.english,
            copyToEn: t.copyToEn,
            copySuccess: t.copySuccess,
            translateAI: t.translateAI,
            translating: t.translating,
            translateSuccess: t.translateSuccess,
            translateError: t.translateError,
            saveSuccess: t.saveSuccess,
            error: t.error,
            lockLabel: t.lockLabel,
            lockHint: t.lockHint,
          }}
        />

        {/* Hub SEO live preview */}
        <HubPreviewEditor />

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deleteArticle}
          onOpenChange={(open) => !open && setDeleteArticle(null)}
        >
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
    </TooltipProvider>
  );
};

export default BlogManager;
