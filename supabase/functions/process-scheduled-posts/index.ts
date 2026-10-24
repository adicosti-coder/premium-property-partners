// Social Engine · trimite postări către webhook-ul Make.com din app_settings.
// - cron (orchestrator, */5 min): postările „scheduled” cu scheduled_at <= acum
// - admin: { post_id, platforms } pentru trimitere manuală
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { formatSocialCaption } from "../_shared/socialCaption.ts";
import { prepareInstagramImages } from "../_shared/instagramImages.ts";
import { resolveSocialFeaturedImage } from "../_shared/socialImages.ts";
import { usableSocialImage } from "../_shared/socialImageSelection.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;
const PLATFORMS = ["instagram", "facebook"] as const;

export const isMakeWebhook = (u: string) => {
  try { const x = new URL(u); return x.protocol === "https:" && /(^|\.)make\.com$/.test(x.hostname); } catch { return false; }
};

async function resolveImages(sb: any, post: any): Promise<string[]> {
  const list: string[] = [];
  const featured = post.media_type === "STORY" && post.image_url ? usableSocialImage(post.image_url, post.title, post.type) : await resolveSocialFeaturedImage(sb, { title: post.title, type: post.type, sourceUrl: post.source_url, currentImage: post.image_url });
  if (featured) list.push(featured);
  for (const u of post.image_urls ?? []) list.push(u);
  if (post.property_id) {
    const { data } = await sb.rpc("social_property_image_urls", { _property_id: post.property_id });
    for (const u of (data as string[] | null) ?? []) list.push(u);
  }
  return [...new Set(list.map(u => usableSocialImage(u, post.title, post.type)).filter((u): u is string => !!u))].slice(0, 10);
}

export function mediaTypeOf(post: { media_type?: string | null }, imageCount: number): "IMAGE" | "CAROUSEL" | "REELS" | "STORY" {
  if (post.media_type === "STORY") return "STORY";
  if (post.media_type === "REELS") return "REELS";
  // IMAGE is the column default for every row, so it cannot mean an explicit
  // single-photo choice: multi-photo posts keep going out as carousels.
  return imageCount > 1 ? "CAROUSEL" : "IMAGE";
}

async function payload(sb: any, post: any, platform: string, trigger: string) {
  const reels = post.media_type === "REELS";
  const story = post.media_type === "STORY";
  let videoUrl: string | null = (reels || story) && typeof post.video_url === "string" && /^https:\/\//.test(post.video_url) ? post.video_url : null;
  const own = videoUrl?.match(/\/storage\/v1\/object\/sign\/social-reels\/([^?]+)/);
  if (own) {
    // Reînnoim linkul semnat la trimitere, ca Make.com să primească mereu un URL valid.
    const { data } = await sb.storage.from("social-reels").createSignedUrl(decodeURIComponent(own[1]), 60 * 60 * 24 * 3);
    if (data?.signedUrl) videoUrl = data.signedUrl;
  }
  if (reels && !videoUrl) throw new Error("Reel Video cere un video MP4 — generează-l din poze sau lipește un URL în ciornă.");
  const originals = await resolveImages(sb, post);
  if ((platform === "instagram" || story) && !videoUrl && !originals.length) throw new Error("Nu există o imagine relevantă — adaugă o fotografie în ciornă.");
  // Toate platformele primesc imagini 1:1/4:5 (feed) sau 9:16 (Story) validate — evită eroarea Meta 36003.
  const prepared = !videoUrl && originals.length ? await prepareInstagramImages(story ? originals.slice(0, 1) : originals, story) : originals;
  const media_type = mediaTypeOf(post, prepared.length);
  const imageUrls = media_type === "CAROUSEL" ? prepared : prepared.slice(0, 1);
  const storyLink = story && typeof post.story_link_url === "string" ? post.story_link_url.trim() : "";
  if (storyLink) {
    const link = new URL(storyLink);
    if (!["https:", "http:"].includes(link.protocol) || storyLink.length > 2048) throw new Error("Story Link URL invalid.");
  }
  return {
    title: post.title,
    caption: formatSocialCaption(post.caption || "", { platform: platform === "instagram" ? "instagram" : "facebook", type: post.type === "blog" ? "blog" : "property", sourceUrl: post.source_url }),
    media_type, video_url: videoUrl, story_link_url: storyLink || null,
    imageUrl: imageUrls[0] ?? null, imageUrls, isCarousel: media_type === "CAROUSEL",
    sourceUrl: post.source_url, platform, type: post.type, timestamp: new Date().toISOString(), triggered_from: trigger,
  };
}
async function send(sb: any, url: string, post: any, platform: string, trigger: string) {
  let imageCount = 0;
  let status: number | null = null, text = "", err: string | null = null;
  try {
    const data = await payload(sb, post, platform, trigger);
    imageCount = data.imageUrls.length;
    const r = await fetch(url, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000), body: JSON.stringify(data),
    });
    status = r.status;
    text = (await r.text()).slice(0, 1000);
    if (!r.ok) err = `Make.com ${r.status}: ${text.slice(0, 200)}`;
  } catch (e) { err = e instanceof Error ? e.message : String(e); }
  await sb.from("social_engine_logs").insert({
    post_id: post.id, post_title: post.title, platform, trigger, success: !err,
    http_status: status, response_body: text || null, error: err, image_count: imageCount,
  });
  if (err) throw new Error(err);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
  if (body.post_id !== undefined && (typeof body.post_id !== "string" || !UUID.test(body.post_id))) return json({ error: "Postare invalidă" }, 400);
  if (body.dry_run !== undefined && typeof body.dry_run !== "boolean") return json({ error: "dry_run invalid" }, 400);
  if (body.current_image !== undefined && body.current_image !== null && (typeof body.current_image !== "string" || body.current_image.length > 2048)) return json({ error: "Imagine invalidă" }, 400);
  if (body.current_media_type !== undefined && !["IMAGE", "CAROUSEL", "REELS", "STORY"].includes(body.current_media_type)) return json({ error: "Tip media invalid" }, 400);
  if (body.preview_image_only !== undefined && typeof body.preview_image_only !== "boolean") return json({ error: "Previzualizare invalidă" }, 400);
  if (body.dry_run === true) {
    if (!body.post_id) return json({ error: "Postarea este obligatorie" }, 400);
    const { data: post } = await sb.from("social_posts").select("*").eq("id", body.post_id).maybeSingle();
    if (!post) return json({ error: "Postare negăsită" }, 404);
    if (body.current_image !== undefined) post.image_url = body.current_image;
    if (body.current_media_type !== undefined) post.media_type = body.current_media_type;
    if (body.preview_image_only === true) { post.video_url = null; if (post.media_type === "REELS") post.media_type = "IMAGE"; }
    try { return json({ success: true, payload: await payload(sb, post, "instagram", "admin_preview") }); }
    catch (e) { return json({ error: e instanceof Error ? e.message : "Imagine indisponibilă" }, 422); }
  }
  const { data: setting } = await sb.from("app_settings").select("value").eq("key", "webhook_url").maybeSingle();
  const webhook = setting?.value?.trim() ?? "";
  if (!webhook) return json({ success: false, error: "Webhook Make.com neconfigurat" }, body?.post_id ? 400 : 200);
  if (!isMakeWebhook(webhook)) return json({ success: false, error: "URL-ul webhook trebuie să fie un webhook Make.com (https://…make.com)" }, 400);

  // Manual (admin)
  if (typeof body?.post_id === "string" && UUID.test(body.post_id)) {
    const platforms = (Array.isArray(body.platforms) ? body.platforms : PLATFORMS).filter((p: string) => (PLATFORMS as readonly string[]).includes(p));
    if (!platforms.length) return json({ success: false, error: "Platformă invalidă" }, 400);
    const { data: post } = await sb.from("social_posts").select("*").eq("id", body.post_id).maybeSingle();
    if (!post) return json({ success: false, error: "Postare negăsită" }, 404);
    try {
      for (const p of platforms) await send(sb, webhook, post, p, "admin_manual");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sb.from("social_posts").update({ last_error: msg }).eq("id", post.id);
      return json({ success: false, error: msg }, 502);
    }
    const posted_to = [...new Set([...(post.posted_to ?? []), ...platforms])];
    await sb.from("social_posts").update({ status: "posted", posted_to, last_error: null }).eq("id", post.id);
    return json({ success: true, posted_to });
  }

  // Cron. Mod eșalonat pentru Stories: { media_type: "STORY", min_interval_minutes }
  // → cel mult O story per rulare, la minimum N minute după ultima trimisă, 09–21 ora României.
  const storyMode = body?.media_type === "STORY";
  const trigger = storyMode ? "cron_story" : "cron_job";
  // Atât Stories, cât și postările din feed pleacă eșalonat: max 1 per rulare,
  // la minimum N minute după ultima trimisă de același tip, 09–21 ora României.
  {
    const minInterval = Math.max(15, Math.min(720, Number(body.min_interval_minutes) || (storyMode ? 60 : 55)));
    const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Bucharest" }).format(new Date()));
    if (hour < 9 || hour >= 21) return json({ success: true, skipped: "outside_window", hour });
    const { data: last } = await sb.from("social_engine_logs").select("created_at")
      .eq("trigger", trigger).eq("success", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (last && Date.now() - new Date(last.created_at).getTime() < minInterval * 60_000) {
      return json({ success: true, skipped: "interval", last_at: last.created_at });
    }
  }
  let q = sb.from("social_posts").select("*")
    .eq("status", "scheduled").lte("scheduled_at", new Date().toISOString());
  q = (storyMode ? q.eq("media_type", "STORY") : q.neq("media_type", "STORY")).order("scheduled_at", { ascending: true }).limit(1);
  const { data: due, error } = await q;
  if (error) return json({ success: false, error: error.message }, 500);
  let processed = 0, failed = 0;
  for (const post of due ?? []) {
    // Revendicare atomică: doar o rulare trimite postarea
    const { data: claimed } = await sb.from("social_posts").update({ status: "posted" })
      .eq("id", post.id).eq("status", "scheduled").select("id");
    if (!claimed?.length) continue;
    // Story fără link explicit: folosim pagina articolului (fără „#story”).
    if (storyMode && !post.story_link_url && typeof post.source_url === "string") {
      post.story_link_url = post.source_url.replace(/#story$/, "");
    }
    const todo = PLATFORMS.filter((p) => !(post.posted_to ?? []).includes(p));
    const done: string[] = [...(post.posted_to ?? [])];
    try {
      for (const p of todo) { await send(sb, webhook, post, p, trigger); done.push(p); }
      await sb.from("social_posts").update({ posted_to: done, last_error: null, updated_at: new Date().toISOString() }).eq("id", post.id);
      processed++;
    } catch (e) {
      // Fără reîncercare automată: revine la draft cu motivul erorii
      await sb.from("social_posts").update({ status: "draft", posted_to: done, last_error: e instanceof Error ? e.message : String(e), updated_at: new Date().toISOString() }).eq("id", post.id);
      failed++;
    }
  }
  return json({ success: true, processed, failed });
});
