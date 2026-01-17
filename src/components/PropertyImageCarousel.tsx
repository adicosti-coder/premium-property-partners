import { useState, useCallback, useEffect, memo } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import OptimizedImage from "./OptimizedImage";

interface PropertyImageCarouselProps {
  images: string[];
  propertyName: string;
  className?: string;
}

const PropertyImageCarousel = ({ images, propertyName, className = "" }: PropertyImageCarouselProps) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const displayImages = images.slice(0, 5); // Limit to 5 images

  return (
    <div className={`relative group/carousel ${className}`}>
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {displayImages.map((image, index) => (
            <div 
              key={index} 
              className="flex-[0_0_100%] min-w-0"
            >
              <OptimizedImage
                src={image}
                alt={`${propertyName} - ${index + 1}`}
                className="w-full h-56"
                width={400}
                height={224}
                priority={index === 0}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows - only show on hover */}
      {displayImages.length > 1 && (
        <>
          <button
            onClick={scrollPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-background hover:scale-110 z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={scrollNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:bg-background hover:scale-110 z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {displayImages.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {displayImages.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                emblaApi?.scrollTo(index);
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === selectedIndex
                  ? "bg-primary w-4"
                  : "bg-background/70 hover:bg-background"
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image counter */}
      {displayImages.length > 1 && (
        <div className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-background/80 backdrop-blur-sm text-xs font-medium text-foreground z-10">
          {selectedIndex + 1} / {displayImages.length}
        </div>
      )}
    </div>
  );
};

export default PropertyImageCarousel;