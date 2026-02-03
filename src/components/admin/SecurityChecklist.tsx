import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Shield, ShieldCheck, ShieldAlert, RefreshCw, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/hooks/use-toast";

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  severity: "critical" | "high" | "medium" | "info";
}

interface ChecklistCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  items: ChecklistItem[];
}

const securityChecklist: ChecklistCategory[] = [
  {
    id: "authentication",
    title: "Autentificare & Parole",
    icon: <Shield className="w-5 h-5" />,
    items: [
      {
        id: "password-min-length",
        label: "Lungime minimă parolă 8 caractere",
        description: "Toate formularele de înregistrare și resetare parolă cer minimum 8 caractere",
        severity: "critical",
      },
      {
        id: "password-complexity",
        label: "Complexitate parolă (majuscule, minuscule, cifre)",
        description: "Indicatorul de putere a parolei verifică diversitatea caracterelor",
        severity: "high",
      },
      {
        id: "common-passwords-blocked",
        label: "Parole comune blocate",
        description: "Lista de 100+ parole comune este verificată la înregistrare",
        severity: "high",
      },
      {
        id: "password-strength-indicator",
        label: "Indicator vizual putere parolă",
        description: "PasswordStrengthIndicator.tsx afișează feedback în timp real",
        severity: "medium",
      },
      {
        id: "session-management",
        label: "Gestionare sesiuni securizată",
        description: "Supabase Auth gestionează automat sesiunile și token-urile",
        severity: "critical",
      },
    ],
  },
  {
    id: "spam-protection",
    title: "Protecție Anti-Spam",
    icon: <ShieldAlert className="w-5 h-5" />,
    items: [
      {
        id: "hcaptcha-forms",
        label: "hCaptcha pe toate formularele publice",
        description: "GuestReviewForm, BookingForm, RealEstateContactForm, LeadCaptureForm, QuickLeadForm",
        severity: "critical",
      },
      {
        id: "hcaptcha-server-verify",
        label: "Verificare server-side hCaptcha",
        description: "Edge function verify-hcaptcha validează token-ul înainte de procesare",
        severity: "critical",
      },
      {
        id: "captcha-logging",
        label: "Logging încercări captcha",
        description: "Toate încercările sunt salvate în tabelul captcha_logs",
        severity: "medium",
      },
      {
        id: "spam-rate-alerts",
        label: "Alerte automată rată spam",
        description: "Cron job verifică și alertează dacă rata spam > 20%",
        severity: "high",
      },
    ],
  },
  {
    id: "input-validation",
    title: "Validare Input",
    icon: <CheckCircle2 className="w-5 h-5" />,
    items: [
      {
        id: "html-escaping",
        label: "Escape HTML în Edge Functions",
        description: "Funcția escapeHtml() previne XSS în toate input-urile text",
        severity: "critical",
      },
      {
        id: "phone-sanitization",
        label: "Sanitizare numere telefon",
        description: "sanitizePhone() elimină caractere non-numerice",
        severity: "high",
      },
      {
        id: "zod-validation",
        label: "Validare Zod schemas",
        description: "Toate formularele folosesc zod pentru validare client-side",
        severity: "high",
      },
      {
        id: "length-limits",
        label: "Limite lungime câmpuri",
        description: "Toate câmpurile au limite maxime definite",
        severity: "medium",
      },
    ],
  },
  {
    id: "database-security",
    title: "Securitate Bază de Date",
    icon: <ShieldCheck className="w-5 h-5" />,
    items: [
      {
        id: "rls-enabled",
        label: "RLS activat pe toate tabelele",
        description: "Row Level Security protejează accesul la date",
        severity: "critical",
      },
      {
        id: "rbac-roles",
        label: "Sistem RBAC cu roluri",
        description: "user_roles table cu funcția has_role() pentru verificări",
        severity: "critical",
      },
      {
        id: "admin-only-access",
        label: "Acces admin restricționat",
        description: "leads, referrals, cta_analytics accesibile doar admin",
        severity: "critical",
      },
      {
        id: "owner-access-policies",
        label: "Politici acces proprietari",
        description: "Utilizatorii pot accesa doar datele proprii",
        severity: "high",
      },
    ],
  },
  {
    id: "monitoring",
    title: "Monitorizare & Alertare",
    icon: <AlertTriangle className="w-5 h-5" />,
    items: [
      {
        id: "captcha-dashboard",
        label: "Dashboard monitorizare captcha",
        description: "CaptchaLogsManager în admin cu statistici și export CSV",
        severity: "medium",
      },
      {
        id: "conversion-alerts",
        label: "Alerte rată conversie",
        description: "Notificări automate la scăderi semnificative",
        severity: "medium",
      },
      {
        id: "followup-reminders",
        label: "Remindere follow-up",
        description: "Sistem automat de reamintiri pentru lead-uri",
        severity: "info",
      },
    ],
  },
  {
    id: "edge-functions",
    title: "Edge Functions Security",
    icon: <Info className="w-5 h-5" />,
    items: [
      {
        id: "cors-headers",
        label: "CORS headers configurate",
        description: "Toate Edge Functions au headers CORS corecte",
        severity: "high",
      },
      {
        id: "service-role-usage",
        label: "Service role key securizat",
        description: "Cheia service role folosită doar server-side",
        severity: "critical",
      },
      {
        id: "error-handling",
        label: "Error handling consistent",
        description: "Toate erorile sunt prinse și loggate corect",
        severity: "medium",
      },
    ],
  },
];

const STORAGE_KEY = "security-checklist-state";

const SecurityChecklist = () => {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [lastVerified, setLastVerified] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChecklistState();
  }, []);

  const loadChecklistState = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const stored = localStorage.getItem(`${STORAGE_KEY}-${user.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCheckedItems(parsed.items || {});
        setLastVerified(parsed.lastVerified || null);
      }
    } catch (error) {
      console.error("Error loading checklist state:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveChecklistState = async (items: Record<string, boolean>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const state = {
        items,
        lastVerified: new Date().toISOString(),
      };
      localStorage.setItem(`${STORAGE_KEY}-${user.id}`, JSON.stringify(state));
      setLastVerified(state.lastVerified);
    } catch (error) {
      console.error("Error saving checklist state:", error);
    }
  };

  const handleCheck = (itemId: string, checked: boolean) => {
    const newCheckedItems = { ...checkedItems, [itemId]: checked };
    setCheckedItems(newCheckedItems);
    saveChecklistState(newCheckedItems);
  };

  const resetChecklist = () => {
    setCheckedItems({});
    saveChecklistState({});
    toast({
      title: "Checklist resetat",
      description: "Toate elementele au fost debifate pentru o nouă verificare.",
    });
  };

  const markAllComplete = () => {
    const allItems: Record<string, boolean> = {};
    securityChecklist.forEach(category => {
      category.items.forEach(item => {
        allItems[item.id] = true;
      });
    });
    setCheckedItems(allItems);
    saveChecklistState(allItems);
    toast({
      title: "Verificare completă",
      description: "Toate măsurile de securitate au fost marcate ca verificate.",
    });
  };

  const totalItems = securityChecklist.reduce((acc, cat) => acc + cat.items.length, 0);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const getCriticalStats = () => {
    let criticalTotal = 0;
    let criticalChecked = 0;
    securityChecklist.forEach(category => {
      category.items.forEach(item => {
        if (item.severity === "critical") {
          criticalTotal++;
          if (checkedItems[item.id]) criticalChecked++;
        }
      });
    });
    return { criticalTotal, criticalChecked };
  };

  const { criticalTotal, criticalChecked } = getCriticalStats();

  const getSeverityBadge = (severity: ChecklistItem["severity"]) => {
    const variants: Record<string, { variant: "destructive" | "default" | "secondary" | "outline"; label: string }> = {
      critical: { variant: "destructive", label: "Critic" },
      high: { variant: "default", label: "Înalt" },
      medium: { variant: "secondary", label: "Mediu" },
      info: { variant: "outline", label: "Info" },
    };
    const { variant, label } = variants[severity];
    return <Badge variant={variant} className="text-xs">{label}</Badge>;
  };

  const getCategoryProgress = (category: ChecklistCategory) => {
    const total = category.items.length;
    const checked = category.items.filter(item => checkedItems[item.id]).length;
    return { total, checked, percent: total > 0 ? Math.round((checked / total) * 100) : 0 };
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Progres Total</p>
                <p className="text-2xl font-bold">{checkedCount}/{totalItems}</p>
              </div>
              <div className="w-16 h-16 relative">
                <svg className="w-16 h-16 transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray={`${progressPercent * 1.76} 176`}
                    className="text-primary transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
                  {progressPercent}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={criticalChecked < criticalTotal ? "border-destructive" : "border-green-500"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {criticalChecked < criticalTotal ? (
                <ShieldAlert className="w-8 h-8 text-destructive" />
              ) : (
                <ShieldCheck className="w-8 h-8 text-green-500" />
              )}
              <div>
                <p className="text-sm text-muted-foreground">Măsuri Critice</p>
                <p className="text-2xl font-bold">{criticalChecked}/{criticalTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Ultima verificare</p>
              <p className="text-lg font-medium">
                {lastVerified 
                  ? new Date(lastVerified).toLocaleDateString("ro-RO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Niciodată"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={resetChecklist}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Resetează Checklist
        </Button>
        <Button onClick={markAllComplete}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Marchează Tot Verificat
        </Button>
      </div>

      {/* Checklist Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Checklist Securitate
          </CardTitle>
          <CardDescription>
            Verifică periodic toate măsurile de securitate implementate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" defaultValue={securityChecklist.map(c => c.id)}>
            {securityChecklist.map((category) => {
              const progress = getCategoryProgress(category);
              return (
                <AccordionItem key={category.id} value={category.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        {category.icon}
                        <span className="font-medium">{category.title}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {progress.checked}/{progress.total}
                        </span>
                        <Progress value={progress.percent} className="w-20 h-2" />
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {category.items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                            checkedItems[item.id] 
                              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
                              : "bg-card border-border"
                          }`}
                        >
                          <Checkbox
                            id={item.id}
                            checked={checkedItems[item.id] || false}
                            onCheckedChange={(checked) => handleCheck(item.id, checked as boolean)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <label
                                htmlFor={item.id}
                                className={`font-medium cursor-pointer ${
                                  checkedItems[item.id] ? "line-through text-muted-foreground" : ""
                                }`}
                              >
                                {item.label}
                              </label>
                              {getSeverityBadge(item.severity)}
                            </div>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityChecklist;
