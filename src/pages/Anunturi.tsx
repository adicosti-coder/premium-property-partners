import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { fetchWithRetry } from "@/lib/supabaseRetry";
import { useLanguage } from "@/i18n/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import BackToTop from "@/components/BackToTop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { storageImage, storageImageSrcSet } from "@/utils/supabaseImage";
import {
  Building2,
  Key,
  Hotel,
  MapPin,
  Maximize2,
  BedDouble,
  MessageCircle,
  ArrowRight,
} from "lucide-react";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));

const BASE_URL = "https://realtrust.ro";
const WA_NUMBER = "40799069256";

interface Listing {
  id: string;
  slug: string | null;
  name: string;
  location: string | null;
  listing_type: string | null;
  capital_necesar: number | null;
  size: number | null;
  bedrooms: number | null;
  floor: string | null;
  image_path: string | null;
  images: string[] | null;
  property_images: { image_path: string; is_primary: boolean; display_order: number }[] | null;
}

type FilterKey = "toate" | "vanzare" | "inchiriere" | "cazare";

const COPY = {
  ro: {
    seoTitle: "Anunțuri apartamente Timișoara — poze, suprafață, etaj | RealTrust",
    seoDescription:
      "Toate apartamentele RealTrust din Timișoara: poze, suprafață, etaj, cameră și vecinătate, cu preț și contact direct pe WhatsApp înainte de discuție.",
    breadcrumb: "Anunțuri",
    h1: "Anunțuri apartamente în Timișoara",
    intro:
      "Vezi toate apartamentele noastre — poze, suprafață, etaj, camere și vecinătate — și scrie-ne direct pe WhatsApp pentru ofertă sau vizionare.",
    filters: {
      toate: "Toate",
      vanzare: "De vânzare",
      inchiriere: "De închiriat",
      cazare: "Regim hotelier",
    },
    size: "Suprafață",
    rooms: "Camere",
    floorLabel: "Etaj",
    ground: "Parter",
    perMonth: "/lună",
    perNight: "/noapte",
    details: "Vezi apartamentul",
    whatsapp: "Întreabă pe WhatsApp",
    empty: "Momentan nu avem anunțuri în această categorie.",
    count: (n: number) => `${n} apartamente disponibile`,
  },
  en: {
    seoTitle: "Apartment listings in Timișoara — photos, size, floor | RealTrust",
    seoDescription:
      "All RealTrust apartments in Timișoara: photos, size, floor, rooms and neighbourhood, with price and direct WhatsApp contact.",
    breadcrumb: "Listings",
    h1: "Apartment listings in Timișoara",
    intro:
      "Browse all our apartments — photos, size, floor, rooms and neighbourhood — and message us on WhatsApp for an offer or a viewing.",
    filters: {
      toate: "All",
      vanzare: "For sale",
      inchiriere: "For rent",
      cazare: "Short-term rental",
    },
    size: "Size",
    rooms: "Rooms",
    floorLabel: "Floor",
    ground: "Ground floor",
    perMonth: "/mo",
    perNight: "/night",
    details: "View apartment",
    whatsapp: "Ask on WhatsApp",
    empty: "No listings in this category right now.",
    count: (n: number) => `${n} apartments available`,
  },
} as const;

const imageUrl = (l: Listing) => {
  const path =
    l.image_path ||
    l.property_images?.find((i) => i.is_primary)?.image_path ||
    l.property_images?.[0]?.image_path ||
    (Array.isArray(l.images) ? l.images.find(Boolean) : null);
  if (!path) return "/placeholder.svg";
  if (path.startsWith("http")) return path;
  return `https://mvzssjyzbwccioqvhjpo.supabase.co/storage/v1/object/public/property-images/${path}`;
};

const Anunturi = () => {
  const { language } = useLanguage();
  const ro = language !== "en";
  const copy = ro ? COPY.ro : COPY.en;
  const [filter, setFilter] = useState<FilterKey>("toate");

  const { data, isLoading } = useQuery({
    queryKey: ["anunturi-page-listings"],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data: rows, error } = await fetchWithRetry<Listing[]>(() =>
        supabase
          .from("properties")
          .select(
            "id, slug, name, location, listing_type, capital_necesar, size, bedrooms, floor, image_path, images, property_images(image_path, is_primary, display_order)",
          )
          .eq("is_active", true)
          .order("display_order", { ascending: true }) as unknown as PromiseLike<{
          data: Listing[] | null;
          error: { message?: string } | null;
        }>,
      );
      if (error) throw error;
      return (rows ?? []) as Listing[];
    },
  });

  const listings = data ?? [];
  const filtered = useMemo(
    () => (filter === "toate" ? listings : listings.filter((l) => l.listing_type === filter)),
    [listings, filter],
  );

  const floorText = (floor: string | null) => {
    if (!floor) return null;
    if (/^\d+$/.test(floor)) return Number(floor) === 0 ? copy.ground : `${copy.floorLabel} ${floor}`;
    return floor;
  };

  const priceText = (l: Listing) => {
    if (!l.capital_necesar) return null;
    const v = l.capital_necesar.toLocaleString(ro ? "ro-RO" : "en-US");
    if (l.listing_type === "inchiriere") return `${v} €${copy.perMonth}`;
    if (l.listing_type === "cazare") return `${v} €${copy.perNight}`;
    return `${v} €`;
  };

  const waHref = (l: Listing) => {
    const text = [
      ro ? `Bună ziua! Sunt interesat de ${l.name}.` : `Hello! I'm interested in ${l.name}.`,
      [l.size ? `${l.size} m²` : null, floorText(l.floor), l.location].filter(Boolean).join(" · "),
    ]
      .filter(Boolean)
      .join("\n");
    return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${BASE_URL}/anunturi`,
    name: copy.h1,
    numberOfItems: listings.length,
    itemListElement: listings.slice(0, 30).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${BASE_URL}/proprietate/${l.slug ?? l.id}`,
      name: l.name,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={copy.seoTitle}
        description={copy.seoDescription}
        url={`${BASE_URL}/anunturi`}
        jsonLd={jsonLd}
        breadcrumbItems={[
          { name: ro ? "Acasă" : "Home", url: BASE_URL },
          { name: copy.breadcrumb, url: `${BASE_URL}/anunturi` },
        ]}
      />
      <Header />

      <main className="pt-24 pb-20">
        <div className="container mx-auto px-6 lg:px-8">
          <PageBreadcrumb items={[{ label: copy.breadcrumb }]} />

          <header className="max-w-3xl mx-auto text-center mt-6 mb-10">
            <h1 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-4">
              {copy.h1}
            </h1>
            <p className="text-muted-foreground text-lg text-premium">{copy.intro}</p>
            {!isLoading && (
              <p className="mt-3 text-sm text-muted-foreground">{copy.count(listings.length)}</p>
            )}
          </header>

          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {(["toate", "vanzare", "inchiriere", "cazare"] as FilterKey[]).map((key) => (
              <Button
                key={key}
                variant={filter === key ? "default" : "outline"}
                className="min-h-12 rounded-full px-5"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
              >
                {key === "vanzare" && <Building2 className="w-4 h-4 mr-2" aria-hidden="true" />}
                {key === "inchiriere" && <Key className="w-4 h-4 mr-2" aria-hidden="true" />}
                {key === "cazare" && <Hotel className="w-4 h-4 mr-2" aria-hidden="true" />}
                {copy.filters[key]}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-96 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">{copy.empty}</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((l) => {
                const href = `/proprietate/${l.slug ?? l.id}`;
                const src = imageUrl(l);
                const price = priceText(l);
                return (
                  <article
                    key={l.id}
                    className="group bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col"
                  >
                    <Link to={href} className="relative block h-52 overflow-hidden bg-muted">
                      <img
                        src={storageImage(src, { width: 400 })}
                        srcSet={storageImageSrcSet(src)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        alt={`${l.name} — ${l.location ?? "Timișoara"}${l.size ? `, ${l.size} m²` : ""}`}
                        width={400}
                        height={208}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {l.listing_type && l.listing_type !== "toate" && (
                        <Badge className="absolute top-3 left-3">
                          {l.listing_type === "vanzare" || l.listing_type === "inchiriere" || l.listing_type === "cazare"
                            ? copy.filters[l.listing_type]
                            : ro
                              ? "Investiție"
                              : "Investment"}
                        </Badge>
                      )}
                    </Link>

                    <div className="p-5 flex flex-col gap-3 flex-1">
                      <h2 className="text-lg font-semibold leading-snug">
                        <Link to={href} className="hover:text-primary transition-colors">
                          {l.name}
                        </Link>
                      </h2>

                      {l.location && (
                        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
                          {l.location}
                        </p>
                      )}

                      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {l.size && (
                          <li className="flex items-center gap-1.5">
                            <Maximize2 className="w-4 h-4" aria-hidden="true" />
                            {l.size} m²
                          </li>
                        )}
                        {floorText(l.floor) && (
                          <li className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4" aria-hidden="true" />
                            {floorText(l.floor)}
                          </li>
                        )}
                        {l.bedrooms && (
                          <li className="flex items-center gap-1.5">
                            <BedDouble className="w-4 h-4" aria-hidden="true" />
                            {l.bedrooms} {copy.rooms.toLowerCase()}
                          </li>
                        )}
                      </ul>

                      {price && <p className="text-xl font-semibold text-foreground">{price}</p>}

                      <div className="mt-auto flex flex-col sm:flex-row gap-2 pt-2">
                        <Button asChild className="min-h-12 flex-1">
                          <Link to={href}>
                            {copy.details}
                            <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="min-h-12 flex-1">
                          <a
                            href={waHref(l)}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`${copy.whatsapp} — ${l.name}`}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" aria-hidden="true" />
                            {copy.whatsapp}
                          </a>
                        </Button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
      <BackToTop />
      <Suspense fallback={null}>
        <GlobalConversionWidgets />
      </Suspense>
    </div>
  );
};

export default Anunturi;
