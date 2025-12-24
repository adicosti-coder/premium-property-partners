import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { 
  Loader2, 
  Upload, 
  X, 
  Star,
  GripVertical,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn
} from "lucide-react";
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface PropertyImage {
  id: string;
  property_id: string;
  image_path: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

interface PropertyImageGalleryProps {
  propertyId: string;
  images: PropertyImage[];
  onImagesChange: (images: PropertyImage[]) => void;
}

interface SortableImageItemProps {
  image: PropertyImage;
  getPublicUrl: (path: string) => string | null;
  onSetPrimary: (image: PropertyImage) => void;
  onDelete: (image: PropertyImage) => void;
  onPreview: (image: PropertyImage) => void;
  deletingId: string | null;
  t: any;
}

function SortableImageItem({ 
  image, 
  getPublicUrl, 
  onSetPrimary, 
  onDelete, 
  onPreview,
  deletingId,
  t 
}: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg overflow-hidden border-2 ${
        image.is_primary ? 'border-primary' : 'border-border'
      } ${isDragging ? 'shadow-xl scale-105' : ''}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 z-10 p-1 bg-background/80 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <img
        src={getPublicUrl(image.image_path) || ""}
        alt="Property"
        className="w-full h-24 object-cover cursor-pointer"
        onClick={() => onPreview(image)}
      />
      
      {/* Overlay with actions */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 pointer-events-none">
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 pointer-events-auto"
          onClick={() => onPreview(image)}
          title={t.admin.properties?.preview || "Preview"}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="h-8 w-8 pointer-events-auto"
          onClick={() => onSetPrimary(image)}
          title={t.admin.properties?.setPrimary || "Set as primary"}
        >
          <Star className={`w-4 h-4 ${image.is_primary ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-8 w-8 pointer-events-auto"
          onClick={() => onDelete(image)}
          disabled={deletingId === image.id}
        >
          {deletingId === image.id ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <X className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Primary badge */}
      {image.is_primary && (
        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
          {t.admin.properties?.primary || "Primary"}
        </div>
      )}
    </div>
  );
}

export default function PropertyImageGallery({ 
  propertyId, 
  images, 
  onImagesChange 
}: PropertyImageGalleryProps) {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<PropertyImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const getPublicUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('property-images').getPublicUrl(path);
    return data.publicUrl;
  };

  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);

  const handlePreview = (image: PropertyImage) => {
    setPreviewImage(image);
  };

  const handlePrevImage = () => {
    if (!previewImage) return;
    const currentIndex = sortedImages.findIndex(img => img.id === previewImage.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedImages.length - 1;
    setPreviewImage(sortedImages[prevIndex]);
  };

  const handleNextImage = () => {
    if (!previewImage) return;
    const currentIndex = sortedImages.findIndex(img => img.id === previewImage.id);
    const nextIndex = currentIndex < sortedImages.length - 1 ? currentIndex + 1 : 0;
    setPreviewImage(sortedImages[nextIndex]);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    setIsUploading(true);
    const newImages: PropertyImage[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!allowedTypes.includes(file.type)) {
          toast({
            title: t.admin.error,
            description: `${file.name}: ${t.admin.properties?.invalidFileType || "Invalid file type"}`,
            variant: "destructive",
          });
          continue;
        }

        if (file.size > maxSize) {
          toast({
            title: t.admin.error,
            description: `${file.name}: ${t.admin.properties?.fileTooLarge || "File too large"}`,
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const isPrimary = images.length === 0 && newImages.length === 0;
        const displayOrder = images.length + newImages.length;

        const { data: insertedData, error: insertError } = await supabase
          .from('property_images')
          .insert({
            property_id: propertyId,
            image_path: fileName,
            display_order: displayOrder,
            is_primary: isPrimary,
          })
          .select()
          .single();

        if (insertError) {
          console.error("Insert error:", insertError);
          continue;
        }

        newImages.push(insertedData);
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast({ 
          title: t.admin.properties?.uploadSuccess || "Images uploaded!",
          description: `${newImages.length} ${t.admin.properties?.imagesUploaded || "image(s) uploaded"}`
        });
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.uploadError || "Could not upload images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteImage = async (image: PropertyImage) => {
    setDeletingId(image.id);
    try {
      // Delete from storage
      await supabase.storage
        .from('property-images')
        .remove([image.image_path]);

      // Delete from database
      const { error } = await supabase
        .from('property_images')
        .delete()
        .eq('id', image.id);

      if (error) throw error;

      const updatedImages = images.filter(img => img.id !== image.id);
      
      // If deleted image was primary, make first image primary
      if (image.is_primary && updatedImages.length > 0) {
        const { error: updateError } = await supabase
          .from('property_images')
          .update({ is_primary: true })
          .eq('id', updatedImages[0].id);

        if (!updateError) {
          updatedImages[0].is_primary = true;
        }
      }

      onImagesChange(updatedImages);
      toast({ title: t.admin.properties?.imageDeleted || "Image deleted" });
    } catch (error) {
      console.error("Error deleting image:", error);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.deleteError || "Could not delete image",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (image: PropertyImage) => {
    if (image.is_primary) return;

    try {
      // Remove primary from all images
      await supabase
        .from('property_images')
        .update({ is_primary: false })
        .eq('property_id', propertyId);

      // Set new primary
      const { error } = await supabase
        .from('property_images')
        .update({ is_primary: true })
        .eq('id', image.id);

      if (error) throw error;

      const updatedImages = images.map(img => ({
        ...img,
        is_primary: img.id === image.id
      }));

      onImagesChange(updatedImages);
      toast({ title: t.admin.properties?.primarySet || "Primary image set" });
    } catch (error) {
      console.error("Error setting primary:", error);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.updateError || "Could not update image",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex(img => img.id === active.id);
    const newIndex = images.findIndex(img => img.id === over.id);

    const reorderedImages = arrayMove(images, oldIndex, newIndex).map(
      (img, index) => ({
        ...img,
        display_order: index,
      })
    );

    onImagesChange(reorderedImages);

    try {
      const updates = reorderedImages.map(img =>
        supabase
          .from('property_images')
          .update({ display_order: img.display_order })
          .eq('id', img.id)
      );

      await Promise.all(updates);
      toast({ title: t.admin.properties?.orderUpdated || "Order updated" });
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.updateError || "Could not update order",
        variant: "destructive",
      });
    }
  };

  const currentPreviewIndex = previewImage 
    ? sortedImages.findIndex(img => img.id === previewImage.id) + 1 
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {t.admin.properties?.gallery || "Image Gallery"} ({images.length})
        </label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Upload className="w-4 h-4 mr-2" />
          )}
          {t.admin.properties?.addImages || "Add Images"}
        </Button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleImageUpload}
        multiple
        className="hidden"
      />

      {images.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t.admin.properties?.uploading || "Uploading..."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t.admin.properties?.dragDropHint || "Click to upload images"}
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP, GIF (max 5MB)
              </p>
            </div>
          )}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedImages.map(img => img.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sortedImages.map((image) => (
                <SortableImageItem
                  key={image.id}
                  image={image}
                  getPublicUrl={getPublicUrl}
                  onSetPrimary={handleSetPrimary}
                  onDelete={handleDeleteImage}
                  onPreview={handlePreview}
                  deletingId={deletingId}
                  t={t}
                />
              ))}
              
              {/* Add more button */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
            </div>
          </SortableContext>
        </DndContext>
      )}
      
      {images.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          {t.admin.properties?.dragToReorder || "Drag images to reorder"}
        </p>
      )}

      {/* Lightbox Preview */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div className="relative flex items-center justify-center min-h-[60vh]">
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 text-white hover:bg-white/20"
              onClick={() => setPreviewImage(null)}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Navigation - Previous */}
            {sortedImages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 z-10 text-white hover:bg-white/20 h-12 w-12"
                onClick={handlePrevImage}
              >
                <ChevronLeft className="w-8 h-8" />
              </Button>
            )}

            {/* Image */}
            {previewImage && (
              <img
                src={getPublicUrl(previewImage.image_path) || ""}
                alt="Preview"
                className="max-h-[80vh] max-w-full object-contain"
              />
            )}

            {/* Navigation - Next */}
            {sortedImages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 z-10 text-white hover:bg-white/20 h-12 w-12"
                onClick={handleNextImage}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            )}

            {/* Image counter */}
            {sortedImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
                {currentPreviewIndex} / {sortedImages.length}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
