import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { ExternalLink, MapPin, Phone } from "lucide-react";
import { RevealableField } from "../../shared/RevealableField";
import type { FoundListing } from "../hooks/useScraperLeads";

interface Props {
  listing: FoundListing;
}

/**
 * Row renderer for the "found listings" table. PII masking on contact_phone
 * kept 1:1 — `tableName="prospect_listings"`, kind `phone`, auto-mask 30s.
 */
export function FoundListingRow({ listing: l }: Props) {
  return (
    <TableRow className={!l.is_active ? "opacity-60" : ""}>
      <TableCell className="text-xs font-mono text-muted-foreground">
        {l.created_at?.slice(0, 16).replace("T", " ")}
      </TableCell>
      <TableCell className="text-xs">
        <Badge variant="outline" className="text-[10px]">
          {l.source_platform || "—"}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[360px]">
        <div className="font-medium text-sm truncate" title={l.title || ""}>
          {l.title || "—"}
        </div>
        {(l.rooms || l.size) && (
          <div className="text-[11px] text-muted-foreground">
            {l.rooms ? `${l.rooms} cam` : ""}
            {l.rooms && l.size ? " · " : ""}
            {l.size ? `${l.size} mp` : ""}
          </div>
        )}
      </TableCell>
      <TableCell className="text-xs">
        {l.zone ? (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            {l.zone}
          </span>
        ) : (
          "—"
        )}
      </TableCell>
      <TableCell className="text-right text-xs font-mono">
        {l.price ? `${Number(l.price).toLocaleString("ro-RO")} ${l.currency || "€"}` : "—"}
      </TableCell>
      <TableCell className="text-xs">
        {l.contact_phone ? (
          <RevealableField
            value={l.contact_phone}
            kind="phone"
            tableName="prospect_listings"
            recordId={l.id}
            field="contact_phone"
            renderRevealed={(v) => (
              <a
                href={`tel:${v}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Phone className="h-3 w-3" />
                {v}
              </a>
            )}
          />
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {typeof l.lead_score === "number" ? (
          <Badge
            variant={l.lead_score >= 70 ? "default" : "secondary"}
            className="font-mono text-[11px]"
          >
            {l.lead_score}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-center">
        {l.source_url ? (
          <a
            href={l.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-primary hover:underline"
            title="Deschide anunțul"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : (
          "—"
        )}
      </TableCell>
    </TableRow>
  );
}
