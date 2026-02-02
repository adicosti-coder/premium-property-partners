import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/i18n/LanguageContext";
import { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ConfettiEffect from "@/components/ConfettiEffect";
import UserReferralsList from "@/components/UserReferralsList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Gift, 
  Users, 
  Home, 
  Calendar, 
  CheckCircle, 
  ArrowRight,
  Star,
  Shield,
  Heart,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import GlobalConversionWidgets from "@/components/GlobalConversionWidgets";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import UrgencyTimer from "@/components/UrgencyTimer";

const formSchema = z.object({
  referrerName: z.string().min(2, "Numele trebuie să aibă cel puțin 2 caractere"),
  referrerEmail: z.string().email("Email invalid"),
  referrerPhone: z.string().optional(),
  ownerName: z.string().min(2, "Numele proprietarului trebuie să aibă cel puțin 2 caractere"),
  ownerEmail: z.string().email("Email-ul proprietarului este invalid"),
  ownerPhone: z.string().min(10, "Telefonul trebuie să aibă cel puțin 10 caractere"),
  propertyLocation: z.string().optional(),
  propertyType: z.string().optional(),
  propertyRooms: z.string().optional(),
  ownerMessage: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const ReferralProgram = () => {
  const { language } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const t = {
    ro: {
      heroTitle: "Recomandă un Proprietar",
      heroHighlight: "Câștigă un Weekend Gratuit",
      heroSubtitle: "Cunoști pe cineva cu un apartament perfect pentru închiriere în regim hotelier? Recomandă-l și primești un weekend de cazare gratuit în unul din apartamentele noastre premium!",
      howItWorks: "Cum Funcționează",
      step1Title: "Recomanzi",
      step1Desc: "Completează formularul cu datele proprietarului pe care îl recomanzi",
      step2Title: "Contactăm",
      step2Desc: "Echipa noastră contactează proprietarul și evaluează apartamentul",
      step3Title: "Semnare",
      step3Desc: "Dacă proprietarul semnează contractul de administrare",
      step4Title: "Premiu",
      step4Desc: "Primești un weekend gratuit în orice apartament din portofoliul nostru!",
      formTitle: "Trimite o Recomandare",
      formSubtitle: "Completează datele și noi ne ocupăm de rest",
      yourInfo: "Datele Tale",
      ownerInfo: "Datele Proprietarului",
      propertyInfo: "Detalii Proprietate (opțional)",
      yourName: "Numele tău",
      yourEmail: "Email-ul tău",
      yourPhone: "Telefonul tău (opțional)",
      ownerName: "Numele proprietarului",
      ownerEmail: "Email-ul proprietarului",
      ownerPhone: "Telefonul proprietarului",
      propertyLocation: "Zonă / Oraș",
      propertyType: "Tip proprietate",
      propertyRooms: "Număr camere",
      message: "Mesaj adițional",
      messagePlaceholder: "Orice detalii suplimentare care ne-ar ajuta...",
      submit: "Trimite Recomandarea",
      submitting: "Se trimite...",
      successTitle: "Recomandare Trimisă cu Succes! 🎉",
      successMessage: "Te vom contacta în curând cu detalii despre statusul recomandării tale.",
      submitAnother: "Trimite altă recomandare",
      terms: "Prin trimiterea acestui formular, confirmi că ai acordul proprietarului să ne transmiți datele sale de contact.",
      prizeTitle: "Premiul Tău",
      prizeDesc: "Weekend gratuit (2 nopți) în oricare dintre apartamentele noastre premium din Timișoara",
      prizeValue: "Valoare: până la 300€",
      apartment: "Apartament",
      studio: "Studio",
      house: "Casă",
      selectType: "Selectează tipul",
      selectRooms: "Selectează",
      whyRefer: "De Ce Să Recomanzi?",
      benefit1: "Ajuți un prieten să obțină venituri pasive",
      benefit2: "Primești un weekend gratuit de vis",
      benefit3: "Contribui la comunitatea RealTrust",
      trustTitle: "Program de Încredere",
      trustDesc: "Peste 50 de proprietari mulțumiți ne-au recomandat prietenilor lor",
    },
    en: {
      heroTitle: "Refer an Owner",
      heroHighlight: "Win a Free Weekend",
      heroSubtitle: "Know someone with an apartment perfect for short-term rental? Refer them and get a free weekend stay in one of our premium apartments!",
      howItWorks: "How It Works",
      step1Title: "Refer",
      step1Desc: "Fill out the form with the owner's details you're recommending",
      step2Title: "We Contact",
      step2Desc: "Our team contacts the owner and evaluates the apartment",
      step3Title: "Signing",
      step3Desc: "If the owner signs the management contract",
      step4Title: "Reward",
      step4Desc: "You get a free weekend in any apartment from our portfolio!",
      formTitle: "Submit a Referral",
      formSubtitle: "Fill in the details and we'll take care of the rest",
      yourInfo: "Your Information",
      ownerInfo: "Owner's Information",
      propertyInfo: "Property Details (optional)",
      yourName: "Your name",
      yourEmail: "Your email",
      yourPhone: "Your phone (optional)",
      ownerName: "Owner's name",
      ownerEmail: "Owner's email",
      ownerPhone: "Owner's phone",
      propertyLocation: "Area / City",
      propertyType: "Property type",
      propertyRooms: "Number of rooms",
      message: "Additional message",
      messagePlaceholder: "Any additional details that would help us...",
      submit: "Submit Referral",
      submitting: "Submitting...",
      successTitle: "Referral Submitted Successfully! 🎉",
      successMessage: "We'll contact you soon with details about your referral status.",
      submitAnother: "Submit another referral",
      terms: "By submitting this form, you confirm that you have the owner's consent to share their contact details.",
      prizeTitle: "Your Prize",
      prizeDesc: "Free weekend (2 nights) in any of our premium apartments in Timișoara",
      prizeValue: "Value: up to €300",
      apartment: "Apartment",
      studio: "Studio",
      house: "House",
      selectType: "Select type",
      selectRooms: "Select",
      whyRefer: "Why Refer?",
      benefit1: "Help a friend earn passive income",
      benefit2: "Get a dream free weekend",
      benefit3: "Contribute to the RealTrust community",
      trustTitle: "Trust Program",
      trustDesc: "Over 50 satisfied owners have recommended us to their friends",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      referrerName: "",
      referrerEmail: "",
      referrerPhone: "",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      propertyLocation: "",
      propertyType: "",
      propertyRooms: "",
      ownerMessage: "",
    },
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        form.setValue("referrerEmail", session.user.email || "");
      }
    });
  }, [form]);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.functions.invoke("submit-referral", {
        body: {
          referrerName: data.referrerName,
          referrerEmail: data.referrerEmail,
          referrerPhone: data.referrerPhone || undefined,
          ownerName: data.ownerName,
          ownerEmail: data.ownerEmail,
          ownerPhone: data.ownerPhone,
          ownerMessage: data.ownerMessage || undefined,
          propertyLocation: data.propertyLocation || undefined,
          propertyType: data.propertyType || undefined,
          propertyRooms: data.propertyRooms ? parseInt(data.propertyRooms) : undefined,
        },
      });

      if (error) throw error;

      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
      setIsSubmitted(true);
      toast.success(language === "ro" ? "Recomandare trimisă!" : "Referral submitted!");
    } catch (error) {
      console.error("Error submitting referral:", error);
      toast.error(language === "ro" ? "Eroare la trimitere" : "Submission error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    form.reset();
    setIsSubmitted(false);
  };

  const steps = [
    { icon: Users, title: text.step1Title, desc: text.step1Desc },
    { icon: Phone, title: text.step2Title, desc: text.step2Desc },
    { icon: CheckCircle, title: text.step3Title, desc: text.step3Desc },
    { icon: Gift, title: text.step4Title, desc: text.step4Desc },
  ];

  const seoContent = {
    ro: {
      title: "Program Recomandare | Câștigă o Noapte Gratuită | RealTrust",
      description: "Recomandă un proprietar și câștigă o noapte gratuită de cazare. Program exclusiv RealTrust & ApArt Hotel."
    },
    en: {
      title: "Referral Program | Win a Free Night | RealTrust",
      description: "Refer a property owner and win a free night stay. Exclusive RealTrust & ApArt Hotel program."
    }
  };

  const seo = seoContent[language as keyof typeof seoContent] || seoContent.ro;

  const breadcrumbItems = [
    { label: language === "ro" ? "Program Recomandare" : "Referral Program" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={seo.title}
        description={seo.description}
        url="https://realtrust.ro/recomanda-proprietar"
      />
      <Header />
      <ConfettiEffect isActive={showConfetti} duration={4000} particleCount={80} />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-6 pt-24">
        <PageBreadcrumb items={breadcrumbItems} />
      </div>
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-b from-primary/5 via-primary/10 to-background relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 border-amber-500/30">
              <Sparkles className="w-3 h-3 mr-1" />
              Program de Referral Premium
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-4">
              {text.heroTitle},{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">
                {text.heroHighlight}
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              {text.heroSubtitle}
            </p>

            {/* Urgency Timer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="max-w-sm mx-auto mb-6"
            >
              <UrgencyTimer variant="default" />
            </motion.div>

            {/* Prize Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="inline-block"
            >
              <Card className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border-amber-500/30 shadow-lg max-w-md mx-auto">
                <CardContent className="p-6 text-center">
                  <Gift className="w-12 h-12 mx-auto mb-3 text-amber-500" />
                  <h3 className="text-xl font-bold text-foreground mb-2">{text.prizeTitle}</h3>
                  <p className="text-muted-foreground mb-3">{text.prizeDesc}</p>
                  <Badge className="bg-amber-500 text-white">
                    {text.prizeValue}
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-serif font-bold text-center text-foreground mb-12">
            {text.howItWorks}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="relative h-full text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-8 pb-6">
                    {/* Step number */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    
                    <step.icon className="w-10 h-10 mx-auto mb-4 text-primary" />
                    <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.desc}</p>
                    
                    {index < steps.length - 1 && (
                      <ArrowRight className="hidden md:block absolute top-1/2 -right-3 w-6 h-6 text-muted-foreground/30" />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Form Section */}
      <section className="py-16">
        <div className="container mx-auto px-6 max-w-4xl">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Sidebar Benefits */}
            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500" />
                    {text.whyRefer}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[text.benefit1, text.benefit2, text.benefit3].map((benefit, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Star className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Shield className="w-8 h-8 text-primary" />
                    <div>
                      <h4 className="font-semibold text-foreground">{text.trustTitle}</h4>
                      <p className="text-xs text-muted-foreground">{text.trustDesc}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Form */}
            <div className="md:col-span-2">
              {isSubmitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="w-16 h-16 mx-auto mb-4 text-emerald-500" />
                      <h2 className="text-2xl font-bold text-foreground mb-2">{text.successTitle}</h2>
                      <p className="text-muted-foreground mb-6">{text.successMessage}</p>
                      <Button onClick={handleReset} variant="outline">
                        {text.submitAnother}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>{text.formTitle}</CardTitle>
                    <CardDescription>{text.formSubtitle}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Your Info Section */}
                        <div className="space-y-4">
                          <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            {text.yourInfo}
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="referrerName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{text.yourName}</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="referrerEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{text.yourEmail}</FormLabel>
                                  <FormControl>
                                    <Input type="email" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="referrerPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{text.yourPhone}</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Owner Info Section */}
                        <div className="space-y-4 pt-4 border-t">
                          <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <Home className="w-4 h-4" />
                            {text.ownerInfo}
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="ownerName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{text.ownerName}</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="ownerEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{text.ownerEmail}</FormLabel>
                                  <FormControl>
                                    <Input type="email" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="ownerPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{text.ownerPhone}</FormLabel>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Property Info Section */}
                        <div className="space-y-4 pt-4 border-t">
                          <h3 className="font-semibold text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {text.propertyInfo}
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name="propertyLocation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{text.propertyLocation}</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Timișoara, Centru" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="propertyType"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{text.propertyType}</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={text.selectType} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="studio">{text.studio}</SelectItem>
                                      <SelectItem value="apartment">{text.apartment}</SelectItem>
                                      <SelectItem value="house">{text.house}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="propertyRooms"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{text.propertyRooms}</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={text.selectRooms} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="1">1</SelectItem>
                                      <SelectItem value="2">2</SelectItem>
                                      <SelectItem value="3">3</SelectItem>
                                      <SelectItem value="4">4+</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="ownerMessage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{text.message}</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder={text.messagePlaceholder}
                                    className="min-h-[80px]"
                                    {...field} 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        {/* Terms */}
                        <p className="text-xs text-muted-foreground text-center">
                          {text.terms}
                        </p>

                        {/* Submit Button */}
                        <Button 
                          type="submit" 
                          className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600" 
                          size="lg"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {text.submitting}
                            </>
                          ) : (
                            <>
                              <Gift className="w-4 h-4" />
                              {text.submit}
                            </>
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* User's Referrals Section - Only for authenticated users */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12"
            >
              <UserReferralsList userEmail={user.email || ""} userId={user.id} />
            </motion.div>
          )}
        </div>
      </section>

      <Footer />
      <GlobalConversionWidgets showMobileCTA={false} />
      <BackToTop />
    </div>
  );
};

export default ReferralProgram;