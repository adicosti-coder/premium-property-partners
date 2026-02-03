import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import { compressImage } from "@/utils/imageCompression";
import { 
  Loader2, 
  Upload, 
  X, 
  Star,
  GripVertical,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Check,
  AlertCircle,
  Trash2
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
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

interface UploadingFile {
  id: string;
  name: string;
  preview: string;
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error';
  progress: number;
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
  onToggleSelect: (image: PropertyImage) => void;
  deletingId: string | null;
  isSelectionMode: boolean;
  isSelected: boolean;
  t: any;
}

function SortableImageItem({ 
  image, 
  getPublicUrl, 
  onSetPrimary, 
  onDelete, 
  onPreview,
  onToggleSelect,
  deletingId,
  isSelectionMode,
  isSelected,
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

  const handleClick = () => {
    if (isSelectionMode) {
      onToggleSelect(image);
    } else {
      onPreview(image);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group rounded-lg overflow-hidden border-2 ${
        isSelected ? 'border-destructive ring-2 ring-destructive' :
        image.is_primary ? 'border-primary' : 'border-border'
      } ${isDragging ? 'shadow-xl scale-105' : ''}`}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <div 
          className="absolute top-1 right-1 z-20 p-1 bg-background/90 rounded cursor-pointer"
          onClick={() => onToggleSelect(image)}
        >
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
            isSelected ? 'bg-destructive border-destructive' : 'border-muted-foreground'
          }`}>
            {isSelected && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
      )}

      {/* Drag handle */}
      {!isSelectionMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-1 left-1 z-10 p-1 bg-background/80 rounded cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      <img
        src={getPublicUrl(image.image_path) || ""}
        alt="Property"
        className="w-full h-24 object-cover cursor-pointer"
        onClick={handleClick}
      />
      
      {/* Overlay with actions */}
      {!isSelectionMode && (
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
      )}

      {/* Primary badge */}
      {image.is_primary && !isSelectionMode && (
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
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<PropertyImage | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
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

  const handleToggleSelect = (image: PropertyImage) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(image.id)) {
        newSet.delete(image.id);
      } else {
        newSet.add(image.id);
      }
      return newSet;
    });
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedImages(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedImages.size === 0) return;
    
    setIsDeletingBulk(true);
    const imagesToDelete = images.filter(img => selectedImages.has(img.id));
    
    try {
      // Delete from storage
      const paths = imagesToDelete.map(img => img.image_path);
      await supabase.storage.from('property-images').remove(paths);

      // Delete from database
      const { error } = await supabase
        .from('property_images')
        .delete()
        .in('id', Array.from(selectedImages));

      if (error) throw error;

      const remainingImages = images.filter(img => !selectedImages.has(img.id));
      
      // If primary was deleted, set new primary
      const deletedPrimary = imagesToDelete.some(img => img.is_primary);
      if (deletedPrimary && remainingImages.length > 0) {
        await supabase
          .from('property_images')
          .update({ is_primary: true })
          .eq('id', remainingImages[0].id);
        remainingImages[0].is_primary = true;
      }

      onImagesChange(remainingImages);
      toast({ 
        title: t.admin.properties?.bulkDeleteSuccess || "Images deleted",
        description: `${selectedImages.size} ${t.admin.properties?.imagesDeleted || "image(s) deleted"}`
      });
      handleCancelSelection();
    } catch (error) {
      console.error("Error deleting images:", error);
      toast({
        title: t.admin.error,
        description: t.admin.properties?.deleteError || "Could not delete images",
        variant: "destructive",
      });
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handlePrevImage = useCallback(() => {
    if (!previewImage || sortedImages.length <= 1) return;
    const currentIndex = sortedImages.findIndex(img => img.id === previewImage.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : sortedImages.length - 1;
    setPreviewImage(sortedImages[prevIndex]);
  }, [previewImage, sortedImages]);

  const handleNextImage = useCallback(() => {
    if (!previewImage || sortedImages.length <= 1) return;
    const currentIndex = sortedImages.findIndex(img => img.id === previewImage.id);
    const nextIndex = currentIndex < sortedImages.length - 1 ? currentIndex + 1 : 0;
    setPreviewImage(sortedImages[nextIndex]);
  }, [previewImage, sortedImages]);

  const handleCloseLightbox = useCallback(() => {
    setPreviewImage(null);
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!previewImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevImage();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextImage();
          break;
        case 'Escape':
          e.preventDefault();
          handleCloseLightbox();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, handlePrevImage, handleNextImage, handleCloseLightbox]);

  // Touch swipe navigation for lightbox
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const minSwipeDistance = 50;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextImage();
    } else if (isRightSwipe) {
      handlePrevImage();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }, [handleNextImage, handlePrevImage]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const maxSize = 10 * 1024 * 1024; // 10MB before compression

    // Create upload tracking entries
    const filesToUpload: { file: File; uploadId: string }[] = [];
    const initialUploadingFiles: UploadingFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadId = `upload-${Date.now()}-${i}`;
      
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
          description: `${file.name}: ${t.admin.properties?.fileTooLarge || "File too large (max 10MB)"}`,
          variant: "destructive",
        });
        continue;
      }

      filesToUpload.push({ file, uploadId });
      initialUploadingFiles.push({
        id: uploadId,
        name: file.name,
        preview: URL.createObjectURL(file),
        status: 'pending',
        progress: 0,
      });
    }

    if (filesToUpload.length === 0) return;

    setIsUploading(true);
    setUploadingFiles(initialUploadingFiles);
    const newImages: PropertyImage[] = [];

    const updateFileStatus = (uploadId: string, status: UploadingFile['status'], progress: number) => {
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadId ? { ...f, status, progress } : f)
      );
    };

    try {
      for (const { file, uploadId } of filesToUpload) {
        try {
          // Compressing
          updateFileStatus(uploadId, 'compressing', 25);
          
          const compressedFile = await compressImage(file, {
            maxWidth: 1920,
            maxHeight: 1920,
            quality: 0.85,
            outputType: 'image/webp',
          });

          // Uploading
          updateFileStatus(uploadId, 'uploading', 60);

          const fileExt = compressedFile.name.split('.').pop() || 'webp';
          const fileName = `${propertyId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(fileName, compressedFile);

          if (uploadError) {
            console.error("Upload error:", uploadError);
            updateFileStatus(uploadId, 'error', 0);
            continue;
          }

          updateFileStatus(uploadId, 'uploading', 85);

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
            updateFileStatus(uploadId, 'error', 0);
            continue;
          }

          updateFileStatus(uploadId, 'done', 100);
          newImages.push(insertedData);
        } catch (err) {
          console.error("Error processing file:", file.name, err);
          updateFileStatus(uploadId, 'error', 0);
        }
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
        toast({ 
          title: t.admin.properties?.uploadSuccess || "Images uploaded!",
          description: `${newImages.length} ${t.admin.properties?.imagesUploaded || "image(s) uploaded and compressed"}`
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
      // Clean up previews
      setTimeout(() => {
        uploadingFiles.forEach(f => URL.revokeObjectURL(f.preview));
        setUploadingFiles([]);
        setIsUploading(false);
      }, 1500);
      
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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <label className="text-sm font-medium">
          {t.admin.properties?.gallery || "Image Gallery"} ({images.length})
        </label>
        <div className="flex items-center gap-2">
          {images.length > 1 && !isSelectionMode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSelectionMode(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t.admin.properties?.bulkSelect || "Select"}
            </Button>
          )}
          {isSelectionMode && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedImages.size} {t.admin.properties?.selected || "selected"}
              </span>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={selectedImages.size === 0 || isDeletingBulk}
              >
                {isDeletingBulk ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                {t.admin.properties?.deleteSelected || "Delete"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelSelection}
              >
                {t.admin.cancel || "Cancel"}
              </Button>
            </>
          )}
          {!isSelectionMode && (
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
          )}
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleImageUpload}
        multiple
        className="hidden"
      />

      {/* Upload progress cards */}
      {uploadingFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
          {uploadingFiles.map((file) => (
            <div
              key={file.id}
              className="relative rounded-lg overflow-hidden border-2 border-border bg-muted/30"
            >
              <img
                src={file.preview}
                alt={file.name}
                className="w-full h-24 object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 p-2">
                {file.status === 'error' ? (
                  <AlertCircle className="w-6 h-6 text-destructive mb-1" />
                ) : file.status === 'done' ? (
                  <Check className="w-6 h-6 text-green-500 mb-1" />
                ) : (
                  <Loader2 className="w-6 h-6 text-primary animate-spin mb-1" />
                )}
                <span className="text-xs text-white font-medium text-center truncate w-full px-1">
                  {file.status === 'compressing' && (t.admin.properties?.compressing || 'Compressing...')}
                  {file.status === 'uploading' && (t.admin.properties?.uploading || 'Uploading...')}
                  {file.status === 'done' && (t.admin.properties?.done || 'Done!')}
                  {file.status === 'error' && (t.admin.properties?.uploadFailed || 'Failed')}
                  {file.status === 'pending' && (t.admin.properties?.pending || 'Pending...')}
                </span>
                {file.status !== 'done' && file.status !== 'error' && (
                  <Progress value={file.progress} className="w-full h-1.5 mt-2" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && uploadingFiles.length === 0 ? (
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
                JPG, PNG, WebP, GIF (max 10MB)
              </p>
            </div>
          )}
        </div>
      ) : images.length > 0 ? (
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
                  onToggleSelect={handleToggleSelect}
                  deletingId={deletingId}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedImages.has(image.id)}
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
      ) : null}
      
      {images.length > 1 && (
        <p className="text-xs text-muted-foreground text-center">
          {t.admin.properties?.dragToReorder || "Drag images to reorder"}
        </p>
      )}

      {/* Lightbox Preview */}
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black/95 border-none">
          <div 
            className="relative flex items-center justify-center min-h-[60vh]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
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
                className="absolute left-2 z-10 text-white hover:bg-white/20 h-12 w-12 hidden md:flex"
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
                className="max-h-[80vh] max-w-full object-contain select-none"
                draggable={false}
              />
            )}

            {/* Navigation - Next */}
            {sortedImages.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 z-10 text-white hover:bg-white/20 h-12 w-12 hidden md:flex"
                onClick={handleNextImage}
              >
                <ChevronRight className="w-8 h-8" />
              </Button>
            )}

            {/* Image counter & swipe hint on mobile */}
            {sortedImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full flex items-center gap-2">
                <span className="md:hidden text-xs opacity-70">←</span>
                <span>{currentPreviewIndex} / {sortedImages.length}</span>
                <span className="md:hidden text-xs opacity-70">→</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
