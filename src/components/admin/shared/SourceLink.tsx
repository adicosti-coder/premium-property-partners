import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function domainOf(url?: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Sursa anunțului ca link clicabil către anunțul original (tab nou). */
export function SourceLink({ url, platform }: { url?: string | null; platform?: string | null }) {
  const domain = domainOf(url);
  const label = domain || platform || "sursă necunoscută";
  if (!domain || !url) {
    return (
      <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground" title="Anunțul nu are link original salvat">
        {platform || "—"} · Fără link
      </Badge>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Deschide anunțul original"
      aria-label={`Deschide anunțul original pe ${label}`}
      className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary hover:underline shrink-0"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
