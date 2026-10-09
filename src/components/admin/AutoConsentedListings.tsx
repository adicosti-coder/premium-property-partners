import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Rocket } from "lucide-react";
import { toast } from "sonner";

type ConsentRow = {
  id: string;
  phone_normalized: string;
  consented_at: string | null;
  published_at: string | null;
  property_id: string | null;
  prospect_listing_id: string | null;
  status: string;
  source: string;
};

const fmtDate = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("ro-RO", {
        timeZone: "Europe/Bucharest",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const fmtPhone = (p: string) => {
  const d = String(p || "").replace(/\D/g, "").replace(/^00/, "");
  return d.startsWith("40") ? `+${d}` : d.length === 9 ? `+40${d}` : p;
};

/** Anunțuri pentru care proprietarul a dat acordul de publicare pe WhatsApp. */
export default function AutoConsentedListings() {
  const [busy, setBusy] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["auto-consented-listings"],
    queryFn: async () => {
      const { data: consents, error } = await (supabase.from("wa_publish_consents") as any)
        .select("id, phone_normalized, consented_at, published_at, property_id, prospect_listing_id, status, source")
        .not("consented_at", "is", null)
        .is("revoked_at", null)
        .order("consented_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      const rows = (consents ?? []) as ConsentRow[];

      const prospectIds = rows.map((r) => r.prospect_listing_id).filter(Boolean) as string[];
      const propertyIds = rows.map((r) => r.property_id).filter(Boolean) as string[];

      const [{ data: prospects }, { data: props }] = await Promise.all([
        prospectIds.length
          ? (supabase.from("prospect_listings") as any)
              .select("id, title, zone, price, category, rooms, owner_name, phone")
              .in("id", prospectIds)
          : Promise.resolve({ data: [] }),
        propertyIds.length
          ? (supabase.from("properties") as any).select("id, slug, name").in("id", propertyIds)
          : Promise.resolve({ data: [] }),
      ]);

      const pMap = new Map<string, any>((prospects ?? []).map((p: any) => [p.id, p]));
      const propMap = new Map<string, any>((props ?? []).map((p: any) => [p.id, p]));

      return rows.map((r) => {
        const prospect = r.prospect_listing_id ? pMap.get(r.prospect_listing_id) : null;
        const prop = r.property_id ? propMap.get(r.property_id) : null;
        const published = !!r.property_id && !!prop?.slug;
        const rooms = prospect?.rooms ? `${prospect.rooms} camere` : null;
        const zone = prospect?.zone || null;
        return {
          ...r,
          title: prop?.name || prospect?.title || "—",
          details: [rooms, zone].filter(Boolean).join(" · ") || "—",
          price: prospect?.price ?? null,
          rent: String(prospect?.category || "").startsWith("inchiriere"),
          ownerName: prospect?.owner_name || null,
          slug: prop?.slug || null,
          published,
        };
      });
    },
  });

  const publishNow = async (prospectId: string | null) => {
    if (!prospectId) return toast.error("Anunțul nu are prospect asociat");
    setBusy(prospectId);
    const { data, error } = await supabase.functions.invoke("auto-publish-listing-worker", {
      body: { prospect_id: prospectId, triggered_by: "admin_publish_now" },
    });
    setBusy(null);
    if (error || !data?.success) return toast.error("Publicarea a eșuat");
    if (data.published) toast.success("Anunț publicat pe realtrust.ro");
    else toast.info(`Nepublicat: ${data.reason ?? "motiv necunoscut"}`);
    q.refetch();
  };

  const rows = q.data ?? [];
  const todayBucharest = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
  const publishedToday = rows.filter(
    (r) => r.published_at && new Date(r.published_at).toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" }) === todayBucharest,
  ).length;

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4 border-b flex flex-wrap items-center gap-3">
        <h3 className="font-semibold">Anunțuri Preluate Automat</h3>
        <Badge variant="secondary">Total anunțuri preluate: {rows.length}</Badge>
        <Badge>Publicate azi: {publishedToday}</Badge>
      </div>
      {q.isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Se încarcă…</p>
      ) : rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Niciun acord de publicare înregistrat încă.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="p-3">Data acordului</th>
                <th className="p-3">Proprietar</th>
                <th className="p-3">Telefon</th>
                <th className="p-3">Titlu / Detalii</th>
                <th className="p-3">Preț</th>
                <th className="p-3">Status publicare</th>
                <th className="p-3">Sursa</th>
                <th className="p-3">Acțiune</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 align-top">
                  <td className="p-3 whitespace-nowrap">{fmtDate(r.consented_at)}</td>
                  <td className="p-3">{r.ownerName || "—"}</td>
                  <td className="p-3 whitespace-nowrap">{fmtPhone(r.phone_normalized)}</td>
                  <td className="p-3 max-w-xs">
                    <span className="block truncate" title={r.title}>{r.title}</span>
                    <span className="text-xs text-muted-foreground">{r.details}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {r.price ? `${Number(r.price).toLocaleString("ro-RO")} €${r.rent ? "/lună" : ""}` : "—"}
                  </td>
                  <td className="p-3">
                    {r.published ? <Badge>Publicat</Badge> : <Badge variant="secondary">În așteptare</Badge>}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">WhatsApp</Badge>
                  </td>
                  <td className="p-3">
                    {r.published && r.slug ? (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={`https://realtrust.ro/proprietate/${r.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Vezi pe site
                        </a>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => publishNow(r.prospect_listing_id)}
                      >
                        <Rocket className="h-4 w-4 mr-1" />
                        {busy === r.prospect_listing_id ? "Se publică…" : "Publică acum"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
