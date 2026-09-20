/**
 * Pagină publică — anunțuri de la proprietari publicate cu acordul lor scris.
 * Afișează imaginea, descrierea, prețul și linkul către anunțul original.
 * Datele de contact NU sunt publicate.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ExternalLink, Loader2, MapPin, Search } from "lucide-react";

interface PublicListing {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  zone: string | null;
  rooms: number | null;
  size: number | null;
  image_url: string | null;
  source_url: string | null;
  source_platform: string | null;
  published_at: string | null;
}

const eur = (v: number | null, c?: string | null) =>
  v == null ? "Preț la cerere" : `${Math.round(Number(v)).toLocaleString("ro-RO")} ${c || "EUR"}`;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function AnunturiProprietari() {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["public-owner-listings"],
    queryFn: async (): Promise<PublicListing[]> => {
      const { data, error } = await supabase
        .from("owner_public_listings")
        .select("id, slug, title, description, price, currency, zone, rooms, size, image_url, source_url, source_platform, published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as PublicListing[];
    },
  });

  const rows = useMemo(() => {
    const needle = norm(q.trim());
    if (!needle) return data ?? [];
    return (data ?? []).filter((r) =>
      norm([r.title, r.zone, r.description].filter(Boolean).join(" ")).includes(needle),
    );
  }, [data, q]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Anunțuri de la proprietari în Timișoara | RealTrust"
        description="Apartamente și case oferite direct de proprietari din Timișoara, publicate cu acordul lor: preț, descriere și link către anunțul original."
        url="/anunturi-proprietari"
      />
      <Header />
      <main className="container mx-auto px-4 py-12 md:py-16">
        <header className="max-w-2xl mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Anunțuri de la proprietari</h1>
          <p className="text-muted-foreground">
            Oferte din Timișoara publicate direct de proprietari, cu acordul lor scris. Prețul și
            descrierea vin din anunțul original, pe care îl poți deschide oricând.
          </p>
        </header>

        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caută după zonă sau cuvinte din anunț"
            className="pl-9 min-h-[48px]"
            aria-label="Caută în anunțurile de la proprietari"
          />
        </div>

        {isLoading && (
          <div className="py-16 grid place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && rows.length === 0 && (
          <p className="text-muted-foreground py-12">
            Momentan nu avem anunțuri publicate. Revino curând — lista se completează pe măsură ce
            proprietarii ne dau acordul.
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Card key={r.id} className="overflow-hidden flex flex-col">
              {r.image_url ? (
                <img
                  src={r.image_url}
                  alt={`Anunț proprietar: ${r.title}`}
                  loading="lazy"
                  className="w-full aspect-[4/3] object-cover"
                />
              ) : (
                <div className="w-full aspect-[4/3] bg-muted grid place-items-center text-muted-foreground text-sm">
                  Fără imagine
                </div>
              )}
              <CardContent className="p-4 flex flex-col gap-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Direct proprietar</Badge>
                  {r.source_platform && <Badge variant="outline">{r.source_platform}</Badge>}
                </div>
                <h2 className="font-semibold leading-snug line-clamp-2">{r.title}</h2>
                <p className="text-lg font-bold text-primary">{eur(r.price, r.currency)}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {[r.zone, r.rooms ? `${r.rooms} camere` : null, r.size ? `${r.size} mp` : null]
                    .filter(Boolean)
                    .join(" · ") || "Timișoara"}
                </p>
                {r.description && (
                  <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                    {r.description}
                  </p>
                )}
                {r.source_url && (
                  <Button asChild variant="outline" className="mt-auto min-h-[48px]">
                    <a href={r.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Vezi anunțul original
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
