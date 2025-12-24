import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
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
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { useLanguage } from "@/i18n/LanguageContext";
import { 
  Plus, 
  Trash2, 
  Edit, 
  Loader2, 
  CalendarDays,
  User,
  Home
} from "lucide-react";
import { properties } from "@/data/properties";

interface Booking {
  id: string;
  property_id: number;
  check_in: string;
  check_out: string;
  status: string;
  source: string | null;
  guest_name: string | null;
  created_at: string;
}

interface BookingFormData {
  property_id: number | null;
  check_in: string;
  check_out: string;
  status: string;
  source: string;
  guest_name: string;
}

const initialFormData: BookingFormData = {
  property_id: null,
  check_in: "",
  check_out: "",
  status: "confirmed",
  source: "direct",
  guest_name: "",
};

export default function BookingManager() {
  const { t, language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [formData, setFormData] = useState<BookingFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("check_in", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      toast({
        title: t.admin.error,
        description: t.admin.bookings?.loadError || "Could not load bookings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleAddBooking = async () => {
    if (!formData.property_id || !formData.check_in || !formData.check_out) {
      toast({
        title: t.admin.error,
        description: t.admin.bookings?.fillRequired || "Fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("bookings").insert({
        property_id: formData.property_id,
        check_in: formData.check_in,
        check_out: formData.check_out,
        status: formData.status,
        source: formData.source || null,
        guest_name: formData.guest_name || null,
      });

      if (error) throw error;

      toast({ title: t.admin.bookings?.addSuccess || "Booking added!" });
      setIsAddOpen(false);
      setFormData(initialFormData);
      fetchBookings();
    } catch (error) {
      console.error("Error adding booking:", error);
      toast({
        title: t.admin.error,
        description: t.admin.bookings?.addError || "Could not add booking",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditBooking = async () => {
    if (!editingBooking || !formData.property_id || !formData.check_in || !formData.check_out) {
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          property_id: formData.property_id,
          check_in: formData.check_in,
          check_out: formData.check_out,
          status: formData.status,
          source: formData.source || null,
          guest_name: formData.guest_name || null,
        })
        .eq("id", editingBooking.id);

      if (error) throw error;

      toast({ title: t.admin.bookings?.editSuccess || "Booking updated!" });
      setIsEditOpen(false);
      setEditingBooking(null);
      setFormData(initialFormData);
      fetchBookings();
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({
        title: t.admin.error,
        description: t.admin.bookings?.editError || "Could not update booking",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteBooking = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("bookings").delete().eq("id", id);
      if (error) throw error;

      setBookings(bookings.filter((b) => b.id !== id));
      toast({ title: t.admin.bookings?.deleteSuccess || "Booking deleted!" });
    } catch (error) {
      console.error("Error deleting booking:", error);
      toast({
        title: t.admin.error,
        description: t.admin.bookings?.deleteError || "Could not delete booking",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const openEditDialog = (booking: Booking) => {
    setEditingBooking(booking);
    setFormData({
      property_id: booking.property_id,
      check_in: booking.check_in,
      check_out: booking.check_out,
      status: booking.status,
      source: booking.source || "direct",
      guest_name: booking.guest_name || "",
    });
    setIsEditOpen(true);
  };

  const getPropertyName = (propertyId: number) => {
    const property = properties.find((p) => p.id === propertyId);
    return property?.name || `Property #${propertyId}`;
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      confirmed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || statusColors.pending}`}>
        {t.admin.bookings?.statuses?.[status as keyof typeof t.admin.bookings.statuses] || status}
      </span>
    );
  };

  const BookingFormFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t.admin.bookings?.property || "Property"} *</Label>
        <Select
          value={formData.property_id?.toString() || ""}
          onValueChange={(value) => setFormData({ ...formData, property_id: parseInt(value) })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t.admin.bookings?.selectProperty || "Select property"} />
          </SelectTrigger>
          <SelectContent>
            {properties.map((property) => (
              <SelectItem key={property.id} value={property.id.toString()}>
                {property.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.admin.bookings?.checkIn || "Check-in"} *</Label>
          <Input
            type="date"
            value={formData.check_in}
            onChange={(e) => setFormData({ ...formData, check_in: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>{t.admin.bookings?.checkOut || "Check-out"} *</Label>
          <Input
            type="date"
            value={formData.check_out}
            onChange={(e) => setFormData({ ...formData, check_out: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.admin.bookings?.guestName || "Guest Name"}</Label>
        <Input
          value={formData.guest_name}
          onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
          placeholder={t.admin.bookings?.guestNamePlaceholder || "John Doe"}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.admin.bookings?.status || "Status"}</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">{t.admin.bookings?.statuses?.confirmed || "Confirmed"}</SelectItem>
              <SelectItem value="pending">{t.admin.bookings?.statuses?.pending || "Pending"}</SelectItem>
              <SelectItem value="cancelled">{t.admin.bookings?.statuses?.cancelled || "Cancelled"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t.admin.bookings?.source || "Source"}</Label>
          <Select
            value={formData.source}
            onValueChange={(value) => setFormData({ ...formData, source: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="direct">{t.admin.bookings?.sources?.direct || "Direct"}</SelectItem>
              <SelectItem value="booking">{t.admin.bookings?.sources?.booking || "Booking.com"}</SelectItem>
              <SelectItem value="airbnb">{t.admin.bookings?.sources?.airbnb || "Airbnb"}</SelectItem>
              <SelectItem value="other">{t.admin.bookings?.sources?.other || "Other"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CalendarDays className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            {t.admin.bookings?.title || "Bookings Management"}
          </h2>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t.admin.bookings?.addBooking || "Add Booking"}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t.admin.bookings?.addBooking || "Add Booking"}</DialogTitle>
              <DialogDescription>
                {t.admin.bookings?.addDescription || "Add a new booking for a property"}
              </DialogDescription>
            </DialogHeader>
            <BookingFormFields />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                {t.admin.cancel}
              </Button>
              <Button onClick={handleAddBooking} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t.admin.bookings?.save || "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CalendarDays className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">{bookings.length}</p>
              <p className="text-sm text-muted-foreground">{t.admin.bookings?.totalBookings || "Total Bookings"}</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CalendarDays className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">
                {bookings.filter((b) => b.status === "confirmed").length}
              </p>
              <p className="text-sm text-muted-foreground">{t.admin.bookings?.statuses?.confirmed || "Confirmed"}</p>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <CalendarDays className="w-4 h-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">
                {bookings.filter((b) => b.status === "pending").length}
              </p>
              <p className="text-sm text-muted-foreground">{t.admin.bookings?.statuses?.pending || "Pending"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CalendarDays className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {t.admin.bookings?.noBookings || "No bookings yet"}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t.admin.bookings?.noBookingsDescription || "Add your first booking to get started"}
            </p>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t.admin.bookings?.addBooking || "Add Booking"}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Home className="w-4 h-4 inline mr-1" />{t.admin.bookings?.property || "Property"}</TableHead>
                <TableHead><User className="w-4 h-4 inline mr-1" />{t.admin.bookings?.guestName || "Guest"}</TableHead>
                <TableHead>{t.admin.bookings?.checkIn || "Check-in"}</TableHead>
                <TableHead>{t.admin.bookings?.checkOut || "Check-out"}</TableHead>
                <TableHead>{t.admin.bookings?.status || "Status"}</TableHead>
                <TableHead>{t.admin.bookings?.source || "Source"}</TableHead>
                <TableHead className="w-[100px]">{t.admin.tableHeaders.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">
                    {getPropertyName(booking.property_id)}
                  </TableCell>
                  <TableCell>{booking.guest_name || "-"}</TableCell>
                  <TableCell>
                    {format(new Date(booking.check_in), "d MMM yyyy", { locale: dateLocale })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(booking.check_out), "d MMM yyyy", { locale: dateLocale })}
                  </TableCell>
                  <TableCell>{getStatusBadge(booking.status)}</TableCell>
                  <TableCell className="capitalize">
                    {t.admin.bookings?.sources?.[booking.source as keyof typeof t.admin.bookings.sources] || booking.source || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(booking)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            {deletingId === booking.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.admin.bookings?.deleteBooking || "Delete booking?"}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t.admin.bookings?.deleteDescription || "This action cannot be undone."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.admin.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteBooking(booking.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              {t.admin.delete}
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
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t.admin.bookings?.editBooking || "Edit Booking"}</DialogTitle>
            <DialogDescription>
              {t.admin.bookings?.editDescription || "Update the booking details"}
            </DialogDescription>
          </DialogHeader>
          <BookingFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              {t.admin.cancel}
            </Button>
            <Button onClick={handleEditBooking} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t.admin.bookings?.save || "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
