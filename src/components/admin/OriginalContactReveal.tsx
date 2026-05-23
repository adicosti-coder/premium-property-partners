import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, User, Loader2, EyeOff, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  sourceUrl: string | null;
}

type ContactData = {
  contact_name: string | null;
  contact_phone: string | null;
  phone_normalized: string | null;
  do_not_call: boolean | null;
  do_not_call_reason: string | null;
};

/**
 * Admin-only reveal button that fetches the original owner contact
 * (name + phone) from `prospect_listings` based on the published
 * property's `original_source_url`.
 *
 * Data is private (RLS: admins only) and never exposed publicly.
 */
export default function OriginalContactReveal({ sourceUrl }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ContactData | null>(null);
  const [hidden, setHidden] = useState(false);

  if (!sourceUrl) return null;

  const fetchContact = async () => {
    setLoading(true);
    const { data: row, error } = await supabase
      .from("prospect_listings")
      .select("contact_name, contact_phone, phone_normalized, do_not_call, do_not_call_reason")
      .eq("source_url", sourceUrl)
      .maybeSingle();
    setLoading(false);

    if (error) {
      toast({ title: "Eroare", description: error.message, variant: "destructive" });
      return;
    }
    if (!row) {
      toast({ title: "Nu există date", description: "Anunțul-sursă nu a fost găsit în prospect_listings." });
      return;
    }
    setData(row as ContactData);
    setHidden(false);
  };

  if (!data) {
    return (
      <Button variant="outline" size="sm" onClick={fetchContact} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Phone className="h-4 w-4 mr-2" />}
        Vezi contact original
      </Button>
    );
  }

  if (hidden) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setHidden(false)}>
        <Phone className="h-4 w-4 mr-2" />
        Arată din nou
      </Button>
    );
  }

  const phone = data.contact_phone || data.phone_normalized;
  const waPhone = phone ? phone.replace(/[^\d+]/g, "").replace(/^00/, "+").replace(/^0/, "+40") : "";

  return (
    <div className="rounded-lg border-2 border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/10 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
          🔒 Contact original (admin-only)
        </div>
        <Button variant="ghost" size="sm" onClick={() => setHidden(true)}>
          <EyeOff className="h-3 w-3 mr-1" /> Ascunde
        </Button>
      </div>

      {data.do_not_call && (
        <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded p-2">
          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span><strong>DNC:</strong> {data.do_not_call_reason || "Nu suna acest contact."}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{data.contact_name || <em className="text-muted-foreground">fără nume</em>}</span>
      </div>

      {phone ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold">{phone}</span>
          <Button variant="default" size="sm" asChild disabled={!!data.do_not_call}>
            <a href={`tel:${phone}`} aria-label="Sună proprietarul">
              <Phone className="h-3 w-3 mr-1" /> Sună
            </a>
          </Button>
          {waPhone && (
            <Button variant="outline" size="sm" asChild disabled={!!data.do_not_call}>
              <a
                href={`https://wa.me/${waPhone.replace(/^\+/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Trimite WhatsApp"
              >
                <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
              </a>
            </Button>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground italic">Telefon indisponibil în prospect_listings.</div>
      )}
    </div>
  );
}
