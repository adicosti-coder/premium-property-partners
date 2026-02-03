import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Percent,
  Euro,
  Calendar,
  BarChart3,
  Copy,
  Check,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_booking_nights: number;
  max_uses: number | null;
  current_uses: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

interface DiscountCodeUse {
  id: string;
  code_id: string;
  user_email: string | null;
  property_name: string | null;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  nights: number;
  used_at: string;
}

interface FormData {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: string;
  min_booking_nights: string;
  max_uses: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

const DiscountCodeManager = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const dateLocale = language === "ro" ? ro : enUS;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: "",
    min_booking_nights: "1",
    max_uses: "",
    valid_from: new Date().toISOString().split("T")[0],
    valid_until: "",
    is_active: true,
  });

  const t = {
    title: language === "ro" ? "Coduri Promoționale" : "Discount Codes",
    description: language === "ro" 
      ? "Gestionează codurile de reducere pentru rezervări directe" 
      : "Manage discount codes for direct bookings",
    addCode: language === "ro" ? "Adaugă Cod" : "Add Code",
    editCode: language === "ro" ? "Editează Cod" : "Edit Code",
    code: language === "ro" ? "Cod" : "Code",
    description_label: language === "ro" ? "Descriere" : "Description",
    type: language === "ro" ? "Tip" : "Type",
    value: language === "ro" ? "Valoare" : "Value",
    minNights: language === "ro" ? "Nopți min." : "Min. Nights",
    maxUses: language === "ro" ? "Utilizări max." : "Max Uses",
    currentUses: language === "ro" ? "Utilizări" : "Uses",
    validFrom: language === "ro" ? "Valid de la" : "Valid From",
    validUntil: language === "ro" ? "Valid până la" : "Valid Until",
    status: language === "ro" ? "Status" : "Status",
    actions: language === "ro" ? "Acțiuni" : "Actions",
    active: language === "ro" ? "Activ" : "Active",
    inactive: language === "ro" ? "Inactiv" : "Inactive",
    percentage: language === "ro" ? "Procent (%)" : "Percentage (%)",
    fixed: language === "ro" ? "Sumă fixă (€)" : "Fixed Amount (€)",
    save: language === "ro" ? "Salvează" : "Save",
    cancel: language === "ro" ? "Anulează" : "Cancel",
    delete: language === "ro" ? "Șterge" : "Delete",
    unlimited: language === "ro" ? "Nelimitat" : "Unlimited",
    expired: language === "ro" ? "Expirat" : "Expired",
    stats: language === "ro" ? "Statistici" : "Statistics",
    totalCodes: language === "ro" ? "Total Coduri" : "Total Codes",
    activeCodes: language === "ro" ? "Coduri Active" : "Active Codes",
    totalUses: language === "ro" ? "Utilizări Totale" : "Total Uses",
    totalSavings: language === "ro" ? "Economii Totale" : "Total Savings",
    recentUsage: language === "ro" ? "Utilizări Recente" : "Recent Usage",
    topCodes: language === "ro" ? "Top Coduri" : "Top Codes",
    noData: language === "ro" ? "Nu există date" : "No data available",
    copied: language === "ro" ? "Copiat!" : "Copied!",
  };

  // Fetch discount codes
  const { data: codes, isLoading: isLoadingCodes } = useQuery({
    queryKey: ["discount-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DiscountCode[];
    },
  });

  // Fetch usage data
  const { data: usageData, isLoading: isLoadingUsage } = useQuery({
    queryKey: ["discount-code-uses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_code_uses")
        .select("*")
        .order("used_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as DiscountCodeUse[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        code: data.code.toUpperCase().trim(),
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: parseFloat(data.discount_value),
        min_booking_nights: parseInt(data.min_booking_nights) || 1,
        max_uses: data.max_uses ? parseInt(data.max_uses) : null,
        valid_from: new Date(data.valid_from).toISOString(),
        valid_until: data.valid_until ? new Date(data.valid_until).toISOString() : null,
        is_active: data.is_active,
      };

      if (editingCode) {
        const { error } = await supabase
          .from("discount_codes")
          .update(payload)
          .eq("id", editingCode.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("discount_codes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-codes"] });
      toast.success(editingCode ? "Cod actualizat!" : "Cod creat!");
      handleCloseDialog();
    },
    onError: (error: Error) => {
      console.error("Error saving discount code:", error);
      toast.error(error.message.includes("duplicate") 
        ? "Codul există deja!" 
        : "Eroare la salvare");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("discount_codes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-codes"] });
      toast.success("Cod șters!");
    },
    onError: () => {
      toast.error("Eroare la ștergere");
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCode(null);
    setFormData({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: "",
      min_booking_nights: "1",
      max_uses: "",
      valid_from: new Date().toISOString().split("T")[0],
      valid_until: "",
      is_active: true,
    });
  };

  const handleEdit = (code: DiscountCode) => {
    setEditingCode(code);
    setFormData({
      code: code.code,
      description: code.description || "",
      discount_type: code.discount_type,
      discount_value: code.discount_value.toString(),
      min_booking_nights: code.min_booking_nights.toString(),
      max_uses: code.max_uses?.toString() || "",
      valid_from: code.valid_from.split("T")[0],
      valid_until: code.valid_until?.split("T")[0] || "",
      is_active: code.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.discount_value) {
      toast.error("Completează câmpurile obligatorii");
      return;
    }
    saveMutation.mutate(formData);
  };

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getCodeStatus = (code: DiscountCode) => {
    if (!code.is_active) return { label: t.inactive, variant: "secondary" as const };
    if (code.valid_until && new Date(code.valid_until) < new Date()) {
      return { label: t.expired, variant: "destructive" as const };
    }
    if (code.max_uses && code.current_uses >= code.max_uses) {
      return { label: t.expired, variant: "destructive" as const };
    }
    return { label: t.active, variant: "default" as const };
  };

  // Calculate stats
  const stats = {
    totalCodes: codes?.length || 0,
    activeCodes: codes?.filter(c => c.is_active).length || 0,
    totalUses: codes?.reduce((sum, c) => sum + c.current_uses, 0) || 0,
    totalSavings: usageData?.reduce((sum, u) => sum + u.discount_amount, 0) || 0,
  };

  // Prepare chart data
  const topCodesData = codes
    ?.filter(c => c.current_uses > 0)
    .sort((a, b) => b.current_uses - a.current_uses)
    .slice(0, 5)
    .map(c => ({ name: c.code, uses: c.current_uses })) || [];

  if (isLoadingCodes) {
    return (
      <div className="space-y-6">
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
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{t.totalCodes}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalCodes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">{t.activeCodes}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.activeCodes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">{t.totalUses}</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalUses}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Euro className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">{t.totalSavings}</span>
            </div>
            <p className="text-2xl font-bold mt-1">€{stats.totalSavings.toFixed(0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {topCodesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.topCodes}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCodesData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="uses" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingCode(null)}>
                <Plus className="h-4 w-4 mr-2" />
                {t.addCode}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCode ? t.editCode : t.addCode}</DialogTitle>
                <DialogDescription>
                  {language === "ro" 
                    ? "Creează un cod promoțional pentru rezervări" 
                    : "Create a promotional code for bookings"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">{t.code} *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="SUMMER25"
                      className="uppercase"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discount_type">{t.type}</Label>
                    <Select
                      value={formData.discount_type}
                      onValueChange={(value: "percentage" | "fixed") => 
                        setFormData({ ...formData, discount_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          <div className="flex items-center gap-2">
                            <Percent className="h-4 w-4" />
                            {t.percentage}
                          </div>
                        </SelectItem>
                        <SelectItem value="fixed">
                          <div className="flex items-center gap-2">
                            <Euro className="h-4 w-4" />
                            {t.fixed}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t.description_label}</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={language === "ro" ? "Descriere opțională" : "Optional description"}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount_value">{t.value} *</Label>
                    <Input
                      id="discount_value"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      placeholder={formData.discount_type === "percentage" ? "10" : "25"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_nights">{t.minNights}</Label>
                    <Input
                      id="min_nights"
                      type="number"
                      min="1"
                      value={formData.min_booking_nights}
                      onChange={(e) => setFormData({ ...formData, min_booking_nights: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_uses">{t.maxUses}</Label>
                    <Input
                      id="max_uses"
                      type="number"
                      min="1"
                      value={formData.max_uses}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                      placeholder="∞"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valid_from">{t.validFrom}</Label>
                    <Input
                      id="valid_from"
                      type="date"
                      value={formData.valid_from}
                      onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="valid_until">{t.validUntil}</Label>
                    <Input
                      id="valid_until"
                      type="date"
                      value={formData.valid_until}
                      onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="is_active">{t.active}</Label>
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    {t.cancel}
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {t.save}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.code}</TableHead>
                <TableHead>{t.type}</TableHead>
                <TableHead>{t.value}</TableHead>
                <TableHead>{t.minNights}</TableHead>
                <TableHead>{t.currentUses}</TableHead>
                <TableHead>{t.validUntil}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead className="text-right">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes?.map((code) => {
                const status = getCodeStatus(code);
                return (
                  <TableRow key={code.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-bold text-primary">{code.code}</code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(code.code)}
                        >
                          {copiedCode === code.code ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      {code.description && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">
                          {code.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.discount_type === "percentage" ? (
                        <Percent className="h-4 w-4" />
                      ) : (
                        <Euro className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {code.discount_type === "percentage" 
                        ? `${code.discount_value}%` 
                        : `€${code.discount_value}`}
                    </TableCell>
                    <TableCell>{code.min_booking_nights}</TableCell>
                    <TableCell>
                      {code.current_uses}
                      {code.max_uses && ` / ${code.max_uses}`}
                    </TableCell>
                    <TableCell>
                      {code.valid_until 
                        ? format(new Date(code.valid_until), "dd MMM yyyy", { locale: dateLocale })
                        : t.unlimited}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(code)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Sigur dorești să ștergi acest cod?")) {
                              deleteMutation.mutate(code.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!codes || codes.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {t.noData}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Usage */}
      {usageData && usageData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t.recentUsage}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usageData.slice(0, 10).map((use) => (
                <div
                  key={use.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {use.property_name || "Proprietate"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {use.user_email || "Anonim"} • {use.nights} {use.nights === 1 ? "noapte" : "nopți"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">
                      -€{use.discount_amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(use.used_at), "dd MMM, HH:mm", { locale: dateLocale })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DiscountCodeManager;
