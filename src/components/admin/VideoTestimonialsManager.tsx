import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Play, Star, ExternalLink, GripVertical, Eye } from "lucide-react";
import VideoTestimonials from "@/components/VideoTestimonials";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface VideoTestimonial {
  id: string;
  name: string;
  role_ro: string;
  role_en: string;
  property_ro: string;
  property_en: string;
  location: string;
  quote_ro: string;
  quote_en: string;
  youtube_id: string;
  rating: number;
  months_as_client: number;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

const emptyForm: Omit<VideoTestimonial, "id" | "created_at"> = {
  name: "",
  role_ro: "",
  role_en: "",
  property_ro: "",
  property_en: "",
  location: "",
  quote_ro: "",
  quote_en: "",
  youtube_id: "",
  rating: 5,
  months_as_client: 12,
  display_order: 0,
  is_active: true,
};

interface SortableRowProps {
  testimonial: VideoTestimonial;
  index: number;
  onEdit: (testimonial: VideoTestimonial) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, is_active: boolean) => void;
}

const SortableRow = ({ testimonial, index, onEdit, onDelete, onToggleActive }: SortableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: testimonial.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? "bg-muted" : ""}>
      <TableCell className="font-medium">
        <div 
          className="flex items-center gap-1 text-muted-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
          {index + 1}
        </div>
      </TableCell>
      <TableCell>
        <div className="relative w-24 aspect-video rounded overflow-hidden">
          <img
            src={`https://img.youtube.com/vi/${testimonial.youtube_id}/mqdefault.jpg`}
            alt={testimonial.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="h-4 w-4 text-white" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{testimonial.name}</p>
          <p className="text-sm text-muted-foreground">{testimonial.role_ro}</p>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <p className="text-sm">{testimonial.property_ro}</p>
          <p className="text-xs text-muted-foreground">{testimonial.location}</p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star key={i} className="h-3 w-3 text-amber-500 fill-amber-500" />
          ))}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch
            checked={testimonial.is_active}
            onCheckedChange={(checked) => onToggleActive(testimonial.id, checked)}
          />
          <Badge variant={testimonial.is_active ? "default" : "secondary"}>
            {testimonial.is_active ? "Activ" : "Inactiv"}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(testimonial)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Șterge testimonialul?</AlertDialogTitle>
                <AlertDialogDescription>
                  Această acțiune nu poate fi anulată. Testimonialul video al lui{" "}
                  <strong>{testimonial.name}</strong> va fi șters permanent.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anulează</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(testimonial.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Șterge
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
};

const VideoTestimonialsManager = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["admin-video-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("video_testimonials")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      return data as VideoTestimonial[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: Omit<VideoTestimonial, "id" | "created_at">) => {
      const { error } = await supabase.from("video_testimonials").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-video-testimonials"] });
      toast.success("Testimonial video adăugat cu succes!");
      resetForm();
    },
    onError: (error) => {
      toast.error("Eroare la adăugare: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<VideoTestimonial> }) => {
      const { error } = await supabase
        .from("video_testimonials")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-video-testimonials"] });
      toast.success("Testimonial video actualizat!");
      resetForm();
    },
    onError: (error) => {
      toast.error("Eroare la actualizare: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("video_testimonials")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-video-testimonials"] });
      toast.success("Testimonial video șters!");
    },
    onError: (error) => {
      toast.error("Eroare la ștergere: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("video_testimonials")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-video-testimonials"] });
      toast.success("Status actualizat!");
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (updates: { id: string; display_order: number }[]) => {
      // Update each item's display_order
      for (const update of updates) {
        const { error } = await supabase
          .from("video_testimonials")
          .update({ display_order: update.display_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-video-testimonials"] });
      toast.success("Ordine actualizată!");
    },
    onError: (error) => {
      toast.error("Eroare la reordonare: " + error.message);
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && testimonials) {
      const oldIndex = testimonials.findIndex((t) => t.id === active.id);
      const newIndex = testimonials.findIndex((t) => t.id === over.id);

      const newOrder = arrayMove(testimonials, oldIndex, newIndex);
      
      // Create updates with new display_order values
      const updates = newOrder.map((item, index) => ({
        id: item.id,
        display_order: index,
      }));

      // Optimistically update the cache
      queryClient.setQueryData(["admin-video-testimonials"], newOrder);
      
      // Persist to database
      reorderMutation.mutate(updates);
    }
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (testimonial: VideoTestimonial) => {
    setFormData({
      name: testimonial.name,
      role_ro: testimonial.role_ro,
      role_en: testimonial.role_en,
      property_ro: testimonial.property_ro,
      property_en: testimonial.property_en,
      location: testimonial.location,
      quote_ro: testimonial.quote_ro,
      quote_en: testimonial.quote_en,
      youtube_id: testimonial.youtube_id,
      rating: testimonial.rating,
      months_as_client: testimonial.months_as_client,
      display_order: testimonial.display_order,
      is_active: testimonial.is_active,
    });
    setEditingId(testimonial.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.youtube_id || !formData.quote_ro) {
      toast.error("Completează câmpurile obligatorii!");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      // Set display_order to end of list for new items
      const newDisplayOrder = testimonials ? testimonials.length : 0;
      createMutation.mutate({ ...formData, display_order: newDisplayOrder });
    }
  };

  const extractYoutubeId = (url: string): string => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : url;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Play className="h-5 w-5" />
          Testimoniale Video
          <Badge variant="outline" className="ml-2 text-xs font-normal">
            Drag & drop pentru reordonare
          </Badge>
        </CardTitle>
        <div className="flex gap-2">
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
              <DialogHeader className="p-6 pb-0">
                <DialogTitle>Preview Testimoniale Video</DialogTitle>
              </DialogHeader>
              <div className="bg-background">
                <VideoTestimonials />
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()}>
                <Plus className="h-4 w-4 mr-2" />
                Adaugă Testimonial
              </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editează Testimonial Video" : "Adaugă Testimonial Video"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nume Proprietar *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Alexandru Marinescu"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="youtube_id">YouTube Video ID / URL *</Label>
                  <Input
                    id="youtube_id"
                    value={formData.youtube_id}
                    onChange={(e) => setFormData({ ...formData, youtube_id: extractYoutubeId(e.target.value) })}
                    placeholder="dQw4w9WgXcQ sau URL complet"
                    required
                  />
                </div>
              </div>

              {/* Role (bilingual) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role_ro">Rol (RO) *</Label>
                  <Input
                    id="role_ro"
                    value={formData.role_ro}
                    onChange={(e) => setFormData({ ...formData, role_ro: e.target.value })}
                    placeholder="Proprietar Apartament"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role_en">Rol (EN) *</Label>
                  <Input
                    id="role_en"
                    value={formData.role_en}
                    onChange={(e) => setFormData({ ...formData, role_en: e.target.value })}
                    placeholder="Apartment Owner"
                    required
                  />
                </div>
              </div>

              {/* Property (bilingual) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="property_ro">Proprietate (RO) *</Label>
                  <Input
                    id="property_ro"
                    value={formData.property_ro}
                    onChange={(e) => setFormData({ ...formData, property_ro: e.target.value })}
                    placeholder="Apartament 2 Camere Premium"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property_en">Proprietate (EN) *</Label>
                  <Input
                    id="property_en"
                    value={formData.property_en}
                    onChange={(e) => setFormData({ ...formData, property_en: e.target.value })}
                    placeholder="2 Bedroom Premium Apartment"
                    required
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Locație</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Complexul Isho, Timișoara"
                />
              </div>

              {/* Quote (bilingual) */}
              <div className="space-y-2">
                <Label htmlFor="quote_ro">Citat (RO) *</Label>
                <Textarea
                  id="quote_ro"
                  value={formData.quote_ro}
                  onChange={(e) => setFormData({ ...formData, quote_ro: e.target.value })}
                  placeholder="Experiența mea cu ApArt Hotel..."
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quote_en">Citat (EN) *</Label>
                <Textarea
                  id="quote_en"
                  value={formData.quote_en}
                  onChange={(e) => setFormData({ ...formData, quote_en: e.target.value })}
                  placeholder="My experience with ApArt Hotel..."
                  rows={3}
                  required
                />
              </div>

              {/* Numeric fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rating">Rating (1-5)</Label>
                  <Input
                    id="rating"
                    type="number"
                    min={1}
                    max={5}
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) || 5 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="months">Luni Parteneriat</Label>
                  <Input
                    id="months"
                    type="number"
                    min={1}
                    value={formData.months_as_client}
                    onChange={(e) => setFormData({ ...formData, months_as_client: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Activ (vizibil pe site)</Label>
              </div>

              {/* Preview thumbnail */}
              {formData.youtube_id && (
                <div className="space-y-2">
                  <Label>Previzualizare Thumbnail</Label>
                  <div className="relative aspect-video w-full max-w-sm rounded-lg overflow-hidden border">
                    <img
                      src={`https://img.youtube.com/vi/${formData.youtube_id}/mqdefault.jpg`}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <a
                      href={`https://www.youtube.com/watch?v=${formData.youtube_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Anulează
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Salvează Modificările" : "Adaugă Testimonial"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Se încarcă...</div>
        ) : !testimonials?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            Nu există testimoniale video. Adaugă primul testimonial!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Thumbnail</TableHead>
                    <TableHead>Proprietar</TableHead>
                    <TableHead>Proprietate</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acțiuni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext
                    items={testimonials.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {testimonials.map((testimonial, index) => (
                      <SortableRow
                        key={testimonial.id}
                        testimonial={testimonial}
                        index={index}
                        onEdit={handleEdit}
                        onDelete={(id) => deleteMutation.mutate(id)}
                        onToggleActive={(id, is_active) =>
                          toggleActiveMutation.mutate({ id, is_active })
                        }
                      />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VideoTestimonialsManager;
