import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
  language: string;
}

const HostScanUploader = ({ images, onImagesChange, maxImages = 20, language }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    ro: {
      upload: "Adaugă Fotografii",
      hint: `JPG, PNG · Max 5MB/fotografie · Max ${maxImages} fotografii`,
      dragHint: "sau trage fotografiile aici",
      count: (n: number) => `${n}/${maxImages} fotografii`,
    },
    en: {
      upload: "Add Photos",
      hint: `JPG, PNG · Max 5MB/photo · Max ${maxImages} photos`,
      dragHint: "or drag photos here",
      count: (n: number) => `${n}/${maxImages} photos`,
    },
  };
  const text = t[language as keyof typeof t] || t.ro;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = maxImages - images.length;
    if (remaining <= 0) {
      toast.error(language === "ro" ? `Maximum ${maxImages} fotografii` : `Maximum ${maxImages} photos`);
      return;
    }

    const toProcess = Array.from(files).slice(0, remaining);
    const oversized = toProcess.filter(f => f.size > 5 * 1024 * 1024);
    if (oversized.length) {
      toast.error(language === "ro" ? `${oversized.length} fișier(e) depășesc 5MB` : `${oversized.length} file(s) exceed 5MB`);
    }

    const valid = toProcess.filter(f => f.size <= 5 * 1024 * 1024);
    if (!valid.length) return;

    Promise.all(
      valid.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      )
    ).then((newImages) => {
      onImagesChange([...images, ...newImages]);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className={cn(
          "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all group",
          images.length >= maxImages
            ? "border-muted/30 opacity-50 cursor-not-allowed"
            : "border-primary/30 hover:border-primary/60 hover:bg-primary/5"
        )}
      >
        <Camera className="w-10 h-10 mx-auto text-primary/40 group-hover:text-primary/60 mb-3 transition-colors" />
        <p className="font-semibold text-foreground text-sm">{text.upload}</p>
        <p className="text-xs text-muted-foreground mt-1">{text.hint}</p>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">{text.dragHint}</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,image/heic,image/*"
        multiple
        capture={undefined}
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Image grid */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">{text.count(images.length)}</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            <AnimatePresence>
              {images.map((img, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-xl overflow-hidden group"
                >
                  <img src={img} alt={`Property ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                    className="absolute top-1 right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <span className="absolute bottom-0.5 left-0.5 bg-background/80 text-[9px] font-bold px-1 rounded">{i + 1}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {images.length < maxImages && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-xl border-2 border-dashed border-border/50 flex items-center justify-center hover:border-primary/40 transition-colors"
              >
                <ImagePlus className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HostScanUploader;
