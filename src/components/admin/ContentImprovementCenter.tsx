import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, FileText, Loader2, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Item = {
  id: string; kind: string; title: string; rationale: string | null; confidence: number | null;
  current_value: Record<string, unknown> | null; proposed_value: Record<string, unknown> | null;
  evidence: { text?: string } | null; status: string; outcome: Record<string, unknown> | null;
  error: string | null; created_at: string; target_id?: string | null; decided_at: string | null;
};

const KIND: Record<string, string> = {
  blog_seo: "SEO articol", social_tone: "Ton social", social_hashtags: "Hashtag-uri",
  social_caption: "Descriere socială", blog_topic: "Subiect articol nou", insight: "Observație",
};
const LABEL: Record<string, string> = {
  meta_title: "Titlu Google", meta_description: "Descriere Google", title: "Titlu", tone: "Ton",
  hashtags: "Hashtag-uri", caption: "Descriere", topic: "Subiect", zone: "Zonă", reason: "Motiv",
  views_14d_before: "Vizite 14 zile înainte", views_14d_after: "Vizite 14 zile după", delta: "Diferență",
  sends: "Trimiteri Make.com", success_rate: "Rată reușită",
  article_title: "Articol creat", slug: "Adresă", converted_to: "Transformată în propunere SEO",
};
const fmt = (v: unknown) => typeof v === "number" && v <= 1 && v > 0 && !Number.isInteger(v) ? `${Math.round(v * 100)}%` : String(v ?? "—");

function Values({ v }: { v: Record<string, unknown> | null }) {
  if (!v) return null;
  return (
    <dl className="space-y-1 text-sm">
      {Object.entries(v).filter(([k]) => k !== "measured_at").map(([k, val]) => (
        <div key={k}><dt className="text-xs text-muted-foreground">{LABEL[k] ?? k}</dt><dd className="whitespace-pre-wrap break-words">{fmt(val)}</dd></div>
      ))}
    </dl>
  );
}

export default function ContentImprovementCenter() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    const { data } = await supabase.from("content_improvements").select("*").order("created_at", { ascending: false }).limit(200);
    setItems((data as Item[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const analyze = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("content-self-improve", { body: { action: "analyze" } });
    setRunning(false);
    if (error || data?.error) toast({ title: "Analiza nu a reușit", description: data?.error ?? "Reîncearcă peste câteva minute.", variant: "destructive" });
    else toast({ title: "Analiză gata", description: `${data.created} propuneri noi · ${data.measured} rezultate măsurate.` });
    load();
  };

  const decide = async (id: string, action: "apply" | "reject") => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke("content-self-improve", { body: { action, id } });
    setBusy(null);
    if (error || data?.ok === false) toast({ title: "Eroare", description: data?.error ?? "Acțiunea nu s-a salvat.", variant: "destructive" });
    else toast({ title: action === "apply" ? "Aplicat" : "Respins", description: action === "apply" ? "Efectul se măsoară automat după 14 zile." : "Sistemul nu va mai propune la fel." });
    load();
  };

  const runAction = async (i: Item, action: "draft_article" | "seo_rewrite") => {
    setBusy(i.id);
    const { data, error } = await supabase.functions.invoke("content-self-improve", { body: { action, id: i.id } });
    setBusy(null);
    if (error || !data?.ok) {
      toast({ title: "Nu a reușit", description: data?.error ?? "Reîncearcă peste câteva minute.", variant: "destructive" });
      return load();
    }
    if (action === "draft_article") {
      toast({ title: "Draft creat", description: `„${data.title}” se deschide în editor.` });
      navigate(`/admin/blog?edit=${data.article_id}`);
    } else {
      toast({ title: "Propunere SEO gata", description: "Verifică titlul și meta-descrierea, apoi apasă „Aprobă și aplică”." });
      load();
    }
  };

  const ACTION: Record<string, { label: string; desc: string; icon: typeof Wand2; run: "draft_article" | "seo_rewrite" | "apply" }> = {
    blog_topic: { label: "Generează draft articol", desc: "AI scrie un articol nou adaptat pentru Timișoara (titlu, structură, conținut) și îl deschide în editor, nepublicat.", icon: FileText, run: "draft_article" },
    insight: { label: "Rescrie Titlu & Meta SEO", desc: "AI propune pe loc un titlu și o meta-descriere optimizate pentru Google pentru articolul vizat; le aprobi tu.", icon: Wand2, run: "seo_rewrite" },
    blog_seo: { label: "Aprobă și aplică", desc: "Înlocuiește titlul și descrierea din Google ale articolului cu varianta propusă.", icon: Check, run: "apply" },
    social_tone: { label: "Aprobă și aplică", desc: "Schimbă tonul descrierilor generate în Social Engine.", icon: Check, run: "apply" },
    social_hashtags: { label: "Aprobă și aplică", desc: "Înlocuiește hashtag-urile implicite din Social Engine.", icon: Check, run: "apply" },
    social_caption: { label: "Aprobă și aplică", desc: "Înlocuiește descrierea draftului social.", icon: Check, run: "apply" },
  };

  const pending = items.filter((i) => i.status === "pending");
  const history = items.filter((i) => i.status !== "pending");

  const Card = ({ i }: { i: Item }) => (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{KIND[i.kind] ?? i.kind}</Badge>
        {i.confidence != null && <span className="text-xs text-muted-foreground">Încredere {Math.round(i.confidence * 100)}%</span>}
        {i.status !== "pending" && <Badge variant={i.status === "applied" ? "default" : i.status === "failed" ? "destructive" : "outline"}>
          {i.status === "applied" ? "Aplicat" : i.status === "failed" ? "Eșuat" : "Respins"}</Badge>}
        <span className="ml-auto text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString("ro-RO")}</span>
      </div>
      <p className="font-heading font-semibold">{i.title}</p>
      {i.rationale && <p className="text-sm text-muted-foreground">{i.rationale}</p>}
      {i.evidence?.text && <p className="text-xs text-muted-foreground">Date: {i.evidence.text}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {i.current_value && <div className="rounded bg-muted p-3"><p className="text-xs font-semibold mb-1">Acum</p><Values v={i.current_value} /></div>}
        <div className={`rounded-lg border-2 p-3 space-y-2 ${i.status === "pending" ? "border-primary/40 bg-primary/5" : "border-border bg-muted"}`}>
          <p className="text-xs font-semibold">Propunere</p>
          <Values v={i.proposed_value} />
          {i.status === "pending" && ACTION[i.kind] && (() => {
            const a = ACTION[i.kind]; const Icon = a.icon;
            return (
              <div className="space-y-2 border-t border-border pt-2">
                <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Ce face AI-ul: </span>{a.desc}</p>
                <Button size="sm" className="min-h-12 w-full sm:w-auto" disabled={busy === i.id}
                  onClick={() => a.run === "apply" ? decide(i.id, "apply") : runAction(i, a.run)}>
                  {busy === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}{a.label}
                </Button>
              </div>
            );
          })()}
          {i.status === "applied" && i.kind === "blog_topic" && i.target_id && (
            <Button size="sm" variant="outline" className="min-h-12" onClick={() => navigate(`/admin/blog?edit=${i.target_id}`)}><FileText className="h-4 w-4" />Deschide în editor</Button>
          )}
        </div>
      </div>
      {i.outcome && <div className="rounded border border-border p-3"><p className="text-xs font-semibold mb-1">Efect măsurat</p><Values v={i.outcome} /></div>}
      {i.error && <p className="text-xs text-destructive">{i.error}</p>}
      {i.status === "pending" && (
        <div className="flex gap-2">
          {!ACTION[i.kind] && <Button size="sm" variant="outline" className="min-h-12" onClick={() => decide(i.id, "apply")} disabled={busy === i.id}><Check className="h-4 w-4" />Notat</Button>}
          <Button size="sm" variant="outline" className="min-h-12" onClick={() => decide(i.id, "reject")} disabled={busy === i.id}><X className="h-4 w-4" />Respinge</Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-bold">Centru Auto-îmbunătățire</h2>
          <p className="text-sm text-muted-foreground">Blog, SEO și Social: sistemul analizează săptămânal datele reale, propune îmbunătățiri și învață din deciziile tale. Nimic nu se aplică fără aprobare.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} aria-label="Reîncarcă"><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={analyze} disabled={running}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Analizează acum</Button>
        </div>
      </div>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">De aprobat ({pending.length})</TabsTrigger>
          <TabsTrigger value="history">Istoric & efect ({history.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-3">
          {loading ? <p className="text-sm text-muted-foreground">Se încarcă…</p> : pending.length ? pending.map((i) => <Card key={i.id} i={i} />)
            : <p className="text-sm text-muted-foreground py-8 text-center">Nicio propunere în așteptare. Apasă „Analizează acum”.</p>}
        </TabsContent>
        <TabsContent value="history" className="space-y-3">
          {history.length ? history.map((i) => <Card key={i.id} i={i} />) : <p className="text-sm text-muted-foreground py-8 text-center">Încă nicio decizie.</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
