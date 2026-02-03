import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { format, differenceInDays, subDays } from "date-fns";
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
  TrendingUp,
  Target,
  Award,
  BarChart3,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Referral {
  id: string;
  referrer_name: string;
  referrer_email: string;
  referrer_phone: string | null;
  referrer_user_id: string | null;
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
  reward_property_id: string | null;
  reward_check_in: string | null;
  reward_check_out: string | null;
  created_at: string;
}

interface Property {
  id: string;
  name: string;
  location: string;
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
  const [rewardPropertyId, setRewardPropertyId] = useState<string>("");
  const [rewardCheckIn, setRewardCheckIn] = useState<string>("");
  const [rewardCheckOut, setRewardCheckOut] = useState<string>("");

  // Fetch properties for reward selection
  const { data: properties } = useQuery({
    queryKey: ["admin-properties-for-reward"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, location")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Property[];
    },
  });

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
    mutationFn: async ({ 
      id, 
      status, 
      notes,
      rewardPropertyId,
      rewardCheckIn,
      rewardCheckOut 
    }: { 
      id: string; 
      status: string; 
      notes: string;
      rewardPropertyId?: string;
      rewardCheckIn?: string;
      rewardCheckOut?: string;
    }) => {
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

      // Add reward details if granting reward
      if (status === "reward_granted") {
        if (rewardPropertyId) {
          updates.reward_property_id = rewardPropertyId;
        }
        if (rewardCheckIn) {
          updates.reward_check_in = rewardCheckIn;
        }
        if (rewardCheckOut) {
          updates.reward_check_out = rewardCheckOut;
        }
      }

      const { error } = await supabase
        .from("referrals")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      // Get reward property name for email
      let rewardPropertyName: string | undefined;
      if (status === "reward_granted" && rewardPropertyId && properties) {
        const property = properties.find(p => p.id === rewardPropertyId);
        rewardPropertyName = property?.name;
      }

      // Send email notification if status changed
      if (selectedReferral && status !== selectedReferral.status) {
        try {
          const { error: emailError } = await supabase.functions.invoke("send-referral-notification", {
            body: {
              referrerName: selectedReferral.referrer_name,
              referrerEmail: selectedReferral.referrer_email,
              referrerUserId: selectedReferral.referrer_user_id,
              ownerName: selectedReferral.owner_name,
              newStatus: status,
              oldStatus: selectedReferral.status,
              propertyLocation: selectedReferral.property_location,
              rewardPropertyName,
              rewardCheckIn,
              rewardCheckOut,
            },
          });

          if (emailError) {
            console.error("Error sending notification email:", emailError);
          } else {
            console.log("Notification email sent successfully");
          }
        } catch (emailErr) {
          console.error("Failed to send notification email:", emailErr);
        }
      }
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
    setRewardPropertyId(referral.reward_property_id || "");
    setRewardCheckIn(referral.reward_check_in || "");
    setRewardCheckOut(referral.reward_check_out || "");
    setIsEditOpen(true);
  };

  const handleSave = () => {
    if (!selectedReferral) return;
    updateMutation.mutate({
      id: selectedReferral.id,
      status: editStatus,
      notes: editNotes,
      rewardPropertyId: rewardPropertyId || undefined,
      rewardCheckIn: rewardCheckIn || undefined,
      rewardCheckOut: rewardCheckOut || undefined,
    });
  };

  const filteredReferrals = referrals?.filter(
    (r) => filterStatus === "all" || r.status === filterStatus
  );

  // Calculate stats
  const stats = {
    total: referrals?.length || 0,
    pending: referrals?.filter((r) => r.status === "pending").length || 0,
    contacted: referrals?.filter((r) => r.status === "contacted").length || 0,
    meetingScheduled: referrals?.filter((r) => r.status === "meeting_scheduled").length || 0,
    signed: referrals?.filter((r) => r.status === "contract_signed").length || 0,
    rewarded: referrals?.filter((r) => r.status === "reward_granted").length || 0,
    rejected: referrals?.filter((r) => r.status === "rejected").length || 0,
  };

  // Calculate conversion metrics
  const converted = stats.signed + stats.rewarded;
  const conversionRate = stats.total > 0 ? Math.round((converted / stats.total) * 100) : 0;
  const pendingRate = stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0;
  const inProgressRate = stats.total > 0 ? Math.round(((stats.contacted + stats.meetingScheduled) / stats.total) * 100) : 0;

  // Referrals in last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);
  const recentReferrals = referrals?.filter((r) => new Date(r.created_at) >= thirtyDaysAgo).length || 0;
  
  // Average time to convert (for signed/rewarded referrals)
  const convertedReferrals = referrals?.filter((r) => 
    (r.status === "contract_signed" || r.status === "reward_granted") && r.contract_signed_at
  ) || [];
  const avgDaysToConvert = convertedReferrals.length > 0
    ? Math.round(
        convertedReferrals.reduce((sum, r) => 
          sum + differenceInDays(new Date(r.contract_signed_at!), new Date(r.created_at)), 0
        ) / convertedReferrals.length
      )
    : 0;

  // Pie chart data
  const pieData = [
    { name: "În așteptare", value: stats.pending, color: "#eab308" },
    { name: "Contactat", value: stats.contacted, color: "#3b82f6" },
    { name: "Întâlnire", value: stats.meetingScheduled, color: "#8b5cf6" },
    { name: "Contract", value: stats.signed, color: "#10b981" },
    { name: "Premiu", value: stats.rewarded, color: "#f59e0b" },
    { name: "Respins", value: stats.rejected, color: "#ef4444" },
  ].filter(d => d.value > 0);

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
      {/* Enhanced Stats Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stats Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <Users className="w-10 h-10 text-primary/20" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                +{recentReferrals} în ultimele 30 zile
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">În Așteptare</p>
                  <p className="text-3xl font-bold">{stats.pending}</p>
                </div>
                <Clock className="w-10 h-10 text-yellow-500/20" />
              </div>
              <Progress value={pendingRate} className="mt-2 h-1" />
              <p className="text-xs text-muted-foreground mt-1">{pendingRate}% din total</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Convertite</p>
                  <p className="text-3xl font-bold">{converted}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-emerald-500/20" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-xs font-medium text-emerald-600">{conversionRate}% rată succes</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Premii</p>
                  <p className="text-3xl font-bold">{stats.rewarded}</p>
                </div>
                <Gift className="w-10 h-10 text-amber-500/20" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Weekend-uri acordate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Conversion Funnel & Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Distribuție Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={40}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [value, "Referraluri"]}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-1">
                  {pieData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nicio dată disponibilă
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Target className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Rată Conversie</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-500/10">
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgDaysToConvert}</p>
                <p className="text-xs text-muted-foreground">Zile Medie Conversie</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/5 to-transparent">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <TrendingUp className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.contacted + stats.meetingScheduled}</p>
                <p className="text-xs text-muted-foreground">În Progres</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/5 to-transparent">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <Award className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rewarded * 300}€</p>
                <p className="text-xs text-muted-foreground">Valoare Premii</p>
              </div>
            </div>
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
            
            {/* Reward Details - only show when status is reward_granted or contract_signed */}
            {(editStatus === "reward_granted" || editStatus === "contract_signed") && (
              <div className="space-y-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <h4 className="font-semibold text-sm flex items-center gap-2 text-amber-600">
                  <Gift className="w-4 h-4" />
                  Detalii Premiu Weekend Gratuit
                </h4>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Proprietate pentru Premiu</label>
                  <Select value={rewardPropertyId} onValueChange={setRewardPropertyId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selectează proprietatea..." />
                    </SelectTrigger>
                    <SelectContent>
                      {properties?.map((property) => (
                        <SelectItem key={property.id} value={property.id}>
                          {property.name} - {property.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Check-in</label>
                    <Input
                      type="date"
                      value={rewardCheckIn}
                      onChange={(e) => setRewardCheckIn(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Check-out</label>
                    <Input
                      type="date"
                      value={rewardCheckOut}
                      onChange={(e) => setRewardCheckOut(e.target.value)}
                      min={rewardCheckIn || new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                
                {rewardPropertyId && rewardCheckIn && rewardCheckOut && (
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm">
                    <p className="text-emerald-600 font-medium">
                      ✓ Premiu configurat: {properties?.find(p => p.id === rewardPropertyId)?.name}
                    </p>
                    <p className="text-emerald-600/80 text-xs mt-1">
                      Perioada: {rewardCheckIn} → {rewardCheckOut}
                    </p>
                  </div>
                )}
              </div>
            )}
            
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