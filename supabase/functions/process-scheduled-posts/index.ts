// Social Engine · trimite postări către webhook-ul Make.com din app_settings.
// - cron (orchestrator, */5 min): postările „scheduled” cu scheduled_at <= acum
// - admin: { post_id, platforms } pentru trimitere manuală
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const UUID = /^[0-9a-f-]{36}$/i;
const PLATFORMS = ["instagram", "facebook"] as const;

export const isMakeWebhook = (u: string) => {
  try { const x = new URL(u); return x.protocol === "https:" && /(^|\.)make\.com$/.test(x.hostname); } catch { return false; }
};

async function send(url: string, post: any, platform: string, trigger: string) {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      title: post.title,
      caption: post.caption,
      imageUrl: post.image_url || null,
      sourceUrl: post.source_url,
      platform,
      type: post.type,
      timestamp: new Date().toISOString(),
      triggered_from: trigger,
    }),
  });
  if (!r.ok) throw new Error(`Make.com ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const body = await req.json().catch(() => ({}));
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
      for (const p of platforms) await send(webhook, post, p, "admin_manual");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sb.from("social_posts").update({ last_error: msg }).eq("id", post.id);
      return json({ success: false, error: msg }, 502);
    }
    const posted_to = [...new Set([...(post.posted_to ?? []), ...platforms])];
    await sb.from("social_posts").update({ status: "posted", posted_to, last_error: null }).eq("id", post.id);
    return json({ success: true, posted_to });
  }

  // Cron
  const { data: due, error } = await sb.from("social_posts").select("*")
    .eq("status", "scheduled").lte("scheduled_at", new Date().toISOString()).limit(20);
  if (error) return json({ success: false, error: error.message }, 500);
  let processed = 0, failed = 0;
  for (const post of due ?? []) {
    // Revendicare atomică: doar o rulare trimite postarea
    const { data: claimed } = await sb.from("social_posts").update({ status: "posted" })
      .eq("id", post.id).eq("status", "scheduled").select("id");
    if (!claimed?.length) continue;
    const todo = PLATFORMS.filter((p) => !(post.posted_to ?? []).includes(p));
    const done: string[] = [...(post.posted_to ?? [])];
    try {
      for (const p of todo) { await send(webhook, post, p, "cron_job"); done.push(p); }
      await sb.from("social_posts").update({ posted_to: done, last_error: null }).eq("id", post.id);
      processed++;
    } catch (e) {
      // Fără reîncercare automată: revine la draft cu motivul erorii
      await sb.from("social_posts").update({ status: "draft", posted_to: done, last_error: e instanceof Error ? e.message : String(e) }).eq("id", post.id);
      failed++;
    }
  }
  return json({ success: true, processed, failed });
});
