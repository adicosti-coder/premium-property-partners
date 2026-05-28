import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle2, XCircle, Pencil, Loader2, Sparkles,
  ShieldCheck, ExternalLink, FileText, Eye, Search, Filter, X,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import OriginalContactReveal from "@/components/admin/OriginalContactReveal";
import { useAdminRole } from "@/hooks/useAdminRole";
import { notifyIndexNow } from "@/hooks/useIndexNowNotify";

import type { User } from "@supabase/supabase-js";

type DraftProperty = {
  id: string;
  name: string;
  slug: string | null;
  location: string | null;
  description_ro: string | null;
  long_description_ro: string | null;
  images: string[] | null;
  original_description_raw: string | null;
  original_source_url: string | null;
  sanitization_log: any;
  imported_at: string | null;
  import_source: string | null;
  listing_type: string | null;
  property_subtype: string | null;
  base_price_per_night: number | null;
  capital_necesar: number | null;
  size: number | null;
  rooms: number | null;
  images_processing_status: string | null;
  images_processed_at: string | null;
};

const PHONE_RE = /(?:\+?40[\s.\-]?|0)(?:7\d{2}|2\d{2}|3\d{2})[\s.\-]?\d{3}[\s.\-]?\d{3}/g;
const INTL_PHONE_RE = /\+\d{1,3}[\s.\-]?\d{2,4}[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}/g;
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const ADDRESS_RE =
  /\b(?:Str\.?|Strada|Bd\.?|Bdul\.?|Bulevardul|Calea|Aleea|Splaiul|Piața|Piata|Intrarea|Șos\.?|Soseaua|Drumul)\s+[A-ZȘȚĂÂÎ][\wșțăâîȘȚĂÂÎ.\-]+(?:\s+[A-ZȘȚĂÂÎa-zșțăâî.\-]+){0,4}(?:\s*(?:nr\.?|no\.?)?\s*\d+[A-Za-z]?(?:\s*[-/]\s*\d+)?)?/gi;

const AI_KEYWORDS = [
  "RealTrust", "investiție", "investitie", "randament", "ROI", "regim hotelier",
  "premium", "renovat", "complet mobilat", "oportunitate", "rentabil",
  "centrul", "central", "zonă", "zona", "modernă", "modernizat", "exclusivist",
];

function escRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightRaw(text: string, removedPhrases: string[]): string {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const wrap = (re: RegExp, label: string) =>
    html.replace(re, (m) => `<mark class="bg-destructive/20 text-destructive rounded px-0.5" title="${label}">${m}</mark>`);

  html = wrap(EMAIL_RE, "email eliminat");
  html = wrap(PHONE_RE, "telefon eliminat");
  html = wrap(INTL_PHONE_RE, "telefon internațional");
  html = wrap(ADDRESS_RE, "adresă exactă");

  for (const p of removedPhrases || []) {
    if (!p) continue;
    try {
      const re = new RegExp(`\\b${escRe(p)}\\b`, "gi");
      html = html.replace(re, (m) =>
        `<mark class="bg-destructive/20 text-destructive rounded px-0.5" title="frază interzisă">${m}</mark>`);
    } catch { /* noop */ }
  }
  return html.replace(/\n/g, "<br/>");
}

function highlightSanitized(text: string): string {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  for (const kw of AI_KEYWORDS) {
    const re = new RegExp(`\\b(${escRe(kw)})\\b`, "gi");
    html = html.replace(re, `<mark class="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded px-0.5">$1</mark>`);
  }
  // Bracket replacements added by sanitizer
  html = html.replace(/\[contact prin RealTrust\]/g,
    `<mark class="bg-primary/20 text-primary rounded px-1 font-medium">[contact prin RealTrust]</mark>`);
  html = html.replace(/zonă centrală/gi,
    `<mark class="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded px-0.5">zonă centrală</mark>`);
  return html.replace(/\n/g, "<br/>");
}

export default function FastReview() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { isAdmin, isLoading: roleLoading } = useAdminRole(user);

  const [rows, setRows] = useState<DraftProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actingId, setActingId] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [editTarget, setEditTarget] = useState<DraftProperty | null>(null);
  const [editShort, setEditShort] = useState("");
  const [editLong, setEditLong] = useState("");
  const [editName, setEditName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPropType, setFilterPropType] = useState<string>("all");
  const [filterListingType, setFilterListingType] = useState<string>("all");
  const [filterZone, setFilterZone] = useState<string>("all");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");



  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setAuthChecked(true);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("id,name,slug,location,description_ro,long_description_ro,images,original_description_raw,original_source_url,sanitization_log,imported_at,import_source,listing_type,property_subtype,base_price_per_night,capital_necesar,size,rooms,images_processing_status,images_processed_at")
      .eq("needs_review", true)
      .order("imported_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      setRows((data as DraftProperty[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { if (isAdmin) load(); }, [isAdmin, load]);

  // Derived: known zones + property subtypes from current rows
  const knownZones = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.location) set.add(r.location.trim()); });
    return Array.from(set).sort();
  }, [rows]);
  const knownSubtypes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.property_subtype) set.add(r.property_subtype); });
    return Array.from(set).sort();
  }, [rows]);
  const knownListingTypes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => { if (r.listing_type) set.add(r.listing_type); });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;
    return rows.filter((r) => {
      if (filterPropType !== "all" && r.property_subtype !== filterPropType) return false;
      if (filterListingType !== "all" && r.listing_type !== filterListingType) return false;
      if (filterZone !== "all" && (r.location || "").trim() !== filterZone) return false;
      const price = r.listing_type === "vanzare" ? r.capital_necesar : r.base_price_per_night;
      if (min !== null && (price ?? 0) < min) return false;
      if (max !== null && (price ?? Number.POSITIVE_INFINITY) > max) return false;
      if (q) {
        const hay = `${r.name ?? ""} ${r.description_ro ?? ""} ${r.long_description_ro ?? ""} ${r.location ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, filterPropType, filterListingType, filterZone, priceMin, priceMax]);

  const visibleIds = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);
  const visibleSelectedCount = useMemo(
    () => Array.from(selected).filter((id) => visibleIds.has(id)).length,
    [selected, visibleIds],
  );

  const clearFilters = () => {
    setSearch(""); setFilterPropType("all"); setFilterListingType("all");
    setFilterZone("all"); setPriceMin(""); setPriceMax("");
  };
  const hasActiveFilters = !!search || filterPropType !== "all" || filterListingType !== "all"
    || filterZone !== "all" || !!priceMin || !!priceMax;


  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    // Toggle only currently visible (filtered) rows
    const allVisibleSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
    setSelected((prev) => {
      const n = new Set(prev);
      if (allVisibleSelected) filtered.forEach((r) => n.delete(r.id));
      else filtered.forEach((r) => n.add(r.id));
      return n;
    });
  };

  // Fire-and-forget: feed the learning loop (never blocks UI)
  const recordLearn = useCallback(async (payload: {
    property_id: string;
    action: "approve" | "edit" | "reject";
    ai_title?: string;
    ai_description?: string;
    final_title?: string;
    final_description?: string;
    reason?: string;
  }) => {
    try {
      await supabase.functions.invoke("listing-import-learn", { body: payload });
    } catch (err) {
      console.warn("learn call failed (non-fatal):", err);
    }
  }, []);

  const approve = async (id: string) => {
    setActingId(id);
    const { error } = await supabase
      .from("properties")
      .update({ is_active: true, needs_review: false, review_action: "approve", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    setActingId(null);
    if (error) return toast({ title: "Eroare", description: error.message, variant: "destructive" });
    toast({ title: "Publicat", description: "Anunțul este acum activ pe site." });
    void recordLearn({ property_id: id, action: "approve" });
    setRows((p) => p.filter((r) => r.id !== id));
    setSelected((p) => { const n = new Set(p); n.delete(id); return n; });
  };

  const reject = async (row: DraftProperty) => {
    setActingId(row.id);
    const log = { ...(row.sanitization_log || {}), review_status: "rejected", rejected_at: new Date().toISOString() };
    const { error } = await supabase
      .from("properties")
      .update({ is_active: false, needs_review: false, review_action: "reject", reviewed_at: new Date().toISOString(), sanitization_log: log })
      .eq("id", row.id);
    setActingId(null);
    if (error) return toast({ title: "Eroare", description: error.message, variant: "destructive" });
    toast({ title: "Respins", description: "Anunțul a fost marcat ca invalid (istoric păstrat)." });
    void recordLearn({
      property_id: row.id,
      action: "reject",
      ai_title: row.name || "",
      ai_description: row.long_description_ro || row.description_ro || "",
      reason: "Respins manual din FastReview",
    });
    setRows((p) => p.filter((r) => r.id !== row.id));
    setSelected((p) => { const n = new Set(p); n.delete(row.id); return n; });
  };

  const openEdit = (row: DraftProperty) => {
    setEditTarget(row);
    setEditName(row.name || "");
    setEditShort(row.description_ro || "");
    setEditLong(row.long_description_ro || "");
  };
  const saveEdit = async () => {
    if (!editTarget) return;
    setSavingEdit(true);
    const originalName = editTarget.name || "";
    const originalLong = editTarget.long_description_ro || "";
    const { error } = await supabase
      .from("properties")
      .update({ name: editName, description_ro: editShort, long_description_ro: editLong })
      .eq("id", editTarget.id);
    setSavingEdit(false);
    if (error) return toast({ title: "Eroare", description: error.message, variant: "destructive" });
    toast({ title: "Salvat", description: "Modificările sunt aplicate. Poți acum aproba." });
    void recordLearn({
      property_id: editTarget.id,
      action: "edit",
      ai_title: originalName,
      ai_description: originalLong,
      final_title: editName,
      final_description: editLong,
    });
    setRows((p) => p.map((r) => r.id === editTarget.id
      ? { ...r, name: editName, description_ro: editShort, long_description_ro: editLong }
      : r));
    setEditTarget(null);
  };

  const approveBatch = async () => {
    const ids = Array.from(selected).filter((id) => visibleIds.has(id));
    if (ids.length === 0) return;
    setBatchRunning(true);
    const { error } = await supabase
      .from("properties")
      .update({ is_active: true, needs_review: false, review_action: "approve", reviewed_at: new Date().toISOString() })
      .in("id", ids);
    setBatchRunning(false);
    if (error) return toast({ title: "Eroare batch", description: error.message, variant: "destructive" });
    toast({ title: `${ids.length} anunțuri publicate`, description: "Toate cele vizibile selectate sunt acum active." });
    ids.forEach((id) => void recordLearn({ property_id: id, action: "approve" }));
    const idSet = new Set(ids);
    setRows((p) => p.filter((r) => !idSet.has(r.id)));
    setSelected((p) => { const n = new Set(p); ids.forEach((id) => n.delete(id)); return n; });
  };


  if (!authChecked || roleLoading) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (!user) {
    navigate("/auth");
    return null;
  }
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <Alert variant="destructive">
          <AlertTitle>Acces interzis</AlertTitle>
          <AlertDescription>Această pagină este rezervată administratorilor.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Vedere Rapidă Revizuire — Admin" description="Diff viewer pentru anunțurile auto-importate." />
      <div className="border-b bg-card sticky top-0 z-30">
        <div className="container mx-auto py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-1" />Admin</Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                Vedere Rapidă Revizuire
              </h1>
              <p className="text-xs text-muted-foreground">
                {filtered.length}/{rows.length} vizibile · {visibleSelectedCount} selectate (din {selected.size} total)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleAll} disabled={filtered.length === 0}>
              {filtered.length > 0 && filtered.every((r) => selected.has(r.id))
                ? "Deselectează vizibile"
                : "Selectează vizibile"}
            </Button>
            <Button
              size="sm"
              onClick={approveBatch}
              disabled={visibleSelectedCount === 0 || batchRunning}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {batchRunning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
              Aprobă {visibleSelectedCount > 0 ? `(${visibleSelectedCount} vizibile)` : "în masă"}
            </Button>
          </div>
        </div>
      </div>

      {/* Global filter panel */}
      <div className="border-b bg-muted/30">
        <div className="container mx-auto py-3 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Căutare full-text în titlu, descriere, zonă…"
                className="pl-8 h-9"
              />
            </div>

            <Select value={filterPropType} onValueChange={setFilterPropType}>
              <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Tip proprietate" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate tipurile</SelectItem>
                {knownSubtypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterListingType} onValueChange={setFilterListingType}>
              <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="Tranzacție" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate</SelectItem>
                {knownListingTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterZone} onValueChange={setFilterZone}>
              <SelectTrigger className="h-9 w-[180px]"><SelectValue placeholder="Zonă" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">Toate zonele</SelectItem>
                {knownZones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1">
              <Input
                type="number" inputMode="numeric" placeholder="Preț min €"
                value={priceMin} onChange={(e) => setPriceMin(e.target.value)}
                className="h-9 w-[110px]"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="number" inputMode="numeric" placeholder="Preț max €"
                value={priceMax} onChange={(e) => setPriceMax(e.target.value)}
                className="h-9 w-[110px]"
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9">
                <X className="h-4 w-4 mr-1" />Resetează
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Filter className="h-3 w-3" />
              Filtre active · acțiunile batch operează doar asupra celor {filtered.length} anunțuri vizibile.
            </div>
          )}
        </div>
      </div>


      <div className="container mx-auto py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Coadă goală</AlertTitle>
            <AlertDescription>
              Nu există anunțuri în așteptare pentru revizuire. Sistemul de auto-publish va popula automat lista la următoarea rulare.
            </AlertDescription>
          </Alert>
        ) : filtered.length === 0 ? (
          <Alert>
            <Filter className="h-4 w-4" />
            <AlertTitle>Niciun rezultat</AlertTitle>
            <AlertDescription>
              Filtrele active nu returnează niciun anunț. Ajustează criteriile sau apasă „Resetează”.
            </AlertDescription>
          </Alert>
        ) : (
          filtered.map((row) => (
            <ReviewCard
              key={row.id}
              row={row}
              checked={selected.has(row.id)}
              onToggle={() => toggleSelect(row.id)}
              onApprove={() => approve(row.id)}
              onReject={() => reject(row)}
              onEdit={() => openEdit(row)}
              acting={actingId === row.id}
            />
          ))
        )}
      </div>

      {/* Quick edit modal */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />Editează rapid
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Titlu</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Descriere scurtă</label>
              <Textarea rows={3} value={editShort} onChange={(e) => setEditShort(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Descriere completă</label>
              <Textarea rows={10} value={editLong} onChange={(e) => setEditLong(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditTarget(null)}>Anulează</Button>
            <Button onClick={saveEdit} disabled={savingEdit}>
              {savingEdit ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Pencil className="h-4 w-4 mr-1" />}
              Salvează
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReviewCard({
  row, checked, onToggle, onApprove, onReject, onEdit, acting,
}: {
  row: DraftProperty;
  checked: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onEdit: () => void;
  acting: boolean;
}) {
  const log = row.sanitization_log || {};
  const removedPhrases: string[] = Array.isArray(log.removed_phrases) ? log.removed_phrases : [];
  const rawHtml = useMemo(
    () => highlightRaw(row.original_description_raw || "(fără text original)", removedPhrases),
    [row.original_description_raw, removedPhrases],
  );
  const sanitizedHtml = useMemo(
    () => highlightSanitized(row.long_description_ro || row.description_ro || ""),
    [row.long_description_ro, row.description_ro],
  );
  const price = row.listing_type === "vanzare" ? row.capital_necesar : row.base_price_per_night;
  const priceSuffix = row.listing_type === "inchiriere" ? "/lună"
    : row.listing_type === "cazare" ? "/noapte" : "";

  return (
    <Card className={`border-2 transition-colors ${checked ? "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/10" : "border-border"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-1" />
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{row.name}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{row.location}</span>
                {row.listing_type && <Badge variant="outline" className="text-xs">{row.listing_type}</Badge>}
                {price ? <span>{price.toLocaleString("ro-RO")} €{priceSuffix}</span> : null}
                {row.rooms ? <span>· {row.rooms} cam</span> : null}
                {row.size ? <span>· {row.size} m²</span> : null}
                {row.import_source ? <Badge variant="secondary" className="text-xs">{row.import_source}</Badge> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {log.removed_phones > 0 && (
                  <Badge variant="destructive" className="text-xs">📞 {log.removed_phones} telefoane</Badge>
                )}
                {log.removed_emails > 0 && (
                  <Badge variant="destructive" className="text-xs">✉️ {log.removed_emails} emailuri</Badge>
                )}
                {log.removed_addresses > 0 && (
                  <Badge variant="destructive" className="text-xs">📍 {log.removed_addresses} adrese</Badge>
                )}
                {removedPhrases.length > 0 && (
                  <Badge variant="destructive" className="text-xs">🚫 {removedPhrases.length} fraze</Badge>
                )}
                {log.ai_rewritten && (
                  <Badge className="text-xs bg-emerald-600 text-white"><Sparkles className="h-3 w-3 mr-1" />AI rescris</Badge>
                )}
                {row.images_processing_status === "completed" && (
                  <Badge className="text-xs bg-indigo-600 text-white">🖼️ Imagini Sanitizate AI</Badge>
                )}
                {row.images_processing_status === "processing" && (
                  <Badge variant="outline" className="text-xs">⏳ Procesare imagini…</Badge>
                )}
                {row.images_processing_status === "fallback_failed" && (
                  <Badge
                    className="text-xs bg-orange-600 text-white animate-pulse"
                    title="Inpainting AI a eșuat (timeout / eroare API). Imaginile afișate sunt originalele și conțin watermark-ul portalului sursă."
                  >
                    ⚠️ Alertă: Watermark Neprocesat - API Timeout
                  </Badge>
                )}
                {row.images_processing_status === "failed" && (
                  <Badge variant="destructive" className="text-xs">⚠️ Imagini neprocesate</Badge>
                )}
              </div>
            </div>
          </div>
          {row.original_source_url && (
            <Button variant="ghost" size="sm" asChild>
              <a href={row.original_source_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <OriginalContactReveal sourceUrl={row.original_source_url} />

        {/* Split-screen diff */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <FileText className="h-3 w-3" />Original (raw)
            </div>
            <div
              className="prose prose-sm max-w-none text-sm leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: rawHtml }}
            />
          </div>
          <div className="rounded-lg border bg-emerald-50/30 dark:bg-emerald-950/10 p-3">
            <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />Sanitizat + AI
            </div>
            <div className="text-sm font-semibold mb-1">{row.name}</div>
            {row.description_ro && (
              <div className="text-xs italic text-muted-foreground mb-2">{row.description_ro}</div>
            )}
            <div
              className="prose prose-sm max-w-none text-sm leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
            {row.images && row.images.length > 0 && (
              <div className="grid grid-cols-4 gap-1 mt-3">
                {row.images.slice(0, 8).map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`${row.name} ${i + 1}`}
                    className="aspect-square object-cover rounded border"
                    loading="lazy"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t">
          <Button
            size="lg"
            onClick={onApprove}
            disabled={acting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {acting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
            Aprobă & Publică
          </Button>
          <Button size="lg" variant="outline" onClick={onEdit} disabled={acting}>
            <Pencil className="h-5 w-5 mr-2" />
            Editează Rapid
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={onReject}
            disabled={acting}
            className="border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            <XCircle className="h-5 w-5 mr-2" />
            Respinge
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
