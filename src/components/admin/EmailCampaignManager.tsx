import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import DOMPurify from "dompurify";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Send,
  Mail,
  Users,
  Eye,
  MousePointerClick,
  Trash2,
  Edit,
  BarChart3,
  Megaphone,
} from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  campaign_type: string;
  status: string;
  total_recipients: number;
  sent_count: number;
  open_count: number;
  click_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
}

const translations = {
  ro: {
    title: "Campanii Email Marketing",
    newCampaign: "Campanie Nouă",
    name: "Nume Campanie",
    subject: "Subiect Email",
    content: "Conținut (HTML)",
    type: "Tip Campanie",
    promotional: "Promoțional",
    newsletter: "Newsletter",
    welcome: "Bun Venit",
    status: "Status",
    draft: "Ciornă",
    scheduled: "Programat",
    sending: "Se trimite",
    sent: "Trimis",
    cancelled: "Anulat",
    recipients: "Destinatari",
    opens: "Deschideri",
    clicks: "Click-uri",
    actions: "Acțiuni",
    create: "Creează",
    update: "Actualizează",
    cancel: "Anulează",
    send: "Trimite Acum",
    delete: "Șterge",
    confirmSend: "Confirmi trimiterea?",
    confirmSendDesc: "Campania va fi trimisă tuturor abonaților activi.",
    confirmDelete: "Ștergi campania?",
    confirmDeleteDesc: "Această acțiune nu poate fi anulată.",
    createSuccess: "Campanie creată cu succes!",
    updateSuccess: "Campanie actualizată!",
    sendSuccess: "Campanie trimisă cu succes!",
    sendError: "Eroare la trimiterea campaniei.",
    deleteSuccess: "Campanie ștearsă!",
    noCampaigns: "Nu există campanii",
    noCampaignsDesc: "Creează prima ta campanie de email marketing.",
    totalSent: "Total Trimise",
    avgOpenRate: "Rată Deschidere",
    preview: "Previzualizare",
    stats: "Statistici",
  },
  en: {
    title: "Email Marketing Campaigns",
    newCampaign: "New Campaign",
    name: "Campaign Name",
    subject: "Email Subject",
    content: "Content (HTML)",
    type: "Campaign Type",
    promotional: "Promotional",
    newsletter: "Newsletter",
    welcome: "Welcome",
    status: "Status",
    draft: "Draft",
    scheduled: "Scheduled",
    sending: "Sending",
    sent: "Sent",
    cancelled: "Cancelled",
    recipients: "Recipients",
    opens: "Opens",
    clicks: "Clicks",
    actions: "Actions",
    create: "Create",
    update: "Update",
    cancel: "Cancel",
    send: "Send Now",
    delete: "Delete",
    confirmSend: "Confirm sending?",
    confirmSendDesc: "The campaign will be sent to all active subscribers.",
    confirmDelete: "Delete campaign?",
    confirmDeleteDesc: "This action cannot be undone.",
    createSuccess: "Campaign created successfully!",
    updateSuccess: "Campaign updated!",
    sendSuccess: "Campaign sent successfully!",
    sendError: "Error sending campaign.",
    deleteSuccess: "Campaign deleted!",
    noCampaigns: "No campaigns yet",
    noCampaignsDesc: "Create your first email marketing campaign.",
    totalSent: "Total Sent",
    avgOpenRate: "Open Rate",
    preview: "Preview",
    stats: "Statistics",
  },
};

const EmailCampaignManager = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const dateLocale = language === "ro" ? ro : enUS;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    campaign_type: "promotional",
  });

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("email_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCampaigns((data as Campaign[]) || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast({ title: "Error loading campaigns", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.subject || !formData.content) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    try {
      if (editingCampaign) {
        const { error } = await supabase
          .from("email_campaigns")
          .update({
            name: formData.name,
            subject: formData.subject,
            content: formData.content,
            campaign_type: formData.campaign_type,
          })
          .eq("id", editingCampaign.id);

        if (error) throw error;
        toast({ title: t.updateSuccess });
      } else {
        const { error } = await supabase.from("email_campaigns").insert({
          name: formData.name,
          subject: formData.subject,
          content: formData.content,
          campaign_type: formData.campaign_type,
        });

        if (error) throw error;
        toast({ title: t.createSuccess });
      }

      setIsDialogOpen(false);
      setEditingCampaign(null);
      setFormData({ name: "", subject: "", content: "", campaign_type: "promotional" });
      fetchCampaigns();
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast({ title: "Error saving campaign", variant: "destructive" });
    }
  };

  const handleSend = async (campaignId: string) => {
    setIsSending(campaignId);
    try {
      const { error } = await supabase.functions.invoke("send-campaign-email", {
        body: { campaignId },
      });

      if (error) throw error;
      toast({ title: t.sendSuccess });
      fetchCampaigns();
    } catch (error) {
      console.error("Error sending campaign:", error);
      toast({ title: t.sendError, variant: "destructive" });
    } finally {
      setIsSending(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("email_campaigns").delete().eq("id", id);
      if (error) throw error;
      toast({ title: t.deleteSuccess });
      fetchCampaigns();
    } catch (error) {
      console.error("Error deleting campaign:", error);
      toast({ title: "Error deleting campaign", variant: "destructive" });
    }
  };

  const openEditDialog = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setFormData({
      name: campaign.name,
      subject: campaign.subject,
      content: campaign.content,
      campaign_type: campaign.campaign_type,
    });
    setIsDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      scheduled: "outline",
      sending: "default",
      sent: "default",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      draft: t.draft,
      scheduled: t.scheduled,
      sending: t.sending,
      sent: t.sent,
      cancelled: t.cancelled,
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalOpens = campaigns.reduce((acc, c) => acc + (c.open_count || 0), 0);
  const avgOpenRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : "0";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-semibold text-foreground">{t.title}</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingCampaign(null);
                setFormData({ name: "", subject: "", content: "", campaign_type: "promotional" });
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.newCampaign}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCampaign ? t.update : t.newCampaign}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">{t.name}</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Promoție de Vară 2026"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t.subject}</label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="🌴 Ofertă Specială de Vară - 20% Reducere!"
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t.type}</label>
                <Select
                  value={formData.campaign_type}
                  onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">{t.promotional}</SelectItem>
                    <SelectItem value="newsletter">{t.newsletter}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">{t.content}</label>
                <Textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="<h2>Ofertă Specială!</h2><p>Rezervă acum și beneficiezi de...</p>"
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t.cancel}
                </Button>
                <Button onClick={handleSubmit}>
                  {editingCampaign ? t.update : t.create}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-serif font-bold text-foreground">
                {campaigns.length}
              </p>
              <p className="text-sm text-muted-foreground">Campanii Totale</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-serif font-bold text-foreground">{totalSent}</p>
              <p className="text-sm text-muted-foreground">{t.totalSent}</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Eye className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-serif font-bold text-foreground">{avgOpenRate}%</p>
              <p className="text-sm text-muted-foreground">{t.avgOpenRate}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      {campaigns.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Megaphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">{t.noCampaigns}</p>
          <p className="text-sm text-muted-foreground">{t.noCampaignsDesc}</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t.name}</TableHead>
                <TableHead>{t.type}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead className="text-center">{t.recipients}</TableHead>
                <TableHead className="text-center">{t.opens}</TableHead>
                <TableHead className="text-right">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">{campaign.subject}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {campaign.campaign_type === "promotional"
                        ? t.promotional
                        : campaign.campaign_type === "newsletter"
                        ? t.newsletter
                        : t.welcome}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{campaign.sent_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Eye className="w-4 h-4 text-muted-foreground" />
                      <span>{campaign.open_count || 0}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreviewCampaign(campaign)}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      {campaign.status === "draft" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(campaign)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isSending === campaign.id}
                              >
                                {isSending === campaign.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4 text-primary" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t.confirmSend}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t.confirmSendDesc}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleSend(campaign.id)}>
                                  {t.send}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.confirmDeleteDesc}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(campaign.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Preview/Stats Dialog */}
      <Dialog open={!!previewCampaign} onOpenChange={() => setPreviewCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewCampaign?.name} - {t.stats}</DialogTitle>
          </DialogHeader>
          {previewCampaign && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">{previewCampaign.sent_count || 0}</p>
                  <p className="text-sm text-muted-foreground">{t.recipients}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">{previewCampaign.open_count || 0}</p>
                  <p className="text-sm text-muted-foreground">{t.opens}</p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg text-center">
                  <p className="text-2xl font-bold">{previewCampaign.click_count || 0}</p>
                  <p className="text-sm text-muted-foreground">{t.clicks}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">{t.subject}:</p>
                <p className="text-muted-foreground">{previewCampaign.subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">{t.preview}:</p>
                <div
                  className="bg-muted/30 p-4 rounded-lg prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(previewCampaign.content, {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'span', 'div', 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
                      ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'style', 'class', 'width', 'height']
                    })
                  }}
                />
              </div>
              {previewCampaign.sent_at && (
                <p className="text-sm text-muted-foreground">
                  Trimis: {format(new Date(previewCampaign.sent_at), "PPp", { locale: dateLocale })}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailCampaignManager;
