import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MessageSquare, User, Quote, Reply, Globe } from "lucide-react";
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
  source: string | null;
  guest_country: string | null;
  review_date: string | null;
  admin_reply: string | null;
  admin_reply_at: string | null;
}

const PropertyReviews = ({ propertyId, propertyName }: PropertyReviewsProps) => {
  const { language } = useLanguage();
  const dateLocale = language === "ro" ? ro : enUS;

  const t = language === "ro" ? {
    title: "Recenzii oaspeți",
    noReviews: "Încă nu există recenzii",
    noReviewsDesc: "Fii primul care lasă o recenzie pentru această proprietate!",
    basedOn: "pe baza a",
    reviews: "recenzii",
    verifiedGuest: "Oaspete verificat",
    hostReply: "Răspunsul gazdei",
    fromBooking: "Booking.com",
  } : {
    title: "Guest Reviews",
    noReviews: "No reviews yet",
    noReviewsDesc: "Be the first to leave a review for this property!",
    basedOn: "based on",
    reviews: "reviews",
    verifiedGuest: "Verified guest",
    hostReply: "Host reply",
    fromBooking: "Booking.com",
  };

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["property-reviews", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_reviews")
        .select("id, guest_name, rating, title, content, created_at, source, guest_country, review_date, admin_reply, admin_reply_at")
        .eq("property_id", propertyId)
        .eq("is_published", true)
        .order("review_date", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Review[];
    },
  });

  // Fetch official Booking.com rating & review count from live data
  const { data: officialStats } = useQuery({
    queryKey: ["property-official-stats", propertyId],
    queryFn: async () => {
      // Get slug from properties table
      const { data: prop } = await supabase
        .from("properties")
        .select("slug, booking_rating, booking_review_count")
        .eq("id", propertyId)
        .maybeSingle();

      if (!prop?.slug) return null;

      const { data: live } = await supabase
        .from("property_live_data")
        .select("rating, reviews_count")
        .eq("property_slug", prop.slug)
        .maybeSingle();

      return {
        rating: live?.rating ?? prop.booking_rating ?? null,
        reviewCount: live?.reviews_count ?? prop.booking_review_count ?? null,
      };
    },
  });

  // Use official Booking.com stats instead of calculating from imported reviews
  const averageRating = officialStats?.rating?.toFixed(1) ?? null;
  const totalReviewCount = officialStats?.reviewCount ?? reviews?.length ?? 0;

  const renderRatingBadge = (rating: number) => (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-sm font-bold">
      <Star className="w-3.5 h-3.5 fill-primary text-primary" />
      {rating.toFixed(1)}
    </span>
  );

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

  const reviewSchema = reviews && reviews.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": propertyName,
    "url": `https://realtrust.ro/proprietate/${propertyId}`,
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": averageRating,
      "reviewCount": totalReviewCount,
      "bestRating": 10,
      "worstRating": 1,
    },
    "review": reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      "author": { "@type": "Person", "name": r.guest_name },
      "datePublished": (r.review_date || r.created_at.split("T")[0]),
      "reviewBody": r.content || r.title || "",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": r.rating,
        "bestRating": 10,
      },
    })),
  } : null;

  return (
    <div className="space-y-6">
      {reviewSchema && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(reviewSchema)}</script>
        </Helmet>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-serif font-semibold text-foreground flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-primary" />
          {t.title}
        </h2>
        {averageRating && totalReviewCount > 0 && (
          <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full">
            <Star className="w-5 h-5 text-primary fill-primary" />
            <span className="font-bold text-foreground">{averageRating}</span>
            <span className="text-xs text-muted-foreground">/ 10</span>
            <span className="text-sm text-muted-foreground">
              {t.basedOn} {totalReviewCount} {t.reviews}
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
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{review.guest_name}</p>
                          {review.guest_country && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Globe className="w-3 h-3" />{review.guest_country}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {renderRatingBadge(review.rating)}
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(review.review_date || review.created_at), "d MMM yyyy", { locale: dateLocale })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {review.source === 'booking.com' && (
                          <span className="text-xs bg-[#003580]/10 text-[#003580] dark:bg-[#4a8fe7]/10 dark:text-[#4a8fe7] px-2 py-1 rounded-full font-medium">
                            {t.fromBooking}
                          </span>
                        )}
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-full">
                          ✓ {t.verifiedGuest}
                        </span>
                      </div>
                    </div>

                    {/* Title */}
                    {review.title && (
                      <p className="font-medium text-foreground mb-2">{review.title}</p>
                    )}

                    {/* Content */}
                    {review.content && review.content.replace(/\s*None\.?\s*$/gi, '').trim() && (
                      <div className="relative">
                        <Quote className="absolute -left-1 -top-1 w-4 h-4 text-primary/30" />
                        <p className="text-muted-foreground pl-4 italic">
                          "{review.content.replace(/\s*None\.?\s*$/gi, '').trim()}"
                        </p>
                      </div>
                    )}

                    {/* Host Reply */}
                    {review.admin_reply && review.admin_reply.replace(/^(Response from the property|Răspunsul proprietății)\s*:\s*/i, '').trim() && (
                      <div className="mt-4 ml-4 pl-4 border-l-2 border-primary/30 bg-primary/5 rounded-r-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Reply className="w-4 h-4 text-primary" />
                          <span className="text-sm font-semibold text-foreground">{t.hostReply}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {review.admin_reply.replace(/^(Response from the property|Răspunsul proprietății)\s*:\s*/i, '').trim()}
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
