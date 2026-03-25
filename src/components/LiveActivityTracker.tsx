import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { Eye, CheckCircle } from "lucide-react";

interface LiveActivityTrackerProps {
  propertyId?: string;
  className?: string;
}

const LiveActivityTracker = ({ propertyId, className = "" }: LiveActivityTrackerProps) => {
  const { language } = useLanguage();
  const [viewCount, setViewCount] = useState<number | null>(null);

  useEffect(() => {
    if (!propertyId) return;

    const fetchViews = async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from("property_views")
        .select("id", { count: "exact", head: true })
        .eq("property_id", propertyId)
        .gte("viewed_at", since);

      if (!error && count !== null) {
        setViewCount(count);
      }
    };

    fetchViews();
  }, [propertyId]);

  if (viewCount === null) return null;

  const hasViews = viewCount > 0;

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {hasViews ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </span>
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">
            {language === "ro"
              ? `${viewCount} ${viewCount === 1 ? "persoană a" : "persoane au"} vizualizat acest activ în ultimele 24h`
              : `${viewCount} ${viewCount === 1 ? "person viewed" : "people viewed"} this property in the last 24h`}
          </span>
        </>
      ) : (
        <>
          <CheckCircle className="w-3.5 h-3.5 text-primary" />
          <span className="text-muted-foreground">
            {language === "ro" ? "Status: Disponibilitate imediată" : "Status: Available now"}
          </span>
        </>
      )}
    </div>
  );
};

export default LiveActivityTracker;
