import { useState, memo } from "react";
import { Play } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { generateVideoObjectSchema } from "@/utils/schemaGenerators";

interface PropertyVideoEmbedProps {
  youtubeId: string;
  propertyName: string;
  description?: string;
  uploadDate?: string;
}

/**
 * Lazy-loaded YouTube embed with VideoObject JSON-LD schema.
 * Renders a click-to-play thumbnail to avoid loading iframe until needed (CWV safe).
 */
const PropertyVideoEmbed = memo(({ youtubeId, propertyName, description, uploadDate }: PropertyVideoEmbedProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

  const videoSchema = generateVideoObjectSchema({
    name: `${propertyName} — Video Tour`,
    description: description || `Virtual walkthrough of ${propertyName}, short-term rental apartment in Timișoara managed by RealTrust & ApArt Hotel.`,
    youtubeId,
    uploadDate,
    thumbnailUrl,
  });

  return (
    <div className="space-y-2">
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(videoSchema)}</script>
      </Helmet>

      <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted">
        {isPlaying ? (
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`}
            title={`${propertyName} — Video Tour`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            loading="lazy"
          />
        ) : (
          <button
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 w-full h-full group cursor-pointer"
            aria-label={`Play video tour of ${propertyName}`}
          >
            <img
              src={thumbnailUrl}
              alt={`${propertyName} video walkthrough — investiție imobiliară Timișoara, property management regim hotelier`}
              className="w-full h-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <Play className="w-7 h-7 text-primary-foreground ml-1" />
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  );
});

PropertyVideoEmbed.displayName = "PropertyVideoEmbed";

export default PropertyVideoEmbed;
