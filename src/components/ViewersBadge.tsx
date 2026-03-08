import { Eye } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface ViewersBadgeProps {
  count: number;
  className?: string;
}

const ViewersBadge = ({ count, className = "" }: ViewersBadgeProps) => {
  const { language } = useLanguage();
  
  if (count < 2) return null;

  const label = language === "ro"
    ? `${count} persoane vizualizează`
    : `${count} people viewing`;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-destructive/90 backdrop-blur-sm text-destructive-foreground text-xs font-medium animate-pulse ${className}`}>
      <Eye className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
};

export default ViewersBadge;
