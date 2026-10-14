import { renderReelFromImages } from "@/lib/reelVideo";
import { renderStoryImage, validateStoryVideo } from "@/lib/storyMedia";
import { readSocialVariants, selectedVariant, type SocialVariants } from "@/lib/socialVariants";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { exportPdfReport } from "./socialEngine/exportPdf";
import { SocialAnalytics } from "./socialEngine/SocialAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import SocialEngineLogs from "./socialEngine/SocialEngineLogs";
import SocialAiSettings from "./socialEngine/SocialAiSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { formatSocialCaption } from "@/lib/socialDraftContent";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Instagram,
  Facebook,
  Pencil,
  Loader2,
  Sparkles,
  ExternalLink,
  Image as ImageIcon,
  Settings2,
  RefreshCw,
  Wand2,
  Globe,
  Trash2,
  CalendarIcon,
  Clock,
  X,
  Eye,
  Upload,
  Tag,
  Search,
  Send,
  FileText,
  Home,
  Filter,
  BarChart3,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SocialPost = {
  id: string;
  title: string;
  type: string;
  source_url: string;
  image_url: string | null;
  image_urls?: string[] | null;
  media_type?: string | null;
  video_url?: string | null;
  story_link_url?: string | null;
  content_variants?: SocialVariants | null;
  caption: string;
  status: string;
  posted_to: string[];
  created_at: string;
  updated_at: string;
  scheduled_at: string | null;
};

const INSTAGRAM_CAPTION_LIMIT = 2200;
type MediaType = "IMAGE" | "CAROUSEL" | "REELS" | "STORY";
type PostUpdates = { title?: string; caption?: string; image_url?: string | null; image_urls?: string[]; media_type?: MediaType; video_url?: string | null; story_link_url?: string | null; content_variants?: SocialVariants | null };
const MEDIA_LABELS: Record<MediaType, string> = { IMAGE: "Imagine Statică", CAROUSEL: "Carusel", REELS: "Reel Video", STORY: "Instagram / Facebook Story" };

export default function SocialEngine() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [postingPlatform, setPostingPlatform] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [scrapeKeywords, setScrapeKeywords] = useState("");
  const [keywordsOpen, setKeywordsOpen] = useState(false);
  const [savingKeywords, setSavingKeywords] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "property" | "blog">("all");
  const [activeTab, setActiveTab] = useState("drafts");
  const { toast } = useToast();

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("social_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching posts:", error);
    } else {
      setPosts((data || []).map(p => ({ ...p, content_variants: readSocialVariants(p.content_variants) })));
    }
    setLoading(false);
  }, []);

  const fetchWebhookUrl = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "webhook_url")
      .maybeSingle();
    if (data) setWebhookUrl(data.value);
  }, []);

  const fetchScrapeKeywords = useCallback(async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "scrape_keywords")
      .maybeSingle();
    if (data) setScrapeKeywords(data.value);
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchWebhookUrl();
    fetchScrapeKeywords();
  }, [fetchPosts, fetchWebhookUrl, fetchScrapeKeywords]);

  const saveWebhookUrl = async () => {
    let okUrl = false;
    try { const u = new URL(webhookUrl.trim()); okUrl = u.protocol === "https:" && /(^|\.)make\.com$/.test(u.hostname); } catch { okUrl = false; }
    if (!okUrl) {
      toast({ title: "URL Make.com invalid", description: "Folosește URL-ul webhook din Make.com (https://hook.….make.com/…).", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "webhook_url", value: webhookUrl }, { onConflict: "key" });
    if (error) {
      toast({ title: "Eroare", description: "Nu s-a putut salva URL-ul webhook Make.com.", variant: "destructive" });
    } else {
      setSettingsOpen(false);
      toast({ title: "Salvat", description: "URL-ul webhook Make.com a fost actualizat." });
    }
  };

  const saveScrapeKeywords = async () => {
    setSavingKeywords(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "scrape_keywords", value: scrapeKeywords }, { onConflict: "key" });
    setSavingKeywords(false);
    if (error) {
      toast({ title: "Eroare", description: "Nu s-au putut salva cuvintele cheie.", variant: "destructive" });
    } else {
      setKeywordsOpen(false);
      toast({ title: "Salvat", description: "Cuvintele cheie au fost actualizate." });
    }
  };

  const updateCaption = async (id: string, caption: string) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, caption } : p)));
    await supabase.from("social_posts").update({ caption }).eq("id", id);
  };

  const updatePost = async (id: string, updates: PostUpdates) => {
    const { error } = await supabase.from("social_posts").update(updates).eq("id", id);
    if (error) throw new Error("Modificările nu au putut fi salvate. Încearcă din nou.");
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    toast({ title: "Postare actualizată", description: "Modificările au fost salvate." });
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from("social_posts").delete().eq("id", id);
    if (error) {
      toast({ title: "Eroare", description: "Nu s-a putut șterge postarea.", variant: "destructive" });
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Șters", description: "Postarea a fost eliminată." });
    }
  };

  const schedulePost = async (id: string, date: Date | null) => {
    const scheduled_at = date ? date.toISOString() : null;
    const status = date ? "scheduled" : "draft";
    setPosts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, scheduled_at, status } : p))
    );
    await supabase
      .from("social_posts")
      .update({ scheduled_at, status } as any)
      .eq("id", id);
    toast({
      title: date ? "Postare programată" : "Programare eliminată",
      description: date ? `Programat pentru ${format(date, "PPP 'la' HH:mm")}` : "Postarea a fost mutată înapoi la ciorne.",
    });
  };

  const generateCaption = async (id: string) => {
    try {
    const post = posts.find((p) => p.id === id);
    if (!post) return;

    const { data, error } = await supabase.functions.invoke("generate-caption", {
      body: { title: post.title, type: post.type, source_url: post.source_url, post_id: post.id, variants: true },
    });

    if (error || data?.error) {
      toast({
        title: "Generare AI eșuată",
        description: data?.error || error?.message || "Încearcă din nou mai târziu.",
        variant: "destructive",
      });
      return;
    }

    if (data?.caption) {
      const variants = readSocialVariants(data.variants);
      if (!variants) throw new Error("Variantele generate sunt incomplete.");
      const sources = [...new Set((data.source_images ?? [post.image_url, ...(post.image_urls ?? [])]).filter(Boolean))].slice(0, 5) as string[];
      variants.FEED.image_url = sources[0] ?? post.image_url;
      variants.FEED.image_urls = sources;
      variants.STORY.story_link_url = post.source_url;
      try {
        if (!sources[0]) throw new Error("Lipsește fotografia pentru Story.");
        const blob = await renderStoryImage(sources[0], variants.STORY.overlay_text || post.title);
        const path = `social/stories/${post.id}-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage.from("property-images").upload(path, blob, { contentType: "image/jpeg" });
        if (uploadError) throw uploadError;
        variants.STORY.image_url = supabase.storage.from("property-images").getPublicUrl(path).data.publicUrl;
      } catch (e) { variants.STORY.error = e instanceof Error ? e.message : "Fotografia Story nu a putut fi creată."; }
      try {
        if (sources.length < 3) throw new Error("Reel necesită cel puțin 3 fotografii reale; adaugă poze sau un URL MP4 în editor.");
        const blob = await renderReelFromImages(sources);
        const path = `social-engine/reels/${post.id}-${Date.now()}.mp4`;
        const { error: uploadError } = await supabase.storage.from("social-reels").upload(path, blob, { contentType: "video/mp4" });
        if (uploadError) throw uploadError;
        const { data: signed, error: signError } = await supabase.storage.from("social-reels").createSignedUrl(path, 60 * 60 * 24 * 7);
        if (signError || !signed) throw signError ?? new Error("Link video indisponibil.");
        variants.REELS.video_url = signed.signedUrl;
      } catch (e) { variants.REELS.error = e instanceof Error ? e.message : "Video-ul nu a putut fi creat."; }
      const mode = (post.media_type as MediaType) || "IMAGE";
      const chosen = variants[selectedVariant(mode)];
      await updatePost(id, { content_variants: variants, caption: chosen.caption, image_url: chosen.image_url ?? variants.FEED.image_url, image_urls: sources, video_url: mode === "REELS" ? variants.REELS.video_url ?? null : null, story_link_url: mode === "STORY" ? post.source_url : null, media_type: mode === "IMAGE" && sources.length > 1 ? "CAROUSEL" : mode });
      toast({ title: "Variantele au fost salvate", description: [variants.REELS.error, variants.STORY.error].filter(Boolean).join(" ") || "Feed, Reels și Stories sunt pregătite, fără publicare." });
    }
    } catch (e) {
      toast({ title: "Generarea nu a fost finalizată", description: e instanceof Error ? e.message : "Încearcă din nou.", variant: "destructive" });
      throw e;
    }
  };

  const generateAllCaptions = async () => {
    const draftsWithoutCaptions = posts.filter(
      (p) => p.status === "draft" && (!p.caption || p.caption.trim() === "")
    );
    if (draftsWithoutCaptions.length === 0) {
      toast({ title: "Nimic de generat", description: "Toate ciornele au deja descrieri." });
      return;
    }

    setBulkGenerating(true);
    setBulkProgress({ done: 0, total: draftsWithoutCaptions.length });
    let successCount = 0;

    for (const post of draftsWithoutCaptions) {
      try {
        await generateCaption(post.id);
        successCount++;
      } catch {
        console.error("Failed to generate caption for", post.id);
      }
      setBulkProgress((prev) => ({ ...prev, done: prev.done + 1 }));
    }

    setBulkGenerating(false);
    toast({
      title: "Generare în masă finalizată",
      description: `Au fost generate ${successCount} din ${draftsWithoutCaptions.length} descrieri.`,
    });
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      const keywords = scrapeKeywords.split(",").map(k => k.trim()).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("scrape-realtrust", {
        body: { keywords },
      });

      if (error || !data?.success) {
        let details: string | undefined = data?.error;
        const ctx = (error as { context?: Response } | null)?.context;
        if (!details && ctx && typeof ctx.text === "function") {
          try {
            const raw = await ctx.text();
            try { details = JSON.parse(raw)?.error || raw; } catch { details = raw; }
          } catch { /* ignore */ }
        }
        if (ctx?.status === 401 || ctx?.status === 403) details = "Sesiunea de admin a expirat sau nu are drepturi. Reautentifică-te în Admin.";
        console.error("scrape-realtrust failed:", details || error);
        toast({
          title: "Extragerea a eșuat",
          description: details || error?.message || "Nu s-a putut extrage conținut de pe realtrust.ro",
          variant: "destructive",
        });
        return;
      }

      await fetchPosts();
      if (data.inserted > 0) {
        toast({
          title: `S-au adăugat ${data.inserted} ciorne noi!`,
          description: `Pe realtrust.ro: ${data.discovered} pagini de anunțuri/blog, ${data.duplicates} deja existente.`,
        });
      } else {
        toast({
          title: "Nimic nou de extras",
          description: "Toate articolele și anunțurile existente au fost deja extrase.",
        });
      }
    } catch (e) {
      console.error("scrape-realtrust exception:", e);
      toast({ title: "Eroare", description: "Extragerea a eșuat neașteptat. Verifică conexiunea și reîncearcă.", variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  const sendToMake = async (id: string, platforms: Array<"instagram" | "facebook">, label: string) => {
    if (!webhookUrl) {
      toast({ title: "Webhook Make.com neconfigurat", description: "Setează mai întâi URL-ul webhook Make.com.", variant: "destructive" });
      setSettingsOpen(true);
      return;
    }
    setPostingId(id);
    setPostingPlatform(platforms.length > 1 ? "both" : platforms[0]);
    try {
      const { data, error } = await supabase.functions.invoke("process-scheduled-posts", { body: { post_id: id, platforms } });
      if (error || !data?.success) {
        let msg = data?.error || error?.message || "Webhook-ul Make.com nu a răspuns.";
        try { const ctx = (error as any)?.context; if (ctx?.json) msg = (await ctx.json())?.error || msg; } catch { /* ignore */ }
        toast({ title: "Trimitere Make.com eșuată", description: msg, variant: "destructive" });
        return;
      }
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status: "posted", posted_to: data.posted_to } : p)));
      toast({ title: `Trimis către Make.com — ${label}`, description: "Webhook-ul Make.com a primit postarea. Verifică scenariul Make.com." });
    } finally {
      setPostingId(null);
      setPostingPlatform(null);
    }
  };

  const handlePost = (id: string, platform: "instagram" | "facebook") =>
    sendToMake(id, [platform], platform === "instagram" ? "Instagram" : "Facebook");

  const handlePostBoth = (id: string) => sendToMake(id, ["instagram", "facebook"], "Instagram și Facebook");

  const exportReport = (postsToExport: SocialPost[], filename: string) => {
    const headers = ["Titlu", "Tip", "Status", "Platforme", "URL Sursă", "Descriere", "Creat la", "Programat la"];
    const rows = postsToExport.map((p) => [
      `"${p.title.replace(/"/g, '""')}"`,
      p.type === "property" ? "Proprietate" : "Blog",
      p.status === "draft" ? "Ciornă" : p.status === "scheduled" ? "Programat" : "Postat",
      p.posted_to.join(", ") || "-",
      p.source_url,
      `"${(p.caption || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      format(new Date(p.created_at), "dd.MM.yyyy HH:mm"),
      p.scheduled_at ? format(new Date(p.scheduled_at), "dd.MM.yyyy HH:mm") : "-",
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Raport exportat", description: `${postsToExport.length} postări exportate în CSV.` });
  };

  // Filter & search
  const filterPosts = (arr: SocialPost[]) => {
    let filtered = arr;
    if (typeFilter !== "all") {
      filtered = filtered.filter((p) => p.type === typeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) => p.title.toLowerCase().includes(q) || p.caption.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const allDrafts = posts.filter((p) => p.status === "draft");
  const allScheduled = posts.filter((p) => p.status === "scheduled");
  const allPosted = posts.filter((p) => p.status === "posted");

  const drafts = filterPosts(allDrafts);
  const scheduled = filterPosts(allScheduled);
  const posted = filterPosts(allPosted);

  const withoutCaptions = allDrafts.filter((p) => !p.caption || p.caption.trim() === "").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-accent" />
            Motor Social
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Conținut social generat cu AI din{" "}
            <a href="https://realtrust.ro" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline inline-flex items-center gap-0.5">
              realtrust.ro <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={generateAllCaptions} disabled={bulkGenerating || withoutCaptions === 0}>
            {bulkGenerating ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generare {bulkProgress.done}/{bulkProgress.total}…</>
            ) : (
              <><Wand2 className="h-4 w-4 mr-1.5" /> Generează Descrieri {withoutCaptions > 0 && `(${withoutCaptions})`}</>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleScrape} disabled={scraping}>
            {scraping ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Globe className="h-4 w-4 mr-1.5" />}
            {scraping ? "Se extrage…" : "Extrage"}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={posts.length === 0}>
                <Download className="h-4 w-4 mr-1.5" /> Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1.5" align="end">
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => exportReport(posts, "raport_social")}>
                <FileText className="h-3.5 w-3.5 mr-2" /> Export CSV
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => { exportPdfReport(posts, "raport_social"); toast({ title: "Raport PDF exportat", description: `${posts.length} postări exportate în PDF.` }); }}>
                <FileText className="h-3.5 w-3.5 mr-2" /> Export PDF Premium
              </Button>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={fetchPosts}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Settings2 className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">URL Webhook Make.com</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">
                  Configurează un scenariu Make.com cu un <strong>declanșator Webhook</strong>, apoi lipește URL-ul mai jos.
                </p>
                <Label htmlFor="webhook">Webhook Make.com URL</Label>
                <Input id="webhook" placeholder="https://hook.eu1.make.com/..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} />
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={saveWebhookUrl}>Salvează</Button>
                <SocialAiSettings />
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={keywordsOpen} onOpenChange={setKeywordsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Tag className="h-4 w-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Cuvinte Cheie Scraping</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <p className="text-sm text-muted-foreground">Introduceți cuvintele cheie separate prin virgulă.</p>
                <Textarea
                  placeholder="apartament, casă, teren, vilă..."
                  value={scrapeKeywords}
                  onChange={(e) => setScrapeKeywords(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                {scrapeKeywords && (
                  <div className="flex flex-wrap gap-1.5">
                    {scrapeKeywords.split(",").map((k, i) => k.trim() && (
                      <Badge key={i} variant="secondary" className="text-xs">{k.trim()}</Badge>
                    ))}
                  </div>
                )}
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={saveScrapeKeywords} disabled={savingKeywords}>
                  {savingKeywords && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Salvează
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
            <FileText className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">{posts.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Postări</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
            <Pencil className="h-4 w-4 text-warning" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">{allDrafts.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Ciorne</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">{allScheduled.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Programate</p>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-success/10 flex items-center justify-center">
            <Send className="h-4 w-4 text-success" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground leading-none">{allPosted.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Publicate</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Caută după titlu sau descriere..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-[160px] h-9 text-sm">
            <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toate tipurile</SelectItem>
            <SelectItem value="property">Proprietăți</SelectItem>
            <SelectItem value="blog">Blog</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="drafts" className="text-sm gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Ciorne
            {allDrafts.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-5 min-w-[20px] px-1.5">{allDrafts.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="text-sm gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Programate
            {allScheduled.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-5 min-w-[20px] px-1.5">{allScheduled.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="posted" className="text-sm gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Publicate
            {allPosted.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-5 min-w-[20px] px-1.5">{allPosted.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-sm gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Analize
          </TabsTrigger>
          <TabsTrigger value="logs" className="text-sm gap-1.5">Istoric / Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="drafts">
          {drafts.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {drafts.map((post) => (
                <SocialCard key={post.id} post={post} onCaptionChange={updateCaption} onPost={handlePost} onPostBoth={handlePostBoth} onGenerate={generateCaption} onDelete={deletePost} onSchedule={schedulePost} onEdit={updatePost} isPosting={postingId === post.id} postingPlatform={postingPlatform} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Sparkles className="h-10 w-10 text-accent/40" />}
              title="Nicio ciornă"
              description={searchQuery || typeFilter !== "all" ? "Niciun rezultat pentru filtrele aplicate." : "Extrage conținut de pe realtrust.ro pentru a începe."}
              action={!searchQuery && typeFilter === "all" ? (
                <Button variant="outline" size="sm" onClick={handleScrape} disabled={scraping}>
                  {scraping ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Globe className="h-4 w-4 mr-1.5" />}
                  {scraping ? "Se extrage…" : "Extrage Conținut"}
                </Button>
              ) : undefined}
            />
          )}
        </TabsContent>

        <TabsContent value="scheduled">
          {scheduled.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {scheduled.map((post) => (
                <SocialCard key={post.id} post={post} onCaptionChange={updateCaption} onPost={handlePost} onPostBoth={handlePostBoth} onGenerate={generateCaption} onDelete={deletePost} onSchedule={schedulePost} onEdit={updatePost} isPosting={postingId === post.id} postingPlatform={postingPlatform} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CalendarIcon className="h-10 w-10 text-accent/40" />}
              title="Nicio postare programată"
              description="Programează postări din tab-ul Ciorne folosind calendar-ul."
            />
          )}
        </TabsContent>

        <TabsContent value="posted">
          {posted.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
              {posted.map((post) => (
                <SocialCard key={post.id} post={post} onCaptionChange={updateCaption} onPost={handlePost} onPostBoth={handlePostBoth} onGenerate={generateCaption} onDelete={deletePost} onSchedule={schedulePost} onEdit={updatePost} isPosting={false} postingPlatform={null} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Send className="h-10 w-10 text-success/40" />}
              title="Nicio postare publicată"
              description="Publică postări pe Instagram sau Facebook din tab-ul Ciorne."
            />
          )}
        </TabsContent>

        <TabsContent value="analytics">
          <SocialAnalytics posts={posts} />
        </TabsContent>
        <TabsContent value="logs">
          <SocialEngineLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon}
      <h3 className="text-sm font-semibold text-foreground mt-3">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ─── Schedule Picker ─── */
function SchedulePicker({ scheduledAt, onSchedule }: { scheduledAt: string | null; onSchedule: (date: Date | null) => void }) {
  const current = scheduledAt ? new Date(scheduledAt) : null;
  const [hour, setHour] = useState(current ? String(current.getHours()).padStart(2, "0") : "09");
  const [minute, setMinute] = useState(current ? String(current.getMinutes()).padStart(2, "0") : "00");

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    date.setHours(parseInt(hour), parseInt(minute), 0, 0);
    onSchedule(date);
  };

  const handleTimeChange = (newHour: string, newMinute: string) => {
    setHour(newHour);
    setMinute(newMinute);
    if (current) {
      const updated = new Date(current);
      updated.setHours(parseInt(newHour), parseInt(newMinute), 0, 0);
      onSchedule(updated);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className={cn("flex-1 text-xs justify-start", !scheduledAt && "text-muted-foreground")}>
            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
            {scheduledAt ? format(new Date(scheduledAt), "MMM d, HH:mm") : "Programează"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={current ?? undefined}
            onSelect={handleDateSelect}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
          <div className="border-t border-border px-3 py-2.5 flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <select value={hour} onChange={(e) => handleTimeChange(e.target.value, minute)} className="bg-muted text-foreground text-xs rounded px-1.5 py-1 border border-border focus:outline-none focus:ring-1 focus:ring-accent">
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground font-medium">:</span>
            <select value={minute} onChange={(e) => handleTimeChange(hour, e.target.value)} className="bg-muted text-foreground text-xs rounded px-1.5 py-1 border border-border focus:outline-none focus:ring-1 focus:ring-accent">
              {["00", "15", "30", "45"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </PopoverContent>
      </Popover>
      {scheduledAt && (
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => onSchedule(null)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

/* ─── Post Preview Modal ─── */
function PostPreviewModal({ post, open, onOpenChange }: { post: SocialPost; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Previzualizare Postare</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Instagram Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Instagram className="h-4 w-4 text-pink-500" />
              <span className="text-sm font-semibold text-foreground">Instagram</span>
            </div>
            <div className="rounded-lg border border-border overflow-hidden bg-card">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-primary-foreground">RT</span>
                </div>
                <span className="text-xs font-semibold text-foreground">realtrust.ro</span>
              </div>
              <div className={cn("bg-primary flex items-center justify-center relative", post.media_type === "STORY" || post.media_type === "REELS" ? "aspect-[9/16]" : "aspect-square")}>
                {post.video_url && (post.media_type === "REELS" || post.media_type === "STORY") ? <video src={post.video_url} controls playsInline className="w-full h-full object-contain" /> : post.image_url ? (
                  <img src={post.image_url} alt={post.title} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center px-6 space-y-2">
                    <ImageIcon className="h-10 w-10 mx-auto text-accent/60" />
                    <p className="text-xs text-primary-foreground/70 font-medium">{post.title}</p>
                  </div>
                )}
                {post.media_type === "STORY" && post.story_link_url && <a href={post.story_link_url} target="_blank" rel="noopener noreferrer" className="absolute bottom-12 min-h-12 flex items-center gap-2 bg-background text-foreground px-4 rounded-md"><ExternalLink className="h-4 w-4" />Vezi detaliile</a>}
              </div>
              <div className="px-3 py-2 space-y-1">
                <div className="flex gap-3">
                  <svg className="h-5 w-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <svg className="h-5 w-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <svg className="h-5 w-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </div>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">
                  <span className="font-semibold">realtrust.ro</span>{" "}
                  {post.caption ? formatSocialCaption(post.caption, { platform: "instagram", type: post.type === "blog" ? "blog" : "property" }) : <span className="text-muted-foreground italic">Nicio descriere încă</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Facebook Preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Facebook className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-foreground">Facebook</span>
            </div>
            <div className="rounded-lg border border-border overflow-hidden bg-card">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <div className="h-9 w-9 rounded-full bg-info flex items-center justify-center">
                  <span className="text-xs font-bold text-info-foreground">RT</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">RealTrust Imobiliare</p>
                  <p className="text-[10px] text-muted-foreground">Chiar acum · 🌐</p>
                </div>
              </div>
              <div className="px-3 pb-2">
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {post.caption ? formatSocialCaption(post.caption, { platform: "facebook", type: post.type === "blog" ? "blog" : "property", sourceUrl: post.source_url }) : <span className="text-muted-foreground italic">Nicio descriere încă</span>}
                </p>
              </div>
              <div className={cn("bg-primary flex items-center justify-center relative", post.media_type === "STORY" || post.media_type === "REELS" ? "aspect-[9/16]" : "aspect-video")}>
                {post.video_url && (post.media_type === "REELS" || post.media_type === "STORY") ? <video src={post.video_url} controls playsInline className="w-full h-full object-contain" /> : post.image_url ? (
                  <img src={post.image_url} alt={post.title} className="w-full h-full object-contain" />
                ) : (
                  <div className="text-center px-6 space-y-2">
                    <ImageIcon className="h-10 w-10 mx-auto text-accent/60" />
                    <p className="text-xs text-primary-foreground/70 font-medium">{post.title}</p>
                  </div>
                )}
                {post.media_type === "STORY" && post.story_link_url && <a href={post.story_link_url} target="_blank" rel="noopener noreferrer" className="absolute bottom-12 min-h-12 flex items-center gap-2 bg-background text-foreground px-4 rounded-md"><ExternalLink className="h-4 w-4" />Vezi detaliile</a>}
              </div>
              <div className="px-3 py-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">realtrust.ro</p>
                <p className="text-xs font-semibold text-foreground line-clamp-1">{post.title}</p>
              </div>
              <div className="flex border-t border-border">
                <button className="flex-1 py-1.5 text-xs text-muted-foreground font-medium hover:bg-muted/50 transition-colors">👍 Apreciază</button>
                <button className="flex-1 py-1.5 text-xs text-muted-foreground font-medium hover:bg-muted/50 transition-colors">💬 Comentează</button>
                <button className="flex-1 py-1.5 text-xs text-muted-foreground font-medium hover:bg-muted/50 transition-colors">↗ Distribuie</button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Post Edit Modal with Character Counter ─── */
function PostEditModal({
  post,
  open,
  onOpenChange,
  onSave,
}: {
  post: SocialPost;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (id: string, updates: PostUpdates) => Promise<void>;
}) {
  const [title, setTitle] = useState(post.title);
  const [caption, setCaption] = useState(post.caption);
  const [imageUrl, setImageUrl] = useState(post.image_url || "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preparingImage, setPreparingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [mediaType, setMediaType] = useState<MediaType>((post.media_type as MediaType) || "IMAGE");
  const [videoUrl, setVideoUrl] = useState(post.video_url || "");
  const [renderingVideo, setRenderingVideo] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [storyLinkUrl, setStoryLinkUrl] = useState(post.story_link_url ?? (post.media_type === "STORY" ? "" : post.source_url));
  const [saveError, setSaveError] = useState("");
  const [variants, setVariants] = useState<SocialVariants | null>(post.content_variants ?? null);
  const switchMedia = (value: MediaType) => {
    const nextVariants = variants ? { ...variants, [selectedVariant(mediaType)]: { ...variants[selectedVariant(mediaType)], caption, image_url: imageUrl, video_url: videoUrl || null, story_link_url: mediaType === "STORY" ? storyLinkUrl || null : null } } : null;
    setVariants(nextVariants);
    const chosen = nextVariants?.[selectedVariant(value)];
    setMediaType(value);
    if (chosen) {
      setCaption(chosen.caption);
      setImageUrl(chosen.image_url ?? nextVariants?.FEED.image_url ?? post.image_url ?? "");
      setVideoUrl(chosen.video_url ?? "");
      setVideoError(chosen.error ?? "");
      if (value === "STORY") setStoryLinkUrl(chosen.story_link_url ?? post.source_url);
    }
  };

  useEffect(() => {
    if (open) {
      setTitle(post.title);
      setCaption(post.caption);
      setImageUrl(post.image_url || "");
      setImageError("");
      setMediaType((post.media_type as MediaType) || "IMAGE");
      setVideoUrl(post.video_url || "");
      setVideoError("");
      setStoryLinkUrl(post.story_link_url ?? (post.media_type === "STORY" ? "" : post.source_url));
      setSaveError("");
      setVariants(post.content_variants ?? null);
    }
  }, [open, post]);

  const generateReel = async () => {
    setRenderingVideo(true);
    setVideoError("");
    try {
      const sources = [imageUrl, ...(post.image_urls ?? [])].filter(Boolean) as string[];
      if (!sources.length) throw new Error("Adaugă cel puțin o poză înainte de a genera video-ul.");
      const blob = await renderReelFromImages(sources);
      const fileName = `social-engine/reels/${post.id}-${Date.now()}.mp4`;
      const { error: upErr } = await supabase.storage.from("social-reels").upload(fileName, blob, { contentType: "video/mp4", upsert: true });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from("social-reels").createSignedUrl(fileName, 60 * 60 * 24 * 7);
      if (signErr || !signed) throw signErr ?? new Error("Link video indisponibil");
      setVideoUrl(signed.signedUrl);
    } catch (e) { setVideoError(e instanceof Error ? e.message : "Generarea video-ului a eșuat"); }
    finally { setRenderingVideo(false); }
  };

    const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `social-engine/${post.id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from("property-images")
        .getPublicUrl(fileName);
      setImageUrl(urlData.publicUrl);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      const hasVideo = mediaType === "REELS" || mediaType === "STORY";
      if (hasVideo && videoUrl.trim() && !/^https:\/\//.test(videoUrl.trim())) throw new Error("URL-ul video trebuie să înceapă cu https://");
      if (mediaType === "STORY" && storyLinkUrl.trim()) {
        const link = new URL(storyLinkUrl.trim());
        if (!["https:", "http:"].includes(link.protocol) || link.href.length > 2048) throw new Error("Story Link URL trebuie să fie o adresă web validă.");
      }
      let savedImage = imageUrl;
      if (mediaType === "STORY") {
        if (videoUrl.trim()) await validateStoryVideo(videoUrl.trim());
        else savedImage = await getPreparedImage("STORY");
      }
      const updatedVariants = variants ? { ...variants, [selectedVariant(mediaType)]: { ...variants[selectedVariant(mediaType)], caption, image_url: savedImage || null, video_url: hasVideo ? videoUrl.trim() || null : null, story_link_url: mediaType === "STORY" ? storyLinkUrl.trim() || null : null, error: null } } : null;
      await onSave(post.id, { title, caption, image_url: savedImage || null, media_type: mediaType, video_url: hasVideo ? (videoUrl.trim() || null) : null, story_link_url: mediaType === "STORY" ? (storyLinkUrl.trim() || null) : null, content_variants: updatedVariants });
      onOpenChange(false);
    } catch (e) { setSaveError(e instanceof Error ? e.message : "Salvarea a eșuat."); }
    finally { setSaving(false); }
  };

  const captionOverLimit = caption.length > INSTAGRAM_CAPTION_LIMIT;

  const getPreparedImage = async (format: MediaType): Promise<string> => {
    const { data, error } = await supabase.functions.invoke("process-scheduled-posts", { body: { post_id: post.id, dry_run: true, current_image: imageUrl || null, current_media_type: format, preview_image_only: true } });
    if (error) {
      const response = (error as { context?: Response }).context;
      const details = response ? await response.json().catch(() => null) : null;
      throw new Error(details?.error || error.message);
    }
    if (!data?.payload?.imageUrl) throw new Error(data?.error || "Imagine indisponibilă");
    return data.payload.imageUrl;
  };

  const prepareImage = async () => {
    setPreparingImage(true);
    setImageError("");
    try {
      setImageUrl(await getPreparedImage(mediaType === "STORY" ? "STORY" : "IMAGE"));
    } catch (e) { setImageError(e instanceof Error ? e.message : "Pregătirea imaginii a eșuat"); }
    finally { setPreparingImage(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Editează Postarea</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title" className="text-xs font-medium">Titlu</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tip conținut</Label>
            <Select value={mediaType} onValueChange={(v) => switchMedia(v as MediaType)}>
              <SelectTrigger className="min-h-12" aria-label="Tip conținut"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(MEDIA_LABELS) as MediaType[]).map((k) => <SelectItem key={k} value={k}>{MEDIA_LABELS[k]}</SelectItem>)}
              </SelectContent>
            </Select>
            {mediaType === "CAROUSEL" && <p className="text-[10px] text-muted-foreground">Se trimit până la 10 poze ale articolului/proprietății.</p>}
          </div>

          {(mediaType === "REELS" || mediaType === "STORY") && (
            <div className="space-y-2 rounded-md border border-border p-3">
              <Label className="text-xs font-medium">{mediaType === "STORY" ? "Video Story opțional (1080×1920)" : "Video Reel (9:16)"}</Label>
              {videoUrl && <video src={videoUrl} controls playsInline className="w-full max-h-80 rounded-md bg-muted aspect-[9/16] object-contain" />}
              <Button variant="outline" className="w-full min-h-12" onClick={generateReel} disabled={renderingVideo}>
                {renderingVideo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                {renderingVideo ? "Se creează video-ul…" : "Generează video 9:16 din poze"}
              </Button>
              <Input placeholder="sau lipește URL video MP4 (https://…)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="text-xs" aria-label="URL video MP4" />
              {mediaType === "STORY" && videoUrl && <Button variant="ghost" className="min-h-12" onClick={() => setVideoUrl("")}><X className="h-4 w-4 mr-2" />Folosește doar fotografia</Button>}
              {videoError && <p role="alert" className="text-xs text-destructive">{videoError}</p>}
            </div>
          )}

          {mediaType === "STORY" && <div className="space-y-1.5">
            <Label htmlFor="story-link-url" className="text-xs font-medium">Story Link URL (opțional)</Label>
            <Input id="story-link-url" type="url" maxLength={2048} placeholder="https://…" value={storyLinkUrl} onChange={(e) => setStoryLinkUrl(e.target.value)} />
          </div>}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{mediaType === "REELS" ? "Copertă" : "Imagine"}</Label>
            {imageUrl ? (
              <div className={cn("relative rounded-md overflow-hidden border border-border bg-muted group", mediaType === "STORY" ? "aspect-[9/16]" : "aspect-square")}>
                <img src={imageUrl} alt="Imaginea postării" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-background/90 text-foreground text-xs font-medium hover:bg-background transition-colors">
                      <Upload className="h-3.5 w-3.5" /> Înlocuiește
                    </span>
                  </label>
                  <Button variant="destructive" size="sm" className="text-xs h-auto py-1.5" onClick={() => setImageUrl("")}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Elimină
                  </Button>
                </div>
              </div>
            ) : (
              <label
                className={cn(
                  "flex flex-col items-center justify-center rounded-md border-2 border-dashed aspect-video cursor-pointer transition-colors",
                  dragOver ? "border-accent bg-accent/10" : "border-border bg-muted/30 hover:border-accent/50 hover:bg-muted/50"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-accent" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground font-medium">
                      Trage și plasează sau <span className="text-accent">click pentru a selecta</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">JPG, PNG, WebP</p>
                  </>
                )}
              </label>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground">sau lipește URL</span>
              <div className="flex-1 h-px bg-border" />
            </div>
            <Input placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="text-xs" />
            <Button variant="outline" className="w-full min-h-12" onClick={prepareImage} disabled={preparingImage || uploading}>
              {preparingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
              {preparingImage ? "Se pregătește imaginea…" : mediaType === "STORY" ? "Pregătește fotografia Story 1080×1920" : "Asociază imagine pentru Instagram"}
            </Button>
            {imageError && <p role="alert" className="text-xs text-destructive">{imageError}</p>}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-caption" className="text-xs font-medium">Descriere</Label>
              <span className={cn(
                "text-[10px] tabular-nums",
                captionOverLimit ? "text-destructive font-medium" : "text-muted-foreground"
              )}>
                {caption.length}/{INSTAGRAM_CAPTION_LIMIT}
              </span>
            </div>
            <Textarea id="edit-caption" value={caption} onChange={(e) => setCaption(e.target.value)} className="min-h-[120px] resize-none" />
            {captionOverLimit && (
              <p className="text-[10px] text-destructive">⚠ Descrierea depășește limita Instagram de {INSTAGRAM_CAPTION_LIMIT} caractere</p>
            )}
          </div>
          {saveError && <p role="alert" className="text-xs text-destructive">{saveError}</p>}
          <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSave} disabled={saving || uploading || preparingImage || renderingVideo || !title.trim()}>
            {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Pencil className="h-4 w-4 mr-1.5" />}
            {saving ? "Se salvează…" : "Salvează Modificările"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Social Card (Premium) ─── */
function SocialCard({
  post,
  onCaptionChange,
  onPost,
  onPostBoth,
  onGenerate,
  onDelete,
  onSchedule,
  onEdit,
  isPosting,
  postingPlatform,
}: {
  post: SocialPost;
  onCaptionChange: (id: string, v: string) => void;
  onPost: (id: string, p: "instagram" | "facebook") => void;
  onPostBoth: (id: string) => void;
  onGenerate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSchedule: (id: string, date: Date | null) => Promise<void>;
  onEdit: (id: string, updates: PostUpdates) => Promise<void>;
  isPosting: boolean;
  postingPlatform: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try { await onGenerate(post.id); }
    catch { /* Parent reports the error; retain the existing draft. */ }
    finally { setGenerating(false); }
  };

  const hasImage = !!post.image_url;
  const alreadyOnIG = post.posted_to.includes("instagram");
  const alreadyOnFB = post.posted_to.includes("facebook");
  const alreadyOnBoth = alreadyOnIG && alreadyOnFB;

  return (
    <Card className="shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
      {/* Image / Placeholder */}
      <div className="relative w-full aspect-[16/10] bg-primary overflow-hidden">
        {hasImage ? (
          <img src={post.image_url ?? ""} alt={post.title} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center">
            <div className="text-center px-6 space-y-2">
              <ImageIcon className="h-8 w-8 mx-auto text-accent/50" />
              <p className="text-xs text-primary-foreground/60 font-medium leading-snug max-w-[200px] mx-auto line-clamp-2">
                {post.title}
              </p>
            </div>
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Top badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className="px-2 py-0.5 rounded bg-accent text-accent-foreground text-[9px] font-heading font-bold uppercase tracking-wider">
            RealTrust
          </span>
          <Badge className={cn(
            "text-[9px] border-0",
            post.type === "property" ? "bg-info/90 text-info-foreground" : "bg-accent/90 text-accent-foreground"
          )}>
            {post.type === "property" ? "Proprietate" : "Blog"}
          </Badge>
        </div>
        
        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" aria-label={`Previzualizează postarea ${post.title}`} className="h-7 w-7 p-0 bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 hover:text-white" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-black/30 backdrop-blur-sm text-white hover:bg-black/50 hover:text-white" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 bg-black/30 backdrop-blur-sm text-white hover:bg-destructive hover:text-white">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-heading">Șterge postarea?</AlertDialogTitle>
                <AlertDialogDescription>
                  Această acțiune este ireversibilă. Postarea „{post.title}" va fi eliminată definitiv.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anulează</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(post.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Șterge
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Status badge at bottom */}
        <div className="absolute bottom-2 left-2">
          <Badge className={cn(
            "text-[10px] border-0 shadow-sm",
            post.status === "draft" ? "bg-warning/90 text-warning-foreground" :
            post.status === "scheduled" ? "bg-accent/90 text-accent-foreground" :
            "bg-success/90 text-success-foreground"
          )}>
            {post.status === "draft" ? "Ciornă" : post.status === "scheduled" ? "Programat" : "Publicat"}
          </Badge>
          {post.posted_to.length > 0 && (
            <div className="flex gap-1 mt-1">
              {post.posted_to.map((p) => (
                <Badge key={p} variant="secondary" className="text-[9px] bg-black/30 text-white border-0 backdrop-blur-sm capitalize">{p}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <CardHeader className="pb-2 pt-3 flex-row items-start justify-between space-y-0 gap-2">
        <div className="min-w-0">
          <CardTitle className="text-sm font-heading leading-snug line-clamp-2">{post.title}</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">
            {format(new Date(post.created_at), "dd MMM yyyy, HH:mm")}
            {post.scheduled_at && (
              <span className="text-accent ml-1.5">
                · Programat: {format(new Date(post.scheduled_at), "dd MMM, HH:mm")}
              </span>
            )}
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-4 flex flex-col flex-1 gap-3">
        {/* Caption */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <Label className="text-xs text-muted-foreground">
              <Sparkles className="inline h-3 w-3 mr-0.5 text-accent" /> Descriere AI
            </Label>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="min-h-12 px-1.5 text-xs text-muted-foreground" onClick={handleGenerate} disabled={generating}>
                {generating ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                {generating ? "Se generează…" : "Generează 3 variante"}
              </Button>
              <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-muted-foreground" onClick={() => setEditing(!editing)}>
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          </div>
          {editing ? (
            <div className="space-y-1">
              <Textarea value={post.caption} onChange={(e) => onCaptionChange(post.id, e.target.value)} className="text-xs min-h-[100px] resize-none" />
              <div className="flex justify-between">
                <span className={cn(
                  "text-[10px] tabular-nums",
                  post.caption.length > INSTAGRAM_CAPTION_LIMIT ? "text-destructive" : "text-muted-foreground"
                )}>
                  {post.caption.length}/{INSTAGRAM_CAPTION_LIMIT}
                </span>
                <Button variant="ghost" size="sm" className="h-5 px-2 text-[10px]" onClick={() => setEditing(false)}>Gata</Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-4 bg-muted/50 rounded-md p-2.5 leading-relaxed">
              {post.caption || <span className="italic">Nicio descriere — generează cu AI</span>}
            </p>
          )}
        </div>

        {/* Schedule */}
        {post.status !== "posted" && (
          <SchedulePicker
            scheduledAt={post.scheduled_at}
            onSchedule={(date) => onSchedule(post.id, date)}
          />
        )}

        {/* Publish Buttons */}
        <div className="flex flex-col gap-2 mt-auto pt-1">
          {/* Publish both */}
          {!alreadyOnBoth && (
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-600 text-white hover:opacity-90 text-xs"
              disabled={isPosting || !post.caption}
              onClick={() => onPostBoth(post.id)}
            >
              {isPosting && postingPlatform === "both" ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1.5" />
              )}
              Publică pe Ambele
            </Button>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 bg-gradient-to-r from-pink-500 to-orange-400 text-white hover:opacity-90 text-xs" disabled={isPosting || alreadyOnIG || !post.caption} onClick={() => onPost(post.id, "instagram")}>
              {isPosting && postingPlatform === "instagram" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Instagram className="h-3.5 w-3.5 mr-1" />}
              {alreadyOnIG ? "✓ IG" : "Instagram"}
            </Button>
            <Button size="sm" className="flex-1 bg-info text-info-foreground hover:bg-info/90 text-xs" disabled={isPosting || alreadyOnFB || !post.caption} onClick={() => onPost(post.id, "facebook")}>
              {isPosting && postingPlatform === "facebook" ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Facebook className="h-3.5 w-3.5 mr-1" />}
              {alreadyOnFB ? "✓ FB" : "Facebook"}
            </Button>
          </div>
        </div>
      </CardContent>
      <PostPreviewModal post={post} open={previewOpen} onOpenChange={setPreviewOpen} />
      <PostEditModal post={post} open={editOpen} onOpenChange={setEditOpen} onSave={onEdit} />
    </Card>
  );
}
