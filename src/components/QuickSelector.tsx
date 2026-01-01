import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Users, Home, ArrowRight, Phone, MessageCircle, Camera, X, Loader2, CheckCircle, Upload, GripVertical, Star, AlertCircle, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { compressImages } from "@/utils/imageCompression";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Photo Item Component
interface SortablePhotoItemProps {
  id: string;
  photo: File;
  index: number;
  onRemove: (index: number) => void;
  onSetPrimary: (index: number) => void;
  isPrimary: boolean;
}

const SortablePhotoItem = ({ id, photo, index, onRemove, onSetPrimary, isPrimary }: SortablePhotoItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const photoUrl = useMemo(() => URL.createObjectURL(photo), [photo]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-16 h-16 rounded-lg overflow-hidden group ${isDragging ? 'ring-2 ring-primary shadow-lg' : ''} ${isPrimary ? 'ring-2 ring-yellow-400' : ''}`}
    >
      <img
        src={photoUrl}
        alt={`Preview ${index + 1}`}
        className="w-full h-full object-cover"
      />
      {/* Primary badge */}
      {isPrimary && (
        <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-[8px] font-bold px-1 rounded-br">
          1
        </div>
      )}
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-0 left-0 w-full h-5 bg-gradient-to-b from-black/50 to-transparent flex items-start justify-center cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-3 h-3 text-white/80" />
      </div>
      {/* Set as primary button */}
      {!isPrimary && (
        <button
          type="button"
          onClick={() => onSetPrimary(index)}
          className="absolute bottom-0 left-0 w-5 h-5 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-tr-md"
          title="Set as primary"
        >
          <Star className="w-3 h-3 text-yellow-400" />
        </button>
      )}
      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="absolute bottom-0 right-0 w-5 h-5 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-tl-md"
      >
        <X className="w-3 h-3 text-white" />
      </button>
    </div>
  );
};

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
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [errors, setErrors] = useState<{ name?: string; phone?: string; zone?: string; photos?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean; phone?: boolean; zone?: boolean }>({});
  const [validFields, setValidFields] = useState<{ name?: boolean; phone?: boolean; zone?: boolean }>({});
  const [shakeFields, setShakeFields] = useState<{ name?: boolean; phone?: boolean; zone?: boolean }>({});

  const MAX_PHOTO_SIZE_MB = 5;
  const MAX_PHOTOS = 20;

  // Debounce helper
  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
  };

  const debouncedName = useDebounce(formData.name, 400);
  const debouncedPhone = useDebounce(formData.phone, 400);
  const debouncedZone = useDebounce(formData.zone, 400);

  // Real-time validation
  const validateField = useCallback((field: 'name' | 'phone' | 'zone', value: string) => {
    if (field === 'name') {
      if (!value.trim()) {
        return language === 'ro' ? 'Numele este obligatoriu' : 'Name is required';
      }
      if (value.trim().length < 2) {
        return language === 'ro' ? 'Numele trebuie să aibă cel puțin 2 caractere' : 'Name must be at least 2 characters';
      }
      return null;
    }
    
    if (field === 'phone') {
      const phoneRegex = /^(\+40|0)[0-9]{9}$/;
      const cleanPhone = value.replace(/\s/g, '');
      if (!cleanPhone) {
        return language === 'ro' ? 'Telefonul este obligatoriu' : 'Phone is required';
      }
      if (!phoneRegex.test(cleanPhone)) {
        return language === 'ro' ? 'Format invalid (ex: 07XX XXX XXX)' : 'Invalid format (e.g.: 07XX XXX XXX)';
      }
      return null;
    }
    
    if (field === 'zone') {
      if (!value.trim()) {
        return language === 'ro' ? 'Zona este obligatorie' : 'Zone is required';
      }
      if (value.trim().length < 3) {
        return language === 'ro' ? 'Zona trebuie să aibă cel puțin 3 caractere' : 'Zone must be at least 3 characters';
      }
      return null;
    }
    
    return null;
  }, [language]);

  // Run validation on debounced values
  useEffect(() => {
    if (touched.name) {
      const error = validateField('name', debouncedName);
      setErrors(prev => ({ ...prev, name: error || undefined }));
      setValidFields(prev => ({ ...prev, name: !error && debouncedName.trim().length >= 2 }));
    }
  }, [debouncedName, touched.name, validateField]);

  useEffect(() => {
    if (touched.phone) {
      const error = validateField('phone', debouncedPhone);
      setErrors(prev => ({ ...prev, phone: error || undefined }));
      setValidFields(prev => ({ ...prev, phone: !error && debouncedPhone.replace(/\s/g, '').length >= 10 }));
    }
  }, [debouncedPhone, touched.phone, validateField]);

  useEffect(() => {
    if (touched.zone) {
      const error = validateField('zone', debouncedZone);
      setErrors(prev => ({ ...prev, zone: error || undefined }));
      setValidFields(prev => ({ ...prev, zone: !error && debouncedZone.trim().length >= 3 }));
    }
  }, [debouncedZone, touched.zone, validateField]);

  const validateForm = () => {
    // Mark all fields as touched
    setTouched({ name: true, phone: true, zone: true });
    
    const nameError = validateField('name', formData.name);
    const phoneError = validateField('phone', formData.phone);
    const zoneError = validateField('zone', formData.zone);
    
    const newErrors = {
      name: nameError || undefined,
      phone: phoneError || undefined,
      zone: zoneError || undefined,
    };
    
    setErrors(newErrors);
    setValidFields({
      name: !nameError,
      phone: !phoneError,
      zone: !zoneError,
    });
    
    return !nameError && !phoneError && !zoneError;
  };
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

  const [isCompressing, setIsCompressing] = useState(false);

  // DnD sensors and photo IDs
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const photoIds = useMemo(() => 
    photos.map((_, index) => `photo-${index}`), 
    [photos.length]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = photoIds.indexOf(active.id as string);
      const newIndex = photoIds.indexOf(over.id as string);
      setPhotos((items) => arrayMove(items, oldIndex, newIndex));
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) return;
    
    // Check max photos limit before processing
    if (photos.length + imageFiles.length > MAX_PHOTOS) {
      setErrors(prev => ({
        ...prev,
        photos: language === 'ro' 
          ? `Maxim ${MAX_PHOTOS} poze permise` 
          : `Maximum ${MAX_PHOTOS} photos allowed`
      }));
      return;
    }
    
    setIsCompressing(true);
    setErrors(prev => ({ ...prev, photos: undefined }));
    
    try {
      // Compress all images automatically
      const compressedFiles = await compressImages(imageFiles, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        outputType: 'image/webp'
      });
      
      // Check if any compressed file still exceeds limit (edge case)
      const stillOversized = compressedFiles.filter(file => file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024);
      if (stillOversized.length > 0) {
        setErrors(prev => ({
          ...prev,
          photos: language === 'ro' 
            ? `${stillOversized.length} poze sunt prea mari chiar și după compresie` 
            : `${stillOversized.length} photos are too large even after compression`
        }));
        // Still add the ones that fit
        const validFiles = compressedFiles.filter(file => file.size <= MAX_PHOTO_SIZE_MB * 1024 * 1024);
        setPhotos(prev => [...prev, ...validFiles].slice(0, MAX_PHOTOS));
      } else {
        setPhotos(prev => [...prev, ...compressedFiles].slice(0, MAX_PHOTOS));
        toast({
          title: language === 'ro' ? "Poze comprimate" : "Photos compressed",
          description: language === 'ro' 
            ? `${compressedFiles.length} poze optimizate automat` 
            : `${compressedFiles.length} photos automatically optimized`,
        });
      }
    } catch (error) {
      console.error("Compression error:", error);
      setErrors(prev => ({
        ...prev,
        photos: language === 'ro' ? "Eroare la procesarea pozelor" : "Error processing photos"
      }));
    } finally {
      setIsCompressing(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const setAsPrimary = (index: number) => {
    if (index === 0) return; // Already primary
    setPhotos(prev => {
      const newPhotos = [...prev];
      const [photo] = newPhotos.splice(index, 1);
      newPhotos.unshift(photo);
      return newPhotos;
    });
  };

  const handleQuickFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Trigger shake animation on error fields
      const nameError = validateField('name', formData.name);
      const phoneError = validateField('phone', formData.phone);
      const zoneError = validateField('zone', formData.zone);
      
      setShakeFields({
        name: !!nameError,
        phone: !!phoneError,
        zone: !!zoneError,
      });
      
      // Clear shake after animation completes
      setTimeout(() => setShakeFields({}), 500);
      
      toast({
        title: language === 'ro' ? "Verifică câmpurile" : "Check the fields",
        description: language === 'ro' ? "Corectează erorile de mai sus" : "Fix the errors above",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload photos to storage if any
      const photoUrls: string[] = [];
      const totalPhotos = photos.length;
      setUploadProgress({ current: 0, total: totalPhotos });
      
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
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
        
        setUploadProgress({ current: i + 1, total: totalPhotos });
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
        setUploadProgress({ current: 0, total: 0 });
        setTouched({});
        setValidFields({});
        setErrors({});
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
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      placeholder={t.formLabels.namePlaceholder}
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                      }}
                      onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                      maxLength={100}
                      className={`bg-background pr-8 transition-colors ${
                        errors.name ? 'border-red-500 focus-visible:ring-red-500' : 
                        validFields.name ? 'border-green-500 focus-visible:ring-green-500' : ''
                      } ${shakeFields.name ? 'animate-shake' : ''}`}
                    />
                    {touched.name && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {errors.name ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : validFields.name ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {errors.name && touched.name && (
                    <p className="text-xs text-red-500 flex items-center gap-1 animate-fade-in">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      type="tel"
                      placeholder={t.formLabels.phonePlaceholder}
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, phone: e.target.value }));
                      }}
                      onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                      maxLength={20}
                      className={`bg-background pr-8 transition-colors ${
                        errors.phone ? 'border-red-500 focus-visible:ring-red-500' : 
                        validFields.phone ? 'border-green-500 focus-visible:ring-green-500' : ''
                      } ${shakeFields.phone ? 'animate-shake' : ''}`}
                    />
                    {touched.phone && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {errors.phone ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : validFields.phone ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {errors.phone && touched.phone && (
                    <p className="text-xs text-red-500 flex items-center gap-1 animate-fade-in">
                      {errors.phone}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      placeholder={t.formLabels.zonePlaceholder}
                      value={formData.zone}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, zone: e.target.value }));
                      }}
                      onBlur={() => setTouched(prev => ({ ...prev, zone: true }))}
                      maxLength={100}
                      className={`bg-background pr-8 transition-colors ${
                        errors.zone ? 'border-red-500 focus-visible:ring-red-500' : 
                        validFields.zone ? 'border-green-500 focus-visible:ring-green-500' : ''
                      } ${shakeFields.zone ? 'animate-shake' : ''}`}
                    />
                    {touched.zone && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {errors.zone ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : validFields.zone ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {errors.zone && touched.zone && (
                    <p className="text-xs text-red-500 flex items-center gap-1 animate-fade-in">
                      {errors.zone}
                    </p>
                  )}
                </div>
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">
                    {t.formLabels.photos} 
                    <span className="text-xs ml-1 text-green-500">({language === 'ro' ? 'compresie automată' : 'auto-compressed'})</span>
                  </span>
                  {photos.length > 0 && (
                    <span className="text-xs text-primary font-medium">
                      {photos.length}/{MAX_PHOTOS} {t.formLabels.photosSelected}
                    </span>
                  )}
                  {errors.photos && <span className="text-xs text-red-500 w-full">{errors.photos}</span>}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={photoIds} strategy={rectSortingStrategy}>
                    <div className="flex flex-wrap gap-2">
                      {photos.map((photo, index) => (
                        <SortablePhotoItem
                          key={photoIds[index]}
                          id={photoIds[index]}
                          photo={photo}
                          index={index}
                          onRemove={removePhoto}
                          onSetPrimary={setAsPrimary}
                          isPrimary={index === 0}
                        />
                      ))}
                      
                      {isCompressing ? (
                        <div className="w-16 h-16 rounded-lg border-2 border-dashed border-primary/50 flex flex-col items-center justify-center gap-1 bg-background">
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          <span className="text-[10px] text-primary">
                            {language === 'ro' ? 'Comprim...' : 'Compressing...'}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-16 h-16 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 transition-colors bg-background"
                        >
                          <Upload className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">+</span>
                        </button>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>

              {/* Upload Progress */}
              {isSubmitting && uploadProgress.total > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {language === 'ro' 
                        ? `Încărcare poze: ${uploadProgress.current}/${uploadProgress.total}` 
                        : `Uploading photos: ${uploadProgress.current}/${uploadProgress.total}`}
                    </span>
                    <span className="text-primary font-medium">
                      {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {uploadProgress.total > 0 && uploadProgress.current < uploadProgress.total
                        ? (language === 'ro' ? `Încărcare ${uploadProgress.current}/${uploadProgress.total}...` : `Uploading ${uploadProgress.current}/${uploadProgress.total}...`)
                        : t.formLabels.sending}
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
