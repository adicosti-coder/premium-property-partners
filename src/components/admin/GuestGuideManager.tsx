import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2, Copy, ExternalLink, CopyPlus } from "lucide-react";
import { format } from "date-fns";

interface GuestGuide {
  id: string;
  booking_id: string;
  property_name: string;
  check_in_date: string;
  check_out_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  wifi_name: string | null;
  wifi_password: string | null;
  pin_code: string | null;
  access_instructions: string | null;
  access_video_url: string | null;
  parking_instructions: string | null;
  parking_gps_lat: number | null;
  parking_gps_lng: number | null;
  whatsapp_number: string | null;
  property_image: string | null;
  additional_notes: string | null;
  created_at: string | null;
}

const emptyForm: Omit<GuestGuide, "id" | "created_at"> = {
  booking_id: "",
  property_name: "",
  check_in_date: "",
  check_out_date: "",
  check_in_time: "15:00",
  check_out_time: "11:00",
  wifi_name: "",
  wifi_password: "",
  pin_code: "",
  access_instructions: "",
  access_video_url: "",
  parking_instructions: "",
  parking_gps_lat: null,
  parking_gps_lng: null,
  whatsapp_number: "",
  property_image: "",
  additional_notes: "",
};

const GuestGuideManager = () => {
  const [guides, setGuides] = useState<GuestGuide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchGuides = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("guest_guides")
      .select("*")
      .order("check_in_date", { ascending: false });
    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
    } else {
      setGuides((data as GuestGuide[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchGuides(); }, []);

  const handleEdit = (guide: GuestGuide) => {
    setEditingId(guide.id);
    setForm({
      booking_id: guide.booking_id,
      property_name: guide.property_name,
      check_in_date: guide.check_in_date,
      check_out_date: guide.check_out_date,
      check_in_time: guide.check_in_time || "15:00",
      check_out_time: guide.check_out_time || "11:00",
      wifi_name: guide.wifi_name || "",
      wifi_password: guide.wifi_password || "",
      pin_code: guide.pin_code || "",
      access_instructions: guide.access_instructions || "",
      access_video_url: guide.access_video_url || "",
      parking_instructions: guide.parking_instructions || "",
      parking_gps_lat: guide.parking_gps_lat,
      parking_gps_lng: guide.parking_gps_lng,
      whatsapp_number: guide.whatsapp_number || "",
      property_image: guide.property_image || "",
      additional_notes: guide.additional_notes || "",
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const handleDuplicate = (guide: GuestGuide) => {
    setEditingId(null);
    setForm({
      booking_id: "",
      property_name: guide.property_name,
      check_in_date: "",
      check_out_date: "",
      check_in_time: guide.check_in_time || "15:00",
      check_out_time: guide.check_out_time || "11:00",
      wifi_name: guide.wifi_name || "",
      wifi_password: guide.wifi_password || "",
      pin_code: "",
      access_instructions: guide.access_instructions || "",
      access_video_url: guide.access_video_url || "",
      parking_instructions: guide.parking_instructions || "",
      parking_gps_lat: guide.parking_gps_lat,
      parking_gps_lng: guide.parking_gps_lng,
      whatsapp_number: guide.whatsapp_number || "",
      property_image: guide.property_image || "",
      additional_notes: guide.additional_notes || "",
    });
    setDialogOpen(true);
    toast({ title: "Ghid duplicat 📋", description: "Completează Booking ID, datele și codul keybox." });
  };

  const handleSave = async () => {
    if (!form.booking_id || !form.property_name || !form.check_in_date || !form.check_out_date) {
      toast({ title: "Completează câmpurile obligatorii", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      wifi_name: form.wifi_name || null,
      wifi_password: form.wifi_password || null,
      pin_code: form.pin_code || null,
      access_instructions: form.access_instructions || null,
      access_video_url: form.access_video_url || null,
      parking_instructions: form.parking_instructions || null,
      whatsapp_number: form.whatsapp_number || null,
      property_image: form.property_image || null,
      additional_notes: form.additional_notes || null,
    };

    if (editingId) {
      const { error } = await supabase.from("guest_guides").update(payload).eq("id", editingId);
      if (error) toast({ title: "Eroare", description: error.message, variant: "destructive" });
      else toast({ title: "Ghid actualizat ✅" });
    } else {
      const { error } = await supabase.from("guest_guides").insert(payload);
      if (error) toast({ title: "Eroare", description: error.message, variant: "destructive" });
      else toast({ title: "Ghid creat ✅" });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchGuides();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("guest_guides").delete().eq("id", id);
    if (error) toast({ title: "Eroare", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Ghid șters" });
      fetchGuides();
    }
  };

  const copyLink = (bookingId: string) => {
    const url = `${window.location.origin}/guide/${bookingId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiat! 📋" });
  };

  const renderFormField = (label: string, key: keyof typeof form, type = "text", required = false) => (
    <div className="space-y-1">
      <Label>{label}{required && " *"}</Label>
      <Input
        type={type}
        value={(form[key] as string | number) ?? ""}
        onChange={(e) => setForm({ ...form, [key]: type === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value })}
        required={required}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">🏨 Portal Oaspeți — Ghiduri</CardTitle>
        <Button onClick={handleNew} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Adaugă Ghid
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : guides.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Niciun ghid creat. Adaugă primul ghid pentru oaspeți.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proprietate</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Keybox</TableHead>
                  <TableHead>Link</TableHead>
                  <TableHead>Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guides.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="font-medium">{g.property_name}</TableCell>
                    <TableCell>{format(new Date(g.check_in_date), "dd.MM.yyyy")}</TableCell>
                    <TableCell>{format(new Date(g.check_out_date), "dd.MM.yyyy")}</TableCell>
                    <TableCell>{g.pin_code || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => copyLink(g.booking_id)}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/guide/${g.booking_id}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(g)} title="Duplică ghidul">
                          <CopyPlus className="w-3.5 h-3.5 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(g)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm"><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Ștergi ghidul?</AlertDialogTitle>
                              <AlertDialogDescription>Această acțiune nu poate fi anulată.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Anulează</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(g.id)}>Șterge</AlertDialogAction>
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editează Ghid" : "Ghid Nou"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderFormField("Booking ID", "booking_id", "text", true)}
              {renderFormField("Nume Proprietate", "property_name", "text", true)}
              {renderFormField("Check-in", "check_in_date", "date", true)}
              {renderFormField("Check-out", "check_out_date", "date", true)}
              {renderFormField("Ora Check-in", "check_in_time")}
              {renderFormField("Ora Check-out", "check_out_time")}
              {renderFormField("WiFi Rețea", "wifi_name")}
              {renderFormField("WiFi Parolă", "wifi_password")}
              {renderFormField("Cod Keybox", "pin_code")}
              {renderFormField("WhatsApp", "whatsapp_number")}
              {renderFormField("Video Acces URL", "access_video_url")}
              {renderFormField("Imagine Proprietate URL", "property_image")}
              {renderFormField("Locație Parcare (Google Maps URL)", "parking_instructions")}
            </div>
            <div className="space-y-1">
              <Label>Instrucțiuni Acces</Label>
              <Textarea value={form.access_instructions || ""} onChange={(e) => setForm({ ...form, access_instructions: e.target.value })} rows={3} />
            </div>
            <div className="space-y-1">
              <Label>Instrucțiuni Parcare</Label>
              <Textarea value={form.parking_instructions || ""} onChange={(e) => setForm({ ...form, parking_instructions: e.target.value })} rows={2} />
            </div>
            <div className="space-y-1">
              <Label>Note Adiționale</Label>
              <Textarea value={form.additional_notes || ""} onChange={(e) => setForm({ ...form, additional_notes: e.target.value })} rows={2} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingId ? "Salvează" : "Creează Ghid"}
            </Button>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default GuestGuideManager;
