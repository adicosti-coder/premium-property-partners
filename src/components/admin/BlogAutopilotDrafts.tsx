import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Send, CalendarClock, Trash2, Sparkles, Play, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ro } from "date-fns/locale";

const JOB_KEY = "blog.article_draft_autopilot";

interface Draft {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  meta_title: string | null;
  meta_description: string | null;
  scheduled_for: string | null;
  created_at: string;
}

function dtLocalValue(date: Date): string {
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60_000).toISOString().slice(0, 16);
}

export default function BlogAutopilotDrafts() {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scheduleFor, setScheduleFor] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const drafts = useQuery({
    queryKey: ["blog-autopilot-drafts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_articles")
        .select("id, title, slug, excerpt, content, category, tags, meta_title, meta_description, scheduled_for, created_at")
        .eq("ai_pending_review", true)
        .eq("is_published", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Draft[];
    },
  });

  const job = useQuery({
    queryKey: ["blog-autopilot-job"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("automation_jobs")
        .select("config, enabled, schedule, last_status, last_error, last_run_at")
        .eq("job_key", JOB_KEY)
        .maybeSingle();
      if (error) throw error;
      return data as { config: { paused?: boolean; paused_reason?: string | null }; enabled: boolean; schedule: string; last_status: string | null; last_error: string | null; last_run_at: string | null } | null;
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("blog-article-autopilot", {
        body: { triggered_by: "admin" },
      });
      if (error) throw error;
      return data as { created?: boolean; paused?: boolean; reason?: string; title?: string; error?: string; skipped?: boolean };
    },
    onSuccess: (data) => {
      if (data?.created) toast.success(`Draft generat: ${data.title}`);
      else if (data?.paused) toast.error(`Auto-pilot în pauză: ${data.reason ?? "necesită atenție"}`);
      else if (data?.skipped) toast.info(`Nimic de generat: ${data.reason}`);
      else toast.error(data?.error ?? "Generarea a eșuat");
      qc.invalidateQueries({ queryKey: ["blog-autopilot-drafts"] });
      qc.invalidateQueries({ queryKey: ["blog-autopilot-job"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Generarea a eșuat"),
  });

  const approve = useMutation({
    mutationFn: async ({ id, mode, when }: { id: string; mode: "now" | "schedule"; when?: string }) => {
      const patch: { ai_pending_review: boolean; scheduled_for?: string } = { ai_pending_review: false };
      if (mode === "now") patch.scheduled_for = new Date(Date.now() + 60_000).toISOString();
      else if (when) patch.scheduled_for = new Date(when).toISOString();
      const { error } = await supabase.from("blog_articles").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.mode === "now" ? "Programat pentru publicare (maximum 5 minute)" : "Articol programat");
      qc.invalidateQueries({ queryKey: ["blog-autopilot-drafts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Nu am putut salva"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Draft șters");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["blog-autopilot-drafts"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Ștergerea a eșuat"),
  });

  const resume = useMutation({
    mutationFn: async () => {
      const cfg = { ...(job.data?.config ?? {}), paused: false, paused_reason: null };
      const { error } = await supabase.from("automation_jobs").update({ config: cfg }).eq("job_key", JOB_KEY);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Auto-pilot repornit");
      qc.invalidateQueries({ queryKey: ["blog-autopilot-job"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Repornirea a eșuat"),
  });

  const paused = job.data?.config?.paused;
  const list = drafts.data ?? [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" /> Auto-pilot Articole
              </CardTitle>
              <CardDescription>
                Generează automat câte un draft de articol de blog ({job.data?.schedule ?? "marți și vineri 08:00"}) pe baza
                datelor reale din platformă. Tu aprobi: publici imediat, programezi sau ștergi.
              </CardDescription>
            </div>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending} aria-label="Generează un draft nou acum">
              {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generează draft acum
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paused && (
            <Alert className="mb-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Auto-pilot în pauză</AlertTitle>
              <AlertDescription className="flex items-center justify-between gap-4">
                <span>{job.data?.config?.paused_reason ?? "Generarea automată a fost oprită."}</span>
                <Button size="sm" variant="outline" onClick={() => resume.mutate()}>Reia</Button>
              </AlertDescription>
            </Alert>
          )}
          <div className="text-sm text-muted-foreground">
            {list.length} drafturi în așteptarea aprobării · ultima rulare:{" "}
            {job.data?.last_run_at ? formatDistanceToNow(new Date(job.data.last_run_at), { addSuffix: true, locale: ro }) : "niciodată"}
          </div>
        </CardContent>
      </Card>

      {drafts.isLoading && (
        <div className="flex items-center gap-2 p-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Se încarcă…
        </div>
      )}

      {list.map((d) => (
        <Card key={d.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg leading-snug">{d.title}</CardTitle>
                <CardDescription className="mt-1">
                  {formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: ro })} · {d.category}
                  {d.scheduled_for && (
                    <Badge variant="secondary" className="ml-2">
                      <CalendarClock className="mr-1 h-3 w-3" />
                      Programat {new Date(d.scheduled_for).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" })}
                    </Badge>
                  )}
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                aria-label={expanded === d.id ? "Ascunde articolul" : "Vezi articolul"}
              >
                {expanded === d.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{d.excerpt}</p>
            {d.meta_description && (
              <p className="text-xs text-muted-foreground border-l-2 pl-3">
                <strong>Meta:</strong> {d.meta_description}
              </p>
            )}
            {d.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {d.tags.map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            )}

            {expanded === d.id && (
              <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border p-4 max-h-[480px] overflow-y-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{d.content}</ReactMarkdown>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" onClick={() => approve.mutate({ id: d.id, mode: "now" })} disabled={approve.isPending}>
                <Send className="mr-1 h-4 w-4" /> Publică acum
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  type="datetime-local"
                  className="h-9 w-56"
                  value={scheduleFor[d.id] ?? dtLocalValue(new Date(Date.now() + 86_400_000))}
                  onChange={(e) => setScheduleFor((s) => ({ ...s, [d.id]: e.target.value }))}
                  aria-label="Data și ora publicării programate"
                />
                <Button size="sm" variant="outline" onClick={() => approve.mutate({ id: d.id, mode: "schedule", when: scheduleFor[d.id] })} disabled={approve.isPending}>
                  <CalendarClock className="mr-1 h-4 w-4" /> Programează
                </Button>
              </div>
              <Button size="sm" variant="destructive" onClick={() => setDeleteId(d.id)}>
                <Trash2 className="mr-1 h-4 w-4" /> Șterge
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {!drafts.isLoading && list.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nicio propunere în așteptare. Auto-pilotul generează singur un draft la intervalul programat, sau apasă „Generează draft acum”.
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi draftul?</AlertDialogTitle>
            <AlertDialogDescription>Articolul generat se șterge definitiv.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && remove.mutate(deleteId)}>Șterge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
