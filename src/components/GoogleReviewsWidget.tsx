import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n/LanguageContext";
import { Star, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
  profile_photo_url: string;
}

const GoogleReviewsWidget = () => {
  const { language } = useLanguage();

  const { data, isLoading, error } = useQuery({
    queryKey: ["google-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-google-reviews");
      if (error) throw error;
      return data as { reviews: GoogleReview[]; rating: number; totalReviews: number };
    },
    staleTime: 1000 * 60 * 30, // 30 min client cache
    retry: 1,
  });

  if (isLoading || error || !data?.reviews?.length) return null;

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );

  return (
    <section className="py-16 bg-card/30">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-center gap-3 mb-4">
          <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            {language === "ro" ? "Recenzii Google" : "Google Reviews"}
          </h2>
        </div>

        <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-10">
          {language === "ro"
            ? `Scor ${data.rating}/5 din ${data.totalReviews} recenzii pe Google`
            : `${data.rating}/5 rating from ${data.totalReviews} reviews on Google`}
        </p>

        <div className="max-w-5xl mx-auto">
          {/* Score summary */}
          <div className="flex items-center justify-center gap-6 mb-10">
            <div className="text-5xl font-bold text-primary">{data.rating}</div>
            <div className="flex flex-col gap-1">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-5 h-5 ${s <= Math.round(data.rating) ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {data.totalReviews} {language === "ro" ? "recenzii" : "reviews"}
              </span>
            </div>
          </div>

          {/* Reviews grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.reviews.slice(0, 6).map((review, i) => (
              <div
                key={i}
                className="p-5 rounded-xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  {review.profile_photo_url ? (
                    <img
                      src={review.profile_photo_url}
                      alt={review.author_name}
                      className="w-10 h-10 rounded-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {review.author_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{review.author_name}</p>
                    <p className="text-xs text-muted-foreground">{review.relative_time_description}</p>
                  </div>
                </div>
                {renderStars(review.rating)}
                {review.text && (
                  <p className="mt-3 text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                    "{review.text}"
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-8">
            <a
              href="https://www.google.com/maps/place/?q=place_id:ChIJnfbKUqRZRUcRyGWCTcaFJ_U"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {language === "ro" ? "Vezi toate recenziile pe Google" : "See all reviews on Google"}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GoogleReviewsWidget;
