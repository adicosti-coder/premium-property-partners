// Golește coada de postări sociale: maximum O postare per rulare și cel puțin
// `min_interval_minutes` (implicit 120) între postări, doar 09–21 ora României.
// La eroare Meta postarea rămâne draft în /admin/social-drafts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { publishToMetaSocial } from "../_shared/metaSocial.ts";
import { sendAdminText } from "../_shared/listingInspection.ts";
import { isInternalCall, timingSafeEqual } from "../_shared/cronAuth.ts";

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!timingSafeEqual(bearer, key) && !(await isInternalCall(req))) return json({ error: "unauthorized" }, 401);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, key, { auth: { persistSession: false } });
  const { data: job } = await sb.from("automation_jobs").select("config").eq("job_key", "social.autopost_drain").maybeSingle();
  const cfg = (job?.config ?? {}) as Record<string, unknown>;
  const minInterval = Math.max(30, Number(cfg.min_interval_minutes) || 120);
  const startH = Number(cfg.start_hour ?? 9), endH = Number(cfg.end_hour ?? 21);

  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Bucharest" }).format(new Date()));
  if (hour < startH || hour >= endH) return json({ ok: true, skipped: "outside_window", hour });

  const { data: last } = await sb.from("social_autopost_logs").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (last && Date.now() - new Date(last.created_at).getTime() < minInterval * 60_000) {
    return json({ ok: true, skipped: "interval", last_at: last.created_at, min_interval_minutes: minInterval });
  }

  const { data: draft } = await sb.from("social_post_drafts").select("id,property_id,property_slug,title,post_text,images")
    .eq("status", "queued").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!draft) return json({ ok: true, skipped: "queue_empty" });

  // Rezervăm draftul ca să nu fie postat de două rulări paralele.
  const { data: claimed } = await sb.from("social_post_drafts").update({ status: "posting", updated_at: new Date().toISOString() })
    .eq("id", draft.id).eq("status", "queued").select("id");
  if (!claimed?.length) return json({ ok: true, skipped: "claimed_elsewhere" });

  const results = await publishToMetaSocial(draft.post_text, (draft.images as string[]) ?? []);
  const fb = results.find((r) => r.platform === "facebook");
  const ig = results.find((r) => r.platform === "instagram");
  const allOk = results.length > 0 && results.every((r) => r.ok);
  const errText = results.filter((r) => !r.ok).map((r) => `${r.platform}: ${r.error}`).join(" | ") || null;
  await sb.from("social_post_drafts").update({
    status: allOk ? "posted" : "draft",
    ...(fb?.ok ? { fb_post_id: fb.id } : {}), ...(ig?.ok ? { ig_media_id: ig.id } : {}),
    last_error: errText, posted_at: allOk ? new Date().toISOString() : null, updated_at: new Date().toISOString(),
  }).eq("id", draft.id);
  await sb.from("social_autopost_logs").insert(results.map((r) => ({
    property_id: draft.property_id, property_slug: draft.property_slug, title: draft.title,
    platform: r.platform, status: r.ok ? "posted" : "failed", external_id: r.id ?? null, error_message: r.error ?? null,
  })));
  const line = (r: { platform: string; ok: boolean; error?: string }) => `${r.platform === "facebook" ? "Facebook" : "Instagram"}: ${r.ok ? "Postat ✅" : `Eșuat ❌ (${String(r.error || "").slice(0, 120)})`}`;
  const msg = allOk
    ? `✅ Postare socială PUBLICATĂ\n${draft.title}\n${results.map(line).join("\n")}\nhttps://realtrust.ro/${draft.property_slug ?? ""}`
    : `⚠️ Postare socială eșuată — salvată ca draft\n${draft.title}\n${results.map(line).join("\n")}\nhttps://realtrust.ro/admin/social-drafts`;
  await sendAdminText(msg).catch((e) => console.warn("[social-drain] admin WA failed:", e?.message));
  return json({ ok: true, draft_id: draft.id, results });
});
