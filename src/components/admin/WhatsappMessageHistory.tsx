import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, Clock, MessageSquare, RefreshCw, Search } from "lucide-react";

/**
 * Istoricul mesajelor WhatsApp trimise de Andrei.
 * Combină mesajele efective (`wa_messages`) cu încercările din coada de trimitere
 * (`wa_outbound_queue`), ca să fie vizibil ce a eșuat și de ce (răspunsul Meta).
 */

type StatusFilter = "all" | "sent" | "failed" | "pending";

interface HistoryRow {
  id: string;
  source: "message" | "queue";
  createdAt: string;
  recipient: string;
  profileName: string | null;
  templateName: string | null;
  content: string | null;
  status: "sent" | "failed" | "pending";
  metaResponse: string | null;
  attempts: number | null;
}

const fmtDateTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const STATUS_META: Record<
  HistoryRow["status"],
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  sent: {
    label: "Trimis",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  failed: {
    label: "Eșuat",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    icon: AlertTriangle,
  },
  pending: {
    label: "În așteptare",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
    icon: Clock,
  },
};

const WhatsappMessageHistory = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["admin", "whatsapp-history"],
    queryFn: async (): Promise<HistoryRow[]> => {
      const [messagesRes, queueRes] = await Promise.all([
        supabase
          .from("wa_messages")
          .select(
            "id, created_at, direction, role, content, template_name, error, wa_message_id, conversation_id, wa_conversations(phone_normalized, wa_profile_name)",
          )
          .eq("direction", "outbound")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("wa_outbound_queue")
          .select(
            "id, created_at, sent_at, phone_normalized, template_name, status, last_error, attempts",
          )
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (messagesRes.error) throw messagesRes.error;
      if (queueRes.error) throw queueRes.error;

      const messageRows: HistoryRow[] = (messagesRes.data ?? []).map((m) => {
        const conv = (m as unknown as {
          wa_conversations?: { phone_normalized?: string | null; wa_profile_name?: string | null } | null;
        }).wa_conversations;
        return {
          id: `msg-${m.id}`,
          source: "message",
          createdAt: m.created_at as string,
          recipient: conv?.phone_normalized ?? "—",
          profileName: conv?.wa_profile_name ?? null,
          templateName: (m.template_name as string | null) ?? null,
          content: (m.content as string | null) ?? null,
          status: m.error ? "failed" : "sent",
          metaResponse: (m.error as string | null) ?? null,
          attempts: null,
        };
      });

      const queueRows: HistoryRow[] = (queueRes.data ?? []).map((q) => {
        const rawStatus = (q.status as string | null) ?? "pending";
        const status: HistoryRow["status"] =
          rawStatus === "sent"
            ? "sent"
            : rawStatus === "failed" || rawStatus === "error" || rawStatus === "dnc"
              ? "failed"
              : "pending";
        return {
          id: `queue-${q.id}`,
          source: "queue",
          createdAt: (q.sent_at as string | null) ?? (q.created_at as string),
          recipient: (q.phone_normalized as string | null) ?? "—",
          profileName: null,
          templateName: (q.template_name as string | null) ?? null,
          content: null,
          status,
          metaResponse: (q.last_error as string | null) ?? null,
          attempts: (q.attempts as number | null) ?? null,
        };
      });

      return [...messageRows, ...queueRows].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    },
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!term) return true;
      return [row.recipient, row.profileName, row.templateName, row.content, row.metaResponse]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [data, statusFilter, search]);

  const counts = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      sent: all.filter((r) => r.status === "sent").length,
      failed: all.filter((r) => r.status === "failed").length,
      pending: all.filter((r) => r.status === "pending").length,
    };
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
              Istoric mesaje WhatsApp
            </CardTitle>
            <CardDescription>
              Mesajele trimise de Andrei, cu destinatar, ora, statutul livrării și răspunsul primit
              de la Meta atunci când o trimitere eșuează.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="min-h-12 shrink-0"
            aria-label="Reîmprospătează istoricul mesajelor WhatsApp"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            Reîmprospătează
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <TabsList>
              <TabsTrigger value="all">Toate ({counts.total})</TabsTrigger>
              <TabsTrigger value="sent">Trimise ({counts.sent})</TabsTrigger>
              <TabsTrigger value="failed">Eșuate ({counts.failed})</TabsTrigger>
              <TabsTrigger value="pending">În așteptare ({counts.pending})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută după număr, șablon sau eroare..."
              aria-label="Caută în istoricul mesajelor WhatsApp"
              className="pl-10"
            />
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Nu am putut încărca istoricul mesajelor. Încearcă să reîmprospătezi.
          </div>
        ) : isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 rounded-lg border border-border">
            <MessageSquare className="w-10 h-10 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
            <p className="font-medium text-foreground">Nicio trimitere înregistrată</p>
            <p className="text-sm text-muted-foreground">
              Mesajele apar aici imediat ce Andrei trimite primul mesaj pe WhatsApp.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Ora</TableHead>
                  <TableHead>Destinatar</TableHead>
                  <TableHead>Șablon / mesaj</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Răspuns Meta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const meta = STATUS_META[row.status];
                  const StatusIcon = meta.icon;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {fmtDateTime(row.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="font-medium">{row.recipient}</span>
                        {row.profileName && (
                          <span className="block text-xs text-muted-foreground">{row.profileName}</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[22rem]">
                        {row.templateName && (
                          <Badge variant="outline" className="mb-1">
                            {row.templateName}
                          </Badge>
                        )}
                        {row.content && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{row.content}</p>
                        )}
                        {!row.templateName && !row.content && (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge className={meta.className}>
                          <StatusIcon className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                          {meta.label}
                        </Badge>
                        {row.attempts != null && row.attempts > 1 && (
                          <span className="block text-xs text-muted-foreground mt-1">
                            {row.attempts} încercări
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[22rem]">
                        {row.metaResponse ? (
                          <p className="text-xs text-destructive break-words">{row.metaResponse}</p>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
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
  );
};

export default WhatsappMessageHistory;
