import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare, User, Quote } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ro, enUS } from "date-fns/locale";

interface PropertyReviewsProps {
  propertyId: string;
  propertyName: string;
}

interface Review {
  id: string;
  guest_name: string;
  rating: number;
  title: string | null;
  content: string | null;
  created_at: string;
}

const PropertyReviews = ({ propertyId, propertyName }: PropertyReviewsProps) => {
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;

  const translations = {
    ro: {
      title: "Recenzii oaspeți",
      noReviews: "Încă nu există recenzii",
      noReviewsDesc: "Fii primul care lasă o recenzie pentru această proprietate!",
      basedOn: "pe baza a",
      reviews: "recenzii",
      verifiedGuest: "Oaspete verificat",
    },
    en: {
      title: "Guest Reviews",
      noReviews: "No reviews yet",
      noReviewsDesc: "Be the first to leave a review for this property!",
      basedOn: "based on",
      reviews: "reviews",
      verifiedGuest: "Verified guest",
    },
  };

  const t = translations[language] || translations.ro;

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["property-reviews", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_reviews")
        .select("*")
        .eq("property_id", propertyId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as Review[];
    },
  });

  const averageRating = reviews && reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating
                ? "text-amber-500 fill-amber-500"
                : "text-muted-foreground/30"
            }`}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with average rating */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          {t.title}
        </h2>
        {averageRating && reviews && reviews.length > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <Star className="w-5 h-5 text-primary fill-primary" />
            <span className="font-bold text-foreground">{averageRating}</span>
            <span className="text-sm text-muted-foreground">
              {t.basedOn} {reviews.length} {t.reviews}
            </span>
          </div>
        )}
      </div>

      {/* Reviews list */}
      {!reviews || reviews.length === 0 ? (
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <p className="font-medium text-foreground">{t.noReviews}</p>
            <p className="text-sm text-muted-foreground mt-1">{t.noReviewsDesc}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {reviews.map((review) => (
            <Card key={review.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <p className="font-semibold text-foreground">
                          {review.guest_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {renderStars(review.rating)}
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(review.created_at), "d MMM yyyy", { locale: dateLocale })}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full flex-shrink-0">
                        ✓ {t.verifiedGuest}
                      </span>
                    </div>

                    {/* Title */}
                    {review.title && (
                      <p className="font-medium text-foreground mb-2">
                        {review.title}
                      </p>
                    )}

                    {/* Content */}
                    {review.content && (
                      <div className="relative">
                        <Quote className="absolute -left-1 -top-1 w-4 h-4 text-primary/30" />
                        <p className="text-muted-foreground pl-4 italic">
                          "{review.content}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertyReviews;
