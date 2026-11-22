import { Badge } from "@/components/ui/badge";
import { estimateFollowupBadges, type EstimateFollowupRow } from "../../../supabase/functions/_shared/estimateFollowup";

const VARIANT = { info: "secondary", neutral: "outline", success: "default", muted: "outline", warning: "destructive" } as const;

/** „Link deschis” · „Follow-up programat / trimis” · „Anulat – a răspuns” pentru linkul scurt /e/<cod>. */
export default function EstimateFollowupBadges({ row, className = "" }: { row: EstimateFollowupRow; className?: string }) {
  const badges = estimateFollowupBadges(row);
  if (!badges.length) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {badges.map((b) => (
        <Badge key={b.key} variant={VARIANT[b.tone]} className={`text-[11px] font-normal ${b.tone === "muted" ? "text-muted-foreground" : ""}`}>
          {b.label}{b.at ? ` · ${b.at}` : ""}
        </Badge>
      ))}
    </div>
  );
}
