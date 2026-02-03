import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Copy, Check, Key } from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";

interface OwnerCode {
  id: string;
  code: string;
  property_id: string;
  is_used: boolean;
  used_by: string | null;
  expires_at: string | null;
  created_at: string;
}

interface Property {
  id: string;
  name: string;
}

const translations = {
  ro: {
    title: "Coduri Proprietari",
    description: "Generează și gestionează codurile de acces pentru proprietari",
    generateCode: "Generează Cod",
    selectProperty: "Selectează Proprietatea",
    expiresIn: "Expiră în (zile)",
    optional: "opțional",
    generate: "Generează",
    cancel: "Anulează",
    code: "Cod",
    property: "Proprietate",
    status: "Status",
    expiresAt: "Expiră la",
    createdAt: "Creat la",
    actions: "Acțiuni",
    used: "Folosit",
    active: "Activ",
    expired: "Expirat",
    copyCode: "Copiază codul",
    copied: "Copiat!",
    deleteCode: "Șterge codul",
    deleteDescription: "Această acțiune nu poate fi anulată.",
    noExpiration: "Fără expirare",
    noCodes: "Nu există coduri",
    noCodesDescription: "Generează primul cod pentru proprietari.",
    codeGenerated: "Cod generat cu succes",
    codeDeleted: "Cod șters cu succes",
    error: "Eroare",
    loadError: "Nu s-au putut încărca codurile",
    generateError: "Nu s-a putut genera codul",
    deleteError: "Nu s-a putut șterge codul",
    never: "Niciodată",
  },
  en: {
    title: "Owner Codes",
    description: "Generate and manage access codes for property owners",
    generateCode: "Generate Code",
    selectProperty: "Select Property",
    expiresIn: "Expires in (days)",
    optional: "optional",
    generate: "Generate",
    cancel: "Cancel",
    code: "Code",
    property: "Property",
    status: "Status",
    expiresAt: "Expires at",
    createdAt: "Created at",
    actions: "Actions",
    used: "Used",
    active: "Active",
    expired: "Expired",
    copyCode: "Copy code",
    copied: "Copied!",
    deleteCode: "Delete code",
    deleteDescription: "This action cannot be undone.",
    noExpiration: "No expiration",
    noCodes: "No codes",
    noCodesDescription: "Generate the first code for property owners.",
    codeGenerated: "Code generated successfully",
    codeDeleted: "Code deleted successfully",
    error: "Error",
    loadError: "Could not load codes",
    generateError: "Could not generate code",
    deleteError: "Could not delete code",
    never: "Never",
  },
};

const generateRandomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const OwnerCodeManager = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const dateLocale = language === "ro" ? ro : enUS;

  const [codes, setCodes] = useState<OwnerCode[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [codesRes, propertiesRes] = await Promise.all([
        supabase
          .from("owner_codes")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("properties")
          .select("id, name")
          .eq("is_active", true)
          .order("name"),
      ]);

      if (codesRes.error) throw codesRes.error;
      if (propertiesRes.error) throw propertiesRes.error;

      setCodes(codesRes.data || []);
      setProperties(propertiesRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: t.error,
        description: t.loadError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    if (!selectedPropertyId) return;

    setIsGenerating(true);
    try {
      const code = generateRandomCode();
      const expiresAt = expiresInDays
        ? new Date(Date.now() + parseInt(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from("owner_codes")
        .insert({
          code,
          property_id: selectedPropertyId,
          expires_at: expiresAt,
        })
        .select()
        .single();

      if (error) throw error;

      setCodes([data, ...codes]);
      setDialogOpen(false);
      setSelectedPropertyId("");
      setExpiresInDays("");

      toast({ title: t.codeGenerated });
    } catch (error) {
      console.error("Error generating code:", error);
      toast({
        title: t.error,
        description: t.generateError,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("owner_codes").delete().eq("id", id);
      if (error) throw error;

      setCodes(codes.filter((c) => c.id !== id));
      toast({ title: t.codeDeleted });
    } catch (error) {
      console.error("Error deleting code:", error);
      toast({
        title: t.error,
        description: t.deleteError,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCodeStatus = (code: OwnerCode) => {
    if (code.is_used) return "used";
    if (code.expires_at && new Date(code.expires_at) < new Date()) return "expired";
    return "active";
  };

  const getPropertyName = (propertyId: string) => {
    const property = properties.find((p) => p.id === propertyId);
    return property?.name || propertyId;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-foreground flex items-center gap-2">
            <Key className="w-6 h-6 text-primary" />
            {t.title}
          </h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t.generateCode}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.generateCode}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t.selectProperty}</Label>
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.selectProperty} />
                  </SelectTrigger>
                  <SelectContent>
                    {properties.map((property) => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  {t.expiresIn} <span className="text-muted-foreground">({t.optional})</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="30"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {t.cancel}
                </Button>
                <Button
                  onClick={handleGenerateCode}
                  disabled={!selectedPropertyId || isGenerating}
                >
                  {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t.generate}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {codes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Key className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">{t.noCodes}</h3>
            <p className="text-muted-foreground">{t.noCodesDescription}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.code}</TableHead>
                <TableHead>{t.property}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.expiresAt}</TableHead>
                <TableHead>{t.createdAt}</TableHead>
                <TableHead className="w-[100px]">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((code) => {
                const status = getCodeStatus(code);
                return (
                  <TableRow key={code.id}>
                    <TableCell>
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {code.code}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">
                      {getPropertyName(code.property_id)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          status === "active"
                            ? "default"
                            : status === "used"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {status === "active" && t.active}
                        {status === "used" && t.used}
                        {status === "expired" && t.expired}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {code.expires_at
                        ? format(new Date(code.expires_at), "d MMM yyyy", { locale: dateLocale })
                        : t.never}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(code.created_at), "d MMM yyyy, HH:mm", {
                        locale: dateLocale,
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyCode(code.code, code.id)}
                          title={t.copyCode}
                        >
                          {copiedId === code.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              {deletingId === code.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.deleteCode}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.deleteDescription}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteCode(code.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                {t.deleteCode}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default OwnerCodeManager;
