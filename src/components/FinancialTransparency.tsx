import { useLanguage } from "@/i18n/LanguageContext";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { 
  Banknote, 
  ArrowRight, 
  Building2, 
  Receipt, 
  ShieldCheck,
  CheckCircle2,
  Wallet,
  FileText,
  TrendingUp,
  Eye
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const FinancialTransparency = () => {
  const { language } = useLanguage();
  const headerAnimation = useScrollAnimation({ threshold: 0.1 });
  const flowAnimation = useScrollAnimation({ threshold: 0.1 });
  const benefitsAnimation = useScrollAnimation({ threshold: 0.1 });

  const content = {
    ro: {
      badge: "Transparență Maximă",
      title: "Banii Tăi,",
      titleHighlight: "Direct la Tine",
      subtitle: "Cel mai înalt nivel de transparență posibil. Fără intermediari, fără întârzieri, fără surprize.",
      flowTitle: "Cum Funcționează Fluxul Financiar",
      steps: [
        {
          icon: Banknote,
          title: "Încasare Directă",
          description: "Veniturile din rezervări (Airbnb, Booking, Direct) intră direct în contul tău bancar",
          highlight: "100% în contul tău"
        },
        {
          icon: Receipt,
          title: "Facturare Ulterioară",
          description: "La finalul lunii, îți trimitem factura pentru comisionul de administrare de 20% din încasările nete",
          highlight: "Plătești după ce încasezi"
        },
        {
          icon: FileText,
          title: "Raport Detaliat",
          description: "Primești raport lunar complet: rezervări, venituri, cheltuieli, profit net",
          highlight: "Vizibilitate totală"
        }
      ],
      benefits: [
        {
          icon: ShieldCheck,
          title: "Zero Risc",
          description: "Nu îți dai banii cuiva să-i administreze. Îi ai mereu în contul tău."
        },
        {
          icon: Eye,
          title: "Control Total",
          description: "Vezi fiecare tranzacție în timp real, din portalul tău de proprietar."
        },
        {
          icon: TrendingUp,
          title: "Cash Flow Predictibil",
          description: "Știi exact cât încasezi și cât plătești, fără surprize."
        }
      ],
      trustMessage: "Încrederea se construiește prin fapte, nu prin vorbe. De aceea am ales modelul cel mai transparent posibil.",
      comparison: {
        title: "De Ce Contează?",
        traditional: {
          label: "Model Tradițional",
          items: [
            "Banii trec prin contul agenției",
            "Risc de întârzieri la transfer",
            "Lipsa vizibilității în timp real",
            "Dependență de rapoartele agenției"
          ]
        },
        ours: {
          label: "Modelul RealTrust",
          items: [
            "Banii intră direct la tine",
            "Încasare imediată din platforme",
            "Dashboard cu date live",
            "Transparență 100%"
          ]
        }
      }
    },
    en: {
      badge: "Maximum Transparency",
      title: "Your Money,",
      titleHighlight: "Directly to You",
      subtitle: "The highest level of transparency possible. No middlemen, no delays, no surprises.",
      flowTitle: "How the Financial Flow Works",
      steps: [
        {
          icon: Banknote,
          title: "Direct Collection",
          description: "Revenue from bookings (Airbnb, Booking, Direct) goes directly into your bank account",
          highlight: "100% in your account"
        },
        {
          icon: Receipt,
          title: "Subsequent Invoicing",
          description: "At the end of the month, we send you the invoice for the 20% management commission of net income",
          highlight: "Pay after you collect"
        },
        {
          icon: FileText,
          title: "Detailed Report",
          description: "Receive a complete monthly report: bookings, revenue, expenses, net profit",
          highlight: "Total visibility"
        }
      ],
      benefits: [
        {
          icon: ShieldCheck,
          title: "Zero Risk",
          description: "You don't give your money to someone to manage. You always have it in your account."
        },
        {
          icon: Eye,
          title: "Total Control",
          description: "See every transaction in real-time from your owner portal."
        },
        {
          icon: TrendingUp,
          title: "Predictable Cash Flow",
          description: "Know exactly how much you collect and pay, no surprises."
        }
      ],
      trustMessage: "Trust is built through actions, not words. That's why we chose the most transparent model possible.",
      comparison: {
        title: "Why Does It Matter?",
        traditional: {
          label: "Traditional Model",
          items: [
            "Money goes through agency account",
            "Risk of transfer delays",
            "Lack of real-time visibility",
            "Dependence on agency reports"
          ]
        },
        ours: {
          label: "RealTrust Model",
          items: [
            "Money goes directly to you",
            "Immediate collection from platforms",
            "Dashboard with live data",
            "100% transparency"
          ]
        }
      }
    }
  };

  const t = content[language];

  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-background via-primary/5 to-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
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
          <Badge variant="outline" className="mb-4 px-4 py-2 text-sm font-medium border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400">
            <Wallet className="w-4 h-4 mr-2" />
            {t.badge}
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            {t.title}{" "}
            <span className="text-primary">{t.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t.subtitle}
          </p>
        </div>

        {/* Flow Steps */}
        <div 
          ref={flowAnimation.ref}
          className={`mb-16 transition-all duration-700 ${
            flowAnimation.isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          <h3 className="text-xl font-semibold text-center mb-8">{t.flowTitle}</h3>
          
          <div className="relative">
            {/* Connection line - desktop only */}
            <div className="hidden md:block absolute top-1/2 left-[15%] right-[15%] h-1 bg-gradient-to-r from-green-500 via-primary to-green-500 rounded-full -translate-y-1/2 z-0" />
            
            <div className="grid md:grid-cols-3 gap-6 lg:gap-8 relative z-10">
              {t.steps.map((step, index) => (
                <div key={index} className="relative">
                  <Card className="h-full bg-card/90 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300 group">
                    <CardContent className="p-6 text-center">
                      {/* Step number */}
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                        {index + 1}
                      </div>
                      
                      {/* Icon */}
                      <div className="w-16 h-16 mx-auto mt-4 mb-4 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <step.icon className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </div>
                      
                      <h4 className="text-lg font-semibold mb-2">{step.title}</h4>
                      <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                        {step.description}
                      </p>
                      
                      {/* Highlight badge */}
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {step.highlight}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Arrow between cards - desktop only */}
                  {index < t.steps.length - 1 && (
                    <div className="hidden md:flex absolute top-1/2 -right-4 lg:-right-6 -translate-y-1/2 z-20">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-primary rounded-full flex items-center justify-center shadow-lg">
                        <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Comparison and Benefits */}
        <div 
          ref={benefitsAnimation.ref}
          className={`grid lg:grid-cols-2 gap-8 transition-all duration-700 ${
            benefitsAnimation.isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Comparison */}
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 bg-muted/50 border-b border-border/50">
                <h3 className="text-lg font-semibold">{t.comparison.title}</h3>
              </div>
              
              <div className="grid grid-cols-2 divide-x divide-border/50">
                {/* Traditional */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <span className="text-sm font-medium text-muted-foreground">
                      {t.comparison.traditional.label}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {t.comparison.traditional.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-red-500 mt-0.5">✗</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Ours */}
                <div className="p-5 bg-green-500/5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {t.comparison.ours.label}
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {t.comparison.ours.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                        <span className="font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Benefits */}
          <div className="space-y-4">
            {t.benefits.map((benefit, index) => (
              <Card 
                key={index} 
                className="border-border/50 hover:border-green-500/30 hover:shadow-lg transition-all duration-300 group"
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <benefit.icon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{benefit.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Trust message */}
            <div className="p-5 bg-gradient-to-r from-primary/10 to-green-500/10 rounded-xl border border-primary/20">
              <p className="text-sm font-medium text-center italic">
                "{t.trustMessage}"
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinancialTransparency;
