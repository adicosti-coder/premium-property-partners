import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  ImageIcon, Loader2, Sparkles, ArrowUpCircle, Minimize2, CheckCircle2,
  Trash2, GripVertical, AlertTriangle, Download, RotateCcw, ZoomIn,
  FileImage, HardDrive, Maximize2, Settings2, Wand2, X, ChevronDown, ChevronUp,
  Upload, Eraser
} from "lucide-react";
import { compressImage } from "@/utils/imageCompression";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ImageItem {
  url: string;
  originalUrl: string;
  persistedUrl?: string;
  optimized: boolean;
  optimizedBlob?: Blob;
  originalSize?: number;
  optimizedSize?: number;
  width?: number;
  height?: number;
  status: "idle" | "analyzing" | "optimizing" | "upscaling" | "done" | "error";
  error?: string;
  selected: boolean;
}

interface ImageOptimizationPanelProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getQualityBadge(sizeKB: number) {
  if (sizeKB < 100) return { label: "Ușoară", color: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30" };
  if (sizeKB < 300) return { label: "Optimă", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30" };
  if (sizeKB < 800) return { label: "Medie", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" };
  return { label: "Grea", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30" };
}

/** Fetch image as blob, using proxy for external URLs to avoid CORS */
function normalizeClientImageUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  return trimmed;
}

async function fetchImageBlob(url: string): Promise<{ blob: Blob; size: number }> {
  const normalizedUrl = normalizeClientImageUrl(url);
  const isExternal = /^https?:\/\//i.test(normalizedUrl) && !normalizedUrl.includes("supabase.co");
  
  if (isExternal) {
    const { data, error } = await supabase.functions.invoke("proxy-image", {
      body: { url: normalizedUrl },
    });
    if (error || !data?.data) {
      throw new Error(error?.message || "Proxy fetch failed");
    }
    const binaryStr = atob(data.data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: data.contentType || "image/jpeg" });
    return { blob, size: data.size || blob.size };
  }
  
  const response = await fetch(normalizedUrl);
  if (!response.ok) {
    throw new Error(`Fetch failed: ${response.status}`);
  }
  const blob = await response.blob();
  return { blob, size: blob.size };
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Conversie imagine eșuată"));
    };
    reader.onerror = () => reject(new Error("Conversie imagine eșuată"));
    reader.readAsDataURL(blob);
  });
}

async function prepareImageForWatermarkRemoval(blob: Blob, index: number): Promise<string> {
  const mimeType = blob.type.startsWith("image/") ? blob.type : "image/jpeg";
  const extension = mimeType.includes("png") ? "png" : mimeType.includes("webp") ? "webp" : "jpg";
  const sourceFile = new File([blob], `watermark-source-${index}.${extension}`, { type: mimeType });
  const normalizedFile = await compressImage(sourceFile, {
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 0.92,
    outputType: "image/jpeg",
    force: true,
  });

  return blobToDataUrl(normalizedFile);
}

const WATERMARK_REQUEST_DELAY_MS = 2200;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isRemoteImageUrl = (url: string) => /^https?:\/\//i.test(normalizeClientImageUrl(url));

const ImageOptimizationPanel = ({ images, onImagesChange }: ImageOptimizationPanelProps) => {
  const [items, setItems] = useState<ImageItem[]>(() =>
    images.map((url) => ({
      url,
      originalUrl: url,
      optimized: false,
      status: "idle" as const,
      selected: true,
    }))
  );
  const [isOpen, setIsOpen] = useState(true);
  const [quality, setQuality] = useState(85);
  const [maxWidth, setMaxWidth] = useState(1920);
  const [autoWebp, setAutoWebp] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBatchOptimizing, setIsBatchOptimizing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isRemovingWatermarks, setIsRemovingWatermarks] = useState(false);
  const [watermarkProgress, setWatermarkProgress] = useState(0);

  // Analyze all images (fetch size & dimensions)
  const analyzeImages = useCallback(async () => {
    setIsAnalyzing(true);
    const updated = [...items];

    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: "analyzing" };
      setItems([...updated]);

      try {
        const { blob, size: originalSize } = await fetchImageBlob(updated[i].url);

        // Get dimensions using object URL from blob
        const objectUrl = URL.createObjectURL(blob);
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
          const img = new Image();
          img.onload = () => { URL.revokeObjectURL(objectUrl); resolve({ w: img.naturalWidth, h: img.naturalHeight }); };
          img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve({ w: 0, h: 0 }); };
          img.src = objectUrl;
        });

        updated[i] = {
          ...updated[i],
          originalSize,
          width: dims.w,
          height: dims.h,
          status: "idle",
        };
      } catch {
        updated[i] = { ...updated[i], status: "error", error: "Nu s-a putut analiza" };
      }
      setItems([...updated]);
    }
    setIsAnalyzing(false);
  }, [items]);

  // Optimize a single image
  const optimizeSingle = useCallback(async (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], status: "optimizing" };
    setItems([...updated]);

    try {
      const { blob } = await fetchImageBlob(updated[index].url);
      const file = new File([blob], `image-${index}.jpg`, { type: blob.type });

      const compressed = await compressImage(file, {
        maxWidth,
        maxHeight: maxWidth,
        quality: quality / 100,
        outputType: autoWebp ? "image/webp" : "image/jpeg",
      });

      const optimizedUrl = URL.createObjectURL(compressed);
      const persistedUrl = await blobToDataUrl(compressed);

      updated[index] = {
        ...updated[index],
        url: optimizedUrl,
        persistedUrl,
        optimized: true,
        optimizedBlob: compressed,
        optimizedSize: compressed.size,
        originalSize: updated[index].originalSize || blob.size,
        status: "done",
      };

      setItems([...updated]);
      syncImages(updated);
    } catch (err: any) {
      updated[index] = { ...updated[index], status: "error", error: err.message };
      setItems([...updated]);
    }
  }, [items, quality, maxWidth, autoWebp]);

  // Batch optimize all selected
  const batchOptimize = useCallback(async () => {
    setIsBatchOptimizing(true);
    setBatchProgress(0);
    const selected = items.filter((item) => item.selected && !item.optimized);
    const total = selected.length;

    const updated = [...items];
    let completed = 0;

    for (let i = 0; i < updated.length; i++) {
      if (!updated[i].selected || updated[i].optimized) continue;

      updated[i] = { ...updated[i], status: "optimizing" };
      setItems([...updated]);

      try {
        const { blob } = await fetchImageBlob(updated[i].url);
        const file = new File([blob], `image-${i}.jpg`, { type: blob.type });

        const compressed = await compressImage(file, {
          maxWidth,
          maxHeight: maxWidth,
          quality: quality / 100,
          outputType: autoWebp ? "image/webp" : "image/jpeg",
        });

        const optimizedUrl = URL.createObjectURL(compressed);
        const persistedUrl = await blobToDataUrl(compressed);

        updated[i] = {
          ...updated[i],
          url: optimizedUrl,
          persistedUrl,
          optimized: true,
          optimizedBlob: compressed,
          optimizedSize: compressed.size,
          originalSize: updated[i].originalSize || blob.size,
          status: "done",
        };
      } catch {
        updated[i] = { ...updated[i], status: "error", error: "Optimizare eșuată" };
      }

      completed++;
      setBatchProgress(Math.round((completed / total) * 100));
      setItems([...updated]);
    }

    syncImages(updated);
    setIsBatchOptimizing(false);
  }, [items, quality, maxWidth, autoWebp]);

  // Remove watermarks from selected images using AI
  const removeWatermarks = useCallback(async () => {
    setIsRemovingWatermarks(true);
    setWatermarkProgress(0);
    const selected = items.filter((item) => item.selected);
    const total = selected.length;
    const updated = [...items];
    let completed = 0;
    let stoppedByLimit = false;

    for (let i = 0; i < updated.length; i++) {
      if (!updated[i].selected) continue;
      if (stoppedByLimit) {
        updated[i] = { ...updated[i], status: "idle", error: undefined };
        setItems([...updated]);
        continue;
      }

      updated[i] = { ...updated[i], status: "optimizing", error: undefined };
      setItems([...updated]);

      try {
        const sourceUrl = updated[i].originalUrl || updated[i].url;
        const requestBody: { imageUrl?: string; imageDataUrl?: string } = {};
        let originalSize = updated[i].originalSize;

        if (isRemoteImageUrl(sourceUrl)) {
          requestBody.imageUrl = sourceUrl;
        } else {
          const { blob, size } = await fetchImageBlob(sourceUrl);
          requestBody.imageDataUrl = await prepareImageForWatermarkRemoval(blob, i);
          originalSize = originalSize || size;
        }

        const { data, error } = await supabase.functions.invoke("remove-watermark", {
          body: requestBody,
        });

        if (error) throw new Error(error.message);
        if (!data?.cleaned || (!data?.imageUrl && !data?.dataUri)) {
          const backendMessage = data?.error || "AI nu a returnat o imagine curățată";
          const statusCode = Number(data?.status || 0);
          const isRateLimited = statusCode === 429 || /resource exhausted|try again later|rate limit/i.test(backendMessage);
          const isOutOfCredits = statusCode === 402 || /payment required|add funds|credits/i.test(backendMessage);

          if (isRateLimited) {
            stoppedByLimit = true;
            throw new Error("Serviciul AI este temporar ocupat. Am oprit lotul ca să nu mai consume inutil — reîncearcă peste 30-60 secunde.");
          }

          if (isOutOfCredits) {
            stoppedByLimit = true;
            throw new Error("Procesarea AI nu poate continua acum deoarece creditele pentru AI sunt epuizate.");
          }

          throw new Error(backendMessage);
        }

        const persistedUrl = data.imageUrl || data.dataUri;
        const displayUrl = data.imageUrl || data.dataUri;
        const optimizedSize = Number(data.cleanedSize || 0) || updated[i].optimizedSize || originalSize || 0;

        updated[i] = {
          ...updated[i],
          url: displayUrl,
          persistedUrl,
          optimized: true,
          optimizedBlob: undefined,
          optimizedSize,
          originalSize: originalSize || optimizedSize,
          status: "done",
          error: undefined,
        };
      } catch (err) {
        updated[i] = {
          ...updated[i],
          status: "error",
          error: err instanceof Error ? err.message : "Eliminare watermark eșuată",
        };
      }

      completed++;
      setWatermarkProgress(Math.round((completed / total) * 100));
      setItems([...updated]);

      if (!stoppedByLimit && completed < total) {
        await sleep(WATERMARK_REQUEST_DELAY_MS);
      }
    }

    syncImages(updated);
    setIsRemovingWatermarks(false);

    if (stoppedByLimit) {
      toast({
        title: "Procesare oprită temporar",
        description: "Serviciul AI a limitat cererile. Am oprit lotul ca să evit consum inutil; reîncearcă peste 30-60 secunde.",
        variant: "destructive",
      });
    }
  }, [items]);

  // Reset single image

  const resetImage = (index: number) => {
    const updated = [...items];
    if (updated[index].optimized && updated[index].url.startsWith("blob:")) {
      URL.revokeObjectURL(updated[index].url);
    }
    updated[index] = {
      ...updated[index],
      url: updated[index].originalUrl,
      persistedUrl: undefined,
      optimized: false,
      optimizedBlob: undefined,
      optimizedSize: undefined,
      status: "idle",
      error: undefined,
    };
    setItems([...updated]);
    syncImages(updated);
  };

  // Remove image
  const removeImage = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    syncImages(updated);
  };

  // Toggle selection
  const toggleSelect = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], selected: !updated[index].selected };
    setItems(updated);
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    const allSelected = items.every((i) => i.selected);
    setItems(items.map((i) => ({ ...i, selected: !allSelected })));
  };

  // Drag reorder
  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...items];
    const [dragged] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, dragged);
    setItems(updated);
    setDraggedIndex(index);
  };
  const handleDragEnd = () => {
    setDraggedIndex(null);
    syncImages(items);
  };

  // Move image up/down
  const moveImage = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= items.length) return;
    const updated = [...items];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setItems(updated);
    syncImages(updated);
  };

  // Sync with parent
  const syncImages = (updatedItems: ImageItem[]) => {
    onImagesChange(updatedItems.filter((i) => i.selected).map((i) => i.persistedUrl || i.originalUrl || i.url));
  };

  // Stats
  const totalOriginal = items.reduce((sum, i) => sum + (i.originalSize || 0), 0);
  const totalOptimized = items.reduce((sum, i) => sum + (i.optimized && i.optimizedSize ? i.optimizedSize : i.originalSize || 0), 0);
  const optimizedCount = items.filter((i) => i.optimized).length;
  const selectedCount = items.filter((i) => i.selected).length;
  const savings = totalOriginal > 0 ? Math.round((1 - totalOptimized / totalOriginal) * 100) : 0;

  return (
    <div className="border-t pt-4 mt-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full text-left group"
          >
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-gradient-to-br from-primary/15 to-accent/15">
                <ImageIcon className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-sm">Studio Imagini</span>
              <Badge variant="outline" className="text-[10px]">
                {items.length} imagini
              </Badge>
              {optimizedCount > 0 && (
                <Badge className="text-[10px] bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
                  {optimizedCount} optimizate
                  {savings > 0 && ` · −${savings}%`}
                </Badge>
              )}
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-4 space-y-4">
          {/* ===== Settings Bar ===== */}
          <div className="rounded-xl border bg-gradient-to-br from-muted/30 to-muted/10 p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">Setări Optimizare</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Quality slider */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex justify-between">
                  <span>Calitate compresie</span>
                  <span className="font-mono text-primary">{quality}%</span>
                </Label>
                <Slider
                  value={[quality]}
                  onValueChange={([v]) => setQuality(v)}
                  min={30}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Mic (rapid)</span>
                  <span>Maxim (calitate)</span>
                </div>
              </div>

              {/* Max width slider */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex justify-between">
                  <span>Rezoluție maximă</span>
                  <span className="font-mono text-primary">{maxWidth}px</span>
                </Label>
                <Slider
                  value={[maxWidth]}
                  onValueChange={([v]) => setMaxWidth(v)}
                  min={800}
                  max={3840}
                  step={160}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>800px (web)</span>
                  <span>4K (print)</span>
                </div>
              </div>

              {/* WebP toggle */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Format output</Label>
                <div className="flex items-center gap-3 mt-1">
                  <Switch checked={autoWebp} onCheckedChange={setAutoWebp} />
                  <span className="text-sm">
                    {autoWebp ? (
                      <span className="text-primary font-medium">WebP <span className="text-muted-foreground font-normal">(30-40% mai mic)</span></span>
                    ) : (
                      <span>JPEG clasic</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Watermark Removal ===== */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={removeWatermarks}
              disabled={isRemovingWatermarks || isBatchOptimizing || isAnalyzing || selectedCount === 0}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 flex-1 sm:flex-none"
            >
              {isRemovingWatermarks ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Eliminare watermark ({watermarkProgress}%)...</>
              ) : (
                <><Eraser className="w-3.5 h-3.5 mr-1.5" />🔴 Elimină Watermark ({selectedCount})</>
              )}
            </Button>
          </div>

          {/* ===== Action Bar ===== */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={analyzeImages}
              disabled={isAnalyzing || isBatchOptimizing}
            >
              {isAnalyzing ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Analizare...</>
              ) : (
                <><ZoomIn className="w-3.5 h-3.5 mr-1.5" />Analizează Toate</>
              )}
            </Button>

            <Button
              size="sm"
              onClick={batchOptimize}
              disabled={isBatchOptimizing || isAnalyzing || selectedCount === 0}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {isBatchOptimizing ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Optimizare ({batchProgress}%)...</>
              ) : (
                <><Wand2 className="w-3.5 h-3.5 mr-1.5" />Optimizează Selectate ({selectedCount})</>
              )}
            </Button>

            <Button size="sm" variant="ghost" onClick={toggleSelectAll}>
              {items.every((i) => i.selected) ? "Deselectează tot" : "Selectează tot"}
            </Button>

            <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
              {totalOriginal > 0 && (
                <>
                  <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />Original: {formatBytes(totalOriginal)}</span>
                  {optimizedCount > 0 && (
                    <>
                      <span>→</span>
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {formatBytes(totalOptimized)} (−{savings}%)
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Batch progress */}
          {isBatchOptimizing && (
            <Progress value={batchProgress} className="h-2" />
          )}
          {isRemovingWatermarks && (
            <Progress value={watermarkProgress} className="h-2" />
          )}

          {/* ===== Image Grid ===== */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.map((item, index) => {
              const sizeKB = (item.optimized ? item.optimizedSize : item.originalSize) || 0;
              const qualityBadge = sizeKB > 0 ? getQualityBadge(sizeKB / 1024) : null;
              const isProcessing = item.status === "optimizing" || item.status === "analyzing" || item.status === "upscaling";

              return (
                <div
                  key={index}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group relative rounded-xl border-2 overflow-hidden transition-all duration-200 ${
                    draggedIndex === index ? "opacity-50 scale-95" : ""
                  } ${
                    item.selected
                      ? "border-primary/40 bg-background shadow-sm"
                      : "border-border/50 bg-muted/20 opacity-60"
                  } ${item.status === "error" ? "border-red-500/40" : ""}`}
                >
                  {/* Image */}
                  <div className="aspect-[4/3] relative bg-muted">
                    <img
                      src={item.url}
                      alt={`Imagine ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Processing overlay */}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        <span className="text-[10px] font-medium text-primary">
                          {item.status === "analyzing" && "Se analizează..."}
                          {item.status === "optimizing" && "Se optimizează..."}
                          {item.status === "upscaling" && "Se mărește rezoluția..."}
                        </span>
                      </div>
                    )}

                    {/* Done overlay */}
                    {item.status === "done" && item.optimized && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-green-500/90 text-white text-[10px] gap-1">
                          <CheckCircle2 className="w-3 h-3" />Optimizat
                        </Badge>
                      </div>
                    )}

                    {/* Error overlay */}
                    {item.status === "error" && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="destructive" className="text-[10px] gap-1">
                          <AlertTriangle className="w-3 h-3" />Eroare
                        </Badge>
                      </div>
                    )}

                    {/* Index badge */}
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center text-[10px] font-bold border">
                      {index + 1}
                    </div>

                    {/* Hover actions */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveImage(index, "up")}
                            disabled={index === 0}
                            className="w-7 h-7 rounded-md bg-white/90 hover:bg-white flex items-center justify-center disabled:opacity-30 transition-colors"
                            title="Mută la stânga"
                          >
                            <ChevronUp className="w-3.5 h-3.5 text-black rotate-[-90deg]" />
                          </button>
                          <button
                            onClick={() => moveImage(index, "down")}
                            disabled={index === items.length - 1}
                            className="w-7 h-7 rounded-md bg-white/90 hover:bg-white flex items-center justify-center disabled:opacity-30 transition-colors"
                            title="Mută la dreapta"
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-black rotate-[-90deg]" />
                          </button>
                        </div>
                        <div className="flex gap-1">
                          {item.optimized && (
                            <button
                              onClick={() => resetImage(index)}
                              className="w-7 h-7 rounded-md bg-white/90 hover:bg-white flex items-center justify-center transition-colors"
                              title="Resetează la original"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-black" />
                            </button>
                          )}
                          <button
                            onClick={() => removeImage(index)}
                            className="w-7 h-7 rounded-md bg-red-500/90 hover:bg-red-500 flex items-center justify-center transition-colors"
                            title="Elimină imaginea"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Drag handle */}
                    <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
                      <div className="w-7 h-7 rounded-md bg-white/80 backdrop-blur-sm flex items-center justify-center">
                        <GripVertical className="w-3.5 h-3.5 text-black/60" />
                      </div>
                    </div>
                  </div>

                  {/* Info footer */}
                  <div className="p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleSelect(index)}
                          className="w-3.5 h-3.5 rounded border-border accent-primary"
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {item.width && item.height ? `${item.width}×${item.height}` : "—"}
                        </span>
                      </div>
                      {qualityBadge && (
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${qualityBadge.color}`}>
                          {qualityBadge.label}
                        </Badge>
                      )}
                    </div>

                    {/* Size info */}
                    {item.originalSize && (
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">
                          <FileImage className="w-3 h-3 inline mr-0.5" />
                          {formatBytes(item.originalSize)}
                        </span>
                        {item.optimized && item.optimizedSize && (
                          <span className="text-green-600 dark:text-green-400 font-medium">
                            → {formatBytes(item.optimizedSize)}
                            <span className="ml-0.5 text-[9px]">
                              (−{Math.round((1 - item.optimizedSize / item.originalSize) * 100)}%)
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    {item.status === "error" && item.error && (
                      <p className="text-[10px] leading-snug text-destructive line-clamp-3">
                        {item.error}
                      </p>
                    )}

                    {/* Quick action */}
                    {!item.optimized && item.status !== "optimizing" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full h-7 text-[10px]"
                        onClick={() => optimizeSingle(index)}
                      >
                        <Minimize2 className="w-3 h-3 mr-1" />Optimizează
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== Summary Stats ===== */}
          {optimizedCount > 0 && (
            <div className="rounded-xl border bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-green-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-500/15">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold">
                    {optimizedCount}/{items.length} imagini optimizate
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Reducere totală: {formatBytes(totalOriginal)} → {formatBytes(totalOptimized)}
                    {savings > 0 && (
                      <span className="ml-1 text-green-600 dark:text-green-400 font-medium">
                        (−{savings}% · salvare {formatBytes(totalOriginal - totalOptimized)})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ImageOptimizationPanel;
