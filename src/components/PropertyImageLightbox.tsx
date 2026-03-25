import { useState, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useTouchSwipe } from "@/hooks/useTouchSwipe";
import { getImageAlt, Property } from "@/data/properties";
import { useLanguage } from "@/i18n/LanguageContext";

interface PropertyImageLightboxProps {
  property: Property;
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

const PropertyImageLightbox = ({ property, initialIndex = 0, open, onClose }: PropertyImageLightboxProps) => {
  const { language } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const images = property.images;

  useEffect(() => {
    if (open) setCurrentIndex(initialIndex);
  }, [open, initialIndex]);

  const next = useCallback(() => setCurrentIndex((i) => (i + 1) % images.length), [images.length]);
  const prev = useCallback(() => setCurrentIndex((i) => (i - 1 + images.length) % images.length), [images.length]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, next, prev, onClose]);

  const swipeHandlers = useTouchSwipe({
    onSwipeLeft: next,
    onSwipeRight: prev,
    onSwipeDown: onClose,
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      {...swipeHandlers}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 md:left-6 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Previous"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 md:right-6 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Next"
          >
            <ChevronRight className="w-7 h-7" />
          </button>
        </>
      )}

      <div className="max-w-5xl w-full px-4" onClick={(e) => e.stopPropagation()}>
        <img
          src={images[currentIndex]}
          alt={getImageAlt(property, currentIndex, language as "ro" | "en")}
          className="w-full max-h-[85vh] object-contain rounded-lg"
          draggable={false}
        />
        <div className="text-center mt-3">
          <p className="text-white/90 font-medium">{property.name}</p>
          <p className="text-white/50 text-sm mt-1">
            {currentIndex + 1} / {images.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PropertyImageLightbox;
