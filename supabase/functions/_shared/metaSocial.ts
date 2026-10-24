// Publicare automată Facebook Page + Instagram Business prin Meta Graph API.
// Folosește tokenul Meta existent (cel de la WhatsApp). Pagina și contul IG se
// rezolvă din META_FB_PAGE_ID / META_IG_USER_ID sau automat din /me/accounts.
import { waToken } from "./waConfig.ts";
import { prepareInstagramImages } from "./instagramImages.ts";
import { formatSocialCaption } from "./socialCaption.ts";

const G = "https://graph.facebook.com/v25.0";

export type SocialResult = { platform: "facebook" | "instagram"; ok: boolean; id?: string; error?: string };

async function g(path: string, params: Record<string, string>, method = "POST"): Promise<any> {
  const body = new URLSearchParams(params);
  const url = method === "GET" ? `${G}${path}?${body}` : `${G}${path}`;
  const res = await fetch(url, method === "GET" ? {} : { method, body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const e = json?.error;
    throw new Error(`[${res.status}] ${e?.code ?? ""} ${e?.message ?? JSON.stringify(json).slice(0, 200)}`.trim());
  }
  return json;
}

async function resolvePage(): Promise<{ pageId: string; pageToken: string; igId: string | null }> {
  // Token Meta Business Suite (META_ACCESS_TOKEN) are prioritate; apoi tokenul social vechi, apoi cel WhatsApp.
  const userToken = (Deno.env.get("META_ACCESS_TOKEN") || "").trim()
    || (Deno.env.get("META_SOCIAL_ACCESS_TOKEN") || "").trim() || waToken();
  if (!userToken) throw new Error("Lipsește tokenul Meta");
  const wantedPage = (Deno.env.get("META_FB_PAGE_ID") || "").trim();
  const accounts = await g("/me/accounts", { access_token: userToken, fields: "id,name,access_token,instagram_business_account" }, "GET");
  const list: any[] = accounts?.data ?? [];
  const page = (wantedPage ? list.find((p) => p.id === wantedPage) : null) ?? list[0];
  if (!page?.access_token) throw new Error("Tokenul Meta nu are acces la nicio pagină Facebook (pages_manage_posts)");
  const igId = (Deno.env.get("META_IG_USER_ID") || "").trim() || page.instagram_business_account?.id || null;
  return { pageId: page.id, pageToken: page.access_token, igId };
}

async function postFacebook(pageId: string, token: string, text: string, images: string[]): Promise<string> {
  const media: string[] = [];
  for (const url of images) {
    const r = await g(`/${pageId}/photos`, { url, published: "false", access_token: token });
    media.push(r.id);
  }
  const params: Record<string, string> = { message: text, access_token: token };
  media.forEach((id, i) => { params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id }); });
  const r = await g(`/${pageId}/feed`, params);
  return r.id;
}

async function waitReady(id: string, token: string) {
  for (let i = 0; i < 10; i++) {
    const s = await g(`/${id}`, { fields: "status_code", access_token: token }, "GET");
    if (s.status_code === "FINISHED") return;
    if (s.status_code === "ERROR") throw new Error("Instagram a respins imaginea");
    await new Promise((r) => setTimeout(r, 2000));
  }
}

async function postInstagram(igId: string, token: string, text: string, images: string[]): Promise<string> {
  let creation: string;
  if (images.length === 1) {
    creation = (await g(`/${igId}/media`, { image_url: images[0], caption: text, access_token: token })).id;
  } else {
    const children: string[] = [];
    for (const url of images) children.push((await g(`/${igId}/media`, { image_url: url, is_carousel_item: "true", access_token: token })).id);
    creation = (await g(`/${igId}/media`, { media_type: "CAROUSEL", children: children.join(","), caption: text, access_token: token })).id;
  }
  await waitReady(creation, token);
  return (await g(`/${igId}/media_publish`, { creation_id: creation, access_token: token })).id;
}

/** Publică pe Facebook și Instagram; nu aruncă excepții — returnează rezultatul pe fiecare platformă. */
export async function publishToMetaSocial(text: string, images: string[]): Promise<SocialResult[]> {
  const imgs = images.filter(Boolean).slice(0, 3);
  let ctx;
  try { ctx = await resolvePage(); }
  catch (e) {
    const error = (e as Error).message;
    return [{ platform: "facebook", ok: false, error }, { platform: "instagram", ok: false, error }];
  }
  const out: SocialResult[] = [];
  try { out.push({ platform: "facebook", ok: true, id: await postFacebook(ctx.pageId, ctx.pageToken, formatSocialCaption(text, { platform: "facebook", type: "property" }), await prepareInstagramImages(imgs)) }); }
  catch (e) { out.push({ platform: "facebook", ok: false, error: (e as Error).message }); }
  if (!ctx.igId) out.push({ platform: "instagram", ok: false, error: "Pagina nu are cont Instagram Business legat" });
  else if (!imgs.length) out.push({ platform: "instagram", ok: false, error: "Instagram cere cel puțin o imagine" });
  else {
    try { out.push({ platform: "instagram", ok: true, id: await postInstagram(ctx.igId, ctx.pageToken, formatSocialCaption(text, { platform: "instagram", type: "property" }), await prepareInstagramImages(imgs)) }); }
    catch (e) { out.push({ platform: "instagram", ok: false, error: (e as Error).message }); }
  }
  return out;
}
