import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { 
  Smartphone, 
  Video, 
  Wifi, 
  BookOpen, 
  Key, 
  Thermometer,
  Tv,
  WashingMachine,
  Coffee,
  CheckCircle2,
  QrCode,
  MessageCircle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DigitalHouseManual = () => {
  const { language } = useLanguage();
  const headerAnimation = useScrollAnimation({ threshold: 0.1 });
  const featuresAnimation = useScrollAnimation({ threshold: 0.1 });
  const previewAnimation = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Experiență Premium",
      title: "Manualul Casei",
      titleHighlight: "Digital",
      subtitle: "Fiecare oaspete primește acces instant la un ghid digital complet. Instrucțiuni clare, disponibile 24/7, pentru o experiență de cazare fără probleme.",
      ownerBenefit: "Pentru Proprietari: Mai puține apeluri la ore nepotrivite și oaspeți care folosesc corect toate dotările.",
      features: [
        {
          icon: Video,
          title: "Check-in Video & Foto",
          description: "Instrucțiuni pas cu pas pentru acces: unde e cheia, cum se introduce codul, orientare în clădire.",
          items: ["Video HD pentru fiecare proprietate", "Fotografii clare ale intrării", "Cod acces actualizat automat"]
        },
        {
          icon: Thermometer,
          title: "Ghid Electrocasnice",
          description: "Cum se utilizează corect fiecare aparat din casă, de la aer condiționat la mașina de spălat.",
          items: ["Instrucțiuni vizuale pas cu pas", "Setări recomandate", "Depanare rapidă"]
        },
        {
          icon: Wifi,
          title: "Conectivitate & Utilități",
          description: "Toate informațiile esențiale: WiFi, parcare, gunoi, contact urgențe.",
          items: ["Cod WiFi cu un click", "Instrucțiuni parcare", "Reguli imobil"]
        }
      ],
      applianceGuides: [
        { icon: Thermometer, name: "Aer condiționat" },
        { icon: WashingMachine, name: "Mașină de spălat" },
        { icon: Tv, name: "Smart TV" },
        { icon: Coffee, name: "Espressor" }
      ],
      previewTitle: "Acces Instant prin QR",
      previewDescription: "Oaspeții scanează codul QR și au acces imediat la tot ce au nevoie.",
      cta: "Digital Guest Guide inclus gratuit în serviciul nostru"
    },
    en: {
      badge: "Premium Experience",
      title: "Digital House",
      titleHighlight: "Manual",
      subtitle: "Every guest gets instant access to a complete digital guide. Clear instructions, available 24/7, for a hassle-free stay experience.",
      ownerBenefit: "For Owners: Fewer calls at inconvenient hours and guests who properly use all amenities.",
      features: [
        {
          icon: Video,
          title: "Video & Photo Check-in",
          description: "Step-by-step access instructions: where's the key, how to enter the code, building orientation.",
          items: ["HD video for each property", "Clear entrance photos", "Auto-updated access code"]
        },
        {
          icon: Thermometer,
          title: "Appliance Guide",
          description: "How to properly use every appliance in the house, from AC to washing machine.",
          items: ["Visual step-by-step instructions", "Recommended settings", "Quick troubleshooting"]
        },
        {
          icon: Wifi,
          title: "Connectivity & Utilities",
          description: "All essential information: WiFi, parking, garbage, emergency contact.",
          items: ["One-click WiFi code", "Parking instructions", "Building rules"]
        }
      ],
      applianceGuides: [
        { icon: Thermometer, name: "Air Conditioning" },
        { icon: WashingMachine, name: "Washing Machine" },
        { icon: Tv, name: "Smart TV" },
        { icon: Coffee, name: "Espresso Machine" }
      ],
      previewTitle: "Instant QR Access",
      previewDescription: "Guests scan the QR code and get immediate access to everything they need.",
      cta: "Digital Guest Guide included free in our service"
    }
  };

  const t = content[language];

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-background via-muted/30 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div 
          ref={headerAnimation.ref}
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${
            headerAnimation.isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <Badge variant="outline" className="mb-4 px-4 py-2 text-sm font-medium border-primary/30 bg-primary/5">
            <Smartphone className="w-4 h-4 mr-2 text-primary" />
            {t.badge}
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            {t.title}{" "}
            <span className="text-primary">{t.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-4">
            {t.subtitle}
          </p>
          <p className="text-sm text-primary font-medium bg-primary/10 px-4 py-2 rounded-full inline-block">
            💡 {t.ownerBenefit}
          </p>
        </div>

        {/* Features Grid */}
        <div 
          ref={featuresAnimation.ref}
          className={`grid md:grid-cols-3 gap-8 mb-16 transition-all duration-700 delay-200 ${
            featuresAnimation.isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          {t.features.map((feature, index) => (
            <Card 
              key={index} 
              className="group hover:shadow-xl transition-all duration-300 border-border/50 bg-card/80 backdrop-blur-sm hover:border-primary/30"
            >
              <CardContent className="p-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      <span className="text-foreground/80">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Preview Section */}
        <div 
          ref={previewAnimation.ref}
          className={`transition-all duration-700 delay-400 ${
            previewAnimation.isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/5 via-card to-primary/5">
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2 gap-0">
                {/* Left - Mock Phone Preview */}
                <div className="p-8 md:p-12 flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted/20">
                  <div className="relative">
                    {/* Phone Frame */}
                    <div className="w-64 h-[480px] bg-foreground rounded-[3rem] p-2 shadow-2xl">
                      <div className="w-full h-full bg-background rounded-[2.5rem] overflow-hidden relative">
                        {/* Phone Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-foreground rounded-b-2xl z-10" />
                        
                        {/* Phone Content */}
                        <div className="pt-10 px-4 h-full overflow-hidden">
                          {/* Header */}
                          <div className="text-center mb-4">
                            <div className="w-12 h-12 bg-primary/20 rounded-full mx-auto mb-2 flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <h4 className="font-semibold text-sm">Guest Guide</h4>
                            <p className="text-xs text-muted-foreground">ApArt Hotel</p>
                          </div>

                          {/* Quick Actions */}
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="bg-muted/50 rounded-xl p-3 text-center">
                              <Key className="w-5 h-5 mx-auto mb-1 text-primary" />
                              <span className="text-xs">Check-in</span>
                            </div>
                            <div className="bg-muted/50 rounded-xl p-3 text-center">
                              <Wifi className="w-5 h-5 mx-auto mb-1 text-primary" />
                              <span className="text-xs">WiFi</span>
                            </div>
                          </div>

                          {/* Appliance List */}
                          <div className="space-y-2">
                            {t.applianceGuides.map((appliance, idx) => (
                              <div 
                                key={idx} 
                                className="flex items-center gap-3 bg-muted/30 rounded-lg p-2"
                              >
                                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                  <appliance.icon className="w-4 h-4 text-primary" />
                                </div>
                                <span className="text-xs font-medium">{appliance.name}</span>
                              </div>
                            ))}
                          </div>

                          {/* Support Button */}
                          <div className="absolute bottom-8 left-4 right-4">
                            <div className="bg-primary text-primary-foreground rounded-xl p-3 flex items-center justify-center gap-2">
                              <MessageCircle className="w-4 h-4" />
                              <span className="text-xs font-medium">24/7 Support</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Floating QR Badge */}
                    <div className="absolute -right-4 -bottom-4 bg-card border shadow-lg rounded-2xl p-4">
                      <QrCode className="w-16 h-16 text-foreground" />
                    </div>
                  </div>
                </div>

                {/* Right - Info */}
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <h3 className="text-2xl md:text-3xl font-bold mb-4">
                    {t.previewTitle}
                  </h3>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    {t.previewDescription}
                  </p>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">
                          {language === 'ro' ? 'Actualizat în timp real' : 'Real-time updates'}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ro' 
                            ? 'Coduri WiFi și instrucțiuni mereu la zi' 
                            : 'WiFi codes and instructions always up to date'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">
                          {language === 'ro' ? 'Multilingv' : 'Multilingual'}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {language === 'ro' 
                            ? 'Disponibil în română, engleză și alte limbi' 
                            : 'Available in Romanian, English and other languages'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                    <p className="text-sm font-semibold text-primary">
                      ✨ {t.cta}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default DigitalHouseManual;
