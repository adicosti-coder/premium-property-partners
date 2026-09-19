import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
import PortalSearchFilters from "@/components/search/PortalSearchFilters";
import {
  EMPTY_PORTAL_FILTERS,
  distanceKm,
  filtersToParams,
  matchesPortalFilters,
  paramsToFilters,
  pricePerSqm,
  sortPortalListings,
  type PortalFilters,
} from "@/lib/portalSearch";
import {
  Building2,
  MapPin,
  Maximize2,
  BedDouble,
  MessageCircle,
  ArrowRight,
  List,
  Map as MapIcon,
} from "lucide-react";

const GlobalConversionWidgets = lazy(() => import("@/components/GlobalConversionWidgets"));
const PortalSearchMap = lazy(() => import("@/components/search/PortalSearchMap"));

const BASE_URL = "https://realtrust.ro";
const WA_NUMBER = "40799069256";
const CITY_CENTER = { lat: 45.754, lng: 21.227 };

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
  year_built: number | null;
  compartimentare: string | null;
  parking: string | null;
  furnished: string | null;
  features: string[] | null;
  description_ro: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  image_path: string | null;
  images: string[] | null;
  property_images: { image_path: string; is_primary: boolean; display_order: number }[] | null;
}

const COPY = {
  ro: {
    seoTitle: "Anunțuri apartamente Timișoara — caută pe zonă, preț, etaj | RealTrust",
    seoDescription:
      "Caută apartamente în Timișoara ca pe portaluri: zonă, preț, suprafață, camere, etaj, compartimentare și dotări, plus căutare pe hartă cu rază.",
    breadcrumb: "Anunțuri",
    h1: "Anunțuri apartamente în Timișoara",
    intro:
      "Filtrează exact ca pe marile portaluri — zonă, preț, suprafață, camere, etaj, compartimentare, an și dotări — sau caută pe hartă, în raza care te interesează.",
    rooms: "Camere",
    floorLabel: "Etaj",
    ground: "Parter",
    perMonth: "/lună",
    perNight: "/noapte",
    details: "Vezi apartamentul",
    whatsapp: "Întreabă pe WhatsApp",
    empty: "Niciun anunț nu respectă filtrele. Încearcă o rază mai mare sau șterge un filtru.",
    list: "Listă",
    map: "Hartă",
    sqm: "€/mp",
  },
  en: {
    seoTitle: "Apartment listings in Timișoara — search by area, price, floor | RealTrust",
    seoDescription:
      "Search apartments in Timișoara like on the big portals: area, price, size, rooms, floor, layout and amenities, plus map search with radius.",
    breadcrumb: "Listings",
    h1: "Apartment listings in Timișoara",
    intro:
      "Filter just like on the big portals — area, price, size, rooms, floor, layout, year and amenities — or search on the map within your radius.",
    rooms: "Rooms",
    floorLabel: "Floor",
    ground: "Ground floor",
    perMonth: "/mo",
    perNight: "/night",
    details: "View apartment",
    whatsapp: "Ask on WhatsApp",
    empty: "No listing matches your filters. Try a wider radius or clear a filter.",
    list: "List",
    map: "Map",
    sqm: "€/sqm",
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
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState<PortalFilters>(() => paramsToFilters(params));
  const [view, setView] = useState<"list" | "map">("list");
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(3);

  /** Filtrele rămân în adresa paginii, ca să poată fi trimise ca link. */
  useEffect(() => {
    const next = filtersToParams(filters);
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const { data, isLoading } = useQuery({
    queryKey: ["anunturi-page-listings-v2"],
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      const { data: rows, error } = await fetchWithRetry<Listing[]>(() =>
        supabase
          .from("properties")
          .select(
            "id, slug, name, location, listing_type, capital_necesar, size, bedrooms, floor, year_built, compartimentare, parking, furnished, features, description_ro, latitude, longitude, created_at, image_path, images, property_images(image_path, is_primary, display_order)",
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

  const floorText = (floor: string | null) => {
    if (!floor) return null;
    if (/^\d+$/.test(floor)) return Number(floor) === 0 ? copy.ground : `${copy.floorLabel} ${floor}`;
    return floor;
  };

  const filtered = useMemo(() => {
    const matched = listings.filter((l) => {
      const ok = matchesPortalFilters(
        {
          title: l.name,
          text: [
            l.description_ro ?? "",
            l.compartimentare ?? "",
            l.parking ?? "",
            l.furnished ?? "",
            floorText(l.floor) ?? "",
            (l.features ?? []).join(" "),
            l.size ? `${l.size} mp` : "",
            l.bedrooms ? `${l.bedrooms} camere` : "",
          ].join(" "),
          transaction: l.listing_type,
          price: l.capital_necesar,
          surface: l.size,
          rooms: l.bedrooms,
          year: l.year_built,
          zone: l.location,
          createdAt: l.created_at,
        },
        filters,
      );
      if (!ok) return false;
      if (view === "map" && mapCenter && l.latitude && l.longitude) {
        return distanceKm(mapCenter, { lat: l.latitude, lng: l.longitude }) <= radiusKm;
      }
      return true;
    });
    return sortPortalListings(
      matched.map((l) => ({
        ...l,
        title: l.name,
        text: "",
        price: l.capital_necesar,
        surface: l.size,
        createdAt: l.created_at,
      })),
      filters.sort,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings, filters, view, mapCenter, radiusKm]);

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

          <header className="max-w-3xl mx-auto text-center mt-6 mb-8">
            <h1 className="text-3xl md:text-4xl lg:text-5xl heading-premium text-foreground mb-4">
              {copy.h1}
            </h1>
            <p className="text-muted-foreground text-lg text-premium">{copy.intro}</p>
          </header>

          <PortalSearchFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(EMPTY_PORTAL_FILTERS)}
            resultCount={filtered.length}
            english={!ro}
          />

          <div className="flex justify-center gap-2 my-6">
            <Button
              variant={view === "list" ? "default" : "outline"}
              className="min-h-12 rounded-full px-5"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
            >
              <List className="w-4 h-4 mr-2" aria-hidden="true" />
              {copy.list}
            </Button>
            <Button
              variant={view === "map" ? "default" : "outline"}
              className="min-h-12 rounded-full px-5"
              onClick={() => {
                setView("map");
                setMapCenter((c) => c ?? CITY_CENTER);
              }}
              aria-pressed={view === "map"}
            >
              <MapIcon className="w-4 h-4 mr-2" aria-hidden="true" />
              {copy.map}
            </Button>
          </div>

          {view === "map" && (
            <div className="mb-8">
              <Suspense fallback={<Skeleton className="h-[420px] rounded-2xl" />}>
                <PortalSearchMap
                  pins={filtered
                    .filter((l) => l.latitude && l.longitude)
                    .map((l) => ({
                      id: l.id,
                      name: l.name,
                      href: `/proprietate/${l.slug ?? l.id}`,
                      lat: l.latitude as number,
                      lng: l.longitude as number,
                      priceLabel: l.capital_necesar
                        ? `${Math.round(l.capital_necesar / 1000)}k €`
                        : null,
                    }))}
                  center={mapCenter ?? CITY_CENTER}
                  radiusKm={radiusKm}
                  onCenterChange={setMapCenter}
                  onRadiusChange={setRadiusKm}
                  onReset={() => setMapCenter(null)}
                  english={!ro}
                />
              </Suspense>
            </div>
          )}

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
                // €/mp are sens doar pentru prețuri de vânzare, nu pentru chirii/tarife
                const perSqm = (l.capital_necesar ?? 0) >= 20000 ? pricePerSqm(l.capital_necesar, l.size) : null;
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
                      {l.listing_type && (
                        <Badge className="absolute top-3 left-3">
                          {l.listing_type === "vanzare"
                            ? ro ? "De vânzare" : "For sale"
                            : l.listing_type === "inchiriere"
                              ? ro ? "De închiriat" : "For rent"
                              : l.listing_type === "cazare"
                                ? ro ? "Regim hotelier" : "Short-term"
                                : ro ? "Investiție" : "Investment"}
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

                      {price && (
                        <p className="text-xl font-semibold text-foreground">
                          {price}
                          {perSqm && l.listing_type !== "cazare" && (
                            <span className="ml-2 text-sm font-normal text-muted-foreground">
                              {perSqm.toLocaleString(ro ? "ro-RO" : "en-US")} {copy.sqm}
                            </span>
                          )}
                        </p>
                      )}

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
