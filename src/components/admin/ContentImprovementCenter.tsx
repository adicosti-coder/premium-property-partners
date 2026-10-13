import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Check, FileText, Loader2, RefreshCw, Sparkles, Undo2, Wand2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Item = {
  id: string; kind: string; title: string; rationale: string | null; confidence: number | null;
  current_value: Record<string, unknown> | null; proposed_value: Record<string, unknown> | null;
  evidence: { text?: string; conversation_ids?: string[] } | null; status: string; outcome: Record<string, unknown> | null;
  error: string | null; created_at: string; target_id?: string | null; decided_at: string | null;
};

const KIND: Record<string, string> = {
  blog_seo: "SEO articol", social_tone: "Ton social", social_hashtags: "Hashtag-uri",
  social_caption: "Descriere socială", blog_topic: "Subiect articol nou", insight: "Observație",
  wa_message: "Mesaj WhatsApp", wa_hours: "Ore trimitere WhatsApp", prospect_source: "Surse & zone", andrei_rule: "Regulă Andrei",
  social_hours: "Orar postări social", social_featured: "Proprietatea săptămânii", integration_retry: "Integrări & webhooks",
  lead_archive: "Curățare lead-uri", cta_ab: "Variantă CTA", lead_followup: "Clienți de recontactat", listing_refresh: "Anunțuri fără contacte",
};
const MODULE: Record<string, string> = {
  blog_seo: "blog", blog_topic: "blog", insight: "blog",
  social_tone: "social", social_hashtags: "social", social_caption: "social", social_hours: "social", social_featured: "social",
  integration_retry: "ops", lead_archive: "ops", cta_ab: "cro", lead_followup: "outreach", listing_refresh: "cro",
  wa_message: "outreach", wa_hours: "outreach", prospect_source: "outreach", andrei_rule: "outreach",
};
const isWhatsapp = (i: Item) => i.proposed_value?.scope === "whatsapp";
const MODULES: Array<[string, string]> = [["all", "Toate"], ["whatsapp", "Calitate WhatsApp"], ["blog", "Blog & SEO"], ["social", "Social"], ["ops", "Integrări"], ["cro", "Conversii"], ["outreach", "Prospectare"]];
const HIDDEN = new Set(["measured_at", "lead_ids", "row_id", "previous_config", "archived_ids", "social_post_id", "previous_followups", "scope", "code", "previous_lessons", "applied_lessons"]);
const LABEL: Record<string, string> = {
  meta_title: "Titlu Google", meta_description: "Descriere Google", title: "Titlu", tone: "Ton",
  hashtags: "Hashtag-uri", caption: "Descriere", topic: "Subiect", zone: "Zonă", reason: "Motiv",
  views_14d_before: "Vizite 14 zile înainte", views_14d_after: "Vizite 14 zile după", delta: "Diferență",
  sends: "Trimiteri Make.com", success_rate: "Rată reușită",
  article_title: "Articol creat", slug: "Adresă", converted_to: "Transformată în propunere SEO",
  name: "Nume șablon", body: "Text mesaj", best_hours: "Ore recomandate", source: "Portal", recommendation: "Recomandare", lesson: "Regulă",
  internal_links: "Linkuri interne", query: "Căutare Google", start_hour: "Ora de start", end_hour: "Ora de final",
  min_interval_minutes: "Minute între postări", image_urls: "Poze", source_url: "Link anunț", scheduled_at: "Programată pentru",
  make_dlq: "Make.com în coadă", crm_failed: "Lead-uri nesincronizate CRM", social_engine_failed_7d: "Social Engine eșuate (7 zile)",
  wa_failed_7d: "WhatsApp eșuate (7 zile)", calls_failed_7d: "Apeluri eșuate (7 zile)", retry_make: "Retrimite Make.com", retry_crm: "Retrimite CRM",
  field: "Buton", text: "Text buton", clicks_before: "Click-uri 14 zile înainte", clicks_after: "Click-uri 14 zile după", home_clicks_14d: "Click-uri 14 zile",
  rolled_back_at: "Anulat la", crm_requeued: "Lead-uri repuse în CRM", make: "Make.com",
  conversations_14d: "Conversații inspectate", signals_before: "Semnale înainte", signals_after: "Semnale după", conversations_after: "Conversații inspectate după", comparison: "Limitele comparației",
  active_rules: "Reguli active acum", score_before: "Scor apeluri înainte", score_after: "Scor apeluri după", calls_after: "Apeluri analizate după",
};
const FIELD: Record<string, string> = { hero_cta_primary_ro: "Butonul principal (pagina de start)", hero_cta_secondary_ro: "Butonul secundar (pagina de start)" };
const fmt = (v: unknown): string => {
  if (typeof v === "boolean") return v ? "Da" : "Nu";
  if (typeof v === "number" && v <= 1 && v > 0 && !Number.isInteger(v)) return `${Math.round(v * 100)}%`;
  if (typeof v === "string" && FIELD[v]) return FIELD[v];
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return new Date(v).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest" });
  if (Array.isArray(v)) return v.map((x) => x && typeof x === "object" ? Object.values(x).join(" → ") : String(x)).join("\n") || "—";
  if (v && typeof v === "object") return Object.entries(v).map(([k, x]) => `${LABEL[k] ?? k}: ${x}`).join(" · ");
  return String(v ?? "—");
};

function Values({ v }: { v: Record<string, unknown> | null }) {
  if (!v) return null;
  return (
    <dl className="space-y-1 text-sm">
      {Object.entries(v).filter(([k]) => !HIDDEN.has(k)).map(([k, val]) => (
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

  const rollback = async (id: string) => {
    setBusy(id);
    const { data, error } = await supabase.functions.invoke("content-self-improve", { body: { action: "rollback", id } });
    setBusy(null);
    if (error || data?.ok === false) toast({ title: "Nu s-a putut anula", description: data?.error ?? "Reîncearcă.", variant: "destructive" });
    else toast({ title: "Anulat", description: "Valorile de dinainte au fost restaurate." });
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
    blog_topic: { label: "Creează draft articol", desc: "AI scrie un articol nou adaptat pentru Timișoara (titlu, structură, conținut) și îl deschide în editor, nepublicat.", icon: FileText, run: "draft_article" },
    insight: { label: "Rescrie Titlu & Meta SEO", desc: "AI propune pe loc un titlu și o meta-descriere optimizate pentru Google pentru articolul vizat; le aprobi tu.", icon: Wand2, run: "seo_rewrite" },
    blog_seo: { label: "Actualizează meta-datele articolului", desc: "Înlocuiește titlul și descrierea din Google ale articolului cu varianta propusă. Linkurile interne propuse le adaugi tu în editor.", icon: Check, run: "apply" },
    social_tone: { label: "Aprobă și aplică", desc: "Schimbă tonul descrierilor generate în Social Engine.", icon: Check, run: "apply" },
    social_hashtags: { label: "Aprobă și aplică", desc: "Înlocuiește hashtag-urile implicite din Social Engine.", icon: Check, run: "apply" },
    andrei_rule: { label: "Aprobă și adaugă la Andrei", desc: "Adaugă regula în Training Lab (maximum 5 active). Scorul apelurilor se compară după 14 zile.", icon: Check, run: "apply" },
    social_caption: { label: "Aprobă și aplică", desc: "Înlocuiește descrierea draftului social.", icon: Check, run: "apply" },
    prospect_source: { label: "Setează prioritate maximă", desc: "", icon: Check, run: "apply" },
    social_hours: { label: "Aprobă și aplică orarul", desc: "Schimbă intervalul orar în care se publică automat postările pe Facebook și Instagram.", icon: Check, run: "apply" },
    social_featured: { label: "Aprobă și programează postarea în Social Engine", desc: "Creează postarea „Proprietatea săptămânii” cu pozele anunțului și o programează în Social Engine la data afișată.", icon: Check, run: "apply" },
    integration_retry: { label: "Execută re-încercare webhook", desc: "Retrimite acum mesajele Make.com din coadă și repune lead-urile nesincronizate în trimiterea către CRM.", icon: RefreshCw, run: "apply" },
    lead_archive: { label: "Arhivează lead-uri inactive", desc: "Scoate lead-urile reci din Lead Manager fără să le șteargă. Le poți readuce cu „Anulează”.", icon: Check, run: "apply" },
    lead_followup: { label: "Programează recontactarea azi", desc: "Pune acești clienți în lista de recontactat de azi din Lead Manager. Nu trimite nimic automat — folosești mesajul sugerat când îi suni sau le scrii.", icon: Check, run: "apply" },
    listing_refresh: { label: "Am notat, le revizuiesc", desc: "Marchează propunerea ca rezolvată. Modificările la poze, titlu sau preț le faci tu în anunț.", icon: Check, run: "apply" },
    cta_ab: { label: "Aplică variația A/B pe butonul CTA", desc: "Schimbă textul butonului pe pagina de start. După 14 zile se compară click-urile înainte și după; poți reveni oricând cu „Anulează”.", icon: Check, run: "apply" },
  };

  const [mod, setMod] = useState("all");
  const inMod = (i: Item) => mod === "all" || (isWhatsapp(i) ? mod === "whatsapp" : MODULE[i.kind] === mod);
  const pending = items.filter((i) => i.status === "pending" && inMod(i));
  const history = items.filter((i) => i.status !== "pending" && inMod(i));

  const Card = ({ i }: { i: Item }) => (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{isWhatsapp(i) ? "Calitate conversații WhatsApp" : KIND[i.kind] ?? i.kind}</Badge>
        {i.confidence != null && <span className="text-xs text-muted-foreground">Încredere {Math.round(i.confidence * 100)}%</span>}
        {i.status !== "pending" && <Badge variant={i.status === "applied" ? "default" : i.status === "failed" ? "destructive" : "outline"}>
          {i.status === "applied" ? "Aplicat" : i.status === "failed" ? "Eșuat" : i.status === "rolled_back" ? "Anulat" : "Respins"}</Badge>}
        <span className="ml-auto text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString("ro-RO")}</span>
      </div>
      <p className="font-heading font-semibold">{i.title}</p>
      {i.rationale && <p className="text-sm text-muted-foreground">{i.rationale}</p>}
      {i.evidence?.text && <p className="text-xs text-muted-foreground">Date: {i.evidence.text}</p>}
      {isWhatsapp(i) && i.evidence?.conversation_ids?.slice(0, 5).map((id, n) => (
        <Button key={id} variant="outline" size="sm" className="min-h-12" onClick={() => navigate(`/admin/hub-wa-conversations?view=whatsapp-live&conversation=${id}`)}>Verifică discuția {n + 1}</Button>
      ))}
      <div className="grid gap-3 md:grid-cols-2">
        {i.current_value && <div className="rounded bg-muted p-3"><p className="text-xs font-semibold mb-1">Acum</p><Values v={i.current_value} /></div>}
        <div className={`rounded-lg border-2 p-3 space-y-2 ${i.status === "pending" ? "border-primary/40 bg-primary/5" : "border-border bg-muted"}`}>
          <p className="text-xs font-semibold">Propunere</p>
          <Values v={i.proposed_value} />
          {i.status === "pending" && ACTION[i.kind] && (() => {
            const base = ACTION[i.kind]; const Icon = base.icon;
            const src = String((i.proposed_value as any)?.source ?? ""); const zone = String((i.proposed_value as any)?.zone ?? "");
            const a = i.kind === "prospect_source"
              ? { ...base, label: `Setează prioritate maximă la scraping pe ${src}`, desc: `Activează ${src} în Prospectare cu numărul maxim de rezultate pe scanare (20)${zone ? ` și adaugă zona ${zone} în filtrul de zone` : ""}.` }
              : isWhatsapp(i) ? { ...base, label: "Aprobă regula pentru WhatsApp", desc: "Salvează regula pentru răspunsurile AI viitoare; nu trimite mesaje și nu modifică istoricul.", run: "apply" as const } : base;
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
      {i.status === "applied" && (isWhatsapp(i) || !["integration_retry", "blog_topic", "insight", "andrei_rule", "wa_message", "wa_hours", "listing_refresh"].includes(i.kind)) && (
        <Button size="sm" variant="outline" className="min-h-12" disabled={busy === i.id} onClick={() => rollback(i.id)}>
          {busy === i.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}Anulează (revino la varianta anterioară)
        </Button>
      )}
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
          <p className="text-sm text-muted-foreground">Blog, SEO, Social, integrări (Make.com, WhatsApp, apeluri), conversii pe site, prospectare și Andrei: sistemul analizează săptămânal datele reale, propune îmbunătățiri și învață din deciziile tale. Nimic nu se aplică fără aprobare.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} aria-label="Reîncarcă"><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" onClick={analyze} disabled={running}>{running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Analizează acum</Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrează după modul">
        {MODULES.map(([k, l]) => (
          <Button key={k} size="sm" variant={mod === k ? "default" : "outline"} className="min-h-12" aria-pressed={mod === k} onClick={() => setMod(k)}>
            {l} ({items.filter((i) => i.status === "pending" && (k === "all" || (isWhatsapp(i) ? k === "whatsapp" : MODULE[i.kind] === k))).length})
          </Button>
        ))}
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
