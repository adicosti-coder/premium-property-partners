import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Phone, 
  FileSignature, 
  Gift,
  CalendarDays,
  MapPin,
  User,
  Home,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { ro, enUS } from "date-fns/locale";
import { motion } from "framer-motion";

interface Referral {
  id: string;
  owner_name: string;
  // owner_email removed for security - contact info not exposed to referrers
  property_location: string | null;
  property_type: string | null;
  status: string;
  created_at: string;
  contacted_at: string | null;
  meeting_date: string | null;
  contract_signed_at: string | null;
  reward_granted_at: string | null;
  reward_check_in: string | null;
  reward_check_out: string | null;
}

interface UserReferralsListProps {
  userEmail: string;
  userId?: string;
}

const UserReferralsList = ({ userEmail, userId }: UserReferralsListProps) => {
  const { language } = useLanguage();

  const t = {
    ro: {
      title: "Recomandările Tale",
      subtitle: "Urmărește statusul recomandărilor pe care le-ai făcut",
      noReferrals: "Nu ai trimis încă nicio recomandare",
      noReferralsDesc: "Completează formularul de mai sus pentru a recomanda un proprietar",
      status: {
        pending: "În așteptare",
        contacted: "Contactat",
        meeting_scheduled: "Întâlnire programată",
        contract_signed: "Contract semnat",
        reward_granted: "Premiu acordat",
        rejected: "Respins",
      },
      submittedOn: "Trimis pe",
      owner: "Proprietar",
      location: "Locație",
      propertyType: "Tip proprietate",
      rewardDates: "Weekend gratuit",
      timeline: "Progres",
      apartment: "Apartament",
      studio: "Studio",
      house: "Casă",
    },
    en: {
      title: "Your Referrals",
      subtitle: "Track the status of your referrals",
      noReferrals: "You haven't submitted any referrals yet",
      noReferralsDesc: "Fill out the form above to refer an owner",
      status: {
        pending: "Pending",
        contacted: "Contacted",
        meeting_scheduled: "Meeting Scheduled",
        contract_signed: "Contract Signed",
        reward_granted: "Reward Granted",
        rejected: "Rejected",
      },
      submittedOn: "Submitted on",
      owner: "Owner",
      location: "Location",
      propertyType: "Property type",
      rewardDates: "Free weekend",
      timeline: "Progress",
      apartment: "Apartment",
      studio: "Studio",
      house: "House",
    },
  };

  const text = t[language as keyof typeof t] || t.ro;
  const dateLocale = language === "ro" ? ro : enUS;

  const { data: referrals, isLoading } = useQuery({
    queryKey: ["user-referrals", userEmail, userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-my-referrals");
      if (error) throw error;
      return (data?.referrals ?? []) as Referral[];
    },
    enabled: !!userEmail,
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { 
          icon: Clock, 
          color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
          progressColor: "bg-yellow-500"
        };
      case "contacted":
        return { 
          icon: Phone, 
          color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
          progressColor: "bg-blue-500"
        };
      case "meeting_scheduled":
        return { 
          icon: CalendarDays, 
          color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
          progressColor: "bg-purple-500"
        };
      case "contract_signed":
        return { 
          icon: FileSignature, 
          color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
          progressColor: "bg-emerald-500"
        };
      case "reward_granted":
        return { 
          icon: Gift, 
          color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
          progressColor: "bg-amber-500"
        };
      case "rejected":
        return { 
          icon: XCircle, 
          color: "bg-red-500/10 text-red-600 border-red-500/30",
          progressColor: "bg-red-500"
        };
      default:
        return { 
          icon: Clock, 
          color: "bg-muted text-muted-foreground",
          progressColor: "bg-muted"
        };
    }
  };

  const getProgressPercentage = (status: string) => {
    switch (status) {
      case "pending": return 20;
      case "contacted": return 40;
      case "meeting_scheduled": return 60;
      case "contract_signed": return 80;
      case "reward_granted": return 100;
      case "rejected": return 100;
      default: return 0;
    }
  };

  const getPropertyTypeLabel = (type: string | null) => {
    if (!type) return null;
    switch (type) {
      case "apartment": return text.apartment;
      case "studio": return text.studio;
      case "house": return text.house;
      default: return type;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!referrals || referrals.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold text-foreground mb-2">{text.noReferrals}</h3>
          <p className="text-sm text-muted-foreground">{text.noReferralsDesc}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          {text.title}
        </CardTitle>
        <CardDescription>{text.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {referrals.map((referral, index) => {
          const statusConfig = getStatusConfig(referral.status);
          const StatusIcon = statusConfig.icon;
          const progress = getProgressPercentage(referral.status);

          return (
            <motion.div
              key={referral.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-l-4" style={{ borderLeftColor: `hsl(var(--primary))` }}>
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Main Info */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{referral.owner_name}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        {referral.property_location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {referral.property_location}
                          </span>
                        )}
                        {referral.property_type && (
                          <span className="flex items-center gap-1">
                            <Home className="w-3 h-3" />
                            {getPropertyTypeLabel(referral.property_type)}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{text.timeline}</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full ${statusConfig.progressColor} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                          />
                        </div>
                      </div>

                      {/* Reward dates if granted */}
                      {referral.status === "reward_granted" && referral.reward_check_in && referral.reward_check_out && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                          <p className="text-sm font-medium text-amber-700 flex items-center gap-2">
                            <Gift className="w-4 h-4" />
                            {text.rewardDates}: {format(new Date(referral.reward_check_in), "d MMM", { locale: dateLocale })} - {format(new Date(referral.reward_check_out), "d MMM yyyy", { locale: dateLocale })}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Status & Date */}
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${statusConfig.color} gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {text.status[referral.status as keyof typeof text.status] || referral.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {text.submittedOn} {format(new Date(referral.created_at), "d MMM yyyy", { locale: dateLocale })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default UserReferralsList;
