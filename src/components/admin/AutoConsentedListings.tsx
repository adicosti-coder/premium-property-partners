import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Rocket, Download, Search } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { csvFileName, downloadCsv } from "@/utils/exportCsv";
import { consentDate, consentPhone, consentPhoneVariants, listingSource, matchesConsentSearch, originalListingUrl } from "./autoConsentedListingUtils";
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

/** Batch related records to keep URL filters within practical request limits. */
async function relatedRows(table: string, columns: string, field: string, values: string[]): Promise<any[]> {
  const unique = [...new Set(values)];
  const result: any[] = [];
  for (let i = 0; i < unique.length; i += 100) {
    const { data, error } = await (supabase.from(table as any) as any)
      .select(columns).in(field, unique.slice(i, i + 100));
    if (error) throw error;
    result.push(...(data ?? []));
  }
  return result;
}

const sourceStyle = (source: string) => source === "OLX"
  ? "bg-success-soft text-success border-success/30"
  : source === "Publi24" ? "bg-primary/10 text-primary border-primary/30"
  : source === "Storia" ? "bg-booking-blue text-success-foreground border-booking-blue"
  : "bg-muted text-muted-foreground";

/** Anunțuri pentru care proprietarul a dat acordul de publicare pe WhatsApp. */
export default function AutoConsentedListings() {
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["auto-consented-listings"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const rows: ConsentRow[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await (supabase.from("wa_publish_consents") as any)
          .select("id, phone_normalized, consented_at, published_at, property_id, prospect_listing_id, status, source")
          .not("consented_at", "is", null).is("revoked_at", null)
          .order("consented_at", { ascending: false }).order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        rows.push(...(data ?? []));
        if ((data ?? []).length < 500) break;
      }

      const prospectIds = rows.map((r) => r.prospect_listing_id).filter(Boolean) as string[];
      const propertyIds = rows.map((r) => r.property_id).filter(Boolean) as string[];

      const [prospects, props, contacts, conversations] = await Promise.all([
        relatedRows("prospect_listings", "id, title, zone, price, category, rooms, contact_name, contact_phone, source_url, source_platform", "id", prospectIds),
        relatedRows("properties", "id, slug, name, is_active, source_url, original_source_url, source_platform", "id", propertyIds),
        relatedRows("property_contact_details", "property_id, contact_name", "property_id", propertyIds),
        relatedRows("wa_conversations", "phone_normalized, wa_profile_name", "phone_normalized", rows.flatMap((r) => consentPhoneVariants(r.phone_normalized))),
      ]);

      const pMap = new Map<string, any>((prospects ?? []).map((p: any) => [p.id, p]));
      const propMap = new Map<string, any>((props ?? []).map((p: any) => [p.id, p]));
      const contactMap = new Map<string, string>(contacts.map((c) => [c.property_id, c.contact_name]));
      const nameMap = new Map<string, string>();
      conversations.forEach((c) => {
        if (c.wa_profile_name?.trim()) nameMap.set(consentPhone(c.phone_normalized), c.wa_profile_name.trim());
      });

      return rows.map((r) => {
        const prospect = r.prospect_listing_id ? pMap.get(r.prospect_listing_id) : null;
        const prop = r.property_id ? propMap.get(r.property_id) : null;
        const published = !!r.property_id && !!prop?.slug && prop.is_active === true;
        const rooms = prospect?.rooms ? `${prospect.rooms} camere` : null;
        const zone = prospect?.zone || null;
        const sourceUrl = originalListingUrl(prospect?.source_url, prop?.original_source_url, prop?.source_url);
        return {
          ...r,
          title: prop?.name || prospect?.title || "—",
          details: [rooms, zone].filter(Boolean).join(" · ") || "—",
          price: prospect?.price ?? null,
          rent: String(prospect?.category || "").startsWith("inchiriere"),
          ownerName: prospect?.contact_name?.trim() || (r.property_id ? contactMap.get(r.property_id)?.trim() : null) || nameMap.get(consentPhone(r.phone_normalized)) || null,
          sourceUrl,
          originalSource: listingSource(prospect?.source_platform || prop?.source_platform, sourceUrl),
          slug: prop?.slug || null,
          published,
        };
      });
    },
  });

  const publishNow = async (prospectId: string | null) => {
    if (!prospectId) return toast.error("Anunțul nu are prospect asociat");
    setBusy(prospectId);
    try {
      const { data, error } = await supabase.functions.invoke("publish-consented-listing", {
        body: { prospect_id: prospectId },
      });
      if (error) {
        const details = error instanceof FunctionsHttpError ? await error.context.text() : error.message;
        throw new Error(details);
      }
      if (!data?.success) throw new Error(data?.error || data?.reason || "Publicarea a eșuat");
      if (data.published) toast.success("Anunț publicat pe realtrust.ro");
      else toast.info(`Nepublicat: ${data.reason ?? "motiv necunoscut"}`);
      await q.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publicarea a eșuat");
    } finally { setBusy(null); }
  };

  const rows = q.data ?? [];
  const visibleRows = rows.filter((r) => matchesConsentSearch(r, search));
  const exportRows = () => downloadCsv(csvFileName("acorduri-whatsapp"),
    ["Data acordului", "Proprietar", "Telefon", "Titlu", "Detalii", "Preț EUR", "Tip", "Status publicare", "Sursa originală", "Link original", "Link realtrust.ro", "Canal acord"],
    visibleRows.map((r) => [consentDate(r.consented_at), r.ownerName || "Nume neînregistrat", consentPhone(r.phone_normalized), r.title, r.details, r.price, r.rent ? "Închiriere" : "Vânzare", r.published ? "Publicat" : "Așteaptă publicare", r.originalSource, r.sourceUrl, r.published && r.slug ? `https://realtrust.ro/proprietate/${r.slug}` : "", "WhatsApp"]));
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
      <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Caută după nume, telefon sau cartier" placeholder="Nume, telefon sau cartier…" className="pl-9 h-12" />
        </div>
        <Button variant="outline" className="min-h-12" disabled={q.isLoading || !!q.error || visibleRows.length === 0} onClick={exportRows}>
          <Download className="h-4 w-4" />Export CSV
        </Button>
      </div>
      {q.isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Se încarcă…</p>
      ) : q.isError ? (
        <div role="alert" className="p-4 space-y-2">
          <p className="text-sm text-destructive">Nu am putut încărca acordurile: {q.error.message}</p>
          <Button variant="outline" className="min-h-12" onClick={() => q.refetch()}>Reîncearcă</Button>
        </div>
      ) : rows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Niciun acord de publicare înregistrat încă.</p>
      ) : visibleRows.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">Niciun acord găsit pentru această căutare.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Anunțuri cu acord de publicare WhatsApp">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b">
                <th className="p-3">Data acordului</th>
                <th className="p-3">Proprietar</th>
                <th className="p-3">Telefon</th>
                <th className="p-3">Titlu / Detalii</th>
                <th className="p-3">Preț</th>
                <th className="p-3">Status publicare</th>
                <th className="p-3">Sursă anunț original</th>
                <th className="p-3">Acțiuni &amp; Link-uri</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 align-top">
                  <td className="p-3 whitespace-nowrap">{consentDate(r.consented_at)}</td>
                  <td className="p-3 min-w-40">{r.ownerName || "Nume neînregistrat"}</td>
                  <td className="p-3 whitespace-nowrap">{consentPhone(r.phone_normalized) || "—"}</td>
                  <td className="p-3 max-w-xs">
                    <span className="block truncate" title={r.title}>{r.title}</span>
                    <span className="text-xs text-muted-foreground">{r.details}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {r.price ? `${Number(r.price).toLocaleString("ro-RO")} €${r.rent ? "/lună" : ""}` : "—"}
                  </td>
                  <td className="p-3">
                    {r.published ? <Badge variant="outline" className="bg-success-soft text-success border-success/30">Publicat</Badge> : <Badge variant="secondary" className="whitespace-nowrap">Așteaptă publicare</Badge>}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className={sourceStyle(r.originalSource)}>{r.originalSource}</Badge>
                    <span className="block mt-1 text-xs text-muted-foreground">Acord WhatsApp</span>
                  </td>
                  <td className="p-3 min-w-56">
                    <div className="flex flex-col items-start gap-2">
                    {r.sourceUrl ? (
                      <Button size="sm" variant="outline" className="min-h-12" asChild>
                        <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`Deschide anunțul original pe ${r.originalSource}`}>
                          <ExternalLink className="h-4 w-4" />Anunț original
                        </a>
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">Fără link original</span>}
                    {r.published && r.slug ? (
                      <Button size="sm" variant="success" className="min-h-12" asChild>
                        <a
                          href={`https://realtrust.ro/proprietate/${r.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Vezi pe realtrust.ro
                        </a>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="min-h-12"
                        disabled={busy !== null || !r.prospect_listing_id}
                        onClick={() => publishNow(r.prospect_listing_id)}
                      >
                        <Rocket className="h-4 w-4 mr-1" />
                        {busy !== null && busy === r.prospect_listing_id ? "Se publică…" : "Publică Acum"}
                      </Button>
                    )}
                    </div>
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
