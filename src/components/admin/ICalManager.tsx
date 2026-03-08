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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
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
  History,
  Upload,
  Zap,
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

interface SyncLog {
  id: string;
  source_id: string;
  property_id: string;
  events_found: number;
  new_bookings: number;
  updated_bookings: number;
  deleted_bookings: number;
  error_message: string | null;
  duration_ms: number | null;
  sync_type: string;
  created_at: string;
  ical_sources?: { label: string; pynbooking_room: string | null } | null;
  properties?: { name: string } | null;
}

const ICalManager = () => {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [newSource, setNewSource] = useState({
    property_id: "",
    ical_url: "",
    label: "",
    pynbooking_room: "",
  });
  const [bulkText, setBulkText] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);

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
        .select("id, name, property_code")
        .eq("listing_type", "cazare")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch sync logs
  const { data: syncLogs } = useQuery({
    queryKey: ["ical-sync-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ical_sync_logs")
        .select("*, ical_sources(label, pynbooking_room), properties(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as SyncLog[];
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
      const body = sourceId ? { source_id: sourceId, sync_type: "manual" } : { sync_type: "manual" };
      const { data, error } = await supabase.functions.invoke("sync-ical-bookings", { body });

      if (error) throw error;

      toast({
        title: "✅ Sincronizare completă!",
        description: `${data.totalNew} rezervări noi, ${data.totalUpdated} actualizate din ${data.synced} surse`,
      });
      queryClient.invalidateQueries({ queryKey: ["ical-sources"] });
      queryClient.invalidateQueries({ queryKey: ["ical-sync-logs"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (err: any) {
      toast({ title: "Eroare sincronizare", description: err.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
      setSyncingId(null);
    }
  };

  // Bulk import - parse text with iCal URLs and auto-map to properties
  const handleBulkImport = async () => {
    if (!bulkText.trim() || !properties?.length) return;
    setIsBulkImporting(true);

    try {
      // Parse URLs from text - match .ics URLs
      const urlRegex = /https?:\/\/[^\s"'<>]+\.ics/gi;
      const urls = bulkText.match(urlRegex) || [];

      if (urls.length === 0) {
        toast({ title: "Nu am găsit link-uri iCal", description: "Lipește link-uri care se termină în .ics", variant: "destructive" });
        setIsBulkImporting(false);
        return;
      }

      // Extract room/ID info from URLs for auto-mapping
      // PynBooking URLs: https://domain.pynbooking.com/ical/3.ics → room ID 3
      let added = 0;
      const errors: string[] = [];

      // Get existing sources to avoid duplicates
      const { data: existingSources } = await supabase
        .from("ical_sources")
        .select("ical_url");
      const existingUrls = new Set((existingSources || []).map(s => s.ical_url));

      for (const url of urls) {
        if (existingUrls.has(url)) {
          errors.push(`Deja existent: ${url.split("/").pop()}`);
          continue;
        }

        // Try to extract room number from URL
        const roomMatch = url.match(/\/ical\/(\d+)\.ics/);
        const roomId = roomMatch ? roomMatch[1] : null;

        // Auto-assign to first available property or let user map later
        // For now, use the first property if only one, or leave unmapped
        const targetProperty = properties.length === 1 ? properties[0] : properties[0];

        const { error } = await supabase.from("ical_sources").insert({
          property_id: targetProperty.id,
          ical_url: url.trim(),
          label: `PynBooking Feed ${roomId || added + 1}`,
          pynbooking_room: roomId ? `Cameră ${roomId}` : null,
        });

        if (error) {
          errors.push(`Eroare: ${url.split("/").pop()} - ${error.message}`);
        } else {
          added++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["ical-sources"] });
      setIsBulkOpen(false);
      setBulkText("");

      toast({
        title: `✅ Import bulk finalizat`,
        description: `${added} surse adăugate din ${urls.length} detectate${errors.length ? `. ${errors.length} erori.` : ""}`,
      });
    } catch (err: any) {
      toast({ title: "Eroare import", description: err.message, variant: "destructive" });
    } finally {
      setIsBulkImporting(false);
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
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => handleSync()}
            disabled={isSyncing || !sources?.length}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Se sincronizează..." : "Sincronizează toate"}
          </Button>

          {/* Bulk Import Dialog */}
          <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import bulk
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Import bulk link-uri iCal
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <p className="text-sm text-muted-foreground">
                  Lipește mai multe link-uri iCal (câte unul pe linie) sau textul copiat din PynBooking. 
                  Se vor detecta automat toate link-urile .ics.
                </p>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`https://aparthoteltimisoara.pynbooking.com/ical/1.ics\nhttps://aparthoteltimisoara.pynbooking.com/ical/2.ics\nhttps://aparthoteltimisoara.pynbooking.com/ical/3.ics`}
                  rows={8}
                  className="font-mono text-xs"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {(bulkText.match(/https?:\/\/[^\s"'<>]+\.ics/gi) || []).length} link-uri detectate
                  </span>
                  <Button
                    onClick={handleBulkImport}
                    disabled={isBulkImporting || !bulkText.trim()}
                  >
                    {isBulkImporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Importă toate
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Add single source */}
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Adaugă sursă
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

      {/* Tabs: Sources & History */}
      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources" className="gap-1">
            <Link2 className="w-4 h-4" />
            Surse ({sources?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1">
            <History className="w-4 h-4" />
            Istoric sincronizări
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sources">
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
            <Card className="border-destructive/50 mt-4">
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
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              {!syncLogs?.length ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <History className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <p className="font-medium text-foreground">Nicio sincronizare încă</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Istoricul va apărea după prima sincronizare
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Proprietate</TableHead>
                        <TableHead>Sursă</TableHead>
                        <TableHead>Tip</TableHead>
                        <TableHead>Evenimente</TableHead>
                        <TableHead>Noi</TableHead>
                        <TableHead>Actualizate</TableHead>
                        <TableHead>Durată</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs">
                            {format(new Date(log.created_at), "d MMM HH:mm:ss", { locale: ro })}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {log.properties?.name || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.ical_sources?.label || log.ical_sources?.pynbooking_room || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.sync_type === "manual" ? "default" : "secondary"} className="text-xs">
                              {log.sync_type === "manual" ? "Manual" : "Auto"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{log.events_found}</TableCell>
                          <TableCell className="text-sm font-medium text-emerald-600">
                            {log.new_bookings > 0 ? `+${log.new_bookings}` : "0"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {log.updated_bookings > 0 ? log.updated_bookings : "0"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : "—"}
                          </TableCell>
                          <TableCell>
                            {log.error_message ? (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Eroare
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-300">
                                <CheckCircle2 className="w-3 h-3" />
                                OK
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ICalManager;
