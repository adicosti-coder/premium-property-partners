// Social autopilot: menține calendarul de postări din feed alimentat.
// Rulează zilnic din orchestrator (`social.autopilot`): programează ciornele curate
// în sloturile libere din următoarele zile și, când nu ajung, extrage ciorne noi
// din proprietățile active și articolele publicate. Publicarea rămâne la
// `process-scheduled-posts` (max 1 postare/oră, 09–21, confirmare Meta).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireInternalOrAdmin } from "../_shared/internalOrAdmin.ts";
import { localSocialRows, isKnownSocialContent } from "../_shared/socialLocalExtract.ts";
import { sendAdminText } from "../_shared/listingInspection.ts";
import {
  autopilotConfig, upcomingSlots, isAutopilotEligible, planSchedule, freeSlots, withTitleLine, TZ, type DraftRow,
} from "../_shared/socialAutopilotPlan.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const DRAFT_COLS = "id,type,title,caption,media_type,video_url,image_url,image_urls,property_id,source_url,last_error,created_at";
const fmt = (d: Date) => new Intl.DateTimeFormat("ro-RO", { timeZone: TZ, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const gate = await requireInternalOrAdmin(req, corsHeaders);
  if (gate) return gate;
  const body = await req.json().catch(() => ({}));
  if (body.dry_run !== undefined && typeof body.dry_run !== "boolean") return json({ error: "dry_run invalid" }, 400);
  const dryRun = body.dry_run === true;

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: job } = await sb.from("automation_jobs").select("config").eq("job_key", "social.autopilot").maybeSingle();
  const cfg = autopilotConfig(job?.config as Record<string, unknown> | null);
  const now = new Date();

  const loadContext = async () => {
    const [props, blogs, scheduled, drafts] = await Promise.all([
      sb.from("properties").select("id").eq("is_active", true).limit(2000),
      sb.from("blog_articles").select("slug").eq("is_published", true).limit(2000),
      sb.from("social_posts").select("scheduled_at").eq("status", "scheduled").neq("media_type", "STORY")
        .gte("scheduled_at", new Date(now.getTime() - 60 * 60_000).toISOString()).limit(500),
      sb.from("social_posts").select(DRAFT_COLS).eq("status", "draft").order("created_at").limit(1000),
    ]);
    const error = props.error || blogs.error || scheduled.error || drafts.error;
    if (error) throw new Error(error.message);
    const ctx = {
      activePropertyIds: new Set((props.data ?? []).map((p: { id: string }) => p.id)),
      publishedBlogSlugs: new Set((blogs.data ?? []).map((b: { slug: string }) => b.slug)),
      minCaption: cfg.min_caption,
    };
    return {
      ctx,
      scheduled: (scheduled.data ?? []).map((r: { scheduled_at: string }) => new Date(r.scheduled_at)),
      eligible: ((drafts.data ?? []) as DraftRow[]).filter((d) => isAutopilotEligible(d, ctx)),
    };
  };

  try {
    const slots = upcomingSlots(now, cfg);
    let state = await loadContext();
    let free = freeSlots(slots, state.scheduled);
    let extracted = 0;

    // Ciorne insuficiente → completăm din conținutul local (fără scraping extern).
    if (state.eligible.length < free.length) {
      const need = Math.min(10, free.length - state.eligible.length + 2);
      const [properties, articles, existing, gallery] = await Promise.all([
        sb.from("properties").select("id,slug,name,description_ro,location,image_path,images,listing_type,capital_necesar,base_price_per_night").eq("is_active", true).order("updated_at", { ascending: false }).limit(1000),
        sb.from("blog_articles").select("slug,title,excerpt,content,cover_image,main_image_url").eq("is_published", true).order("published_at", { ascending: false }).limit(1000),
        sb.from("social_posts").select("source_url,title,type,status").limit(10000),
        sb.from("property_images").select("property_id,image_path").eq("is_published", true).order("display_order").limit(10000),
      ]);
      const error = properties.error || articles.error || existing.error || gallery.error;
      if (error) throw new Error(error.message);
      const photos = new Map<string, string[]>();
      for (const row of gallery.data ?? []) photos.set(row.property_id, [...(photos.get(row.property_id) ?? []), row.image_path]);
      const fresh = localSocialRows(
        (properties.data ?? []).map((p: any) => ({ ...p, images: [...(p.images ?? []), ...(photos.get(p.id) ?? [])] })),
        articles.data ?? [],
        (v: string) => sb.storage.from("property-images").getPublicUrl(v).data.publicUrl,
      )
        .filter((r: any) => !isKnownSocialContent(r, existing.data ?? []))
        .map((r: any) => ({ ...r, caption: withTitleLine(r.title ?? "", r.caption ?? "") }))
        .filter((r: any) => r.caption.length >= cfg.min_caption + (r.title?.length ?? 0) && (r.image_url || r.image_urls?.length))
        .slice(0, need);
      if (fresh.length && !dryRun) {
        const ins = await sb.from("social_posts").upsert(fresh, { onConflict: "source_url", ignoreDuplicates: true }).select("id");
        if (ins.error) throw new Error(ins.error.message);
        extracted = ins.data?.length ?? 0;
        state = await loadContext();
        free = freeSlots(slots, state.scheduled);
      } else extracted = dryRun ? fresh.length : 0;
    }

    const plan = planSchedule(slots, state.scheduled, state.eligible);
    const done: { id: string; at: string }[] = [];
    if (!dryRun) {
      for (const item of plan) {
        const { data } = await sb.from("social_posts").update({ status: "scheduled", scheduled_at: item.at.toISOString() })
          .eq("id", item.id).eq("status", "draft").select("id");
        if (data?.length) done.push({ id: item.id, at: item.at.toISOString() });
      }
    }
    const filled = new Set((dryRun ? plan.map((p) => p.at.toISOString()) : done.map((d) => d.at)));
    const empty = free.filter((s) => !filled.has(s.toISOString()));
    const soonEmpty = empty.filter((s) => s.getTime() < now.getTime() + 48 * 3600_000);

    if (!dryRun && soonEmpty.length && body.notify !== false) {
      await sendAdminText(
        `⚠️ Autopilot social: ${soonEmpty.length} sloturi libere în următoarele 48h și nu mai există ciorne publicabile.\n` +
        `Primul slot liber: ${fmt(soonEmpty[0])}. Adaugă un articol sau o proprietate nouă ori corectează ciornele cu erori:\n` +
        `https://realtrust.ro/admin?tab=social`,
      ).catch((e) => console.warn("[social-autopilot] admin WA failed:", e?.message));
    }

    return json({
      success: true, dry_run: dryRun, slots_per_day: cfg.slots, days_ahead: cfg.days_ahead,
      scheduled: dryRun ? plan.length : done.length, extracted,
      empty_slots: empty.length,
      next: (dryRun ? plan.map((p) => ({ id: p.id, at: p.at.toISOString() })) : done).slice(0, 20),
    });
  } catch (e) {
    return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
