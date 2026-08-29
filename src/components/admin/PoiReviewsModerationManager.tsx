import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X, Trash2, Star, Loader2, MessageSquare, Inbox, Download } from "lucide-react";
import { csvFileName, downloadCsv } from "@/utils/exportCsv";
import PoiReviewSettingsCard from "@/components/admin/PoiReviewSettingsCard";


type ModerationStatus = "pending" | "approved" | "rejected";

interface ModerationRow {
  id: string;
  poi_id: string;
  rating: number;
  comment: string | null;
  guest_name: string | null;
  status: ModerationStatus;
  rejection_reason: string | null;
  created_at: string;
  moderated_at: string | null;
}

interface PoiRow {
  id: string;
  name: string;
  category: string;
}

const STATUS_LABEL: Record<ModerationStatus, string> = {
  pending: "În așteptare",
  approved: "Aprobată",
  rejected: "Respinsă",
};

const STATUS_VARIANT: Record<ModerationStatus, "secondary" | "default" | "destructive"> = {
  pending: "secondary",
  approved: "default",
  rejected: "destructive",
};

const PoiReviewsModerationManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ModerationStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["admin-poi-reviews", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("poi_reviews")
        .select(
          "id,poi_id,rating,comment,guest_name,status,rejection_reason,created_at,moderated_at",
        )
        .order("created_at", { ascending: false })
        .limit(300);
      if (statusFilter !== "all") query = query.eq("status", statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ModerationRow[];
    },
    staleTime: 30_000,
  });

  const poiIds = useMemo(() => [...new Set(reviews.map((r) => r.poi_id))], [reviews]);

  const { data: pois = [] } = useQuery({
    queryKey: ["admin-poi-reviews-names", poiIds.join(",")],
    queryFn: async () => {
      if (poiIds.length === 0) return [] as PoiRow[];
      const { data, error } = await supabase
        .from("points_of_interest")
        .select("id,name,category")
        .in("id", poiIds);
      if (error) throw error;
      return (data ?? []) as PoiRow[];
    },
    enabled: poiIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const poiName = (id: string) => pois.find((p) => p.id === id)?.name ?? "—";

  const moderate = useMutation({
    mutationFn: async (input: { id: string; status: ModerationStatus; reason?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("poi_reviews")
        .update({
          status: input.status,
          rejection_reason: input.status === "rejected" ? (input.reason ?? "Conținut neconform") : null,
          moderated_by: user?.id ?? null,
          moderated_at: new Date().toISOString(),
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-poi-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["poi-reviews"] });
      toast({
        title: vars.status === "approved" ? "Recenzie aprobată" : "Recenzie respinsă",
        description:
          vars.status === "approved"
            ? "Recenzia este acum vizibilă public în ghidul de restaurante."
            : "Recenzia nu va mai apărea public.",
      });
    },
    onError: () =>
      toast({
        title: "Eroare",
        description: "Nu am putut actualiza recenzia.",
        variant: "destructive",
      }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("poi_reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-poi-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["poi-reviews"] });
      setDeleteId(null);
      toast({ title: "Recenzie ștearsă" });
    },
    onError: () =>
      toast({
        title: "Eroare",
        description: "Nu am putut șterge recenzia.",
        variant: "destructive",
      }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reviews;
    return reviews.filter(
      (r) =>
        poiName(r.poi_id).toLowerCase().includes(q) ||
        (r.guest_name ?? "").toLowerCase().includes(q) ||
        (r.comment ?? "").toLowerCase().includes(q),
    );
  }, [reviews, search, pois]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportCsv = () => {
    downloadCsv(
      csvFileName("moderare-recenzii-poi"),
      ["Data", "Locație", "Nota", "Oaspete", "Comentariu", "Stare", "Motiv respingere", "Moderat la"],
      filtered.map((r) => [
        new Date(r.created_at).toLocaleString("ro-RO"),
        poiName(r.poi_id),
        r.rating,
        r.guest_name,
        r.comment,
        r.status,
        r.rejection_reason,
        r.moderated_at ? new Date(r.moderated_at).toLocaleString("ro-RO") : "",
      ]),
    );
  };

  const pendingCount = reviews.filter((r) => r.status === "pending").length;


  return (
    <div className="space-y-6">
      <PoiReviewSettingsCard />
      <Card>

        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
            Moderare recenzii oaspeți (POI)
            {statusFilter === "pending" && pendingCount > 0 && (
              <Badge variant="secondary">{pendingCount} în așteptare</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Caută după locație, oaspete sau text"
              aria-label="Caută recenzii"
              className="sm:max-w-xs"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ModerationStatus | "all")}
            >
              <SelectTrigger className="sm:w-52" aria-label="Filtrează după stare">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">În așteptare</SelectItem>
                <SelectItem value="approved">Aprobate</SelectItem>
                <SelectItem value="rejected">Respinse</SelectItem>
                <SelectItem value="all">Toate</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={filtered.length === 0}
              onClick={handleExportCsv}
              aria-label="Exportă recenziile filtrate în format CSV"
            >
              <Download className="w-4 h-4 mr-2" aria-hidden="true" />
              Export CSV
            </Button>
          </div>


          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" aria-label="Se încarcă" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Inbox className="w-10 h-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Nu există recenzii pentru filtrul selectat.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Locație</TableHead>
                    <TableHead>Oaspete</TableHead>
                    <TableHead>Notă</TableHead>
                    <TableHead>Comentariu</TableHead>
                    <TableHead>Stare</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{poiName(r.poi_id)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.guest_name || "Anonim"}
                        <div className="text-xs">
                          {new Date(r.created_at).toLocaleDateString("ro-RO")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1" aria-label={`${r.rating} din 5 stele`}>
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
                          {r.rating}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[320px] text-sm">
                        <span className="line-clamp-3">{r.comment || "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {r.status !== "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[40px]"
                              disabled={moderate.isPending}
                              onClick={() => moderate.mutate({ id: r.id, status: "approved" })}
                              aria-label={`Aprobă recenzia pentru ${poiName(r.poi_id)}`}
                            >
                              <Check className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          )}
                          {r.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[40px]"
                              disabled={moderate.isPending}
                              onClick={() => moderate.mutate({ id: r.id, status: "rejected" })}
                              aria-label={`Respinge recenzia pentru ${poiName(r.poi_id)}`}
                            >
                              <X className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            className="min-h-[40px]"
                            onClick={() => setDeleteId(r.id)}
                            aria-label={`Șterge recenzia pentru ${poiName(r.poi_id)}`}
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ștergi definitiv recenzia?</AlertDialogTitle>
            <AlertDialogDescription>
              Acțiunea nu poate fi anulată. Recenzia va fi eliminată complet din baza de date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulează</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && remove.mutate(deleteId)}
              disabled={remove.isPending}
            >
              Șterge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PoiReviewsModerationManager;
