import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Plus,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Link2,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ro } from "date-fns/locale";

interface ICalSource {
  id: string;
  property_id: string;
  ical_url: string;
  label: string;
  pynbooking_room: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  last_sync_error: string | null;
  events_count: number;
  created_at: string;
  properties?: { name: string } | null;
}

const ICalManager = () => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSource, setNewSource] = useState({
    property_id: "",
    ical_url: "",
    label: "",
    pynbooking_room: "",
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // Fetch iCal sources
  const { data: sources, isLoading } = useQuery({
    queryKey: ["ical-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ical_sources")
        .select("*, properties(name)")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ICalSource[];
    },
  });

  // Fetch properties for dropdown
  const { data: properties } = useQuery({
    queryKey: ["admin-properties-for-ical"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .eq("listing_type", "cazare")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Add source mutation
  const addMutation = useMutation({
    mutationFn: async (source: typeof newSource) => {
      const { error } = await supabase.from("ical_sources").insert({
        property_id: source.property_id,
        ical_url: source.ical_url.trim(),
        label: source.label.trim(),
        pynbooking_room: source.pynbooking_room.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ical-sources"] });
      setIsAddOpen(false);
      setNewSource({ property_id: "", ical_url: "", label: "", pynbooking_room: "" });
      toast({ title: "✅ Sursă iCal adăugată!" });
    },
    onError: (err: any) => {
      toast({ title: "Eroare", description: err.message, variant: "destructive" });
    },
  });

  // Delete source
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ical_sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ical-sources"] });
      toast({ title: "Sursă ștearsă" });
    },
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("ical_sources")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ical-sources"] });
    },
  });

  // Sync all or single source
  const handleSync = async (sourceId?: string) => {
    if (sourceId) setSyncingId(sourceId);
    else setIsSyncing(true);

    try {
      const body = sourceId ? { source_id: sourceId } : {};
      const { data, error } = await supabase.functions.invoke("sync-ical-bookings", { body });

      if (error) throw error;

      toast({
        title: "✅ Sincronizare completă!",
        description: `${data.totalNew} rezervări noi, ${data.totalUpdated} actualizate din ${data.synced} surse`,
      });
      queryClient.invalidateQueries({ queryKey: ["ical-sources"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (err: any) {
      toast({ title: "Eroare sincronizare", description: err.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
      setSyncingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-6 h-6 text-primary" />
            Sincronizare iCalendar
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Importă automat rezervările din PynBooking prin link-uri iCal
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleSync()}
            disabled={isSyncing || !sources?.length}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Se sincronizează..." : "Sincronizează toate"}
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adaugă sursă iCal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adaugă sursă iCalendar</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Proprietate</Label>
                  <Select
                    value={newSource.property_id}
                    onValueChange={(v) => setNewSource((s) => ({ ...s, property_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selectează proprietatea" />
                    </SelectTrigger>
                    <SelectContent>
                      {properties?.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL iCalendar</Label>
                  <Input
                    value={newSource.ical_url}
                    onChange={(e) => setNewSource((s) => ({ ...s, ical_url: e.target.value }))}
                    placeholder="https://aparthoteltimisoara.pynbooking.com/ical/3.ics"
                  />
                </div>
                <div>
                  <Label>Etichetă (opțional)</Label>
                  <Input
                    value={newSource.label}
                    onChange={(e) => setNewSource((s) => ({ ...s, label: e.target.value }))}
                    placeholder="Ex: PynBooking Feed"
                  />
                </div>
                <div>
                  <Label>Cameră PynBooking (opțional)</Label>
                  <Input
                    value={newSource.pynbooking_room}
                    onChange={(e) => setNewSource((s) => ({ ...s, pynbooking_room: e.target.value }))}
                    placeholder="Ex: M8-Ap. 5"
                  />
                </div>
                <Button
                  onClick={() => addMutation.mutate(newSource)}
                  disabled={!newSource.property_id || !newSource.ical_url || addMutation.isPending}
                  className="w-full"
                >
                  {addMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4 mr-2" />
                  )}
                  Adaugă
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">{sources?.length || 0}</p>
            <p className="text-sm text-muted-foreground">Surse iCal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">
              {sources?.filter((s) => s.is_active).length || 0}
            </p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">
              {sources?.reduce((s, src) => s + (src.events_count || 0), 0) || 0}
            </p>
            <p className="text-sm text-muted-foreground">Evenimente totale</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-2xl font-bold text-foreground">
              {sources?.filter((s) => s.last_sync_error).length || 0}
            </p>
            <p className="text-sm text-muted-foreground text-destructive">Erori</p>
          </CardContent>
        </Card>
      </div>

      {/* Sources table */}
      {!sources?.length ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium text-foreground">Nicio sursă iCal configurată</p>
            <p className="text-sm text-muted-foreground mt-1">
              Adaugă link-urile iCal din PynBooking pentru a sincroniza automat rezervările
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proprietate</TableHead>
                    <TableHead>Cameră</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Ultima sincr.</TableHead>
                    <TableHead>Evenimente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activ</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium text-sm">
                        {source.properties?.name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {source.pynbooking_room || source.label || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {source.ical_url}
                      </TableCell>
                      <TableCell className="text-sm">
                        {source.last_synced_at
                          ? format(new Date(source.last_synced_at), "d MMM HH:mm", { locale: ro })
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">{source.events_count || 0}</TableCell>
                      <TableCell>
                        {source.last_sync_error ? (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Eroare
                          </Badge>
                        ) : source.last_synced_at ? (
                          <Badge variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Clock className="w-3 h-3" />
                            Nesincr.
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={source.is_active}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: source.id, is_active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSync(source.id)}
                            disabled={syncingId === source.id}
                          >
                            <RefreshCw
                              className={`w-4 h-4 ${syncingId === source.id ? "animate-spin" : ""}`}
                            />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(source.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error details */}
      {sources?.some((s) => s.last_sync_error) && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Erori de sincronizare
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sources
              .filter((s) => s.last_sync_error)
              .map((s) => (
                <div key={s.id} className="text-xs bg-destructive/5 p-3 rounded-lg">
                  <span className="font-medium">{s.properties?.name || s.pynbooking_room}:</span>{" "}
                  {s.last_sync_error}
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ICalManager;
