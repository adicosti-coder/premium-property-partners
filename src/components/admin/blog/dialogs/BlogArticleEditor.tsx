import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Copy,
  Globe,
  Languages,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import RichTextEditor from "../../RichTextEditor";
import type { BlogArticle } from "../hooks/useBlogArticles";

interface Labels {
  editArticle: string;
  addArticle: string;
  articleTitle: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  tags: string;
  addTag: string;
  author: string;
  published: string;
  premium: string;
  save: string;
  cancel: string;
  romanian: string;
  english: string;
  copyToEn: string;
  copySuccess: string;
  translateAI: string;
  translating: string;
  translateSuccess: string;
  translateError: string;
  saveSuccess: string;
  error: string;
  lockLabel: string;
  lockHint: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: BlogArticle | null;
  onSaved: () => void;
  labels: Labels;
}

const emptyForm = {
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
  scheduled_for: "",
  faq_items_json: "",
};

const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export const BlogArticleEditor = ({
  open,
  onOpenChange,
  article,
  onSaved,
  labels: t,
}: Props) => {
  const [formData, setFormData] = useState({ ...emptyForm });
  const [tagInput, setTagInput] = useState("");
  const [activeTab, setActiveTab] = useState<"ro" | "en">("ro");
  const [isSaving, setIsSaving] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [faqJsonError, setFaqJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (article) {
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
      setFormData({ ...emptyForm });
    }
    setFaqJsonError(null);
    setActiveTab("ro");
    setTagInput("");
  }, [open, article]);

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title),
    }));
  };

  const handleAddTag = () => {
    const v = tagInput.trim();
    if (v && !formData.tags.includes(v)) {
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, v] }));
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== tag) }));
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
      const { data, error } = await supabase.functions.invoke(
        "translate-blog-article",
        {
          body: {
            title: formData.title,
            excerpt: formData.excerpt,
            content: formData.content,
          },
        },
      );
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setFormData((prev) => ({
        ...prev,
        title_en: (data as any).title_en,
        excerpt_en: (data as any).excerpt_en,
        content_en: (data as any).content_en,
      }));
      setActiveTab("en");
      toast({ title: t.translateSuccess });
    } catch (err) {
      toast({
        title: t.translateError,
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSave = async () => {
    if (
      !formData.title ||
      !formData.slug ||
      !formData.excerpt ||
      !formData.content ||
      !formData.category
    ) {
      toast({
        title: t.error,
        description: "Completează toate câmpurile obligatorii.",
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const enFieldsChanged = article
        ? (article.title_en || "") !== (formData.title_en || "") ||
          (article.excerpt_en || "") !== (formData.excerpt_en || "") ||
          (article.content_en || "") !== (formData.content_en || "")
        : !!(formData.title_en || formData.excerpt_en || formData.content_en);
      const translationLocked = formData.translation_locked || enFieldsChanged;

      // FAQ JSON validation (Google FAQPage Rich Results spec).
      let faqItems: unknown = null;
      if (formData.faq_items_json.trim()) {
        try {
          const parsed = JSON.parse(formData.faq_items_json);
          if (!Array.isArray(parsed)) throw new Error("faq_items trebuie să fie un array JSON");
          if (parsed.length === 0) throw new Error("array-ul FAQ este gol");
          if (parsed.length > 12)
            throw new Error(`prea multe întrebări (${parsed.length}); Google recomandă max. 12`);
          const htmlTag = /<\/?[a-z][\s\S]*?>/i;
          parsed.forEach((item, idx) => {
            if (!item || typeof item !== "object" || Array.isArray(item))
              throw new Error(`item #${idx + 1}: trebuie să fie obiect JSON`);
            const q = (item as any).question ?? (item as any).q;
            const a = (item as any).answer ?? (item as any).a;
            if (typeof q !== "string" || !q.trim())
              throw new Error(`item #${idx + 1}: câmpul "question" lipsește sau este gol`);
            if (typeof a !== "string" || !a.trim())
              throw new Error(`item #${idx + 1}: câmpul "answer" lipsește sau este gol`);
            if (htmlTag.test(q))
              throw new Error(`item #${idx + 1}: "question" nu poate conține HTML (Google Rich Results)`);
            if (q.length > 300)
              throw new Error(`item #${idx + 1}: "question" > 300 caractere (limită Rich Results)`);
            if (a.length > 1000)
              throw new Error(`item #${idx + 1}: "answer" > 1000 caractere; scurtează pentru snippet valid`);
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
      const payload = articleData as unknown as Record<string, unknown>;

      if (article) {
        const { error } = await supabase
          .from("blog_articles")
          .update(payload as never)
          .eq("id", article.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_articles").insert(payload as never);
        if (error) throw error;
      }

      toast({ title: t.saveSuccess });
      onOpenChange(false);
      onSaved();

      // IndexNow ping (best-effort).
      try {
        const { notifyIndexNow } = await import("@/hooks/useIndexNowNotify");
        notifyIndexNow([`/blog/${articleData.slug}`]);
      } catch {}
    } catch (err) {
      console.error("Error saving article:", err);
      toast({ title: t.error, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-primary" />
            {article ? t.editArticle : t.addArticle}
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "ro" | "en")}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="ro" className="gap-2">🇷🇴 {t.romanian}</TabsTrigger>
              <TabsTrigger value="en" className="gap-2">🇬🇧 {t.english}</TabsTrigger>
            </TabsList>

            {activeTab === "ro" && (
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleCopyToEnglish} className="gap-2">
                  <Copy className="w-4 h-4" />
                  {t.copyToEn}
                </Button>
                <Button type="button" size="sm" onClick={handleTranslateWithAI} disabled={isTranslating} className="gap-2">
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

          <TabsContent value="ro" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t.articleTitle} (RO) *</Label>
                <Input id="title" value={formData.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Titlul articolului..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">{t.slug} *</Label>
                <Input id="slug" value={formData.slug} onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))} placeholder="titlu-articol" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt">{t.excerpt} (RO) *</Label>
              <Textarea id="excerpt" value={formData.excerpt} onChange={(e) => setFormData((p) => ({ ...p, excerpt: e.target.value }))} placeholder="Rezumat scurt al articolului..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{t.content} (RO) *</Label>
              <RichTextEditor content={formData.content} onChange={(content) => setFormData((p) => ({ ...p, content }))} placeholder="Scrie conținutul articolului..." />
            </div>
          </TabsContent>

          <TabsContent value="en" className="space-y-4 mt-0">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
              <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                English translation - Leave empty to use Romanian content as fallback
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title_en">{t.articleTitle} (EN)</Label>
              <Input id="title_en" value={formData.title_en} onChange={(e) => setFormData((p) => ({ ...p, title_en: e.target.value }))} placeholder="Article title..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt_en">{t.excerpt} (EN)</Label>
              <Textarea id="excerpt_en" value={formData.excerpt_en} onChange={(e) => setFormData((p) => ({ ...p, excerpt_en: e.target.value }))} placeholder="Short excerpt of the article..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{t.content} (EN)</Label>
              <RichTextEditor content={formData.content_en} onChange={(content_en) => setFormData((p) => ({ ...p, content_en }))} placeholder="Write the article content..." />
            </div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Label htmlFor="translation_locked" className="cursor-pointer">{t.lockLabel}</Label>
                <p className="text-xs text-muted-foreground mt-1">{t.lockHint}</p>
              </div>
              <Switch id="translation_locked" checked={formData.translation_locked} onCheckedChange={(checked) => setFormData((p) => ({ ...p, translation_locked: checked }))} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cover_image">{t.coverImage}</Label>
              <Input id="cover_image" value={formData.cover_image} onChange={(e) => setFormData((p) => ({ ...p, cover_image: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t.category} *</Label>
              <Input id="category" value={formData.category} onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))} placeholder="Sfaturi, Noutăți, Ghiduri..." />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author">{t.author}</Label>
              <Input id="author" value={formData.author_name} onChange={(e) => setFormData((p) => ({ ...p, author_name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{t.tags}</Label>
              <div className="flex gap-2">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())} placeholder={t.addTag} />
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
              <Switch id="is_published" checked={formData.is_published} onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_published: checked }))} />
              <Label htmlFor="is_published">{t.published}</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="is_premium" checked={formData.is_premium} onCheckedChange={(checked) => setFormData((p) => ({ ...p, is_premium: checked }))} />
              <Label htmlFor="is_premium">{t.premium}</Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="scheduled_for">📅 Programează publicare (opțional)</Label>
              <Input id="scheduled_for" type="datetime-local" value={formData.scheduled_for} onChange={(e) => setFormData((p) => ({ ...p, scheduled_for: e.target.value }))} />
              <p className="text-xs text-muted-foreground">
                Dacă e completată în viitor, articolul rămâne draft până la data setată, apoi este publicat automat (verificare la fiecare 5 min).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq_items_json">❓ FAQ structurat (JSON, opțional)</Label>
              <Textarea
                id="faq_items_json"
                value={formData.faq_items_json}
                onChange={(e) => {
                  setFormData((p) => ({ ...p, faq_items_json: e.target.value }));
                  setFaqJsonError(null);
                }}
                rows={5}
                placeholder={`[\n  { "question": "Cum funcționează X?", "answer": "..." }\n]`}
                className={`font-mono text-xs ${faqJsonError ? "border-destructive" : ""}`}
              />
              <p className="text-xs text-muted-foreground">
                Suprascrie FAQ-ul automat. Este prins de generatorul FAQPage JSON-LD pentru Rich Snippets Google.
              </p>
              {faqJsonError && (
                <p className="text-xs text-destructive">JSON invalid: {faqJsonError}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BlogArticleEditor;
