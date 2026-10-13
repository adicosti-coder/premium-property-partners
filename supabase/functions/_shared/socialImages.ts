import { selectSocialImage, socialImageTopic } from "./socialImageSelection.ts";
function storedImage(sb: any, value: unknown): unknown {
  if (typeof value !== "string" || !value) return null;
  if (/^https?:\/\/|^\//.test(value)) return value;
  return sb.storage.from("property-images").getPublicUrl(value).data.publicUrl;
}
export async function resolveSocialFeaturedImage(sb: any, opts: { title: string; type: string; sourceUrl: string; metadata?: any; markdown?: string; currentImage?: unknown }) {
  const m = opts.metadata ?? {};
  const candidates: unknown[] = [m.ogImage, m["og:image"], m.featuredImage, m.image, m.twitterImage, opts.currentImage];
  const url = new URL(opts.sourceUrl);
  const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
  if (opts.type === "blog") {
    const { data } = await sb.from("blog_articles").select("main_image_url,cover_image").eq("slug", slug).maybeSingle();
    candidates.push(data?.main_image_url, data?.cover_image);
  } else {
    let q = sb.from("properties").select("id,image_path,images");
    q = /^[0-9a-f-]{36}$/i.test(slug) ? q.eq("id", slug) : q.eq("slug", slug);
    const { data } = await q.maybeSingle();
    if (data?.id) {
      const { data: gallery } = await sb.from("property_images").select("image_path").eq("property_id", data.id).eq("is_published", true).order("display_order").limit(10);
      candidates.push(...(gallery ?? []).map((r: any) => storedImage(sb, r.image_path)), storedImage(sb, data.image_path), ...(data.images ?? []).map((u: unknown) => storedImage(sb, u)));
    }
  }
  const original = selectSocialImage(opts.title, opts.type, candidates, opts.markdown);
  if (original) return original;
  // Reuse inspected editorial assets. Never invent a property or city photograph.
  const topic = opts.type === "blog" ? socialImageTopic(opts.title) : null;
  return topic ? sb.storage.from("property-images").getPublicUrl(`social/topics/${topic}.jpg`).data.publicUrl : null;
}
