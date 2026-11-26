/**
 * Triere anunțuri colectate — toate anunțurile din scraper într-o singură listă,
 * cu duplicatele dintre portaluri grupate pe același imobil și filtru rapid după
 * disponibilitatea telefonului. Reguli: `crossPortalDedup.ts` + `scrapedListingsTriage.ts`.
 * Trimiterea spre Andrei/WhatsApp trece prin `andrei-bulk-queue` (revalidare pe server)
 * și este blocată pentru anunțurile fără număr extras.
 */
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminPagination } from "@/components/admin/shared/AdminPagination";
import { SourceLink } from "@/components/admin/shared/SourceLink";
import ProspectPhoneEditor from "@/components/admin/ProspectPhoneEditor";
import type { PageSize } from "@/hooks/admin/usePaginatedQuery";
import { Ban, Building2, Copy, UserCheck, Layers, Loader2, MessageCircle, Phone, PhoneOff, RefreshCw, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";
import { groupCrossPortalDuplicates, listingPhone, portalKey, signalsOf } from "@/lib/crossPortalDedup";
import { activeQuickFilter, agencyMarkMode, canReactivate, agencyMarkSummary, agencyUndoLabel, type AgencyMarkResult, privateConfirmSummary, type PrivateConfirmResult, applyQuickFilter, buildTriageRows, DEFAULT_TRIAGE_FILTERS, isAgencyListing, isDismissed, isTriageListing, privateConfirmMode, triageReasonHint, summarizeTriage, triageBlockReason, triagePool, type TriageFilters, type TriageListing, type TriageQuickFilter, type TriageRow } from "@/lib/scrapedListingsTriage";
import { hasImplausiblePrice } from "@/lib/ownerListingRules";
import { normalizeRoPhone } from "@/lib/ownerOutreachTemplates";
import { OWNER_FLOW_QUERY_KEY } from "@/lib/ownerFlowData";

const COLUMNS =
  "id,source_platform,source_url,title,description,location,zone,rooms,size,price,currency,category,contact_phone,phone_normalized,images,is_active,duplicate_of,last_seen_at,scraped_at,created_at,do_not_call,seller_type,lifecycle_status,tags,andrei_queued_at,outreach_status,lead_score,agency_suspicion_score,owner_sentiment,prospect_type,contact_name,dismissed_at,dismissed_reason,agency_marked_at,agency_mark_root,agency_mark_sibling_count";

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
  const [dismissFor, setDismissFor] = useState<Listing | null>(null);
  const [dismissing, setDismissing] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [overrideFor, setOverrideFor] = useState<Listing | null>(null);
  const [overrideChecked, setOverrideChecked] = useState(false);
  const [agencyId, setAgencyId] = useState<string | null>(null);

  const { data: listings = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: QK, queryFn: fetchAllListings, staleTime: 5 * 60_000,
  });

  const pool = useMemo(() => triagePool(listings, filters), [listings, filters]);
  const groups = useMemo(() => groupCrossPortalDuplicates(pool), [pool]);
  const dismissedCount = useMemo(() => listings.filter((l) => isDismissed(l) && isTriageListing(l)).length, [listings]);
  const summary = useMemo(() => summarizeTriage(groups), [groups]);
  const portals = useMemo(() => [...new Set(listings.filter(isTriageListing).map((l) => portalKey(l)))].sort(), [listings]);
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
  const listRef = useRef<HTMLDivElement>(null);
  const quick = activeQuickFilter(filters);
  const onQuick = (q: TriageQuickFilter) => {
    update(applyQuickFilter(filters, q));
    // Pe mobil lista e sub filtre: o aducem în vedere ca rezultatul să se vadă imediat.
    requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el || el.getBoundingClientRect().top < window.innerHeight * 0.6) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    });
  };
  const toggleExpanded = (key: string) => setExpanded((prev) => { const n = new Set(prev); if (n.has(key)) n.delete(key); else n.add(key); return n; });

  const saveManualPhone = async (l: Listing, rawPhone: string): Promise<boolean> => {
    const normalized = normalizeRoPhone(rawPhone);
    if (!normalized) {
      toast.error("Număr invalid", { description: "Scrie un număr românesc, ex: 0722 123 456." });
      return false;
    }
    try {
      const { data, error: e } = await supabase.rpc("admin_update_prospect_phone", { p_id: l.id, p_phone: normalized });
      if (e) throw e;
      const r = (data ?? {}) as {
        already?: boolean;
        cancelled_wa?: number;
        cancelled_owner_outreach?: number;
        cancelled_calls?: number;
        listing?: Partial<Listing> & { id: string };
      };
      if (r.listing) patchListing(l.id, r.listing);
      else patchListing(l.id, { contact_phone: normalized, phone_normalized: normalized });

      const merged = { ...l, ...(r.listing ?? {}) } as Listing;
      const cancelled = Number(r.cancelled_wa ?? 0) + Number(r.cancelled_owner_outreach ?? 0) + Number(r.cancelled_calls ?? 0);
      const notes: string[] = [];
      if (cancelled > 0) notes.push(`Am anulat ${cancelled} ${cancelled === 1 ? "programare" : "programări"} către vechiul număr.`);
      const reason = triageBlockReason(merged);
      notes.push(reason ? triageReasonHint(merged, reason) : "Anunțul este pregătit pentru o trimitere explicită către Andrei.");
      notes.push("Nu s-a trimis niciun mesaj automat.");
      toast.success(r.already ? "Numărul era deja salvat" : "Telefon salvat", { description: notes.join(" "), duration: 10000 });
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
      return true;
    } catch (e) {
      toast.error("Telefonul nu a fost salvat", { description: (e as Error).message });
      return false;
    }
  };

  const patchListing = (id: string, patch: Partial<Listing>) =>
    qc.setQueryData<Listing[]>(QK, (prev) => prev?.map((r) => r.id === id ? { ...r, ...patch } : r));

  type ListingState = Partial<Listing> & { id: string };
  const confirmPrivate = async (l: Listing, overrideAgency = false) => {
    setConfirmingId(l.id);
    try {
      const { data, error: e } = await supabase.rpc("admin_confirm_prospect_private", { p_id: l.id, p_override_agency: overrideAgency });
      if (e) throw e;
      const r = (data ?? {}) as PrivateConfirmResult & { listing?: ListingState; affected?: ListingState[] };
      // Oprește orice reîncărcare pornită înainte de confirmare, ca să nu suprascrie starea nouă.
      await qc.cancelQueries({ queryKey: QK });
      const next = {
        ...(r.listing ?? {}),
        seller_type: r.listing?.seller_type ?? "privat",
        private_confirmed_at: r.listing?.private_confirmed_at ?? new Date().toISOString(),
        ...(r.reactivated ? { is_active: true, lifecycle_status: "new" } : {}),
      } as Partial<Listing>;
      patchListing(l.id, next);
      patchStates(r.affected);
      setOverrideFor(null);
      const merged = { ...l, ...(next ?? {}), ...(r.reactivated ? { is_active: true, lifecycle_status: "new" } : {}) } as Listing;
      const reason = triageBlockReason(merged);
      const status = reason ? `Încă nu se poate trimite: ${triageReasonHint(merged, reason)}.` : "Poate fi trimis acum către Andrei.";
      const extra = privateConfirmSummary(r);
      toast.success("Confirmat ca proprietar privat", {
        description: extra ? `${extra} ${status}` : status,
        action: { label: "Anulează", onClick: () => { void undoConfirmPrivate(l); } },
        duration: 10000,
      });
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
    } catch (e) {
      toast.error("Nu a fost confirmat", { description: (e as Error).message });
    } finally {
      setConfirmingId(null);
    }
  };

  const undoConfirmPrivate = async (l: Listing) => {
    setConfirmingId(l.id);
    try {
      const { data, error: e } = await supabase.rpc("admin_undo_confirm_prospect_private", { p_id: l.id });
      if (e) throw e;
      const r = (data ?? {}) as { listing?: ListingState; affected?: ListingState[] };
      if (r.listing) patchListing(l.id, r.listing);
      patchStates(r.affected);
      toast.success("Confirmarea a fost anulată", { description: "Anunțul și numărul au revenit exact cum erau." });
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
    } catch (e) {
      toast.error("Confirmarea nu a putut fi anulată", { description: (e as Error).message });
    } finally {
      setConfirmingId(null);
    }
  };

  const patchStates = (states?: ListingState[]) => {
    if (!states?.length) return;
    const byId = new Map(states.map((st) => [st.id, st]));
    qc.setQueryData<Listing[]>(QK, (prev) => prev?.map((r) => byId.has(r.id) ? { ...r, ...byId.get(r.id) } : r));
  };

  const markAgency = async (l: Listing) => {
    setAgencyId(l.id);
    try {
      const { data, error: e } = await supabase.rpc("admin_mark_prospect_agency", { p_id: l.id });
      if (e) throw e;
      const r = (data ?? {}) as AgencyMarkResult & { listing?: ListingState; affected?: ListingState[] };
      if (r.listing) patchListing(l.id, r.listing);
      patchStates(r.affected);
      const siblings = Number(r.siblings_marked ?? 0);
      toast.success(siblings > 0 ? `Marcat ca agenție, plus încă ${siblings} ${siblings === 1 ? "anunț" : "anunțuri"} cu același număr` : "Marcat ca agenție — nu primește mesaje", {
        description: agencyMarkSummary(r),
        action: { label: siblings > 0 ? "Anulează tot" : "Anulează", onClick: () => { void undoAgency(l); } },
        duration: 10000,
      });
      qc.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
    } catch (e) {
      toast.error("Anunțul nu a fost marcat ca agenție", { description: (e as Error).message });
    } finally {
      setAgencyId(null);
    }
  };

  const undoAgency = async (l: Listing) => {
    setAgencyId(l.id);
    try {
      const { data, error: e } = await supabase.rpc("admin_undo_mark_prospect_agency", { p_id: l.id });
      if (e) throw e;
      const r = (data ?? {}) as { listing?: ListingState; affected?: ListingState[]; siblings_restored?: number; blocklist_removed?: boolean };
      if (r.listing) patchListing(l.id, r.listing);
      patchStates(r.affected);
      const siblings = Number(r.siblings_restored ?? 0);
      const extra = siblings > 0 ? ` Am readus și ${siblings} ${siblings === 1 ? "anunț" : "anunțuri"} cu același număr.` : "";
      const listNote = r.blocklist_removed ? " Numărul a fost scos din lista de agenții." : "";
      toast.success("Marcajul de agenție a fost anulat", { description: `Nu s-a trimis niciun mesaj.${extra}${listNote}` });
      qc.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
    } catch (e) {
      toast.error("Marcajul nu a putut fi anulat", { description: (e as Error).message });
    } finally {
      setAgencyId(null);
    }
  };

  const reactivate = async (l: Listing) => {
    setRestoringId(l.id);
    try {
      const { data, error: e } = await supabase.rpc("admin_reactivate_prospect", { p_id: l.id });
      if (e) throw e;
      const r = (data ?? {}) as { listing?: ListingState };
      patchListing(l.id, { ...(r.listing ?? {}), is_active: true, lifecycle_status: "new" } as Partial<Listing>);
      const merged = { ...l, ...(r.listing ?? {}), is_active: true, lifecycle_status: "new" } as Listing;
      const reason = triageBlockReason(merged);
      toast.success("Anunț reactivat", {
        description: `Nu s-a trimis niciun mesaj automat. ${reason ? `Încă nu se poate trimite: ${triageReasonHint(merged, reason)}.` : "Poate fi trimis acum către Andrei."}`,
        duration: 10000,
      });
      qc.invalidateQueries({ queryKey: QK });
      qc.invalidateQueries({ queryKey: OWNER_FLOW_QUERY_KEY });
    } catch (e) {
      toast.error("Anunțul nu a putut fi reactivat", { description: (e as Error).message });
    } finally {
      setRestoringId(null);
    }
  };

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
            {([
              { key: "properties", label: "Imobile unice", value: summary.properties },
              { key: "withPhone", label: "Cu telefon", value: summary.withPhone },
              { key: "manualReveal", label: "Necesită dezvăluire", value: summary.manualReveal },
              { key: "ready", label: "Pregătite pentru prospectare", value: summary.ready },
            ] as { key: TriageQuickFilter; label: string; value: number }[]).map((c) => {
              const on = quick === c.key;
              return (
                <button key={c.key} type="button" onClick={() => onQuick(c.key)} aria-pressed={on}
                  aria-label={`${c.label}: ${c.value}. ${on && c.key !== "properties" ? "Filtru activ — apasă din nou pentru toate imobilele" : "Filtrează lista"}`}
                  className={`min-h-12 cursor-pointer rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] ${on ? "border-primary bg-primary/10 ring-1 ring-primary" : "bg-muted/30 [@media(hover:hover)]:hover:border-primary/50 [@media(hover:hover)]:hover:bg-accent"}`}>
                  <div className="text-lg font-semibold tabular-nums">{isLoading ? "…" : c.value.toLocaleString("ro-RO")}</div>
                  <div className="text-xs text-muted-foreground">{c.label}</div>
                  {on && c.key !== "properties" && <div className="mt-1 text-[11px] font-medium text-primary">Filtru activ · apasă pentru toate</div>}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <span id="phone-filter-label" className="text-xs font-medium text-muted-foreground">Telefon</span>
            <ToggleGroup type="single" value={filters.phone} aria-labelledby="phone-filter-label"
              onValueChange={(v) => v && update({ phone: v as TriageFilters["phone"], readyOnly: false })}
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

      <div ref={listRef} className="scroll-mt-20">
        {filters.readyOnly && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm">
            <span>Doar anunțuri pregătite pentru prospectare · {rows.length.toLocaleString("ro-RO")}</span>
            <Button variant="ghost" size="sm" className="min-h-12" onClick={() => update({ readyOnly: false })}>Arată toate</Button>
          </div>
        )}
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
              onReactivate={() => reactivate(row.listing as Listing)}
              onConfirmPrivate={() => confirmPrivate(row.listing as Listing)}
              onOverridePrivate={() => { setOverrideChecked(false); setOverrideFor(row.listing as Listing); }}
              confirming={confirmingId === row.listing.id}
              onMarkAgency={() => markAgency(row.listing as Listing)}
              onUndoAgency={() => undoAgency(row.listing as Listing)}
              markingAgency={agencyId === row.listing.id}
              restoring={restoringId === row.listing.id}
              onSavePhone={(phone) => saveManualPhone(row.listing as Listing, phone)} />
          ))}
          <AdminPagination page={safePage} pageCount={pageCount} total={rows.length} pageSize={pageSize}
            onPage={setPage} onPageSize={(s) => { setPageSize(s); setPage(0); }} isFetching={isFetching} />
        </div>
      )}
      </div>

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

      <Dialog open={!!overrideFor} onOpenChange={(o) => !o && confirmingId === null && setOverrideFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmi ca privat un anunț marcat ca agenție?</DialogTitle>
            <DialogDescription>
              Clasificarea l-a marcat ca agenție. Confirmă doar dacă ai verificat că anunțul e al proprietarului. Agențiile nu primesc niciodată mesaje.
            </DialogDescription>
          </DialogHeader>
          {overrideFor && <p className="text-sm font-medium">{overrideFor.title || "(fără titlu)"}</p>}
          <div className="flex min-h-12 items-start gap-3 rounded-md border p-3">
            <Checkbox id="override-agency" checked={overrideChecked} onCheckedChange={(v) => setOverrideChecked(v === true)} className="mt-0.5" />
            <Label htmlFor="override-agency" className="cursor-pointer text-sm leading-snug">Am verificat: nu este agenție, este proprietarul.</Label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOverrideFor(null)} disabled={confirmingId !== null} className="min-h-12">Înapoi</Button>
            <Button onClick={() => overrideFor && confirmPrivate(overrideFor, true)} disabled={!overrideChecked || confirmingId !== null} className="min-h-12 gap-2">
              {confirmingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} Confirmă privat
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
  onReactivate: () => void;
  restoring: boolean;
  onConfirmPrivate: () => void;
  onOverridePrivate: () => void;
  confirming: boolean;
  onMarkAgency: () => void;
  onUndoAgency: () => void;
  markingAgency: boolean;
  onSavePhone: (phone: string) => Promise<boolean>;
}

function TriageCard({ row, expanded, onToggle, onSend, onDismiss, onRestore, onReactivate, restoring, onConfirmPrivate, onOverridePrivate, confirming, onMarkAgency, onUndoAgency, markingAgency, onSavePhone }: CardProps) {
  const l = row.listing;
  const s = signalsOf(l);
  const phone = listingPhone(l);
  const dismissed = isDismissed(l);
  const andreiReason = dismissed ? "Indisponibil" : triageBlockReason(l);
  const ready = andreiReason === null;
  const confirmMode = privateConfirmMode(l);
  const inactive = canReactivate(l);
  const agencyMode = agencyMarkMode(l);
  const agency = !dismissed && isAgencyListing(l);
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
            {agency && <Badge variant="destructive" className="text-[10px]">Agenție blocată</Badge>}
            {badPrice && <Badge variant="destructive" className="text-[10px]">Preț de verificat</Badge>}
          </div>
          <h3 className="line-clamp-2 text-sm font-medium">{l.title || "(fără titlu)"}</h3>
          <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>📍 {s.area ?? l.zone ?? "zonă necunoscută"}</span>
            {s.rooms != null && <span>{s.rooms} {s.rooms === 1 ? "cameră" : "camere"}</span>}
            {s.size != null && <span>{s.size} mp</span>}
            <span className="font-medium text-foreground">{priceLabel(l)}</span>
          </p>
          <ProspectPhoneEditor phone={phone} sourceUrl={l.source_url} onSave={onSavePhone} />
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-56 sm:shrink-0">
          <Button onClick={onSend} disabled={!!andreiReason} className="min-h-12 gap-2" aria-label={andreiReason ? `Nu se poate trimite: ${andreiReason}` : "Trimite către Andrei (WhatsApp)"}>
            <MessageCircle className="h-4 w-4" /> Trimite către Andrei
          </Button>
          {andreiReason && !dismissed && <p className="text-center text-xs text-muted-foreground">{triageReasonHint(l, andreiReason)}</p>}
          {confirmMode === "confirm" && (
            <Button variant="secondary" onClick={onConfirmPrivate} disabled={confirming} className="min-h-12 gap-2" aria-label={inactive ? "Confirmă proprietarul ca privat și reactivează anunțul" : "Confirmă proprietarul ca privat"} title={inactive ? "Confirmă privat și reactivează anunțul" : undefined}>
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />} {inactive ? "Confirmă privat + reactivează" : "Confirmă privat"}
            </Button>
          )}
          {confirmMode === "override" && (
            <Button variant="ghost" onClick={onOverridePrivate} disabled={confirming} className="min-h-12 gap-2 text-muted-foreground" aria-label="Nu e agenție? Confirmă privat, cu verificare separată">
              <UserCheck className="h-4 w-4" /> Nu e agenție
            </Button>
          )}
          {inactive && (
            <Button variant="outline" onClick={onReactivate} disabled={restoring} className="min-h-12 gap-2" aria-label="Reactivează anunțul inactiv">
              {restoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Reactivează
            </Button>
          )}
          {agencyMode === "mark" && (
            <Button variant="outline" onClick={onMarkAgency} disabled={markingAgency} className="min-h-12 gap-2" aria-label="Marchează anunțul ca publicat de o agenție imobiliară">
              {markingAgency ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />} Agenție
            </Button>
          )}
          {agencyMode === "undo" && (
            <Button variant="ghost" onClick={onUndoAgency} disabled={markingAgency} className="min-h-12 gap-2 text-muted-foreground" aria-label="Anulează marcajul de agenție">
              {markingAgency ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} {agencyUndoLabel(l)}
            </Button>
          )}
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
