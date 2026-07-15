import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import {
  Activity, Download, RotateCcw, Search, TrendingUp, Users, Building2,
  CheckCircle2, XCircle, AlertTriangle, Zap, Pencil, Save, ExternalLink, Trophy,
  ListChecks, Phone, MapPin, Radio, Bell, BellOff, History, ShieldAlert,
} from "lucide-react";
import { RevealableField } from "@/components/admin/shared/RevealableField";

type Keyword = {
  id: string;
  keyword: string;
  platform: string | null;
  is_active: boolean;
  success_count: number;
  fail_count: number;
  consecutive_zero: number;
  auto_disabled_reason: string | null;
  last_success_at: string | null;
  last_zero_at: string | null;
  updated_at: string;
  query_template: string | null;
  unique_leads_count: number;
  last_test_at: string | null;
};

type ScanJob = {
  id: string;
  status: string;
  total_queries: number | null;
  processed_queries: number | null;
  new_listings: number | null;
  archived_skipped: number | null;
  duplicate_skipped: number | null;
  blacklisted_skipped: number | null;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
};

type Vertical = "all" | "piata-roi" | "social-leads" | "complexes";

const VERTICAL_PATTERNS: Record<Exclude<Vertical, "all">, RegExp> = {
  "piata-roi": /(roi|invest|randament|piata|piață|yield|dezvoltator|comision|vanzare|vânzare)/i,
  "social-leads": /(facebook|whatsapp|telefon|07|olx|publi24|fara comision|fără comision|proprietar)/i,
  complexes: /(isho|paltim|openville|city of mara|west city|vox|ateneo|nord one|xcity|complex|rezidential|rezidențial|ansamblu)/i,
};

const PORTAL_OPTIONS = [
  "OLX", "Storia.ro", "imobiliare.ro", "Publi24",
  "BursaImobiliara.ro", "Facebook Marketplace", "Facebook Groups",
];

function classifyVertical(keyword: string): Exclude<Vertical, "all"> | "other" {
  if (VERTICAL_PATTERNS.complexes.test(keyword)) return "complexes";
  if (VERTICAL_PATTERNS["social-leads"].test(keyword)) return "social-leads";
  if (VERTICAL_PATTERNS["piata-roi"].test(keyword)) return "piata-roi";
  return "other";
}

// Performance score: success rate weighted by log(unique leads) — keeps
// new keywords from dominating purely on a 1/1 ratio.
function computeScore(k: Keyword): number {
  const total = (k.success_count || 0) + (k.fail_count || 0);
  const rate = total > 0 ? (k.success_count || 0) / total : 0;
  const leadsBoost = Math.log10((k.unique_leads_count || 0) + 1);
  return Math.round((rate * 100 + leadsBoost * 25) * 10) / 10;
}

function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]) {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ScraperMonitorPanel() {
  const qc = useQueryClient();
  const [vertical, setVertical] = useState<Vertical>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "disabled">("all");
  const [sortBy, setSortBy] = useState<"score" | "leads" | "fails" | "updated">("score");
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  // Inline edit for query_template
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  // Quick test dialog state
  const [testOpen, setTestOpen] = useState(false);
  const [testKw, setTestKw] = useState<Keyword | null>(null);
  const [testPortal, setTestPortal] = useState<string>("OLX");
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Realtime + notifications
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== "undefined" ? Notification.permission : "denied",
  );
  const [tickPulse, setTickPulse] = useState(0); // increments on each new_listings bump
  const lastJobStateRef = useRef<Map<string, { status: string; new_listings: number }>>(new Map());

  // Confirm-force dialog
  const [confirmState, setConfirmState] = useState<null | {
    title: string;
    description: string;
    actionLabel: string;
    tone: "destructive" | "default";
    onConfirm: () => void | Promise<void>;
  }>(null);

  const { data: keywords = [], isLoading: kwLoading } = useQuery({
    queryKey: ["scraper-keywords-monitor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scraper_search_keywords")
        .select("id, keyword, platform, is_active, success_count, fail_count, consecutive_zero, auto_disabled_reason, last_success_at, last_zero_at, updated_at, query_template, unique_leads_count, last_test_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Keyword[];
    },
    staleTime: 30_000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["scraper-jobs-monitor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_scan_jobs")
        .select("id, status, total_queries, processed_queries, new_listings, archived_skipped, duplicate_skipped, blacklisted_skipped, started_at, finished_at, error_message")
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as ScanJob[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Audit trail feed — filtered to scraper-related actions.
  const SCRAPER_AUDIT_ACTIONS = useMemo(() => [
    "scraper_keyword_reactivate",
    "scraper_keyword_template_edit",
    "scraper_keyword_quicktest",
    "scraper_force_refresh",
    "scraper_manual_scan",
    "scraper_parallelism_change",
    "scraper_keyword_bulk_action",
  ], []);
  const { data: auditRows = [] } = useQuery({
    queryKey: ["scraper-audit-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("id, actor_label, actor_user_id, action, entity_type, entity_id, details, severity, created_at")
        .in("action", SCRAPER_AUDIT_ACTIONS)
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
  });

  // Client-side audit helper — records the current admin's action via the RPC.
  const logAdminAction = async (
    action: string,
    entity: { type?: string; id?: string } = {},
    details: Record<string, unknown> = {},
    severity: "info" | "warning" | "error" = "info",
  ) => {
    try {
      await supabase.rpc("log_scraper_admin_action" as never, {
        _action: action,
        _entity_type: entity.type ?? null,
        _entity_id: entity.id ?? null,
        _details: details,
        _severity: severity,
      } as never);
      qc.invalidateQueries({ queryKey: ["scraper-audit-log"] });
    } catch (e) {
      // Non-fatal — logging must never block the UI action.
      console.warn("[audit] rpc failed", e);
    }
  };

  // Realtime: subscribe to prospect_scan_jobs + admin_audit_log.
  // On job UPDATE we bump a tick pulse and, on completion, fire a browser
  // notification. Refetching is done via query invalidation.
  useEffect(() => {
    const channel = supabase
      .channel("scraper-monitor-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prospect_scan_jobs" },
        (payload) => {
          const row: any = payload.new || payload.old;
          const prev = lastJobStateRef.current.get(row?.id);
          const newListings = Number(row?.new_listings ?? 0);
          if (payload.eventType === "UPDATE" && prev && newListings > prev.new_listings) {
            setTickPulse((p) => p + 1);
          }
          if (
            payload.eventType === "UPDATE" &&
            prev &&
            prev.status === "running" &&
            row?.status &&
            row.status !== "running"
          ) {
            const okay = row.status === "completed";
            toast({
              title: okay ? "✅ Scanare finalizată" : `⚠️ Scanare ${row.status}`,
              description: `${newListings} anunțuri noi · ${row.processed_queries ?? 0}/${row.total_queries ?? 0} querii`,
              variant: okay ? "default" : "destructive",
            });
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              try {
                new Notification(okay ? "Scraper: rulare terminată" : "Scraper: rulare eșuată", {
                  body: `${newListings} anunțuri noi · ${row.processed_queries ?? 0}/${row.total_queries ?? 0} querii`,
                  tag: `scraper-job-${row.id}`,
                });
              } catch { /* ignore */ }
            }
          }
          lastJobStateRef.current.set(row?.id, {
            status: String(row?.status ?? ""),
            new_listings: newListings,
          });
          qc.invalidateQueries({ queryKey: ["scraper-jobs-monitor"] });
          qc.invalidateQueries({ queryKey: ["scraper-found-listings"] });
          qc.invalidateQueries({ queryKey: ["scraper-found-totals"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_audit_log" },
        (payload) => {
          const row: any = payload.new;
          if (SCRAPER_AUDIT_ACTIONS.includes(row?.action)) {
            qc.invalidateQueries({ queryKey: ["scraper-audit-log"] });
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, SCRAPER_AUDIT_ACTIONS]);

  const requestNotificationPermission = async () => {
    if (typeof Notification === "undefined") {
      toast({ title: "Notificările nu sunt suportate în acest browser", variant: "destructive" });
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    toast({
      title: perm === "granted" ? "Notificări activate" : "Notificări refuzate",
      description: perm === "granted" ? "Vei primi alerte când o scanare se termină." : undefined,
    });
  };


  const [foundWindow, setFoundWindow] = useState<"24h" | "7d" | "30d">("7d");
  const [foundSearch, setFoundSearch] = useState("");
  const foundSince = useMemo(() => {
    const now = Date.now();
    const ms = foundWindow === "24h" ? 86_400_000 : foundWindow === "7d" ? 7 * 86_400_000 : 30 * 86_400_000;
    return new Date(now - ms).toISOString();
  }, [foundWindow]);

  const { data: foundListings = [], isLoading: foundLoading, refetch: refetchFound } = useQuery({
    queryKey: ["scraper-found-listings", foundWindow],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_listings")
        .select("id, title, source_platform, source_url, zone, price, currency, rooms, size, contact_phone, contact_name, lead_score, is_active, created_at")
        .gte("created_at", foundSince)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: foundTotals } = useQuery({
    queryKey: ["scraper-found-totals", foundWindow],
    queryFn: async () => {
      const [{ count: total }, { count: active }, { count: priority }] = await Promise.all([
        supabase.from("prospect_listings").select("id", { count: "exact", head: true }).gte("created_at", foundSince),
        supabase.from("prospect_listings").select("id", { count: "exact", head: true }).gte("created_at", foundSince).eq("is_active", true),
        supabase.from("prospect_listings").select("id", { count: "exact", head: true }).gte("created_at", foundSince).gte("lead_score", 70),
      ]);
      return { total: total ?? 0, active: active ?? 0, priority: priority ?? 0 };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const filteredFound = useMemo(() => {
    if (!foundSearch.trim()) return foundListings;
    const q = foundSearch.toLowerCase();
    return foundListings.filter((l: any) =>
      (l.title || "").toLowerCase().includes(q) ||
      (l.zone || "").toLowerCase().includes(q) ||
      (l.source_platform || "").toLowerCase().includes(q) ||
      (l.contact_phone || "").includes(q),
    );
  }, [foundListings, foundSearch]);

  const platformBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of foundListings as any[]) {
      const p = (l.source_platform || "necunoscut").trim() || "necunoscut";
      map.set(p, (map.get(p) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [foundListings]);

  const exportFoundListings = () => {
    const header = ["created_at", "source_platform", "title", "zone", "rooms", "size", "price", "currency", "lead_score", "contact_name", "contact_phone", "is_active", "source_url"];
    const rows: (string | number | null)[][] = [header];
    filteredFound.forEach((l: any) => {
      rows.push([
        l.created_at, l.source_platform ?? "", l.title ?? "", l.zone ?? "",
        l.rooms ?? "", l.size ?? "", l.price ?? "", l.currency ?? "",
        l.lead_score ?? "", l.contact_name ?? "", l.contact_phone ?? "",
        l.is_active ? "activ" : "arhivat", l.source_url ?? "",
      ]);
    });
    downloadCSV(`scraper-found-${foundWindow}-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast({ title: "Export CSV", description: `${filteredFound.length} anunțuri descărcate.` });
  };


  const filtered = useMemo(() => {
    let rows = keywords.filter((k) => {
      if (statusFilter === "active" && !k.is_active) return false;
      if (statusFilter === "disabled" && k.is_active) return false;
      if (vertical !== "all" && !VERTICAL_PATTERNS[vertical].test(k.keyword)) return false;
      if (search && !k.keyword.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    rows = [...rows].sort((a, b) => {
      if (sortBy === "score") return computeScore(b) - computeScore(a);
      if (sortBy === "leads") return (b.unique_leads_count || 0) - (a.unique_leads_count || 0);
      if (sortBy === "fails") return (b.fail_count || 0) - (a.fail_count || 0);
      return (b.updated_at || "").localeCompare(a.updated_at || "");
    });
    return rows;
  }, [keywords, vertical, search, statusFilter, sortBy]);

  const stats = useMemo(() => {
    const total = keywords.length;
    const active = keywords.filter((k) => k.is_active).length;
    const disabled = total - active;
    const totalSuccess = keywords.reduce((s, k) => s + (k.success_count || 0), 0);
    const totalFail = keywords.reduce((s, k) => s + (k.fail_count || 0), 0);
    const totalLeads = keywords.reduce((s, k) => s + (k.unique_leads_count || 0), 0);
    return { total, active, disabled, totalSuccess, totalFail, totalLeads };
  }, [keywords]);

  // Regression detection: per-vertical success rate vs prior. We compute the
  // current vertical health from the *cumulative* keyword counters, then flag
  // if disabled rate > 40% or recent fails dominate.
  const regressionAlerts = useMemo(() => {
    const verticals: Exclude<Vertical, "all">[] = ["piata-roi", "social-leads", "complexes"];
    return verticals.map((v) => {
      const list = keywords.filter((k) => VERTICAL_PATTERNS[v].test(k.keyword));
      if (list.length === 0) return { vertical: v, level: "ok" as const, msg: "Fără date" };
      const succ = list.reduce((s, k) => s + (k.success_count || 0), 0);
      const fail = list.reduce((s, k) => s + (k.fail_count || 0), 0);
      const total = succ + fail;
      const rate = total > 0 ? succ / total : 0;
      const disabled = list.filter((k) => !k.is_active).length;
      const disabledPct = disabled / list.length;
      let level: "ok" | "warn" | "danger" = "ok";
      const reasons: string[] = [];
      if (disabledPct >= 0.4) { level = "danger"; reasons.push(`${Math.round(disabledPct * 100)}% cuvinte auto-dezactivate`); }
      else if (disabledPct >= 0.2) { level = "warn"; reasons.push(`${Math.round(disabledPct * 100)}% cuvinte auto-dezactivate`); }
      if (total >= 20 && rate < 0.15) { level = "danger"; reasons.push(`Rată succes ${Math.round(rate * 100)}%`); }
      else if (total >= 10 && rate < 0.3 && level !== "danger") { level = "warn"; reasons.push(`Rată succes ${Math.round(rate * 100)}%`); }
      return {
        vertical: v,
        level,
        msg: reasons.length ? reasons.join(" · ") : `Rată succes ${Math.round(rate * 100)}% · ${list.length} cuvinte`,
        rate, disabled, total: list.length,
      };
    });
  }, [keywords]);

  const lastJob = jobs[0];
  const sessionSummary = useMemo(() => {
    if (!lastJob) return "Nu există rulări recente.";
    const newCount = lastJob.new_listings ?? 0;
    const dup = lastJob.duplicate_skipped ?? 0;
    const arc = lastJob.archived_skipped ?? 0;
    const proc = lastJob.processed_queries ?? 0;
    const tot = lastJob.total_queries ?? 0;
    return `Ultima rulare (${lastJob.status}): ${newCount} anunțuri noi, ${dup} duplicate, ${arc} arhivate — ${proc}/${tot} querii procesate.`;
  }, [lastJob]);

  const doReactivate = async (id: string, keyword: string) => {
    setReactivatingId(id);
    const { error } = await supabase.rpc("reactivate_scraper_keyword" as never, { _id: id } as never);
    setReactivatingId(null);
    if (error) {
      toast({ title: "Reactivare eșuată", description: error.message, variant: "destructive" });
      await logAdminAction("scraper_keyword_reactivate", { type: "scraper_keyword", id },
        { keyword, error: error.message }, "error");
      return;
    }
    toast({ title: "Cuvânt cheie reactivat", description: "Contoarele au fost resetate." });
    await logAdminAction("scraper_keyword_reactivate", { type: "scraper_keyword", id }, { keyword });
    qc.invalidateQueries({ queryKey: ["scraper-keywords-monitor"] });
  };

  const handleReactivate = (k: Keyword) => {
    setConfirmState({
      title: "Reactivezi cuvântul cheie?",
      description: `Vei re-porni scraperul pentru "${k.keyword}" și vei reseta contoarele de eșec. Acțiunea se înregistrează în audit trail.`,
      actionLabel: "Reactivează",
      tone: "default",
      onConfirm: () => doReactivate(k.id, k.keyword),
    });
  };

  const startEdit = (k: Keyword) => {
    setEditingId(k.id);
    setEditValue(k.query_template ?? "");
  };
  const saveEdit = async (id: string, keyword: string) => {
    setSavingId(id);
    const newTemplate = editValue.trim() || null;
    const { error } = await supabase
      .from("scraper_search_keywords")
      .update({ query_template: newTemplate })
      .eq("id", id);
    setSavingId(null);
    if (error) { toast({ title: "Salvare eșuată", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Query template salvat" });
    await logAdminAction("scraper_keyword_template_edit", { type: "scraper_keyword", id },
      { keyword, new_template: newTemplate });
    setEditingId(null);
    qc.invalidateQueries({ queryKey: ["scraper-keywords-monitor"] });
  };

  const openTest = (k: Keyword) => {
    setTestKw(k);
    setTestPortal(k.platform && PORTAL_OPTIONS.includes(k.platform) ? k.platform : "OLX");
    setTestResult(null);
    setTestOpen(true);
  };
  const runTest = async () => {
    if (!testKw) return;
    setTestRunning(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("scraper-keyword-quicktest", {
        body: { keyword_id: testKw.id, portal: testPortal, limit: 10 },
      });
      if (error) throw error;
      setTestResult(data);
      const n = (data as any)?.result_count ?? 0;
      toast({ title: "Test rapid finalizat", description: `${n} rezultate în ${(data as any)?.elapsed_ms ?? 0} ms` });
      await logAdminAction("scraper_keyword_quicktest", { type: "scraper_keyword", id: testKw.id },
        { keyword: testKw.keyword, portal: testPortal, result_count: n });
    } catch (e: any) {
      toast({ title: "Test eșuat", description: e.message, variant: "destructive" });
      await logAdminAction("scraper_keyword_quicktest", { type: "scraper_keyword", id: testKw.id },
        { keyword: testKw.keyword, portal: testPortal, error: e.message }, "error");
    } finally {
      setTestRunning(false);
    }
  };

  // Force manual refresh — wrapped in confirm dialog to avoid double-triggering
  // any downstream API calls (jobs are broadcast-driven, but user asked for guard).
  const doForceRefresh = async () => {
    await Promise.all([
      refetchFound(),
      qc.invalidateQueries({ queryKey: ["scraper-keywords-monitor"] }),
      qc.invalidateQueries({ queryKey: ["scraper-jobs-monitor"] }),
    ]);
    toast({ title: "Date reîncărcate" });
    await logAdminAction("scraper_force_refresh", {}, { source: "monitor_panel" });
  };
  const handleForceRefresh = () => {
    setConfirmState({
      title: "Forțezi reîncărcarea completă?",
      description: "Vei re-executa toate interogările împotriva bazei. Nu declanșează scanare nouă, dar oprește orice request în zbor. Acțiunea se înregistrează.",
      actionLabel: "Forțează",
      tone: "destructive",
      onConfirm: doForceRefresh,
    });
  };


  const exportKeywords = () => {
    const header = ["keyword", "platform", "vertical", "status", "score", "success", "fail", "unique_leads", "consecutive_zero", "query_template", "last_success_at", "last_test_at"];
    const rows: (string | number | null)[][] = [header];
    filtered.forEach((k) => {
      rows.push([
        k.keyword, k.platform ?? "", classifyVertical(k.keyword),
        k.is_active ? "activ" : "auto-dezactivat",
        computeScore(k),
        k.success_count, k.fail_count, k.unique_leads_count ?? 0,
        k.consecutive_zero, k.query_template ?? "",
        k.last_success_at ?? "", k.last_test_at ?? "",
      ]);
    });
    downloadCSV(`scraper-keywords-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast({ title: "Export CSV", description: `${filtered.length} cuvinte cheie descărcate.` });
  };

  const exportLastSession = () => {
    const header = ["id", "status", "started_at", "finished_at", "total_queries", "processed_queries", "new_listings", "duplicate_skipped", "archived_skipped", "blacklisted_skipped", "error"];
    const rows: (string | number | null)[][] = [header];
    jobs.forEach((j) => {
      rows.push([
        j.id, j.status, j.started_at, j.finished_at,
        j.total_queries, j.processed_queries, j.new_listings,
        j.duplicate_skipped, j.archived_skipped, j.blacklisted_skipped,
        j.error_message ?? "",
      ]);
    });
    downloadCSV(`scraper-sessions-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    toast({ title: "Export CSV", description: `${jobs.length} rulări descărcate.` });
  };

  const runningJob = jobs.find((j) => j.status === "running") ?? null;
  const runningPct = runningJob && runningJob.total_queries
    ? Math.min(100, Math.round(((runningJob.processed_queries ?? 0) / runningJob.total_queries) * 100))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" /> Monitorizare Scraper
          </h2>
          <p className="text-sm text-muted-foreground">
            Status cuvinte cheie, scor performanță, query templates personalizate și teste rapide pe portal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Badge variant="outline" className="gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
            <Radio className="h-3 w-3 animate-pulse" /> Realtime activ
          </Badge>
          {notifPermission !== "granted" ? (
            <Button variant="outline" size="sm" onClick={requestNotificationPermission}>
              <BellOff className="h-4 w-4 mr-1.5" /> Activează notificări
            </Button>
          ) : (
            <Badge variant="secondary" className="gap-1"><Bell className="h-3 w-3" /> Notificări active</Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleForceRefresh}>
            <ShieldAlert className="h-4 w-4 mr-1.5" /> Forțează refresh
          </Button>
        </div>
      </div>

      {/* Live job progress */}
      {runningJob && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Radio className="h-4 w-4 text-primary animate-pulse" />
              Scanare în desfășurare
              <span
                key={tickPulse}
                className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in zoom-in duration-500"
              >
                <CheckCircle2 className="h-3 w-3" /> {runningJob.new_listings ?? 0} anunțuri noi
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={runningPct} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground font-mono">
              <span>{runningJob.processed_queries ?? 0} / {runningJob.total_queries ?? 0} querii</span>
              <span>{runningPct}%</span>
            </div>
          </CardContent>
        </Card>
      )}



      {/* Regression alerts */}
      <div className="grid gap-2 md:grid-cols-3">
        {regressionAlerts.map((a) => {
          const tone = a.level === "danger"
            ? "border-rose-500/50 bg-rose-500/5 text-rose-700 dark:text-rose-300"
            : a.level === "warn"
              ? "border-amber-500/50 bg-amber-500/5 text-amber-700 dark:text-amber-300"
              : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300";
          const labels: Record<string, string> = {
            "piata-roi": "Piață / ROI", "social-leads": "Social Leads", "complexes": "Complexuri Premium",
          };
          const Icon = a.level === "ok" ? CheckCircle2 : AlertTriangle;
          return (
            <div key={a.vertical} className={`rounded-lg border p-3 ${tone}`}>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Icon className="h-3.5 w-3.5" /> {labels[a.vertical]}
              </div>
              <div className="text-xs mt-1 opacity-90">{a.msg}</div>
            </div>
          );
        })}
      </div>

      {/* Session summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Rezumat sesiune
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{sessionSummary}</p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            <Stat label="Total" value={stats.total} icon={Activity} />
            <Stat label="Active" value={stats.active} icon={CheckCircle2} tone="success" />
            <Stat label="Auto-Dezactivate" value={stats.disabled} icon={XCircle} tone="danger" />
            <Stat label="Σ Success" value={stats.totalSuccess} icon={CheckCircle2} tone="success" />
            <Stat label="Σ Fail" value={stats.totalFail} icon={AlertTriangle} tone="warning" />
            <Stat label="Σ Leads unice" value={stats.totalLeads} icon={Trophy} tone="success" />
          </div>
          {jobs.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded border border-border/40 divide-y divide-border/40">
              {jobs.map((j) => (
                <div key={j.id} className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs">
                  <span className="font-mono text-muted-foreground">{j.started_at?.slice(0, 16).replace("T", " ")}</span>
                  <Badge variant={j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"} className="capitalize">{j.status}</Badge>
                  <span className="text-foreground"><b>{j.new_listings ?? 0}</b> noi</span>
                  <span className="text-muted-foreground">{j.processed_queries ?? 0}/{j.total_queries ?? 0} q</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently found listings */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-primary" /> Anunțuri găsite de scraper
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Feed live din <code className="text-[10px]">prospect_listings</code> — ce a intrat în DB prin scanări.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Tabs value={foundWindow} onValueChange={(v) => setFoundWindow(v as typeof foundWindow)}>
                <TabsList className="h-9">
                  <TabsTrigger value="24h">24h</TabsTrigger>
                  <TabsTrigger value="7d">7 zile</TabsTrigger>
                  <TabsTrigger value="30d">30 zile</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" onClick={() => refetchFound()}>
                <RotateCcw className={`h-4 w-4 mr-1.5 ${foundLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={exportFoundListings} disabled={filteredFound.length === 0}>
                <Download className="h-4 w-4 mr-1.5" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Stat label={`Total (${foundWindow})`} value={foundTotals?.total ?? 0} icon={ListChecks} />
            <Stat label="Active" value={foundTotals?.active ?? 0} icon={CheckCircle2} tone="success" />
            <Stat label="Prioritare (≥70)" value={foundTotals?.priority ?? 0} icon={Trophy} tone="success" />
            <Stat label="Surse distincte" value={platformBreakdown.length} icon={Building2} />
          </div>

          {platformBreakdown.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {platformBreakdown.map(([p, n]) => (
                <Badge key={p} variant="secondary" className="text-xs">
                  {p} <span className="ml-1 font-mono opacity-70">{n}</span>
                </Badge>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Caută în titlu, zonă, telefon, sursă..."
              value={foundSearch}
              onChange={(e) => setFoundSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <div className="rounded-lg border border-border/50 max-h-[520px] overflow-auto">
            {foundLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Se încarcă…</div>
            ) : filteredFound.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Niciun anunț în fereastra selectată.
                {" "}Verifică cuvintele cheie active și rulează o scanare.
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[110px]">Data</TableHead>
                    <TableHead className="w-[110px]">Sursă</TableHead>
                    <TableHead>Titlu</TableHead>
                    <TableHead className="w-[140px]">Zonă</TableHead>
                    <TableHead className="w-[110px] text-right">Preț</TableHead>
                    <TableHead className="w-[130px]">Telefon</TableHead>
                    <TableHead className="w-[70px] text-center">Score</TableHead>
                    <TableHead className="w-[70px] text-center">Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFound.map((l: any) => (
                    <TableRow key={l.id} className={!l.is_active ? "opacity-60" : ""}>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {l.created_at?.slice(0, 16).replace("T", " ")}
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="outline" className="text-[10px]">{l.source_platform || "—"}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        <div className="font-medium text-sm truncate" title={l.title || ""}>{l.title || "—"}</div>
                        {(l.rooms || l.size) && (
                          <div className="text-[11px] text-muted-foreground">
                            {l.rooms ? `${l.rooms} cam` : ""}{l.rooms && l.size ? " · " : ""}{l.size ? `${l.size} mp` : ""}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.zone ? (
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3 text-muted-foreground" />{l.zone}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono">
                        {l.price ? `${Number(l.price).toLocaleString("ro-RO")} ${l.currency || "€"}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.contact_phone ? (
                          <a href={`tel:${l.contact_phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                            <Phone className="h-3 w-3" />{l.contact_phone}
                          </a>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {typeof l.lead_score === "number" ? (
                          <Badge variant={l.lead_score >= 70 ? "default" : "secondary"} className="font-mono text-[11px]">
                            {l.lead_score}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center">
                        {l.source_url ? (
                          <a href={l.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex text-primary hover:underline" title="Deschide anunțul">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Afișate {filteredFound.length} din {foundListings.length} încărcate (limită 200). Restul în Pipeline Prospecți.
          </p>
        </CardContent>
      </Card>

      {/* Filters + table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Dashboard cuvinte cheie</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportKeywords}>
                <Download className="h-4 w-4 mr-1.5" /> CSV cuvinte
              </Button>
              <Button variant="outline" size="sm" onClick={exportLastSession}>
                <Download className="h-4 w-4 mr-1.5" /> CSV sesiuni
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={vertical} onValueChange={(v) => setVertical(v as Vertical)}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Toate</TabsTrigger>
              <TabsTrigger value="piata-roi" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Piață / ROI</TabsTrigger>
              <TabsTrigger value="social-leads" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Social Leads</TabsTrigger>
              <TabsTrigger value="complexes" className="gap-1.5"><Building2 className="h-3.5 w-3.5" /> Complexuri Premium</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Caută în cuvinte cheie..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
              <TabsList>
                <TabsTrigger value="all">Toate</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="disabled">Auto-Dezactivate</TabsTrigger>
              </TabsList>
            </Tabs>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Sortare: Scor</SelectItem>
                <SelectItem value="leads">Sortare: Leads unice</SelectItem>
                <SelectItem value="fails">Sortare: Eșecuri</SelectItem>
                <SelectItem value="updated">Sortare: Actualizate</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} rezultate</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px] text-center">Scor</TableHead>
                  <TableHead>Cuvânt cheie / Query template</TableHead>
                  <TableHead className="w-[110px]">Platformă</TableHead>
                  <TableHead className="w-[70px] text-center">✓</TableHead>
                  <TableHead className="w-[70px] text-center">✗</TableHead>
                  <TableHead className="w-[80px] text-center">Leads</TableHead>
                  <TableHead className="w-[130px]">Status</TableHead>
                  <TableHead className="w-[180px] text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kwLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Se încarcă…</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">Niciun cuvânt cheie pentru filtrele curente.</TableCell></TableRow>
                ) : (
                  filtered.map((k) => {
                    const score = computeScore(k);
                    const scoreTone = score >= 60 ? "text-emerald-600 dark:text-emerald-400"
                      : score >= 25 ? "text-amber-600 dark:text-amber-400"
                      : "text-rose-600 dark:text-rose-400";
                    const isEditing = editingId === k.id;
                    return (
                      <TableRow key={k.id}>
                        <TableCell className={`text-center font-bold font-mono ${scoreTone}`}>{score}</TableCell>
                        <TableCell className="max-w-[420px]">
                          <div className="font-medium truncate" title={k.keyword}>{k.keyword}</div>
                          {isEditing ? (
                            <div className="flex gap-1 mt-1">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                placeholder="ex: apartament {keyword} timisoara"
                                className="h-7 text-xs font-mono"
                              />
                              <Button size="sm" variant="default" className="h-7 px-2" disabled={savingId === k.id} onClick={() => saveEdit(k.id, k.keyword)}>
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>✕</Button>
                            </div>
                          ) : k.query_template ? (
                            <code className="text-[10px] text-muted-foreground block truncate mt-0.5" title={k.query_template}>↳ {k.query_template}</code>
                          ) : (
                            <span className="text-[10px] text-muted-foreground/60 italic">fără template — folosește cuvântul ca atare</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{k.platform || "—"}</TableCell>
                        <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-mono">{k.success_count}</TableCell>
                        <TableCell className="text-center text-rose-600 dark:text-rose-400 font-mono">{k.fail_count}</TableCell>
                        <TableCell className="text-center font-mono">{k.unique_leads_count ?? 0}</TableCell>
                        <TableCell>
                          {k.is_active ? (
                            <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Activ</Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1" title={k.auto_disabled_reason ?? undefined}>
                              <XCircle className="h-3 w-3" /> Auto-Dezactivat
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2" title="Editează query template" onClick={() => startEdit(k)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2" title="Test rapid" onClick={() => openTest(k)}>
                              <Zap className="h-3.5 w-3.5 mr-1" /> Test
                            </Button>
                            {!k.is_active && (
                              <Button size="sm" variant="outline" className="h-7 px-2" disabled={reactivatingId === k.id} onClick={() => handleReactivate(k)}>
                                <RotateCcw className={`h-3.5 w-3.5 ${reactivatingId === k.id ? "animate-spin" : ""}`} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Audit trail */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Audit trail — acțiuni admini
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Ultimele 40 de acțiuni sensibile efectuate în panoul scraper: reactivări, editări query template, teste manuale, forțări refresh. Se actualizează în timp real.
          </p>
        </CardHeader>
        <CardContent>
          {auditRows.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nicio acțiune înregistrată încă.
            </div>
          ) : (
            <div className="rounded-lg border border-border/50 max-h-[380px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow>
                    <TableHead className="w-[140px]">Timp</TableHead>
                    <TableHead className="w-[180px]">Acțiune</TableHead>
                    <TableHead className="w-[180px]">Actor</TableHead>
                    <TableHead>Detalii</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditRows.map((r: any) => {
                    const label: Record<string, string> = {
                      scraper_keyword_reactivate: "🔁 Reactivare keyword",
                      scraper_keyword_template_edit: "✏️ Editare template",
                      scraper_keyword_quicktest: "⚡ Test rapid",
                      scraper_force_refresh: "🛡️ Forțare refresh",
                      scraper_manual_scan: "🚀 Scanare manuală",
                      scraper_parallelism_change: "⚙️ Schimbare paralelism",
                      scraper_keyword_bulk_action: "📦 Acțiune bulk",
                    };
                    const sevTone = r.severity === "error"
                      ? "border-rose-500/50 text-rose-700 dark:text-rose-300"
                      : r.severity === "warning"
                        ? "border-amber-500/50 text-amber-700 dark:text-amber-300"
                        : "border-primary/40 text-primary";
                    const details = r.details && typeof r.details === "object"
                      ? Object.entries(r.details).slice(0, 4).map(([k, v]) =>
                          `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join(" · ")
                      : "";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(r.created_at).toLocaleString("ro-RO", {
                            day: "2-digit", month: "2-digit",
                            hour: "2-digit", minute: "2-digit", second: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] ${sevTone}`}>
                            {label[r.action] || r.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[180px]" title={r.actor_label || ""}>
                          {r.actor_label || (r.actor_user_id ? r.actor_user_id.slice(0, 8) : "system")}
                        </TableCell>
                        <TableCell className="text-xs text-foreground/80 truncate max-w-[420px]" title={details}>
                          {details || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm dialog for sensitive actions */}
      <AlertDialog open={!!confirmState} onOpenChange={(o) => !o && setConfirmState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className={`h-5 w-5 ${confirmState?.tone === "destructive" ? "text-destructive" : "text-primary"}`} />
              {confirmState?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>{confirmState?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              className={confirmState?.tone === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined}
              onClick={async () => {
                const fn = confirmState?.onConfirm;
                setConfirmState(null);
                if (fn) await fn();
              }}
            >
              {confirmState?.actionLabel || "Confirmă"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Quick Test dialog */}
      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Test rapid keyword
            </DialogTitle>
            <DialogDescription className="truncate">{testKw?.keyword}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground">Portal</label>
                <Select value={testPortal} onValueChange={setTestPortal}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PORTAL_OPTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={runTest} disabled={testRunning}>
                {testRunning ? <RotateCcw className="h-4 w-4 mr-1.5 animate-spin" /> : <Zap className="h-4 w-4 mr-1.5" />}
                Rulează test
              </Button>
            </div>
            {testResult && (
              <div className="space-y-2">
                <div className="text-xs bg-muted/40 rounded p-2 font-mono break-all">
                  <span className="text-muted-foreground">Query:</span> {testResult.final_query}
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span><b className="text-foreground">{testResult.result_count}</b> rezultate</span>
                  <span>{testResult.elapsed_ms} ms</span>
                  <span>portal: {testResult.portal}</span>
                </div>
                <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40 rounded border border-border/40">
                  {(testResult.results || []).length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground text-center">Niciun rezultat — ajustează query template-ul.</div>
                  ) : (testResult.results || []).map((r: any, i: number) => (
                    <div key={i} className="p-2 text-xs space-y-1">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline inline-flex items-center gap-1">
                        {r.title || r.url} <ExternalLink className="h-3 w-3" />
                      </a>
                      {r.snippet && <div className="text-muted-foreground line-clamp-2">{r.snippet}</div>}
                      <div className="text-[10px] text-muted-foreground/70 font-mono truncate">{r.url}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTestOpen(false)}>Închide</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  label, value, icon: Icon, tone = "default",
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone?: "default" | "success" | "danger" | "warning" }) {
  const colors = {
    default: "text-foreground",
    success: "text-emerald-600 dark:text-emerald-400",
    danger: "text-rose-600 dark:text-rose-400",
    warning: "text-amber-600 dark:text-amber-400",
  }[tone];
  return (
    <div className="rounded-lg border border-border/50 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${colors}`} /> {label}
      </div>
      <div className={`text-xl font-bold mt-0.5 ${colors}`}>{value}</div>
    </div>
  );
}
