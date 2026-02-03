import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, Send, CheckCircle, Clock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import HCaptcha from "@hcaptcha/react-hcaptcha";

const RATE_LIMIT_KEY = "review_submissions";
const RATE_LIMIT_HOURS = 24; // 1 review per property per 24 hours
const MIN_FORM_TIME_SECONDS = 5; // Minimum time to fill form (anti-bot)

const reviewSchema = z.object({
  guest_name: z.string().trim().min(2, "Numele trebuie să aibă cel puțin 2 caractere").max(100, "Numele nu poate depăși 100 de caractere"),
  guest_email: z.string().trim().email("Email invalid").max(255, "Email-ul nu poate depăși 255 de caractere").optional().or(z.literal("")),
  title: z.string().trim().max(200, "Titlul nu poate depăși 200 de caractere").optional().or(z.literal("")),
  content: z.string().trim().min(10, "Review-ul trebuie să aibă cel puțin 10 caractere").max(2000, "Review-ul nu poate depăși 2000 de caractere"),
  // Honeypot field - should remain empty
  website: z.string().max(0, "").optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface GuestReviewFormProps {
  propertyId: string;
  propertyName: string;
}

interface RateLimitEntry {
  propertyId: string;
  timestamp: number;
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
    rateLimitTitle: "Ai trimis deja un review",
    rateLimitMessage: "Poți trimite un nou review pentru această proprietate peste",
    hours: "ore",
    minutes: "minute",
    tooFastError: "Te rugăm să completezi formularul mai încet.",
    captchaError: "Te rugăm să completezi verificarea de securitate.",
    captchaVerifying: "Se verifică...",
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
    rateLimitTitle: "You already submitted a review",
    rateLimitMessage: "You can submit a new review for this property in",
    hours: "hours",
    minutes: "minutes",
    tooFastError: "Please fill out the form more slowly.",
    captchaError: "Please complete the security verification.",
    captchaVerifying: "Verifying...",
  },
};

// Rate limiting utilities
const getRateLimitData = (): RateLimitEntry[] => {
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const setRateLimitData = (entries: RateLimitEntry[]) => {
  try {
    // Clean old entries (older than RATE_LIMIT_HOURS)
    const now = Date.now();
    const validEntries = entries.filter(
      (e) => now - e.timestamp < RATE_LIMIT_HOURS * 60 * 60 * 1000
    );
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(validEntries));
  } catch {
    // Ignore localStorage errors
  }
};

const checkRateLimit = (propertyId: string): { limited: boolean; remainingMs: number } => {
  const entries = getRateLimitData();
  const now = Date.now();
  const limitMs = RATE_LIMIT_HOURS * 60 * 60 * 1000;
  
  const existingEntry = entries.find((e) => e.propertyId === propertyId);
  
  if (existingEntry) {
    const elapsed = now - existingEntry.timestamp;
    if (elapsed < limitMs) {
      return { limited: true, remainingMs: limitMs - elapsed };
    }
  }
  
  return { limited: false, remainingMs: 0 };
};

const recordSubmission = (propertyId: string) => {
  const entries = getRateLimitData();
  const now = Date.now();
  
  // Remove old entry for this property if exists
  const filteredEntries = entries.filter((e) => e.propertyId !== propertyId);
  
  // Add new entry
  filteredEntries.push({ propertyId, timestamp: now });
  
  setRateLimitData(filteredEntries);
};

const formatRemainingTime = (ms: number, t: typeof translations.ro) => {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.ceil((ms % (60 * 60 * 1000)) / (60 * 1000));
  
  if (hours > 0) {
    return `${hours} ${t.hours}`;
  }
  return `${minutes} ${t.minutes}`;
};

const GuestReviewForm = ({ propertyId, propertyName }: GuestReviewFormProps) => {
  const { language } = useLanguage();
  const t = translations[language];
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [isVerifyingCaptcha, setIsVerifyingCaptcha] = useState(false);
  const [hcaptchaSiteKey, setHcaptchaSiteKey] = useState<string | null>(null);
  const formLoadTime = useRef(Date.now());
  const captchaRef = useRef<HCaptcha>(null);

  // Fetch hCaptcha site key on mount
  useEffect(() => {
    const fetchSiteKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-hcaptcha-site-key");
        if (!error && data?.siteKey) {
          setHcaptchaSiteKey(data.siteKey);
        }
      } catch (err) {
        console.error("Failed to fetch hCaptcha site key:", err);
      }
    };
    fetchSiteKey();
  }, []);

  // Check rate limit on mount
  useEffect(() => {
    const { limited, remainingMs } = checkRateLimit(propertyId);
    setIsRateLimited(limited);
    setRemainingTime(remainingMs);
    
    // Reset form load time
    formLoadTime.current = Date.now();
  }, [propertyId]);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      guest_name: "",
      guest_email: "",
      title: "",
      content: "",
      website: "", // Honeypot
    },
  });

  const handleCaptchaVerify = useCallback((token: string) => {
    setCaptchaToken(token);
  }, []);

  const handleCaptchaExpire = useCallback(() => {
    setCaptchaToken(null);
  }, []);

  const verifyCaptchaOnServer = async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-hcaptcha", {
        body: { token, formType: 'guest_review_form' },
      });
      
      if (error) {
        console.error("Captcha verification error:", error);
        return false;
      }
      
      return data?.success === true;
    } catch (err) {
      console.error("Failed to verify captcha:", err);
      return false;
    }
  };

  const onSubmit = async (data: ReviewFormData) => {
    // Check honeypot - if filled, silently "succeed" (bot trap)
    if (data.website && data.website.length > 0) {
      console.log("Honeypot triggered - likely bot");
      setIsSubmitted(true);
      return;
    }

    // Check minimum form fill time (anti-bot)
    const timeSpent = Date.now() - formLoadTime.current;
    if (timeSpent < MIN_FORM_TIME_SECONDS * 1000) {
      toast({
        title: t.errorTitle,
        description: t.tooFastError,
        variant: "destructive",
      });
      return;
    }

    // Check rate limit again before submission
    const { limited, remainingMs } = checkRateLimit(propertyId);
    if (limited) {
      setIsRateLimited(true);
      setRemainingTime(remainingMs);
      toast({
        title: t.rateLimitTitle,
        description: `${t.rateLimitMessage} ${formatRemainingTime(remainingMs, t)}.`,
        variant: "destructive",
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: t.errorTitle,
        description: t.selectRating,
        variant: "destructive",
      });
      return;
    }

    // Check captcha
    if (!captchaToken) {
      toast({
        title: t.errorTitle,
        description: t.captchaError,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setIsVerifyingCaptcha(true);

    // Verify captcha on server
    const captchaValid = await verifyCaptchaOnServer(captchaToken);
    setIsVerifyingCaptcha(false);

    if (!captchaValid) {
      toast({
        title: t.errorTitle,
        description: t.captchaError,
        variant: "destructive",
      });
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
      setIsSubmitting(false);
      return;
    }

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

      // Record successful submission for rate limiting
      recordSubmission(propertyId);

      // Send email notification to admins (fire and forget)
      supabase.functions.invoke("send-review-notification", {
        body: {
          propertyName,
          guestName: data.guest_name,
          rating,
          title: data.title || undefined,
          content: data.content,
          guestEmail: data.guest_email || undefined,
        },
      }).catch((err) => console.error("Failed to send review notification:", err));

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

  // Rate limited state
  if (isRateLimited) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center py-8">
            <Clock className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">{t.rateLimitTitle}</h3>
            <p className="text-muted-foreground">
              {t.rateLimitMessage} {formatRemainingTime(remainingTime, t)}.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            {/* Honeypot field - hidden from real users */}
            <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input tabIndex={-1} autoComplete="off" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

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

            {/* hCaptcha widget */}
            {hcaptchaSiteKey ? (
              <div className="flex flex-col items-center gap-2">
                <HCaptcha
                  ref={captchaRef}
                  sitekey={hcaptchaSiteKey}
                  onVerify={handleCaptchaVerify}
                  onExpire={handleCaptchaExpire}
                  languageOverride={language}
                />
                {captchaToken && (
                  <div className="flex items-center gap-1 text-sm text-primary">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{language === "ro" ? "Verificat" : "Verified"}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-4">
                <div className="animate-pulse text-muted-foreground text-sm">
                  {language === "ro" ? "Se încarcă verificarea..." : "Loading verification..."}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || !captchaToken || !hcaptchaSiteKey}>
              {isSubmitting ? (
                isVerifyingCaptcha ? t.captchaVerifying : t.submitting
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
