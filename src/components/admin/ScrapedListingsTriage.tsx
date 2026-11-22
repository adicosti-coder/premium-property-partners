/**
 * Triere anunțuri colectate — toate anunțurile din scraper într-o singură listă,
 * cu duplicatele dintre portaluri grupate pe același imobil și filtru rapid după
 * disponibilitatea telefonului. Reguli: `crossPortalDedup.ts` + `scrapedListingsTriage.ts`.
 * Trimiterea spre Andrei/WhatsApp trece prin `andrei-bulk-queue` (revalidare pe server)
 * și este blocată pentru anunțurile fără număr extras.
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminPagination } from "@/components/admin/shared/AdminPagination";
import { SourceLink } from "@/components/admin/shared/SourceLink";
import type { PageSize } from "@/hooks/admin/usePaginatedQuery";
import { Ban, Copy, ExternalLink, Layers, Loader2, MessageCircle, Phone, PhoneOff, RefreshCw, RotateCcw, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { groupCrossPortalDuplicates, listingPhone, portalKey, signalsOf } from "@/lib/crossPortalDedup";
import { buildTriageRows, DEFAULT_TRIAGE_FILTERS, isDismissed, summarizeTriage, triageBlockReason, triagePool, type TriageFilters, type TriageListing, type TriageRow } from "@/lib/scrapedListingsTriage";
import { hasImplausiblePrice } from "@/lib/ownerListingRules";
import { normalizeRoPhone } from "@/lib/ownerOutreachTemplates";
import { OWNER_FLOW_QUERY_KEY } from "@/lib/ownerFlowData";

const COLUMNS =
  "id,source_platform,source_url,title,description,location,zone,rooms,size,price,currency,category,contact_phone,phone_normalized,images,is_active,duplicate_of,last_seen_at,scraped_at,created_at,do_not_call,seller_type,lifecycle_status,tags,andrei_queued_at,outreach_status,lead_score,agency_suspicion_score,owner_sentiment,prospect_type,contact_name,dismissed_at,dismissed_reason";

type Listing = TriageListing & {
  contact_phone: string | null;
  phone_normalized: string | null;
  seller_type: string | null;
  lifecycle_status: string | null;
  tags: string[] | null;
  andrei_queued_at: string | null;
  outreach_status: string | null;
  dismissed_at: string | null;
  dismissed_reason: string | null;
};

const QK = ["scraped-listings-triage"] as const;
const PAGE = 1000;

async function fetchAllListings(): Promise<Listing[]> {
  const rows: Listing[] = [];
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabase.from("prospect_listings").select(COLUMNS)
      .order("created_at", { ascending: false }).order("id").range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as Listing[]));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

const PORTAL_LABELS: Record<string, string> = {
  olx: "OLX", imobiliare: "Imobiliare.ro", storia: "Storia", publi24: "Publi24", anuntul: "Anuntul.ro",
  homezz: "Homezz", bursaimobiliara: "BursaImobiliară", facebook: "Facebook",
};
const portalLabel = (k: string) => PORTAL_LABELS[k] ?? k;

const REASON_HINTS: Record<string, string> = {
  Neconfirmat: "Proprietar neconfirmat — confirmă-l în „Flux proprietari → Verifică”",
  Procesat: "Deja în lucru (apel / răspuns înregistrat)",
};

function priceLabel(l: Listing): string {
  if (l.price == null) return "fără preț";
  const rent = /inchir|hotel/i.test(`${l.category ?? ""}`);
  return `${Math.round(Number(l.price)).toLocaleString("ro-RO")} ${l.currency === "RON" ? "lei" : "€"}${rent ? " / lună" : ""}`;
}

export default function ScrapedListingsTriage() {
  const qc = useQueryClient();
  const [filters, setFilters] = useState<TriageFilters>(DEFAULT_TRIAGE_FILTERS);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<PageSize>(25);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [confirmFor, setConfirmFor] = useState<Listing | null>(null);
  const [sending, setSending] = useState(false);
  const [manualPhone, setManualPhone] = useState<Record<string, string>>({});
  const [savingPhoneId, setSavingPhoneId] = useState<string | null>(null);
  const [dismissFor, setDismissFor] = useState<Listing | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { data: listings = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: QK, queryFn: fetchAllListings, staleTime: 5 * 60_000,
  });

  const pool = useMemo(() => triagePool(listings, filters), [listings, filters]);
  const groups = useMemo(() => groupCrossPortalDuplicates(pool), [pool]);
  const dismissedCount = useMemo(() => listings.filter(isDismissed).length, [listings]);
  const summary = useMemo(() => summarizeTriage(groups), [groups]);
  const portals = useMemo(() => [...new Set(listings.map((l) => portalKey(l)))].sort(), [listings]);
  const rows = useMemo(() => buildTriageRows(groups, filters), [groups, filters]);
  const phoneCounts = useMemo(() => ({
    all: buildTriageRows(groups, { ...filters, phone: "all" }).length,
    available: buildTriageRows(groups, { ...filters, phone: "available" }).length,
    manual: buildTriageRows(groups, { ...filters, phone: "manual" }).length,
  }), [groups, filters]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = rows.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const update = (patch: Partial<TriageFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(0); };
  const toggleExpanded = (key: string) => setExpanded((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const saveManualPhone = async (l: Listing) => {
    const normalized = normalizeRoPhone((manualPhone[l.id] || "").trim());
    if (!normalized) { toast.error("Număr invalid", { description: "Scrie un număr românesc, ex: 0722 123 456." }); return; }
    setSavingPhoneId(l.id);
    try {
      const { error: e } = await supabase.from("prospect_listings")
        .update({ contact_phone: normalized, phone_normalized: normalized, phone_source: "manual_admin" }).eq("id", l.id);
      if (e) throw e;
      qc.setQueryData<Listing[]>(QK, (prev) => prev?.map((r) => r.id === l.id ? { ...r, contact_phone: normalized, phone_normalized: normalized } : r));
      qc.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
      setManualPhone((p) => ({ ...p, [l.id]: "" }));
      toast.success("Telefon salvat", { description: "Anunțul poate fi pregătit pentru prospectare." });
    } catch (e) {
      toast.error("Telefonul nu a fost salvat", { description: (e as Error).message });
    } finally {
      setSavingPhoneId(null);
    }
  };

  const patchListing = (id: string, patch: Partial<Listing>) =>
    qc.setQueryData<Listing[]>(QK, (prev) => prev?.map((r) => r.id === id ? { ...r, ...patch } : r));

  const restore = async (l: Listing) => {
    setRestoringId(l.id);
    try {
      const { error: e } = await supabase.rpc("admin_restore_prospect", { p_id: l.id });
      if (e) throw e;
      toast.success("Anunț readus în listă");
      await refetch();
      qc.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
    } catch (e) {
      toast.error("Anunțul nu a putut fi readus", { description: (e as Error).message });
    } finally {
      setRestoringId(null);
    }
  };

  const dismiss = async () => {
    if (!dismissFor) return;
    const l = dismissFor;
    setDismissing(true);
    try {
      const { data, error: e } = await supabase.rpc("admin_dismiss_prospect", { p_id: l.id, p_reason: "indisponibil" });
      if (e) throw e;
      const r = (data ?? {}) as { cancelled_wa?: number; cancelled_owner_outreach?: number; cancelled_calls?: number };
      const cancelled = (r.cancelled_wa ?? 0) + (r.cancelled_owner_outreach ?? 0) + (r.cancelled_calls ?? 0);
      patchListing(l.id, { dismissed_at: new Date().toISOString(), dismissed_reason: "indisponibil", is_active: false, lifecycle_status: "expired" });
      setDismissFor(null);
      toast.success("Marcat ca indisponibil", {
        description: cancelled ? `Am anulat ${cancelled} ${cancelled === 1 ? "trimitere programată" : "trimiteri programate"}.` : "Nu avea trimiteri programate.",
        action: { label: "Anulează", onClick: () => { void restore(l); } },
        duration: 8000,
      });
      qc.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
    } catch (e) {
      toast.error("Anunțul nu a fost marcat", { description: (e as Error).message });
    } finally {
      setDismissing(false);
    }
  };

  const sendToAndrei = async () => {
    if (!confirmFor) return;
    // Dublă verificare înainte de trimitere: fără număr extras nu pleacă nimic.
    if (triageBlockReason(confirmFor)) { setConfirmFor(null); return; }
    setSending(true);
    try {
      const { data, error: e } = await supabase.functions.invoke("andrei-bulk-queue", {
        body: { prospect_ids: [confirmFor.id], channel: "whatsapp", scenario: "Triere anunțuri colectate" },
      });
      if (e) throw e;
      const skipped = (data?.skipped ?? []) as { reason: string }[];
      if (skipped.length) toast.warning("Nu a fost trimis", { description: skipped[0].reason });
      else toast.success("Trimis către Andrei (WhatsApp)");
      setConfirmFor(null);
      await refetch();
    } catch (e) {
      toast.error("Trimiterea a eșuat", { description: (e as Error).message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="gap-3 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg"><Layers className="h-5 w-5 text-primary" /> Triere anunțuri colectate</CardTitle>
            <CardDescription>
              {isLoading ? "Se încarcă anunțurile…" : `${summary.listings.toLocaleString("ro-RO")} anunțuri · ${summary.properties.toLocaleString("ro-RO")} imobile unice · ${summary.duplicateGroups} imobile apar pe mai multe portaluri (${summary.variants} variante)`}
            </CardDescription>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="min-h-12 gap-2" aria-label="Reîncarcă anunțurile">
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Reîncarcă
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { label: "Imobile unice", value: summary.properties },
              { label: "Cu telefon", value: summary.withPhone },
              { label: "Necesită dezvăluire", value: summary.manualReveal },
              { label: "Pregătite pentru prospectare", value: summary.ready },
            ].map((c) => (
              <div key={c.label} className="rounded-lg border bg-muted/30 p-3">
                <div className="text-lg font-semibold tabular-nums">{isLoading ? "…" : c.value.toLocaleString("ro-RO")}</div>
                <div className="text-xs text-muted-foreground">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <span id="phone-filter-label" className="text-xs font-medium text-muted-foreground">Telefon</span>
            <ToggleGroup type="single" value={filters.phone} aria-labelledby="phone-filter-label"
              onValueChange={(v) => v && update({ phone: v as TriageFilters["phone"] })}
              className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <ToggleGroupItem value="all" variant="outline" className="min-h-12 justify-between gap-2 px-3 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground">
                Toate <Badge variant="secondary">{phoneCounts.all}</Badge>
              </ToggleGroupItem>
              <ToggleGroupItem value="available" variant="outline" className="min-h-12 justify-between gap-2 px-3 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground">
                <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> Număr telefon disponibil</span> <Badge variant="secondary">{phoneCounts.available}</Badge>
              </ToggleGroupItem>
              <ToggleGroupItem value="manual" variant="outline" className="min-h-12 justify-between gap-2 px-3 data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground">
                <span className="flex items-center gap-1.5"><PhoneOff className="h-4 w-4" /> Necesită dezvăluire manuală</span> <Badge variant="secondary">{phoneCounts.manual}</Badge>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={filters.search} onChange={(e) => update({ search: e.target.value })} placeholder="Caută titlu, zonă, complex…" aria-label="Caută în anunțuri" className="min-h-12 pl-9" />
            </div>
            <Select value={filters.portal} onValueChange={(v) => update({ portal: v })}>
              <SelectTrigger className="min-h-12 lg:w-[180px]" aria-label="Filtrează după portal"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate portalurile</SelectItem>
                {portals.map((p) => <SelectItem key={p} value={p}>{portalLabel(p)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => update({ status: v as TriageFilters["status"] })}>
              <SelectTrigger className="min-h-12 lg:w-[160px]" aria-label="Filtrează după stare"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate stările</SelectItem>
                <SelectItem value="active">Doar active</SelectItem>
                <SelectItem value="inactive">Doar inactive</SelectItem>
                <SelectItem value="dismissed">Indisponibile / renunțate ({dismissedCount})</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex min-h-12 items-center gap-3 rounded-md border px-3">
              <Switch id="hide-dismissed" checked={filters.hideDismissed} disabled={filters.status === "dismissed"} onCheckedChange={(v) => update({ hideDismissed: v })} />
              <Label htmlFor="hide-dismissed" className="cursor-pointer text-sm">Ascunde indisponibilele</Label>
            </div>
            <div className="flex min-h-12 items-center gap-3 rounded-md border px-3">
              <Switch id="hide-duplicates" checked={filters.hideDuplicates} onCheckedChange={(v) => update({ hideDuplicates: v })} />
              <Label htmlFor="hide-duplicates" className="cursor-pointer text-sm">Ascunde duplicatele</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" className="text-sm text-destructive">Anunțurile nu au putut fi încărcate: {(error as Error).message}</p>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Se încarcă toate anunțurile colectate…</div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Niciun anunț pentru filtrele alese.</p>
      ) : (
        <div className="space-y-2">
          {visible.map((row) => (
            <TriageCard key={row.listing.id} row={row as TriageRow<Listing>} expanded={expanded.has(row.group.key)}
              onToggle={() => toggleExpanded(row.group.key)}
              onSend={() => setConfirmFor(row.listing as Listing)}
              onDismiss={() => setDismissFor(row.listing as Listing)}
              onRestore={() => restore(row.listing as Listing)}
              restoring={restoringId === row.listing.id}
              manualPhone={manualPhone[row.listing.id] ?? ""}
              onManualPhone={(v) => setManualPhone((p) => ({ ...p, [row.listing.id]: v }))}
              onSavePhone={() => saveManualPhone(row.listing as Listing)}
              savingPhone={savingPhoneId === row.listing.id} />
          ))}
          <AdminPagination page={safePage} pageCount={pageCount} total={rows.length} pageSize={pageSize}
            onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(0); }} isFetching={isFetching} />
        </div>
      )}

      <Dialog open={!!dismissFor} onOpenChange={(o) => !o && !dismissing && setDismissFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marchezi anunțul ca indisponibil?</DialogTitle>
            <DialogDescription>
              Anunțul iese din listă și din cozile de contactare; mesajele WhatsApp și apelurile programate pentru el se anulează. Istoricul rămâne, iar acțiunea se poate anula.
            </DialogDescription>
          </DialogHeader>
          {dismissFor && <p className="text-sm font-medium">{dismissFor.title || "(fără titlu)"}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDismissFor(null)} disabled={dismissing} className="min-h-12">Înapoi</Button>
            <Button variant="destructive" onClick={dismiss} disabled={dismissing} className="min-h-12 gap-2">
              {dismissing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Marchează indisponibil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirmFor} onOpenChange={(o) => !o && !sending && setConfirmFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Trimiți anunțul către Andrei?</DialogTitle>
            <DialogDescription>
              Andrei îi scrie proprietarului pe WhatsApp cu mesajul aprobat. Verificările se refac pe server: proprietar privat confirmat, mobil 07…, fără contact anterior.
            </DialogDescription>
          </DialogHeader>
          {confirmFor && <p className="text-sm font-medium">{confirmFor.title || "(fără titlu)"}</p>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmFor(null)} disabled={sending} className="min-h-12">Renunță</Button>
            <Button onClick={sendToAndrei} disabled={sending} className="min-h-12 gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />} Trimite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CardProps {
  row: TriageRow<Listing>;
  expanded: boolean;
  onToggle: () => void;
  onSend: () => void;
  onDismiss: () => void;
  onRestore: () => void;
  restoring: boolean;
  manualPhone: string;
  onManualPhone: (v: string) => void;
  onSavePhone: () => void;
  savingPhone: boolean;
}

function TriageCard({ row, expanded, onToggle, onSend, onDismiss, onRestore, restoring, manualPhone, onManualPhone, onSavePhone, savingPhone }: CardProps) {
  const l = row.listing;
  const s = signalsOf(l);
  const phone = listingPhone(l);
  const dismissed = isDismissed(l);
  const andreiReason = dismissed ? "Indisponibil" : triageBlockReason(l);
  const ready = andreiReason === null;
  const badPrice = hasImplausiblePrice({ ...l, url: l.source_url });
  const others = [row.group.primary, ...row.group.variants].filter((m) => m.id !== l.id);

  return (
    <article className={`rounded-lg border bg-card p-3 ${ready ? "border-2 border-primary" : ""}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <SourceLink url={l.source_url} platform={portalLabel(s.portal)} />
            {row.duplicateCount > 0 && (row.isPrimary
              ? <Badge className="text-[10px]">Principal · {row.duplicateCount} {row.duplicateCount === 1 ? "variantă" : "variante"}</Badge>
              : <Badge variant="outline" className="text-[10px]">Duplicat al anunțului principal</Badge>)}
            {ready && <Badge variant="outline" className="border-primary bg-primary/10 text-[10px] text-primary">✓ Pregătit pentru prospectare</Badge>}
            {dismissed
              ? <Badge variant="secondary" className="text-[10px]">Indisponibil / renunțat</Badge>
              : l.is_active === false && <Badge variant="secondary" className="text-[10px]">Inactiv</Badge>}
            {badPrice && <Badge variant="destructive" className="text-[10px]">Preț de verificat</Badge>}
          </div>
          <h3 className="line-clamp-2 text-sm font-medium">{l.title || "(fără titlu)"}</h3>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>📍 {s.area ?? l.zone ?? "zonă necunoscută"}</span>
            {s.rooms != null && <span>{s.rooms} {s.rooms === 1 ? "cameră" : "camere"}</span>}
            {s.size != null && <span>{s.size} mp</span>}
            <span className="font-medium text-foreground">{priceLabel(l)}</span>
          </p>
          {phone ? (
            <p className="flex items-center gap-1.5 text-xs"><Phone className="h-3.5 w-3.5 text-primary" /> {phone}</p>
          ) : (
            <div className="rounded-md border border-dashed p-2">
              <p className="flex items-center gap-1.5 text-xs font-medium"><ShieldAlert className="h-3.5 w-3.5 text-warning" /> Necesită dezvăluire manuală</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Deschide anunțul, apasă „Arată numărul” pe portal și scrie-l aici. Până atunci nu poate intra în coada de contactare.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                {l.source_url && (
                  <Button asChild variant="outline" size="sm" className="min-h-12 gap-1.5">
                    <a href={l.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /> Deschide anunțul</a>
                  </Button>
                )}
                <Input value={manualPhone} onChange={(e) => onManualPhone(e.target.value)} inputMode="tel" placeholder="07XX XXX XXX"
                  aria-label="Telefon dezvăluit manual" className="min-h-12 sm:max-w-[180px]"
                  onKeyDown={(e) => { if (e.key === "Enter") onSavePhone(); }} />
                <Button size="sm" variant="secondary" className="min-h-12" onClick={onSavePhone} disabled={savingPhone || !manualPhone.trim()}>
                  {savingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvează"}
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-56 sm:shrink-0">
          <Button onClick={onSend} disabled={!!andreiReason} className="min-h-12 gap-2" aria-label={andreiReason ? `Nu se poate trimite: ${andreiReason}` : "Trimite către Andrei (WhatsApp)"}>
            <MessageCircle className="h-4 w-4" /> Trimite către Andrei
          </Button>
          {andreiReason && !dismissed && <p className="text-center text-xs text-muted-foreground">{REASON_HINTS[andreiReason] ?? andreiReason}</p>}
          {dismissed ? (
            <Button variant="outline" onClick={onRestore} disabled={restoring} className="min-h-12 gap-2" aria-label="Readu anunțul în listă">
              {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Readu în listă
            </Button>
          ) : (
            <Button variant="ghost" onClick={onDismiss} className="min-h-12 gap-2 text-muted-foreground hover:text-destructive" aria-label="Marchează anunțul ca indisponibil / renunță">
              <Ban className="h-4 w-4" /> Indisponibil / Renunță
            </Button>
          )}
          {others.length > 0 && (
            <Button variant="outline" onClick={onToggle} aria-expanded={expanded} className="min-h-12 gap-2">
              <Copy className="h-4 w-4" /> {expanded ? "Ascunde variantele" : `Vezi ${others.length} ${others.length === 1 ? "variantă" : "variante"}`}
            </Button>
          )}
        </div>
      </div>
      {expanded && others.length > 0 && (
        <ul className="mt-3 space-y-2 border-t pt-3" aria-label="Același imobil pe alte portaluri">
          {others.map((m) => (
            <li key={m.id} className="flex flex-col gap-1 rounded-md bg-muted/40 p-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <SourceLink url={m.source_url} platform={portalLabel(portalKey(m))} />
                  {m.id === row.group.primary.id && <Badge className="text-[10px]">Principal</Badge>}
                  {listingPhone(m) ? <Badge variant="outline" className="text-[10px]">cu telefon</Badge> : <Badge variant="outline" className="text-[10px]">fără telefon</Badge>}
                </div>
                <p className="mt-1 line-clamp-1 text-xs">{m.title || "(fără titlu)"} · {priceLabel(m as Listing)}</p>
              </div>
              <p className="text-[11px] text-muted-foreground sm:max-w-[45%] sm:text-right">{(row.group.reasons[m.id] ?? row.group.reasons[l.id] ?? []).join(" · ")}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
