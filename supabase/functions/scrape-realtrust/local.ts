export const canonicalSocialUrl = (url: string) => url.replace("://www.", "://").replace(/[?#].*$/, "").replace(/\/$/, "");
export function localSocialRows(properties: any[], articles: any[], imageUrl: (value: string) => string, keywords: string[] = []) {
  const photo = (value: unknown) => typeof value === "string" && value ? (/^https?:\/\//.test(value) ? value : value.startsWith("/") ? `https://realtrust.ro${value}` : imageUrl(value)) : null;
  const rows = [
    ...properties.map(p => {
      const images = [...new Set([p.image_path, ...(p.images ?? [])].map(photo).filter(Boolean))];
      const suffix = p.listing_type === "inchiriere" ? "/lună" : p.listing_type === "cazare" ? "/noapte" : "";
      const price = p.listing_type === "cazare" ? p.base_price_per_night : p.capital_necesar;
      return { type: "property", property_id: p.id, title: p.name, source_url: `https://realtrust.ro/proprietate/${p.slug || p.id}`, image_url: images[0] ?? null, image_urls: images, caption: [p.description_ro, p.location ? `Zonă: ${p.location}` : "", price ? `Preț: ${price} €${suffix}` : ""].filter(Boolean).join("\n\n"), status: "draft", posted_to: [] };
    }),
    ...articles.map(a => ({ type: "blog", title: a.title, source_url: `https://realtrust.ro/blog/${a.slug}`, image_url: photo(a.main_image_url || a.cover_image), image_urls: [photo(a.main_image_url || a.cover_image)].filter(Boolean), caption: a.excerpt || a.content?.replace(/<[^>]*>/g, " ").slice(0, 1800) || "", status: "draft", posted_to: [] })),
  ];
  return rows.filter(row => !keywords.length || keywords.some(k => `${row.title} ${row.caption} ${row.source_url}`.toLocaleLowerCase("ro").includes(k.toLocaleLowerCase("ro"))));
}
