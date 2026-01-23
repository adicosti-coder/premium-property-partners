import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import {
  Gift,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Home,
} from "lucide-react";

interface Referral {
  id: string;
  referrer_name: string;
  referrer_email: string;
  referrer_phone: string | null;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_message: string | null;
  property_location: string | null;
  property_type: string | null;
  property_rooms: number | null;
  status: string;
  admin_notes: string | null;
  contacted_at: string | null;
  meeting_date: string | null;
  contract_signed_at: string | null;
  reward_granted_at: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "În așteptare", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: Clock },
  contacted: { label: "Contactat", color: "bg-blue-500/10 text-blue-600 border-blue-500/30", icon: Phone },
  meeting_scheduled: { label: "Întâlnire programată", color: "bg-purple-500/10 text-purple-600 border-purple-500/30", icon: Calendar },
  contract_signed: { label: "Contract semnat", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle },
  reward_granted: { label: "Premiu acordat", color: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: Gift },
  rejected: { label: "Respins", color: "bg-red-500/10 text-red-600 border-red-500/30", icon: XCircle },
};

const ReferralManager = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: referrals, isLoading, refetch } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Referral[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const updates: Record<string, unknown> = {
        status,
        admin_notes: notes,
      };

      // Set timestamps based on status
      if (status === "contacted" && !selectedReferral?.contacted_at) {
        updates.contacted_at = new Date().toISOString();
      }
      if (status === "contract_signed" && !selectedReferral?.contract_signed_at) {
        updates.contract_signed_at = new Date().toISOString();
      }
      if (status === "reward_granted" && !selectedReferral?.reward_granted_at) {
        updates.reward_granted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("referrals")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      toast.success("Referral actualizat!");
      setIsEditOpen(false);
      setSelectedReferral(null);
    },
    onError: () => {
      toast.error("Eroare la actualizare");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("referrals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-referrals"] });
      toast.success("Referral șters!");
    },
    onError: () => {
      toast.error("Eroare la ștergere");
    },
  });

  const handleViewDetails = (referral: Referral) => {
    setSelectedReferral(referral);
    setIsDetailOpen(true);
  };

  const handleEdit = (referral: Referral) => {
    setSelectedReferral(referral);
    setEditStatus(referral.status);
    setEditNotes(referral.admin_notes || "");
    setIsEditOpen(true);
  };

  const handleSave = () => {
    if (!selectedReferral) return;
    updateMutation.mutate({
      id: selectedReferral.id,
      status: editStatus,
      notes: editNotes,
    });
  };

  const filteredReferrals = referrals?.filter(
    (r) => filterStatus === "all" || r.status === filterStatus
  );

  const stats = {
    total: referrals?.length || 0,
    pending: referrals?.filter((r) => r.status === "pending").length || 0,
    signed: referrals?.filter((r) => r.status === "contract_signed").length || 0,
    rewarded: referrals?.filter((r) => r.status === "reward_granted").length || 0,
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Referraluri</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">În Așteptare</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold">{stats.signed}</p>
            <p className="text-xs text-muted-foreground">Contracte Semnate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Gift className="w-8 h-8 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">{stats.rewarded}</p>
            <p className="text-xs text-muted-foreground">Premii Acordate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5" />
                Program Referral
              </CardTitle>
              <CardDescription>Gestionează recomandările primite</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrează" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toate</SelectItem>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredReferrals?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Niciun referral găsit</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>Proprietar</TableHead>
                    <TableHead>Locație</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReferrals?.map((referral) => {
                    const status = statusConfig[referral.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={referral.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(referral.created_at), "d MMM yyyy", { locale: ro })}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{referral.referrer_name}</p>
                            <p className="text-xs text-muted-foreground">{referral.referrer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{referral.owner_name}</p>
                            <p className="text-xs text-muted-foreground">{referral.owner_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {referral.property_location ? (
                            <div className="flex items-center gap-1 text-sm">
                              <MapPin className="w-3 h-3" />
                              {referral.property_location}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(referral)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(referral)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm("Sigur vrei să ștergi acest referral?")) {
                                  deleteMutation.mutate(referral.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
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

      {/* Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalii Referral</DialogTitle>
          </DialogHeader>
          {selectedReferral && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    Referrer
                  </h4>
                  <p className="text-sm">{selectedReferral.referrer_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedReferral.referrer_email}</p>
                  {selectedReferral.referrer_phone && (
                    <p className="text-xs text-muted-foreground">{selectedReferral.referrer_phone}</p>
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                    <Home className="w-4 h-4" />
                    Proprietar
                  </h4>
                  <p className="text-sm">{selectedReferral.owner_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedReferral.owner_email}</p>
                  <p className="text-xs text-muted-foreground">{selectedReferral.owner_phone}</p>
                </div>
              </div>
              
              {(selectedReferral.property_location || selectedReferral.property_type) && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Proprietate</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReferral.property_location && (
                      <Badge variant="outline">
                        <MapPin className="w-3 h-3 mr-1" />
                        {selectedReferral.property_location}
                      </Badge>
                    )}
                    {selectedReferral.property_type && (
                      <Badge variant="outline">{selectedReferral.property_type}</Badge>
                    )}
                    {selectedReferral.property_rooms && (
                      <Badge variant="outline">{selectedReferral.property_rooms} camere</Badge>
                    )}
                  </div>
                </div>
              )}
              
              {selectedReferral.owner_message && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Mesaj</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedReferral.owner_message}
                  </p>
                </div>
              )}
              
              {selectedReferral.admin_notes && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Note Admin</h4>
                  <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                    {selectedReferral.admin_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editează Referral</DialogTitle>
            <DialogDescription>
              Actualizează statusul și adaugă note
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Note Admin</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Adaugă note despre acest referral..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Se salvează..." : "Salvează"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReferralManager;