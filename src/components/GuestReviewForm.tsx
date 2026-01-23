import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";

const reviewSchema = z.object({
  guest_name: z.string().trim().min(2, "Numele trebuie să aibă cel puțin 2 caractere").max(100, "Numele nu poate depăși 100 de caractere"),
  guest_email: z.string().trim().email("Email invalid").max(255, "Email-ul nu poate depăși 255 de caractere").optional().or(z.literal("")),
  title: z.string().trim().max(200, "Titlul nu poate depăși 200 de caractere").optional().or(z.literal("")),
  content: z.string().trim().min(10, "Review-ul trebuie să aibă cel puțin 10 caractere").max(2000, "Review-ul nu poate depăși 2000 de caractere"),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface GuestReviewFormProps {
  propertyId: string;
  propertyName: string;
}

const translations = {
  ro: {
    title: "Lasă un review",
    description: "Împărtășește experiența ta cu alți oaspeți",
    namePlaceholder: "Numele tău",
    nameLabel: "Nume *",
    emailLabel: "Email (opțional)",
    emailPlaceholder: "email@exemplu.com",
    ratingLabel: "Rating *",
    titleLabel: "Titlu (opțional)",
    titlePlaceholder: "Rezumă experiența ta",
    contentLabel: "Review *",
    contentPlaceholder: "Descrie experiența ta la această proprietate...",
    submit: "Trimite review",
    submitting: "Se trimite...",
    successTitle: "Mulțumim!",
    successMessage: "Review-ul tău a fost trimis și va fi publicat după aprobare.",
    errorTitle: "Eroare",
    errorMessage: "Nu am putut trimite review-ul. Te rugăm să încerci din nou.",
    selectRating: "Selectează un rating",
  },
  en: {
    title: "Leave a Review",
    description: "Share your experience with other guests",
    namePlaceholder: "Your name",
    nameLabel: "Name *",
    emailLabel: "Email (optional)",
    emailPlaceholder: "email@example.com",
    ratingLabel: "Rating *",
    titleLabel: "Title (optional)",
    titlePlaceholder: "Summarize your experience",
    contentLabel: "Review *",
    contentPlaceholder: "Describe your experience at this property...",
    submit: "Submit Review",
    submitting: "Submitting...",
    successTitle: "Thank you!",
    successMessage: "Your review has been submitted and will be published after approval.",
    errorTitle: "Error",
    errorMessage: "Could not submit review. Please try again.",
    selectRating: "Select a rating",
  },
};

const GuestReviewForm = ({ propertyId, propertyName }: GuestReviewFormProps) => {
  const { language } = useLanguage();
  const t = translations[language];
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      guest_name: "",
      guest_email: "",
      title: "",
      content: "",
    },
  });

  const onSubmit = async (data: ReviewFormData) => {
    if (rating === 0) {
      toast({
        title: t.errorTitle,
        description: t.selectRating,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("property_reviews").insert({
        property_id: propertyId,
        guest_name: data.guest_name,
        guest_email: data.guest_email || null,
        title: data.title || null,
        content: data.content,
        rating: rating,
        is_published: false,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: t.successTitle,
        description: t.successMessage,
      });
    } catch (error) {
      console.error("Error submitting review:", error);
      toast({
        title: t.errorTitle,
        description: t.errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <CheckCircle className="w-16 h-16 text-primary mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">{t.successTitle}</h3>
            <p className="text-muted-foreground">{t.successMessage}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Rating Stars */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.ratingLabel}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    aria-label={`Rate ${star} stars`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="guest_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.nameLabel}</FormLabel>
                    <FormControl>
                      <Input placeholder={t.namePlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="guest_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.emailLabel}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder={t.emailPlaceholder} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.titleLabel}</FormLabel>
                  <FormControl>
                    <Input placeholder={t.titlePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.contentLabel}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t.contentPlaceholder}
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                t.submitting
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t.submit}
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default GuestReviewForm;
