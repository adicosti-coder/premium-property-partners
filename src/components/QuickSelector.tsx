import { useState, useRef } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Users, Home, ArrowRight, Phone, MessageCircle, Camera, X, Loader2, CheckCircle, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const QuickSelector = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    zone: "",
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const translations = {
    ro: {
      badge: "Alege direcția potrivită în 30 de secunde:",
      subtitle: "3 opțiuni. 0 confuzie. Context suficient ca să iei o decizie bună în 1–2 minute.",
      startRapid: "Cerere ofertă rapidă",
      startRapidText: "Trimite datele și primești o estimare realistă + pași concreți.",
      formLabels: {
        name: "Nume",
        namePlaceholder: "Numele tău",
        phone: "Telefon",
        phonePlaceholder: "07XX XXX XXX",
        zone: "Zonă / Cartier",
        zonePlaceholder: "Ex: Complexul Studențesc",
        photos: "Poze (8-12 recomandat)",
        addPhotos: "Adaugă poze",
        submit: "Trimite cererea",
        sending: "Se trimite...",
        success: "Cerere trimisă!",
        successMessage: "Te vom contacta în curând.",
        photosSelected: "poze selectate",
      },
      options: [
        {
          badge: "PROPRIETARI",
          badgeColor: "bg-primary/20 text-primary border-primary/30",
          action: "Recomandat",
          title: "Administrare completă în regim hotelier",
          description: "Preț dinamic, listări, oaspeți, curățenie, mentenanță, recenzii și raportare. Tu rămâi cu venitul și liniștea.",
          features: [
            "Poziționare + conversie (poze, titlu, descriere)",
            "Standard operațional (checklists, consumabile)",
            "Protecția activului (intervenții rapide)"
          ],
          cta: "Vreau ofertă",
          ctaSecondary: "Cum lucrăm",
          icon: Building,
          scrollTo: "contact"
        },
        {
          badge: "OASPEȚI",
          badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          action: "Rezervare",
          title: "Apartamente premium în Timișoara",
          description: "Self check-in, curățenie impecabilă, locații excelente. Vezi lista și rezervă ușor.",
          features: [
            "Instrucțiuni clare + suport rapid",
            "Standard hotel (lenjerii, prosoape)",
            "Locații ultracentrale / parcare"
          ],
          cta: "Vezi apartamente",
          ctaSecondary: "EN Guests",
          icon: Users,
          scrollTo: "oaspeti"
        },
        {
          badge: "IMOBILIARE",
          badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          action: "Investiții",
          title: "Cumperi pentru randament?",
          description: "Te ajutăm să alegi unități care 'țin' în regim hotelier: zonă, layout, parcare, risc.",
          features: [
            "Selecție unități + filtrare",
            "Scenarii de randament: chirie vs hotelier",
            "Plan minim amenajare pentru conversie"
          ],
          cta: "Merg la Imobiliare",
          ctaSecondary: "Cere consultanță",
          icon: Home,
          link: "/imobiliare"
        }
      ]
    },
    en: {
      badge: "Choose the right direction in 30 seconds:",
      subtitle: "3 options. 0 confusion. Enough context to make a good decision in 1–2 minutes.",
      startRapid: "Quick quote request",
      startRapidText: "Send your details and receive a realistic estimate + concrete steps.",
      formLabels: {
        name: "Name",
        namePlaceholder: "Your name",
        phone: "Phone",
        phonePlaceholder: "07XX XXX XXX",
        zone: "Zone / Neighborhood",
        zonePlaceholder: "E.g.: Student Complex",
        photos: "Photos (8-12 recommended)",
        addPhotos: "Add photos",
        submit: "Submit request",
        sending: "Sending...",
        success: "Request sent!",
        successMessage: "We will contact you soon.",
        photosSelected: "photos selected",
      },
      options: [
        {
          badge: "OWNERS",
          badgeColor: "bg-primary/20 text-primary border-primary/30",
          action: "Recommended",
          title: "Complete hotel-style management",
          description: "Dynamic pricing, listings, guests, cleaning, maintenance, reviews and reporting. You keep the income and peace of mind.",
          features: [
            "Positioning + conversion (photos, title, description)",
            "Operational standard (checklists, consumables)",
            "Asset protection (quick interventions)"
          ],
          cta: "Get an offer",
          ctaSecondary: "How we work",
          icon: Building,
          scrollTo: "contact"
        },
        {
          badge: "GUESTS",
          badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
          action: "Book",
          title: "Premium apartments in Timișoara",
          description: "Self check-in, impeccable cleaning, excellent locations. See the list and book easily.",
          features: [
            "Clear instructions + quick support",
            "Hotel standard (linens, towels)",
            "Central locations / parking"
          ],
          cta: "See apartments",
          ctaSecondary: "RO Oaspeți",
          icon: Users,
          scrollTo: "oaspeti"
        },
        {
          badge: "REAL ESTATE",
          badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          action: "Investments",
          title: "Buying for yield?",
          description: "We help you choose units that 'work' in hotel mode: area, layout, parking, risk.",
          features: [
            "Unit selection + filtering",
            "Yield scenarios: rent vs hotel",
            "Minimum renovation plan for conversion"
          ],
          cta: "Go to Real Estate",
          ctaSecondary: "Get consulting",
          icon: Home,
          link: "/imobiliare"
        }
      ]
    }
  };

  const t = translations[language];

  const handleOptionClick = (option: typeof t.options[0]) => {
    if (option.link) {
      navigate(option.link);
    } else if (option.scrollTo) {
      document.getElementById(option.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setPhotos(prev => [...prev, ...imageFiles].slice(0, 20));
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim() || !formData.zone.trim()) {
      toast({
        title: language === 'ro' ? "Completează toate câmpurile" : "Fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photos to storage if any
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `quick-requests/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, photo);
        
        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('property-images')
            .getPublicUrl(filePath);
          photoUrls.push(urlData.publicUrl);
        }
      }

      // Save to leads table with simulation_data containing the zone and photos info
      await supabase.from("leads").insert({
        name: formData.name.trim(),
        whatsapp_number: formData.phone.trim(),
        property_area: 0,
        property_type: "cerere_rapida",
        calculated_net_profit: 0,
        calculated_yearly_profit: 0,
        simulation_data: {
          zone: formData.zone.trim(),
          photoUrls,
          source: "quick_form",
        },
      });

      // Send notification
      try {
        await supabase.functions.invoke("send-lead-notification", {
          body: {
            name: formData.name.trim(),
            whatsappNumber: formData.phone.trim(),
            propertyArea: 0,
            propertyType: `Cerere rapidă - ${formData.zone.trim()}`,
            calculatedNetProfit: 0,
            calculatedYearlyProfit: 0,
            simulationData: {
              zone: formData.zone.trim(),
              photoCount: photos.length,
              photoUrls,
            },
          },
        });
      } catch (emailError) {
        console.error("Failed to send notification:", emailError);
      }

      setIsSuccess(true);
      toast({
        title: t.formLabels.success,
        description: t.formLabels.successMessage,
      });

      setTimeout(() => {
        setFormData({ name: "", phone: "", zone: "" });
        setPhotos([]);
        setIsSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error submitting quick form:", error);
      toast({
        title: language === 'ro' ? "Eroare" : "Error",
        description: language === 'ro' ? "Te rugăm să încerci din nou." : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 md:py-24 bg-card/50 border-y border-border/50">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-muted-foreground mb-4">{t.subtitle}</p>
        </div>

        {/* Quick Request Form */}
        <div className="max-w-3xl mx-auto mb-12 p-6 rounded-xl bg-primary/5 border border-primary/20">
          <h3 className="text-lg font-semibold text-foreground mb-2 text-center">
            {t.startRapid}
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {t.startRapidText}
          </p>

          {isSuccess ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
              <h4 className="text-lg font-semibold text-foreground mb-1">{t.formLabels.success}</h4>
              <p className="text-muted-foreground text-sm">{t.formLabels.successMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleQuickFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Input
                    placeholder={t.formLabels.namePlaceholder}
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    maxLength={100}
                    className="bg-background"
                  />
                </div>
                <div>
                  <Input
                    type="tel"
                    placeholder={t.formLabels.phonePlaceholder}
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    maxLength={20}
                    className="bg-background"
                  />
                </div>
                <div>
                  <Input
                    placeholder={t.formLabels.zonePlaceholder}
                    value={formData.zone}
                    onChange={(e) => setFormData(prev => ({ ...prev, zone: e.target.value }))}
                    maxLength={100}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.formLabels.photos}</span>
                  {photos.length > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {photos.length} {t.formLabels.photosSelected}
                    </span>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                
                <div className="flex flex-wrap gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors bg-background"
                  >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">+</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t.formLabels.sending}
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      {t.formLabels.submit}
                    </>
                  )}
                </Button>
                <div className="flex gap-2 justify-center">
                  <a 
                    href="https://wa.me/40723154520" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp
                  </a>
                  <a 
                    href="tel:+40723154520"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-sm font-medium transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Options Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {t.options.map((option, index) => {
            const Icon = option.icon;
            return (
              <div 
                key={index}
                className="group relative bg-card border border-border rounded-2xl p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Badge + Action */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${option.badgeColor}`}>
                    {option.badge}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">{option.action}</span>
                </div>

                {/* Icon */}
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-serif font-semibold text-foreground mb-2">
                  {option.title}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                  {option.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTAs */}
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={() => handleOptionClick(option)}
                    className="w-full group/btn"
                  >
                    {option.cta}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (option.scrollTo === 'contact') {
                        document.getElementById('cum-functioneaza')?.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                  >
                    {option.ctaSecondary}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default QuickSelector;
