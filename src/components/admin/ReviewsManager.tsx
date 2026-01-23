import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
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
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Star, 
  MessageSquare, 
  Check, 
  X, 
  Pencil, 
  Trash2, 
  Eye, 
  EyeOff,
  Loader2,
  Search,
  Filter,
  Reply,
  MessageCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { supabase as supabaseClient } from "@/integrations/supabase/client";

interface Review {
  id: string;
  property_id: string;
  guest_name: string;
  guest_email: string | null;
  rating: number;
  title: string | null;
  content: string | null;
  is_published: boolean;
  created_at: string;
  admin_reply: string | null;
  admin_reply_at: string | null;
  admin_reply_by: string | null;
  property?: {
    name: string;
  };
}

interface Property {
  id: string;
  name: string;
}

const ReviewsManager = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dateLocale = language === "ro" ? ro : enUS;

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "published" | "pending">("all");
  const [filterProperty, setFilterProperty] = useState<string>("all");
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [replyingReview, setReplyingReview] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editForm, setEditForm] = useState({
    guest_name: "",
    rating: 5,
    title: "",
    content: "",
  });

  const translations = {
    ro: {
      title: "Gestionare Recenzii",
      subtitle: "Aprobă, editează și gestionează recenziile oaspeților",
      search: "Caută după nume sau conținut...",
      filterAll: "Toate",
      filterPublished: "Publicate",
      filterPending: "În așteptare",
      allProperties: "Toate proprietățile",
      guest: "Oaspete",
      property: "Proprietate",
      rating: "Rating",
      review: "Recenzie",
      status: "Status",
      date: "Data",
      actions: "Acțiuni",
      published: "Publicat",
      pending: "În așteptare",
      publish: "Publică",
      unpublish: "Ascunde",
      edit: "Editează",
      delete: "Șterge",
      reply: "Răspunde",
      noReviews: "Nu există recenzii",
      noReviewsDesc: "Încă nu au fost primite recenzii de la oaspeți.",
      editTitle: "Editează Recenzie",
      guestName: "Nume oaspete",
      reviewTitle: "Titlu recenzie",
      reviewContent: "Conținut recenzie",
      cancel: "Anulează",
      save: "Salvează",
      deleteTitle: "Șterge Recenzie",
      deleteDesc: "Ești sigur că vrei să ștergi această recenzie? Acțiunea nu poate fi anulată.",
      confirmDelete: "Șterge",
      successPublish: "Recenzie publicată cu succes",
      successUnpublish: "Recenzie ascunsă cu succes",
      successEdit: "Recenzie actualizată cu succes",
      successDelete: "Recenzie ștearsă cu succes",
      successReply: "Răspuns salvat cu succes",
      successReplyDelete: "Răspuns șters cu succes",
      error: "A apărut o eroare",
      totalReviews: "Total recenzii",
      publishedReviews: "Publicate",
      pendingReviews: "În așteptare",
      avgRating: "Rating mediu",
      replyTitle: "Răspunde la Recenzie",
      replyPlaceholder: "Scrie răspunsul tău aici...",
      yourReply: "Răspunsul tău",
      editReply: "Editează răspunsul",
      deleteReply: "Șterge răspunsul",
      hasReply: "Răspuns",
      repliedOn: "Răspuns pe",
    },
    en: {
      title: "Reviews Management",
      subtitle: "Approve, edit and manage guest reviews",
      search: "Search by name or content...",
      filterAll: "All",
      filterPublished: "Published",
      filterPending: "Pending",
      allProperties: "All properties",
      guest: "Guest",
      property: "Property",
      rating: "Rating",
      review: "Review",
      status: "Status",
      date: "Date",
      actions: "Actions",
      published: "Published",
      pending: "Pending",
      publish: "Publish",
      unpublish: "Hide",
      edit: "Edit",
      delete: "Delete",
      reply: "Reply",
      noReviews: "No reviews",
      noReviewsDesc: "No guest reviews have been received yet.",
      editTitle: "Edit Review",
      guestName: "Guest name",
      reviewTitle: "Review title",
      reviewContent: "Review content",
      cancel: "Cancel",
      save: "Save",
      deleteTitle: "Delete Review",
      deleteDesc: "Are you sure you want to delete this review? This action cannot be undone.",
      confirmDelete: "Delete",
      successPublish: "Review published successfully",
      successUnpublish: "Review hidden successfully",
      successEdit: "Review updated successfully",
      successDelete: "Review deleted successfully",
      successReply: "Reply saved successfully",
      successReplyDelete: "Reply deleted successfully",
      error: "An error occurred",
      totalReviews: "Total reviews",
      publishedReviews: "Published",
      pendingReviews: "Pending",
      avgRating: "Average rating",
      replyTitle: "Reply to Review",
      replyPlaceholder: "Write your reply here...",
      yourReply: "Your reply",
      editReply: "Edit reply",
      deleteReply: "Delete reply",
      hasReply: "Replied",
      repliedOn: "Replied on",
    },
  };

  const t = translations[language] || translations.ro;

  // Fetch properties for filter
  const { data: properties } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data as Property[];
    },
  });

  // Fetch reviews
  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_reviews")
        .select(`
          *,
          property:properties(name)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Review[];
    },
  });

  // Toggle publish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      const { error } = await supabase
        .from("property_reviews")
        .update({ is_published: isPublished })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, { isPublished }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast({
        title: isPublished ? t.successPublish : t.successUnpublish,
      });
    },
    onError: () => {
      toast({ title: t.error, variant: "destructive" });
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async (data: { id: string; guest_name: string; rating: number; title: string; content: string }) => {
      const { error } = await supabase
        .from("property_reviews")
        .update({
          guest_name: data.guest_name,
          rating: data.rating,
          title: data.title || null,
          content: data.content || null,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setEditingReview(null);
      toast({ title: t.successEdit });
    },
    onError: () => {
      toast({ title: t.error, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("property_reviews")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setDeletingReviewId(null);
      toast({ title: t.successDelete });
    },
    onError: () => {
      toast({ title: t.error, variant: "destructive" });
    },
  });

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async ({ id, reply, review }: { id: string; reply: string | null; review: Review }) => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      const { error } = await supabase
        .from("property_reviews")
        .update({
          admin_reply: reply,
          admin_reply_at: reply ? new Date().toISOString() : null,
          admin_reply_by: reply ? user?.id : null,
        })
        .eq("id", id);
      if (error) throw error;

      // Send email notification to guest if they have an email and this is a new/updated reply
      if (reply && review.guest_email) {
        try {
          await supabase.functions.invoke("send-review-reply-notification", {
            body: {
              guestEmail: review.guest_email,
              guestName: review.guest_name,
              propertyName: review.property?.name || "proprietatea noastră",
              reviewTitle: review.title,
              reviewContent: review.content,
              adminReply: reply,
              rating: review.rating,
            },
          });
          console.log("Reply notification email sent successfully");
        } catch (emailError) {
          console.error("Failed to send reply notification email:", emailError);
          // Don't throw - the reply was saved, email is secondary
        }
      }
    },
    onSuccess: (_, { reply }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setReplyingReview(null);
      setReplyText("");
      toast({ title: reply ? t.successReply : t.successReplyDelete });
    },
    onError: () => {
      toast({ title: t.error, variant: "destructive" });
    },
  });

  // Filter reviews
  const filteredReviews = reviews?.filter((review) => {
    const matchesSearch =
      review.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "published" && review.is_published) ||
      (filterStatus === "pending" && !review.is_published);

    const matchesProperty =
      filterProperty === "all" || review.property_id === filterProperty;

    return matchesSearch && matchesStatus && matchesProperty;
  });

  // Stats
  const stats = {
    total: reviews?.length || 0,
    published: reviews?.filter((r) => r.is_published).length || 0,
    pending: reviews?.filter((r) => !r.is_published).length || 0,
    avgRating: reviews && reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : "0",
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );

  const handleEditClick = (review: Review) => {
    setEditingReview(review);
    setEditForm({
      guest_name: review.guest_name,
      rating: review.rating,
      title: review.title || "",
      content: review.content || "",
    });
  };

  const handleEditSave = () => {
    if (!editingReview) return;
    editMutation.mutate({
      id: editingReview.id,
      ...editForm,
    });
  };

  const handleReplyClick = (review: Review) => {
    setReplyingReview(review);
    setReplyText(review.admin_reply || "");
  };

  const handleReplySave = () => {
    if (!replyingReview) return;
    replyMutation.mutate({
      id: replyingReview.id,
      reply: replyText.trim() || null,
      review: replyingReview,
    });
  };

  const handleReplyDelete = () => {
    if (!replyingReview) return;
    replyMutation.mutate({
      id: replyingReview.id,
      reply: null,
      review: replyingReview,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          {t.title}
        </h2>
        <p className="text-muted-foreground mt-1">{t.subtitle}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.totalReviews}</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.publishedReviews}</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.pendingReviews}</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t.avgRating}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{stats.avgRating}</p>
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.filterAll}</SelectItem>
            <SelectItem value="published">{t.filterPublished}</SelectItem>
            <SelectItem value="pending">{t.filterPending}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterProperty} onValueChange={setFilterProperty}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allProperties}</SelectItem>
            {properties?.map((prop) => (
              <SelectItem key={prop.id} value={prop.id}>
                {prop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reviews Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !filteredReviews || filteredReviews.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="font-medium text-foreground">{t.noReviews}</p>
            <p className="text-sm text-muted-foreground">{t.noReviewsDesc}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.guest}</TableHead>
                  <TableHead>{t.property}</TableHead>
                  <TableHead>{t.rating}</TableHead>
                  <TableHead className="max-w-xs">{t.review}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.date}</TableHead>
                  <TableHead className="text-right">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{review.guest_name}</p>
                        {review.guest_email && (
                          <p className="text-xs text-muted-foreground">{review.guest_email}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {review.property?.name || "-"}
                    </TableCell>
                    <TableCell>{renderStars(review.rating)}</TableCell>
                    <TableCell className="max-w-xs">
                      {review.title && (
                        <p className="font-medium text-sm truncate">{review.title}</p>
                      )}
                      <p className="text-sm text-muted-foreground truncate">
                        {review.content || "-"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={review.is_published ? "default" : "secondary"}
                          className={review.is_published ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 w-fit" : "w-fit"}
                        >
                          {review.is_published ? t.published : t.pending}
                        </Badge>
                        {review.admin_reply && (
                          <Badge variant="outline" className="text-primary border-primary/30 w-fit">
                            <MessageCircle className="w-3 h-3 mr-1" />
                            {t.hasReply}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(parseISO(review.created_at), "d MMM yyyy", { locale: dateLocale })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => togglePublishMutation.mutate({ id: review.id, isPublished: !review.is_published })}
                          title={review.is_published ? t.unpublish : t.publish}
                        >
                          {review.is_published ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-emerald-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleReplyClick(review)}
                          title={t.reply}
                        >
                          <Reply className={`w-4 h-4 ${review.admin_reply ? "text-primary" : "text-muted-foreground"}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(review)}
                          title={t.edit}
                        >
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingReviewId(review.id)}
                          title={t.delete}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.editTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.guestName}</Label>
              <Input
                value={editForm.guest_name}
                onChange={(e) => setEditForm({ ...editForm, guest_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.rating}</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setEditForm({ ...editForm, rating: star })}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= editForm.rating
                          ? "text-amber-500 fill-amber-500"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.reviewTitle}</Label>
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.reviewContent}</Label>
              <Textarea
                value={editForm.content}
                onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReview(null)}>
              {t.cancel}
            </Button>
            <Button onClick={handleEditSave} disabled={editMutation.isPending}>
              {editMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingReviewId} onOpenChange={() => setDeletingReviewId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingReviewId && deleteMutation.mutate(deletingReviewId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reply Dialog */}
      <Dialog open={!!replyingReview} onOpenChange={() => setReplyingReview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="w-5 h-5 text-primary" />
              {t.replyTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Original Review Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{replyingReview?.guest_name}</p>
                {replyingReview && renderStars(replyingReview.rating)}
              </div>
              {replyingReview?.title && (
                <p className="text-sm font-medium">{replyingReview.title}</p>
              )}
              <p className="text-sm text-muted-foreground">{replyingReview?.content}</p>
              {replyingReview?.created_at && (
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(replyingReview.created_at), "d MMM yyyy", { locale: dateLocale })}
                </p>
              )}
            </div>

            {/* Reply Form */}
            <div className="space-y-2">
              <Label>{t.yourReply}</Label>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t.replyPlaceholder}
                rows={4}
              />
              {replyingReview?.admin_reply_at && (
                <p className="text-xs text-muted-foreground">
                  {t.repliedOn} {format(parseISO(replyingReview.admin_reply_at), "d MMM yyyy HH:mm", { locale: dateLocale })}
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {replyingReview?.admin_reply && (
              <Button
                variant="outline"
                onClick={handleReplyDelete}
                disabled={replyMutation.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t.deleteReply}
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setReplyingReview(null)}>
              {t.cancel}
            </Button>
            <Button onClick={handleReplySave} disabled={replyMutation.isPending || !replyText.trim()}>
              {replyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewsManager;
