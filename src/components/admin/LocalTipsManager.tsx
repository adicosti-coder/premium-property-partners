import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useLanguage } from '@/i18n/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  GripVertical,
  Lightbulb,
  Upload,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LocalTip {
  id: string;
  tip_ro: string;
  tip_en: string;
  display_order: number;
  is_active: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

interface FormData {
  tip_ro: string;
  tip_en: string;
  is_active: boolean;
  image_url: string | null;
}

const defaultFormData: FormData = {
  tip_ro: '',
  tip_en: '',
  is_active: true,
  image_url: null,
};

interface SortableRowProps {
  tip: LocalTip;
  onEdit: (tip: LocalTip) => void;
  onDelete: (id: string) => void;
  onToggleActive: (tip: LocalTip) => void;
}

const SortableRow: React.FC<SortableRowProps> = ({ tip, onEdit, onDelete, onToggleActive }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tip.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab hover:text-primary"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </TableCell>
      <TableCell className="w-16">
        {tip.image_url ? (
          <img 
            src={tip.image_url} 
            alt="" 
            className="w-12 h-12 object-cover rounded-lg"
          />
        ) : (
          <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell className="max-w-xs">
        <p className="truncate">{tip.tip_ro}</p>
      </TableCell>
      <TableCell className="max-w-xs">
        <p className="truncate">{tip.tip_en}</p>
      </TableCell>
      <TableCell>
        <Badge variant={tip.is_active ? "default" : "secondary"}>
          {tip.is_active ? "Activ" : "Inactiv"}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => onEdit(tip)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => onToggleActive(tip)}
          >
            <Switch checked={tip.is_active} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Șterge sfatul</AlertDialogTitle>
                <AlertDialogDescription>
                  Ești sigur că vrei să ștergi acest sfat? Această acțiune nu poate fi anulată.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Anulează</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(tip.id)}>
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

const LocalTipsManager: React.FC = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTip, setEditingTip] = useState<LocalTip | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch tips
  const { data: tips = [], isLoading } = useQuery({
    queryKey: ['admin-local-tips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('local_tips')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as LocalTip[];
    },
  });

  // Upload image
  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `tip-${Date.now()}.${fileExt}`;
      const filePath = `local-tips/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast({ title: 'Imagine încărcată cu succes!' });
    } catch (error: any) {
      toast({ 
        title: 'Eroare la încărcare', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const maxOrder = tips.length > 0 
        ? Math.max(...tips.map(t => t.display_order)) 
        : 0;
      
      const { error } = await supabase.from('local_tips').insert({
        tip_ro: data.tip_ro,
        tip_en: data.tip_en,
        is_active: data.is_active,
        image_url: data.image_url,
        display_order: maxOrder + 1,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-local-tips'] });
      queryClient.invalidateQueries({ queryKey: ['local-tips'] });
      toast({ title: 'Sfat adăugat cu succes!' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Eroare', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormData> }) => {
      const { error } = await supabase
        .from('local_tips')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-local-tips'] });
      queryClient.invalidateQueries({ queryKey: ['local-tips'] });
      toast({ title: 'Sfat actualizat cu succes!' });
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Eroare', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('local_tips')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-local-tips'] });
      queryClient.invalidateQueries({ queryKey: ['local-tips'] });
      toast({ title: 'Sfat șters cu succes!' });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Eroare', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (reorderedTips: LocalTip[]) => {
      const updates = reorderedTips.map((tip, index) => ({
        id: tip.id,
        display_order: index + 1,
      }));
      
      for (const update of updates) {
        const { error } = await supabase
          .from('local_tips')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-local-tips'] });
      queryClient.invalidateQueries({ queryKey: ['local-tips'] });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Eroare la reordonare', 
        description: error.message,
        variant: 'destructive' 
      });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTip(null);
    setFormData(defaultFormData);
  };

  const handleEdit = (tip: LocalTip) => {
    setEditingTip(tip);
    setFormData({
      tip_ro: tip.tip_ro,
      tip_en: tip.tip_en,
      is_active: tip.is_active,
      image_url: tip.image_url,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tip_ro.trim() || !formData.tip_en.trim()) {
      toast({ 
        title: 'Eroare', 
        description: 'Completează ambele versiuni ale sfatului',
        variant: 'destructive' 
      });
      return;
    }

    if (editingTip) {
      updateMutation.mutate({ id: editingTip.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleToggleActive = (tip: LocalTip) => {
    updateMutation.mutate({ 
      id: tip.id, 
      data: { is_active: !tip.is_active } 
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = tips.findIndex(t => t.id === active.id);
      const newIndex = tips.findIndex(t => t.id === over.id);
      
      const reordered = arrayMove(tips, oldIndex, newIndex);
      reorderMutation.mutate(reordered);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold">Sfaturi Locale</h2>
          <Badge variant="outline">{tips.length} sfaturi</Badge>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingTip(null);
              setFormData(defaultFormData);
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Adaugă Sfat
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingTip ? 'Editează Sfat' : 'Adaugă Sfat Nou'}
              </DialogTitle>
              <DialogDescription>
                Completează sfatul în ambele limbi (română și engleză).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Imagine (opțional)</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                {formData.image_url ? (
                  <div className="relative inline-block">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 w-6 h-6"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: null }))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full h-24 border-dashed"
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Upload className="w-5 h-5 mr-2" />
                    )}
                    {isUploading ? 'Se încarcă...' : 'Încarcă imagine'}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tip_ro">Sfat (Română) *</Label>
                <Textarea
                  id="tip_ro"
                  value={formData.tip_ro}
                  onChange={(e) => setFormData({ ...formData, tip_ro: e.target.value })}
                  placeholder="Ex: Vizitează Piața Victoriei seara..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tip_en">Sfat (Engleză) *</Label>
                <Textarea
                  id="tip_en"
                  value={formData.tip_en}
                  onChange={(e) => setFormData({ ...formData, tip_en: e.target.value })}
                  placeholder="Ex: Visit Victory Square at night..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Activ</Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Anulează
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingTip ? 'Salvează' : 'Adaugă'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tips Table */}
      {tips.length === 0 ? (
        <div className="text-center py-12 bg-muted/20 rounded-lg border border-dashed">
          <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Nu există sfaturi locale</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adaugă primul sfat
          </Button>
        </div>
      ) : (
        <div className="bg-card rounded-lg border">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead className="w-16">Imagine</TableHead>
                  <TableHead>Sfat (RO)</TableHead>
                  <TableHead>Sfat (EN)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <SortableContext
                  items={tips.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {tips.map((tip) => (
                    <SortableRow
                      key={tip.id}
                      tip={tip}
                      onEdit={handleEdit}
                      onDelete={(id) => deleteMutation.mutate(id)}
                      onToggleActive={handleToggleActive}
                    />
                  ))}
                </SortableContext>
              </TableBody>
            </Table>
          </DndContext>
        </div>
      )}
    </div>
  );
};

export default LocalTipsManager;