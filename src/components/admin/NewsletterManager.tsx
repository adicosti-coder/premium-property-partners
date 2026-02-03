import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, Mail, Users, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";

interface Subscriber {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

const translations = {
  ro: {
    title: "Gestionare Abonați Newsletter",
    totalSubscribers: "Total Abonați",
    activeSubscribers: "Abonați Activi",
    search: "Caută după email...",
    email: "Email",
    status: "Status",
    subscribedAt: "Data Abonării",
    actions: "Acțiuni",
    active: "Activ",
    inactive: "Inactiv",
    noSubscribers: "Nu există abonați încă",
    noSubscribersDescription: "Abonații vor apărea aici după ce utilizatorii se înscriu la newsletter.",
    deleteSubscriber: "Șterge abonatul?",
    deleteDescription: "Această acțiune nu poate fi anulată.",
    cancel: "Anulează",
    delete: "Șterge",
    deleteSuccess: "Abonat șters cu succes!",
    deleteError: "Nu s-a putut șterge abonatul.",
    loadError: "Nu s-au putut încărca abonații.",
    toggleSuccess: "Status actualizat!",
    toggleError: "Nu s-a putut actualiza statusul.",
  },
  en: {
    title: "Newsletter Subscribers Management",
    totalSubscribers: "Total Subscribers",
    activeSubscribers: "Active Subscribers",
    search: "Search by email...",
    email: "Email",
    status: "Status",
    subscribedAt: "Subscribed At",
    actions: "Actions",
    active: "Active",
    inactive: "Inactive",
    noSubscribers: "No subscribers yet",
    noSubscribersDescription: "Subscribers will appear here after users sign up for the newsletter.",
    deleteSubscriber: "Delete subscriber?",
    deleteDescription: "This action cannot be undone.",
    cancel: "Cancel",
    delete: "Delete",
    deleteSuccess: "Subscriber deleted successfully!",
    deleteError: "Could not delete subscriber.",
    loadError: "Could not load subscribers.",
    toggleSuccess: "Status updated!",
    toggleError: "Could not update status.",
  },
};

const NewsletterManager = () => {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const dateLocale = language === "ro" ? ro : enUS;

  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("newsletter_subscribers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubscribers(data || []);
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast({
        title: t.loadError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setSubscribers(subscribers.filter((s) => s.id !== id));
      toast({ title: t.deleteSuccess });
    } catch (error) {
      console.error("Error deleting subscriber:", error);
      toast({
        title: t.deleteError,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleStatus = async (subscriber: Subscriber) => {
    setTogglingId(subscriber.id);
    try {
      const { error } = await supabase
        .from("newsletter_subscribers")
        .update({ is_active: !subscriber.is_active })
        .eq("id", subscriber.id);

      if (error) throw error;
      setSubscribers(
        subscribers.map((s) =>
          s.id === subscriber.id ? { ...s, is_active: !s.is_active } : s
        )
      );
      toast({ title: t.toggleSuccess });
    } catch (error) {
      console.error("Error toggling status:", error);
      toast({
        title: t.toggleError,
        variant: "destructive",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const filteredSubscribers = subscribers.filter((s) =>
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = subscribers.filter((s) => s.is_active).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-serif font-semibold text-foreground">
        {t.title}
      </h2>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-serif font-bold text-foreground">
                {subscribers.length}
              </p>
              <p className="text-sm text-muted-foreground">{t.totalSubscribers}</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-primary/10">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-serif font-bold text-foreground">
                {activeCount}
              </p>
              <p className="text-sm text-muted-foreground">{t.activeSubscribers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t.search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {filteredSubscribers.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">{t.noSubscribers}</p>
          <p className="text-sm text-muted-foreground">{t.noSubscribersDescription}</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>{t.email}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead>{t.subscribedAt}</TableHead>
                <TableHead className="text-right">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers.map((subscriber) => (
                <TableRow key={subscriber.id}>
                  <TableCell className="font-medium">{subscriber.email}</TableCell>
                  <TableCell>
                    <Badge variant={subscriber.is_active ? "default" : "secondary"}>
                      {subscriber.is_active ? t.active : t.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(subscriber.created_at), "PPp", {
                      locale: dateLocale,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleStatus(subscriber)}
                        disabled={togglingId === subscriber.id}
                      >
                        {togglingId === subscriber.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : subscriber.is_active ? (
                          <ToggleRight className="w-4 h-4 text-primary" />
                        ) : (
                          <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            {deletingId === subscriber.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.deleteSubscriber}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.deleteDescription}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(subscriber.id)}
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
    </div>
  );
};

export default NewsletterManager;
